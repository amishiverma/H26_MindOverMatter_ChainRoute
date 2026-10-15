"""
test_phase1.py — Phase 1 Integration Test Suite (Dev 1 · Sandbox Engine)

Executable from the terminal:
    python -m pytest H26_MindOverMatter_ChainRoute/tests/sandbox/test_phase1.py -v
    # — OR — run directly:
    python H26_MindOverMatter_ChainRoute/tests/sandbox/test_phase1.py

What it tests
-------------
AST Census (ast_census.py)
  TC-01  Detects bare import statements
  TC-02  Detects from-import statements
  TC-03  Detects invocation sites (call expressions)
  TC-04  Handles syntax-error files gracefully (records in report.errors)
  TC-05  Skips __pycache__ / .venv directories
  TC-06  Raises ValueError for non-existent repo_dir
  TC-07  Raises ValueError for empty dependency name
  TC-08  Report is sorted deterministically

Environment Manager (env_manager.py)
  TC-09  Creates a real venv via uv (integration — requires uv on PATH)
  TC-10  Resolved Python version is strictly 3.12 or 3.13
  TC-11  SandboxEnv fields are populated correctly
  TC-12  overwrite=False raises SandboxEnvError when venv already exists
  TC-13  overwrite=True recreates an existing venv without error
  TC-14  _assert_version_is_allowed blocks 3.11 (below window)
  TC-15  _assert_version_is_allowed blocks 3.14 (above window — the brutal guard)
  TC-16  _assert_version_is_allowed blocks Python 2.x
  TC-17  destroy_sandbox_env removes the venv directory

All tests print to stdout for terminal-friendly inspection.
Zero external test-framework dependencies — uses stdlib unittest only.
"""

from __future__ import annotations

import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

# ---------------------------------------------------------------------------
# Path bootstrap so the test works regardless of CWD or installed package
# ---------------------------------------------------------------------------

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # H26_MindOverMatter_ChainRoute/
_BACKEND = _PROJECT_ROOT / "backend"
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from sandbox.ast_census import locate_dependency_usages, CensusReport, UsageLocation  # noqa: E402
from sandbox.env_manager import (  # noqa: E402
    SandboxEnv,
    SandboxEnvError,
    PythonVersion,
    create_sandbox_env,
    destroy_sandbox_env,
    _assert_version_is_allowed,
)


# ===========================================================================
# Helpers
# ===========================================================================

def _banner(title: str) -> None:
    width = 72
    print(f"\n{'=' * width}")
    print(f"  {title}")
    print(f"{'=' * width}")


def _make_dummy_repo(base: Path) -> Path:
    """
    Create a minimal fake repository with a handful of Python files that
    use 'requests' in various ways.

    Layout
    ------
    dummy_repo/
        service.py          # import requests + requests.get(...)
        utils/
            http_client.py  # from requests import Session
            __init__.py     # empty
        broken.py           # intentional SyntaxError
        __pycache__/
            ignore_me.py    # should NOT be scanned
        .venv/
            site.py         # should NOT be scanned
    """
    repo = base / "dummy_repo"

    # service.py
    (repo).mkdir(parents=True, exist_ok=True)
    (repo / "service.py").write_text(
        textwrap.dedent("""\
            import requests
            import os

            def fetch(url: str) -> str:
                resp = requests.get(url, timeout=10)
                resp.raise_for_status()
                return resp.text

            def post_data(url: str, data: dict) -> dict:
                return requests.post(url, json=data).json()
        """),
        encoding="utf-8",
    )

    # utils/http_client.py
    (repo / "utils").mkdir(exist_ok=True)
    (repo / "utils" / "__init__.py").write_text("", encoding="utf-8")
    (repo / "utils" / "http_client.py").write_text(
        textwrap.dedent("""\
            from requests import Session, HTTPError
            from requests.auth import HTTPBasicAuth

            def make_session(token: str) -> Session:
                s = Session()
                s.headers.update({"Authorization": f"Bearer {token}"})
                return s
        """),
        encoding="utf-8",
    )

    # broken.py — deliberate SyntaxError
    (repo / "broken.py").write_text(
        "def oops(\n    pass  # missing closing paren\n",
        encoding="utf-8",
    )

    # __pycache__/ignore_me.py — must be skipped
    cache_dir = repo / "__pycache__"
    cache_dir.mkdir(exist_ok=True)
    (cache_dir / "ignore_me.py").write_text(
        "import requests  # should never appear in report\n",
        encoding="utf-8",
    )

    # .venv/site.py — must be skipped
    venv_dir = repo / ".venv"
    venv_dir.mkdir(exist_ok=True)
    (venv_dir / "site.py").write_text(
        "import requests  # should never appear in report\n",
        encoding="utf-8",
    )

    return repo


