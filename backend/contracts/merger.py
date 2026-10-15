"""
backend/contracts/merger.py - Ledger Merger & Decision Engine (Dev 3)

Accepts:
  - Dev 1 FactLedger (Pydantic model or dict from fact_generator.py build_fact_ledger().to_dict())
  - Dev 2 CapsuleReport (from capsule.builder.build_capsule() or ClaimLedger)

Outputs:
  - DependencyExitCapsule populated with the exact 9 problem statement headers:
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

import logging
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from backend.contracts.schemas import (
    ClaimLedger,
    ClaimRiskReasoning,
    DependencyExitCapsule,
    DependencySnapshot,
    FactLedger,
    GapEvaluation,
    MergeDecision,
    ProposedReplacement,
    RiskLevel,
    TestResult,
    TestStatus,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Decision Logic: Facts > Claims
# ---------------------------------------------------------------------------


def _all_tests_passed(fact: FactLedger) -> bool:
    if fact.verdict == "PASS":
        return True
    if not fact.test_results:
        return fact.verdict != "FAIL"
    return all(t.status in (TestStatus.PASS, TestStatus.SKIP) for t in fact.test_results)


def _any_test_errored(fact: FactLedger) -> bool:
    if fact.verdict == "FAIL":
        return True
    return any(t.status == TestStatus.ERROR for t in fact.test_results)


def _has_critical_vulns(fact: FactLedger) -> bool:
    return any(v.severity == RiskLevel.CRITICAL for v in fact.snapshot.vulnerabilities)


def _risk_diverges(fact: FactLedger, claim: ClaimLedger) -> bool:
    ai_risk = claim.risk_reasoning.overall_risk
    vuln_severities = {v.severity for v in fact.snapshot.vulnerabilities}
    if ai_risk in (RiskLevel.LOW, RiskLevel.NONE) and (
        RiskLevel.CRITICAL in vuln_severities or RiskLevel.HIGH in vuln_severities
    ):
        return True
    return False


def _compute_decision(fact: FactLedger, claim: ClaimLedger) -> tuple[MergeDecision, str]:
    """
    Compute MergeDecision and explanatory notes.
    Priority order: REJECTED > FLAGGED > APPROVED.
    """
    if _any_test_errored(fact) and not claim.proposed_replacements:
        return (
            MergeDecision.REJECTED,
            "Sandbox tests failed/errored and no AI replacement was proposed. Manual intervention required.",
        )

    if _has_critical_vulns(fact) and not claim.proposed_replacements:
        return (
            MergeDecision.REJECTED,
            "CRITICAL vulnerability confirmed by sandbox with no proposed mitigation. Do not proceed.",
        )

    notes_parts: list[str] = []

    if not _all_tests_passed(fact):
        notes_parts.append(f"Sandbox tests concluded with verdict: {fact.verdict}.")

    if _has_critical_vulns(fact):
        notes_parts.append(
            f"CRITICAL vulnerability detected ({fact.snapshot.vulnerabilities[0].id}). "
            "Human review required before migration."
        )

    if _risk_diverges(fact, claim):
        notes_parts.append(
            "Risk divergence: AI claims low risk but sandbox found HIGH/CRITICAL vulns. "
            "Fact ledger takes precedence."
        )

    gap = claim.gap_evaluation
    if gap.missing_test_coverage or gap.ambiguous_version or gap.insufficient_vuln_data:
        notes_parts.append(f"AI gap evaluation flags: {gap.notes or 'review gap_evaluation fields'}.")

    if notes_parts:
        return MergeDecision.FLAGGED, " | ".join(notes_parts)

    return (
        MergeDecision.APPROVED,
        "Sandbox tests passed, zero critical unmitigated risks, AI reasoning consistent with ground-truth facts.",
    )


# ---------------------------------------------------------------------------
# Converters
# ---------------------------------------------------------------------------


def _fact_dict_to_pydantic(fact_dict: dict[str, Any]) -> FactLedger:
    """Convert Dev 1's FactLedger dict to Pydantic FactLedger model."""
    snapshot_dict = fact_dict.get("snapshot", {})
    if not snapshot_dict:
        snapshot_dict = {
            "package": fact_dict.get("candidate", fact_dict.get("dependency", "")),
            "requested_version": fact_dict.get("py_version", "unknown"),
        }

    snapshot = DependencySnapshot(**snapshot_dict)

    test_results: list[TestResult] = []
    swapped_res = fact_dict.get("swapped_res", {})
    if isinstance(swapped_res, dict):
        passed = swapped_res.get("passed_count", 0)
        failed = swapped_res.get("failed_count", 0)
        for i in range(int(passed)):
            test_results.append(
                TestResult(test_id=f"test_pass_{i}", status=TestStatus.PASS)
            )
        for i in range(int(failed)):
            test_results.append(
                TestResult(test_id=f"test_fail_{i}", status=TestStatus.FAIL)
            )

    return FactLedger(
        run_id=str(fact_dict.get("run_id", f"run_{uuid4().hex[:12]}")),
        base_sha=str(fact_dict.get("base_sha", "")),
        py_version=str(fact_dict.get("py_version", "3.12.10")),
        candidate=str(fact_dict.get("candidate", fact_dict.get("dependency", ""))),
        patch_sha=fact_dict.get("patch_sha"),
        baseline_res=fact_dict.get("baseline_res") or {},
        swapped_res=fact_dict.get("swapped_res") or {},
        flaky=list(fact_dict.get("flaky") or []),
        verdict=str(fact_dict.get("verdict", "INCONCLUSIVE")),
        junit_path=str(fact_dict.get("junit_path", "")),
        timestamp_utc=str(fact_dict.get("timestamp_utc", datetime.now(timezone.utc).isoformat())),
        ledger_sha256=str(fact_dict.get("ledger_sha256", "")),
        usage_locations=fact_dict.get("usage_locations"),
        repo_path=str(fact_dict.get("repo_path", "")),
        python_version=str(fact_dict.get("py_version", "3.12.10")),
        dependency=str(fact_dict.get("candidate", fact_dict.get("dependency", ""))),
        snapshot=snapshot,
        files_scanned=int(fact_dict.get("files_scanned", 0)),
        parse_errors=fact_dict.get("parse_errors") or {},
        test_results=test_results,
    )


