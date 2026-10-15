import { DependencyNode, DependencyEdge } from '../types';

// ============================================================================
// BACKEND RESPONSE TYPES (matching your exact JSON schema)
// ============================================================================

export interface BackendMaintainer {
  name: string;
  email?: string;
  github?: string;
  username?: string;
}
export type BackendNpmMaintainer = BackendMaintainer;

export interface BackendReleaseTimes {
  created: string;
  modified: string;
  [version: string]: string; // version -> publish timestamp
}
export type BackendNpmTimes = BackendReleaseTimes;

export interface BackendPyPiMetadata {
  maintainers: BackendMaintainer[];
  times: BackendReleaseTimes;
}
export type BackendNpmMetadata = BackendPyPiMetadata;

export interface BackendVulnerability {
  id: string;                    // CVE-ID or GHSA-ID
  cve_id?: string;               // Alternative field name
  title?: string;
  description?: string;
  cvss_score?: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  cwe?: string[];
  fixed_version?: string;
  references?: string[];
  published_at?: string;
  modified_at?: string;
}

export interface BackendDependency {
  package: string;
  version: string;
  parent: string;                // "root" or parent package name
  vulnerabilities: BackendVulnerability[];
  npm_metadata: BackendNpmMetadata;
  final_risk_score: number;      // 0-100
  risk_flags: string[];
  ai_threat_explanation: string;
}

export interface BackendScanResponse {
  transaction_hash: string;
  dependencies: BackendDependency[];
}

// ============================================================================
// EXTENDED FRONTEND TYPES (with missing fields from backend)
// ============================================================================

export interface ExtendedDependencyNode extends DependencyNode {
  // New fields from backend
  riskFlags: string[];
  parentPackage?: string;
  npmTimes?: BackendNpmTimes;
  vulnerabilities: BackendVulnerability[];
  maintainers: BackendNpmMaintainer[];
  // Computed fields
  dependencyDepth: number;
  dependencyPath: string[];      // Full path from root: ['root-pkg', 'pkg-axios-http', 'pkg-event-stream']
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

// ============================================================================
// API SERVICE
// ============================================================================

// Get API base URL from environment variable, with fallback for development
// Vite exposes env vars prefixed with VITE_ via import.meta.env
const getApiBase = (): string => {
  // In production, VITE_API_BASE_URL should be set to the full backend URL
  // e.g., https://api.chainroute.io/api
  // In development, it defaults to /api which works with Vite proxy
  const base = import.meta.env.VITE_API_BASE_URL;
  if (base) {
    // Ensure no trailing slash for consistent URL building
    return base.replace(/\/$/, '');
  }
  // Development fallback - works with Vite proxy config
  return '/api';
};

const API_BASE = getApiBase();

export async function scanRepository(repoUrl: string): Promise<BackendScanResponse> {
  const response = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ github_url: repoUrl }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Scan failed' }));
    throw new Error(error.message || `HTTP ${response.status}: Scan request failed`);
  }

  return response.json();
}

export async function fetchScanHistory(): Promise<ScanHistoryEntry[]> {
  try {
    const response = await fetch(`${API_BASE}/scan/history`);
    if (response.ok) {
      return response.json();
    }
  } catch {
    // Fallback to localStorage (client-side history)
  }
  return getLocalScanHistory();
}

// ============================================================================
// TRANSFORM: Backend → Frontend
// ============================================================================

function scoreToStatus(score: number): 'safe' | 'warning' | 'critical' {
  if (score >= 70) return 'critical';
  if (score >= 30) return 'warning';
  return 'safe';
}

function deriveMaintainerRisk(maintainers: BackendNpmMaintainer[]): 'low' | 'medium' | 'high' | 'critical' {
  if (!maintainers || maintainers.length === 0) return 'critical';
  if (maintainers.length === 1) return 'high';
  if (maintainers.length <= 2) return 'medium';
  return 'low';
}

function extractGithubUsername(maintainer: BackendNpmMaintainer): string | null {
  if (maintainer.github) return maintainer.github;
  if (maintainer.username) return maintainer.username;
  // Try to extract from email
  if (maintainer.email) {
    const match = maintainer.email.match(/^([^@]+)@/);
    if (match) return match[1];
  }
  return null;
}

function buildDependencyPath(
  dep: BackendDependency,
  allDeps: BackendDependency[],
  visited: Set<string> = new Set()
): string[] {
  const path: string[] = [dep.package];
  let currentParent = dep.parent;

  while (currentParent && currentParent !== 'root' && !visited.has(currentParent)) {
    visited.add(currentParent);
    path.unshift(currentParent);
    const parentDep = allDeps.find(d => d.package === currentParent);
    if (!parentDep) break;
    currentParent = parentDep.parent;
  }

  if (currentParent === 'root' || visited.has('root')) {
    path.unshift('root');
  }

  return path;
}

