"""
swapper.py -- Dependency Swapper & Git Worktree Engine (Dev 1 * Phase 3)

Responsibilities
----------------
* Create an isolated git worktree from a source repository without touching
  the main working directory.
* Safely swap a dependency inside the sandbox environment:
    1. Uninstall target dependency (via ``uv pip uninstall``)
    2. Install candidate replacement dependency (via ``uv pip install``)
* Verify and apply AI-generated unified diff patch:
    1. ``git apply --check`` to ensure no conflicts or corrupt chunks
    2. ``git apply`` to cleanly mutate the worktree code
* Calculate cryptographic SHA256 of the applied patch for immutable audit logs.
* Clean up worktrees and temp branches deterministically (context manager support).

Zero external dependencies -- stdlib only (subprocess, pathlib, shutil,
tempfile, hashlib, uuid, dataclasses).
"""

from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import sys
import tempfile
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Final

from sandbox.env_manager import SandboxEnv

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_GIT_EXECUTABLE: Final[str] = "git"
_DEFAULT_SUBPROCESS_TIMEOUT_SEC: Final[int] = 120
_DEFAULT_PATCH_TIMEOUT_SEC: Final[int] = 30


# ---------------------------------------------------------------------------
# Public exceptions
# ---------------------------------------------------------------------------


class SwapperError(RuntimeError):
    """Base exception for dependency swapper failures."""


class WorktreeError(SwapperError):
    """Raised when git worktree creation or deletion fails."""


class DependencySwapError(SwapperError):
    """Raised when pip install or uninstall fails."""


class PatchApplyError(SwapperError):
    """Raised when git apply --check or git apply fails."""


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class SwappedWorktree:
    """
    Descriptor for a successfully prepared, isolated git worktree with
    swapped dependencies and optionally applied patch.

    Attributes
    ----------
    worktree_dir:
        Absolute path to the root of the isolated git worktree.
    parent_repo_dir:
        Absolute path to the main repository that spawned the worktree.
    branch_name:
        Git branch created for this worktree (e.g. ``"swap_a1b2c3d4"``).
    base_sha:
        Full 40-character commit SHA that HEAD points to at worktree creation.
    target_dependency:
        Name of the dependency that was uninstalled.
    candidate_package:
        Name / specifier of the replacement package that was installed.
    patch_applied:
        True if an AI patch was successfully verified and applied.
    patch_sha:
        SHA256 hex digest of the patch content (None if no patch applied).
    temp_parent:
        If the worktree was created inside an auto-generated temp folder,
        this holds the parent directory to be cleaned up.
    extras:
        Arbitrary metadata attached by the swapper.
    """

    worktree_dir: Path
    parent_repo_dir: Path
    branch_name: str
    base_sha: str
    target_dependency: str
    candidate_package: str
    patch_applied: bool
    patch_sha: str | None
    temp_parent: Path | None = None
    extras: dict[str, str] = field(default_factory=dict)
    _cleaned_up: bool = field(default=False, repr=False)

    def cleanup(self) -> None:
        """
        Safely remove the git worktree, delete the associated branch,
        and remove any temporary parent directory.

        Safe to call multiple times -- idempotent.
        """
        if self._cleaned_up:
            return

        # 1. Remove git worktree
        if self.parent_repo_dir.exists():
            try:
                _run_git(
                    ["worktree", "remove", "--force", str(self.worktree_dir)],
                    cwd=self.parent_repo_dir,
                    timeout=30,
                    check=False,
                )
            except Exception:
                pass

            # 2. Delete branch
            try:
                _run_git(
                    ["branch", "-D", self.branch_name],
                    cwd=self.parent_repo_dir,
                    timeout=30,
                    check=False,
                )
            except Exception:
                pass

        # 3. Clean up directory if still present
        if self.worktree_dir.exists():
            try:
                shutil.rmtree(self.worktree_dir, ignore_errors=True)
            except Exception:
                pass

        # 4. Clean up temp parent if created
        if self.temp_parent and self.temp_parent.exists():
            try:
                shutil.rmtree(self.temp_parent, ignore_errors=True)
            except Exception:
                pass

        self._cleaned_up = True

    def __enter__(self) -> "SwappedWorktree":
        return self

    def __exit__(self, exc_type: object, exc_val: object, exc_tb: object) -> None:
        self.cleanup()


# ---------------------------------------------------------------------------
# Internal subprocess helpers
# ---------------------------------------------------------------------------


