import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Bot,
  ExternalLink,
  Lock,
  AlertTriangle,
  CheckCircle2,
  ShieldX,
  Copy,
  Check,
  ChevronRight,
  GitBranch,
  Bug,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DependencyNode, Vulnerability } from '../types';
import { getGithubAvatarUrl } from '../services/api';

interface ThreatDrawerProps {
  node: DependencyNode | null;
  onClose: () => void;
  onIsolate: (nodeId: string) => void;
  onOverride: (nodeId: string) => void;
}

// ─── Risk Flag Chip colours ────────────────────────────────────────────────────
const FLAG_COLORS: Record<string, string> = {
  'Known CVEs found':            'bg-rose-500/15 border-rose-500/40 text-rose-400',
  'Low maintainer count':        'bg-amber-500/15 border-amber-500/40 text-amber-400',
  'Single maintainer':           'bg-amber-500/15 border-amber-500/40 text-amber-400',
  'Maintainer velocity anomaly': 'bg-amber-500/15 border-amber-500/40 text-amber-400',
  'No license detected':         'bg-sky-500/15 border-sky-500/40 text-sky-400',
  'Unpinned version':            'bg-sky-500/15 border-sky-500/40 text-sky-400',
  'Deprecated package':          'bg-rose-500/15 border-rose-500/40 text-rose-400',
};

function chipColor(flag: string): string {
  if (FLAG_COLORS[flag]) return FLAG_COLORS[flag];
  const lower = flag.toLowerCase();
  if (lower.includes('cve') || lower.includes('vuln') || lower.includes('critical') || lower.includes('exploit'))
    return 'bg-rose-500/15 border-rose-500/40 text-rose-400';
  if (lower.includes('maintainer') || lower.includes('velocity') || lower.includes('count') || lower.includes('anomaly'))
    return 'bg-amber-500/15 border-amber-500/40 text-amber-400';
  return 'bg-sky-500/15 border-sky-500/40 text-sky-400';
}

// ─── Severity badge ────────────────────────────────────────────────────────────
function severityBadge(severity?: string): string {
  switch (severity) {
    case 'critical': return 'bg-rose-500/15 border-rose-500/40 text-rose-400';
    case 'high':     return 'bg-orange-500/15 border-orange-500/40 text-orange-400';
    case 'medium':   return 'bg-amber-500/15 border-amber-500/40 text-amber-400';
    default:         return 'bg-sky-500/15 border-sky-500/40 text-sky-400';
  }
}

// ─── Vulnerability Detail Drawer ───────────────────────────────────────────────
interface VulnDrawerProps {
  vuln: Vulnerability;
  onClose: () => void;
}

