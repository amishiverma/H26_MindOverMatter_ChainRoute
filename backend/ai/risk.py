"""
Phase 1 — Risk Analysis Engine

Gemma 4 maintenance-risk analysis for H26 MindOverMatter ChainRoute.

Ported from: traceroot/backend/app/risk/assessment.py
             traceroot/backend/app/risk/heuristic_rules.py

Key adaptations vs. traceroot:
  - Target model: gemma-4 (google.genai SDK)
  - Scope: maintenance risks ONLY (abandoned, stale, low-maintainer).
    Security CVEs are explicitly excluded per Dev-2 scope rules.
  - Output: list[Claim] — all items tagged provenance='model' so the
    Two-Ledger contract (Dev 3) can distinguish AI output from verified Facts.

Contract: Claim schema is defined in backend/contracts/schemas.py (Dev 3).
          We import it lazily so Phase 1 can be tested stand-alone.
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

# ---------------------------------------------------------------------------
# Model configuration (Gemma 4 via Google AI Studio / Vertex AI)
# ---------------------------------------------------------------------------
MODEL_ID = "gemma-4"
TEMPERATURE = 0.2
MAX_OUTPUT_TOKENS = 1024
REQUEST_TIMEOUT_S = 45.0


# ---------------------------------------------------------------------------
# Claim dataclass
# ---------------------------------------------------------------------------

@dataclass
class Claim:
    """
    A single AI-generated assertion about a dependency maintenance health.

    provenance is ALWAYS 'model' for outputs from this module.
    The Two-Ledger design keeps Claims separate from verified Facts (Dev 1).
    """
    dependency: str
    version: str
    risk_indicators: list[str]
    maintenance_score: int
    rationale: str
    provenance: str = "model"
    model_id: str = MODEL_ID
    generated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Internal helpers — ported from traceroot heuristic_rules.py
# ---------------------------------------------------------------------------

def _parse_iso_timestamp(ts: str) -> datetime | None:
    """Parse ISO-8601 timestamp; return None on any error."""
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _days_since_last_release(times: dict[str, str]) -> int | None:
    """
    Calculate days since the most recent release.
    Excludes 'created' / 'modified' metadata keys (ported from traceroot).
    """
    releases: list[datetime] = []
    for version_key, ts in times.items():
        if version_key in ("created", "modified"):
            continue
        dt = _parse_iso_timestamp(ts)
        if dt is not None:
            releases.append(dt)

    if not releases:
        return None

    latest = max(releases)
    now = datetime.now(timezone.utc)
    if latest.tzinfo is None:
        latest = latest.replace(tzinfo=timezone.utc)
    return (now - latest).days


def _has_dormancy_gap(times: dict[str, str], min_gap_days: int = 730) -> bool:
    """
    Return True if any consecutive release gap exceeds min_gap_days.
    Ported from traceroot's _find_dormancy_gaps.
    """
    releases: list[tuple[str, datetime]] = []
    for version_key, ts in times.items():
        if version_key in ("created", "modified"):
            continue
        dt = _parse_iso_timestamp(ts)
        if dt is not None:
            releases.append((version_key, dt))

    releases.sort(key=lambda x: x[1])

    for i in range(1, len(releases)):
        _, prev_dt = releases[i - 1]
        _, curr_dt = releases[i]
        if prev_dt.tzinfo is None:
            prev_dt = prev_dt.replace(tzinfo=timezone.utc)
        if curr_dt.tzinfo is None:
            curr_dt = curr_dt.replace(tzinfo=timezone.utc)
        if (curr_dt - prev_dt).days >= min_gap_days:
            return True

    return False


def _pre_screen_maintenance_flags(dep: dict[str, Any]) -> list[str]:
    """
    Lightweight heuristic pre-screen BEFORE calling Gemma.

    Returns maintenance-specific flags only.
    Security CVEs are explicitly excluded per project scope.
    Ported from traceroot calculate_heuristics().
    """
    flags: list[str] = []
    npm_meta: dict[str, Any] = dep.get("npm_metadata") or {}
    times: dict[str, str] = npm_meta.get("times") or {}

    days = _days_since_last_release(times)
    if days is not None:
        if days > 1095:
            flags.append(f"No release in {days} days (>3 years — likely abandoned)")
        elif days > 365:
            flags.append(f"No release in {days} days (>1 year — stale)")

    if times and _has_dormancy_gap(times):
        flags.append("Historical dormancy gap of >=2 years detected in release timeline")

    maintainers = npm_meta.get("maintainers") or []
    if isinstance(maintainers, list):
        if len(maintainers) == 0:
            flags.append("No listed maintainers — package appears unmaintained")
        elif len(maintainers) == 1:
            flags.append("Single maintainer — bus-factor risk")

    if npm_meta.get("deprecated"):
        flags.append(f"Officially deprecated: {npm_meta['deprecated']}")

    return flags


def _heuristic_score(flags: list[str]) -> int:
    """
    Derive a rough maintenance score from pre-screen flags alone.
    Used as fallback when Gemma is unavailable (capped at 100).
    """
    score = 0
    for flag in flags:
        fl = flag.lower()
        if "abandoned" in fl or "3 years" in fl:
            score += 60
        elif "stale" in fl or "1 year" in fl:
            score += 35
        if "deprecated" in fl:
            score += 50
        if "dormancy gap" in fl:
            score += 25
        if "single maintainer" in fl:
            score += 15
        if "no listed maintainers" in fl:
            score += 40
    return min(score, 100)


# ---------------------------------------------------------------------------
# Robust JSON extraction helper
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
    # Look for first { or [ and last } or ]
    first_brace = text.find('{')
    first_bracket = text.find('[')
    
    if first_brace == -1 and first_bracket == -1:
        return text  # No JSON-like structure found, return as-is for json.loads to fail
    
    # Determine which comes first
    start_idx = first_brace if (first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket)) else first_bracket
    end_char = '}' if text[start_idx] == '{' else ']'
    
    # Find matching closing bracket (naive but handles most cases)
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


# ---------------------------------------------------------------------------
# Gemma 4 client
# ---------------------------------------------------------------------------

def _get_client() -> genai.Client | None:
    """Return authenticated google.genai Client, or None if unconfigured."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set — Gemma 4 calls will be skipped")
        return None
    return genai.Client(api_key=api_key)