def _run_git(
    args: list[str],
    *,
    cwd: Path,
    timeout: int = _DEFAULT_SUBPROCESS_TIMEOUT_SEC,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    """Execute a git command within *cwd*."""
    cmd = [_GIT_EXECUTABLE] + args
    try:
        res = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise WorktreeError(f"git command timed out after {timeout}s: {' '.join(cmd)}") from exc
    except FileNotFoundError as exc:
        raise WorktreeError("git executable not found on PATH") from exc

    if check and res.returncode != 0:
        err_msg = (res.stderr or res.stdout or "").strip()
        raise WorktreeError(f"git command failed (exit {res.returncode}): {' '.join(cmd)}\n{err_msg}")

    return res


def _resolve_base_sha(repo_dir: Path) -> str:
    """Resolve full 40-character commit SHA of HEAD."""
    res = _run_git(["rev-parse", "HEAD"], cwd=repo_dir, timeout=15)
    sha = res.stdout.strip()
    if len(sha) != 40:
        raise WorktreeError(f"Invalid SHA returned by git rev-parse HEAD: {sha!r}")
    return sha


# ---------------------------------------------------------------------------
# Patch application logic
# ---------------------------------------------------------------------------


def apply_patch_to_tree(
    tree_dir: Path | str,
    patch_content: str,
    *,
    timeout: int = _DEFAULT_PATCH_TIMEOUT_SEC,
) -> str:
    """
    Verify and apply a unified diff patch to *tree_dir*.

    Steps:
    1. Write patch content to a temp diff file.
    2. Execute ``git apply --check --whitespace=nowarn <diff_file>``.
    3. If check succeeds, execute ``git apply --whitespace=nowarn <diff_file>``.
    4. Compute and return SHA256 of the patch content.

    Parameters
    ----------
    tree_dir:
        Directory of the working tree to patch.
    patch_content:
        Unified diff text to apply.
    timeout:
        Subprocess timeout in seconds.

    Returns
    -------
    str
        Hex-encoded SHA256 digest of the applied patch content.

    Raises
    ------
    PatchApplyError
        If ``git apply --check`` or ``git apply`` fails.
    """
    tree_path = Path(tree_dir).resolve()
    if not patch_content or not patch_content.strip():
        raise PatchApplyError("Patch content cannot be empty")

    patch_sha = hashlib.sha256(patch_content.encode("utf-8")).hexdigest()

    # Write patch to a temporary file
    temp_patch_file = tree_path / f".tmp_patch_{uuid.uuid4().hex[:8]}.diff"
    try:
        temp_patch_file.write_text(patch_content, encoding="utf-8")

        # 1. Verification check: git apply --check
        check_res = subprocess.run(
            [_GIT_EXECUTABLE, "apply", "--check", "--whitespace=nowarn", str(temp_patch_file)],
            cwd=str(tree_path),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
        if check_res.returncode != 0:
            err = (check_res.stderr or check_res.stdout or "").strip()
            raise PatchApplyError(
                f"Patch verification failed (git apply --check exit {check_res.returncode}):\n{err}"
            )

        # 2. Application: git apply
        apply_res = subprocess.run(
            [_GIT_EXECUTABLE, "apply", "--whitespace=nowarn", str(temp_patch_file)],
            cwd=str(tree_path),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
        if apply_res.returncode != 0:
            err = (apply_res.stderr or apply_res.stdout or "").strip()
            raise PatchApplyError(
                f"Patch application failed (git apply exit {apply_res.returncode}):\n{err}"
            )

        return patch_sha

    except subprocess.TimeoutExpired as exc:
        raise PatchApplyError(f"Patch operation timed out after {timeout}s") from exc
    finally:
        if temp_patch_file.exists():
            try:
                temp_patch_file.unlink(missing_ok=True)
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Dependency installation / uninstallation logic
# ---------------------------------------------------------------------------


def swap_dependencies(
    env: SandboxEnv,
    *,
    target_dependency: str,
    candidate_package: str,
    timeout: int = _DEFAULT_SUBPROCESS_TIMEOUT_SEC,
) -> None:
    """
    Uninstall *target_dependency* and install *candidate_package* in *env*.

    Uses ``uv pip uninstall`` and ``uv pip install`` directed at ``env.python_bin``.

    Parameters
    ----------
    env:
        Phase 1 SandboxEnv descriptor.
    target_dependency:
        Package name to uninstall.
    candidate_package:
        Package name or requirement specifier to install.
    timeout:
        Subprocess timeout in seconds.

    Raises
    ------
    DependencySwapError
        If uninstallation or installation fails.
    """
    if not target_dependency or not target_dependency.strip():
        raise ValueError("target_dependency must be a non-empty string")
    if not candidate_package or not candidate_package.strip():
        raise ValueError("candidate_package must be a non-empty string")

    # 1. Uninstall target dependency (idempotent, warning if not present)
    uninstall_cmd = [
        env.uv_bin,
        "pip",
        "uninstall",
        "--python",
        str(env.python_bin),
        target_dependency.strip(),
    ]
    try:
        res = subprocess.run(
            uninstall_cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
        if res.returncode != 0:
            err = (res.stderr or res.stdout or "").strip()
            raise DependencySwapError(f"Failed to uninstall '{target_dependency}': {err}")
    except subprocess.TimeoutExpired as exc:
        raise DependencySwapError(f"Uninstall timed out after {timeout}s") from exc
    except FileNotFoundError as exc:
        raise DependencySwapError(f"uv executable not found: {env.uv_bin!r}") from exc

    # 2. Install candidate replacement dependency
    install_cmd = [
        env.uv_bin,
        "pip",
        "install",
        "--python",
        str(env.python_bin),
        candidate_package.strip(),
    ]
    try:
        res = subprocess.run(
            install_cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
        if res.returncode != 0:
            err = (res.stderr or res.stdout or "").strip()
            raise DependencySwapError(
                f"Failed to install candidate package '{candidate_package}': {err}"
            )
    except subprocess.TimeoutExpired as exc:
        raise DependencySwapError(f"Install timed out after {timeout}s") from exc
    except FileNotFoundError as exc:
        raise DependencySwapError(f"uv executable not found: {env.uv_bin!r}") from exc


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def create_swapped_worktree(
    repo_dir: Path | str,
    env: SandboxEnv,
    *,
    target_dependency: str,
    candidate_package: str,
    patch_content: str | None = None,
    worktree_parent: Path | str | None = None,
    branch_name: str | None = None,
    timeout: int = _DEFAULT_SUBPROCESS_TIMEOUT_SEC,
) -> SwappedWorktree:
    """
    Orchestrate full dependency swapping workflow:
    1. Validate repo and get base commit SHA.
    2. Create an isolated git worktree on a unique branch.
    3. Uninstall *target_dependency* and install *candidate_package* in *env*.
    4. If *patch_content* is provided, verify with ``git apply --check`` and apply.
    5. Return a typed ``SwappedWorktree`` descriptor with cleanup capability.

    Parameters
    ----------
    repo_dir:
        Source git repository directory.
    env:
        Phase 1 SandboxEnv descriptor.
    target_dependency:
        Package name to remove.
    candidate_package:
        Package name / spec to install.
    patch_content:
        Optional unified diff patch content.
    worktree_parent:
        Optional parent directory for the worktree. If None, uses a temporary dir.
    branch_name:
        Optional branch name. If None, generates ``swap_<random>``.
    timeout:
        Subprocess timeout in seconds.

    Returns
    -------
    SwappedWorktree
        Descriptor of the ready-to-test worktree.
    """
    repo_path = Path(repo_dir).resolve()
    if not repo_path.exists() or not repo_path.is_dir():
        raise ValueError(f"Repository directory does not exist: {repo_path}")

    base_sha = _resolve_base_sha(repo_path)

    # Generate branch and worktree directory
    uid = uuid.uuid4().hex[:8]
    branch = branch_name or f"swap_{uid}"

    temp_parent_dir: Path | None = None
    if worktree_parent is not None:
        parent = Path(worktree_parent).resolve()
        parent.mkdir(parents=True, exist_ok=True)
        wt_dir = parent / f"wt_{uid}"
    else:
        temp_parent_dir = Path(tempfile.mkdtemp(prefix="sandbox_wt_"))
        wt_dir = temp_parent_dir / "worktree"

    # Step 1: Create git worktree
    _run_git(
        ["worktree", "add", "-b", branch, str(wt_dir), "HEAD"],
        cwd=repo_path,
        timeout=timeout,
    )

    worktree = SwappedWorktree(
        worktree_dir=wt_dir,
        parent_repo_dir=repo_path,
        branch_name=branch,
        base_sha=base_sha,
        target_dependency=target_dependency.strip(),
        candidate_package=candidate_package.strip(),
        patch_applied=False,
        patch_sha=None,
        temp_parent=temp_parent_dir,
    )

    try:
        # Step 2: Swap dependencies in Sandbox venv
        swap_dependencies(
            env,
            target_dependency=target_dependency,
            candidate_package=candidate_package,
            timeout=timeout,
        )

        # Step 3: Verify and apply patch if provided
        if patch_content and patch_content.strip():
            patch_sha = apply_patch_to_tree(wt_dir, patch_content, timeout=timeout)
            worktree.patch_applied = True
            worktree.patch_sha = patch_sha

        return worktree

    except Exception:
        # On any failure, clean up worktree immediately so no dangling branches remain
        worktree.cleanup()
        raise
