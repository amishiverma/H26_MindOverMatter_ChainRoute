"""
baseline.py -- Double-Baseline Flaky Test Engine (Dev 1 * Phase 2)

Responsibilities
----------------
* Orchestrate TWO consecutive pytest runs (via pytest_runner) against an
  UNTOUCHED cloned repository.
* Compare per-test outcomes between Run 1 and Run 2.
* Tag any test that passes in Run 1 but fails in Run 2 (or vice versa)
  as FLAKY.  Flaky tests are mathematically excluded from the final
  pass/fail verdict so they never cause false positives.
* Return a typed ``BaselineResult`` descriptor that downstream consumers
  (the main pipeline) can trust as a sterile, reproducible baseline.

Flakiness taxonomy
------------------
    PASS -> FAIL   =>  "pass_fail_flaky"   (the dangerous kind)
    FAIL -> PASS   =>  "fail_pass_flaky"   (intermittently broken)
    PASS -> PASS   =>  stable_pass
    FAIL -> FAIL   =>  stable_fail
    SKIP -> *      =>  excluded from flakiness analysis (skips are deterministic noise)
    ERROR -> *     =>  treated same as FAIL for comparison purposes

Integration contract (Phase 1 + Phase 2)
-----------------------------------------
    create_sandbox_env(venv_dir, ...)  -> SandboxEnv     [env_manager, Phase 1]
    run_pytest(env, repo_dir, ...)     -> PytestRun       [pytest_runner, Phase 2]

Zero external dependencies -- stdlib only.
"""

from __future__ import annotations

import json
import tempfile
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

from sandbox.env_manager import SandboxEnv, SandboxEnvError, create_sandbox_env
from sandbox.pytest_runner import PytestRun, PytestRunnerError, run_pytest


# ---------------------------------------------------------------------------
# Public exceptions
# ---------------------------------------------------------------------------


class BaselineError(RuntimeError):
    """Raised when the baseline engine cannot complete a reliable baseline."""


# ---------------------------------------------------------------------------
# Enums / types
# ---------------------------------------------------------------------------


class FlakinessTag(str, Enum):
    """Classification of a test across two baseline runs."""

    STABLE_PASS = "stable_pass"         # passed in both runs
    STABLE_FAIL = "stable_fail"         # failed/errored in both runs
    PASS_FAIL_FLAKY = "pass_fail_flaky" # pass in run1, fail in run2 (dangerous)
    FAIL_PASS_FLAKY = "fail_pass_flaky" # fail in run1, pass in run2
    SKIPPED = "skipped"                 # skipped in at least one run (excluded)
    ONLY_IN_RUN1 = "only_in_run1"       # appeared in run1 but not run2
    ONLY_IN_RUN2 = "only_in_run2"       # appeared in run2 but not run1


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class TestVerdict:
    """Per-test conclusion after comparing two runs."""

    nodeid: str
    run1_outcome: str       # "passed" | "failed" | "skipped" | "error" | "absent"
    run2_outcome: str
    tag: FlakinessTag

    @property
    def is_flaky(self) -> bool:
        return self.tag in (FlakinessTag.PASS_FAIL_FLAKY, FlakinessTag.FAIL_PASS_FLAKY)

    @property
    def is_stable_pass(self) -> bool:
        return self.tag == FlakinessTag.STABLE_PASS

    @property
    def is_stable_fail(self) -> bool:
        return self.tag == FlakinessTag.STABLE_FAIL

    def to_dict(self) -> dict[str, object]:
        return {
            "nodeid": self.nodeid,
            "run1_outcome": self.run1_outcome,
            "run2_outcome": self.run2_outcome,
            "tag": self.tag.value,
            "is_flaky": self.is_flaky,
        }


