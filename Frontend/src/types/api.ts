/**
 * Frontend/src/types/api.ts
 * Exact TypeScript interfaces synchronized with backend/contracts/schemas.py (Dev 3).
 * Represents the Two-Ledger Architecture:
 * - FactLedger (Dev 1 Sandbox: Code Truth)
 * - ClaimLedger (Dev 2 Gemma 4: Model Claims)
 * - DependencyExitCapsule (Dev 3 Merger: Sealed Payload with 9 Hackathon Fields)
 */

export type LedgerKind = 'FACT' | 'CLAIM';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' | 'UNKNOWN';

export type TestStatus = 'PASS' | 'FAIL' | 'ERROR' | 'SKIP' | 'NOT_RUN';

export type MergeDecision = 'APPROVED' | 'FLAGGED' | 'REJECTED' | 'PENDING_FACTS';

export type JobStatus = 'queued' | 'processing' | 'complete' | 'error';

export interface ModelMetadata {
  model: string;
  access_method: string;
  terms: string;
}

// ---------------------------------------------------------------------------
// FACT LEDGER TYPES (Ground Truth - Dev 1)
// ---------------------------------------------------------------------------

export interface FactVulnerabilityItem {
  id: string;
  summary?: string;
  severity: RiskLevel;
  cvss_score?: number;
  fixed_version?: string;
}

export interface DependencySnapshot {
  package: string;
  requested_version: string;
  resolved_version?: string;
  ecosystem: string;
  is_direct: boolean;
  vulnerabilities: FactVulnerabilityItem[];
}

export interface UsageLocation {
  file_path: string;
  line_number: number;
  kind: 'import' | 'from_import' | 'invocation' | string;
  statement: string;
}

export interface TestResult {
  test_id: string;
  status: TestStatus;
  duration_ms?: number;
  error_message?: string;
  traceback?: string;
}

export interface FactLedger {
  ledger_kind: 'FACT';
  ledger_id: string;
  sealed_at?: string;
  run_id?: string;
  base_sha?: string;
  py_version?: string;
  candidate?: string;
  patch_sha?: string | null;
  baseline_res?: Record<string, any>;
  swapped_res?: Record<string, any>;
  flaky?: string[];
  verdict?: string;
  junit_path?: string;
  timestamp_utc?: string;
  ledger_sha256?: string;
  repo_path?: string;
  python_version?: string;
  dependency?: string;
  snapshot?: DependencySnapshot;
  usage_locations: UsageLocation[] | Record<string, any>;
  files_scanned?: number;
  parse_errors?: Record<string, string>;
  test_results?: TestResult[];
  tests_passed?: number;
  tests_failed?: number;
  tests_total?: number;
}

// ---------------------------------------------------------------------------
// CLAIM LEDGER TYPES (Gemma 4 AI Speculation - Dev 2)
// ---------------------------------------------------------------------------

export interface ProposedReplacement {
  package: string;
  suggested_version: string;
  rationale: string;
  confidence: number;
  breaking_changes_expected: boolean;
  migration_notes?: string;
  diff_preview?: string;
}

export interface GapEvaluation {
  missing_test_coverage: boolean;
  missing_usage_locations: boolean;
  ambiguous_version: boolean;
  insufficient_vuln_data: boolean;
  notes?: string;
}

export interface ClaimRiskReasoning {
  overall_risk: RiskLevel;
  risk_score: number;
  abandonment_risk: RiskLevel | string;
  supply_chain_risk: RiskLevel | string;
  vulnerability_risk: RiskLevel | string;
  reasoning_summary: string;
  evidence_cited: string[];
}

export interface ClaimLedger {
  ledger_kind: 'CLAIM';
  ledger_id: string;
  fact_ledger_id: string;
  generated_at?: string;
  model_id: string;
  risk_reasoning: ClaimRiskReasoning;
  proposed_replacements: ProposedReplacement[];
  migration_steps: string[];
  suggested_tests: string[];
  gap_evaluation: GapEvaluation;
  open_concerns: string[];
  raw_model_output?: string;
  ledger_sha256?: string;
}

// ---------------------------------------------------------------------------
// THE 9-HEADER DEPENDENCY EXIT CAPSULE (Merger Contract - Dev 3)
// ---------------------------------------------------------------------------

export interface DependencyExitCapsule {
  capsule_id: string;
  sealed_at: string;
  fact: FactLedger;
  claim: ClaimLedger;
  merge_decision: MergeDecision;
  merger_notes?: string;
  dependency: string;
  overall_risk: RiskLevel;
  top_replacement?: ProposedReplacement;
  vuln_count?: number;
  usage_count?: number;
  chain_tx_hash?: string;

  // Mandatory Gemma 4 Rubric Metadata
  model?: string;
  access_method?: string;
  terms?: string;
  model_metadata?: ModelMetadata;

  // Exact 9 Hackathon Problem Statement Fields (matching backend/contracts/schemas.py)
  // FACT LEDGER FIELDS (Solid Green / Verified Fact)
  dependency_details?: {
    package: string;
    resolved_version?: string;
    requested_version?: string;
    ecosystem?: string;
    is_direct?: boolean;
    python_version?: string;
    vulnerabilities?: FactVulnerabilityItem[];
    [key: string]: any;
  };
  usage_locations?: UsageLocation[] | Record<string, any>;
  executed_test_results?: {
    tests_passed?: number;
    tests_failed?: number;
    tests_total?: number;
    results?: TestResult[];
    verdict?: string;
    [key: string]: any;
  };
  compatibility_gaps?: {
    missing_test_coverage?: boolean;
    missing_usage_locations?: boolean;
    ambiguous_version?: boolean;
    insufficient_vuln_data?: boolean;
    notes?: string;
    verdict?: string;
    [key: string]: any;
  };
  // CLAIM LEDGER FIELDS (Dashed Purple/Yellow / AI Speculation - Gemma 4)
  risk_indicators?: string[];
  proposed_replacement?: string | ProposedReplacement;
  migration_steps?: string[];
  suggested_tests?: string[];
  open_concerns?: string[];

  // Auxiliary header mappings from schemas.py
  maintenance_score?: number;
  risk_rationale?: string;
  diff_patch?: string;
  gap_verdict?: string;
  narrative_markdown?: string;
}

// ---------------------------------------------------------------------------
// API REQUEST & RESPONSE TYPES
// ---------------------------------------------------------------------------

export interface AnalysisRequest {
  dependency: string;
  repo_path?: string;
  ecosystem?: string;
}

export interface AnalysisResponse {
  job_id: string;
  capsule_id?: string;
  status: JobStatus;
  dependency: string;
  message?: string;
}

export interface JobStateResponse {
  job_id: string;
  capsule_id?: string;
  status: JobStatus;
  dependency: string;
  fact_ready?: boolean;
  claim_ready?: boolean;
  error?: string | null;
  capsule?: DependencyExitCapsule | null;
  message?: string;
}

export interface SSELogEvent {
  source: 'FACT' | 'CLAIM' | 'MERGER' | 'SYSTEM' | 'ERROR';
  step?: string;
  message: string;
  timestamp?: string;
  data?: any;
}
