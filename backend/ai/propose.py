"""
Phase 2 — Proposal & Patch Generator (propose)

Gemma 4 proposal and code-patch generator for H26 MindOverMatter ChainRoute.

Suggests modern, maintained replacements for deprecated/risky dependencies
and generates unified-diff code patches to swap them safely.

Output: list[Claim] tagged with provenance="model" and model_id="gemma-4".
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
MAX_OUTPUT_TOKENS = 2048
REQUEST_TIMEOUT_S = 60.0


@dataclass
class Claim:
    """
    An AI-generated proposal Claim suggesting a replacement and patch.

    All Claims from this module are tagged with provenance="model".
    """
    dependency: str
    proposed_replacement: str
    migration_steps: list[str] = field(default_factory=list)
    suggested_tests: list[str] = field(default_factory=list)
    diff_patch: str | None = None
    rationale: str = ""
    provenance: str = "model"
    model_id: str = MODEL_ID
    generated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Robust JSON extraction helper (shared with risk.py)
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


def _build_propose_prompt(target_dependency: str, usage_context: str) -> str:
    """
    Construct system + user prompt for Gemma 4 with strict JSON schema.
    """
    return f"""You are an expert software modernization and migration engineer.
Your task is to analyze a target dependency and its repository usage context,
propose a modern, actively maintained replacement package, outline step-by-step
migration instructions, suggest validation tests, and generate an optional unified-diff patch.

STRICT INSTRUCTIONS:
1. Suggest modern, actively maintained drop-in or near drop-in replacement packages.
2. If code usage context is provided, generate a valid unified diff (diff -u format) that replaces the import and invocation sites.
3. If no code changes are required or context is empty, set diff_patch to null.
4. Output MUST BE STRICT VALID JSON ONLY. No markdown outside or wrapping the JSON, no markdown code block fences.

JSON SCHEMA:
{{
  "proposals": [
    {{
      "proposed_replacement": "<package_name and recommended version>",
      "rationale": "<explanation of why this replacement is recommended, maintenance status, benefits>",
      "migration_steps": [
        "<Step 1: package installation / removal>",
        "<Step 2: import modifications>",
        "<Step 3: API call adaptations>"
      ],
      "suggested_tests": [
        "<test case 1: verify equivalence of response/output>",
        "<test case 2: verify error handling / timeout behavior>"
      ],
      "diff_patch": "<unified diff string starting with --- and +++ or null>"
    }}
  ]
}}

TARGET DEPENDENCY:
{target_dependency}

USAGE CONTEXT / CODE SNIPPETS:
{usage_context if usage_context.strip() else "(No explicit usage snippet provided. Propose based on standard library practices.)"}

