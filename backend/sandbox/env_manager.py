"""
env_manager.py — Sandbox Environment Manager (Dev 1 · Phase 1)

Responsibilities
----------------
* Create an isolated virtual environment using `uv venv` targeting CPython 3.12
  with a hard fallback to 3.13.
* Validate the resolved interpreter version is STRICTLY 3.12 or 3.13.
  Anything outside that window raises a fatal ``SandboxEnvError``.
* Return a typed ``SandboxEnv`` descriptor for downstream consumers
  (AST Census, executor, etc.).

Zero external dependencies — stdlib only (subprocess, pathlib, sys, re, shutil).
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Final

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_ALLOWED_MINOR_VERSIONS: Final[frozenset[int]] = frozenset({12, 13})
_PYTHON_MAJOR: Final[int] = 3
_UV_EXECUTABLE: Final[str] = "uv"

# Python version token as returned by the python --version command, e.g. "3.12.4"
_VERSION_PATTERN: Final[re.Pattern[str]] = re.compile(
    r"Python\s+(?P<major>\d+)\.(?P<minor>\d+)\.(?P<patch>\d+)"
)


# ---------------------------------------------------------------------------
# Public exceptions
# ---------------------------------------------------------------------------


class SandboxEnvError(RuntimeError):
    """Raised when the sandbox environment cannot be created or validated."""


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PythonVersion:
    """Parsed, validated CPython version triple."""

    major: int
    minor: int
    patch: int

    def __str__(self) -> str:
        return f"{self.major}.{self.minor}.{self.patch}"

    @classmethod
    def parse(cls, raw: str) -> "PythonVersion":
        """
        Parse a version string of the form 'Python X.Y.Z'.

        Raises
        ------
        SandboxEnvError
            If the string does not match the expected format.
        """
        m = _VERSION_PATTERN.search(raw)
        if not m:
            raise SandboxEnvError(
                f"Cannot parse Python version from output: {raw!r}. "
                "Expected format: 'Python X.Y.Z'."
            )
        return cls(
            major=int(m.group("major")),
            minor=int(m.group("minor")),
            patch=int(m.group("patch")),
        )


@dataclass
class SandboxEnv:
    """
    Descriptor for a successfully created and validated sandbox venv.

    Attributes
    ----------
    venv_dir:
        Absolute path to the venv root directory.
    python_bin:
        Absolute path to the Python interpreter inside the venv.
    python_version:
        Resolved and validated CPython version.
    pip_bin:
        Absolute path to pip inside the venv (may not exist if uv skips it).
    uv_bin:
        The `uv` executable used to create the venv.
    extras:
        Arbitrary metadata attached by the creation routine.
    """

    venv_dir: Path
    python_bin: Path
    python_version: PythonVersion
    pip_bin: Path
    uv_bin: str = _UV_EXECUTABLE
    extras: dict[str, str] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _locate_uv() -> str:
    """
    Resolve the absolute path to the `uv` executable.

    Raises
    ------
    SandboxEnvError
        If `uv` cannot be found on PATH.
    """
    uv_path = shutil.which(_UV_EXECUTABLE)
    if uv_path is None:
        raise SandboxEnvError(
            "`uv` executable not found on PATH. "
            "Install it via: curl -LsSf https://astral.sh/uv/install.sh | sh"
        )
    return uv_path


def _run(cmd: list[str], *, cwd: Path | None = None, capture: bool = True) -> subprocess.CompletedProcess[str]:
    """
    Execute a subprocess command with strict error handling.

    Parameters
    ----------
    cmd:
        Command tokens.
    cwd:
        Working directory override.
    capture:
        If True, stdout/stderr are captured; otherwise they stream to the
        calling process (useful for progress output).

    Raises
    ------
    SandboxEnvError
        If the subprocess exits with a non-zero return code.
    """
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=capture,
            text=True,
            check=False,  # We check manually for richer error messages.
        )
    except FileNotFoundError as exc:
        raise SandboxEnvError(f"Command not found: {cmd[0]!r} — {exc}") from exc

    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        raise SandboxEnvError(
            f"Command failed (exit {result.returncode}): {' '.join(cmd)}\n"
            f"stdout: {stdout}\n"
            f"stderr: {stderr}"
        )
    return result


def _probe_version(python_bin: Path) -> PythonVersion:
    """
    Query the interpreter binary for its version string and parse it.

    Raises
    ------
    SandboxEnvError
        On subprocess failure or unparseable output.
    """
    result = _run([str(python_bin), "--version"])
    raw = (result.stdout or result.stderr or "").strip()
    return PythonVersion.parse(raw)


def _assert_version_is_allowed(version: PythonVersion) -> None:
    """
    Enforce the strict 3.12/3.13 contract.

    Raises
    ------
    SandboxEnvError
        If the interpreter is not exactly CPython 3.12.x or 3.13.x.
        This is intentionally brutal — any other version is a hard stop.
    """
    if version.major != _PYTHON_MAJOR:
        raise SandboxEnvError(
            f"FATAL — Interpreter major version mismatch: got Python {version}, "
            f"expected major={_PYTHON_MAJOR}. "
            "The sandbox requires CPython only."
        )

    if version.minor not in _ALLOWED_MINOR_VERSIONS:
        raise SandboxEnvError(
            f"FATAL — Interpreter version {version} is OUTSIDE the allowed window. "
            f"Sandbox requires strictly Python 3.12.x or 3.13.x. "
            f"Detected minor={version.minor} which is {'ahead of' if version.minor > max(_ALLOWED_MINOR_VERSIONS) else 'behind'} "
            f"the supported range. "
            "Refusing to proceed — an untested interpreter may produce non-deterministic "
            "AST analysis results or break sandboxed execution guarantees."
        )


def _resolve_python_bin(venv_dir: Path) -> Path:
    """
    Resolve the Python binary path inside a venv for the current platform.

    Windows uses Scripts\\python.exe; POSIX uses bin/python.
    """
    if sys.platform == "win32":
        candidates = [
            venv_dir / "Scripts" / "python.exe",
            venv_dir / "Scripts" / "python3.exe",
        ]
    else:
        candidates = [
            venv_dir / "bin" / "python3",
            venv_dir / "bin" / "python",
        ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    raise SandboxEnvError(
        f"Python binary not found inside venv at {venv_dir}. "
        f"Checked: {[str(c) for c in candidates]}"
    )


def _resolve_pip_bin(venv_dir: Path) -> Path:
    """
    Resolve pip inside the venv (best-effort; may not exist with uv).
    Returns the path regardless of existence so callers can decide.
    """
    if sys.platform == "win32":
        return venv_dir / "Scripts" / "pip.exe"
    return venv_dir / "bin" / "pip"


def _attempt_create_venv(uv_bin: str, venv_dir: Path, python_spec: str) -> None:
    """
    Invoke `uv venv --python <python_spec> <venv_dir>`.

    Raises
    ------
    SandboxEnvError
        On non-zero exit from uv.
    """
    _run([uv_bin, "venv", "--python", python_spec, str(venv_dir)])


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def create_sandbox_env(
    venv_dir: Path | str,
    *,
    preferred_python: str = "3.12",
    fallback_python: str = "3.13",
    overwrite: bool = False,
) -> SandboxEnv:
    """
    Create a fully validated sandbox virtual environment.

    Resolution order
    ----------------
    1. Try ``uv venv --python <preferred_python>``.
    2. On failure, retry with ``uv venv --python <fallback_python>``.
    3. Validate the resolved interpreter is strictly 3.12 or 3.13.
       Any other version (including 3.14+) raises ``SandboxEnvError``.

    Parameters
    ----------
    venv_dir:
        Target directory for the venv. Must not already exist unless
        ``overwrite=True``.
    preferred_python:
        uv python specifier to try first (default: ``"3.12"``).
    fallback_python:
        uv python specifier to try if preferred is unavailable (default:
        ``"3.13"``).
    overwrite:
        If True and ``venv_dir`` exists, it will be deleted and recreated.

    Returns
    -------
    SandboxEnv
        Fully validated environment descriptor.

    Raises
    ------
    SandboxEnvError
        * ``uv`` not found on PATH.
        * Both preferred and fallback Python specifiers fail.
        * Resolved interpreter version is not 3.12 or 3.13.
        * Python binary cannot be located inside the new venv.
    """
    venv_dir = Path(venv_dir).resolve()
    uv_bin = _locate_uv()

    if venv_dir.exists():
        if not overwrite:
            raise SandboxEnvError(
                f"venv directory already exists: {venv_dir}. "
                "Pass overwrite=True to recreate it."
            )
        shutil.rmtree(venv_dir)

    # --- Attempt 1: preferred Python ---
    creation_error: SandboxEnvError | None = None
    created_with: str | None = None

    try:
        _attempt_create_venv(uv_bin, venv_dir, preferred_python)
        created_with = preferred_python
    except SandboxEnvError as exc:
        creation_error = exc

    # --- Attempt 2: fallback Python ---
    if created_with is None:
        try:
            if venv_dir.exists():
                shutil.rmtree(venv_dir)
            _attempt_create_venv(uv_bin, venv_dir, fallback_python)
            created_with = fallback_python
        except SandboxEnvError as fallback_exc:
            raise SandboxEnvError(
                f"Both Python specifiers failed.\n"
                f"  Preferred ({preferred_python}): {creation_error}\n"
                f"  Fallback  ({fallback_python}):  {fallback_exc}"
            ) from fallback_exc

    # --- Locate and validate the resolved interpreter ---
    python_bin = _resolve_python_bin(venv_dir)
    version = _probe_version(python_bin)
    _assert_version_is_allowed(version)

    pip_bin = _resolve_pip_bin(venv_dir)

    return SandboxEnv(
        venv_dir=venv_dir,
        python_bin=python_bin,
        python_version=version,
        pip_bin=pip_bin,
        uv_bin=uv_bin,
        extras={"created_with_spec": created_with},
    )


def destroy_sandbox_env(env: SandboxEnv) -> None:
    """
    Permanently delete the sandbox venv directory.

    This is a hard delete — no recovery. Call only when the environment
    is no longer needed (e.g., after test teardown).

    Parameters
    ----------
    env:
        The ``SandboxEnv`` descriptor returned by ``create_sandbox_env``.

    Raises
    ------
    SandboxEnvError
        If the directory cannot be removed.
    """
    try:
        shutil.rmtree(env.venv_dir)
    except OSError as exc:
        raise SandboxEnvError(
            f"Failed to remove sandbox venv at {env.venv_dir}: {exc}"
        ) from exc
