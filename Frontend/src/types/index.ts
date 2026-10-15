export interface DependencyNode {
  id: string;
  name: string;
  version: string;
  riskScore: number; // 0-100
  category: 'direct' | 'transitive' | 'peer';
  license: string;
  downloads: string;
  maintainer: string;
  maintainerRisk: 'low' | 'medium' | 'high' | 'critical';
  cves: string[];
  threatSummary?: string;
  aiExplanation?: string;
  x?: number;
  y?: number;
  status: 'safe' | 'warning' | 'critical';
  polygonHash?: string;

  // ===== NEW FIELDS FROM BACKEND =====
  riskFlags?: string[];
  parentPackage?: string;
  npmTimes?: NpmTimes;
  vulnerabilities?: Vulnerability[];
  maintainers?: Maintainer[];
  dependencyDepth?: number;
  dependencyPath?: string[];
}

export interface DependencyEdge {
  source: string;
  target: string;
  relationship: 'depends' | 'imports' | 'bundles' | 'transitive';
}

export interface Vulnerability {
  id: string;
  cve_id?: string;
  title?: string;
  description?: string;
  cvss_score?: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  cwe?: string[];
  fixed_version?: string;
  fixed_in?: string;
  affected_versions?: string;
  remediation?: string;
  references?: string[];
  published_at?: string;
  modified_at?: string;
}

export interface Maintainer {
  name: string;
  email?: string;
  github?: string;
  username?: string;
}

export interface NpmTimes {
  created: string;
  modified: string;
  [version: string]: string;
}

export interface ActivityLog {
  id: string;
  repo: string;
  branch: string;
  timestamp: string;
  riskScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionStatus: 'BLOCKED PR' | 'AUDIT PASSED' | 'FLAGGED SUSPICIOUS' | 'ANCHORED';
  details: string;
  author: string;
  commitHash: string;
  txHash: string;
}

export interface BlockchainProof {
  id: string;
  txHash: string;
  blockNumber: number;
  network: 'Polygon Mainnet' | 'Sepolia Testnet';
  timestamp: string;
  merkleRoot: string;
  repoScanDigest: string;
  gasUsed: string;
  status: 'Confirmed' | 'Minted';
  validator: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  read: boolean;
}

export interface ScanHistoryEntry {
  id: string;
  repoUrl: string;
  repoName: string;
  timestamp: string;
  transactionHash: string;
  totalPackages: number;
  criticalCount: number;
  warningCount: number;
  safeCount: number;
  overallRiskScore: number;
}

export type ActiveTab = 'overview' | 'graph' | 'analytics' | 'vulnerabilities' | 'blockchain' | 'settings' | 'sandbox';

// ============================================================================
// TWO-LEDGER ARCHITECTURE DATA CONTRACTS
// ============================================================================

export interface UsageLocation {
  file_path: string;
  line_number: number;
  kind: 'import' | 'from_import' | 'invocation';
  statement: string;
}

export interface TestResult {
  test_id: string;
  status: 'PASS' | 'FAIL' | 'ERROR' | 'SKIP' | 'NOT_RUN';
  duration_ms?: number;
  error_message?: string;
  traceback?: string;
}

export interface FactVulnerabilityItem {
  id: string;
  summary?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  cvss_score?: number;
  fixed_version?: string;
}

export interface FactLedger {
  ledger_kind: 'FACT';
  ledger_id: string;
  sealed_at: string;
  repo_path: string;
  python_version: string;
  dependency: string;
  snapshot: {
    package: string;
    requested_version: string;
    resolved_version?: string;
    ecosystem: string;
    is_direct: boolean;
    vulnerabilities: FactVulnerabilityItem[];
  };
  usage_locations: UsageLocation[];
  files_scanned: number;
  parse_errors?: Record<string, string>;
  test_results: TestResult[];
  tests_passed: number;
  tests_failed: number;
  tests_total: number;
}

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
  overall_risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  risk_score: number;
  abandonment_risk: string;
  supply_chain_risk: string;
  vulnerability_risk: string;
  reasoning_summary: string;
  evidence_cited: string[];
}

export interface ClaimLedger {
  ledger_kind: 'CLAIM';
  ledger_id: string;
  fact_ledger_id: string;
  generated_at: string;
  model_id: string;
  risk_reasoning: ClaimRiskReasoning;
  proposed_replacements: ProposedReplacement[];
  migration_steps: string[];
  suggested_tests: string[];
  gap_evaluation: GapEvaluation;
  open_concerns: string[];
  raw_model_output?: string;
}

export interface DependencyExitCapsule {
  capsule_id: string;
  sealed_at: string;
  dependency: string;
  merge_decision: 'APPROVED' | 'FLAGGED' | 'REJECTED' | 'PENDING_FACTS';
  merger_notes?: string;
  overall_risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  chain_tx_hash?: string;
  fact: FactLedger;
  claim: ClaimLedger;
  model_metadata: {
    model: string;
    access_method: string;
    terms: string;
  };
}