# ===========================================================================
# TC-01 – TC-08: AST Census tests
# ===========================================================================

class TestAstCensus(unittest.TestCase):

    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.base = Path(self._tmp.name)
        self.repo = _make_dummy_repo(self.base)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    # TC-01
    def test_01_detects_bare_imports(self) -> None:
        _banner("TC-01 · Detects bare import statements")
        report = locate_dependency_usages(self.repo, "requests")
        imports = report.import_sites
        print(f"  Found {len(imports)} import site(s):")
        for loc in imports:
            print(f"    [{loc.kind}] {loc.file_path}:{loc.line_number}  →  {loc.statement!r}")
        bare = [loc for loc in imports if loc.kind == "import"]
        self.assertGreater(len(bare), 0, "Expected at least one bare import of 'requests'")

    # TC-02
    def test_02_detects_from_imports(self) -> None:
        _banner("TC-02 · Detects from-import statements")
        report = locate_dependency_usages(self.repo, "requests")
        from_imports = [loc for loc in report.import_sites if loc.kind == "from_import"]
        print(f"  Found {len(from_imports)} from-import site(s):")
        for loc in from_imports:
            print(f"    [{loc.kind}] {loc.file_path}:{loc.line_number}  →  {loc.statement!r}")
        self.assertGreater(len(from_imports), 0, "Expected at least one from-import of 'requests'")

    # TC-03
    def test_03_detects_invocation_sites(self) -> None:
        _banner("TC-03 · Detects invocation (call) sites")
        report = locate_dependency_usages(self.repo, "requests")
        invocations = report.invocation_sites
        print(f"  Found {len(invocations)} invocation site(s):")
        for loc in invocations:
            print(f"    [{loc.kind}] {loc.file_path}:{loc.line_number}  →  {loc.statement!r}")
        self.assertGreater(len(invocations), 0, "Expected at least one requests.xxx(...) call")

    # TC-04
    def test_04_records_syntax_errors_gracefully(self) -> None:
        _banner("TC-04 · Handles syntax-error files gracefully")
        report = locate_dependency_usages(self.repo, "requests")
        print(f"  Files with errors: {len(report.errors)}")
        for path, msg in report.errors.items():
            print(f"    {path} → {msg}")
        self.assertGreater(len(report.errors), 0, "Expected broken.py to appear in report.errors")
        broken_keys = [k for k in report.errors if "broken.py" in k]
        self.assertTrue(broken_keys, "broken.py not recorded in errors")

    # TC-05
    def test_05_skips_excluded_directories(self) -> None:
        _banner("TC-05 · Skips __pycache__ and .venv directories")
        report = locate_dependency_usages(self.repo, "requests")
        for loc in report.locations:
            self.assertNotIn("__pycache__", loc.file_path,
                             f"__pycache__ file appeared in results: {loc.file_path}")
            self.assertNotIn(".venv", loc.file_path,
                             f".venv file appeared in results: {loc.file_path}")
        print(f"  ✓ No __pycache__ or .venv hits in {report.total_usages} locations.")

    # TC-06
    def test_06_raises_for_nonexistent_repo_dir(self) -> None:
        _banner("TC-06 · Raises ValueError for non-existent repo_dir")
        with self.assertRaises(ValueError) as ctx:
            locate_dependency_usages(self.base / "does_not_exist", "requests")
        print(f"  ✓ ValueError raised: {ctx.exception}")

    # TC-07
    def test_07_raises_for_empty_dependency(self) -> None:
        _banner("TC-07 · Raises ValueError for empty dependency name")
        with self.assertRaises(ValueError) as ctx:
            locate_dependency_usages(self.repo, "   ")
        print(f"  ✓ ValueError raised: {ctx.exception}")

    # TC-08
    def test_08_report_is_sorted_deterministically(self) -> None:
        _banner("TC-08 · Report locations are sorted (file_path, line_number)")
        report = locate_dependency_usages(self.repo, "requests")
        paths_lines = [(loc.file_path, loc.line_number) for loc in report.locations]
        self.assertEqual(paths_lines, sorted(paths_lines),
                         "Locations are not sorted by (file_path, line_number)")
        print(f"  ✓ {len(paths_lines)} locations are correctly sorted.")


