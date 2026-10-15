# H26 MindOverMatter ChainRoute — Project Board

## Active Dev: Dev 1 (Sandbox Engine)

> **Strict boundary:** Dev 1 owns `backend/sandbox/` and `tests/sandbox/` only.
> AI, API, and UI folders are out of scope.

---

## Phase 1 — Environment Manager + AST Census Locator ✅ COMPLETE

### Deliverables

| File | Status | Notes |
|------|--------|-------|
| `backend/sandbox/__init__.py` | ✅ Created | Package marker |
| `backend/sandbox/env_manager.py` | ✅ Created | Full implementation |
| `backend/sandbox/ast_census.py` | ✅ Created | Full implementation |
| `tests/sandbox/__init__.py` | ✅ Created | Package marker |
| `tests/sandbox/test_phase1.py` | ✅ Created | 19 tests, all PASS |

### Test Results (2026-10-15)

```
Ran 19 tests in 1.813s — OK
```

| TC | Description | Result |
|----|-------------|--------|
| TC-01 | Detects bare import statements | PASS |
| TC-02 | Detects from-import statements | PASS |
| TC-03 | Detects invocation (call) sites | PASS |
| TC-04 | Handles syntax-error files gracefully | PASS |
| TC-05 | Skips __pycache__ / .venv directories | PASS |
| TC-06 | Raises ValueError for non-existent repo_dir | PASS |
| TC-07 | Raises ValueError for empty dependency name | PASS |
| TC-08 | Report is sorted deterministically | PASS |
| TC-14 | Version guard blocks 3.11 (below window) | PASS |
| TC-15 | Version guard BRUTALLY blocks 3.14 (above window) | PASS |
| TC-16 | Version guard blocks Python 2.x | PASS |
| — | 3.12.4 passes version guard | PASS |
| — | 3.13.0 passes version guard | PASS |
| TC-09 | Creates real venv via uv (integration) | PASS — resolved: 3.12.10 |
| TC-10 | Resolved Python is strictly 3.12 or 3.13 | PASS |
| TC-11 | SandboxEnv fields are fully populated | PASS |
| TC-12 | overwrite=False raises on existing venv | PASS |
| TC-13 | overwrite=True recreates venv | PASS |
| TC-17 | destroy_sandbox_env removes directory | PASS |

### Commit Message

```
feat(sandbox): implement strict 3.12/3.13 env guard and ast usage locator
```

---

## Phase 2 — Repo Cloner + Double-Baseline Test Engine ✅ COMPLETE

### Deliverables

| File | Status | Notes |
|------|--------|-------|
| `backend/sandbox/repo_cloner.py` | ✅ Created | `clone_repo()` → `ClonedRepo` with SHA pin & timeout protection |
| `backend/sandbox/pytest_runner.py` | ✅ Created | `run_pytest()` → `PytestRun` with uv/venv activation & JUnitXML parser |
| `backend/sandbox/baseline.py` | ✅ Created | `run_double_baseline()` → `BaselineResult` with mathematical flaky categorization |
| `tests/sandbox/test_phase2.py` | ✅ Created | 17 tests, all PASS |

### Test Results (2026-10-15)

```
Ran 17 tests in 18.077s — OK
```

| TC | Description | Result |
|----|-------------|--------|
| TC-01 | Raises ValueError for empty URL | PASS |
| TC-02 | Raises ValueError for non-git URL scheme | PASS |
| TC-03 | ClonedRepo.cleanup() removes temp_root | PASS |
| TC-04 | Clone real public repo, verify 40-char SHA [integration] | PASS |
| TC-05 | Clone with pinned branch, verify resolved_sha [integration] | PASS |
| TC-06 | PytestRun property views (passed, failed, skipped, errored) | PASS |
| TC-07 | run_pytest on synthetic repo with 1 passing test -> exit_code=0 | PASS |
| TC-08 | run_pytest on synthetic repo with 1 failing test -> exit_code=1 | PASS |
| TC-09 | run_pytest on mixed pass+fail repo -> both captured | PASS |
| TC-10 | _compare_runs: STABLE_PASS detection | PASS |
| TC-11 | _compare_runs: STABLE_FAIL detection | PASS |
| TC-12 | _compare_runs: PASS->FAIL = PASS_FAIL_FLAKY (CRITICAL) | PASS |
| TC-13 | _compare_runs: FAIL->PASS = FAIL_PASS_FLAKY | PASS |
| TC-14 | _compare_runs: only_in_run1 / only_in_run2 edge cases | PASS |
| TC-15 | run_double_baseline on deterministic repo -> 0 flaky tests | PASS |
| TC-16 | BaselineResult.flaky_nodeids computed correctly | PASS |
| TC-17 | FULL FLOW: clone -> venv -> double baseline [integration] | PASS — FLAKY ARRAY: `[]` |

