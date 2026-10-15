"""
backend/api/routes.py - FastAPI Route Definitions (Dev 3 * Phase 2)

Endpoints
---------
POST /api/job/start
    Accepts AnalysisRequest, creates a MigrationJob, fires the background
    pipeline (stub - Dev 1/Dev 2 will replace _run_pipeline body).
    Returns: { job_id, status }

GET  /api/job/{job_id}/stream
    SSE stream.  Each event is tagged with `source` so Dev 4 can style
    "fact" updates (terminal green) vs "claim" updates (AI purple).
    Format per event:
        data: {"source": "fact"|"claim"|"merger"|"system", "event": "...", ...}

GET  /api/job/{job_id}/status
    Polling fallback.  Returns the full DependencyExitCapsule if complete,
    otherwise partial state summary.
"""

from __future__ import annotations

import asyncio
import logging
import tempfile
from pathlib import Path
from typing import AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from fastapi.responses import StreamingResponse

from backend.contracts.schemas import (
    AnalysisRequest,
    DependencyExitCapsule,
    MergeDecision,
)
from backend.sandbox.adapter import build_fact_ledger
from backend.ai.adapter import build_claim_ledger, build_claim_ledger_from_objects
from backend.api.state import JobStatus, MigrationJob, job_manager

# Dev 1 sandbox execution modules
from backend.sandbox.env_manager import create_sandbox_env, SandboxEnvError
from backend.sandbox.ast_census import locate_dependency_usages, CensusReport
from backend.sandbox.pytest_runner import run_pytest, PytestRun, PytestRunnerError

# Dev 2 AI modules
from backend.ai.risk import analyze_risk as ai_analyze_risk
from backend.ai.propose import propose as ai_propose
from backend.ai.gaps import evaluate_gaps as ai_evaluate_gaps

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Background pipeline - Full Dev 1 + Dev 2 execution
# ---------------------------------------------------------------------------


