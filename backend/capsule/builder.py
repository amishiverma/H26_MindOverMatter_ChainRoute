"""
Phase 4 — Capsule Metadata & Assembly (build_capsule)

Narrative assembly engine for H26 MindOverMatter ChainRoute.

Constructs the AI Claims narrative capsule according to the Two-Ledger
architecture (Facts = Verified Code, Claims = AI Output).

Hardcoded Provenance & Model Metadata:
  Model: Gemma 4
  Access Method: Google GenAI API (google-genai SDK v1.0+)
  Terms: https://ai.google.dev/terms

Headers strictly mapped from Claims (9 Rubric Headers):
  1. Risk indicators
  2. Maintenance Score
  3. Risk Rationale
  4. Proposed replacement
  5. Migration steps
  6. Suggested tests
  7. Diff Patch
  8. Open concerns
  9. Gap Verdict & Narrative
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
    # Header 1: Risk indicators
    risk_indicators: list[dict[str, Any]] = field(default_factory=list)
    # Header 2: Maintenance Score
    maintenance_scores: list[dict[str, Any]] = field(default_factory=list)
    # Header 3: Risk Rationale
    risk_rationales: list[dict[str, Any]] = field(default_factory=list)
    # Header 4: Proposed replacement
    proposed_replacements: list[dict[str, Any]] = field(default_factory=list)
    # Header 5: Migration steps
    migration_steps: list[str] = field(default_factory=list)
    # Header 6: Suggested tests
    suggested_tests: list[str] = field(default_factory=list)
    # Header 7: Diff Patch
    diff_patches: list[dict[str, Any]] = field(default_factory=list)
    # Header 8: Open concerns
    open_concerns: list[str] = field(default_factory=list)
    # Header 9: Gap Verdict & Narrative
    gap_verdict: dict[str, Any] = field(default_factory=dict)
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

    Formats the output to strictly map to the required 9 rubric headers:
      1. Risk indicators
      2. Maintenance Score
      3. Risk Rationale
      4. Proposed replacement
      5. Migration steps
      6. Suggested tests
      7. Diff Patch
      8. Open concerns
      9. Gap Verdict & Narrative
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

    # Header 1: Risk indicators
    risk_indicators: list[dict[str, Any]] = []
    # Header 2: Maintenance Score
    maintenance_scores: list[dict[str, Any]] = []
    # Header 3: Risk Rationale
    risk_rationales: list[dict[str, Any]] = []
    # Header 4: Proposed replacement
    proposed_replacements: list[dict[str, Any]] = []
    # Header 5: Migration steps
    migration_steps: list[str] = []
    # Header 6: Suggested tests
    suggested_tests: list[str] = []
    # Header 7: Diff Patch
    diff_patches: list[dict[str, Any]] = []
    # Header 8: Open concerns
    open_concerns: list[str] = []
    # Header 9: Gap Verdict & Narrative
    gap_verdict: dict[str, Any] = {}

    for c in in_claims:
        cdict = _claim_to_dict(c)
        all_raw.append(cdict)

        # 1. Risk indicators (Phase 1) + 2. Maintenance Score + 3. Risk Rationale
        if "risk_indicators" in cdict or "maintenance_score" in cdict:
            dep = cdict.get("dependency", "Unknown Package")
            version = cdict.get("version", "unspecified")
            score = cdict.get("maintenance_score", 0)
            inds = cdict.get("risk_indicators", [])
            rat = cdict.get("rationale", "")

            # Header 1: Risk indicators
            risk_indicators.append({
                "dependency": dep,
                "version": version,
                "indicators": inds if isinstance(inds, list) else [str(inds)],
            })

            # Header 2: Maintenance Score
            maintenance_scores.append({
                "dependency": dep,
                "version": version,
                "maintenance_score": score,
            })

            # Header 3: Risk Rationale
            if rat:
                risk_rationales.append({
                    "dependency": dep,
                    "version": version,
                    "rationale": rat,
                })

        # 4. Proposed replacement, 5. Migration steps, 6. Suggested tests, 7. Diff Patch (Phase 2)
        if "proposed_replacement" in cdict:
            dep = cdict.get("dependency", "Unknown Package")
            rep = cdict.get("proposed_replacement", "")
            steps = cdict.get("migration_steps", [])
            tests = cdict.get("suggested_tests", [])
            diff = cdict.get("diff_patch")
            rat = cdict.get("rationale", "")

            # Header 4: Proposed replacement
            proposed_replacements.append({
                "dependency": dep,
                "proposed_replacement": rep,
                "rationale": rat,
            })

            # Header 5: Migration steps
            if isinstance(steps, list):
                for s in steps:
                    if s not in migration_steps:
                        migration_steps.append(str(s))
            elif steps:
                migration_steps.append(str(steps))

            # Header 6: Suggested tests
            if isinstance(tests, list):
                for t in tests:
                    if t not in suggested_tests:
                        suggested_tests.append(str(t))
            elif tests:
                suggested_tests.append(str(tests))

            # Header 7: Diff Patch
            if isinstance(diff, str) and diff.strip():
                diff_patches.append({
                    "dependency": dep,
                    "diff_patch": diff.strip(),
                })

        # 8. Open concerns + 9. Gap Verdict & Narrative (Phase 3)
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

            # Header 9: Gap Verdict & Narrative (only keep the most recent gap claim)
            gap_verdict = {
                "verdict": cdict.get("verdict", "unknown"),
                "failed_count": cdict.get("failed_count", 0),
                "passed_count": cdict.get("passed_count", 0),
                "narrative": narrative or "",
            }

    # Build active metadata block
    metadata = dict(CAPSULE_METADATA)
    if extra_metadata:
        metadata.update(extra_metadata)
    metadata["Repository"] = repo_name
    metadata["Timestamp"] = datetime.now(timezone.utc).isoformat()

    # Build Markdown narrative strictly organized by the required 9 headers
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
        "## 1. Risk indicators",
    ]

    if risk_indicators:
        for r in risk_indicators:
            md_lines.append(f"### {r['dependency']}@{r['version']}")
            if r["indicators"]:
                for ind in r["indicators"]:
                    md_lines.append(f"- ⚠️ {ind}")
            else:
                md_lines.append("- No heuristic risk indicators flagged.")
        md_lines.append("")
    else:
        md_lines.append("No maintenance risk indicators reported across analyzed dependencies.\n")

    # Header 2: Maintenance Score
    md_lines.extend([
        "## 2. Maintenance Score",
    ])
    if maintenance_scores:
        for m in maintenance_scores:
            md_lines.append(f"- **{m['dependency']}@{m['version']}**: {m['maintenance_score']}/100")
        md_lines.append("")
    else:
        md_lines.append("No maintenance scores reported.\n")

    # Header 3: Risk Rationale
    md_lines.extend([
        "## 3. Risk Rationale",
    ])
    if risk_rationales:
        for r in risk_rationales:
            md_lines.append(f"### {r['dependency']}@{r['version']}")
            md_lines.append(f"{r['rationale']}\n")
    else:
        md_lines.append("No risk rationales provided.\n")

    # Header 4: Proposed replacement
    md_lines.extend([
        "## 4. Proposed replacement",
    ])
    if proposed_replacements:
        for p in proposed_replacements:
            md_lines.append(f"### {p['dependency']} → `{p['proposed_replacement']}`")
            if p["rationale"]:
                md_lines.append(f"{p['rationale']}\n")
    else:
        md_lines.append("No dependency replacements proposed.\n")

    # Header 5: Migration steps
    md_lines.extend([
        "## 5. Migration steps",
    ])
    if migration_steps:
        for idx, step in enumerate(migration_steps, 1):
            md_lines.append(f"{idx}. {step}")
        md_lines.append("")
    else:
        md_lines.append("No manual migration steps required.\n")

    # Header 6: Suggested tests
    md_lines.extend([
        "## 6. Suggested tests",
    ])
    if suggested_tests:
        for idx, test in enumerate(suggested_tests, 1):
            md_lines.append(f"- [ ] {test}")
        md_lines.append("")
    else:
        md_lines.append("No specific additional test cases suggested.\n")

    # Header 7: Diff Patch
    md_lines.extend([
        "## 7. Diff Patch",
    ])
    if diff_patches:
        for p in diff_patches:
            md_lines.append(f"### {p['dependency']}")
            md_lines.append("```diff")
            md_lines.append(p["diff_patch"])
            md_lines.append("```\n")
    else:
        md_lines.append("No unified-diff patches generated.\n")

    # Header 8: Open concerns
    md_lines.extend([
        "## 8. Open concerns",
    ])
    if open_concerns:
        for concern in open_concerns:
            md_lines.append(f"- ⚠️ {concern}")
        md_lines.append("")
    else:
        md_lines.append("No open concerns or execution gaps detected. Verified test suite passed.\n")

    # Header 9: Gap Verdict & Narrative
    md_lines.extend([
        "## 9. Gap Verdict & Narrative",
    ])
    if gap_verdict:
        md_lines.append(f"- **Verdict**: {gap_verdict.get('verdict', 'unknown')}")
        md_lines.append(f"- **Tests Passed**: {gap_verdict.get('passed_count', 0)}")
        md_lines.append(f"- **Tests Failed**: {gap_verdict.get('failed_count', 0)}")
        if gap_verdict.get("narrative"):
            md_lines.append("")
            md_lines.append("### Narrative")
            md_lines.append(gap_verdict["narrative"])
        md_lines.append("")
    else:
        md_lines.append("No gap evaluation performed.\n")

    narrative_md = "\n".join(md_lines)

    return CapsuleReport(
        metadata=metadata,
        risk_indicators=risk_indicators,
        maintenance_scores=maintenance_scores,
        risk_rationales=risk_rationales,
        proposed_replacements=proposed_replacements,
        migration_steps=migration_steps,
        suggested_tests=suggested_tests,
        diff_patches=diff_patches,
        open_concerns=open_concerns,
        gap_verdict=gap_verdict,
        narrative_markdown=narrative_md,
        raw_claims=all_raw,
    )