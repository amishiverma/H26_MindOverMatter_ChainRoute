"""
Phase 3 — Gap Evaluation Engine (evaluate_gaps)

Gemma 4 gap evaluation engine for H26 MindOverMatter ChainRoute.

Evaluates Dev 1 verified test execution Facts (PASS/FAIL outcomes, JUnit logs,
stderr, stdout, and diffs). If tests fail, prompts Gemma 4 to analyze the
root-cause discrepancy and generate a precise technical narrative explaining
"Open Concerns and Limitations".

Output: Claim tagged with provenance="model" and model_id="gemma-4".
"""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

MODEL_ID = "gemma-4"
TEMPERATURE = 0.2
MAX_OUTPUT_TOKENS = 1536
REQUEST_TIMEOUT_S = 45.0


@dataclass
class Claim:
    """
    An AI-generated Claim assessing gaps and limitations from test Facts.

    All Claims from this module are tagged with provenance="model".
    """
    verdict: str                               # "passed" | "failed"
    open_concerns: list[str] = field(default_factory=list)
    narrative: str = ""                        # Explanation of Open Concerns and Limitations
    failed_count: int = 0
    passed_count: int = 0
    provenance: str = "model"
    model_id: str = MODEL_ID
    generated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Robust JSON extraction helper (shared with risk.py, propose.py)
# ---------------------------------------------------------------------------

_JSON_FENCE_PATTERN = re.compile(r"^```(?:json)?\s*\n?(.*?)\n?```$", re.DOTALL | re.IGNORECASE)

def _extract_json(raw_text: str) -> str:
    """
    Robustly extract JSON from model output, handling:
    - Bare JSON
    - Markdown fences with or without language specifier (```json, ```JSON, ```)
    - Leading/trailing whitespace
    - Accidental prose before/after JSON (best effort)
    """
    text = raw_text.strip()
    
    # Try markdown fence first
    fence_match = _JSON_FENCE_PATTERN.match(text)
    if fence_match:
        return fence_match.group(1).strip()
    
    # Try to find JSON object/array boundaries if wrapped in prose
    first_brace = text.find('{')
    first_bracket = text.find('[')
    
    if first_brace == -1 and first_bracket == -1:
        return text
    
    start_idx = first_brace if (first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket)) else first_bracket
    end_char = '}' if text[start_idx] == '{' else ']'
    
    depth = 0
    end_idx = -1
    for i, ch in enumerate(text[start_idx:], start=start_idx):
        if ch == text[start_idx]:
            depth += 1
        elif ch == end_char:
            depth -= 1
            if depth == 0:
                end_idx = i
                break
    
    if end_idx != -1:
        return text[start_idx:end_idx + 1]
    
    return text