# ===========================================================================
# TC-09 – TC-17: Environment Manager tests
# ===========================================================================

class TestEnvManagerVersionGuard(unittest.TestCase):
    """
    TC-14, TC-15, TC-16 — Unit tests for the version guard function.
    No I/O or uv required.
    """

    def test_14_blocks_python_311(self) -> None:
        _banner("TC-14 · _assert_version_is_allowed blocks 3.11 (below window)")
        v = PythonVersion(major=3, minor=11, patch=9)
        with self.assertRaises(SandboxEnvError) as ctx:
            _assert_version_is_allowed(v)
        print(f"  ✓ 3.11.9 blocked: {ctx.exception}")

    def test_15_blocks_python_314(self) -> None:
        _banner("TC-15 · _assert_version_is_allowed BRUTALLY blocks 3.14 (above window)")
        v = PythonVersion(major=3, minor=14, patch=0)
        with self.assertRaises(SandboxEnvError) as ctx:
            _assert_version_is_allowed(v)
        print(f"  ✓ 3.14.0 blocked: {ctx.exception}")

    def test_16_blocks_python2(self) -> None:
        _banner("TC-16 · _assert_version_is_allowed blocks Python 2.x")
        v = PythonVersion(major=2, minor=7, patch=18)
        with self.assertRaises(SandboxEnvError) as ctx:
            _assert_version_is_allowed(v)
        print(f"  ✓ 2.7.18 blocked: {ctx.exception}")

    def test_allows_python_312(self) -> None:
        v = PythonVersion(major=3, minor=12, patch=4)
        try:
            _assert_version_is_allowed(v)  # should not raise
        except SandboxEnvError as exc:
            self.fail(f"3.12.4 should be allowed but raised: {exc}")
        print("  ✓ 3.12.4 passes the version guard.")

    def test_allows_python_313(self) -> None:
        v = PythonVersion(major=3, minor=13, patch=0)
        try:
            _assert_version_is_allowed(v)
        except SandboxEnvError as exc:
            self.fail(f"3.13.0 should be allowed but raised: {exc}")
        print("  ✓ 3.13.0 passes the version guard.")