async def _run_pipeline(job: MigrationJob) -> None:
    """
    Orchestrates the two-ledger pipeline for a single dependency.

    Stages
    ------
    1. FACT stage  - sandbox executor (Dev 1) populates job.fact_ledger
    2. CLAIM stage - AI layer (Dev 2) populates job.claim_ledger
    3. MERGE stage - Dev 3 merges both into DependencyExitCapsule
    """
    try:
        job.status = JobStatus.PROCESSING
        job.push_fact_update({"step": "sandbox_start", "dependency": job.dependency})

        # ----------------------------------------------------------------
        # STAGE 1: FACT - Dev 1 sandbox execution
        # ----------------------------------------------------------------
        repo_path = Path(job.repo_path).resolve()
        if not repo_path.exists():
            raise FileNotFoundError(f"Repository path does not exist: {repo_path}")

        # Create a temporary directory for sandbox venv and artifacts
        with tempfile.TemporaryDirectory(prefix="chainroute_sandbox_") as tmp_dir:
            tmp_path = Path(tmp_dir)
            venv_dir = tmp_path / "venv"

            # Step 1a: Create sandbox environment
            job.push_fact_update({"step": "creating_venv", "message": "Creating isolated Python environment..."})
            try:
                env = await asyncio.to_thread(
                    create_sandbox_env,
                    venv_dir=venv_dir,
                    preferred_python="3.12",
                    fallback_python="3.13",
                )
            except SandboxEnvError as exc:
                logger.error("Failed to create sandbox env: %s", exc)
                job.push_error(f"Sandbox environment creation failed: {exc}")
                return

            job.push_fact_update({"step": "venv_ready", "python_version": str(env.python_version)})

            # Step 1b: Run AST Census to locate dependency usages
            job.push_fact_update({"step": "ast_census", "message": f"Scanning for {job.dependency} usage..."})
            census_report: CensusReport = await asyncio.to_thread(
                locate_dependency_usages,
                repo_dir=repo_path,
                dependency=job.dependency,
            )
            job.push_fact_update({
                "step": "ast_census_done",
                "files_scanned": census_report.files_scanned,
                "usage_count": census_report.total_usages,
            })

            # Step 1c: Run pytest (single baseline run for now)
            job.push_fact_update({"step": "pytest_run", "message": "Running test suite..."})
            try:
                pytest_run: PytestRun = await asyncio.to_thread(
                    run_pytest,
                    env=env,
                    repo_dir=repo_path,
                    run_index=0,
                    extra_args=["-x", "--tb=short"],
                )
                job.push_fact_update({
                    "step": "pytest_done",
                    "exit_code": pytest_run.exit_code,
                    "passed": len(pytest_run.passed),
                    "failed": len(pytest_run.failed),
                })
            except PytestRunnerError as exc:
                logger.warning("Pytest run failed (non-fatal): %s", exc)
                # Create empty pytest run for adapter
                pytest_run = PytestRun(
                    run_index=0,
                    xml_path=Path(tmp_dir) / "empty.xml",
                    test_cases=[],
                    exit_code=-1,
                    stdout="",
                    stderr=str(exc),
                )

            # Step 1d: Build FactLedger via adapter
            job.push_fact_update({"step": "building_fact_ledger", "message": "Assembling FactLedger..."})
            # Determine requested version from requirements (simplified)
            requested_version = _extract_requested_version(repo_path, job.dependency)

            fact_ledger = await asyncio.to_thread(
                build_fact_ledger,
                repo_path=str(repo_path),
                python_version=str(env.python_version),
                dependency=job.dependency,
                requested_version=requested_version,
                resolved_version=None,  # Could be extracted from pip freeze
                ecosystem=job.ecosystem,
                is_direct=True,
                pytest_run=pytest_run,
                ast_locations=[loc.to_dict() for loc in census_report.locations],
                files_scanned=census_report.files_scanned,
                parse_errors=census_report.errors,
                raw_vulnerabilities=None,  # OSV scan would go here
            )
            job.fact_ledger = fact_ledger
            job.push_fact_update({
                "step": "fact_ledger_ready",
                "ledger_id": fact_ledger.ledger_id,
                "tests_total": fact_ledger.tests_total,
                "usage_locations": len(fact_ledger.usage_locations),
            })

        # ----------------------------------------------------------------
        # STAGE 2: CLAIM - Dev 2 AI reasoning (Gemma 4)
        # ----------------------------------------------------------------
        job.push_claim_update({"step": "ai_start", "message": "Starting Gemma 4 analysis..."})

        # Prepare repo metadata for risk analysis
        repo_metadata = {
            "dependencies": [{
                "package": job.dependency,
                "version": requested_version,
                "npm_metadata": {},  # Would be populated from PyPI/npm registry
            }]
        }

        # Step 2a: Risk analysis
        job.push_claim_update({"step": "risk_analysis", "message": "Analyzing maintenance risk..."})
        risk_claims = await asyncio.to_thread(ai_analyze_risk, repo_metadata)

        # Step 2b: Propose replacements (using usage context from AST census)
        job.push_claim_update({"step": "propose_replacements", "message": "Generating replacement proposals..."})
        usage_context = "\n".join([
            f"{loc.file_path}:{loc.line_number} - {loc.statement}"
            for loc in census_report.locations[:20]  # Limit context size
        ])
        proposal_claims = await asyncio.to_thread(ai_propose, job.dependency, usage_context)

        # Step 2c: Evaluate gaps from test facts
        job.push_claim_update({"step": "gap_evaluation", "message": "Evaluating test gaps..."})
        test_facts = {
            "test_cases": [tc.to_dict() for tc in pytest_run.test_cases],
            "exit_code": pytest_run.exit_code,
            "stdout": pytest_run.stdout,
            "stderr": pytest_run.stderr,
        }
        gap_claim = await asyncio.to_thread(ai_evaluate_gaps, test_facts)

        # Step 2d: Build ClaimLedger via adapter
        job.push_claim_update({"step": "building_claim_ledger", "message": "Assembling ClaimLedger..."})
        claim_ledger = await asyncio.to_thread(
            build_claim_ledger_from_objects,
            fact_ledger_id=fact_ledger.ledger_id,
            risk_claims=risk_claims,
            proposal_claims=proposal_claims,
            gap_claim=gap_claim,
            raw_model_output=None,
        )
        job.claim_ledger = claim_ledger
        job.push_claim_update({
            "step": "claim_ledger_ready",
            "ledger_id": claim_ledger.ledger_id,
            "risk_level": claim_ledger.risk_reasoning.overall_risk.value,
            "replacements": len(claim_ledger.proposed_replacements),
        })

        # ----------------------------------------------------------------
        # STAGE 3: MERGE - Dev 3 merges both ledgers
        # ----------------------------------------------------------------
        job.push_fact_update({"step": "merging", "message": "Merging ledgers into exit capsule..."})
        capsule = DependencyExitCapsule(
            fact=fact_ledger,
            claim=claim_ledger,
            merge_decision=MergeDecision.APPROVED,
            merger_notes="Auto-merged: both ledgers present and linked.",
            dependency=fact_ledger.dependency,
            overall_risk=claim_ledger.risk_reasoning.overall_risk,
        )
        job.push_merger_complete(capsule)

    except Exception as exc:
        logger.exception("Pipeline error for job %s", job.job_id)
        job.push_error(str(exc))


