"""
Sandbox Engine -- Dev 1

Modular, deterministic isolation engine targeting CPython 3.12 / 3.13.
Phase 1: Environment Manager + AST Census Locator
Phase 2: Repository Cloner + Double-Baseline Flakiness Test Engine
Phase 3: Dependency Swapper, Verdict Evaluator & Immutable Fact Ledger
"""

from __future__ import annotations

# Phase 1
from sandbox.env_manager import (
    SandboxEnv,
    SandboxEnvError,
    PythonVersion,
    create_sandbox_env,
    destroy_sandbox_env,
)
from sandbox.ast_census import (
    CensusReport,
    UsageLocation,
    locate_dependency_usages,
)

# Phase 2
from sandbox.repo_cloner import (
    ClonedRepo,
    RepoCloneError,
    clone_repo,
)
from sandbox.pytest_runner import (
    PytestRun,
    TestCase,
    PytestRunnerError,
    run_pytest,
    ensure_pytest,
)
from sandbox.baseline import (
    BaselineResult,
    TestVerdict,
    FlakinessTag,
    run_double_baseline,
)

# Phase 3
from sandbox.swapper import (
    SwappedWorktree,
    SwapperError,
    WorktreeError,
    DependencySwapError,
    PatchApplyError,
    create_swapped_worktree,
    apply_patch_to_tree,
    swap_dependencies,
)
from sandbox.verdict import (
    FinalVerdict,
    VerdictReport,
    compute_verdict,
    run_swapped_verdict,
)
from sandbox.fact_generator import (
    FactLedger,
    build_fact_ledger,
)

__all__ = [
    # Phase 1
    "SandboxEnv",
    "SandboxEnvError",
    "PythonVersion",
    "create_sandbox_env",
    "destroy_sandbox_env",
    "CensusReport",
    "UsageLocation",
    "locate_dependency_usages",
    # Phase 2
    "ClonedRepo",
    "RepoCloneError",
    "clone_repo",
    "PytestRun",
    "TestCase",
    "PytestRunnerError",
    "run_pytest",
    "ensure_pytest",
    "BaselineResult",
    "TestVerdict",
    "FlakinessTag",
    "run_double_baseline",
    # Phase 3
    "SwappedWorktree",
    "SwapperError",
    "WorktreeError",
    "DependencySwapError",
    "PatchApplyError",
    "create_swapped_worktree",
    "apply_patch_to_tree",
    "swap_dependencies",
    "FinalVerdict",
    "VerdictReport",
    "compute_verdict",
    "run_swapped_verdict",
    "FactLedger",
    "build_fact_ledger",
]
