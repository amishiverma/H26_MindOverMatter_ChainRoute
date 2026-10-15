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

## Phase 3 — Pending (Dev 1 backlog)

- [ ] Sandboxed executor: run arbitrary Python code inside the venv
- [ ] Fact Ledger writer: persist `CensusReport` and `BaselineResult` to structured JSON
- [ ] Package installer: `uv pip install <dep>` inside the sandbox
- [ ] Security policy: restrict subprocess capabilities inside sandbox

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