def _build_risk_prompt(
    dep_name: str,
    version: str,
    pre_flags: list[str],
    extra_context: dict[str, Any],
) -> str:
    """
    Build the prompt sent to Gemma 4.

    Strict JSON output is enforced in the system instruction so the capsule
    builder can parse the response without regex fragility.
    CVEs are explicitly out of scope.
    """
    pre_flags_text = (
        "\n".join(f"  - {f}" for f in pre_flags)
        if pre_flags
        else "  (none detected by heuristics)"
    )
    context_json = json.dumps(extra_context, indent=2, default=str)

    return f"""You are a software maintenance risk analyst.
Your ONLY job is to evaluate whether a software package is at risk of being
abandoned, unmaintained, or unsuitable for long-term use.

STRICT RULES:
1. Do NOT discuss security vulnerabilities, CVEs, or exploit risk.
2. Focus SOLELY on: abandonment, deprecation, maintenance cadence,
   single-maintainer risk, lack of community activity.
3. Respond with VALID JSON only — no markdown fences, no prose outside JSON.
4. Use the exact schema shown below.

JSON SCHEMA:
{{
  "risk_indicators": ["<string>", ...],
  "maintenance_score": <integer 0-100>,
  "rationale": "<one concise paragraph, <=120 words>"
}}

  risk_indicators : list of maintenance-risk flags you identified
  maintenance_score: 0=actively maintained, 100=completely abandoned
  rationale : one paragraph explaining the score

---
PACKAGE: {dep_name}
VERSION: {version}

PRE-SCREENED HEURISTIC FLAGS (maintenance signals already detected):
{pre_flags_text}

ADDITIONAL CONTEXT:
{context_json}
---
Respond with JSON only."""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_risk(repo_metadata: dict[str, Any]) -> list[Claim]:
    """
    Analyze maintenance risks for all dependencies in repo_metadata.

    Args:
        repo_metadata: dict produced by Dev 1's Sandbox/AST census.
            Expected shape::

                {
                    "dependencies": [
                        {
                            "package": str,
                            "version": str,
                            "npm_metadata": {
                                "times": {"1.0.0": "<iso>", ...},
                                "maintainers": [{"name": ..., "email": ...}],
                                "deprecated": str | None
                            },
                        },
                        ...
                    ]
                }

    Returns:
        list[Claim] — one Claim per dependency.
        provenance is always 'model'; Gemma API failures degrade gracefully
        to heuristic-only Claims rather than raising exceptions.
    """
    dependencies: list[dict[str, Any]] = repo_metadata.get("dependencies", [])
    if not dependencies:
        logger.warning("analyze_risk: repo_metadata contains no dependencies")
        return []

    client = _get_client()
    claims: list[Claim] = []

    gemma_config = types.GenerateContentConfig(
        temperature=TEMPERATURE,
        max_output_tokens=MAX_OUTPUT_TOKENS,
        http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_S),
    )

    for dep in dependencies:
        pkg_name: str = dep.get("package", "unknown")
        version: str = dep.get("version", "unknown")

        # Step 1: Cheap heuristic pre-screen (zero API cost)
        pre_flags = _pre_screen_maintenance_flags(dep)

        # Step 2: Build compact context for Gemma (exclude CVE-related keys)
        npm_meta = dep.get("npm_metadata") or {}
        extra_context: dict[str, Any] = {
            k: v for k, v in dep.items()
            if k not in ("package", "version", "vulnerabilities", "npm_metadata")
        }
        extra_context["npm_maintainer_count"] = len(npm_meta.get("maintainers") or [])
        extra_context["npm_deprecated"] = npm_meta.get("deprecated")

        # Step 3: Call Gemma 4 or fall back to heuristic-only
        risk_indicators: list[str] = list(pre_flags)
        maintenance_score: int = _heuristic_score(pre_flags)
        rationale: str = ""

        if client is not None:
            prompt = _build_risk_prompt(pkg_name, version, pre_flags, extra_context)
            try:
                response = client.models.generate_content(
                    model=MODEL_ID,
                    contents=prompt,
                    config=gemma_config,
                )
                raw_text = (response.text or "").strip()

                # Robust JSON extraction
                json_text = _extract_json(raw_text)

                parsed: dict[str, Any] = json.loads(json_text)
                risk_indicators = parsed.get("risk_indicators", risk_indicators)
                maintenance_score = int(parsed.get("maintenance_score", maintenance_score))
                maintenance_score = max(0, min(100, maintenance_score))
                rationale = str(parsed.get("rationale", ""))

            except json.JSONDecodeError as exc:
                rationale = f"[PARSE_ERROR: Gemma response was not valid JSON — {exc}]"
                logger.error("analyze_risk: JSON parse error for %s: %s", pkg_name, exc)
            except Exception as exc:  # noqa: BLE001
                rationale = f"[API_ERROR: {type(exc).__name__}: {exc}]"
                logger.error("analyze_risk: Gemma API error for %s: %s", pkg_name, exc)
        else:
            if pre_flags:
                rationale = (
                    f"{pkg_name}@{version} shows {len(pre_flags)} maintenance "
                    f"concern(s): {'; '.join(pre_flags)}. "
                    "AI-generated rationale unavailable (GEMINI_API_KEY not configured)."
                )
            else:
                rationale = (
                    f"{pkg_name}@{version} shows no heuristic maintenance flags. "
                    "AI analysis skipped (GEMINI_API_KEY not configured)."
                )

        claims.append(
            Claim(
                dependency=pkg_name,
                version=version,
                risk_indicators=risk_indicators,
                maintenance_score=maintenance_score,
                rationale=rationale,
                provenance="model",
                model_id=MODEL_ID,
            )
        )

    logger.info("analyze_risk: produced %d Claim(s)", len(claims))
    return claims