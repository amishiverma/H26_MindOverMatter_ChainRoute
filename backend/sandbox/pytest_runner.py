"""
pytest_runner.py -- Sandboxed Pytest Subprocess Wrapper (Dev 1 * Phase 2)

Responsibilities
----------------
* Accept a ``SandboxEnv`` (from Phase 1 ``env_manager``) and a target
  repository directory.
* Ensure ``pytest`` is installed inside the venv (via ``uv pip install``
  using the env's ``uv_bin``).
* Run pytest as a subprocess under the venv's interpreter with
  ``--junitxml`` output directed to a caller-specified path.
* Parse and return a typed ``PytestRun`` result containing per-test
  outcomes (pass / fail / skip / error) and raw XML path.

Integration contract (Phase 1 → Phase 2)
-----------------------------------------
Exact types consumed from env_manager:
    SandboxEnv.python_bin : Path     -- used as pytest executable host
    SandboxEnv.uv_bin     : str      -- used for `uv pip install pytest`
    SandboxEnv.venv_dir   : Path     -- used to locate site-packages

Zero external dependencies -- stdlib only (subprocess, pathlib, xml, dataclasses).
"""

from __future__ import annotations

import subprocess
import tempfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Final, Literal

from sandbox.env_manager import SandboxEnv, SandboxEnvError

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_DEFAULT_RUN_TIMEOUT_SEC: Final[int] = 300   # 5 min -- per-run hard ceiling
_DEFAULT_INSTALL_TIMEOUT_SEC: Final[int] = 120
_PYTEST_PACKAGE: Final[str] = "pytest"


# ---------------------------------------------------------------------------
# Public exceptions
# ---------------------------------------------------------------------------


class PytestRunnerError(RuntimeError):
    """Raised when the pytest runner subprocess fails unexpectedly."""


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

TestOutcome = Literal["passed", "failed", "skipped", "error"]


@dataclass(frozen=True)
class TestCase:
    """Result of a single pytest test case."""

    nodeid: str               # e.g. "tests/test_foo.py::test_bar"
    classname: str            # JUnit classname attribute
    name: str                 # JUnit name attribute
    outcome: TestOutcome      # "passed" | "failed" | "skipped" | "error"
    duration_sec: float       # Wall-clock seconds
    message: str              # Failure / error message, or "" for pass/skip

    def to_dict(self) -> dict[str, object]:
        return {
            "nodeid": self.nodeid,
            "classname": self.classname,
            "name": self.name,
            "outcome": self.outcome,
            "duration_sec": self.duration_sec,
            "message": self.message,
        }


@dataclass
class PytestRun:
    """
    Full result of a single ``run_pytest()`` invocation.

    Attributes
    ----------
    run_index:
        0-based run number within a baseline session (0 = first, 1 = second).
    xml_path:
        Absolute path to the JUnit XML file produced by pytest.
    test_cases:
        All test cases extracted from the XML.
    exit_code:
        Pytest process exit code (0=all pass, 1=some fail, 2=interrupted,
        3=internal error, 4=CLI error, 5=no tests collected).
    stdout:
        Captured stdout from the pytest process.
    stderr:
        Captured stderr from the pytest process.
    """

    run_index: int
    xml_path: Path
    test_cases: list[TestCase] = field(default_factory=list)
    exit_code: int = 0
    stdout: str = ""
    stderr: str = ""

    # ------------------------------------------------------------------
    # Convenience views
    # ------------------------------------------------------------------

    @property
    def passed(self) -> list[TestCase]:
        return [t for t in self.test_cases if t.outcome == "passed"]

    @property
    def failed(self) -> list[TestCase]:
        return [t for t in self.test_cases if t.outcome == "failed"]

    @property
    def skipped(self) -> list[TestCase]:
        return [t for t in self.test_cases if t.outcome == "skipped"]

    @property
    def errored(self) -> list[TestCase]:
        return [t for t in self.test_cases if t.outcome == "error"]

    @property
    def passed_nodeids(self) -> frozenset[str]:
        return frozenset(t.nodeid for t in self.passed)

    @property
    def failed_nodeids(self) -> frozenset[str]:
        return frozenset(t.nodeid for t in self.failed)

    def to_dict(self) -> dict[str, object]:
        return {
            "run_index": self.run_index,
            "xml_path": str(self.xml_path),
            "exit_code": self.exit_code,
            "passed_count": len(self.passed),
            "failed_count": len(self.failed),
            "skipped_count": len(self.skipped),
            "error_count": len(self.errored),
            "test_cases": [t.to_dict() for t in self.test_cases],
        }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _run_subprocess(
    cmd: list[str],
    *,
    cwd: Path | None,
    timeout: int,
    check_returncode: bool = True,
) -> subprocess.CompletedProcess[str]:
    """
    Run an arbitrary subprocess with timeout protection.

    Parameters
    ----------
    cmd:
        Full command token list (no shell expansion).
    cwd:
        Working directory.
    timeout:
        Wall-clock timeout in seconds.
    check_returncode:
        If True, raise ``PytestRunnerError`` on non-zero exit.

    Raises
    ------
    PytestRunnerError
        On timeout or (when ``check_returncode=True``) non-zero exit.
    """
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        raise PytestRunnerError(
            f"Subprocess timed out after {timeout}s: {' '.join(cmd[:3])}..."
        )
    except FileNotFoundError as exc:
        raise PytestRunnerError(f"Executable not found: {cmd[0]!r} -- {exc}") from exc

    if check_returncode and result.returncode != 0:
        raise PytestRunnerError(
            f"Command failed (exit {result.returncode}): {' '.join(cmd)}\n"
            f"stderr: {(result.stderr or '').strip()}"
        )
    return result


