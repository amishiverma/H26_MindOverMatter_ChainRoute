
"""
repo_cloner.py -- Sandbox Repo Cloner (Dev 1 * Phase 2)

Responsibilities
----------------
* Securely clone a GitHub (or any git-accessible) URL into a managed
  temporary directory.
* Checkout a specific pinned SHA / branch / tag after cloning, making
  the working tree deterministic and reproducible.
* Enforce wall-clock timeout on every git subprocess so a slow / hung
  remote never blocks the pipeline indefinitely.
* Return a typed ``ClonedRepo`` descriptor that other Phase 2 modules
  consume (pytest_runner, baseline).

Zero external dependencies -- stdlib only (subprocess, pathlib, shutil,
tempfile, re, dataclasses).

Integration notes
-----------------
* Does NOT import from env_manager -- no venv needed for cloning.
* The returned ClonedRepo.repo_dir is the entry-point for
  ``locate_dependency_usages()`` (ast_census) and ``run_pytest()``
  (pytest_runner).
"""

from __future__ import annotations

import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Final

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_GIT_EXECUTABLE: Final[str] = "git"
_DEFAULT_CLONE_TIMEOUT_SEC: Final[int] = 120   # 2 minutes wall-clock
_DEFAULT_CHECKOUT_TIMEOUT_SEC: Final[int] = 30

# Minimal URL sanity guard -- allows https:// and git@ forms.
_VALID_GIT_URL_PATTERN: Final[re.Pattern[str]] = re.compile(
    r"^(https?://|git@|ssh://|git://).+"
)


# ---------------------------------------------------------------------------
# Public exceptions
# ---------------------------------------------------------------------------


class RepoCloneError(RuntimeError):
    """Raised when cloning or checkout fails for any reason."""


# ---------------------------------------------------------------------------
# Data class
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ClonedRepo:
    """
    Descriptor for a successfully cloned repository.

    Attributes
    ----------
    repo_dir:
        Absolute path to the cloned repository root (inside a temp dir).
    url:
        The original git URL that was cloned.
    resolved_sha:
        The full 40-char commit SHA that HEAD points to after checkout.
        Always populated -- even when cloning a branch, the SHA is resolved.
    pinned_ref:
        The ref string the caller requested (SHA / branch / tag).
        ``None`` when no specific ref was requested (HEAD of default branch).
    temp_root:
        The parent temp directory that owns ``repo_dir``.  Call
        ``cleanup()`` to delete it.
    extras:
        Arbitrary metadata (e.g., ``{"default_branch": "main"}``).
    """

    repo_dir: Path
    url: str
    resolved_sha: str
    pinned_ref: str | None
    temp_root: Path
    extras: dict[str, str] = field(default_factory=dict)

    def cleanup(self) -> None:
        """
        Delete the temp directory that owns this clone.

        Safe to call multiple times -- silently ignores missing directories.
        """
        if self.temp_root.exists():
            shutil.rmtree(self.temp_root, ignore_errors=True)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _locate_git() -> str:
    """
    Resolve the path to the ``git`` executable.

    Raises
    ------
    RepoCloneError
        If git is not found on PATH.
    """
    git_path = shutil.which(_GIT_EXECUTABLE)
    if git_path is None:
        raise RepoCloneError(
            "`git` executable not found on PATH. "
            "Install Git: https://git-scm.com/downloads"
        )
    return git_path


def _run_git(
    args: list[str],
    *,
    cwd: Path | None = None,
    timeout: int = _DEFAULT_CLONE_TIMEOUT_SEC,
    git_bin: str,
) -> subprocess.CompletedProcess[str]:
    """
    Execute a git subprocess with timeout and rich error reporting.

    Parameters
    ----------
    args:
        Argument tokens appended after ``git``.
    cwd:
        Working directory.
    timeout:
        Wall-clock seconds before the process is killed.
    git_bin:
        Path to the git executable (resolved once per top-level call).

    Raises
    ------
    RepoCloneError
        On non-zero exit code or timeout expiry.
    """
    cmd = [git_bin, *args]
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
        raise RepoCloneError(
            f"git command timed out after {timeout}s: {' '.join(args)}"
        )
    except FileNotFoundError as exc:
        raise RepoCloneError(f"git not found: {exc}") from exc

    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        raise RepoCloneError(
            f"git {args[0]!r} failed (exit {result.returncode}):\n"
            f"  stdout: {stdout}\n"
            f"  stderr: {stderr}"
        )
    return result


