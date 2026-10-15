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

## Phase 2 — Pending (Dev 1 backlog)

- [ ] Sandboxed executor: run arbitrary Python code inside the venv
- [ ] Fact Ledger writer: persist `CensusReport` to structured JSON
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