Respond with strict JSON adhering to the schema above."""


# Fallback knowledge base for offline or zero-key environments
_KNOWN_REPLACEMENTS: dict[str, dict[str, Any]] = {
    "requests": {
        "replacement": "httpx >=0.27.0",
        "rationale": "httpx provides modern HTTP/2 support, native async/sync parity, type annotations, and active maintenance.",
        "steps": [
            "Install httpx: uv pip install httpx",
            "Remove requests from requirements / pyproject.toml",
            "Replace `import requests` with `import httpx`",
            "Update `requests.get/post` calls to `httpx.get/post`"
        ],
        "tests": [
            "Test GET request handling and status code assertions",
            "Verify timeout handling with httpx.TimeoutException",
            "Verify streaming response / JSON decoding"
        ],
    },
    "pycrypto": {
        "replacement": "cryptography >=42.0.0",
        "rationale": "pycrypto has been unmaintained since 2013 and has critical vulnerabilities. cryptography is the industry standard.",
        "steps": [
            "Uninstall pycrypto and install cryptography: uv pip install cryptography",
            "Migrate cipher initialization to cryptography.hazmat.primitives.ciphers"
        ],
        "tests": [
            "Verify encryption and decryption round-trips match expected plaintext",
            "Verify key derivation and padding behavior"
        ],
    },
    "moment": {
        "replacement": "date-fns >=3.0.0 (or dayjs)",
        "rationale": "Moment.js is in maintenance mode and lacks tree-shaking. date-fns is modular and lightweight.",
        "steps": [
            "Install date-fns: npm install date-fns",
            "Replace moment() formatting with format() from date-fns",
            "Remove moment package"
        ],
        "tests": [
            "Verify ISO date parsing and formatted output across timezones",
            "Verify date addition / subtraction math"
        ],
    },
}


def _generate_fallback_claim(target_dependency: str, usage_context: str) -> Claim:
    """Deterministic fallback proposal when Gemma 4 API key is not present."""
    clean_dep = target_dependency.strip().lower()
    known = _KNOWN_REPLACEMENTS.get(clean_dep)

    if known:
        rep = known["replacement"]
        rationale = known["rationale"]
        steps = known["steps"]
        tests = known["tests"]
    else:
        rep = f"{target_dependency}-modern (or vetted standard alternative)"
        rationale = (
            f"Replace legacy '{target_dependency}' with a maintained, actively supported alternative. "
            "Offline heuristic proposal generated (GEMINI_API_KEY not configured)."
        )
        steps = [
            f"Review AST census usage for {target_dependency}",
            f"Install modern replacement for {target_dependency}",
            "Update imports and verify API compatibility",
            f"Remove {target_dependency} from project requirements"
        ]
        tests = [
            f"Verify existing test suite passes with replacement for {target_dependency}",
            "Add integration test verifying replacement functionality"
        ]

    diff_patch = None
    if usage_context and "import " + clean_dep in usage_context.lower():
        # Build simple unified diff example if snippet contains import
        diff_patch = (
            f"--- a/module.py\n"
            f"+++ b/module.py\n"
            f"@@ -1,3 +1,3 @@\n"
            f"-import {target_dependency}\n"
            f"+import {rep.split()[0]}\n"
        )

    return Claim(
        dependency=target_dependency,
        proposed_replacement=rep,
        migration_steps=steps,
        suggested_tests=tests,
        diff_patch=diff_patch,
        rationale=rationale,
        provenance="model",
        model_id=MODEL_ID,
    )


def propose(target_dependency: str, usage_context: str = "") -> list[Claim]:
    """
    Suggest modern replacement(s) and unified-diff code patches for target_dependency.

    Args:
        target_dependency: name of the dependency to replace (e.g. 'requests', 'moment')
        usage_context: code snippet or AST census locations showing how the dependency is used.

    Returns:
        list[Claim] tagged with provenance="model".
    """
    if not target_dependency or not target_dependency.strip():
        logger.warning("propose: empty target_dependency provided")
        return []

    target_dep = target_dependency.strip()
    client = _get_client()

    if client is None:
        return [_generate_fallback_claim(target_dep, usage_context)]

    prompt = _build_propose_prompt(target_dep, usage_context)
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

        # Robust JSON extraction
        json_text = _extract_json(raw_text)

        parsed = json.loads(json_text)

        # Handle list vs dict with proposals key vs single proposal dict
        proposals_raw: list[dict[str, Any]] = []
        if isinstance(parsed, list):
            proposals_raw = parsed
        elif isinstance(parsed, dict):
            if "proposals" in parsed and isinstance(parsed["proposals"], list):
                proposals_raw = parsed["proposals"]
            else:
                proposals_raw = [parsed]

        claims: list[Claim] = []
        for prop in proposals_raw:
            rep = prop.get("proposed_replacement") or f"{target_dep}-replacement"
            steps = prop.get("migration_steps") or []
            tests = prop.get("suggested_tests") or []
            diff = prop.get("diff_patch")
            rat = prop.get("rationale") or f"Recommended replacement for {target_dep}."

            # Validate diff_patch format if present
            if isinstance(diff, str) and diff.strip():
                diff_stripped = diff.strip()
                # Ensure it looks like a unified diff (starts with --- and +++)
                if not (diff_stripped.startswith("---") and "+++" in diff_stripped.splitlines()[1] if len(diff_stripped.splitlines()) > 1 else False):
                    logger.warning("propose: diff_patch does not appear to be valid unified diff format, discarding")
                    diff_stripped = None
            else:
                diff_stripped = None

            claims.append(
                Claim(
                    dependency=target_dep,
                    proposed_replacement=rep,
                    migration_steps=steps if isinstance(steps, list) else [str(steps)],
                    suggested_tests=tests if isinstance(tests, list) else [str(tests)],
                    diff_patch=diff_stripped,
                    rationale=rat,
                    provenance="model",
                    model_id=MODEL_ID,
                )
            )

        if not claims:
            claims.append(_generate_fallback_claim(target_dep, usage_context))

        return claims

    except json.JSONDecodeError as exc:
        logger.error("propose: JSON parse error from Gemma: %s", exc)
        claim = _generate_fallback_claim(target_dep, usage_context)
        claim.rationale += f" [Note: Gemma response JSON decode error: {exc}]"
        return [claim]
    except Exception as exc:  # noqa: BLE001
        logger.error("propose: Gemma API error: %s", exc)
        claim = _generate_fallback_claim(target_dep, usage_context)
        claim.rationale += f" [Note: Gemma API exception: {type(exc).__name__}: {exc}]"
        return [claim]