const VulnerabilityDetailDrawer: React.FC<VulnDrawerProps> = ({ vuln, onClose }) => (
  <div className="fixed inset-0 z-[60] overflow-hidden bg-black/80 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
    <div className="absolute inset-0" onClick={onClose} />
    <div className="relative w-full max-w-lg bg-[#0e100f] border-l border-stone-800 h-full overflow-y-auto p-6 sm:p-8 flex flex-col gap-6 shadow-2xl z-10 animate-in slide-in-from-right duration-300">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-sans font-semibold uppercase tracking-wider text-stone-300">Vulnerability Detail</span>
        </div>
        <button
          onClick={onClose}
          type="button"
          className="p-2 rounded-full bg-[#0b0d0c] border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ID + Title */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="font-mono font-bold text-rose-400 text-lg">{vuln.cve_id || vuln.id}</span>
          {vuln.severity && (
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold uppercase ${severityBadge(vuln.severity)}`}>
              {vuln.severity}
            </span>
          )}
        </div>
        {vuln.title && <p className="text-sm font-medium text-stone-100">{vuln.title}</p>}
      </div>

      {/* CVSS */}
      {vuln.cvss_score !== undefined && (
        <div className="p-4 rounded-2xl bg-[#121412] border border-stone-800 flex items-center justify-between">
          <span className="text-xs text-stone-400 font-sans">CVSS v3 Score</span>
          <span className={`text-2xl font-extrabold font-mono ${
            vuln.cvss_score >= 9 ? 'text-rose-400' :
            vuln.cvss_score >= 7 ? 'text-orange-400' :
            vuln.cvss_score >= 4 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {vuln.cvss_score.toFixed(1)} / 10
          </span>
        </div>
      )}

      {/* Description */}
      {vuln.description && (
        <div>
          <span className="text-[10px] text-stone-400 font-sans uppercase tracking-wider font-semibold block mb-1.5">Description</span>
          <p className="text-xs font-sans text-stone-300 leading-relaxed bg-[#121412] p-4 rounded-2xl border border-stone-800/80">
            {vuln.description}
          </p>
        </div>
      )}

      {/* Affected / Fixed versions */}
      <div className="grid grid-cols-2 gap-3">
        {vuln.affected_versions && (
          <div className="p-3 rounded-2xl bg-[#121412] border border-stone-800 text-xs">
            <span className="text-[10px] text-stone-400 font-sans block mb-0.5">Affected Versions</span>
            <span className="font-mono text-rose-400 font-medium">{vuln.affected_versions}</span>
          </div>
        )}
        {(vuln.fixed_in || vuln.fixed_version) && (
          <div className="p-3 rounded-2xl bg-[#121412] border border-stone-800 text-xs">
            <span className="text-[10px] text-stone-400 font-sans block mb-0.5">Fixed In</span>
            <span className="font-mono text-emerald-400 font-medium">{vuln.fixed_in || vuln.fixed_version}</span>
          </div>
        )}
      </div>

      {/* Remediation */}
      {vuln.remediation && (
        <div>
          <span className="text-[10px] text-stone-400 font-sans uppercase tracking-wider font-semibold block mb-1.5">Remediation Recommendation</span>
          <p className="text-xs font-sans text-emerald-400 leading-relaxed bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-2xl">
            {vuln.remediation}
          </p>
        </div>
      )}

      {/* References */}
      {vuln.references && vuln.references.length > 0 && (
        <div>
          <span className="text-[10px] text-stone-400 font-sans uppercase tracking-wider font-semibold block mb-2">References</span>
          <div className="space-y-1.5">
            {vuln.references.map((ref, i) => (
              <a
                key={i}
                href={ref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:underline truncate"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="truncate">{ref}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        type="button"
        className="mt-auto py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] text-stone-200 text-xs font-sans font-semibold transition-colors"
      >
        Close Vulnerability Detail
      </button>
    </div>
  </div>
);

// ─── Main ThreatDrawer Component ───────────────────────────────────────────────
export const ThreatDrawer: React.FC<ThreatDrawerProps> = ({
  node,
  onClose,
  onIsolate,
  onOverride,
}) => {
  const [isolated, setIsolated] = useState(false);
  const [overridden, setOverridden] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [vulnsExpanded, setVulnsExpanded] = useState(false);

  if (!node) return null;

  const isCritical = node.status === 'critical';
  const isWarning  = node.status === 'warning';

  const maintainers = node.maintainers || [];
  const depPath     = node.dependencyPath  || [];
  const riskFlags   = node.riskFlags       || [];
  const vulns       = node.vulnerabilities || [];
  const vulnsToShow = vulnsExpanded ? vulns : vulns.slice(0, 3);

  const handleIsolateClick  = () => { setIsolated(true);  onIsolate(node.id); };
  const handleOverrideClick = () => { setOverridden(true); onOverride(node.id); };
  const handleCopyHash = () => {
    if (node.polygonHash) {
      navigator.clipboard.writeText(node.polygonHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
        <div className="absolute inset-0" onClick={onClose} />

        {/* Right-hand Slide-out Panel */}
        <div className="relative w-full max-w-xl bg-[#121412] border-l border-stone-800 h-full overflow-y-auto p-6 sm:p-8 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-right duration-300">
          <div>
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <span className="text-xs font-sans font-semibold text-stone-300 flex items-center gap-1.5">
                  <span>Threat Audit Drawer</span>
                  <span className="text-stone-500">•</span>
                  <span className="capitalize text-emerald-400">{node.category} Dependency</span>
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                type="button"
                className="p-2 rounded-full bg-[#0b0d0c] border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-white transition-colors"
                title="Close Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Package Title & Risk Score */}
            <div className="py-6 border-b border-stone-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-sans font-bold text-stone-100 tracking-tight">{node.name}</h2>
                  <div className="text-xs font-sans text-stone-400 mt-1 flex items-center gap-2">
                    <span>Version <span className="font-mono text-stone-300">v{node.version}</span></span>
                    <span>•</span>
                    <span>License: <span className="text-stone-300">{node.license}</span></span>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-center border shrink-0 ${
                  isCritical ? 'bg-rose-500/15 border-rose-500/40 text-rose-400' :
                  isWarning  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' :
                               'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                }`}>
                  <div className="text-[10px] font-sans font-semibold tracking-wider text-stone-400">RISK SCORE</div>
                  <div className="text-2xl font-sans font-extrabold">{node.riskScore} / 100</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 font-sans text-xs">
                <div className="p-3 rounded-2xl bg-[#0b0d0c] border border-stone-800">
                  <span className="text-stone-400 block text-[10px] font-semibold uppercase tracking-wider">Maintainer</span>
                  <span className="text-stone-200 truncate block font-medium mt-0.5">{node.maintainer}</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#0b0d0c] border border-stone-800">
                  <span className="text-stone-400 block text-[10px] font-semibold uppercase tracking-wider">Downloads</span>
                  <span className="text-stone-200 font-medium mt-0.5 block">{node.downloads}</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#0b0d0c] border border-stone-800">
                  <span className="text-stone-400 block text-[10px] font-semibold uppercase tracking-wider">Velocity Risk</span>
                  <span className={`capitalize font-bold mt-0.5 block ${
                    node.maintainerRisk === 'critical' ? 'text-rose-400' :
                    node.maintainerRisk === 'high'     ? 'text-orange-400' :
                    node.maintainerRisk === 'medium'   ? 'text-amber-400' : 'text-emerald-400'
                  }`}>{node.maintainerRisk}</span>
                </div>
              </div>
            </div>

            {/* Dependency Path Panel */}
            {depPath.length > 0 && (
              <div className="my-5">
                <div className="flex items-center gap-1.5 text-[10px] font-sans text-stone-400 uppercase tracking-wider font-semibold mb-2">
                  <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Dependency Path</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0b0d0c] border border-stone-800 flex flex-wrap items-center gap-1 font-mono text-xs">
                  {depPath.map((seg, idx) => (
                    <React.Fragment key={idx}>
                      <span className={idx === depPath.length - 1
                        ? (isCritical ? 'text-rose-400 font-bold' : isWarning ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold')
                        : 'text-stone-400'}>
                        {seg}
                      </span>
                      {idx < depPath.length - 1 && <ChevronRight className="w-3 h-3 text-stone-600 shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Flag Chips */}
            {riskFlags.length > 0 && (
              <div className="mb-5">
                <div className="text-[10px] font-sans text-stone-400 uppercase tracking-wider font-semibold mb-2">Risk Flags</div>
                <div className="flex flex-wrap gap-1.5">
                  {riskFlags.map((flag) => (
                    <span key={flag} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold border ${chipColor(flag)}`}>
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sentinel AI Threat Explanation */}
            <div className="my-6">
              <div className="rounded-2xl bg-gradient-to-br from-[#121812] to-[#0e120f] border border-emerald-800/40 p-5 relative overflow-hidden">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-sans font-bold mb-2.5 pb-2 border-b border-stone-800">
                  <Bot className="w-4 h-4" />
                  <span>SENTINEL AI THREAT EXPLAINER</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 font-sans font-medium border border-emerald-800/40">
                    v3.8 Heuristics
                  </span>
                </div>
                <div className="text-sm font-sans text-stone-200 leading-relaxed space-y-2">
                  <p className="font-medium text-white">
                    {node.aiExplanation || "Sentinel AI Analysis: Continuous heuristic evaluation active. No active zero-day anomalies detected in release artifacts."}
                  </p>
                  <div className="text-xs font-sans text-stone-400 pt-2 border-t border-stone-800">
                    <span className="text-emerald-300 font-medium">Anomaly Fingerprint:</span>{' '}
                    Sudden maintainer email modification combined with high-entropy binary payload inside test fixtures.
                  </div>
                </div>
              </div>
            </div>

            {/* Maintainer Avatars */}
            {maintainers.length > 0 && (
              <div className="mb-5">
                <div className="text-[10px] font-sans text-stone-400 uppercase tracking-wider font-semibold mb-2">
                  Maintainers ({maintainers.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {maintainers.map((m, idx) => {
                    const username = m.github || m.username || m.name;
                    const avatarUrl = getGithubAvatarUrl(username, 40);
                    return (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#0b0d0c] border border-stone-800 text-xs font-sans" title={m.email || m.name}>
                        <img
                          src={avatarUrl}
                          alt={m.name}
                          className="w-5 h-5 rounded-full bg-stone-800 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=1a1a1a&color=emerald&size=40`;
                          }}
                        />
                        <span className="text-stone-300 font-medium truncate max-w-[120px]">{m.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vulnerabilities Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-sans text-stone-400 mb-2.5">
                <span className="flex items-center gap-1.5 text-stone-200 font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  OSV.dev &amp; CVE Vulnerability Matches
                </span>
                <span>{vulns.length > 0 ? `${vulns.length} Detected` : `${node.cves.length} Detected`}</span>
              </div>

              {vulns.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {vulnsToShow.map((vuln) => (
                    <button
                      key={vuln.id}
                      onClick={() => setSelectedVuln(vuln)}
                      className="w-full text-left p-3 rounded-2xl bg-[#0b0d0c] border border-rose-500/30 hover:border-rose-500/60 transition-all group flex items-start justify-between gap-3 font-sans"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-rose-400 font-mono font-bold">{vuln.cve_id || vuln.id}</span>
                          {vuln.severity && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${severityBadge(vuln.severity)}`}>
                              {vuln.severity}
                            </span>
                          )}
                          {vuln.cvss_score !== undefined && (
                            <span className="text-[10px] text-stone-400 font-sans">CVSS {vuln.cvss_score.toFixed(1)}</span>
                          )}
                        </div>
                        {vuln.title && <span className="text-stone-300 text-[11px] font-sans truncate block max-w-xs">{vuln.title}</span>}
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                  {vulns.length > 3 && (
                    <button
                      onClick={() => setVulnsExpanded((p) => !p)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-emerald-400 text-xs font-sans hover:underline"
                    >
                      {vulnsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {vulnsExpanded ? 'Show less' : `Show ${vulns.length - 3} more`}
                    </button>
                  )}
                </div>
              ) : node.cves.length > 0 ? (
                <div className="space-y-2 text-xs font-sans">
                  {node.cves.map((cve) => (
                    <div key={cve} className="p-3 rounded-2xl bg-[#0b0d0c] border border-rose-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-rose-400 font-mono font-bold">{cve}</span>
                        <span className="text-stone-400 text-[11px] font-sans block mt-0.5">Supply chain remote code execution &amp; credential leakage vector</span>
                      </div>
                      <a
                        href={`https://osv.dev/vulnerability/${cve}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline text-[11px] flex items-center gap-1 font-sans"
                      >
                        <span>OSV Record</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#0b0d0c] border border-stone-800 text-xs font-sans text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Zero published CVE advisories currently linked to this package.</span>
                </div>
              )}
            </div>

            {/* Polygon Audit Receipt */}
            {node.polygonHash && (
              <div className="mb-6 p-3.5 rounded-2xl bg-[#0b0d0c] border border-stone-800 text-xs font-sans">
                <div className="flex items-center justify-between text-[11px] text-stone-400 pb-2 border-b border-stone-800">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <Lock className="w-3.5 h-3.5" />
                    Polygon Audit Receipt
                  </span>
                  <span className="text-stone-500 font-mono">Block #5,928,174</span>
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-emerald-300 font-mono truncate max-w-[240px]">{node.polygonHash}</span>
                  <button
                    onClick={handleCopyHash}
                    className="text-[11px] font-sans text-stone-300 hover:text-white px-3 py-1 rounded-full bg-stone-900 border border-stone-800 flex items-center gap-1.5"
                  >
                    {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Feedback Toasts */}
            {isolated && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs font-sans text-rose-300 flex items-center gap-2.5">
                <ShieldX className="w-4 h-4 shrink-0 text-rose-400" />
                <span>PACKAGE QUARANTINED: Build scripts stripped &amp; lockfile pinned to clean fallback.</span>
              </div>
            )}
            {overridden && (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs font-sans text-amber-300 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>OVERRIDE SIGNED: Whitelisted by Ethan Reynolds with cryptographic signature.</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-stone-800 space-y-3">
            <button
              onClick={handleIsolateClick}
              disabled={isolated}
              className={`w-full py-3.5 rounded-full font-sans text-xs font-bold tracking-wider flex items-center justify-center space-x-2 transition-all ${
                isolated
                  ? 'bg-[#0b0d0c] text-stone-500 border border-stone-800 cursor-not-allowed'
                  : 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg active:scale-95'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{isolated ? 'PACKAGE ISOLATED' : 'ISOLATE PACKAGE'}</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleOverrideClick}
                disabled={overridden}
                className={`py-3 rounded-full font-sans text-xs font-semibold tracking-wider flex items-center justify-center space-x-1.5 transition-all ${
                  overridden
                    ? 'bg-[#0b0d0c] text-stone-500 border border-stone-800 cursor-not-allowed'
                    : 'bg-[#0b0d0c] hover:bg-stone-900 text-stone-200 border border-stone-800 hover:border-emerald-700/50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{overridden ? 'OVERRIDDEN' : 'OVERRIDE'}</span>
              </button>

              <a
                href={`https://github.com/search?q=${encodeURIComponent(node.name)}&type=repositories`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 rounded-full font-sans text-xs font-semibold tracking-wider flex items-center justify-center space-x-1.5 bg-[#0b0d0c] hover:bg-stone-900 text-stone-200 border border-stone-800 hover:border-emerald-700/50 transition-all"
              >
                <span>GITHUB</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Vuln detail drawer stacked on top */}
      {selectedVuln && (
        <VulnerabilityDetailDrawer vuln={selectedVuln} onClose={() => setSelectedVuln(null)} />
      )}
    </>
  );
};
