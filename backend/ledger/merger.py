"""
backend/ledger/merger.py - Ledger Merger (Dev 3 * Phase 3)

merge_ledgers(fact, claim) -> DependencyExitCapsule

Decision table (Facts > Claims):
-----------------------------------
APPROVED      All sandbox tests passed OR no tests ran yet vuln count == 0
FLAGGED       Tests failed but claim has gap_evaluation with notes,
              OR critical vulns found but AI provided replacements,
              OR linkage valid but risk score diverges from vuln evidence
REJECTED      Fact baseline failed (ERROR status on tests) with no mitigation
              OR fact/claim ledger_id linkage is broken
PENDING_FACTS ClaimLedger arrived but fact_ledger is a stub (no snapshot data)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from contracts.schemas import (
    ClaimLedger,
    DependencyExitCapsule,
    FactLedger,
    MergeDecision,
    RiskLevel,
    TestStatus,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _all_tests_passed(fact: FactLedger) -> bool:
    if not fact.test_results:
        return True  # no tests run yet - not a failure
    return all(t.status in (TestStatus.PASS, TestStatus.SKIP) for t in fact.test_results)


def _any_test_errored(fact: FactLedger) -> bool:
    return any(t.status == TestStatus.ERROR for t in fact.test_results)


def _has_critical_vulns(fact: FactLedger) -> bool:
    return any(v.severity == RiskLevel.CRITICAL for v in fact.snapshot.vulnerabilities)


def _risk_diverges(fact: FactLedger, claim: ClaimLedger) -> bool:
    """
    Flag if AI claims LOW/NONE risk but sandbox found critical or high vulns.
    Pattern adapted from traceroot assess_all_risks ensemble formula.
    """
    ai_risk = claim.risk_reasoning.overall_risk
    vuln_severities = {v.severity for v in fact.snapshot.vulnerabilities}
    if ai_risk in (RiskLevel.LOW, RiskLevel.NONE) and (
        RiskLevel.CRITICAL in vuln_severities or RiskLevel.HIGH in vuln_severities
    ):
        return True
    return False


def _compute_decision(fact: FactLedger, claim: ClaimLedger) -> tuple[MergeDecision, str]:
    """
    Returns (MergeDecision, merger_notes).
    Priority order: REJECTED > FLAGGED > APPROVED.
    """
    # REJECTED: hard failures - no path to safe migration
    if _any_test_errored(fact) and not claim.proposed_replacements:
        return (
            MergeDecision.REJECTED,
            "Sandbox tests errored and no AI replacement was proposed. "
            "Manual intervention required.",
        )

    if _has_critical_vulns(fact) and not claim.proposed_replacements:
        return (
            MergeDecision.REJECTED,
            "CRITICAL vulnerability confirmed by sandbox with no proposed mitigation. "
            "Do not proceed.",
        )

    # FLAGGED: recoverable issues
    notes_parts: list[str] = []

    if not _all_tests_passed(fact):
        notes_parts.append("One or more sandbox tests failed.")

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
        notes_parts.append(f"AI gap evaluation flags: {gap.notes or 'see gap_evaluation fields'}.")

    if notes_parts:
        return MergeDecision.FLAGGED, " | ".join(notes_parts)

    # APPROVED
    return (
        MergeDecision.APPROVED,
        "Sandbox tests passed, no critical vulns, AI risk consistent with facts.",
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def merge_ledgers(fact: FactLedger, claim: ClaimLedger) -> DependencyExitCapsule:
    """
    Validate linkage and produce a sealed DependencyExitCapsule.

    Raises
    ------
    ValueError
        If claim.fact_ledger_id does not match fact.ledger_id.
    """
    # Hard linkage check before anything else
    if claim.fact_ledger_id != fact.ledger_id:
        raise ValueError(
            f"Ledger linkage broken: claim.fact_ledger_id='{claim.fact_ledger_id}' "
            f"does not match fact.ledger_id='{fact.ledger_id}'"
        )

    decision, notes = _compute_decision(fact, claim)

    logger.info(
        "Merging ledgers | dep=%s | decision=%s | fact=%s | claim=%s",
        fact.dependency,
        decision,
        fact.ledger_id,
        claim.ledger_id,
    )

    # DependencyExitCapsule validator populates dependency, overall_risk,
    # vuln_count, usage_count, and top_replacement automatically.
    capsule = DependencyExitCapsule(
        fact=fact,
        claim=claim,
        merge_decision=decision,
        merger_notes=notes,
        # required sentinel defaults - overwritten by model_validator
        dependency=fact.dependency,
        overall_risk=claim.risk_reasoning.overall_risk,
    )

    logger.info("Capsule sealed | capsule_id=%s | risk=%s", capsule.capsule_id, capsule.overall_risk)
    return capsule
