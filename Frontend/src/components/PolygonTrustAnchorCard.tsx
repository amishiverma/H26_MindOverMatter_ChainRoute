import React, { useState } from 'react';
import { Coins, Copy, Check, ExternalLink, ShieldCheck, Cpu, ArrowUpRight } from 'lucide-react';

interface PolygonTrustAnchorCardProps {
  currentRepo?: string;
  onVerifyProof?: () => void;
  onScanRepo?: () => void;
  scanTxHash?: string | null;
  stats?: {
    criticalCount: number;
    warningCount: number;
    safeCount: number;
    totalPackages: number;
  };
}

export const PolygonTrustAnchorCard: React.FC<PolygonTrustAnchorCardProps> = ({
  currentRepo = 'facebook/react',
  onVerifyProof,
  onScanRepo,
  scanTxHash,
  stats,
}) => {
  const [copied, setCopied] = useState(false);
  const fullHash = scanTxHash || '0x184fe982bca903b71948274aefb90218a93bcde4';
  const merkleHash = fullHash.length > 14 ? `${fullHash.slice(0, 6)}...${fullHash.slice(-4)}` : fullHash;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fullHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_12px_32px_rgba(0,0,0,0.5)] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden h-full group">
      {/* Top subtle highlight reflection */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-sans text-stone-400 block font-medium">
                Polygon Trust Anchor
              </span>
              <span className="text-sm font-sans font-bold text-white tracking-tight">
                Immutable Proof Status
              </span>
            </div>
          </div>

          <span className="text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-semibold flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Verified On-Chain</span>
          </span>
        </div>

        {/* Middle Body: Left Metadata Keys + Right Structural Node Icon Block */}
        <div className="my-3 grid grid-cols-12 gap-3 items-center rounded-2xl bg-black/40 border border-white/5 p-4">
          {/* Left Metadata Keys: 8 cols */}
          <div className="col-span-8 space-y-2.5 text-xs font-sans">
            <div>
              <span className="text-[10px] text-stone-400 block font-semibold uppercase tracking-wider">
                Network
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5 text-stone-100 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Polygon PoS Mainnet</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-stone-400 block font-semibold uppercase tracking-wider">
                Repository
              </span>
              <a
                href={`https://github.com/${currentRepo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group/repo inline-flex items-center gap-1.5 text-white font-bold tracking-tight mt-0.5 hover:text-emerald-400 transition-colors max-w-full"
                title={`Open https://github.com/${currentRepo} on GitHub`}
              >
                <span className="truncate">{currentRepo}</span>
                <ExternalLink className="w-3 h-3 text-stone-400 group-hover/repo:text-emerald-400 transition-colors shrink-0" />
              </a>
            </div>

            <div>
              <span className="text-[10px] text-stone-400 block font-semibold uppercase tracking-wider">
                Merkle Digest
              </span>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="font-mono text-stone-300 text-[11px]">{merkleHash}</span>
                <button
                  onClick={handleCopy}
                  className="p-1 rounded-md text-stone-400 hover:text-white transition-colors hover:bg-white/5"
                  title="Copy full transaction hash"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Structural Node Icon Block - 4 cols */}
          <div className="col-span-4 flex flex-col items-center justify-center">
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-stone-900/80 to-black border border-emerald-600/30 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.4)] group-hover:border-emerald-500/50 transition-colors">
              {/* Subtle ambient light */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.15)_0%,_transparent_70%)] pointer-events-none" />

              {/* Geometric Node Mesh Icon */}
              <svg
                viewBox="0 0 48 48"
                className="w-12 h-12 text-emerald-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Structural connection lines */}
                <line x1="24" y1="8" x2="10" y2="20" stroke="currentColor" strokeOpacity="0.8" />
                <line x1="24" y1="8" x2="38" y2="20" stroke="currentColor" strokeOpacity="0.8" />
                <line x1="24" y1="8" x2="24" y2="38" stroke="currentColor" strokeOpacity="0.8" />
                <line x1="10" y1="20" x2="10" y2="38" stroke="currentColor" strokeOpacity="0.8" />
                <line x1="38" y1="20" x2="38" y2="38" stroke="currentColor" strokeOpacity="0.8" />
                <line x1="10" y1="20" x2="24" y2="38" stroke="currentColor" strokeOpacity="0.8" />
                <line x1="38" y1="20" x2="24" y2="38" stroke="currentColor" strokeOpacity="0.8" />

                {/* Nodes */}
                <circle cx="24" cy="8" r="4" fill="#047857" stroke="#34d399" strokeWidth="2" />
                <circle cx="10" cy="20" r="4" fill="#047857" stroke="#34d399" strokeWidth="2" />
                <circle cx="38" cy="20" r="4" fill="#047857" stroke="#34d399" strokeWidth="2" />
                <circle cx="10" cy="38" r="4" fill="#047857" stroke="#34d399" strokeWidth="2" />
                <circle cx="38" cy="38" r="4" fill="#047857" stroke="#34d399" strokeWidth="2" />
                <circle cx="24" cy="38" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>
            <span className="text-[10px] font-mono text-stone-400 mt-1.5">Block #5.9M</span>
          </div>
        </div>
      </div>

      {/* Bottom Polished Action Button */}
      <div className="pt-2">
        <button
          onClick={onVerifyProof}
          className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 hover:border-emerald-500/40 text-stone-100 hover:text-white text-xs font-sans font-semibold flex items-center justify-center space-x-2 transition-all duration-200 active:scale-[0.98] shadow-sm"
        >
          <span>View On-Chain Proof</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
        </button>
      </div>
    </div>
  );
};