class TestEnvManagerIntegration(unittest.TestCase):
    """
    TC-09 – TC-13, TC-17 — Integration tests that actually invoke uv.
    Will be skipped if uv is not on PATH.
    """

    @classmethod
    def setUpClass(cls) -> None:
        import shutil
        cls._uv_available = shutil.which("uv") is not None
        if not cls._uv_available:
            print("\n  ⚠️  uv not found on PATH — integration tests will be SKIPPED.")

    def setUp(self) -> None:
        if not self.__class__._uv_available:
            self.skipTest("uv not found on PATH")
        self._tmp = tempfile.TemporaryDirectory()
        self.base = Path(self._tmp.name)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    # TC-09
    def test_09_creates_venv_via_uv(self) -> None:
        _banner("TC-09 · Creates a real venv via uv")
        venv_path = self.base / "sandbox_venv"
        env = create_sandbox_env(venv_path)
        print(f"  venv_dir    : {env.venv_dir}")
        print(f"  python_bin  : {env.python_bin}")
        print(f"  python_ver  : {env.python_version}")
        print(f"  uv_bin      : {env.uv_bin}")
        print(f"  extras      : {env.extras}")
        self.assertTrue(env.venv_dir.exists(), "venv directory must exist after creation")
        self.assertTrue(env.python_bin.exists(), "python_bin must exist inside venv")

    # TC-10
    def test_10_resolved_python_is_3_12_or_3_13(self) -> None:
        _banner("TC-10 · Resolved Python is strictly 3.12 or 3.13")
        venv_path = self.base / "sandbox_venv_tc10"
        env = create_sandbox_env(venv_path)
        ver = env.python_version
        print(f"  Resolved interpreter: Python {ver}")
        self.assertEqual(ver.major, 3)
        self.assertIn(ver.minor, {12, 13},
                      f"Expected 3.12 or 3.13, got {ver}")

    # TC-11
    def test_11_sandboxenv_fields_populated(self) -> None:
        _banner("TC-11 · SandboxEnv fields are fully populated")
        venv_path = self.base / "sandbox_venv_tc11"
        env = create_sandbox_env(venv_path)
        self.assertIsInstance(env.venv_dir, Path)
        self.assertIsInstance(env.python_bin, Path)
        self.assertIsInstance(env.python_version, PythonVersion)
        self.assertIsInstance(env.pip_bin, Path)
        self.assertIsInstance(env.uv_bin, str)
        self.assertIsInstance(env.extras, dict)
        self.assertIn("created_with_spec", env.extras)
        print(f"  ✓ All SandboxEnv fields validated.")

    # TC-12
    def test_12_overwrite_false_raises_on_existing_venv(self) -> None:
        _banner("TC-12 · overwrite=False raises SandboxEnvError when venv exists")
        venv_path = self.base / "sandbox_venv_tc12"
        create_sandbox_env(venv_path)  # first creation
        with self.assertRaises(SandboxEnvError) as ctx:
            create_sandbox_env(venv_path, overwrite=False)  # must fail
        print(f"  ✓ SandboxEnvError raised: {ctx.exception}")

    # TC-13
    def test_13_overwrite_true_recreates_venv(self) -> None:
        _banner("TC-13 · overwrite=True recreates an existing venv without error")
        venv_path = self.base / "sandbox_venv_tc13"
        env1 = create_sandbox_env(venv_path)
        env2 = create_sandbox_env(venv_path, overwrite=True)
        self.assertTrue(env2.venv_dir.exists())
        self.assertEqual(env1.venv_dir, env2.venv_dir)
        print(f"  ✓ Venv recreated successfully at {env2.venv_dir}")

    # TC-17
    def test_17_destroy_sandbox_env_removes_dir(self) -> None:
        _banner("TC-17 · destroy_sandbox_env removes the venv directory")
        venv_path = self.base / "sandbox_venv_tc17"
        env = create_sandbox_env(venv_path)
        self.assertTrue(env.venv_dir.exists(), "venv must exist before destroy")
        destroy_sandbox_env(env)
        self.assertFalse(env.venv_dir.exists(), "venv must NOT exist after destroy")
        print(f"  ✓ {env.venv_dir} successfully removed.")


# ===========================================================================
# Entry point — direct execution
# ===========================================================================

if __name__ == "__main__":
    print("\n" + "#" * 72)
    print("  Sandbox Engine -- Phase 1 Test Suite")
    print("  Dev 1 scope: AST Census Locator + Environment Manager")
    print("#" * 72)

    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # AST Census (no I/O deps)
    suite.addTests(loader.loadTestsFromTestCase(TestAstCensus))
    # Version guard unit tests (no I/O deps)
    suite.addTests(loader.loadTestsFromTestCase(TestEnvManagerVersionGuard))
    # Integration tests (require uv)
    suite.addTests(loader.loadTestsFromTestCase(TestEnvManagerIntegration))

    runner = unittest.TextTestRunner(verbosity=2, stream=sys.stdout)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