def _capsule_report_to_claim_ledger(capsule_report: Any, fact_ledger_id: str) -> tuple[ClaimLedger, dict[str, Any]]:
    """
    Convert Dev 2 CapsuleReport into a Pydantic ClaimLedger and extract
    raw 9 problem statement header metadata.
    """
    if hasattr(capsule_report, "to_dict"):
        report = capsule_report.to_dict()
    elif isinstance(capsule_report, dict):
        report = capsule_report
    else:
        report = {}

    # 1. Risk indicators
    risk_indicators: list[str] = []
    maintenance_score = 0
    risk_rationale = ""

    for ri in report.get("risk_indicators", []):
        if isinstance(ri, dict):
            for ind in ri.get("indicators", []):
                if ind not in risk_indicators:
                    risk_indicators.append(str(ind))
            if "maintenance_score" in ri:
                maintenance_score = max(maintenance_score, int(ri["maintenance_score"]))
            if "rationale" in ri and not risk_rationale:
                risk_rationale = str(ri["rationale"])
        elif isinstance(ri, str):
            risk_indicators.append(ri)

    # 2. Proposed replacements
    proposed_replacements: list[ProposedReplacement] = []
    top_diff_patch: Optional[str] = None
    top_replacement_name: str = ""

    for pr in report.get("proposed_replacements", []):
        if isinstance(pr, dict):
            rep_str = pr.get("proposed_replacement", pr.get("dependency", ""))
            parts = rep_str.split()
            pkg = parts[0] if parts else "candidate"
            ver = " ".join(parts[1:]) if len(parts) > 1 else "latest"
            rat = pr.get("rationale", "")
            diff = pr.get("diff_patch")
            if diff and not top_diff_patch:
                top_diff_patch = str(diff)
            if not top_replacement_name:
                top_replacement_name = rep_str

            prop = ProposedReplacement(
                package=pkg,
                suggested_version=ver,
                rationale=rat,
                confidence=0.85,
                breaking_changes_expected=False,
                diff_preview=diff,
            )
            proposed_replacements.append(prop)

    # 3. Migration steps
    migration_steps: list[str] = [str(s) for s in report.get("migration_steps", [])]

    # 4. Suggested tests
    suggested_tests: list[str] = [str(t) for t in report.get("suggested_tests", [])]

    # 5. Open concerns
    open_concerns: list[str] = [str(o) for o in report.get("open_concerns", [])]

    # Risk level mapping
    def _to_level(score: int) -> RiskLevel:
        if score >= 80:
            return RiskLevel.CRITICAL
        if score >= 60:
            return RiskLevel.HIGH
        if score >= 40:
            return RiskLevel.MEDIUM
        if score >= 20:
            return RiskLevel.LOW
        if score > 0:
            return RiskLevel.NONE
        return RiskLevel.UNKNOWN

    risk_reasoning = ClaimRiskReasoning(
        overall_risk=_to_level(maintenance_score),
        risk_score=min(10.0, max(0.0, maintenance_score / 10.0)),
        abandonment_risk=_to_level(maintenance_score),
        supply_chain_risk=RiskLevel.UNKNOWN,
        vulnerability_risk=RiskLevel.UNKNOWN,
        reasoning_summary=risk_rationale or "Gemma 4 maintenance risk analysis.",
        evidence_cited=risk_indicators,
    )

    gap_evaluation = GapEvaluation(
        missing_test_coverage=len(open_concerns) > 0,
        notes="; ".join(open_concerns) if open_concerns else None,
    )

    claim_ledger = ClaimLedger(
        fact_ledger_id=fact_ledger_id,
        model_id="gemma-4",
        risk_reasoning=risk_reasoning,
        proposed_replacements=proposed_replacements,
        gap_evaluation=gap_evaluation,
        raw_model_output=report.get("narrative_markdown"),
    )

    headers_meta = {
        "risk_indicators": risk_indicators,
        "maintenance_score": maintenance_score,
        "risk_rationale": risk_rationale,
        "proposed_replacement": top_replacement_name,
        "migration_steps": migration_steps,
        "suggested_tests": suggested_tests,
        "diff_patch": top_diff_patch,
        "open_concerns": open_concerns,
        "narrative_markdown": report.get("narrative_markdown", ""),
    }

    return claim_ledger, headers_meta


