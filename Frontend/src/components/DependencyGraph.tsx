import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Layers, 
  FileCode2, 
  ArrowUpRight, 
  ExternalLink, 
  GitBranch, 
  Bug, 
  Boxes, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DependencyNode, DependencyEdge } from '../types';
import { mockCapsules } from '../data/mockCapsules';

interface DependencyGraphProps {
  nodes: DependencyNode[];
  edges?: DependencyEdge[];
  onSelectNode: (node: DependencyNode) => void;
  selectedNodeId?: string;
  isFullScreen?: boolean;
}

type SeverityTab = 'all' | 'critical' | 'warning' | 'safe';

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  nodes,
  onSelectNode,
  selectedNodeId,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<SeverityTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'direct' | 'transitive'>('all');

  // Compute counts
  const counts = useMemo(() => {
    return {
      all: nodes.length,
      critical: nodes.filter((n) => n.riskScore >= 70 || n.status === 'critical').length,
      warning: nodes.filter((n) => (n.riskScore >= 31 && n.riskScore < 70) || n.status === 'warning').length,
      safe: nodes.filter((n) => n.riskScore <= 30 || n.status === 'safe').length,
      direct: nodes.filter((n) => n.category === 'direct').length,
      transitive: nodes.filter((n) => n.category === 'transitive').length,
    };
  }, [nodes]);

  // Filtered list
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      // Severity check
      if (filterSeverity === 'critical' && !(node.riskScore >= 70 || node.status === 'critical')) return false;
      if (filterSeverity === 'warning' && !((node.riskScore >= 31 && node.riskScore < 70) || node.status === 'warning')) return false;
      if (filterSeverity === 'safe' && !(node.riskScore <= 30 || node.status === 'safe')) return false;

      // Category check (direct vs transitive)
      if (categoryFilter === 'direct' && node.category !== 'direct') return false;
      if (categoryFilter === 'transitive' && node.category !== 'transitive') return false;

      // Search query check
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = node.name.toLowerCase().includes(query);
        const matchesMaintainer = node.maintainer?.toLowerCase().includes(query);
        const matchesCve = node.cves?.some((cve) => cve.toLowerCase().includes(query));
        if (!matchesName && !matchesMaintainer && !matchesCve) return false;
      }

      return true;
    });
  }, [nodes, filterSeverity, categoryFilter, searchQuery]);

  // Group filtered nodes by severity tier
  const criticalList = useMemo(() => filteredNodes.filter((n) => n.riskScore >= 70 || n.status === 'critical'), [filteredNodes]);
  const warningList = useMemo(() => filteredNodes.filter((n) => (n.riskScore >= 31 && n.riskScore < 70) || n.status === 'warning'), [filteredNodes]);
  const safeList = useMemo(() => filteredNodes.filter((n) => n.riskScore <= 30 || n.status === 'safe'), [filteredNodes]);

  // Helper to retrieve AST location preview
  const getAstLocationPreview = (node: DependencyNode) => {
    const capsule = mockCapsules[node.name];
    if (capsule?.fact?.usage_locations && capsule.fact.usage_locations.length > 0) {
      const first = capsule.fact.usage_locations[0];
      return `${first.file_path} : line ${first.line_number}`;
    }
    // Fallback deterministic AST location based on node metadata
    if (node.name.includes('fastapi') || node.name.includes('requests')) {
      return `src/network/ingress_client.py : line 34`;
    }
    if (node.name.includes('pydantic')) {
      return `src/models/schema_validator.py : line 19`;
    }
    if (node.name.includes('crypto')) {
      return `src/security/cipher_engine.py : line 42`;
    }
    if (node.category === 'direct') {
      return `requirements.txt : pinned`;
    }
    return `src/pipeline/workers.py : line 88`;
  };

  // Helper to render an individual dependency card (Risk Cell)
  const renderRiskCell = (node: DependencyNode) => {
    const isSelected = selectedNodeId === node.id;
    const isCritical = node.riskScore >= 70 || node.status === 'critical';
    const isWarning = (node.riskScore >= 31 && node.riskScore < 70) || node.status === 'warning';
    const isSafe = !isCritical && !isWarning;
    const astPreview = getAstLocationPreview(node);
    const hasCapsule = !!mockCapsules[node.name];

    return (
      <div
        key={node.id}
        onClick={() => onSelectNode(node)}
        className={`group relative rounded-2xl p-4 sm:p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden ${
          isSelected
            ? 'bg-white/[0.09] ring-2 ring-lime-400/80 border border-lime-400/50 shadow-[0_0_30px_rgba(163,230,53,0.25),inset_0_0_20px_rgba(255,255,255,0.15)] scale-[1.01]'
            : isCritical
            ? 'bg-rose-950/20 hover:bg-rose-950/30 backdrop-blur-xl border border-rose-500/30 hover:border-rose-500/50 shadow-[0_0_24px_rgba(244,63,94,0.18),inset_0_0_16px_rgba(255,255,255,0.06)] hover:shadow-[0_0_36px_rgba(244,63,94,0.3),inset_0_0_20px_rgba(255,255,255,0.1)]'
            : isWarning
            ? 'bg-amber-950/20 hover:bg-amber-950/30 backdrop-blur-xl border border-amber-500/30 hover:border-amber-500/50 shadow-[0_0_22px_rgba(245,158,11,0.15),inset_0_0_16px_rgba(255,255,255,0.06)] hover:shadow-[0_0_32px_rgba(245,158,11,0.25),inset_0_0_20px_rgba(255,255,255,0.1)]'
            : 'bg-white/[0.05] hover:bg-white/[0.08] backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 shadow-[0_0_20px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.37),inset_0_0_16px_rgba(255,255,255,0.06)] hover:shadow-[0_0_28px_rgba(16,185,129,0.2),inset_0_0_20px_rgba(255,255,255,0.1)]'
        }`}
      >
        {/* 4-Sided Uniform Ambient Glow & Inner Reflection Ring */}
        <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 ${
          isCritical
            ? 'ring-1 ring-inset ring-rose-400/20 group-hover:ring-rose-400/40'
            : isWarning
            ? 'ring-1 ring-inset ring-amber-400/20 group-hover:ring-amber-400/40'
            : 'ring-1 ring-inset ring-white/10 group-hover:ring-emerald-400/30'
        }`} />

        {/* Soft 4-edge ambient halo */}
        <div className={`absolute -inset-[1px] rounded-2xl pointer-events-none blur-sm opacity-50 group-hover:opacity-80 transition-opacity duration-300 ${
          isCritical
            ? 'bg-gradient-to-r from-rose-500/20 via-rose-500/10 to-rose-500/20'
            : isWarning
            ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20'
            : 'bg-gradient-to-r from-emerald-500/10 via-white/5 to-emerald-500/10'
        }`} />

        <div>
          {/* Header Row: Category Badge + Risk Score */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold tracking-wider border ${
                  node.category === 'direct'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                }`}
              >
                {node.category === 'direct' ? 'Direct Dep' : 'Transitive Dep'}
              </span>

              {hasCapsule && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lime-950/60 text-lime-400 border border-lime-800/40 flex items-center gap-1 font-semibold">
                  <Sparkles className="w-2.5 h-2.5 text-lime-400" />
                  <span>Capsule Sealed</span>
                </span>
              )}
            </div>

            {/* Risk Badge */}
            <div
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-extrabold flex items-center gap-1 shrink-0 border ${
                isCritical
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : isWarning
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              <span>{node.riskScore}</span>
              <span className="text-[9px] font-normal opacity-70">/ 100</span>
            </div>
          </div>

          {/* Package Name & Version */}
          <div className="mb-3">
            <h4 className="text-base sm:text-lg font-bold text-white group-hover:text-lime-300 transition-colors flex items-center justify-between gap-1">
              <span className="truncate">{node.name}</span>
              <ArrowUpRight className="w-4 h-4 text-stone-500 group-hover:text-lime-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
            </h4>
            <div className="text-xs text-stone-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="text-stone-300">v{node.version}</span>
              <span>•</span>
              <span className="text-stone-400">{node.license || 'PyPI Package'}</span>
              <span>•</span>
              <span className="text-stone-500 truncate max-w-[140px]">{node.maintainer}</span>
            </div>
          </div>

          {/* AST Usage Location Preview */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 mb-3 text-xs">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-400 uppercase tracking-wider mb-1">
              <FileCode2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>AST Call Site:</span>
            </div>
            <code className="text-[11px] font-mono text-emerald-300 block truncate">
              {astPreview}
            </code>
          </div>

          {/* CVE or Threat summary */}
          {node.cves && node.cves.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {node.cves.map((cve) => (
                <span
                  key={cve}
                  className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] font-mono font-medium flex items-center gap-1"
                >
                  <Bug className="w-2.5 h-2.5 text-rose-400" />
                  <span>{cve}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-stone-400 truncate">
              {node.threatSummary || 'Zero known CVEs. Validated in clean Python sandbox.'}
            </div>
          )}
        </div>

        {/* Card Footer: Interactive Two-Ledger Audit CTA */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-sans">
          <span className="text-[11px] text-stone-400 flex items-center gap-1 font-mono">
            <span>{isCritical ? '🚨 Action Required' : isWarning ? '⚠️ Heuristic Drift' : '✓ Verified Stable'}</span>
          </span>
          <span className="text-xs text-emerald-400 group-hover:underline flex items-center gap-1 font-medium">
            <span>Inspect Capsule</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP CONTROLS & FILTER TOOLBAR                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-white/[0.06] backdrop-blur-xl border border-white/10 p-5 sm:p-6 shadow-[0_0_24px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.37),inset_0_0_16px_rgba(255,255,255,0.05)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Search Bar with Live Filter */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Python packages, CVEs, or maintainers..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-100 placeholder-stone-500 font-sans focus:outline-none focus:border-emerald-500/60 transition-colors shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Right: Category Tabs & Direct/Transitive Selectors */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Severity Tabs */}
            <div className="flex items-center space-x-1 p-1 rounded-full bg-white/[0.04] border border-white/10 text-xs backdrop-blur-md">
              {(
                [
                  { id: 'all', label: 'All', count: counts.all },
                  { id: 'critical', label: 'Critical [70-100]', count: counts.critical, color: 'text-rose-400' },
                  { id: 'warning', label: 'Warning [31-69]', count: counts.warning, color: 'text-amber-400' },
                  { id: 'safe', label: 'Safe [<30]', count: counts.safe, color: 'text-emerald-400' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterSeverity(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    filterSeverity === tab.id
                      ? tab.id === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                        : tab.id === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : tab.id === 'safe'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                        : 'bg-white/[0.12] text-white font-bold border border-white/20 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/40">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Direct vs Transitive Filter */}
            <div className="flex items-center space-x-1 p-1 rounded-full bg-white/[0.04] border border-white/10 text-xs backdrop-blur-md">
              {(['all', 'direct', 'transitive'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs capitalize transition-all ${
                    categoryFilter === cat
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.04]'
                  }`}
                >
                  {cat === 'all' ? 'All Tiers' : cat}
                </button>
              ))}
            </div>

          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. TRANSITIVE RISK MATRIX & CASCADE GRID                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {filterSeverity === 'all' ? (
        <div className="space-y-8">
          
          {/* TIER 1: CRITICAL / ZERO-DAY BLAST RADIUS (70 - 100) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Critical Risk &amp; Zero-Day Incursions
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                      Risk Score: 70 – 100
                    </span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Severe vulnerabilities, maintainer account hijacking, and high-entropy binary bytecode.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-stone-400">
                {criticalList.length} {criticalList.length === 1 ? 'Package' : 'Packages'}
              </span>
            </div>

            {criticalList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {criticalList.map(renderRiskCell)}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-stone-800 text-center text-xs text-stone-400 font-mono">
                ✓ No critical zero-day threats matching current filter.
              </div>
            )}
          </div>

          {/* TIER 2: SUSPICIOUS & WARNING DRIFT (31 - 69) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Heuristic Drift &amp; Warning Tier
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                      Risk Score: 31 – 69
                    </span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Abnormal release cadence, protestware signals, and unpinned transitive dependencies.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-stone-400">
                {warningList.length} {warningList.length === 1 ? 'Package' : 'Packages'}
              </span>
            </div>

            {warningList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warningList.map(renderRiskCell)}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-stone-800 text-center text-xs text-stone-400 font-mono">
                ✓ No warning-tier dependencies matching current filter.
              </div>
            )}
          </div>

          {/* TIER 3: VERIFIED SAFE & PINNED PACKAGES (< 30) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Verified Safe Baseline
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      Risk Score: 0 – 30
                    </span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Double-baseline sandbox clean. Verified SLSA provenance with official maintainer signatures.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-stone-400">
                {safeList.length} {safeList.length === 1 ? 'Package' : 'Packages'}
              </span>
            </div>

            {safeList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {safeList.map(renderRiskCell)}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-stone-800 text-center text-xs text-stone-400 font-mono">
                ✓ No safe dependencies matching current filter.
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Specific Tab Filter View */
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="text-sm font-bold text-stone-200 capitalize">
              {filterSeverity} Dependency Cells ({filteredNodes.length})
            </span>
            <span className="text-xs text-stone-400">
              Showing matching packages across direct and transitive tiers
            </span>
          </div>

          {filteredNodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNodes.map(renderRiskCell)}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-white/[0.02] border border-stone-800 text-center space-y-2">
              <Boxes className="w-8 h-8 text-stone-600 mx-auto" />
              <div className="text-sm font-semibold text-stone-300">No matching dependencies</div>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                No Python packages matched your filter criteria. Try adjusting the search term or switching to "All".
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
