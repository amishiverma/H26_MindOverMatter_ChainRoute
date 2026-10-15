import React from 'react';
import { AnalyticsChart } from './AnalyticsChart';
import { ThreatSurfaceMapWidget } from './ThreatSurfaceMapWidget';
import { PromoCard } from './PromoCard';
import { mockActivityLogs } from '../data/mockData';
import { 
  Terminal, 
  CheckCircle2, 
  FlaskConical, 
  ArrowUpRight, 
  Cpu, 
  GitBranch, 
  Binary, 
  Activity,
  Layers
} from 'lucide-react';

interface DashboardOverviewProps {
  onScanRepo: () => void;
  onNavigateToSandbox?: () => void;
  onCtaClick: () => void;
  onSelectItem: (name: string) => void;
  currentRepo?: string;
  scanTxHash?: string | null;
  stats?: {
    criticalCount: number;
    warningCount: number;
    safeCount: number;
    totalPackages: number;
  };
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onScanRepo,
  onNavigateToSandbox,
  onCtaClick,
  onSelectItem,
  currentRepo = 'psf/requests',
  stats,
}) => {
  const criticalCount = stats?.criticalCount ?? 0;
  const warningCount = stats?.warningCount ?? 0;
  const safeCount = stats?.safeCount ?? 0;
  const totalPackages = stats?.totalPackages ?? 0;

  return (
    <div className="space-y-6 sm:space-y-7 max-w-[1600px] mx-auto pb-6 font-sans">
      
      {/* 1. TOP ROW: Threat Surface & Progression Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-stretch">
        {/* Left: Security Index & Anomaly Curve (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 min-h-[390px]">
          <AnalyticsChart />
        </div>

        {/* Right: AST Call-Site & Dependency Graph Topology Widget (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 min-h-[390px]">
          <ThreatSurfaceMapWidget
            onSelectNode={onSelectItem}
          />
        </div>
      </div>

      {/* 2. MIDDLE ROW: Python 3.12/3.13 Telemetry & Verifiable Two-Ledger Bento (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 items-stretch">
        
        {/* Card 1: Python Runtime & Isolated Sandbox Status */}
        <div className={`rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group transition-all duration-300 backdrop-blur-xl ${
          criticalCount > 0
            ? 'bg-rose-950/25 border border-rose-500/40 text-rose-300 hover:border-rose-500/60 shadow-[0_0_28px_rgba(244,63,94,0.18),0_12px_36px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.08)]'
            : 'bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 hover:border-emerald-500/50 shadow-[0_0_28px_rgba(16,185,129,0.15),0_12px_36px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.08)]'
        }`}>
          {/* 4-Sided Uniform Halo Ring */}
          <div className={`absolute inset-0 rounded-3xl pointer-events-none ring-1 ring-inset ${
            criticalCount > 0 ? 'ring-rose-400/20 group-hover:ring-rose-400/40' : 'ring-emerald-400/20 group-hover:ring-emerald-400/40'
          }`} />

          {/* Ambient Corner Glow */}
          <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-colors ${
            criticalCount > 0 ? 'bg-rose-500/10 group-hover:bg-rose-500/20' : 'bg-emerald-500/10 group-hover:bg-emerald-500/20'
          }`} />
          
          <div>
            <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
              <span className={`flex items-center gap-1.5 font-semibold tracking-wide uppercase text-[11px] ${
                criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                <Cpu className="w-4 h-4" />
                Python 3.12 / 3.13 Runtime
              </span>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-medium border ${
                criticalCount > 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {criticalCount > 0 ? 'THREAT_INTERCEPTED' : 'VENV_ISOLATED'}
              </span>
            </div>

            <h4 className="text-xl font-bold text-stone-100 mt-2">
              Clean Virtualenv Testbed
            </h4>
            <p className="text-xs text-stone-300/80 mt-1 leading-relaxed">
              Every package audit runs inside an ephemerally spawned, unprivileged Python 3.12 container. Bytecode anomalies and AST call sites are pinned with deterministic repeatability.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 shadow-sm">
                <div className="text-[10px] text-stone-400 font-mono uppercase">Direct Packages</div>
                <div className="text-xl font-extrabold text-stone-100 mt-0.5">{totalPackages || 24}</div>
                <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Pinned in requirements.txt</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 shadow-sm">
                <div className="text-[10px] text-stone-400 font-mono uppercase">PyPI Status</div>
                <div className={`text-xl font-extrabold mt-0.5 ${criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {criticalCount > 0 ? 'Alert Active' : 'Verified'}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5 font-mono">Index: pypi.org/simple</div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-stone-300 font-mono text-[11px] flex items-center gap-1.5">
              <Terminal className={`w-3.5 h-3.5 ${criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
              <span>Target: {currentRepo}</span>
            </span>
            <button
              onClick={onScanRepo}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                criticalCount > 0
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-500/40'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-500/40'
              }`}
            >
              Re-scan Repo
            </button>
          </div>
        </div>

        {/* Card 2: Two-Ledger AST & Double-Pass Pytest Verification */}
        <div className="rounded-3xl bg-emerald-950/20 backdrop-blur-xl border border-emerald-500/30 text-emerald-400 p-6 flex flex-col justify-between shadow-[0_0_28px_rgba(16,185,129,0.15),0_12px_36px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.08)] relative overflow-hidden group hover:border-emerald-400/50 transition-all duration-300">
          {/* 4-Sided Uniform Halo Ring */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none ring-1 ring-inset ring-emerald-400/20 group-hover:ring-emerald-400/40" />

          <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-colors" />

          <div>
            <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold tracking-wide uppercase text-[11px]">
                <FlaskConical className="w-4 h-4 text-emerald-400" />
                Two-Ledger Verification
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                FACTS ≠ INFERENCES
              </span>
            </div>

            <h4 className="text-xl font-bold text-stone-100 mt-2">
              AST Double-Pass Pytest
            </h4>
            <p className="text-xs text-stone-300/80 mt-1 leading-relaxed">
              Verifiable facts (exact file lines, AST imports, and executed <code className="text-stone-200 font-mono bg-black/40 px-1 py-0.5 rounded">pytest</code> outputs) are strictly partitioned from Gemma 4 reasoning claims.
            </p>

            <div className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/10 text-xs">
                <span className="flex items-center gap-2 text-stone-200">
                  <Binary className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AST Code Sites Mapped</span>
                </span>
                <span className="font-mono text-emerald-300 font-semibold">100% Verified</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/10 text-xs">
                <span className="flex items-center gap-2 text-stone-200">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pre &amp; Post Pytest Runs</span>
                </span>
                <span className="font-mono text-emerald-300 font-semibold">42 / 42 Passed</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-stone-300 text-[11px]">
              Capsule Exit Guarantee
            </span>
            {onNavigateToSandbox && (
              <button
                onClick={onNavigateToSandbox}
                className="flex items-center gap-1 text-emerald-400 hover:text-white font-medium transition-colors"
              >
                <span>Inspect Capsules</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Recent Python Package Threats & Telemetry Stream */}
        <div className={`rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group transition-all duration-300 backdrop-blur-xl ${
          criticalCount > 0
            ? 'bg-rose-950/25 border border-rose-500/40 text-rose-300 hover:border-rose-400/60 shadow-[0_0_28px_rgba(244,63,94,0.18),0_12px_36px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.08)]'
            : 'bg-white/[0.06] border border-white/10 text-stone-100 hover:border-white/20 shadow-[0_0_24px_rgba(255,255,255,0.05),0_12px_36px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.08)]'
        }`}>
          {/* 4-Sided Uniform Halo Ring */}
          <div className={`absolute inset-0 rounded-3xl pointer-events-none ring-1 ring-inset ${
            criticalCount > 0 ? 'ring-rose-400/20 group-hover:ring-rose-400/40' : 'ring-white/10 group-hover:ring-emerald-400/30'
          }`} />

          <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-colors ${
            criticalCount > 0 ? 'bg-rose-500/10 group-hover:bg-rose-500/20' : 'bg-amber-500/10 group-hover:bg-amber-500/20'
          }`} />

          <div>
            <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
              <span className={`flex items-center gap-1.5 font-semibold tracking-wide uppercase text-[11px] ${
                criticalCount > 0 ? 'text-rose-400' : 'text-amber-400'
              }`}>
                <Activity className="w-4 h-4" />
                Live Telemetry
              </span>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                criticalCount > 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {criticalCount > 0 ? 'CRITICAL_ALERT' : 'INTERCEPTOR ACTIVE'}
              </span>
            </div>

            <h4 className="text-xl font-bold text-stone-100 mt-2">
              PyPI Threat Stream
            </h4>
            <p className="text-xs text-stone-300/80 mt-1 leading-relaxed">
              Monitored Python packages flagged for abnormal maintainer churn, dormant commit bursts, or malicious setup.py execution hooks.
            </p>

            {/* Quick list of top 3 recent audits */}
            <div className="mt-4 space-y-2">
              {mockActivityLogs.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item.repo)}
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between text-xs backdrop-blur-xl ${
                    item.severity === 'critical'
                      ? 'bg-rose-950/30 border-rose-500/40 hover:border-rose-500/60'
                      : 'bg-white/[0.06] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-stone-100 truncate">{item.repo}</div>
                    <div className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
                      <GitBranch className="w-2.5 h-2.5 text-stone-400" />
                      <span>{item.branch}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                      item.severity === 'critical'
                        ? 'bg-rose-500/25 text-rose-200 border border-rose-500/40 font-bold'
                        : item.severity === 'medium'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    Risk: {item.riskScore}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-stone-300">
            <span className={`text-[11px] font-medium ${criticalCount > 0 ? 'text-rose-400 font-bold' : 'text-stone-400'}`}>
              {criticalCount} Critical • {warningCount} Warnings
            </span>
            <span className="text-stone-300 font-medium">Auto-Gated</span>
          </div>
        </div>

      </div>

      {/* 3. BOTTOM ROW: Sentinel AI Shield Banner (Full Width) */}
      <div className="w-full">
        <PromoCard onCtaClick={onCtaClick} />
      </div>

    </div>
  );
};