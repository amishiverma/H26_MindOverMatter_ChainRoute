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
from typing import AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from fastapi.responses import StreamingResponse

from contracts.schemas import (
    AnalysisRequest,
    DependencyExitCapsule,
    MergeDecision,
)
from api.state import JobStatus, MigrationJob, job_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Background pipeline stub
# Dev 1 replaces the fact section; Dev 2 replaces the claim section.
# Dev 3 owns the merge + push_merger_complete call.
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
        # STAGE 1: FACT - Dev 1 fills this block
        # Expected: call sandbox env_manager + ast_census, set job.fact_ledger
        # ----------------------------------------------------------------
        # TODO(Dev 1): replace stub with real sandbox execution
        await asyncio.sleep(0)  # yield to event loop

        if job.fact_ledger is None:
            job.push_fact_update({
                "step": "sandbox_pending",
                "message": "Waiting for sandbox executor (Dev 1)",
            })

        # ----------------------------------------------------------------
        # STAGE 2: CLAIM - Dev 2 fills this block
        # Expected: call Gemma 4 AI layer with fact_ledger as context, set job.claim_ledger
        # ----------------------------------------------------------------
        await asyncio.sleep(0)

        if job.claim_ledger is None:
            job.push_claim_update({
                "step": "ai_pending",
                "message": "Waiting for AI reasoning layer (Dev 2)",
            })

        # ----------------------------------------------------------------
        # STAGE 3: MERGE - Dev 3 owns this
        # Builds capsule only when both ledgers are present
        # ----------------------------------------------------------------
        if job.fact_ledger and job.claim_ledger:
            capsule = DependencyExitCapsule(
                fact=job.fact_ledger,
                claim=job.claim_ledger,
                merge_decision=MergeDecision.APPROVED,
                merger_notes="Auto-merged: both ledgers present and linked.",
                dependency=job.fact_ledger.dependency,
                overall_risk=job.claim_ledger.risk_reasoning.overall_risk,
            )
            job.push_merger_complete(capsule)
        else:
            # One or both ledgers still missing - mark as pending
            job.status = JobStatus.PROCESSING
            job.push_fact_update({
                "step": "awaiting_ledgers",
                "fact_ready": job.fact_ledger is not None,
                "claim_ready": job.claim_ledger is not None,
            })

    except Exception as exc:
        logger.exception("Pipeline error for job %s", job.job_id)
        job.push_error(str(exc))


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
      "fact"   - ground-truth from sandbox executor (Dev 1)
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