def _resolve_sha(repo_dir: Path, git_bin: str, timeout: int) -> str:
    """
    Return the full 40-char SHA of HEAD in *repo_dir*.

    Raises
    ------
    RepoCloneError
        If the rev-parse fails or output is not a valid SHA.
    """
    result = _run_git(
        ["rev-parse", "HEAD"],
        cwd=repo_dir,
        timeout=timeout,
        git_bin=git_bin,
    )
    sha = result.stdout.strip()
    if not re.match(r"^[0-9a-f]{40}$", sha):
        raise RepoCloneError(
            f"rev-parse HEAD returned unexpected value: {sha!r}"
        )
    return sha


def _validate_url(url: str) -> None:
    """
    Basic URL sanity check.  Rejects blank strings and obviously wrong schemes.

    Raises
    ------
    ValueError
        If the URL is empty or does not look like a git remote.
    """
    if not url or not url.strip():
        raise ValueError("git URL must be a non-empty string")
    if not _VALID_GIT_URL_PATTERN.match(url.strip()):
        raise ValueError(
            f"URL does not look like a valid git remote: {url!r}. "
            "Expected https://, git@, ssh://, or git:// prefix."
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def clone_repo(
    url: str,
    *,
    pinned_ref: str | None = None,
    clone_timeout: int = _DEFAULT_CLONE_TIMEOUT_SEC,
    checkout_timeout: int = _DEFAULT_CHECKOUT_TIMEOUT_SEC,
    shallow: bool = True,
    temp_parent: Path | str | None = None,
) -> ClonedRepo:
    """
    Clone *url* into a fresh temp directory and return a ``ClonedRepo``.

    Parameters
    ----------
    url:
        Any git-accessible remote (https, ssh, git@).
    pinned_ref:
        Commit SHA, branch, or tag to checkout after cloning.
        If ``None``, the default branch HEAD is used.
        If a full 40-char SHA is given, a shallow clone is impossible
        for arbitrary SHAs on some hosts; the code falls back to a full
        clone automatically.
    clone_timeout:
        Wall-clock seconds for the ``git clone`` step (default: 120).
    checkout_timeout:
        Wall-clock seconds for ``git checkout`` + ``git rev-parse``
        steps (default: 30).
    shallow:
        If True and ``pinned_ref`` is a branch/tag (not a raw SHA),
        uses ``--depth 1`` for a faster clone. Ignored for raw SHAs.
    temp_parent:
        Parent directory under which the temp dir is created.
        Defaults to the OS temp directory.

    Returns
    -------
    ClonedRepo
        Fully resolved descriptor with absolute ``repo_dir`` and
        ``resolved_sha``.

    Raises
    ------
    ValueError
        If the URL fails basic validation.
    RepoCloneError
        If git is not on PATH, clone fails, checkout fails, or a timeout
        fires.
    """
    _validate_url(url)

    git_bin = _locate_git()

    # Is pinned_ref a raw full SHA?  If so, shallow depth 1 won't work.
    _is_raw_sha = bool(pinned_ref and re.match(r"^[0-9a-f]{40}$", pinned_ref))

    temp_root = Path(
        tempfile.mkdtemp(prefix="sandbox_clone_", dir=temp_parent)
    )
    repo_dir = temp_root / "repo"

    # --- Clone ---
    clone_args = ["clone"]
    if shallow and not _is_raw_sha:
        clone_args += ["--depth", "1"]
    if pinned_ref and not _is_raw_sha:
        # Branch / tag: clone directly to that ref to avoid fetching all history
        clone_args += ["--branch", pinned_ref]
    clone_args += ["--", url, str(repo_dir)]

    try:
        _run_git(clone_args, timeout=clone_timeout, git_bin=git_bin)
    except RepoCloneError:
        # Shallow + branch failed (e.g., tag not visible with --depth 1 on
        # some hosts): retry without shallow
        if shallow and not _is_raw_sha:
            retry_args = ["clone", "--", url, str(repo_dir)]
            if repo_dir.exists():
                shutil.rmtree(repo_dir)
            _run_git(retry_args, timeout=clone_timeout, git_bin=git_bin)
        else:
            raise

    # --- Checkout pinned ref if it's a raw SHA or if clone didn't branch-pin ---
    if pinned_ref and _is_raw_sha:
        # Raw SHA: need full clone + checkout
        _run_git(
            ["fetch", "--unshallow"],
            cwd=repo_dir,
            timeout=clone_timeout,
            git_bin=git_bin,
        )
        _run_git(
            ["checkout", pinned_ref],
            cwd=repo_dir,
            timeout=checkout_timeout,
            git_bin=git_bin,
        )

    resolved_sha = _resolve_sha(repo_dir, git_bin, timeout=checkout_timeout)

    return ClonedRepo(
        repo_dir=repo_dir,
        url=url.strip(),
        resolved_sha=resolved_sha,
        pinned_ref=pinned_ref,
        temp_root=temp_root,
        extras={},
    )
