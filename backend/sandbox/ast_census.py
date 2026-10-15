"""
ast_census.py — AST Usage Locator (Dev 1 · Phase 1)

Responsibilities
----------------
For a given **target repository directory** and a **dependency name**, walk every
``.py`` file, parse each with the stdlib ``ast`` module, and return the exact
file paths + line numbers where the dependency is:

  * **Imported** — via ``import <dep>``, ``import <dep>.sub``,
    ``from <dep> import ...``, ``from <dep>.sub import ...``
  * **Invoked** — any ``ast.Call`` whose function resolves to an attribute or
    name whose root matches the dependency (best-effort: detects
    ``<dep>.func()``, ``<dep>.sub.func()``, ``<dep>.<attr>()``)

Output feeds the Fact Ledger "Usage Locations" field.

Design principles
-----------------
* Pure stdlib — no external imports.
* Fully typed with ``from __future__ import annotations``.
* Thread-safe and stateless — every call is a fresh walk.
* Encoding-resilient — falls back to latin-1 on UTF-8 decode errors.
* Ignores unreadable / syntax-error files (records them in ``errors``).
"""

from __future__ import annotations

import ast
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Generator


# ---------------------------------------------------------------------------
# Public data classes
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class UsageLocation:
    """A single import or invocation occurrence of a dependency."""

    file_path: str          # Absolute path to the source file
    line_number: int        # 1-indexed line number
    kind: str               # "import" | "from_import" | "invocation"
    statement: str          # The reconstructed statement / call expression (best-effort)

    def to_dict(self) -> dict[str, object]:
        return {
            "file_path": self.file_path,
            "line_number": self.line_number,
            "kind": self.kind,
            "statement": self.statement,
        }


@dataclass
class CensusReport:
    """
    Full census result for one dependency across an entire repository.

    Attributes
    ----------
    dependency:
        The dependency name that was searched for.
    repo_dir:
        The root directory that was walked.
    locations:
        All import / invocation sites found.
    files_scanned:
        Total number of ``.py`` files examined.
    errors:
        Mapping of ``file_path -> error_message`` for files that could
        not be parsed (syntax errors, encoding issues, permission errors).
    """

    dependency: str
    repo_dir: str
    locations: list[UsageLocation] = field(default_factory=list)
    files_scanned: int = 0
    errors: dict[str, str] = field(default_factory=dict)

    # ------------------------------------------------------------------
    # Convenience views
    # ------------------------------------------------------------------

    @property
    def import_sites(self) -> list[UsageLocation]:
        return [loc for loc in self.locations if loc.kind in ("import", "from_import")]

    @property
    def invocation_sites(self) -> list[UsageLocation]:
        return [loc for loc in self.locations if loc.kind == "invocation"]

    @property
    def total_usages(self) -> int:
        return len(self.locations)

    def to_dict(self) -> dict[str, object]:
        return {
            "dependency": self.dependency,
            "repo_dir": self.repo_dir,
            "total_usages": self.total_usages,
            "files_scanned": self.files_scanned,
            "import_sites": [loc.to_dict() for loc in self.import_sites],
            "invocation_sites": [loc.to_dict() for loc in self.invocation_sites],
            "errors": self.errors,
        }


# ---------------------------------------------------------------------------
# Internal AST visitor
# ---------------------------------------------------------------------------


class _DependencyVisitor(ast.NodeVisitor):
    """
    Single-pass AST visitor that collects import and invocation nodes
    matching a target dependency name.

    The visitor is deliberately conservative about what counts as an
    "invocation" — it only flags calls where the root name exactly matches
    the dependency, avoiding false positives from similarly-named identifiers.
    """

    def __init__(self, dep_name: str, file_path: str, source_lines: list[str]) -> None:
        self._dep = dep_name
        self._file = file_path
        self._lines = source_lines
        self.findings: list[UsageLocation] = []

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _src_line(self, lineno: int) -> str:
        """Return the raw source line (1-indexed). Strips trailing whitespace."""
        try:
            return self._lines[lineno - 1].rstrip()
        except IndexError:
            return ""

    def _root_name(self, node: ast.expr) -> str | None:
        """
        Recursively extract the leftmost name from an attribute chain or Name node.

        Examples
        --------
        ``requests.get``           → ``"requests"``
        ``os.path.join``           → ``"os"``
        ``func()``                 → ``"func"``  (when func is ast.Name)
        Anything else              → ``None``
        """
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            return self._root_name(node.value)
        return None

    def _full_attr_chain(self, node: ast.expr) -> str:
        """Reconstruct a dotted attribute chain as a string (best-effort)."""
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            return f"{self._full_attr_chain(node.value)}.{node.attr}"
        return "<expr>"

    # ------------------------------------------------------------------
    # Import visitors
    # ------------------------------------------------------------------

    def visit_Import(self, node: ast.Import) -> None:  # noqa: N802
        for alias in node.names:
            # Match if the top-level module name starts with the dependency.
            # e.g. dep="requests", alias.name="requests" or "requests.auth"
            top = alias.name.split(".")[0]
            if top == self._dep:
                stmt = self._src_line(node.lineno)
                self.findings.append(
                    UsageLocation(
                        file_path=self._file,
                        line_number=node.lineno,
                        kind="import",
                        statement=stmt,
                    )
                )
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:  # noqa: N802
        module = node.module or ""
        top = module.split(".")[0]
        if top == self._dep:
            stmt = self._src_line(node.lineno)
            self.findings.append(
                UsageLocation(
                    file_path=self._file,
                    line_number=node.lineno,
                    kind="from_import",
                    statement=stmt,
                )
            )
        self.generic_visit(node)

    # ------------------------------------------------------------------
    # Invocation visitor
    # ------------------------------------------------------------------

    def visit_Call(self, node: ast.Call) -> None:  # noqa: N802
        root = self._root_name(node.func)
        if root == self._dep:
            chain = self._full_attr_chain(node.func)
            stmt = self._src_line(node.lineno)
            self.findings.append(
                UsageLocation(
                    file_path=self._file,
                    line_number=node.lineno,
                    kind="invocation",
                    statement=f"{chain}(...)  ← {stmt}",
                )
            )
        self.generic_visit(node)


