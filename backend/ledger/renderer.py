"""
backend/ledger/renderer.py - Exit Capsule Markdown Renderer (Dev 3 * Phase 3)

generate_exit_capsule_md(capsule: DependencyExitCapsule) -> str

9 required headers (exactly as specified):
  1. Dependency Details
  2. Risk Indicators
  3. Proposed Replacement
  4. Migration Steps
  5. Suggested Tests
  6. Executed Test Results (Facts)
  7. Compatibility Gaps
  8. Gemma Model Details
  9. Usage Locations (Facts)

Visual conventions:
  Verified facts  -> prefix lines with checkmark/cross (verified)
  AI claims       -> prefix lines with robot emoji (not verified)

Ported from traceroot TRACEROOT_AUDIT_REPORT.md generation patterns:
  - Table-first layout for structured data
  - Severity badges inline
  - Distinct sections with horizontal rules
"""

from __future__ import annotations

from datetime import timezone

from contracts.schemas import (
    DependencyExitCapsule,
    MergeDecision,
    RiskLevel,
    TestStatus,
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_RISK_BADGE = {
    RiskLevel.CRITICAL: "🔴 CRITICAL",
    RiskLevel.HIGH:     "🟠 HIGH",
    RiskLevel.MEDIUM:   "🟡 MEDIUM",
    RiskLevel.LOW:      "🟢 LOW",
    RiskLevel.NONE:     "✅ NONE",
    RiskLevel.UNKNOWN:  "⬜ UNKNOWN",
}

_DECISION_BADGE = {
    MergeDecision.APPROVED:      "✅ APPROVED",
    MergeDecision.FLAGGED:       "⚠️ FLAGGED",
    MergeDecision.REJECTED:      "🚫 REJECTED",
    MergeDecision.PENDING_FACTS: "⏳ PENDING_FACTS",
}

_TEST_ICON = {
    TestStatus.PASS:    "✅",
    TestStatus.FAIL:    "❌",
    TestStatus.ERROR:   "💥",
    TestStatus.SKIP:    "⏭️",
    TestStatus.NOT_RUN: "⬜",
}


def _fmt_dt(dt) -> str:
    if dt is None:
        return "—"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%Y-%m-%d %H:%M UTC")


def _hr() -> str:
    return "\n---\n"


# ---------------------------------------------------------------------------
# Section renderers
# ---------------------------------------------------------------------------


def _section_1(c: DependencyExitCapsule) -> str:
    f = c.fact
    snap = f.snapshot
    lines = [
        "# 1. Dependency Details\n",
        f"| Field | Value |",
        f"|-------|-------|",
        f"| **Package** | `{snap.package}` |",
        f"| **Ecosystem** | {snap.ecosystem} |",
        f"| **Requested Version** | `{snap.requested_version}` |",
        f"| **Resolved Version** | `{snap.resolved_version or 'unresolved'}` |",
        f"| **Direct Dependency** | {'Yes' if snap.is_direct else 'No (transitive)'} |",
        f"| **Repo Path** | `{f.repo_path}` |",
        f"| **Python Version (Sandbox)** | `{f.python_version}` ✅ |",
        f"| **Files Scanned** | {f.files_scanned} |",
        f"| **Capsule ID** | `{c.capsule_id}` |",
        f"| **Sealed At** | {_fmt_dt(c.sealed_at)} |",
        f"| **Merge Decision** | {_DECISION_BADGE[c.merge_decision]} |",
    ]
    if c.merger_notes:
        lines.append(f"\n> **Merger Notes:** {c.merger_notes}")
    return "\n".join(lines)


def _section_2(c: DependencyExitCapsule) -> str:
    claim = c.claim
    r = claim.risk_reasoning
    snap = c.fact.snapshot
    lines = [
        "# 2. Risk Indicators\n",
        f"| Indicator | Level | Source |",
        f"|-----------|-------|--------|",
        f"| Overall Risk | {_RISK_BADGE[r.overall_risk]} | 🤖 AI |",
        f"| Risk Score | `{r.risk_score:.1f} / 10.0` | 🤖 AI |",
        f"| Vulnerability Risk | {_RISK_BADGE[r.vulnerability_risk]} | 🤖 AI |",
        f"| Supply Chain Risk | {_RISK_BADGE[r.supply_chain_risk]} | 🤖 AI |",
        f"| Abandonment Risk | {_RISK_BADGE[r.abandonment_risk]} | 🤖 AI |",
        f"| Confirmed Vulns | `{len(snap.vulnerabilities)}` CVEs | ✅ Fact |",
    ]
    if snap.vulnerabilities:
        lines.append("\n### Confirmed Vulnerabilities (Facts ✅)\n")
        lines.append("| ID | Severity | CVSS | Fixed In |")
        lines.append("|----|----------|------|----------|")
        for v in snap.vulnerabilities:
            cvss = f"`{v.cvss_score}`" if v.cvss_score is not None else "—"
            lines.append(
                f"| [{v.id}]({'https://osv.dev/vulnerability/' + v.id}) "
                f"| {_RISK_BADGE[v.severity]} | {cvss} | `{v.fixed_version or 'unknown'}` |"
            )
    lines.append(f"\n🤖 **AI Reasoning Summary:**\n> {r.reasoning_summary}")
    if r.evidence_cited:
        lines.append("\n🤖 **Evidence cited by AI:**")
        for e in r.evidence_cited:
            lines.append(f"- {e}")
    return "\n".join(lines)


def _section_3(c: DependencyExitCapsule) -> str:
    lines = ["# 3. Proposed Replacement\n"]
    if not c.claim.proposed_replacements:
        lines.append("🤖 *No replacement proposed by AI.*")
        return "\n".join(lines)
    lines += [
        "| Package | Version | Confidence | Breaking? | Source |",
        "|---------|---------|------------|-----------|--------|",
    ]
    for r in c.claim.proposed_replacements:
        conf = f"{r.confidence * 100:.0f}%"
        breaking = "⚠️ Yes" if r.breaking_changes_expected else "No"
        lines.append(f"| `{r.package}` | `{r.suggested_version}` | {conf} | {breaking} | 🤖 AI |")
    if c.top_replacement:
        tr = c.top_replacement
        lines.append(f"\n🤖 **Top Pick:** `{tr.package}@{tr.suggested_version}`")
        lines.append(f"\n> {tr.rationale}")
        if tr.migration_notes:
            lines.append(f"\n🤖 **Migration Notes:** {tr.migration_notes}")
    return "\n".join(lines)


def _section_4(c: DependencyExitCapsule) -> str:
    tr = c.top_replacement
    dep = c.fact.dependency
    snap = c.fact.snapshot
    lines = ["# 4. Migration Steps\n"]
    if not tr:
        lines.append("🤖 *No replacement proposed — migration steps unavailable.*")
        return "\n".join(lines)
    lines += [
        f"1. ✅ **Verify current usage** — {len(c.fact.usage_locations)} usage location(s) found in codebase (see Section 9).",
        f"2. 🤖 **Install replacement** — `pip install {tr.package}=={tr.suggested_version}`",
        f"3. 🤖 **Uninstall old package** — `pip uninstall {dep}`",
        f"4. ✅ **Update imports** — replace `import {dep}` with `import {tr.package}` at all usage locations.",
    ]
    if tr.breaking_changes_expected:
        lines.append("5. ⚠️ **Review breaking changes** — AI flagged breaking API changes. Audit each usage location manually.")
    lines += [
        "6. 🤖 **Run suggested tests** (see Section 5).",
        "7. ✅ **Re-run sandbox** to generate a new FactLedger after migration.",
        f"\n> **Resolved from:** `{snap.requested_version}` → `{tr.suggested_version}`",
    ]
    return "\n".join(lines)


def _section_5(c: DependencyExitCapsule) -> str:
    dep = c.fact.dependency
    tr = c.top_replacement
    replacement = tr.package if tr else "<replacement>"
    lines = [
        "# 5. Suggested Tests\n",
        "🤖 *AI-generated test stubs — not verified by sandbox.*\n",
        "```python",
        f"# Test: verify {dep} is fully replaced",
        f"import pytest",
        f"",
        f"def test_old_package_not_importable():",
        f"    with pytest.raises(ImportError):",
        f"        import {dep.replace('-', '_')}",
        f"",
        f"def test_replacement_importable():",
        f"    import {replacement.replace('-', '_')}  # must not raise",
        f"",
        f"def test_replacement_basic_functionality():",
        f"    # TODO: add functional parity checks",
        f"    import {replacement.replace('-', '_')} as lib",
        f"    assert lib is not None",
        "```",
        "",
        "> ✅ After migration, run these tests inside the sandbox env to generate an updated **FactLedger**.",
    ]
    return "\n".join(lines)


def _section_6(c: DependencyExitCapsule) -> str:
    fact = c.fact
    lines = [
        "# 6. Executed Test Results (Facts)\n",
        f"> ✅ Source: Sandbox Executor | Python `{fact.python_version}` | Ledger `{fact.ledger_id}`\n",
    ]
    if not fact.test_results:
        lines.append("✅ *No tests were executed in this analysis run.*")
    else:
        lines += [
            f"**Total:** {fact.tests_total} | "
            f"**Passed:** {fact.tests_passed} ✅ | "
            f"**Failed:** {fact.tests_failed} ❌\n",
            "| Test ID | Status | Duration | Error |",
            "|---------|--------|----------|-------|",
        ]
        for t in fact.test_results:
            icon = _TEST_ICON.get(t.status, "?")
            dur = f"{t.duration_ms:.1f}ms" if t.duration_ms is not None else "—"
            err = f"`{t.error_message[:60]}...`" if t.error_message else "—"
            lines.append(f"| `{t.test_id}` | {icon} {t.status} | {dur} | {err} |")
    if fact.parse_errors:
        lines.append(f"\n⚠️ **Parse Errors ({len(fact.parse_errors)} files):**")
        for fp, msg in list(fact.parse_errors.items())[:5]:
            lines.append(f"- `{fp}`: {msg}")
        if len(fact.parse_errors) > 5:
            lines.append(f"- *...and {len(fact.parse_errors) - 5} more*")
    return "\n".join(lines)


def _section_7(c: DependencyExitCapsule) -> str:
    gap = c.claim.gap_evaluation
    lines = [
        "# 7. Compatibility Gaps\n",
        "🤖 *AI-evaluated gaps — not verified by sandbox.*\n",
        "| Gap | Detected | Source |",
        "|-----|----------|--------|",
        f"| Missing test coverage | {'⚠️ Yes' if gap.missing_test_coverage else '✅ No'} | 🤖 AI |",
        f"| Missing usage locations | {'⚠️ Yes' if gap.missing_usage_locations else '✅ No'} | 🤖 AI |",
        f"| Ambiguous version pinning | {'⚠️ Yes' if gap.ambiguous_version else '✅ No'} | 🤖 AI |",
        f"| Insufficient vuln data | {'⚠️ Yes' if gap.insufficient_vuln_data else '✅ No'} | 🤖 AI |",
    ]
    if gap.notes:
        lines.append(f"\n🤖 **AI Notes:** {gap.notes}")
    return "\n".join(lines)


def _section_8(c: DependencyExitCapsule) -> str:
    claim = c.claim
    lines = [
        "# 8. Gemma Model Details\n",
        "| Field | Value |",
        "|-------|-------|",
        f"| **Model** | Gemma 4 (hardcoded) |",
        f"| **Model ID** | `{claim.model_id}` |",
        f"| **Method** | Gemma 4 via Google AI Studio API |",
        f"| **Claim Ledger ID** | `{claim.ledger_id}` |",
        f"| **Generated At** | {_fmt_dt(claim.generated_at)} |",
        f"| **Terms** | [Google Generative AI Terms of Service](https://ai.google.dev/terms) |",
        f"| **Linked Fact Ledger** | `{claim.fact_ledger_id}` |",
        "",
        "> 🤖 All content in sections 3, 4, 5, 7 is **AI-generated (Gemma 4)** and has not been verified by sandbox execution.",
        "> ✅ All content in sections 6 and 9 is **verified fact** from the sandbox executor.",
    ]
    if claim.raw_model_output:
        truncated = claim.raw_model_output[:300].replace("\n", " ")
        lines.append(f"\n<details><summary>🤖 Raw model output (truncated)</summary>\n\n```\n{truncated}...\n```\n</details>")
    return "\n".join(lines)


def _section_9(c: DependencyExitCapsule) -> str:
    fact = c.fact
    lines = [
        "# 9. Usage Locations (Facts)\n",
        f"> ✅ Source: `ast_census.py` | {fact.files_scanned} files scanned | Ledger `{fact.ledger_id}`\n",
    ]
    if not fact.usage_locations:
        lines.append("✅ *No usage locations found — dependency may be unused or not yet scanned.*")
        return "\n".join(lines)

    lines += [
        f"**Total locations:** {len(fact.usage_locations)}\n",
        "| File | Line | Kind | Statement |",
        "|------|------|------|-----------|",
    ]
    for loc in fact.usage_locations:
        fname = loc.file_path.replace("\\", "/").split("/")[-1]
        stmt = loc.statement[:60].replace("|", "\\|")
        lines.append(f"| `{fname}` | L{loc.line_number} | `{loc.kind}` | `{stmt}` |")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_exit_capsule_md(capsule: DependencyExitCapsule) -> str:
    """
    Render a DependencyExitCapsule as a 9-section Markdown report.

    Returns a UTF-8 string ready to write to disk or serve over HTTP.
    """
    parts = [
        f"<!-- ChainRoute Exit Capsule | {capsule.capsule_id} | {_fmt_dt(capsule.sealed_at)} -->",
        "",
        _section_1(capsule),
        _hr(),
        _section_2(capsule),
        _hr(),
        _section_3(capsule),
        _hr(),
        _section_4(capsule),
        _hr(),
        _section_5(capsule),
        _hr(),
        _section_6(capsule),
        _hr(),
        _section_7(capsule),
        _hr(),
        _section_8(capsule),
        _hr(),
        _section_9(capsule),
        "",
        f"<!-- Generated by ChainRoute Dev 3 Renderer | "
        f"Fact: {capsule.fact.ledger_id} | Claim: {capsule.claim.ledger_id} -->",
    ]
    return "\n".join(parts)
