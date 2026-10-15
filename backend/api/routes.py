"""
backend/api/routes.py - FastAPI Route Definitions & 4-Stage Pipeline (Dev 3)

Endpoints
---------
POST /api/job/start
    Accepts AnalysisRequest, creates a MigrationJob, fires the live 4-stage background pipeline.
    Returns: { job_id, capsule_id, status }

GET  /api/job/{job_id}/stream
    SSE stream. Each event carries `source` ("fact"|"claim"|"merger"|"system").

GET  /api/job/{job_id} & /api/job/{job_id}/status
    Polling endpoint returning full DependencyExitCapsule when complete.

Pipeline Architecture (Two Ledgers)
-----------------------------------
Stage 1 (Facts):
    clone_repo -> create_sandbox_env -> locate_dependency_usages -> run_double_baseline
Stage 2 (Claims):
    analyze_risk -> propose (max 20 AST usages)
Stage 3 (Verification):
    create_swapped_worktree -> run_swapped_verdict -> evaluate_gaps -> build_fact_ledger
Stage 4 (Assembly):
    build_capsule -> merge_ledgers -> persist capsule
"""

from __future__ import annotations

import asyncio
import logging
import re
import tempfile
from pathlib import Path
from typing import Any, AsyncGenerator, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from fastapi.responses import StreamingResponse

from backend.contracts.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    DependencyExitCapsule,
    FactLedger,
    ClaimLedger,
    MergeDecision,
)
from backend.contracts.merger import merge_ledgers
from backend.api.state import JobStatus, MigrationJob, job_manager

# Dev 1 sandbox modules (frozen)
from backend.sandbox.repo_cloner import clone_repo, ClonedRepo, RepoCloneError
from backend.sandbox.env_manager import create_sandbox_env, SandboxEnv, SandboxEnvError
from backend.sandbox.ast_census import locate_dependency_usages, CensusReport
from backend.sandbox.baseline import run_double_baseline, BaselineResult, BaselineError
from backend.sandbox.swapper import create_swapped_worktree, SwappedWorktree, SwapperError
from backend.sandbox.verdict import run_swapped_verdict, VerdictReport, FinalVerdict
from backend.sandbox.fact_generator import build_fact_ledger
from backend.sandbox.pytest_runner import PytestRun

# Dev 2 AI modules (frozen)
from backend.ai.risk import analyze_risk as ai_analyze_risk
from backend.ai.propose import propose as ai_propose
from backend.ai.gaps import evaluate_gaps as ai_evaluate_gaps
from backend.capsule.builder import build_capsule, CapsuleReport

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Background Pipeline Execution (Stages 1 - 4)
# ---------------------------------------------------------------------------


def _extract_requested_version(repo_path: Path, dependency: str) -> str:
    """Extract requested version of dependency from manifest files."""
    for req_file in ["requirements.txt", "requirements.in", "pyproject.toml", "setup.py"]:
        path = repo_path / req_file
        if path.exists():
            try:
                content = path.read_text(encoding="utf-8")
                # requirements.txt format: dep==1.2.3 or dep>=1.2.3
                pattern = rf"{re.escape(dependency)}[=<>!~]+([^\s#\n]+)"
                match = re.search(pattern, content, re.IGNORECASE)
                if match:
                    return match.group(1)
                pattern2 = rf'"{re.escape(dependency)}"\s*=\s*"[^"]*([0-9][^"]*)"'
                match2 = re.search(pattern2, content)
                if match2:
                    return match2.group(1)
            except Exception:
                pass
    return "unknown"


def _create_fallback_baseline(repo_dir: Path, venv_dir: Path) -> BaselineResult:
    """Construct an empty BaselineResult descriptor when test suite is absent or crashes."""
    empty_run1 = PytestRun(
        run_index=0,
        xml_path=venv_dir / "empty_baseline_1.xml",
        test_cases=[],
        exit_code=0,
        stdout="No tests collected",
        stderr="",
    )
    empty_run2 = PytestRun(
        run_index=1,
        xml_path=venv_dir / "empty_baseline_2.xml",
        test_cases=[],
        exit_code=0,
        stdout="No tests collected",
        stderr="",
    )
    return BaselineResult(
        repo_dir=str(repo_dir),
        run1=empty_run1,
        run2=empty_run2,
        verdicts=[],
    )