def _ensure_pytest_installed(env: SandboxEnv, *, timeout: int) -> None:
    """
    Install pytest inside *env* using ``uv pip install`` if not already present.

    Uses ``uv pip install --quiet`` so reinstallation is a no-op when already
    satisfied.

    Parameters
    ----------
    env:
        Phase 1 SandboxEnv descriptor.  ``env.uv_bin`` and ``env.venv_dir``
        are used.
    timeout:
        Wall-clock seconds for the install subprocess.

    Raises
    ------
    PytestRunnerError
        If the install subprocess fails.
    """
    cmd = [
        env.uv_bin,
        "pip",
        "install",
        "--quiet",
        "--python", str(env.python_bin),
        _PYTEST_PACKAGE,
    ]
    _run_subprocess(cmd, cwd=None, timeout=timeout, check_returncode=True)


def _parse_junit_xml(xml_path: Path) -> list[TestCase]:
    """
    Parse a JUnit XML file and return a list of ``TestCase`` objects.

    JUnit XML schema (pytest flavour):
        <testsuites>
          <testsuite ...>
            <testcase classname="..." name="..." time="...">
              <failure ...>msg</failure>   -- optional
              <error ...>msg</error>       -- optional
              <skipped ...>msg</skipped>   -- optional
            </testcase>
          </testsuite>
        </testsuites>

    Raises
    ------
    PytestRunnerError
        If the XML file is missing or malformed.
    """
    if not xml_path.exists():
        raise PytestRunnerError(
            f"JUnit XML file not found after pytest run: {xml_path}"
        )

    try:
        tree = ET.parse(xml_path)
    except ET.ParseError as exc:
        raise PytestRunnerError(f"JUnit XML parse error: {exc}") from exc

    root = tree.getroot()
    # Root may be <testsuites> (wrapper) or <testsuite> directly
    if root.tag == "testsuites":
        test_suites = root.findall("testsuite")
    else:
        test_suites = [root]

    cases: list[TestCase] = []

    for suite in test_suites:
        for tc in suite.findall("testcase"):
            classname = tc.get("classname", "")
            name = tc.get("name", "")
            # Build a stable nodeid: classname uses "." separators in pytest XML
            nodeid = f"{classname.replace('.', '/')}::{name}" if classname else name
            duration_sec = float(tc.get("time", "0") or "0")

            failure_el = tc.find("failure")
            error_el = tc.find("error")
            skipped_el = tc.find("skipped")

            if failure_el is not None:
                outcome: TestOutcome = "failed"
                message = (failure_el.get("message") or failure_el.text or "").strip()
            elif error_el is not None:
                outcome = "error"
                message = (error_el.get("message") or error_el.text or "").strip()
            elif skipped_el is not None:
                outcome = "skipped"
                message = (skipped_el.get("message") or skipped_el.text or "").strip()
            else:
                outcome = "passed"
                message = ""

            cases.append(
                TestCase(
                    nodeid=nodeid,
                    classname=classname,
                    name=name,
                    outcome=outcome,
                    duration_sec=duration_sec,
                    message=message,
                )
            )

    return cases


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def ensure_pytest(
    env: SandboxEnv,
    *,
    install_timeout: int = _DEFAULT_INSTALL_TIMEOUT_SEC,
) -> None:
    """
    Guarantee that pytest is installed in *env*.

    Idempotent -- safe to call before every run.

    Parameters
    ----------
    env:
        Phase 1 SandboxEnv descriptor.
    install_timeout:
        Seconds for the install subprocess (default: 120).

    Raises
    ------
    PytestRunnerError
        If installation fails.
    """
    _ensure_pytest_installed(env, timeout=install_timeout)


