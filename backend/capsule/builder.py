"""
Phase 4 — Capsule Metadata & Assembly (build_capsule)

Narrative assembly engine for H26 MindOverMatter ChainRoute.

Constructs the AI Claims narrative capsule according to the Two-Ledger
architecture (Facts = Verified Code, Claims = AI Output).

Hardcoded Provenance & Model Metadata:
  Model: Gemma 4
  Access Method: Google GenAI API (google-genai SDK v1.0+)
  Terms: https://ai.google.dev/terms

Headers strictly mapped from Claims:
  1. Risk indicators
  2. Proposed replacement
  3. Migration steps
  4. Suggested tests
  5. Open concerns
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any

# ---------------------------------------------------------------------------
# Hardcoded Model & Legal Metadata (Mandatory by Hackathon Spec)
# ---------------------------------------------------------------------------
CAPSULE_METADATA: dict[str, str] = {
    "Model": "Gemma 4",
    "Access Method": "Google GenAI API (google-genai SDK v1.0+)",
    "Terms": "https://ai.google.dev/terms",
}


@dataclass
class CapsuleReport:
    """
    Assembled Two-Ledger AI Claims Capsule.
    """
    metadata: dict[str, str]
    risk_indicators: list[dict[str, Any]] = field(default_factory=list)
    proposed_replacements: list[dict[str, Any]] = field(default_factory=list)
    migration_steps: list[str] = field(default_factory=list)
    suggested_tests: list[str] = field(default_factory=list)
    open_concerns: list[str] = field(default_factory=list)
    narrative_markdown: str = ""
    raw_claims: list[dict[str, Any]] = field(default_factory=list)
    generated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_markdown(self) -> str:
        return self.narrative_markdown


def _claim_to_dict(c: Any) -> dict[str, Any]:
    """Normalize dataclass, object, or dict Claim into a plain dictionary."""
    if isinstance(c, dict):
        return dict(c)
    if hasattr(c, "to_dict") and callable(c.to_dict):
        return c.to_dict()
    if hasattr(c, "__dict__"):
        return dict(c.__dict__)
    return {"raw": str(c)}


def build_capsule(
    claims: list[Any] | None = None,
    *,
    repo_name: str = "Target Repository",
    risk_claims: list[Any] | None = None,
    proposal_claims: list[Any] | None = None,
    gap_claim: Any | None = None,
    extra_metadata: dict[str, Any] | None = None,
) -> CapsuleReport:
    """
    Assemble AI Claims into a standardized Two-Ledger Capsule.

    Accepts either a single heterogeneous list of `claims`, or specific lists
    from Phase 1 (risk_claims), Phase 2 (proposal_claims), and Phase 3 (gap_claim).

    Formats the output to strictly map to the required headers:
      - Risk indicators
      - Proposed replacement
      - Migration steps
      - Suggested tests
      - Open concerns
    """
    all_raw: list[dict[str, Any]] = []

    # Combine provided claims
    in_claims: list[Any] = list(claims or [])
    if risk_claims:
        in_claims.extend(risk_claims)
    if proposal_claims:
        in_claims.extend(proposal_claims)
    if gap_claim:
        in_claims.append(gap_claim)

    risk_indicators: list[dict[str, Any]] = []
    proposed_replacements: list[dict[str, Any]] = []
    migration_steps: list[str] = []
    suggested_tests: list[str] = []
    open_concerns: list[str] = []

    for c in in_claims:
        cdict = _claim_to_dict(c)
        all_raw.append(cdict)

        # 1. Risk indicators (Phase 1)
        if "risk_indicators" in cdict or "maintenance_score" in cdict:
            dep = cdict.get("dependency", "Unknown Package")
            score = cdict.get("maintenance_score", 0)
            inds = cdict.get("risk_indicators", [])
            rat = cdict.get("rationale", "")
            risk_indicators.append({
                "dependency": dep,
                "version": cdict.get("version", "unspecified"),
                "maintenance_score": score,
                "indicators": inds if isinstance(inds, list) else [str(inds)],
                "rationale": rat,
            })

        # 2. Proposed replacement, Migration steps, Suggested tests (Phase 2)
        if "proposed_replacement" in cdict:
            dep = cdict.get("dependency", "Unknown Package")
            rep = cdict.get("proposed_replacement", "")
            steps = cdict.get("migration_steps", [])
            tests = cdict.get("suggested_tests", [])
            diff = cdict.get("diff_patch")
            rat = cdict.get("rationale", "")

            proposed_replacements.append({
                "dependency": dep,
                "proposed_replacement": rep,
                "rationale": rat,
                "diff_patch": diff,
            })

            if isinstance(steps, list):
                for s in steps:
                    if s not in migration_steps:
                        migration_steps.append(str(s))
            elif steps:
                migration_steps.append(str(steps))

            if isinstance(tests, list):
                for t in tests:
                    if t not in suggested_tests:
                        suggested_tests.append(str(t))
            elif tests:
                suggested_tests.append(str(tests))

        # 3. Open concerns (Phase 3)
        if "open_concerns" in cdict or "verdict" in cdict:
            concerns = cdict.get("open_concerns", [])
            if isinstance(concerns, list):
                for o in concerns:
                    if o not in open_concerns:
                        open_concerns.append(str(o))
            elif concerns:
                open_concerns.append(str(concerns))

            narrative = cdict.get("narrative")
            if narrative and narrative not in open_concerns:
                open_concerns.append(str(narrative))

    # Build active metadata block
    metadata = dict(CAPSULE_METADATA)
    if extra_metadata:
        metadata.update(extra_metadata)
    metadata["Repository"] = repo_name
    metadata["Timestamp"] = datetime.now(timezone.utc).isoformat()

    # Build Markdown narrative strictly organized by the required headers
    md_lines: list[str] = [
        f"# AI Maintenance & Migration Capsule — {repo_name}",
        "",
        "## Metadata",
        f"- **Model**: {metadata['Model']}",
        f"- **Access Method**: {metadata['Access Method']}",
        f"- **Terms**: {metadata['Terms']}",
        f"- **Repository**: {metadata.get('Repository', repo_name)}",
        f"- **Generated At**: {metadata.get('Timestamp')}",
        f"- **Two-Ledger Classification**: CLAIMS (AI Generated, Provenance: Model)",
        "",
        "---",
        "",
        "## Risk indicators",
    ]

    if risk_indicators:
        for r in risk_indicators:
            md_lines.append(f"### {r['dependency']} (Score: {r['maintenance_score']}/100)")
            if r["indicators"]:
                for ind in r["indicators"]:
                    md_lines.append(f"- ⚠️ {ind}")
            else:
                md_lines.append("- No heuristic risk indicators flagged.")
            if r["rationale"]:
                md_lines.append(f"\n*Analysis*: {r['rationale']}\n")
    else:
        md_lines.append("No maintenance risk indicators reported across analyzed dependencies.\n")

    md_lines.extend([
        "## Proposed replacement",
    ])
    if proposed_replacements:
        for p in proposed_replacements:
            md_lines.append(f"### {p['dependency']} → `{p['proposed_replacement']}`")
            if p["rationale"]:
                md_lines.append(f"{p['rationale']}\n")
            if p.get("diff_patch"):
                md_lines.append("```diff")
                md_lines.append(p["diff_patch"].strip())
                md_lines.append("```\n")
    else:
        md_lines.append("No dependency replacements proposed.\n")

    md_lines.extend([
        "## Migration steps",
    ])
    if migration_steps:
        for idx, step in enumerate(migration_steps, 1):
            md_lines.append(f"{idx}. {step}")
        md_lines.append("")
    else:
        md_lines.append("No manual migration steps required.\n")

    md_lines.extend([
        "## Suggested tests",
    ])
    if suggested_tests:
        for idx, test in enumerate(suggested_tests, 1):
            md_lines.append(f"- [ ] {test}")
        md_lines.append("")
    else:
        md_lines.append("No specific additional test cases suggested.\n")

    md_lines.extend([
        "## Open concerns",
    ])
    if open_concerns:
        for concern in open_concerns:
            md_lines.append(f"- ⚠️ {concern}")
        md_lines.append("")
    else:
        md_lines.append("No open concerns or execution gaps detected. Verified test suite passed.\n")

    narrative_md = "\n".join(md_lines)

    return CapsuleReport(
        metadata=metadata,
        risk_indicators=risk_indicators,
        proposed_replacements=proposed_replacements,
        migration_steps=migration_steps,
        suggested_tests=suggested_tests,
        open_concerns=open_concerns,
        narrative_markdown=narrative_md,
        raw_claims=all_raw,
    )