def _extract_requested_version(repo_path: Path, dependency: str) -> str:
    """Extract the requested version of a dependency from requirements files."""
    # Check common locations
    for req_file in ["requirements.txt", "requirements.in", "pyproject.toml", "setup.py"]:
        path = repo_path / req_file
        if path.exists():
            try:
                content = path.read_text(encoding="utf-8")
                # Simple regex to find dependency version
                import re
                # requirements.txt format: dep==1.2.3 or dep>=1.2.3
                pattern = rf'{re.escape(dependency)}[=<>!~]+([^\s#\n]+)'
                match = re.search(pattern, content, re.IGNORECASE)
                if match:
                    return match.group(1)
                # pyproject.toml format: "dep = "^1.2.3""
                pattern2 = rf'"{re.escape(dependency)}"\s*=\s*"[^"]*([0-9][^"]*)"'
                match2 = re.search(pattern2, content)
                if match2:
                    return match2.group(1)
            except Exception:
                pass
    return "unknown"


# ---------------------------------------------------------------------------
# Internal helpers
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
# Routes
# ---------------------------------------------------------------------------


@router.post("/job/start", status_code=status.HTTP_202_ACCEPTED)
async def start_job(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """
    Start a new dependency migration analysis job.

    Returns immediately with a job_id.  Use /stream or /status to track progress.
    """
    job = await job_manager.create_job(
        dependency=request.dependency,
        repo_path=request.repo_path,
        ecosystem=request.ecosystem,
    )
    background_tasks.add_task(_run_pipeline, job)
    logger.info("Job %s created for dependency '%s'", job.job_id, job.dependency)
    return {
        "job_id": job.job_id,
        "status": job.status,
        "dependency": job.dependency,
        "message": "Job queued. Connect to /stream for live updates.",
    }


@router.get("/job/{job_id}/stream")
async def stream_job(job_id: str):
    """
    SSE stream for a running job.

    Each event carries a `source` field:
      "fact"   - ground-truth from backend.sandbox executor (Dev 1)
      "claim"  - AI reasoning updates (Dev 2)
      "merger" - merge verdict from Dev 3
      "system" - heartbeat / error / timeout

    Dev 4 uses `source` to apply different terminal styles per stream origin.
    """
    job = await _get_job_or_404(job_id)
    return StreamingResponse(
        _sse_stream(job),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/job/{job_id}/status")
async def get_job_status(job_id: str):
    """
    Polling fallback.  Returns full DependencyExitCapsule when complete,
    otherwise returns partial progress summary.
    """
    job = await _get_job_or_404(job_id)

    base = {
        "job_id": job.job_id,
        "status": job.status,
        "dependency": job.dependency,
        "fact_ready": job.fact_ledger is not None,
        "claim_ready": job.claim_ledger is not None,
        "error": job.error,
    }

    if job.status == JobStatus.COMPLETE and job.capsule:
        base["capsule"] = job.capsule.model_dump(mode="json")

    return base


@router.get("/jobs")
async def list_jobs():
    """List all active jobs (dev/debug)."""
    return await job_manager.list_jobs()


@router.delete("/jobs/purge")
async def purge_complete_jobs():
    """Purge completed/errored jobs from memory."""
    count = await job_manager.purge_complete()
    return {"purged": count}