def run_pytest(
    env: SandboxEnv,
    repo_dir: Path | str,
    *,
    run_index: int = 0,
    xml_dir: Path | str | None = None,
    extra_args: list[str] | None = None,
    run_timeout: int = _DEFAULT_RUN_TIMEOUT_SEC,
    install_timeout: int = _DEFAULT_INSTALL_TIMEOUT_SEC,
) -> PytestRun:
    """
    Run pytest inside *env* against *repo_dir* and return a ``PytestRun``.

    Steps
    -----
    1. Ensure pytest is installed (``uv pip install pytest``).
    2. Run: ``<python_bin> -m pytest <repo_dir> --junitxml=<xml_path> [extra_args]``
    3. Parse the JUnit XML output.
    4. Return a fully populated ``PytestRun``.

    Parameters
    ----------
    env:
        Phase 1 ``SandboxEnv``.  Uses ``env.python_bin`` and ``env.uv_bin``.
    repo_dir:
        Root directory of the repository to test.
    run_index:
        0-based label for this run (used in ``PytestRun.run_index``).
    xml_dir:
        Directory where the JUnit XML file is written.  Defaults to a
        temp directory that persists for the lifetime of the ``PytestRun``
        (caller is responsible for cleanup).
    extra_args:
        Additional pytest CLI arguments (e.g., ``["-x", "--tb=short"]``).
    run_timeout:
        Wall-clock seconds for the pytest subprocess (default: 300).
    install_timeout:
        Wall-clock seconds for the pip install step (default: 120).

    Returns
    -------
    PytestRun
        Populated with test cases, exit code, and stdout/stderr.

    Raises
    ------
    PytestRunnerError
        If pytest installation fails or the XML is missing/malformed.
        Note: pytest *test failures* do NOT raise -- they are captured in
        ``PytestRun.failed``.
    """
    repo_dir = Path(repo_dir).resolve()
    if not repo_dir.exists():
        raise PytestRunnerError(f"repo_dir does not exist: {repo_dir}")

    # --- Ensure pytest available ---
    _ensure_pytest_installed(env, timeout=install_timeout)

    # --- Resolve XML output path ---
    if xml_dir is None:
        _xml_tmp = tempfile.mkdtemp(prefix="pytest_xml_")
        xml_path = Path(_xml_tmp) / f"results_run{run_index}.xml"
    else:
        xml_path = Path(xml_dir) / f"results_run{run_index}.xml"
        xml_path.parent.mkdir(parents=True, exist_ok=True)

    # --- Build pytest command ---
    cmd: list[str] = [
        str(env.python_bin),
        "-m", "pytest",
        str(repo_dir),
        f"--junitxml={xml_path}",
        "-p", "no:cacheprovider",   # no .pytest_cache pollution
        "--tb=short",
    ]
    if extra_args:
        cmd.extend(extra_args)

    # --- Execute ---
    try:
        proc = subprocess.run(
            cmd,
            cwd=repo_dir,
            capture_output=True,
            text=True,
            check=False,
            timeout=run_timeout,
        )
    except subprocess.TimeoutExpired:
        raise PytestRunnerError(
            f"pytest timed out after {run_timeout}s on run_index={run_index}"
        )
    except FileNotFoundError as exc:
        raise PytestRunnerError(f"Python binary not found: {exc}") from exc

    # --- Parse results ---
    test_cases = _parse_junit_xml(xml_path)

    return PytestRun(
        run_index=run_index,
        xml_path=xml_path,
        test_cases=test_cases,
        exit_code=proc.returncode,
        stdout=proc.stdout or "",
        stderr=proc.stderr or "",
    )