@dataclass
class BaselineResult:
    """
    Complete double-baseline report.

    Attributes
    ----------
    repo_dir:
        Absolute path to the tested repository.
    run1:
        First pytest run result.
    run2:
        Second pytest run result.
    verdicts:
        Per-test ``TestVerdict`` for every test seen in either run.
    flaky_nodeids:
        Frozen set of node IDs classified as flaky.  These are
        mathematically excluded from the final verdict.
    stable_pass_nodeids:
        Tests that passed in BOTH runs -- the only reliable "green" signal.
    stable_fail_nodeids:
        Tests that failed in BOTH runs -- reliable "red" signal.
    """

    repo_dir: str
    run1: PytestRun
    run2: PytestRun
    verdicts: list[TestVerdict] = field(default_factory=list)

    @property
    def flaky_nodeids(self) -> frozenset[str]:
        return frozenset(v.nodeid for v in self.verdicts if v.is_flaky)

    @property
    def stable_pass_nodeids(self) -> frozenset[str]:
        return frozenset(v.nodeid for v in self.verdicts if v.is_stable_pass)

    @property
    def stable_fail_nodeids(self) -> frozenset[str]:
        return frozenset(v.nodeid for v in self.verdicts if v.is_stable_fail)

    @property
    def flaky_count(self) -> int:
        return len(self.flaky_nodeids)

    @property
    def is_baseline_clean(self) -> bool:
        """True when zero flaky tests were detected."""
        return self.flaky_count == 0

    def to_dict(self) -> dict[str, object]:
        return {
            "repo_dir": self.repo_dir,
            "is_baseline_clean": self.is_baseline_clean,
            "flaky_count": self.flaky_count,
            "flaky_nodeids": sorted(self.flaky_nodeids),
            "stable_pass_count": len(self.stable_pass_nodeids),
            "stable_fail_count": len(self.stable_fail_nodeids),
            "run1": self.run1.to_dict(),
            "run2": self.run2.to_dict(),
            "verdicts": [v.to_dict() for v in self.verdicts],
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, default=str)


# ---------------------------------------------------------------------------
# Internal: flakiness comparison engine
# ---------------------------------------------------------------------------


def _classify_outcome(outcome: str) -> str:
    """
    Normalise "error" -> "failed" for comparison purposes.
    Errors are infrastructure failures that behave like test failures.
    """
    if outcome == "error":
        return "failed"
    return outcome


def _compare_runs(run1: PytestRun, run2: PytestRun) -> list[TestVerdict]:
    """
    Diff run1 and run2 per-test and produce ``TestVerdict`` for every node.

    Flakiness logic
    ---------------
    For each nodeid seen in either run:
        norm1 = _classify_outcome(run1_outcome)  # error -> failed
        norm2 = _classify_outcome(run2_outcome)

        if   norm1 == "passed" and norm2 == "failed":  PASS_FAIL_FLAKY
        elif norm1 == "failed" and norm2 == "passed":  FAIL_PASS_FLAKY
        elif norm1 == "passed" and norm2 == "passed":  STABLE_PASS
        elif norm1 == "failed" and norm2 == "failed":  STABLE_FAIL
        elif "skipped" in (norm1, norm2):              SKIPPED
        elif norm2 == "absent":                        ONLY_IN_RUN1
        elif norm1 == "absent":                        ONLY_IN_RUN2
    """
    # Build outcome maps: nodeid -> outcome string
    run1_map: dict[str, str] = {t.nodeid: t.outcome for t in run1.test_cases}
    run2_map: dict[str, str] = {t.nodeid: t.outcome for t in run2.test_cases}

    all_nodeids = set(run1_map) | set(run2_map)
    verdicts: list[TestVerdict] = []

    for nodeid in sorted(all_nodeids):
        raw1 = run1_map.get(nodeid, "absent")
        raw2 = run2_map.get(nodeid, "absent")
        norm1 = _classify_outcome(raw1) if raw1 != "absent" else "absent"
        norm2 = _classify_outcome(raw2) if raw2 != "absent" else "absent"

        if raw1 == "absent":
            tag = FlakinessTag.ONLY_IN_RUN2
        elif raw2 == "absent":
            tag = FlakinessTag.ONLY_IN_RUN1
        elif "skipped" in (norm1, norm2):
            tag = FlakinessTag.SKIPPED
        elif norm1 == "passed" and norm2 == "passed":
            tag = FlakinessTag.STABLE_PASS
        elif norm1 == "failed" and norm2 == "failed":
            tag = FlakinessTag.STABLE_FAIL
        elif norm1 == "passed" and norm2 == "failed":
            tag = FlakinessTag.PASS_FAIL_FLAKY
        elif norm1 == "failed" and norm2 == "passed":
            tag = FlakinessTag.FAIL_PASS_FLAKY
        else:
            # Catch-all for unexpected combinations
            tag = FlakinessTag.SKIPPED

        verdicts.append(
            TestVerdict(
                nodeid=nodeid,
                run1_outcome=raw1,
                run2_outcome=raw2,
                tag=tag,
            )
        )

    return verdicts


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def run_double_baseline(
    env: SandboxEnv,
    repo_dir: Path | str,
    *,
    xml_parent: Path | str | None = None,
    run_timeout: int = 300,
    install_timeout: int = 120,
    extra_pytest_args: list[str] | None = None,
) -> BaselineResult:
    """
    Execute two consecutive pytest runs on *repo_dir* and return a
    ``BaselineResult`` with flakiness analysis.

    Parameters
    ----------
    env:
        Phase 1 ``SandboxEnv`` (must be pre-created by ``create_sandbox_env``).
    repo_dir:
        Root directory of the repository to test.  Must not be modified
        between run 1 and run 2.
    xml_parent:
        Directory where JUnit XML files are written.  Defaults to a
        fresh temp directory.
    run_timeout:
        Per-run wall-clock timeout in seconds (default: 300).
    install_timeout:
        Wall-clock timeout for the pytest install step (default: 120).
    extra_pytest_args:
        Additional pytest CLI arguments applied to both runs.

    Returns
    -------
    BaselineResult
        Fully populated report with verdicts and flaky node IDs.

    Raises
    ------
    BaselineError
        If either run fails at the infrastructure level (not at the test
        level -- test failures are captured in the result, not raised).
    """
    repo_dir = Path(repo_dir).resolve()
    if not repo_dir.exists():
        raise BaselineError(f"repo_dir does not exist: {repo_dir}")

    if xml_parent is None:
        _xml_tmp = tempfile.mkdtemp(prefix="baseline_xml_")
        xml_parent = Path(_xml_tmp)
    else:
        xml_parent = Path(xml_parent)
        xml_parent.mkdir(parents=True, exist_ok=True)

    # --- Run 1 ---
    try:
        run1 = run_pytest(
            env,
            repo_dir,
            run_index=0,
            xml_dir=xml_parent,
            extra_args=extra_pytest_args,
            run_timeout=run_timeout,
            install_timeout=install_timeout,
        )
    except PytestRunnerError as exc:
        raise BaselineError(f"Baseline run 1 failed: {exc}") from exc

    # --- Run 2 ---
    try:
        run2 = run_pytest(
            env,
            repo_dir,
            run_index=1,
            xml_dir=xml_parent,
            extra_args=extra_pytest_args,
            run_timeout=run_timeout,
            install_timeout=install_timeout,
        )
    except PytestRunnerError as exc:
        raise BaselineError(f"Baseline run 2 failed: {exc}") from exc

    # --- Flakiness analysis ---
    verdicts = _compare_runs(run1, run2)

    return BaselineResult(
        repo_dir=str(repo_dir),
        run1=run1,
        run2=run2,
        verdicts=verdicts,
    )


