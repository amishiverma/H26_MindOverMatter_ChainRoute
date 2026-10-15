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

export interface ReleaseTimes {
  created: string;
  modified: string;
  [version: string]: string;
}
export type NpmTimes = ReleaseTimes;

export interface ActivityLog {
  id: string;
  repo: string;
  branch: string;
  timestamp: string;
  riskScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionStatus: 'BLOCKED PR' | 'AUDIT PASSED' | 'FLAGGED SUSPICIOUS' | 'ANCHORED' | 'SEALED';
  details: string;
  author: string;
  commitHash: string;
  txHash: string;
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

export type ActiveTab = 'overview' | 'graph' | 'analytics' | 'vulnerabilities' | 'settings' | 'sandbox';

// ============================================================================
// TWO-LEDGER ARCHITECTURE DATA CONTRACTS
// ============================================================================

export interface UsageLocation {
  file_path: string;
  line_number: number;
  kind: 'import' | 'from_import' | 'invocation';
  statement: string;
}

// Re-export all synchronized Two-Ledger API contracts
export * from './api';