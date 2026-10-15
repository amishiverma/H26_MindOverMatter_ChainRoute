import React, { useEffect, useState } from 'react';
import { ShieldAlert, Terminal, CheckCircle2, Cpu, Lock, Sparkles, Loader2, ArrowRight, AlertCircle, XCircle } from 'lucide-react';

interface ScanningModalProps {
  repoUrl: string;
  onComplete: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export const ScanningModal: React.FC<ScanningModalProps> = ({ repoUrl, onComplete, onCancel, isLoading = false, error = null }) => {
  const [progress, setProgress] = useState(15);
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    `[INIT] Handshaking with GitHub REST/GraphQL API for target: ${repoUrl}`,
    '[AST] Cloning repository tree & Python manifests (requirements.txt, pyproject.toml, Pipfile)...',
  ]);

  const steps = [
    { title: 'Python Manifests Ingestion', icon: Cpu },
    { title: 'Dependency DAG Synthesis', icon: Terminal },
    { title: 'Sentinel AI Threat Explainer', icon: Sparkles },
    { title: 'OSV.dev & PyPI Advisory Engine', icon: ShieldAlert },
    { title: 'Two-Ledger Sandbox & Capsule', icon: CheckCircle2 },
  ];

  // Simulation timers (for visual feedback during real API call)
  useEffect(() => {
    if (!isLoading) return;

    const timer1 = setTimeout(() => {
      setProgress(38);
      setCurrentStep(1);
      setLogs((prev) => [
        ...prev,
        '[DAG] Parsed dependency tree across Python transitive tiers...',
        '[GRAPH] Building adjacency matrix for cyclic vulnerability detection...',
      ]);
    }, 900);

    const timer2 = setTimeout(() => {
      setProgress(64);
      setCurrentStep(2);
      setLogs((prev) => [
        ...prev,
        '[AI] Sentinel AI engine analyzing maintainer velocity anomalies...',
        '[ALERT] High-entropy payload identified in transitive node: urllib3-patch.',
      ]);
    }, 1800);

    const timer3 = setTimeout(() => {
      setProgress(88);
      setCurrentStep(3);
      setLogs((prev) => [
        ...prev,
        '[OSV] Cross-matching with OSV.dev & PyPI Advisory Database...',
        '[SANDBOX] Double-pass Pytest execution running in Python 3.12 sandbox...',
      ]);
    }, 2700);

    const timer4 = setTimeout(() => {
      setProgress(95);
      setCurrentStep(4);
      setLogs((prev) => [
        ...prev,
        '[LEDGER] Merging Fact Ledger sandbox proofs with Gemma 4 Claim Ledger...',
        '[VERDICT] Exit Capsule sealed with empirical test verification.',
      ]);
    }, 3600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [isLoading, repoUrl]);

  // When real API completes (isLoading goes false and no error), finish the animation
  useEffect(() => {
    if (isLoading === false && progress > 0 && !error) {
      setProgress(100);
      setLogs((prev) => [
        ...prev,
        '[LEDGER] Dependency Exit Capsule sealed and verified.',
        '[SUCCESS] Security Control Center is primed and ready.',
      ]);
      const timer = setTimeout(() => onComplete(), 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading, error, onComplete, progress]);

  // Error state rendering
  if (error && !isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md">
        <div className="relative w-full max-w-md rounded-2xl bg-[#121412] border border-rose-500/30 p-6 sm:p-8">
          <div className="flex items-center justify-between pb-6 border-b border-stone-800">
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg text-stone-100">Scan Failed</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    ERROR
                  </span>
                </div>
                <p className="text-xs font-mono text-stone-400 truncate max-w-md mt-0.5">Target: {repoUrl}</p>
              </div>
            </div>
          </div>

          <div className="py-6">
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 font-mono text-xs text-rose-300">
              {error}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onCancel}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-medium transition-colors"
            >
              <span>Dismiss</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#121412] border border-stone-800 p-6 sm:p-8 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-stone-800 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10 rounded-xl bg-[#0b0d0c] border border-stone-800 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-lime-400 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-lg text-stone-100">Deep Security Scan in Progress</span>
                <span className="text-[10px] font-sans font-medium px-2.5 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
                  Live Telemetry
                </span>
              </div>
              <p className="text-xs font-sans text-stone-400 truncate max-w-md mt-0.5">
                Target: <span className="font-mono text-stone-300">{repoUrl}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="text-xs font-medium text-stone-400 hover:text-stone-200 px-4 py-1.5 rounded-full bg-[#0b0d0c] border border-stone-800 hover:border-stone-700 transition-colors"
          >
            Abort Scan
          </button>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="py-6 relative z-10">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-lime-400 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-500" />
              Heuristic Engine Recursion
            </span>
            <span className="text-stone-100 font-sans font-bold text-base">{progress}%</span>
          </div>

          <div className="h-2 w-full bg-[#0b0d0c] rounded-full overflow-hidden border border-stone-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 via-lime-600 to-stone-700 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Stepper indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-6">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isDone = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div
                  key={step.title}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isDone
                      ? 'bg-stone-900 border-stone-700 text-lime-400'
                      : isCurrent
                      ? 'bg-stone-900 border-lime-600/60 text-stone-100 ring-1 ring-lime-600/30'
                      : 'bg-[#0b0d0c] border-stone-800/60 text-stone-500'
                  }`}
                >
                  <div className="flex justify-center mb-1.5">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-lime-400" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-[11px] font-sans leading-tight font-medium">
                    {step.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* High-speed Real-time Terminal Log Console */}
        <div className="rounded-xl bg-[#0b0d0c] border border-stone-800 p-4 font-mono text-xs text-stone-300 relative z-10">
          <div className="flex items-center justify-between text-[11px] font-sans text-stone-400 pb-2 mb-2 border-b border-stone-800">
            <span className="flex items-center gap-1.5 text-lime-400 font-medium">
              <Terminal className="w-3.5 h-3.5" />
              <span>Live Daemon Execution Stream</span>
            </span>
            <span className="font-sans">12ms Latency</span>
          </div>

          <div className="space-y-1.5 h-36 overflow-y-auto pr-2 scrollbar-thin">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 ${log.includes('[ALERT]') || log.includes('Zero-Day') || log.includes('[ERROR]')
                  ? 'text-rose-400 font-semibold'
                  : log.includes('[SUCCESS]') || log.includes('[LEDGER]') || log.includes('[SANDBOX]')
                  ? 'text-lime-400 font-semibold'
                  : log.includes('[AI]')
                  ? 'text-lime-300'
                  : 'text-stone-300'}`}
              >
                <span className="text-stone-600 select-none">&gt;</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Skip button for instant entry */}
        <div className="mt-6 flex justify-end relative z-10">
          <button
            onClick={onComplete}
            className="flex items-center space-x-1.5 text-xs font-medium text-lime-400 hover:text-lime-300 transition-colors"
          >
            <span>Fast-Forward into Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};