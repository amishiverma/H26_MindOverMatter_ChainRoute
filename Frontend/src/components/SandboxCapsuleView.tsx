import React, { useState } from 'react';
import {
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  FileCode2,
  GitBranch,
  ArrowRight,
  ExternalLink,
  Download,
  Copy,
  Check,
  Play,
  RotateCcw,
  Sparkles,
  Lock,
  Cpu,
  Layers,
  Bug,
  HelpCircle,
  Clock,
  ShieldCheck,
  XCircle,
  FileCheck2
} from 'lucide-react';
import { DependencyExitCapsule } from '../types';
import { mockCapsules } from '../data/mockCapsules';

interface SandboxCapsuleViewProps {
  currentRepo?: string;
  onNavigateToBlockchain?: () => void;
}

export const SandboxCapsuleView: React.FC<SandboxCapsuleViewProps> = ({
  currentRepo = 'facebook/react',
  onNavigateToBlockchain,
}) => {
  const [selectedDep, setSelectedDep] = useState<string>('event-stream-patch');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simStep, setSimStep] = useState<number>(4); // 4 = complete
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [copiedCapsule, setCopiedCapsule] = useState<boolean>(false);

  const capsule: DependencyExitCapsule =
    mockCapsules[selectedDep] || mockCapsules['event-stream-patch'];

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimStep(1);

    setTimeout(() => setSimStep(2), 800);
    setTimeout(() => setSimStep(3), 1600);
    setTimeout(() => {
      setSimStep(4);
      setIsSimulating(false);
    }, 2400);
  };

  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(capsule, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `${capsule.dependency}-exit-capsule.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyCapsuleId = () => {
    navigator.clipboard.writeText(capsule.capsule_id);
    setCopiedCapsule(true);
    setTimeout(() => setCopiedCapsule(false), 2000);
  };

  const handleCopyTxHash = () => {
    if (capsule.chain_tx_hash) {
      navigator.clipboard.writeText(capsule.chain_tx_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const isApproved = capsule.merge_decision === 'APPROVED';
  const isFlagged = capsule.merge_decision === 'FLAGGED';
  const isRejected = capsule.merge_decision === 'REJECTED';

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-16 font-sans">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. CONTROL ROOM BANNER & SIMULATION TRIGGER                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl p-6 sm:p-8 bg-[#0e100f]/90 border border-stone-800/80 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">
              <FlaskConical className="w-4 h-4 text-emerald-400" />
              <span>Two-Ledger Sandbox &amp; Exit Capsule Control Room</span>
              <span className="text-stone-600">•</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[10px]">
                Deterministic Proof Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              Dependency Exit Capsule Generator
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-1.5 max-w-2xl leading-relaxed">
              Strict separation between <strong className="text-emerald-400">Verifiable Sandbox Facts</strong> (AST line numbers, double-baseline execution outcomes) and <strong className="text-amber-400">Gemma 4 AI Claims</strong> (risk reasoning &amp; proposed replacements).
            </p>
          </div>

          {/* Quick Select & Run CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#0b0d0c] border border-stone-800">
              <span className="text-[11px] font-semibold text-stone-400 px-2 uppercase tracking-wider">
                Target:
              </span>
              {(['event-stream-patch', 'liblzma-native-async', 'ansi-colors-turbo'] as const).map((dep) => (
                <button
                  key={dep}
                  onClick={() => setSelectedDep(dep)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                    selectedDep === dep
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.03]'
                  }`}
                >
                  {dep.split('-')[0]}...
                </button>
              ))}
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-sans text-xs font-bold tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSimulating ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-white" />
                  <span>Simulating Sandbox...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white text-white" />
                  <span>Run Sandbox Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4-Stage Simulation Stepper */}
        <div className="mt-6 pt-6 border-t border-stone-800/80 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            { step: 1, title: '1. Sandbox Baseline', desc: 'Isolating 3.12 test runner' },
            { step: 2, title: '2. AST Census', desc: 'Mining call sites & lines' },
            { step: 3, title: '3. Gemma 4 Claims', desc: 'Synthesizing replacement' },
            { step: 4, title: '4. Capsule Sealed', desc: 'Two Ledgers combined' },
          ].map((item) => (
            <div
              key={item.step}
              className={`p-3 rounded-2xl border transition-all ${
                simStep >= item.step
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#0b0d0c]/60 border-stone-800/60 text-stone-500'
              }`}
            >
              <div className="flex items-center gap-2">
                {simStep >= item.step ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-stone-700 flex items-center justify-center text-[9px]">
                    {item.step}
                  </div>
                )}
                <span className="font-semibold text-stone-200">{item.title}</span>
              </div>
              <span className="text-[10px] text-stone-400 block mt-1">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. THE TWO LEDGERS VISUAL LEGEND & TRUTH RULES                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* FACT LEDGER LEGEND */}
        <div className="rounded-2xl p-4 bg-[#0a120e] border border-emerald-500/60 shadow-lg shadow-emerald-950/20 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                FACT LEDGER
              </span>
              <span className="text-xs font-bold text-stone-200">Verified Ground Truth</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1 leading-snug">
              Solid emerald borders denote <strong className="text-emerald-400">immutable, deterministic facts</strong> extracted from the target repository: exact AST line numbers, resolved versions, and double-baseline sandbox test runner exit codes.
            </p>
          </div>
        </div>

        {/* CLAIM LEDGER LEGEND */}
        <div className="rounded-2xl p-4 bg-[#141009] border-2 border-dashed border-amber-400/60 shadow-lg shadow-amber-950/20 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                CLAIM LEDGER
              </span>
              <span className="text-xs font-bold text-stone-200">Unverified Model Output — Gemma 4</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1 leading-snug">
              Dashed amber borders denote <strong className="text-amber-400">AI-generated hypotheses</strong>: risk narratives, proposed replacements, migration steps, and compatibility evaluations. Must be human-reviewed.
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. CAPSULE TOP METADATA & MERGE VERDICT                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl p-6 bg-[#0e100f] border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
              Capsule Identifier
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-stone-200 font-bold text-sm">
                {capsule.capsule_id}
              </span>
              <button
                onClick={handleCopyCapsuleId}
                className="p-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                title="Copy Capsule ID"
              >
                {copiedCapsule ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="h-8 w-px bg-stone-800 hidden sm:block" />

          <div>
            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
              Sealed Timestamp
            </span>
            <span className="font-mono text-stone-300 text-xs">
              {new Date(capsule.sealed_at).toUTCString()}
            </span>
          </div>

          <div className="h-8 w-px bg-stone-800 hidden sm:block" />

          <div>
            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
              Merge Decision
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase border mt-0.5 ${
                isApproved
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : isFlagged
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              {isApproved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {isFlagged && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
              {isRejected && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
              <span>{capsule.merge_decision}</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportJSON}
            className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 text-xs font-semibold flex items-center gap-2 transition-all hover:border-stone-700"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Capsule JSON</span>
          </button>

          {capsule.chain_tx_hash && (
            <button
              onClick={onNavigateToBlockchain}
              className="px-4 py-2.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-300 border border-emerald-800/50 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Polygon Proof</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. THE 9-HEADER DEPENDENCY EXIT CAPSULE                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-xl font-display font-bold text-white">
              The Dependency Exit Capsule
            </h2>
          </div>
          <span className="text-xs font-mono text-stone-400">
            Target Dependency: <strong className="text-emerald-400 font-bold">{capsule.dependency}</strong>
          </span>
        </div>

        {/* ── HEADER 1: DEPENDENCY DETAILS (FACT LEDGER) ───────────────────── */}
        <div className="rounded-2xl p-6 bg-[#0a120e] border border-emerald-500/60 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Header 1
              </span>
              <span className="text-stone-500">•</span>
              <span className="text-sm font-bold text-white">Dependency Details</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Verified Fact</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
            <div className="p-3.5 rounded-xl bg-[#0e1612] border border-emerald-900/30">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Package Name</span>
              <span className="font-mono text-emerald-300 font-bold text-sm block mt-0.5">{capsule.fact.snapshot.package}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0e1612] border border-emerald-900/30">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Resolved Version</span>
              <span className="font-mono text-stone-200 font-bold text-sm block mt-0.5">{capsule.fact.snapshot.resolved_version || capsule.fact.snapshot.requested_version}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0e1612] border border-emerald-900/30">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Ecosystem &amp; Scope</span>
              <span className="text-stone-200 font-medium block mt-0.5 capitalize">{capsule.fact.snapshot.ecosystem} • {capsule.fact.snapshot.is_direct ? 'Direct' : 'Transitive'}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0e1612] border border-emerald-900/30">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Runtime Sandbox</span>
              <span className="font-mono text-emerald-300 font-medium block mt-0.5">Python {capsule.fact.python_version}</span>
            </div>
          </div>

          {/* Fact CVEs */}
          {capsule.fact.snapshot.vulnerabilities.length > 0 && (
            <div className="mt-4 pt-3 border-t border-emerald-900/30">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block mb-2">
                Authoritative OSV &amp; CVE Records ({capsule.fact.snapshot.vulnerabilities.length})
              </span>
              <div className="space-y-2">
                {capsule.fact.snapshot.vulnerabilities.map((vuln) => (
                  <div key={vuln.id} className="p-3 rounded-xl bg-[#0e1612] border border-rose-500/30 flex items-center justify-between text-xs font-sans">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rose-400">{vuln.id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                          {vuln.severity}
                        </span>
                        {vuln.cvss_score && (
                          <span className="text-stone-400 text-[11px]">CVSS {vuln.cvss_score}</span>
                        )}
                      </div>
                      {vuln.summary && <p className="text-stone-300 text-[11px] mt-1">{vuln.summary}</p>}
                    </div>
                    {vuln.fixed_version && (
                      <span className="text-[11px] text-emerald-400 font-mono">Fixed in {vuln.fixed_version}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── HEADER 2: RISK INDICATORS (CLAIM LEDGER) ──────────────────────── */}
        <div className="rounded-2xl p-6 bg-[#141009] border-2 border-dashed border-amber-400/60 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-amber-900/40 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Header 2
              </span>
              <span className="text-stone-500">•</span>
              <span className="text-sm font-bold text-white">Risk Indicators</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Unverified Model Output — Gemma 4</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
            <div className="p-3.5 rounded-xl bg-[#1a140a] border border-amber-900/30">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Gemma Risk Score</span>
              <span className="text-2xl font-mono font-extrabold text-amber-400 block mt-0.5">
                {capsule.claim.risk_reasoning.risk_score} <span className="text-xs font-normal text-stone-500">/ 10</span>
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#1a140a] border border-amber-900/30">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Abandonment Risk</span>
              <span className="text-sm font-bold text-stone-200 block mt-1">{capsule.claim.risk_reasoning.abandonment_risk}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#1a140a] border border-amber-900/30">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Supply Chain Risk</span>
              <span className="text-sm font-bold text-rose-400 block mt-1">{capsule.claim.risk_reasoning.supply_chain_risk}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#1a140a] border border-amber-900/30">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Vulnerability Risk</span>
              <span className="text-sm font-bold text-orange-400 block mt-1">{capsule.claim.risk_reasoning.vulnerability_risk}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#1a140a] border border-amber-900/30 text-xs">
            <span className="text-amber-400 font-semibold block mb-1">Gemma 4 Risk Synthesis Narrative:</span>
            <p className="text-stone-300 leading-relaxed font-sans">
              {capsule.claim.risk_reasoning.reasoning_summary}
            </p>
            {capsule.claim.risk_reasoning.evidence_cited.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-amber-900/30 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Evidence Cited:</span>
                {capsule.claim.risk_reasoning.evidence_cited.map((ev, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-stone-900 text-stone-300 font-mono text-[10px] border border-stone-800">
                    {ev}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── HEADER 3: USAGE LOCATIONS (FACT LEDGER) ───────────────────────── */}
        <div className="rounded-2xl p-6 bg-[#0a120e] border border-emerald-500/60 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Header 3
              </span>
              <span className="text-stone-500">•</span>
              <span className="text-sm font-bold text-white">Usage Locations (Verified AST Call Sites)</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Verified Fact</span>
            </span>
          </div>

          <div className="space-y-2.5">
            {capsule.fact.usage_locations.map((loc, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#0e1612] border border-emerald-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start sm:items-center gap-2.5">
                  <FileCode2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-300 font-bold">{loc.file_path}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-mono text-[10px] border border-emerald-800">
                        Line {loc.line_number}
                      </span>
                    </div>
                    <code className="text-[11px] text-stone-300 font-mono block mt-1 bg-black/40 px-2 py-1 rounded-md border border-white/5">
                      {loc.statement}
                    </code>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800 shrink-0">
                  {loc.kind}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── HEADER 4: PROPOSED REPLACEMENT (CLAIM LEDGER) ─────────────────── */}
        <div className="rounded-2xl p-6 bg-[#141009] border-2 border-dashed border-amber-400/60 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-amber-900/40 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Header 4
              </span>
              <span className="text-stone-500">•</span>
              <span className="text-sm font-bold text-white">Proposed Replacement</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Unverified Model Output — Gemma 4</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capsule.claim.proposed_replacements.map((rep, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#1a140a] border border-amber-900/30 flex flex-col justify-between text-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-base font-bold text-amber-300">{rep.package}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                      {Math.round(rep.confidence * 100)}% Confidence
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400 block mb-2 font-mono">
                    Target: v{rep.suggested_version} • {rep.breaking_changes_expected ? '⚠️ Breaking Changes' : '✓ Drop-in Compatible'}
                  </span>
                  <p className="text-stone-300 text-xs leading-relaxed mb-3">
                    {rep.rationale}
                  </p>
                  {rep.diff_preview && (
                    <pre className="p-2.5 rounded-lg bg-black/50 text-[10px] font-mono text-stone-300 border border-white/5 overflow-x-auto mb-2">
                      {rep.diff_preview}
                    </pre>
                  )}
                </div>
                <div className="text-[10px] text-stone-400 pt-2 border-t border-amber-900/20">
                  <strong className="text-stone-300">Notes:</strong> {rep.migration_notes || 'Standard import refactoring.'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── HEADER 5: EXECUTED TEST RESULTS (FACT LEDGER) ─────────────────── */}
        <div className="rounded-2xl p-6 bg-[#0a120e] border border-emerald-500/60 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Header 5
              </span>
              <span className="text-stone-500">•</span>
              <span className="text-sm font-bold text-white">Executed Test Results (Sandbox Double-Baseline)</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Verified Fact</span>
            </span>
          </div>

          <div className="flex items-center gap-4 mb-4 text-xs font-mono">
            <span className="text-stone-400">
              Total Tests: <strong className="text-stone-200">{capsule.fact.tests_total}</strong>
            </span>
            <span className="text-emerald-400">
              Passed: <strong>{capsule.fact.tests_passed}</strong>
            </span>
            <span className="text-rose-400">
              Failed: <strong>{capsule.fact.tests_failed}</strong>
            </span>
          </div>

          <div className="space-y-2.5">
            {capsule.fact.test_results.map((tr, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border text-xs font-mono ${
                  tr.status === 'PASS'
                    ? 'bg-[#0e1612] border-emerald-900/40 text-stone-200'
                    : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {tr.status === 'PASS' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span className="font-bold">{tr.test_id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    {tr.duration_ms && <span className="text-stone-400">{tr.duration_ms}ms</span>}
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase ${
                        tr.status === 'PASS'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {tr.status}
                    </span>
                  </div>
                </div>

                {tr.error_message && (
                  <div className="mt-2 pt-2 border-t border-rose-900/30 text-[11px] text-rose-300 font-sans">
                    <strong>Error:</strong> {tr.error_message}
                  </div>
                )}
                {tr.traceback && (
                  <pre className="mt-2 p-2 rounded bg-black/60 text-[10px] text-rose-400 overflow-x-auto">
                    {tr.traceback}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── HEADER 6: OPEN CONCERNS (CLAIM / MERGER LEDGER) ───────────────── */}
        <div className="rounded-2xl p-6 bg-[#141009] border-2 border-dashed border-amber-400/60 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-amber-900/40 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Header 6
              </span>
              <span className="text-stone-500">•</span>
              <span className="text-sm font-bold text-white">Open Concerns &amp; Merger Verdict</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Unverified Model Output — Gemma 4</span>
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#1a140a] border border-amber-900/30 text-xs mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-stone-200">Merger Synthesis &amp; Verdict Rationale:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                  isApproved
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : isFlagged
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {capsule.merge_decision}
              </span>
            </div>
            <p className="text-stone-300 leading-relaxed font-sans">
              {capsule.merger_notes || 'All cross-validation heuristics confirmed. Human review required for breaking changes.'}
            </p>
          </div>

          {capsule.claim.open_concerns.length > 0 ? (
            <ul className="space-y-2 text-xs font-sans text-stone-300">
              {capsule.claim.open_concerns.map((concern, i) => (
                <li key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#1a140a] border border-amber-900/30">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 rounded-xl bg-[#1a140a] border border-emerald-900/30 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>No unresolved open concerns recorded by the merger engine.</span>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. MANDATORY GEMMA MODEL METADATA CARD (Hackathon Rubric Spec)      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 bg-[#121412] border border-stone-800 text-xs font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-lime-400" />
            <span className="font-bold text-stone-200">Gemma Model Provenance &amp; Compliance Metadata</span>
          </div>
          <span className="text-[10px] font-mono text-stone-400">
            Mandatory Hackathon Rubric Spec
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
          <div className="p-3 rounded-xl bg-[#0b0d0c] border border-stone-800/80">
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">Model</span>
            <span className="font-mono text-stone-200 font-bold mt-0.5 block">{capsule.model_metadata.model}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0b0d0c] border border-stone-800/80">
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">Access Method</span>
            <span className="font-mono text-stone-300 mt-0.5 block truncate">{capsule.model_metadata.access_method}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0b0d0c] border border-stone-800/80">
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">Terms &amp; Governance</span>
            <a
              href={capsule.model_metadata.terms}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-emerald-400 hover:underline mt-0.5 inline-flex items-center gap-1 truncate"
            >
              <span>ai.google.dev/terms</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <p className="text-[11px] text-stone-400 mt-3 pt-3 border-t border-stone-800/60 leading-snug">
          Deterministic Fact and AI Claim separation cryptographically enforced under ChainRoute Two-Ledger Governance.
        </p>
      </div>
    </div>
  );
};
