"""
verdict.py -- Swapped Tree Pytest Runner & Verdict Engine (Dev 1 * Phase 3)

Responsibilities
----------------
* Execute pytest inside the sandbox environment against a swapped git worktree.
* Parse the resulting JUnit XML output via Phase 2 ``pytest_runner``.
* Compare swapped test outcomes against the Phase 2 ``BaselineResult``.
* Mathematically EXCLUDE any tests identified as ``flaky`` during baseline.
* Evaluate regressions and stability to issue a definitive verdict:
    - ``PASS``: All deterministic baseline passing tests remain passing; zero regressions.
    - ``FAIL``: One or more previously stable tests regressed, or new failures occurred.
    - ``INCONCLUSIVE``: Pytest crashed, collection failed, or zero reliable baseline signal exists.

Zero external dependencies -- stdlib only (dataclasses, enum, json, pathlib).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Final

from sandbox.baseline import BaselineResult, FlakinessTag
from sandbox.env_manager import SandboxEnv
from sandbox.pytest_runner import PytestRun, TestCase, run_pytest
from sandbox.swapper import SwappedWorktree


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class FinalVerdict(str, Enum):
    """Overall outcome of the dependency swap and patch verification."""

    PASS = "PASS"
    FAIL = "FAIL"
    INCONCLUSIVE = "INCONCLUSIVE"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class VerdictReport:
    """
    Detailed verdict report comparing swapped test run to baseline.

    Attributes
    ----------
    verdict:
        Final verdict (PASS, FAIL, or INCONCLUSIVE).
    reason:
        Detailed explanation for the verdict decision.
    base_sha:
        Full 40-character commit SHA of the base repository.
    candidate:
        Candidate package specifier tested.
    baseline_stable_pass_count:
        Number of tests that passed reliably in both baseline runs.
    baseline_stable_fail_count:
        Number of tests that failed reliably in both baseline runs.
    flaky_excluded_count:
        Number of tests excluded from verdict calculation due to flakiness.
    flaky_excluded_nodeids:
        List of node IDs that were excluded.
    regressed_nodeids:
        Tests that were stable_pass in baseline but failed on swapped tree.
    fixed_nodeids:
        Tests that were stable_fail in baseline but passed on swapped tree.
    swapped_passed_count:
        Non-flaky tests that passed on swapped tree.
    swapped_failed_count:
        Non-flaky tests that failed on swapped tree.
    swapped_error_count:
        Non-flaky tests that errored on swapped tree.
    swapped_skipped_count:
        Non-flaky tests that skipped on swapped tree.
    swapped_run:
        Underlying PytestRun descriptor (if run executed).
    """

    verdict: FinalVerdict
    reason: str
    base_sha: str
    candidate: str
    baseline_stable_pass_count: int
    baseline_stable_fail_count: int
    flaky_excluded_count: int
    flaky_excluded_nodeids: list[str]
    regressed_nodeids: list[str]
    fixed_nodeids: list[str]
    swapped_passed_count: int
    swapped_failed_count: int
    swapped_error_count: int
    swapped_skipped_count: int
    swapped_run: PytestRun | None = None

    def to_dict(self) -> dict[str, object]:
        """Convert report to JSON-serializable dictionary."""
        return {
            "verdict": self.verdict.value,
            "reason": self.reason,
            "base_sha": self.base_sha,
            "candidate": self.candidate,
            "baseline_stable_pass_count": self.baseline_stable_pass_count,
            "baseline_stable_fail_count": self.baseline_stable_fail_count,
            "flaky_excluded_count": self.flaky_excluded_count,
            "flaky_excluded_nodeids": self.flaky_excluded_nodeids,
            "regressed_nodeids": self.regressed_nodeids,
            "fixed_nodeids": self.fixed_nodeids,
            "swapped_passed_count": self.swapped_passed_count,
            "swapped_failed_count": self.swapped_failed_count,
            "swapped_error_count": self.swapped_error_count,
            "swapped_skipped_count": self.swapped_skipped_count,
            "swapped_run": self.swapped_run.to_dict() if self.swapped_run else None,
        }

    def to_json(self, indent: int = 2) -> str:
        """Serialize report to formatted JSON string."""
        return json.dumps(self.to_dict(), indent=indent, default=str)


# ---------------------------------------------------------------------------
# Core evaluation logic
# ---------------------------------------------------------------------------


def compute_verdict(
    baseline: BaselineResult,
    swapped_run: PytestRun,
    *,
    base_sha: str = "",
    candidate: str = "",
) -> VerdictReport:
    """
    Diff *swapped_run* against *baseline*, mathematically excluding flaky tests.

    Parameters
    ----------
    baseline:
        Phase 2 BaselineResult containing stable and flaky test classifications.
    swapped_run:
        Phase 2 PytestRun produced by running pytest on the swapped worktree.
    base_sha:
        Base repository commit SHA.
    candidate:
        Candidate package name / version tested.

    Returns
    -------
    VerdictReport
        Complete evaluation with PASS, FAIL, or INCONCLUSIVE verdict.
    """
    flaky_set = set(baseline.flaky_nodeids)
    stable_pass_set = set(baseline.stable_pass_nodeids)
    stable_fail_set = set(baseline.stable_fail_nodeids)

    # 1. Separate test cases into non-flaky and flaky
    non_flaky_cases = [c for c in swapped_run.test_cases if c.nodeid not in flaky_set]

    swapped_passed: set[str] = {c.nodeid for c in non_flaky_cases if c.outcome == "passed"}
    swapped_failed: set[str] = {c.nodeid for c in non_flaky_cases if c.outcome == "failed"}
    swapped_error: set[str] = {c.nodeid for c in non_flaky_cases if c.outcome == "error"}
    swapped_skipped: set[str] = {c.nodeid for c in non_flaky_cases if c.outcome == "skipped"}
    swapped_bad: set[str] = swapped_failed | swapped_error

    # 2. Identify regressions: stable pass in baseline -> failed/error in swapped
    regressed = sorted(list(stable_pass_set.intersection(swapped_bad)))

    # 3. Identify fixes: stable fail in baseline -> passed in swapped
    fixed = sorted(list(stable_fail_set.intersection(swapped_passed)))

    # 4. Check for unexpected new failures not previously seen
    new_failures = sorted(list((swapped_bad - stable_fail_set) - stable_pass_set))

    base_sha_str = base_sha or ""
    candidate_str = candidate or ""

    # --- INCONCLUSIVE checks ---
    # Condition A: Pytest could not collect or run tests
    if len(swapped_run.test_cases) == 0:
        if len(stable_pass_set) > 0 or swapped_run.exit_code != 0:
            return VerdictReport(
                verdict=FinalVerdict.INCONCLUSIVE,
                reason="Pytest did not execute any tests on the swapped worktree (collection error or empty test suite).",
                base_sha=base_sha_str,
                candidate=candidate_str,
                baseline_stable_pass_count=len(stable_pass_set),
                baseline_stable_fail_count=len(stable_fail_set),
                flaky_excluded_count=len(flaky_set),
                flaky_excluded_nodeids=sorted(list(flaky_set)),
                regressed_nodeids=[],
                fixed_nodeids=[],
                swapped_passed_count=0,
                swapped_failed_count=0,
                swapped_error_count=0,
                swapped_skipped_count=0,
                swapped_run=swapped_run,
            )

    # Condition B: Pytest execution crashed internally
    if swapped_run.exit_code in (2, 3, 4):
        return VerdictReport(
            verdict=FinalVerdict.INCONCLUSIVE,
            reason=f"Pytest exited abnormally with code {swapped_run.exit_code} (internal/CLI error).",
            base_sha=base_sha_str,
            candidate=candidate_str,
            baseline_stable_pass_count=len(stable_pass_set),
            baseline_stable_fail_count=len(stable_fail_set),
            flaky_excluded_count=len(flaky_set),
            flaky_excluded_nodeids=sorted(list(flaky_set)),
            regressed_nodeids=regressed,
            fixed_nodeids=fixed,
            swapped_passed_count=len(swapped_passed),
            swapped_failed_count=len(swapped_failed),
            swapped_error_count=len(swapped_error),
            swapped_skipped_count=len(swapped_skipped),
            swapped_run=swapped_run,
        )

    # Condition C: Zero stable pass signal in baseline
    if len(stable_pass_set) == 0 and len(swapped_passed) == 0 and len(stable_fail_set) == 0:
        return VerdictReport(
            verdict=FinalVerdict.INCONCLUSIVE,
            reason="Baseline contains 0 stable passing or failing tests; insufficient signal for verdict.",
            base_sha=base_sha_str,
            candidate=candidate_str,
            baseline_stable_pass_count=0,
            baseline_stable_fail_count=0,
            flaky_excluded_count=len(flaky_set),
            flaky_excluded_nodeids=sorted(list(flaky_set)),
            regressed_nodeids=[],
            fixed_nodeids=[],
            swapped_passed_count=0,
            swapped_failed_count=0,
            swapped_error_count=0,
            swapped_skipped_count=0,
            swapped_run=swapped_run,
        )

    # --- FAIL checks ---
    # Condition D: Previously passing tests regressed
    if len(regressed) > 0:
        return VerdictReport(
            verdict=FinalVerdict.FAIL,
            reason=f"Regressed {len(regressed)} previously stable passing tests: {regressed}",
            base_sha=base_sha_str,
            candidate=candidate_str,
            baseline_stable_pass_count=len(stable_pass_set),
            baseline_stable_fail_count=len(stable_fail_set),
            flaky_excluded_count=len(flaky_set),
            flaky_excluded_nodeids=sorted(list(flaky_set)),
            regressed_nodeids=regressed,
            fixed_nodeids=fixed,
            swapped_passed_count=len(swapped_passed),
            swapped_failed_count=len(swapped_failed),
            swapped_error_count=len(swapped_error),
            swapped_skipped_count=len(swapped_skipped),
            swapped_run=swapped_run,
        )

    # Condition E: Brand new test failures on swapped tree
    if len(new_failures) > 0:
        return VerdictReport(
            verdict=FinalVerdict.FAIL,
            reason=f"Detected {len(new_failures)} new failing tests not present in baseline: {new_failures}",
            base_sha=base_sha_str,
            candidate=candidate_str,
            baseline_stable_pass_count=len(stable_pass_set),
            baseline_stable_fail_count=len(stable_fail_set),
            flaky_excluded_count=len(flaky_set),
            flaky_excluded_nodeids=sorted(list(flaky_set)),
            regressed_nodeids=regressed,
            fixed_nodeids=fixed,
            swapped_passed_count=len(swapped_passed),
            swapped_failed_count=len(swapped_failed),
            swapped_error_count=len(swapped_error),
            swapped_skipped_count=len(swapped_skipped),
            swapped_run=swapped_run,
        )

    # --- PASS checks ---
    # All stable baseline passing tests are still passed on swapped tree
    reason_parts = [
        f"All {len(stable_pass_set)} stable baseline tests passed on swapped tree. 0 regressions."
    ]
    if len(fixed) > 0:
        reason_parts.append(f"Fixed {len(fixed)} previously failing tests: {fixed}.")
    if len(flaky_set) > 0:
        reason_parts.append(f"Excluded {len(flaky_set)} flaky tests from calculation.")

    return VerdictReport(
        verdict=FinalVerdict.PASS,
        reason=" ".join(reason_parts),
        base_sha=base_sha_str,
        candidate=candidate_str,
        baseline_stable_pass_count=len(stable_pass_set),
        baseline_stable_fail_count=len(stable_fail_set),
        flaky_excluded_count=len(flaky_set),
        flaky_excluded_nodeids=sorted(list(flaky_set)),
        regressed_nodeids=regressed,
        fixed_nodeids=fixed,
        swapped_passed_count=len(swapped_passed),
        swapped_failed_count=len(swapped_failed),
        swapped_error_count=len(swapped_error),
        swapped_skipped_count=len(swapped_skipped),
        swapped_run=swapped_run,
    )


# ---------------------------------------------------------------------------
# Public Orchestration API
# ---------------------------------------------------------------------------


def run_swapped_verdict(
    env: SandboxEnv,
    swapped_worktree: SwappedWorktree,
    baseline: BaselineResult,
    *,
    xml_dir: Path | str | None = None,
    extra_args: list[str] | None = None,
    run_timeout: int = 180,
    install_timeout: int = 120,
) -> VerdictReport:
    """
    Run pytest against the swapped worktree using Phase 2 ``run_pytest``,
    parse the JUnit XML, and evaluate the verdict against ``baseline``.

    Parameters
    ----------
    env:
        Phase 1 SandboxEnv descriptor.
    swapped_worktree:
        Phase 3 SwappedWorktree descriptor.
    baseline:
        Phase 2 BaselineResult.
    xml_dir:
        Directory where JUnit XML will be saved (default: worktree temp dir).
    extra_args:
        Additional flags passed to pytest.
    run_timeout:
        Subprocess wall-clock timeout in seconds.
    install_timeout:
        Timeout for pytest installation check.

    Returns
    -------
    VerdictReport
        The comprehensive evaluation report.
    """
    target_xml_dir = Path(xml_dir).resolve() if xml_dir else swapped_worktree.worktree_dir

    # Execute pytest on the swapped worktree
    swapped_run = run_pytest(
        env=env,
        repo_dir=swapped_worktree.worktree_dir,
        run_index=10,  # distinguish from baseline runs 0 and 1
        xml_dir=target_xml_dir,
        extra_args=extra_args,
        run_timeout=run_timeout,
        install_timeout=install_timeout,
    )

    return compute_verdict(
        baseline=baseline,
        swapped_run=swapped_run,
        base_sha=swapped_worktree.base_sha,
        candidate=swapped_worktree.candidate_package,
    )