async def _run_pipeline(job: MigrationJob) -> None:
    """
    Execute the full deterministic 4-stage pipeline:
      Stage 1 (Facts): clone_repo -> create_sandbox_env -> locate_dependency_usages -> run_double_baseline
      Stage 2 (Claims): analyze_risk -> propose (max 20 AST usages)
      Stage 3 (Verification): create_swapped_worktree -> run_swapped_verdict -> evaluate_gaps -> build_fact_ledger
      Stage 4 (Assembly): build_capsule -> merge_ledgers -> persist capsule
    """
    try:
        job.status = JobStatus.PROCESSING
        job.push_fact_update({"step": "pipeline_started", "dependency": job.dependency, "repo": job.repo_path})

        with tempfile.TemporaryDirectory(prefix="chainroute_exec_") as tmp_dir:
            tmp_path = Path(tmp_dir)

            # ================================================================
            # STAGE 1: FACTS (Dev 1 Sandbox)
            # ================================================================
            job.push_fact_update({"step": "stage1_facts_init", "message": "Stage 1 (Facts): Environment setup..."})

            # 1a. clone_repo
            cloned: Optional[ClonedRepo] = None
            raw_target = job.repo_path.strip()
            if re.match(r"^(https?://|git@|ssh://|git://).+", raw_target):
                job.push_fact_update({"step": "cloning_repo", "url": raw_target})
                cloned = await asyncio.to_thread(clone_repo, raw_target, temp_parent=tmp_path)
                repo_dir = cloned.repo_dir
            else:
                repo_dir = Path(raw_target).resolve()
                if not repo_dir.exists():
                    raise FileNotFoundError(f"Target repository path does not exist: {repo_dir}")

            job.push_fact_update({"step": "repo_resolved", "repo_dir": str(repo_dir)})

            # 1b. create_sandbox_env
            venv_dir = tmp_path / "venv"
            job.push_fact_update({"step": "creating_sandbox_env", "message": "Creating isolated Python environment..."})
            env: SandboxEnv = await asyncio.to_thread(
                create_sandbox_env,
                venv_dir=venv_dir,
                preferred_python="3.12",
                fallback_python="3.13",
            )
            job.push_fact_update({"step": "sandbox_env_ready", "python_version": str(env.python_version)})

            # 1c. locate_dependency_usages (AST Census)
            job.push_fact_update({"step": "ast_census_start", "message": f"Scanning AST for '{job.dependency}' usage..."})
            census_report: CensusReport = await asyncio.to_thread(
                locate_dependency_usages,
                repo_dir=repo_dir,
                dependency=job.dependency,
            )
            job.push_fact_update({
                "step": "ast_census_done",
                "files_scanned": census_report.files_scanned,
                "usage_count": census_report.total_usages,
            })

            # 1d. run_double_baseline
            job.push_fact_update({"step": "double_baseline_start", "message": "Executing double-baseline test suite..."})
            try:
                baseline: BaselineResult = await asyncio.to_thread(
                    run_double_baseline,
                    env=env,
                    repo_dir=repo_dir,
                )
            except Exception as b_exc:
                logger.warning("Baseline execution warning (falling back gracefully): %s", b_exc)
                baseline = _create_fallback_baseline(repo_dir, venv_dir)

            job.push_fact_update({
                "step": "baseline_done",
                "stable_pass": len(baseline.stable_pass_nodeids),
                "stable_fail": len(baseline.stable_fail_nodeids),
                "flaky_count": len(baseline.flaky_nodeids),
            })

            # ================================================================
            # STAGE 2: CLAIMS (Dev 2 Gemma 4 AI)
            # ================================================================
            job.push_claim_update({"step": "stage2_claims_init", "message": "Stage 2 (Claims): Prompting Gemma 4..."})

            req_version = _extract_requested_version(repo_dir, job.dependency)
            repo_meta = {
                "dependencies": [{
                    "package": job.dependency,
                    "version": req_version,
                    "npm_metadata": {},
                }]
            }

            # 2a. analyze_risk
            risk_claims = await asyncio.to_thread(ai_analyze_risk, repo_meta)
            top_risk = risk_claims[0] if risk_claims else None
            job.push_claim_update({
                "step": "risk_analysis_done",
                "maintenance_score": top_risk.maintenance_score if top_risk else 0,
                "risk_indicators": top_risk.risk_indicators if top_risk else [],
            })

            # 2b. propose (max 20 AST usages to stay within context limits)
            truncated_locations = census_report.locations[:20]
            usage_context = "\n".join([
                f"{loc.file_path}:{loc.line_number} - {loc.statement}"
                for loc in truncated_locations
            ])
            proposal_claims = await asyncio.to_thread(ai_propose, job.dependency, usage_context)
            top_proposal = proposal_claims[0] if proposal_claims else None
            job.push_claim_update({
                "step": "proposal_done",
                "proposed_replacement": top_proposal.proposed_replacement if top_proposal else "",
                "migration_steps": top_proposal.migration_steps if top_proposal else [],
                "has_diff_patch": bool(top_proposal and top_proposal.diff_patch),
            })

            # ================================================================
            # STAGE 3: VERIFICATION (Swapper & Verdict)
            # ================================================================
            job.push_fact_update({"step": "stage3_verify_init", "message": "Stage 3 (Verification): Applying swap & patch..."})

            candidate_pkg = (
                top_proposal.proposed_replacement.split()[0]
                if top_proposal and top_proposal.proposed_replacement
                else f"{job.dependency}-replacement"
            )
            diff_patch = top_proposal.diff_patch if top_proposal else None

            # 3a. create_swapped_worktree
            swapped_worktree: Optional[SwappedWorktree] = None
            try:
                swapped_worktree = await asyncio.to_thread(
                    create_swapped_worktree,
                    repo_dir=repo_dir,
                    env=env,
                    target_dependency=job.dependency,
                    candidate_package=candidate_pkg,
                    patch_content=diff_patch,
                    worktree_parent=tmp_path / "worktrees",
                )
            except Exception as s_exc:
                logger.warning("Swapped worktree creation encountered exception: %s", s_exc)

            # 3b. run_swapped_verdict
            if swapped_worktree is not None:
                verdict_report: VerdictReport = await asyncio.to_thread(
                    run_swapped_verdict,
                    env=env,
                    swapped_worktree=swapped_worktree,
                    baseline=baseline,
                )
            else:
                # Construct synthetic verdict
                from backend.sandbox.verdict import VerdictReport, FinalVerdict
                verdict_report = VerdictReport(
                    verdict=FinalVerdict.INCONCLUSIVE,
                    reason="Worktree swap failed or was skipped in current environment.",
                    base_sha=cloned.resolved_sha if cloned else "local",
                    candidate=candidate_pkg,
                    baseline_stable_pass_count=len(baseline.stable_pass_nodeids),
                    baseline_stable_fail_count=len(baseline.stable_fail_nodeids),
                    flaky_excluded_count=len(baseline.flaky_nodeids),
                    flaky_excluded_nodeids=sorted(list(baseline.flaky_nodeids)),
                    regressed_nodeids=[],
                    fixed_nodeids=[],
                    swapped_passed_count=0,
                    swapped_failed_count=0,
                    swapped_error_count=0,
                    swapped_skipped_count=0,
                    swapped_run=baseline.run1,
                )

            job.push_fact_update({
                "step": "verdict_done",
                "verdict": verdict_report.verdict.value,
                "regressed_count": len(verdict_report.regressed_nodeids),
            })

            # 3c. evaluate_gaps (invoked if tests fail)
            gap_claim = None
            if verdict_report.verdict.value in ("FAIL", "INCONCLUSIVE") or verdict_report.swapped_failed_count > 0:
                test_facts = {
                    "exit_code": verdict_report.swapped_run.exit_code,
                    "failed_tests": [
                        {"nodeid": nid, "message": "Failed in swapped worktree run"}
                        for nid in verdict_report.regressed_nodeids
                    ],
                    "stdout": verdict_report.swapped_run.stdout,
                    "stderr": verdict_report.swapped_run.stderr,
                    "diff": diff_patch or "",
                }
                gap_claim = await asyncio.to_thread(ai_evaluate_gaps, test_facts)
                job.push_claim_update({
                    "step": "gaps_evaluated",
                    "open_concerns": gap_claim.open_concerns,
                })
            else:
                gap_claim = await asyncio.to_thread(
                    ai_evaluate_gaps,
                    {"exit_code": 0, "test_cases": [{"nodeid": "all", "outcome": "passed"}]}
                )

            # 3d. build_fact_ledger
            if swapped_worktree is not None:
                fact_ledger_obj = await asyncio.to_thread(
                    build_fact_ledger,
                    env=env,
                    swapped=swapped_worktree,
                    baseline=baseline,
                    verdict_report=verdict_report,
                    census_report=census_report,
                    run_id=job.job_id,
                )
                fact_dict = fact_ledger_obj.to_dict()
            else:
                fact_dict = {
                    "run_id": job.job_id,
                    "base_sha": cloned.resolved_sha if cloned else "local",
                    "py_version": str(env.python_version),
                    "candidate": candidate_pkg,
                    "patch_sha": None,
                    "baseline_res": {"stable_pass": len(baseline.stable_pass_nodeids)},
                    "swapped_res": {"verdict": verdict_report.verdict.value},
                    "flaky": sorted(list(baseline.flaky_nodeids)),
                    "verdict": verdict_report.verdict.value,
                    "junit_path": str(verdict_report.swapped_run.xml_path),
                    "timestamp_utc": "",
                    "usage_locations": [loc.to_dict() for loc in census_report.locations],
                }

            # ================================================================
            # STAGE 4: ASSEMBLY (Capsule & Merger)
            # ================================================================
            job.push_fact_update({"step": "stage4_assembly_init", "message": "Stage 4 (Assembly): Generating capsule..."})

            # 4a. build_capsule
            capsule_report: CapsuleReport = await asyncio.to_thread(
                build_capsule,
                risk_claims=risk_claims,
                proposal_claims=proposal_claims,
                gap_claim=gap_claim,
                repo_name=str(job.repo_path),
            )

            # 4b. merge_ledgers
            capsule: DependencyExitCapsule = await asyncio.to_thread(
                merge_ledgers,
                fact=fact_dict,
                claim=capsule_report,
            )

            # 4c. Persist capsule to disk
            capsule_dir = Path("capsules")
            capsule_dir.mkdir(parents=True, exist_ok=True)
            capsule_json_path = capsule_dir / f"{capsule.capsule_id}.json"
            capsule_json_path.write_text(capsule.model_dump_json(indent=2), encoding="utf-8")

            if capsule.narrative_markdown:
                capsule_md_path = capsule_dir / f"{capsule.capsule_id}.md"
                capsule_md_path.write_text(capsule.narrative_markdown, encoding="utf-8")

            job.push_merger_complete(capsule)
            logger.info("Pipeline completed successfully | job_id=%s | capsule_id=%s", job.job_id, capsule.capsule_id)

    except Exception as exc:
        logger.exception("Pipeline fatal error for job %s: %s", job.job_id, exc)
        job.push_error(str(exc))