### TC-17 Live Output
```
Cloning: https://github.com/pytest-dev/pytest-repeat.git
Cloned to: C:\Users\Yash\AppData\Local\Temp\sandbox_clone_7bwy3wum\repo  SHA: a84eaa91965a00af03d8c3576e5b0f32114a06c8
Creating sandbox venv at: C:\Users\Yash\AppData\Local\Temp\tmp_a89q24j\venv_tc17
Venv Python: 3.12.10
Running double baseline ...
FLAKY TESTS ARRAY: []
is_baseline_clean: True  stable_pass: 2  stable_fail: 14
```

### Commit Message

```
feat(sandbox): implement double-baseline test runner and repo cloner with anti-blunder checks
```

---

## Phase 3 — Dependency Swapper & Immutable Fact Ledger ✅ COMPLETE

### Deliverables

| File | Status | Notes |
|------|--------|-------|
| `backend/sandbox/swapper.py` | ✅ Created | Git worktree creation, uv pip dependency swap, `git apply --check` AI patch |
| `backend/sandbox/verdict.py` | ✅ Created | Swapped pytest runner, diff against baseline, flaky exclusion, PASS/FAIL/INCONCLUSIVE |
| `backend/sandbox/fact_generator.py` | ✅ Created | Strict 10-field + `usage_locations` (AST census) immutable JSON Fact Ledger with SHA256 integrity hash |
| `backend/sandbox/__init__.py` | ✅ Updated | Unified public interface exports for Phases 1, 2, and 3 |
| `tests/sandbox/test_phase3.py` | ✅ Created | 17 tests, all PASS |

### Test Results (2026-10-15)

```
Ran 17 tests in 6.809s — OK
```

| TC | Description | Result |
|----|-------------|--------|
| TC-01 | Validates arguments (rejects empty target/candidate) | PASS |
| TC-02 | Creates git worktree on unique branch | PASS |
| TC-03 | SwappedWorktree.cleanup() removes worktree directory & branch | PASS |
| TC-04 | apply_patch_to_tree rejects invalid patch (git apply --check) | PASS |
| TC-05 | apply_patch_to_tree cleanly applies valid patch and returns SHA256 | PASS |
| TC-06 | swap_dependencies uninstalls target and installs candidate via uv | PASS |
| TC-07 | compute_verdict: PASS when all stable baseline tests pass | PASS |
| TC-08 | compute_verdict: FAIL on regression of stable_pass test | PASS |
| TC-09 | compute_verdict: FAIL on brand new failing test | PASS |
| TC-10 | compute_verdict: INCONCLUSIVE when 0 tests run / collection error | PASS |
| TC-11 | compute_verdict: Mathematically EXCLUDES flaky tests from verdict | PASS |
| TC-12 | compute_verdict: Records fixed tests when stable_fail tests pass | PASS |
| TC-13 | build_fact_ledger: Populates all strict fields including usage_locations | PASS |
| TC-14 | FactLedger.to_json(): Valid deterministic JSON | PASS |
| TC-15 | FactLedger.verify_integrity(): Cryptographic tamper detection | PASS |
| TC-16 | FactLedger.save(): Persists to disk | PASS |
| TC-17 | FULL FLOW DRY RUN: Phase 1 -> Phase 2 -> Phase 3 -> Fact JSON | PASS — All steps verified |

### TC-17 Live Fact Ledger JSON Output

```json
{
  "run_id": "run_1425d94ddb4c4b9eaff96709d5e9111e",
  "base_sha": "bb6a7be89ec899de5786913564590dcec7e8f180",
  "py_version": "3.12.10",
  "candidate": "new_math>=2.0.0",
  "patch_sha": "3c58ab2b430b362f048123afa49b86cc02c73f0cc3144f4b050943227a8f7246",
  "baseline_res": {
    "is_clean": true,
    "stable_pass_count": 2,
    "stable_fail_count": 0,
    "flaky_count": 0,
    "run1_exit_code": 0,
    "run2_exit_code": 0
  },
  "swapped_res": {
    "exit_code": 0,
    "passed_count": 2,
    "failed_count": 0,
    "error_count": 0,
    "skipped_count": 0,
    "regressed_nodeids": [],
    "fixed_nodeids": []
  },
  "flaky": [],
  "verdict": "PASS",
  "junit_path": "C:\\Users\\Yash\\AppData\\Local\\Temp\\sandbox_wt_ty73awdg\\worktree\\results_run10.xml",
  "timestamp_utc": "2026-10-15T08:22:21.541287+00:00",
  "usage_locations": {
    "dependency": "old_math",
    "repo_dir": "C:\\Users\\Yash\\AppData\\Local\\Temp\\phase3_e2e_jlarmuai\\e2e_repo",
    "total_usages": 0,
    "files_scanned": 2,
    "import_sites": [],
    "invocation_sites": [],
    "errors": {}
  },
  "ledger_sha256": "e453e3a15a333d97aefc27f3f769b9b11fc978bd4745bb6def937127e79f61fc"
}
```

