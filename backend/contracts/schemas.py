"""
backend/contracts/schemas.py - Data Contracts (Dev 3 * Phase 1)

Two-ledger architecture
-----------------------
* FactLedger  - ground-truth produced by the sandbox executor (Dev 1).
                Contains code state, test results, and AST usage locations.
                NEVER mutated by AI.
* ClaimLedger - AI-generated output (Gemma 4 / Gemini).
                Contains risk reasoning, proposed replacements, and gap
                evaluation.  NEVER treated as ground-truth without human review.

DependencyExitCapsule merges both into the final signed payload that the
ledger merger writes to disk and optionally anchors on-chain.

Ported from traceroot:
  - OSVVulnerability shape  -> FactVulnerability (verified, from OSV API)
  - ManifestEntry fields    -> DependencySnapshot (code-state section of Fact)
  - Risk assessment pattern -> ClaimRiskReasoning

Dev 1 FactLedger dataclass fields (fact_generator.py):
  run_id, base_sha, py_version, candidate, patch_sha,
  baseline_res, swapped_res, flaky, verdict, junit_path,
  usage_locations, timestamp_utc, ledger_sha256

Dev 2 CapsuleReport headers (capsule/builder.py):
  1. Risk indicators, 2. Maintenance Score, 3. Risk Rationale,
  4. Proposed replacement, 5. Migration steps, 6. Suggested tests,
  7. Diff Patch, 8. Open concerns, 9. Gap Verdict & Narrative
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class TestStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    ERROR = "ERROR"
    SKIP = "SKIP"
    NOT_RUN = "NOT_RUN"


class RiskLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    NONE = "NONE"
    UNKNOWN = "UNKNOWN"


class LedgerKind(str, Enum):
    FACT = "FACT"
    CLAIM = "CLAIM"


# ---------------------------------------------------------------------------
# Shared primitives
# ---------------------------------------------------------------------------


class UsageLocation(BaseModel):
    """
    A single import or invocation site of a dependency inside the repo.
    Shape mirrors ast_census.UsageLocation dataclass (Dev 1 * sandbox).
    """

    file_path: str = Field(..., description="Absolute path to the source file")
    line_number: int = Field(..., ge=1, description="1-indexed line number")
    kind: str = Field(
        ...,
        pattern=r"^(import|from_import|invocation)$",
        description="import | from_import | invocation",
    )
    statement: str = Field(..., description="Reconstructed statement (best-effort)")


class FactVulnerability(BaseModel):
    """
    Verified CVE/OSV record - ported from traceroot OSVVulnerability.
    Only populated from authoritative feeds (OSV API, NVD).  Not AI-generated.
    """

    id: str = Field(..., description="OSV / CVE identifier e.g. GHSA-xxxx or CVE-xxxx")
    summary: Optional[str] = None
    severity: RiskLevel = RiskLevel.UNKNOWN
    cvss_score: Optional[float] = Field(None, ge=0.0, le=10.0)
    affected_versions: list[str] = Field(default_factory=list)
    fixed_version: Optional[str] = None
    published: Optional[datetime] = None
    references: list[str] = Field(default_factory=list)

    @field_validator("cvss_score", mode="before")
    @classmethod
    def clamp_cvss(cls, v: Any) -> Optional[float]:
        if v is None:
            return None
        return max(0.0, min(10.0, float(v)))


# ---------------------------------------------------------------------------
# FACT LEDGER  - ground-truth from backend.sandbox execution
# ---------------------------------------------------------------------------


class TestResult(BaseModel):
    """Single test case outcome from backend.sandboxed execution."""

    test_id: str
    status: TestStatus
    duration_ms: Optional[float] = None
    error_message: Optional[str] = None
    traceback: Optional[str] = None


class DependencySnapshot(BaseModel):
    """
    Verified state of one dependency at the time of analysis.
    Ported from traceroot ManifestEntry; adapted for Python ecosystem.
    """

    package: str
    requested_version: str = Field(..., description="Version string from requirements file (may be range)")
    resolved_version: Optional[str] = Field(None, description="Pinned version resolved by the sandbox env")
    ecosystem: str = Field(default="pypi", description="pypi | npm | cargo | go | maven")
    is_direct: bool = Field(default=True, description="False if transitive dependency")
    vulnerabilities: list[FactVulnerability] = Field(default_factory=list)


class FactLedger(BaseModel):
    """
    Ground-truth ledger produced exclusively by the sandbox executor (Dev 1).
    Mirrors the FactLedger dataclass in backend/sandbox/fact_generator.py exactly.

    Immutable once sealed.  The ledger merger MUST NOT allow AI output to
    overwrite any field here.
    """

    # Mandatory ledger metadata
    ledger_kind: LedgerKind = Field(default=LedgerKind.FACT, frozen=True)
    ledger_id: str = Field(default_factory=lambda: f"fact-{uuid4().hex[:12]}")
    sealed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Dev 1 FactLedger exact fields (fact_generator.py dataclass)
    run_id: str = Field(default_factory=lambda: f"run_{uuid4().hex[:12]}", description="Unique UUID / identifier for this execution run")
    base_sha: str = Field(default="", description="Full 40-character git commit SHA of the base repository")
    py_version: str = Field(default="3.12.10", description="CPython interpreter version triple string (e.g. '3.12.10')")
    candidate: str = Field(default="", description="Candidate package specifier tested")
    patch_sha: Optional[str] = Field(None, description="SHA256 hex digest of the applied AI patch, or None if unpatched")
    baseline_res: dict[str, Any] = Field(default_factory=dict, description="Summary metrics from the double-baseline phase")
    swapped_res: dict[str, Any] = Field(default_factory=dict, description="Summary metrics from the swapped worktree test run")
    flaky: list[str] = Field(default_factory=list, description="Sorted array of flaky test nodeids excluded from final verdict")
    verdict: str = Field(default="INCONCLUSIVE", description="Final evaluation verdict (PASS, FAIL, or INCONCLUSIVE)")
    junit_path: str = Field(default="", description="Path to the JUnit XML file produced during the swapped test run")
    timestamp_utc: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), description="ISO 8601 UTC timestamp of ledger generation")
    ledger_sha256: str = Field(default="", description="SHA256 hash of canonical JSON content (excluding the hash itself)")
    usage_locations: Optional[Any] = Field(None, description="AST usage locations from census report")

    # Additional code state (preserved for backward compatibility)
    repo_path: str = Field(default="", description="Absolute path to the target repository")
    python_version: str = Field(default="", description="Resolved interpreter e.g. 3.12.10")
    dependency: str = Field(default="", description="The dependency under analysis")
    snapshot: DependencySnapshot = Field(default_factory=lambda: DependencySnapshot(package="", requested_version=""))
    files_scanned: int = Field(default=0, ge=0)
    parse_errors: dict[str, str] = Field(default_factory=dict)
    test_results: list[TestResult] = Field(default_factory=list)
    tests_passed: int = Field(default=0, ge=0)
    tests_failed: int = Field(default=0, ge=0)
    tests_total: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def sync_test_counts(self) -> "FactLedger":
        if self.test_results:
            self.tests_total = len(self.test_results)
            self.tests_passed = sum(1 for t in self.test_results if t.status == TestStatus.PASS)
            self.tests_failed = sum(1 for t in self.test_results if t.status == TestStatus.FAIL)
        return self

    @field_validator("ledger_kind")
    @classmethod
    def must_be_fact(cls, v: LedgerKind) -> LedgerKind:
        if v != LedgerKind.FACT:
            raise ValueError("FactLedger.ledger_kind must always be FACT")
        return v


# ---------------------------------------------------------------------------
# CLAIM LEDGER  - AI-generated reasoning (Gemma 4 / Gemini)
# ---------------------------------------------------------------------------


class ProposedReplacement(BaseModel):
    """
    A single AI-suggested alternative for the dependency under analysis.
    All fields are AI-generated - not verified.
    """

    package: str
    suggested_version: str
    rationale: str
    confidence: float = Field(default=0.8, ge=0.0, le=1.0, description="AI confidence score 0-1")
    breaking_changes_expected: bool = False
    migration_notes: Optional[str] = None
    diff_preview: Optional[str] = None


class GapEvaluation(BaseModel):
    """
    AI evaluation of what facts are missing or insufficient.
    Used by the merger to flag incomplete FactLedgers before sealing.
    """

    missing_test_coverage: bool = False
    missing_usage_locations: bool = False
    ambiguous_version: bool = False
    insufficient_vuln_data: bool = False
    notes: Optional[str] = None


class ClaimRiskReasoning(BaseModel):
    """
    Gemma 4 structured risk reasoning for a single dependency.
    Ported risk pattern from traceroot app/risk/assessment.py.
    """

    overall_risk: RiskLevel
    risk_score: float = Field(..., ge=0.0, le=10.0, description="Composite risk score 0-10")
    abandonment_risk: RiskLevel = RiskLevel.UNKNOWN
    supply_chain_risk: RiskLevel = RiskLevel.UNKNOWN
    vulnerability_risk: RiskLevel = RiskLevel.UNKNOWN

    reasoning_summary: str = Field(..., description="Gemma 4 free-text explanation")
    evidence_cited: list[str] = Field(
        default_factory=list,
        description="References to FactLedger fields used in reasoning",
    )


class ClaimLedger(BaseModel):
    model_config = {"protected_namespaces": ()}

    """
    AI-generated claims produced by the Gemma 4 / Gemini analysis layer (Dev 2).

    This ledger MUST reference an existing FactLedger via fact_ledger_id.
    The merger validates this reference before creating a DependencyExitCapsule.
    """

    ledger_kind: LedgerKind = Field(default=LedgerKind.CLAIM, frozen=True)
    ledger_id: str = Field(default_factory=lambda: f"claim-{uuid4().hex[:12]}")
    fact_ledger_id: str = Field(..., description="Must match FactLedger.ledger_id")
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    model_id: str = Field(default="gemma-4", description="AI model that produced this ledger")

    # AI reasoning
    risk_reasoning: ClaimRiskReasoning

    # AI-proposed alternatives
    proposed_replacements: list[ProposedReplacement] = Field(default_factory=list)

    # Gap evaluation - what facts the AI thinks are missing
    gap_evaluation: GapEvaluation = Field(default_factory=GapEvaluation)

    # Raw AI response preserved for audit
    raw_model_output: Optional[str] = Field(None, description="Unstructured AI response for audit trail")

    @field_validator("ledger_kind")
    @classmethod
    def must_be_claim(cls, v: LedgerKind) -> LedgerKind:
        if v != LedgerKind.CLAIM:
            raise ValueError("ClaimLedger.ledger_kind must always be CLAIM")
        return v


# ---------------------------------------------------------------------------
# EXIT CAPSULE  - merged, signed final payload
# ---------------------------------------------------------------------------


class MergeDecision(str, Enum):
    """Outcome assigned by the ledger merger after cross-validation."""

    APPROVED = "APPROVED"           # Facts + Claims consistent; safe to act on
    FLAGGED = "FLAGGED"             # Inconsistencies detected; human review required
    REJECTED = "REJECTED"           # Critical mismatch; do not use
    PENDING_FACTS = "PENDING_FACTS" # ClaimLedger arrived before FactLedger sealed


class DependencyExitCapsule(BaseModel):
    """
    The final signed payload produced by the ledger merger (Dev 3).

    Combines one FactLedger + one ClaimLedger.  Immutable once sealed.
    This is the unit consumed by the frontend and optionally anchored on-chain
    (pattern ported from traceroot blockchain.anchor_manifest).

    Mandatory Hackathon Metadata (rubric spec):
    - model: "Gemma 4"
    - access_method: "Google GenAI API (google-genai SDK v1.0+)"
    - terms: "https://ai.google.dev/terms"
    """

    capsule_id: str = Field(default_factory=lambda: f"capsule-{uuid4().hex[:12]}")
    sealed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Embedded ledgers (full objects, not just IDs)
    fact: FactLedger
    claim: ClaimLedger

    # Merger verdict
    merge_decision: MergeDecision
    merger_notes: Optional[str] = Field(None, description="Human-readable merger rationale")

    # Computed summary fields for fast frontend consumption
    dependency: str = Field(default="")
    overall_risk: RiskLevel = Field(default=RiskLevel.UNKNOWN)
    top_replacement: Optional[ProposedReplacement] = None
    vuln_count: int = Field(default=0, ge=0)
    usage_count: int = Field(default=0, ge=0)

    # Blockchain anchor hash (optional - set after on-chain commit)
    chain_tx_hash: Optional[str] = None

    # Mandatory Hackathon Model Metadata (rubric spec - immutable)
    model: str = Field(default="Gemma 4", description="AI model used for claims generation")
    access_method: str = Field(
        default="Google GenAI API (google-genai SDK v1.0+)",
        description="API access method for the model"
    )
    terms: str = Field(
        default="https://ai.google.dev/terms",
        description="Model terms of service URL"
    )
    model_metadata: Dict[str, str] = Field(
        default_factory=lambda: {
            "model": "Gemma 4",
            "access_method": "Google GenAI API (google-genai SDK v1.0+)",
            "terms": "https://ai.google.dev/terms",
        },
        description="Nested model metadata wrapper for frontend consumption",
    )

    # Exact 9 problem statement headers
    risk_indicators: list[str] = Field(default_factory=list, description="Header 1: Risk indicators")
    maintenance_score: int = Field(default=0, description="Header 2: Maintenance Score (0-100)")
    risk_rationale: str = Field(default="", description="Header 3: Risk Rationale")
    proposed_replacement: str = Field(default="", description="Header 4: Proposed replacement")
    migration_steps: list[str] = Field(default_factory=list, description="Header 5: Migration steps")
    suggested_tests: list[str] = Field(default_factory=list, description="Header 6: Suggested tests")
    diff_patch: Optional[str] = Field(default=None, description="Header 7: Diff Patch")
    open_concerns: list[str] = Field(default_factory=list, description="Header 8: Open concerns")
    gap_verdict: str = Field(default="", description="Header 9: Gap Verdict & Narrative")
    narrative_markdown: Optional[str] = Field(default=None, description="Full Markdown report")

    @model_validator(mode="after")
    def validate_and_populate(self) -> "DependencyExitCapsule":
        if self.claim.fact_ledger_id != self.fact.ledger_id:
            # Sync linkage if fact_ledger_id was not yet set or needs alignment
            self.claim.fact_ledger_id = self.fact.ledger_id

        self.dependency = self.fact.candidate or self.fact.dependency or self.dependency
        self.overall_risk = self.claim.risk_reasoning.overall_risk
        self.vuln_count = len(self.fact.snapshot.vulnerabilities)
        # Handle both list and dict usage_locations
        if isinstance(self.fact.usage_locations, list):
            self.usage_count = len(self.fact.usage_locations)
        elif isinstance(self.fact.usage_locations, dict):
            self.usage_count = self.fact.usage_locations.get("total_usages", 0)
        else:
            self.usage_count = 0

        if self.claim.proposed_replacements:
            top = max(
                self.claim.proposed_replacements,
                key=lambda r: r.confidence,
            )
            self.top_replacement = top
            if not self.proposed_replacement:
                self.proposed_replacement = f"{top.package} {top.suggested_version}".strip()
            if not self.diff_patch and hasattr(top, "diff_preview"):
                self.diff_patch = getattr(top, "diff_preview", None)

        if not self.risk_indicators:
            self.risk_indicators = list(self.claim.risk_reasoning.evidence_cited)

        if self.maintenance_score == 0 and self.claim.risk_reasoning.risk_score > 0:
            self.maintenance_score = int(self.claim.risk_reasoning.risk_score * 10)

        if not self.risk_rationale:
            self.risk_rationale = self.claim.risk_reasoning.reasoning_summary

        if not self.open_concerns and self.claim.gap_evaluation.notes:
            self.open_concerns = [self.claim.gap_evaluation.notes]

        if not self.gap_verdict:
            self.gap_verdict = self.fact.verdict

        if not self.narrative_markdown and self.claim.raw_model_output:
            self.narrative_markdown = self.claim.raw_model_output

        return self


# ---------------------------------------------------------------------------
# API request/response wrappers  (used by backend/api/)
# ---------------------------------------------------------------------------


class AnalysisRequest(BaseModel):
    """Payload sent by the frontend to trigger analysis of a single dependency."""

    repo_path: str
    dependency: str
    ecosystem: str = "pypi"


class AnalysisResponse(BaseModel):
    """Immediate response - capsule_id for polling, or inline capsule if fast."""

    capsule_id: str
    status: str = Field(..., description="queued | processing | complete | error")
    capsule: Optional[DependencyExitCapsule] = None
    error: Optional[str] = None

