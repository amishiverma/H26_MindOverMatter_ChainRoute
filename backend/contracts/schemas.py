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
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
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
# FACT LEDGER  - ground-truth from sandbox execution
# ---------------------------------------------------------------------------


class TestResult(BaseModel):
    """Single test case outcome from sandboxed execution."""

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

    Immutable once sealed.  The ledger merger MUST NOT allow AI output to
    overwrite any field here.
    """

    ledger_kind: LedgerKind = Field(default=LedgerKind.FACT, frozen=True)
    ledger_id: str = Field(default_factory=lambda: f"fact-{uuid4().hex[:12]}")
    sealed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Code state
    repo_path: str = Field(..., description="Absolute path to the target repository")
    python_version: str = Field(..., description="Resolved interpreter e.g. 3.12.10")
    dependency: str = Field(..., description="The dependency under analysis")
    snapshot: DependencySnapshot

    # AST usage locations - produced by ast_census.py (Dev 1)
    usage_locations: list[UsageLocation] = Field(default_factory=list)
    files_scanned: int = Field(default=0, ge=0)
    parse_errors: dict[str, str] = Field(
        default_factory=dict,
        description="file_path -> error_message for files that could not be parsed",
    )

    # Test execution results
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
    confidence: float = Field(..., ge=0.0, le=1.0, description="AI confidence score 0-1")
    breaking_changes_expected: bool = False
    migration_notes: Optional[str] = None


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

    @model_validator(mode="after")
    def validate_and_populate(self) -> "DependencyExitCapsule":
        if self.claim.fact_ledger_id != self.fact.ledger_id:
            raise ValueError(
                f"ClaimLedger.fact_ledger_id '{self.claim.fact_ledger_id}' "
                f"does not match FactLedger.ledger_id '{self.fact.ledger_id}'"
            )
        self.dependency = self.fact.dependency
        self.overall_risk = self.claim.risk_reasoning.overall_risk
        self.vuln_count = len(self.fact.snapshot.vulnerabilities)
        self.usage_count = len(self.fact.usage_locations)
        if self.claim.proposed_replacements:
            self.top_replacement = max(
                self.claim.proposed_replacements,
                key=lambda r: r.confidence,
            )
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