### Commit Message

```
feat(sandbox): implement dependency swapper and immutable fact ledger generator
```


---

## Key Design Decisions

### env_manager.py
- **uv over pip-venv**: `uv venv` is 10-100× faster than `python -m venv`.
- **Hard version guard**: any interpreter outside 3.12/3.13 raises `SandboxEnvError` immediately — not a warning. 3.14+ blocked by design.
- **Fallback chain**: tries 3.12 first, falls back to 3.13; both fail → single combined error with both causes.
- **Platform-aware paths**: Windows `Scripts/python.exe` vs POSIX `bin/python3`.

### ast_census.py
- **Pure stdlib**: zero external deps — only `ast`, `os`, `pathlib`, `dataclasses`.
- **Encoding resilience**: UTF-8 → latin-1 fallback for malformed files.
- **Conservative invocation detection**: only flags calls where the root attribute chain starts with the dependency name — avoids false positives.
- **Skipped dirs**: `__pycache__`, `.venv`, `venv`, `.git`, `node_modules`, `.tox`, hidden dirs.
- **Sorted output**: deterministic `(file_path, line_number)` ordering for Fact Ledger consistency.

### repo_cloner.py
- **Isolated temp trees**: Every clone resides in `sandbox_clone_*` temp directory with context manager / explicit `cleanup()`.
- **Pinned checkout & SHA resolution**: Clones and checks out specific commit/tag/branch, queries `git rev-parse HEAD` for exact 40-char SHA.
- **Protocol validation**: Rejects unsupported or empty URL schemes (`http://`, `git@`, `ssh://`, `git://` allowed; blocks local/file schemes).
- **Subprocess timeout protection**: Default 120s timeout on git operations prevents hung processes.

### pytest_runner.py
- **Hermetic venv invocation**: Directly runs `sandbox_env.python_bin` to guarantee execution inside the isolated 3.12/3.13 venv.
- **Auto-provisioning via uv**: Checks `pytest --version` inside venv; if absent, invokes `uv pip install pytest` into the venv.
- **JUnitXML parsing**: Uses stdlib `xml.etree.ElementTree` to parse test outcomes into structured `TestOutcome` and `PytestRun` dataclasses.
- **Outcome classification**: Distinguishes `passed`, `failed`, `skipped`, and `errored` (fixtures / collection errors).

### baseline.py
- **Double-baseline protocol**: Executes two consecutive pytest runs against the untouched repo clone to identify non-deterministic tests.
- **Mathematical flaky isolation**: Tests transitioning `pass -> fail` (PASS_FAIL_FLAKY) or `fail -> pass` (FAIL_PASS_FLAKY) are tagged and exposed via `flaky_nodeids`.
- **Verdict exclusion**: Downstream mutation / verification engines can exclude `flaky_nodeids` to prevent false positive attribution.

### swapper.py
- **Isolated git worktrees**: Creates detached worktree branches to isolate mutations completely from the host repo.
- **Hermetic dependency swap**: Directs `uv pip uninstall` and `uv pip install` exclusively into `SandboxEnv.python_bin`.
- **Two-stage patch verification**: Runs `git apply --check` first to validate patch integrity before applying changes.
- **Cryptographic patch hashing**: SHA256 digest computed for every AI patch and tracked in audit records.

### verdict.py
- **Mathematical flaky exclusion**: Any test tagged flaky during Phase 2 baseline is omitted from pass/fail calculations.
- **Regression detection**: Flags `FAIL` if any baseline `stable_pass` test fails or errors on the swapped tree.
- **Inconclusive guard**: Flags `INCONCLUSIVE` if test collection crashes or if zero baseline passing signal existed.
- **Improvement tracking**: Identifies `fixed_nodeids` when previously broken tests pass after dependency upgrade.

### fact_generator.py
- **Strict schema**: Emits exact 10 required fields (`run_id`, `base_sha`, `py_version`, `candidate`, `patch_sha`, `baseline_res`, `swapped_res`, `flaky`, `verdict`, `junit_path`).
- **Cryptographic integrity hash**: Calculates `ledger_sha256` over canonical JSON; `verify_integrity()` detects any post-hoc tampering.
- **Audit-ready persistence**: Writes clean, formatted JSON to disk for consumption by reporting and downstream agents.


