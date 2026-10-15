"""
backend/api/state.py - In-memory Job Manager (Dev 3 * Phase 2)

Holds the active migration job state keyed by job_id.
Each job carries:
  - The latest FactLedger (written by Dev 1 sandbox layer)
  - The latest ClaimLedger (written by Dev 2 AI layer)
  - An asyncio.Queue used to broadcast SSE events to all connected consumers
  - A merged DependencyExitCapsule once both ledgers are sealed

Thread/task safety: all mutations go through JobManager methods;
asyncio.Lock guards the jobs dict for concurrent route handlers.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from backend.contracts.schemas import (
    ClaimLedger,
    DependencyExitCapsule,
    FactLedger,
)


# ---------------------------------------------------------------------------
# Job lifecycle states
# ---------------------------------------------------------------------------


class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETE = "complete"
    ERROR = "error"


# ---------------------------------------------------------------------------
# SSE event envelope
# ---------------------------------------------------------------------------


@dataclass
class SSEEvent:
    """
    A single Server-Sent Event pushed through the job queue.
    `source` tag lets Dev 4 style fact vs claim updates differently.
    """
    source: str          # "fact" | "claim" | "merger" | "system"
    event: str           # e.g. "fact_update" | "claim_update" | "complete" | "error"
    data: dict

    def to_sse(self) -> str:
        """Serialise to the SSE wire format."""
        import json
        payload = json.dumps({"source": self.source, "event": self.event, **self.data})
        return f"data: {payload}\n\n"


# ---------------------------------------------------------------------------
# Per-job container
# ---------------------------------------------------------------------------


@dataclass
class MigrationJob:
    job_id: str
    dependency: str
    repo_path: str
    ecosystem: str

    status: JobStatus = JobStatus.QUEUED
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    # Ledger state - mutated as pipeline progresses
    fact_ledger: Optional[FactLedger] = None
    claim_ledger: Optional[ClaimLedger] = None
    capsule: Optional[DependencyExitCapsule] = None

    # SSE broadcast queue - consumers subscribe via AsyncGenerator
    _queue: asyncio.Queue = field(default_factory=lambda: asyncio.Queue(maxsize=256))

    error: Optional[str] = None

    # ------------------------------------------------------------------
    # Helpers called by Dev 1 / Dev 2 pipeline tasks
    # ------------------------------------------------------------------

    def push_fact_update(self, partial_data: dict) -> None:
        """Push a fact-sourced SSE event (non-blocking)."""
        evt = SSEEvent(source="fact", event="fact_update", data=partial_data)
        self._try_put(evt)

    def push_claim_update(self, partial_data: dict) -> None:
        """Push a claim-sourced SSE event (non-blocking)."""
        evt = SSEEvent(source="claim", event="claim_update", data=partial_data)
        self._try_put(evt)

    def push_merger_complete(self, capsule: DependencyExitCapsule) -> None:
        """Signal that the capsule is sealed."""
        self.capsule = capsule
        self.status = JobStatus.COMPLETE
        self.updated_at = datetime.now(timezone.utc)
        evt = SSEEvent(
            source="merger",
            event="complete",
            data={
                "capsule_id": capsule.capsule_id,
                "merge_decision": capsule.merge_decision,
                "overall_risk": capsule.overall_risk,
                "vuln_count": capsule.vuln_count,
                "usage_count": capsule.usage_count,
            },
        )
        self._try_put(evt)
        # Sentinel: tell SSE generator to close the stream
        self._try_put(None)

    def push_error(self, message: str) -> None:
        self.status = JobStatus.ERROR
        self.error = message
        self.updated_at = datetime.now(timezone.utc)
        evt = SSEEvent(source="system", event="error", data={"message": message})
        self._try_put(evt)
        self._try_put(None)

    def _try_put(self, item) -> None:
        try:
            self._queue.put_nowait(item)
        except asyncio.QueueFull:
            pass  # Consumer too slow - drop event rather than block

    async def sse_generator(self):
        """
        Async generator consumed by the /stream endpoint.
        Yields raw SSE-formatted strings until a None sentinel or timeout.
        """
        TIMEOUT = 300  # 5 min hard cap per job stream
        deadline = asyncio.get_event_loop().time() + TIMEOUT
        while True:
            remaining = deadline - asyncio.get_event_loop().time()
            if remaining <= 0:
                yield SSEEvent(source="system", event="timeout", data={}).to_sse()
                break
            try:
                item = await asyncio.wait_for(self._queue.get(), timeout=min(remaining, 30))
            except asyncio.TimeoutError:
                # Heartbeat keep-alive
                yield ": heartbeat\n\n"
                continue
            if item is None:
                break
            yield item.to_sse()


# ---------------------------------------------------------------------------
# Global Job Manager singleton
# ---------------------------------------------------------------------------


class JobManager:
    """
    In-memory store for all active MigrationJobs.
    Singleton accessed via the module-level `job_manager` instance.
    """

    def __init__(self) -> None:
        self._jobs: dict[str, MigrationJob] = {}
        self._lock: asyncio.Lock = asyncio.Lock()

    async def create_job(self, dependency: str, repo_path: str, ecosystem: str) -> MigrationJob:
        job = MigrationJob(
            job_id=f"job-{uuid4().hex[:10]}",
            dependency=dependency,
            repo_path=repo_path,
            ecosystem=ecosystem,
        )
        async with self._lock:
            self._jobs[job.job_id] = job
        return job

    async def get_job(self, job_id: str) -> Optional[MigrationJob]:
        async with self._lock:
            return self._jobs.get(job_id)

    async def list_jobs(self) -> list[dict]:
        async with self._lock:
            return [
                {
                    "job_id": j.job_id,
                    "dependency": j.dependency,
                    "status": j.status,
                    "created_at": j.created_at.isoformat(),
                }
                for j in self._jobs.values()
            ]

    async def purge_complete(self) -> int:
        """Remove finished jobs to prevent unbounded memory growth."""
        async with self._lock:
            done = [jid for jid, j in self._jobs.items() if j.status in (JobStatus.COMPLETE, JobStatus.ERROR)]
            for jid in done:
                del self._jobs[jid]
            return len(done)


# Module-level singleton - import this in routes.py and tasks
job_manager = JobManager()