function calculateDepth(path: string[]): number {
  return Math.max(0, path.length - 1); // root = depth 0
}

export function transformBackendResponse(backendData: BackendScanResponse): {
  nodes: ExtendedDependencyNode[];
  edges: DependencyEdge[];
  scanTxHash: string;
} {
  const { transaction_hash, dependencies } = backendData;

  // Build nodes with full backend data
  const nodes: ExtendedDependencyNode[] = dependencies.map((dep, idx) => {
    const path = buildDependencyPath(dep, dependencies);
    const depth = calculateDepth(path);
    const maintainers = dep.npm_metadata?.maintainers || [];
    const githubUsernames = maintainers.map(extractGithubUsername).filter(Boolean) as string[];

    return {
      // Original DependencyNode fields
      id: `dep-${idx}`,
      name: dep.package,
      version: dep.version,
      riskScore: dep.final_risk_score,
      category: dep.parent === 'root' ? 'direct' : 'transitive',
      license: 'UNKNOWN', // Backend doesn't provide; could fetch from PyPI index
      downloads: 'UNKNOWN',
      maintainer: maintainers[0]?.name || 'unknown',
      maintainerRisk: deriveMaintainerRisk(maintainers),
      cves: dep.vulnerabilities.map(v => v.cve_id || v.id).filter(Boolean),
      threatSummary: dep.risk_flags.join('; ') || 'No risk flags',
      aiExplanation: dep.ai_threat_explanation,
      status: scoreToStatus(dep.final_risk_score),
      polygonHash: transaction_hash, // Root transaction hash for all nodes

      // Extended fields
      riskFlags: dep.risk_flags,
      parentPackage: dep.parent === 'root' ? undefined : dep.parent,
      npmTimes: dep.npm_metadata?.times,
      vulnerabilities: dep.vulnerabilities,
      maintainers,
      dependencyDepth: depth,
      dependencyPath: path,

      // Layout defaults (will be overridden by graph layout)
      x: 0,
      y: 0,
    };
  });

  // Build edges from parent relationships
  const edges: DependencyEdge[] = [];
  const nameToId = new Map(nodes.map(n => [n.name, n.id]));

  dependencies.forEach(dep => {
    if (dep.parent !== 'root') {
      const sourceId = nameToId.get(dep.parent);
      const targetId = nameToId.get(dep.package);
      if (sourceId && targetId) {
        edges.push({
          source: sourceId,
          target: targetId,
          relationship: 'depends',
        });
      }
    }
  });

  // Add transitive edges from original mock data pattern (for packages not in current scan)
  // This preserves the graph structure for visualization

  return { nodes, edges, scanTxHash: transaction_hash };
}

// ============================================================================
// LOCAL STORAGE HISTORY (Client-side fallback)
// ============================================================================

const HISTORY_KEY = 'chainroute_scan_history';
const MAX_HISTORY = 50;

export function saveScanToHistory(entry: Omit<ScanHistoryEntry, 'id'>): ScanHistoryEntry {
  const history = getLocalScanHistory();
  const newEntry: ScanHistoryEntry = {
    ...entry,
    id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };
  const updated = [newEntry, ...history].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return newEntry;
}

export function getLocalScanHistory(): ScanHistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearScanHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

// ============================================================================
// HELPER: GitHub Avatar URL
// ============================================================================

export function getGithubAvatarUrl(username: string, size: number = 40): string {
  return `https://github.com/${username}.png?size=${size}`;
}

export function getPyPiAvatarUrl(username: string): string {
  return `https://www.gravatar.com/avatar/${username}?d=identicon&s=40`;
}
export const getNpmAvatarUrl = getPyPiAvatarUrl;

// ============================================================================
// PIPELINE & JOB STATE POLLING (Dev 4)
// ============================================================================

export interface JobStateResponse {
  job_id: string;
  capsule_id?: string;
  status: 'queued' | 'processing' | 'complete' | 'error';
  dependency: string;
  fact_ready?: boolean;
  claim_ready?: boolean;
  error?: string | null;
  capsule?: any;
  message?: string;
}

export async function fetchJobState(jobId: string): Promise<JobStateResponse> {
  const response = await fetch(`${API_BASE}/job/${jobId}`);
  if (!response.ok) {
    const fallback = await fetch(`${API_BASE}/job/${jobId}/status`);
    if (fallback.ok) {
      return fallback.json();
    }
    throw new Error(`HTTP ${response.status}: Failed to fetch job state for ${jobId}`);
  }
  return response.json();
}

export async function startJob(
  repoPath: string,
  dependency: string,
  ecosystem: string = 'pypi'
): Promise<{ job_id: string; capsule_id?: string; status: string }> {
  const response = await fetch(`${API_BASE}/job/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_path: repoPath, dependency, ecosystem }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to start job' }));
    throw new Error(error.message || `HTTP ${response.status}: Failed to start job`);
  }
  return response.json();
}