def _get_client() -> genai.Client | None:
    """Return authenticated google.genai Client, or None if unconfigured."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set — Gemma 4 calls will be skipped")
        return None
    return genai.Client(api_key=api_key)


def _extract_failures(test_facts: dict[str, Any]) -> tuple[list[dict[str, str]], int, int]:
    """
    Extract failure details, passed count, and failed count from test_facts.
    Supports PytestRun dicts, BaselineResult dicts, or generic test summaries.
    
    Robustly handles malformed or missing keys in test_facts.
    """
    failed_items: list[dict[str, str]] = []
    passed_count = 0
    failed_count = 0

    # Guard against non-dict input (already handled in caller, but defensive)
    if not isinstance(test_facts, dict):
        logger.warning("_extract_failures: test_facts is not a dict; treating as empty")
        return [], 0, 0

    # 1. Check test_cases list (PytestRun structure)
    test_cases = test_facts.get("test_cases")
    if isinstance(test_cases, list) and test_cases:
        for tc in test_cases:
            if not isinstance(tc, dict):
                continue
            outcome = str(tc.get("outcome", "")).lower()
            if outcome in ("failed", "error"):
                failed_count += 1
                failed_items.append({
                    "nodeid": str(tc.get("nodeid", "unknown")),
                    "name": str(tc.get("name", "unknown")),
                    "message": str(tc.get("message", "Test failed without message")),
                })
            elif outcome == "passed":
                passed_count += 1

    # 2. Check explicit failed_tests / failures list
    failures_field = test_facts.get("failed_tests") or test_facts.get("failures")
    if isinstance(failures_field, list) and failures_field:
        for f in failures_field:
            if isinstance(f, dict):
                # Deduplicate by nodeid
                nodeid = str(f.get("nodeid", "unknown"))
                if not any(item["nodeid"] == nodeid for item in failed_items):
                    failed_items.append({
                        "nodeid": nodeid,
                        "message": str(f.get("message", f)),
                    })
                    failed_count += 1
            elif isinstance(f, str):
                failed_items.append({"nodeid": f, "message": f})
                failed_count += 1

    # 3. Check baseline stable_fail / flakiness structure
    stable_fails = test_facts.get("stable_fail")
    if isinstance(stable_fails, list):
        for sf in stable_fails:
            nodeid = str(sf) if isinstance(sf, str) else str(sf.get("nodeid", str(sf)))
            if not any(item["nodeid"] == nodeid for item in failed_items):
                failed_items.append({"nodeid": nodeid, "message": "Failed in baseline runs"})
                failed_count += 1

    # Explicit count overrides if present
    if "failed_count" in test_facts:
        try:
            failed_count = int(test_facts["failed_count"])
        except (ValueError, TypeError):
            logger.warning("_extract_failures: failed_count not an int, ignoring")
    if "passed_count" in test_facts:
        try:
            passed_count = int(test_facts["passed_count"])
        except (ValueError, TypeError):
            logger.warning("_extract_failures: passed_count not an int, ignoring")

    # Fallback to exit_code if non-zero and no items collected yet
    exit_code = test_facts.get("exit_code")
    if exit_code is not None:
        try:
            if int(exit_code) != 0 and failed_count == 0:
                failed_count = 1
                stderr_msg = test_facts.get("stderr") or test_facts.get("stdout") or f"Process exited with code {exit_code}"
                failed_items.append({"nodeid": "process_execution", "message": str(stderr_msg)[:1000]})
        except (ValueError, TypeError):
            pass

    return failed_items, passed_count, failed_count


def _build_gaps_prompt(failed_items: list[dict[str, str]], test_facts: dict[str, Any]) -> str:
    """Build prompt instructing Gemma 4 to analyze test failures and synthesize open concerns."""
    failures_summary = "\n".join(
        f"- Node: {item.get('nodeid', 'unknown')}\n  Error/Message: {item.get('message', 'N/A')}"
        for item in failed_items[:10]  # Cap to first 10 for context window safety
    )

    stdout_snippet = str(test_facts.get("stdout", ""))[-2000:]
    stderr_snippet = str(test_facts.get("stderr", ""))[-2000:]
    diff_snippet = str(test_facts.get("diff", ""))[-1500:]

    return f"""You are a software verification and test triage specialist.
We executed automated sandbox test runs against code that underwent dependency migration.
The tests FAILED. You must analyze the failure logs, error traces, and diffs to determine
the exact behavioral or API mismatch, and author a clear technical report on:
'Open Concerns and Limitations'.

STRICT RULES:
1. Identify concrete technical root causes (e.g. signature change, synchronous vs asynchronous API mismatch, altered return types, missing headers, or exception class differences).
2. Do not invent non-existent CVEs or generic fluff.
3. Respond in VALID JSON ONLY. No markdown outside or wrapping the JSON, no markdown fences.

JSON SCHEMA:
{{
  "open_concerns": [
    "<specific concern 1, e.g. API signature mismatch on method X>",
    "<specific concern 2, e.g. Unhandled status code in mock transport>"
  ],
  "narrative": "<clear multi-paragraph narrative explaining the root causes, behavioral gaps, and recommended manual remediation steps>"
}}

FAILED TEST CASES:
{failures_summary}

ADDITIONAL CONTEXT / STDOUT:
{stdout_snippet if stdout_snippet.strip() else "(None)"}

STDERR:
{stderr_snippet if stderr_snippet.strip() else "(None)"}

PATCH DIFF (if available):
{diff_snippet if diff_snippet.strip() else "(None)"}