# ---------------------------------------------------------------------------
# Public Merger API
# ---------------------------------------------------------------------------


def merge_ledgers(
    fact: FactLedger | dict[str, Any],
    claim: ClaimLedger | Any | dict[str, Any],
) -> DependencyExitCapsule:
    """
    Merge Dev 1 FactLedger and Dev 2 CapsuleReport into a sealed DependencyExitCapsule.

    Accepts either Pydantic models or raw dictionaries/dataclasses.
    Populates all exact 9 problem statement headers:
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
    # 1. Normalize FactLedger
    if isinstance(fact, dict):
        fact_model = _fact_dict_to_pydantic(fact)
    else:
        fact_model = fact

    # 2. Normalize ClaimLedger and 9 headers
    headers_meta: dict[str, Any] = {}
    if isinstance(claim, ClaimLedger):
        claim_model = claim
    else:
        claim_model, headers_meta = _capsule_report_to_claim_ledger(claim, fact_model.ledger_id)

    # Ensure linkage integrity
    claim_model.fact_ledger_id = fact_model.ledger_id

    # 3. Compute Merge Decision
    decision, notes = _compute_decision(fact_model, claim_model)

    # 4. Construct final sealed DependencyExitCapsule
    capsule = DependencyExitCapsule(
        fact=fact_model,
        claim=claim_model,
        merge_decision=decision,
        merger_notes=notes,
        dependency=fact_model.candidate or fact_model.dependency,
        overall_risk=claim_model.risk_reasoning.overall_risk,
        # Mandatory Hackathon Metadata
        model="Gemma 4",
        access_method="Google GenAI API (google-genai SDK v1.0+)",
        terms="https://ai.google.dev/terms",
        # Exact 9 problem statement headers
        risk_indicators=headers_meta.get("risk_indicators") or list(claim_model.risk_reasoning.evidence_cited),
        maintenance_score=headers_meta.get("maintenance_score") or int(claim_model.risk_reasoning.risk_score * 10),
        risk_rationale=headers_meta.get("risk_rationale") or claim_model.risk_reasoning.reasoning_summary,
        proposed_replacement=headers_meta.get("proposed_replacement") or (
            claim_model.proposed_replacements[0].package if claim_model.proposed_replacements else ""
        ),
        migration_steps=headers_meta.get("migration_steps") or [],
        suggested_tests=headers_meta.get("suggested_tests") or [],
        diff_patch=headers_meta.get("diff_patch"),
        open_concerns=headers_meta.get("open_concerns") or ([claim_model.gap_evaluation.notes] if claim_model.gap_evaluation.notes else []),
        gap_verdict=fact_model.verdict,
        narrative_markdown=headers_meta.get("narrative_markdown") or claim_model.raw_model_output,
    )

    logger.info("DependencyExitCapsule merged and sealed | id=%s | decision=%s", capsule.capsule_id, decision)
    return capsule


def merge_raw(
    fact_dict: dict[str, Any],
    capsule_report: Any,
    *,
    fact_ledger_id: Optional[str] = None,
) -> DependencyExitCapsule:
    """Backward compatibility alias for merge_ledgers."""
    return merge_ledgers(fact_dict, capsule_report)