def run_double_baseline_from_scratch(
    repo_dir: Path | str,
    *,
    venv_dir: Path | str | None = None,
    preferred_python: str = "3.12",
    fallback_python: str = "3.13",
    xml_parent: Path | str | None = None,
    run_timeout: int = 300,
    install_timeout: int = 120,
    extra_pytest_args: list[str] | None = None,
    destroy_venv_after: bool = False,
) -> BaselineResult:
    """
    Convenience wrapper: creates the venv, runs the double baseline, and
    optionally destroys the venv.  Useful for one-shot pipeline invocations
    that do not need to reuse the environment.

    Parameters
    ----------
    repo_dir:
        Repository root to test.
    venv_dir:
        Where to create the sandbox venv.  If ``None``, a temp directory
        is used and always destroyed after the run.
    preferred_python / fallback_python:
        Forwarded verbatim to ``create_sandbox_env``.
    destroy_venv_after:
        If True, calls ``destroy_sandbox_env`` after the baseline
        completes.  Forced True when ``venv_dir`` is None (temp venv).

    Returns
    -------
    BaselineResult

    Raises
    ------
    SandboxEnvError:
        If venv creation or version validation fails.
    BaselineError:
        If either pytest run fails at the infrastructure level.
    """
    from sandbox.env_manager import destroy_sandbox_env

    _owns_venv_dir = venv_dir is None
    if _owns_venv_dir:
        import tempfile as _tempfile
        venv_dir = Path(_tempfile.mkdtemp(prefix="baseline_venv_"))
        destroy_venv_after = True

    env = create_sandbox_env(
        venv_dir,
        preferred_python=preferred_python,
        fallback_python=fallback_python,
        overwrite=False,
    )

    try:
        result = run_double_baseline(
            env,
            repo_dir,
            xml_parent=xml_parent,
            run_timeout=run_timeout,
            install_timeout=install_timeout,
            extra_pytest_args=extra_pytest_args,
        )
    finally:
        if destroy_venv_after:
            destroy_sandbox_env(env)

    return result