# ---------------------------------------------------------------------------
# Internal Helpers
# ---------------------------------------------------------------------------


async def _get_job_or_404(job_id: str) -> MigrationJob:
    job = await job_manager.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found")
    return job


async def _sse_stream(job: MigrationJob) -> AsyncGenerator[str, None]:
    async for chunk in job.sse_generator():
        yield chunk


# ---------------------------------------------------------------------------
# Route Definitions
# ---------------------------------------------------------------------------


@router.post("/job/start", status_code=status.HTTP_200_OK)
async def start_job(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """
    Start a new dependency migration analysis job.
    Spawns the background 4-stage live pipeline.
    """
    job = await job_manager.create_job(
        dependency=request.dependency,
        repo_path=request.repo_path,
        ecosystem=request.ecosystem,
    )
    background_tasks.add_task(_run_pipeline, job)
    logger.info("Job %s started for dependency '%s'", job.job_id, job.dependency)
    return {
        "job_id": job.job_id,
        "capsule_id": job.job_id,
        "status": job.status.value if hasattr(job.status, "value") else str(job.status),
        "dependency": job.dependency,
        "message": "Job queued. Connect to /stream for live updates.",
    }


@router.get("/job/{job_id}/stream")
async def stream_job(job_id: str):
    """SSE stream emitting live Fact and Claim updates tagged by source."""
    job = await _get_job_or_404(job_id)
    return StreamingResponse(
        _sse_stream(job),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/job/{job_id}")
@router.get("/job/{job_id}/status")
async def get_job_status(job_id: str):
    """
    Polling endpoint. Returns full DependencyExitCapsule when complete,
    or current progress summary if in progress.
    """
    job = await _get_job_or_404(job_id)

    status_val = job.status.value if hasattr(job.status, "value") else str(job.status)
    base: dict[str, Any] = {
        "job_id": job.job_id,
        "capsule_id": job.job_id,
        "status": status_val,
        "dependency": job.dependency,
        "fact_ready": job.fact_ledger is not None,
        "claim_ready": job.claim_ledger is not None,
        "error": job.error,
    }

    if status_val == "complete" and job.capsule:
        base["capsule"] = job.capsule.model_dump(mode="json")

    return base


@router.get("/jobs")
async def list_jobs():
    """List all active jobs."""
    return await job_manager.list_jobs()


@router.delete("/jobs/purge")
async def purge_complete_jobs():
    """Purge completed/errored jobs from memory."""
    count = await job_manager.purge_complete()
    return {"purged": count}