Respond with JSON only."""


def evaluate_gaps(test_facts: dict[str, Any]) -> Claim:
    """
    Evaluate executed test Facts and generate an AI Claim explaining Open Concerns and Limitations.

    Args:
        test_facts: dictionary containing executed test results (Facts) from Dev 1's sandbox.

    Returns:
        Claim: typed Claim tagged with provenance="model".
    """
    # Robust input validation
    if not isinstance(test_facts, dict):
        logger.warning("evaluate_gaps: test_facts is not a dict; treating as empty facts")
        test_facts = {}

    try:
        failed_items, passed_count, failed_count = _extract_failures(test_facts)
    except Exception as exc:  # noqa: BLE001
        logger.error("evaluate_gaps: _extract_failures raised exception: %s", exc)
        failed_items, passed_count, failed_count = [], 0, 0

    # If all tests passed and no exit code failure reported:
    if failed_count == 0 and not failed_items:
        narrative = (
            f"All {passed_count} verification test(s) completed successfully with 0 failures. "
            "No behavioral regressions, breaking API changes, or unresolved execution gaps detected."
        )
        return Claim(
            verdict="passed",
            open_concerns=[],
            narrative=narrative,
            failed_count=0,
            passed_count=passed_count,
            provenance="model",
            model_id=MODEL_ID,
        )

    # Tests failed — evaluate gaps using Gemma 4 or deterministic fallback
    client = _get_client()

    if client is None:
        concerns = [
            f"Test failure in {item.get('nodeid', 'test')}: {item.get('message', '')[:100]}"
            for item in failed_items[:5]
        ]
        fallback_narrative = (
            f"Sandbox execution encountered {failed_count} failure(s) across test runs. "
            f"Primary failure points:\n"
            + "\n".join(f" - {c}" for c in concerns)
            + "\nAI in-depth log narrative unavailable (GEMINI_API_KEY not configured)."
        )
        return Claim(
            verdict="failed",
            open_concerns=concerns,
            narrative=fallback_narrative,
            failed_count=failed_count,
            passed_count=passed_count,
            provenance="model",
            model_id=MODEL_ID,
        )

    prompt = _build_gaps_prompt(failed_items, test_facts)
    gemma_config = types.GenerateContentConfig(
        temperature=TEMPERATURE,
        max_output_tokens=MAX_OUTPUT_TOKENS,
        http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_S),
    )

    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=gemma_config,
        )
        raw_text = (response.text or "").strip()

        if not raw_text:
            raise json.JSONDecodeError("Empty response from Gemma", "", 0)

        # Robust JSON extraction
        json_text = _extract_json(raw_text)

        parsed = json.loads(json_text)
        concerns = parsed.get("open_concerns", [])
        if not isinstance(concerns, list):
            concerns = [str(concerns)]
        narrative = str(parsed.get("narrative", ""))

        return Claim(
            verdict="failed",
            open_concerns=concerns,
            narrative=narrative,
            failed_count=failed_count,
            passed_count=passed_count,
            provenance="model",
            model_id=MODEL_ID,
        )

    except json.JSONDecodeError as exc:
        logger.error("evaluate_gaps: JSON decode error from Gemma: %s", exc)
        concerns = [f"Failure in {item.get('nodeid', 'test')}" for item in failed_items]
        return Claim(
            verdict="failed",
            open_concerns=concerns,
            narrative=f"Test failures detected ({failed_count} failures). JSON parse error during Gemma log synthesis: {exc}",
            failed_count=failed_count,
            passed_count=passed_count,
            provenance="model",
            model_id=MODEL_ID,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("evaluate_gaps: Gemma API error: %s", exc)
        concerns = [f"Failure in {item.get('nodeid', 'test')}" for item in failed_items]
        return Claim(
            verdict="failed",
            open_concerns=concerns,
            narrative=f"Test failures detected ({failed_count} failures). Gemma API error during evaluation: {type(exc).__name__}: {exc}",
            failed_count=failed_count,
            passed_count=passed_count,
            provenance="model",
            model_id=MODEL_ID,
        )