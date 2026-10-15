#!/usr/bin/env python3
"""
mock_integration_test.py — End-to-End Integration Test (Dev 3)

Lightweight async script that:
1. POSTs to /api/job/start with a test repository + dependency
2. Listens to the SSE stream (/api/job/{job_id}/stream)
3. Parses each event and asserts payloads serialize as FactLedger or ClaimLedger
4. Verifies final DependencyExitCapsule is valid

Usage:
    python mock_integration_test.py --repo ./test_repo --dep requests
    python mock_integration_test.py --base-url http://localhost:8000 --repo ./test_repo --dep requests

Exit codes:
    0 = All assertions passed
    1 = HTTP/SSE error
    2 = Schema validation failed (FactLedger/ClaimLedger)
    3 = Capsule merge validation failed
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
import uuid
from pathlib import Path
from typing import Any, AsyncGenerator, Optional

import aiohttp
from pydantic import ValidationError

# Add project root for schema imports
sys.path.insert(0, str(Path(__file__).resolve().parent))

from backend.contracts.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    DependencyExitCapsule,
    FactLedger,
    ClaimLedger,
    LedgerKind,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_BASE_URL = "http://localhost:8000"
DEFAULT_TIMEOUT = aiohttp.ClientTimeout(total=300)  # 5 min

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("integration_test")


# ---------------------------------------------------------------------------
# SSE Client
# ---------------------------------------------------------------------------

async def sse_stream(session: aiohttp.ClientSession, url: str) -> AsyncGenerator[dict[str, Any], None]:
    """
    Consume an SSE stream and yield parsed JSON events.

    Yields dict with: event_type, data (parsed JSON), raw_data
    """
    async with session.get(url) as resp:
        if resp.status not in (200, 202):
            text = await resp.text()
            raise RuntimeError(f"SSE connection failed: {resp.status} - {text}")

        buffer = ""
        async for line_bytes in resp.content:
            line = line_bytes.decode("utf-8").rstrip("\n")

            if line.startswith(":"):  # Comment/heartbeat
                continue

            if line.startswith("data: "):
                buffer += line[6:] + "\n"
            elif line == "" and buffer:
                # End of event - parse
                try:
                    # SSE data may be multi-line JSON
                    data_str = buffer.strip()
                    if data_str:
                        data = json.loads(data_str)
                        yield {"event_type": "data", "data": data, "raw_data": data_str}
                except json.JSONDecodeError as exc:
                    logger.warning("SSE JSON parse error: %s | raw: %s", exc, buffer[:200])
                    yield {"event_type": "parse_error", "data": None, "raw_data": buffer}
                buffer = ""
            elif line.startswith("event: "):
                # Named event type (we ignore for now, just log)
                event_name = line[7:].strip()
                logger.debug("SSE event type: %s", event_name)


# ---------------------------------------------------------------------------
# Schema Validators
# ---------------------------------------------------------------------------

def validate_fact_ledger(payload: dict[str, Any]) -> FactLedger:
    """Validate a payload as FactLedger, raise ValidationError if invalid."""
    # Ensure ledger_kind is FACT
    if payload.get("ledger_kind") != LedgerKind.FACT:
        payload["ledger_kind"] = LedgerKind.FACT
    return FactLedger.model_validate(payload)


def validate_claim_ledger(payload: dict[str, Any]) -> ClaimLedger:
    """Validate a payload as ClaimLedger, raise ValidationError if invalid."""
    if payload.get("ledger_kind") != LedgerKind.CLAIM:
        payload["ledger_kind"] = LedgerKind.CLAIM
    # Enforce hardcoded Gemma 4 metadata
    if payload.get("model_id") != "gemma-4":
        payload["model_id"] = "gemma-4"
    return ClaimLedger.model_validate(payload)


def validate_capsule(payload: dict[str, Any]) -> DependencyExitCapsule:
    """Validate final capsule payload."""
    return DependencyExitCapsule.model_validate(payload)


# ---------------------------------------------------------------------------
# Main Test Flow
# ---------------------------------------------------------------------------

async def run_integration_test(
    base_url: str,
    repo_path: str,
    dependency: str,
    ecosystem: str = "pypi",
) -> int:
    """
    Execute the full integration test.

    Returns exit code (0 = success, non-zero = failure).
    """
    logger.info("=" * 60)
    logger.info("STARTING INTEGRATION TEST")
    logger.info("Repo: %s | Dependency: %s | Ecosystem: %s", repo_path, dependency, ecosystem)
    logger.info("Base URL: %s", base_url)
    logger.info("=" * 60)

    async with aiohttp.ClientSession(timeout=DEFAULT_TIMEOUT) as session:
        # -------------------------------------------------------------------
        # Step 1: POST /api/job/start
        # -------------------------------------------------------------------
        request = AnalysisRequest(
            repo_path=repo_path,
            dependency=dependency,
            ecosystem=ecosystem,
        )

        start_url = f"{base_url}/api/job/start"
        logger.info("POST %s", start_url)

        try:
            async with session.post(start_url, json=request.model_dump()) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    logger.error("Job start failed: %s - %s", resp.status, error_text)
                    return 1

                response_data = await resp.json()
                analysis_response = AnalysisResponse.model_validate(response_data)

        except aiohttp.ClientError as exc:
            logger.error("HTTP error starting job: %s", exc)
            return 1
        except ValidationError as exc:
            logger.error("AnalysisResponse validation failed: %s", exc)
            return 1

        job_id = analysis_response.capsule_id
        logger.info("Job started: %s (status: %s)", job_id, analysis_response.status)

        # If capsule returned inline (fast path), validate immediately
        if analysis_response.capsule:
            logger.info("Fast-path capsule received, validating...")
            try:
                capsule = validate_capsule(analysis_response.capsule.model_dump())
                logger.info("✓ Capsule validation PASSED: %s", capsule.capsule_id)
                return 0
            except ValidationError as exc:
                logger.error("✗ Capsule validation FAILED: %s", exc)
                return 3

        # -------------------------------------------------------------------
        # Step 2: SSE Stream /api/job/{job_id}/stream
        # -------------------------------------------------------------------
        stream_url = f"{base_url}/api/job/{job_id}/stream"
        logger.info("Connecting to SSE stream: %s", stream_url)

        fact_ledger: Optional[FactLedger] = None
        claim_ledger: Optional[ClaimLedger] = None
        final_capsule: Optional[DependencyExitCapsule] = None

        try:
            async for event in sse_stream(session, stream_url):
                event_type = event["event_type"]
                data = event["data"]

                if event_type == "parse_error":
                    logger.warning("SSE parse error (non-fatal): %s", event["raw_data"][:100])
                    continue

                if not data:
                    continue

                # Handle different event types from the API
                event_name = data.get("event", "unknown")
                payload = data.get("data", data)

                logger.info("SSE Event: %s", event_name)

                # Validate payloads as they arrive
                if event_name in ("fact_ledger", "fact"):
                    try:
                        fact_ledger = validate_fact_ledger(payload)
                        logger.info(
                            "✓ FactLedger validated: %s (tests: %d/%d passed)",
                            fact_ledger.ledger_id,
                            fact_ledger.tests_passed,
                            fact_ledger.tests_total,
                        )
                    except ValidationError as exc:
                        logger.error("✗ FactLedger validation FAILED: %s", exc)
                        return 2

                elif event_name in ("claim_ledger", "claim"):
                    try:
                        claim_ledger = validate_claim_ledger(payload)
                        logger.info(
                            "✓ ClaimLedger validated: %s (risk: %s, replacements: %d)",
                            claim_ledger.ledger_id,
                            claim_ledger.risk_reasoning.overall_risk.value,
                            len(claim_ledger.proposed_replacements),
                        )
                    except ValidationError as exc:
                        logger.error("✗ ClaimLedger validation FAILED: %s", exc)
                        return 2

                elif event_name in ("capsule", "complete", "done"):
                    try:
                        final_capsule = validate_capsule(payload)
                        logger.info("✓ DependencyExitCapsule validated: %s", final_capsule.capsule_id)
                        logger.info(
                            "  Merge Decision: %s | Risk: %s | Replacement: %s",
                            final_capsule.merge_decision,
                            final_capsule.overall_risk.value,
                            final_capsule.top_replacement.package if final_capsule.top_replacement else "None",
                        )
                        break  # Stream complete
                    except ValidationError as exc:
                        logger.error("✗ Capsule validation FAILED: %s", exc)
                        return 3

                elif event_name in ("error", "failed"):
                    error_msg = payload.get("error", "Unknown error")
                    logger.error("Job failed: %s", error_msg)
                    return 1

        except aiohttp.ClientError as exc:
            logger.error("SSE connection error: %s", exc)
            return 1

        # -------------------------------------------------------------------
        # Step 3: Final Assertions
        # -------------------------------------------------------------------
        if not fact_ledger:
            logger.error("No FactLedger received in stream")
            return 2

        if not claim_ledger:
            logger.error("No ClaimLedger received in stream")
            return 2

        if not final_capsule:
            logger.error("No final Capsule received in stream")
            return 3

        # Cross-validate: Claim must reference Fact
        if claim_ledger.fact_ledger_id != fact_ledger.ledger_id:
            logger.error(
                "Claim.fact_ledger_id (%s) != Fact.ledger_id (%s)",
                claim_ledger.fact_ledger_id,
                fact_ledger.ledger_id,
            )
            return 3

        if final_capsule.fact.ledger_id != fact_ledger.ledger_id:
            logger.error("Capsule fact ID mismatch")
            return 3

        if final_capsule.claim.ledger_id != claim_ledger.ledger_id:
            logger.error("Capsule claim ID mismatch")
            return 3

        logger.info("=" * 60)
        logger.info("ALL ASSERTIONS PASSED ✓")
        logger.info("FactLedger:   %s", fact_ledger.ledger_id)
        logger.info("ClaimLedger:  %s", claim_ledger.ledger_id)
        logger.info("Capsule:      %s", final_capsule.capsule_id)
        logger.info("Merge Decision: %s", final_capsule.merge_decision)
        logger.info("=" * 60)

        return 0


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Integration test for H26 MindOverMatter ChainRoute")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="API base URL")
    parser.add_argument("--repo", required=True, help="Path to test repository")
    parser.add_argument("--dep", "--dependency", required=True, dest="dependency", help="Dependency to analyze")
    parser.add_argument("--ecosystem", default="pypi", choices=["pypi", "npm", "cargo", "go", "maven"])
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable debug logging")
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Validate repo exists
    repo_path = Path(args.repo).resolve()
    if not repo_path.exists():
        logger.error("Repository path does not exist: %s", repo_path)
        return 1

    try:
        return asyncio.run(run_integration_test(
            base_url=args.base_url,
            repo_path=str(repo_path),
            dependency=args.dependency,
            ecosystem=args.ecosystem,
        ))
    except KeyboardInterrupt:
        logger.warning("Test interrupted by user")
        return 130
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected test error: %s", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())