# ---------------------------------------------------------------------------
# File walking helpers
# ---------------------------------------------------------------------------


def _iter_python_files(repo_dir: Path) -> Generator[Path, None, None]:
    """
    Yield all ``.py`` files under *repo_dir* recursively.

    Skips hidden directories (names starting with ``'.'``),
    ``__pycache__``, and ``node_modules`` to avoid scanning build artefacts.
    """
    _SKIP_DIRS: frozenset[str] = frozenset({"__pycache__", "node_modules", ".git", ".tox", ".venv", "venv", ".env"})

    for root, dirs, files in os.walk(repo_dir):
        # Prune traversal — modify dirs in-place so os.walk respects it
        dirs[:] = [
            d for d in dirs
            if d not in _SKIP_DIRS and not d.startswith(".")
        ]
        for filename in files:
            if filename.endswith(".py"):
                yield Path(root) / filename


def _read_source(filepath: Path) -> tuple[str, list[str]] | None:
    """
    Read a Python source file with UTF-8 / latin-1 fallback.

    Returns ``None`` and silently skips if the file is unreadable.
    Returns ``(source_text, lines)`` on success.
    """
    for encoding in ("utf-8", "latin-1"):
        try:
            text = filepath.read_text(encoding=encoding)
            return text, text.splitlines()
        except (UnicodeDecodeError, PermissionError):
            continue
    return None


def _parse_file(filepath: Path) -> tuple[ast.Module | None, list[str], str | None]:
    """
    Read and parse a single Python file.

    Returns
    -------
    (tree, lines, error_msg)
        * ``tree`` is the parsed AST or ``None`` on failure.
        * ``lines`` is the raw source lines (empty on failure).
        * ``error_msg`` is a human-readable error or ``None`` on success.
    """
    result = _read_source(filepath)
    if result is None:
        return None, [], f"Cannot read file (encoding/permission error)"

    source, lines = result
    try:
        tree = ast.parse(source, filename=str(filepath), type_comments=False)
        return tree, lines, None
    except SyntaxError as exc:
        return None, lines, f"SyntaxError at line {exc.lineno}: {exc.msg}"
    except Exception as exc:  # noqa: BLE001
        return None, lines, f"Unexpected parse error: {type(exc).__name__}: {exc}"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def locate_dependency_usages(
    repo_dir: Path | str,
    dependency: str,
    *,
    follow_symlinks: bool = False,
) -> CensusReport:
    """
    Walk *repo_dir* and return every location where *dependency* is
    imported or invoked.

    Parameters
    ----------
    repo_dir:
        Root directory of the target repository to analyse.
    dependency:
        The top-level package name to search for (e.g. ``"requests"``,
        ``"numpy"``, ``"flask"``). Must be the canonical import name —
        not the PyPI distribution name (they differ for some packages,
        e.g. ``"PIL"`` vs ``"Pillow"``).
    follow_symlinks:
        Whether ``os.walk`` should follow symbolic links. Default: False.

    Returns
    -------
    CensusReport
        Populated report with all usage locations, scan stats, and any
        parse errors encountered.

    Raises
    ------
    ValueError
        If *repo_dir* does not exist or *dependency* is empty.
    """
    repo_dir = Path(repo_dir).resolve()

    if not repo_dir.exists():
        raise ValueError(f"Repository directory does not exist: {repo_dir}")
    if not repo_dir.is_dir():
        raise ValueError(f"repo_dir must be a directory, got: {repo_dir}")
    if not dependency or not dependency.strip():
        raise ValueError("dependency name must be a non-empty string")

    dependency = dependency.strip()
    report = CensusReport(dependency=dependency, repo_dir=str(repo_dir))

    for py_file in _iter_python_files(repo_dir):
        report.files_scanned += 1
        abs_path = str(py_file)

        tree, lines, error_msg = _parse_file(py_file)
        if error_msg is not None:
            report.errors[abs_path] = error_msg
            continue

        visitor = _DependencyVisitor(
            dep_name=dependency,
            file_path=abs_path,
            source_lines=lines,
        )
        visitor.visit(tree)
        report.locations.extend(visitor.findings)

    # Sort locations for deterministic output (file path → line number)
    report.locations.sort(key=lambda loc: (loc.file_path, loc.line_number))

    return report
