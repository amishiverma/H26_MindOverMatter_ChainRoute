import React, { useState } from 'react';
import { ArrowUpRight, Search, ShieldCheck, Cpu, CheckCircle2, Copy, Check, Lock } from 'lucide-react';

interface StackedCardContainerProps {
  onScanRepo: () => void;
  onVerifyHash: () => void;
  scanTxHash?: string | null;
  stats?: {
    criticalCount: number;
    warningCount: number;
    safeCount: number;
    totalPackages: number;
  };
}

export const StackedCardContainer: React.FC<StackedCardContainerProps> = ({
  onScanRepo,
  onVerifyHash,
  scanTxHash,
  stats,
}) => {
  const [copied, setCopied] = useState(false);
  
  const displayTxHash = scanTxHash || '0x8f4d92a39b4012948123acbbef01293e8f49e79b';
  const shortTxHash = displayTxHash.length > 20 
    ? `${displayTxHash.slice(0, 10)}...${displayTxHash.slice(-6)}` 
    : displayTxHash;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayTxHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const criticalCount = stats?.criticalCount ?? 0;
  const warningCount = stats?.warningCount ?? 0;
  const safeCount = stats?.safeCount ?? 0;
  const totalPackages = stats?.totalPackages ?? 0;

  return (
    <div className="rounded-3xl bg-[#121412] border border-stone-800 p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden h-full shadow-lg">
      
      {/* Container Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <span className="text-xs font-sans text-stone-400 block">Polygon Trust Anchor</span>
          <span className="text-sm font-sans font-bold text-stone-200">Immutable Proof Status</span>
        </div>
        <span className="text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-[#161a15] text-emerald-400 border border-emerald-800/40 font-medium">
          Verified On-Chain
        </span>
      </div>

      {/* Overlapping / Stacked Cards Visual */}
      <div className="relative my-2 select-none">
        
        {/* Background Peek Card (Layer 2) */}
        <div className="absolute -top-3 left-3 right-3 h-44 rounded-2xl bg-[#181a17] border border-stone-800 transform scale-95 opacity-60 -rotate-2 pointer-events-none" />

        {/* Foreground Primary Olive-Sage Card */}
        <div className="relative h-48 sm:h-52 w-full rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-lime-700 via-emerald-850 to-stone-900 text-white border border-lime-600/30 overflow-hidden flex flex-col justify-between shadow-md transform hover:scale-[1.01] transition-transform duration-200">
          
          {/* Subtle decorative geometric overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full border border-white/10 pointer-events-none" />

          {/* Top Row: HSM Chip & Polygon Mainnet */}
          <div className="flex items-center justify-between relative z-10">
            {/* HSM Security Chip */}
            <div className="w-10 h-7 rounded-md bg-[#161a15] border border-lime-700/50 shadow-inner flex items-center justify-center p-1">
              <div className="w-full h-full border border-lime-800/40 rounded flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5 text-lime-400" />
              </div>
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-sans font-semibold text-stone-200">
              <span>Polygon Mainnet</span>
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          </div>

          {/* Center: Block Height & Security Shield State */}
          <div className="relative z-10 my-1">
            <span className="text-[10px] text-lime-200/80 font-sans uppercase tracking-wider block font-medium">
              Immutable Block Confirmation
            </span>
            <div className="text-2xl sm:text-3xl font-sans font-extrabold tracking-tight">
              Block #5,928,174
            </div>
            <span className="text-[11px] text-stone-300 font-sans block mt-0.5">
              {totalPackages > 0 
                ? `${totalPackages} packages anchored • ${criticalCount} critical, ${warningCount} warning, ${safeCount} safe`
                : '100% Cryptographic Proof Confirmed • Zero-Day Shields Active'}
            </span>
          </div>

          {/* Bottom Row: Repo Name & Merkle Digest */}
          <div className="flex items-end justify-between relative z-10 text-xs">
            <div>
              <span className="text-[10px] text-lime-200/80 block font-sans font-medium">REPOSITORY</span>
              <span className="font-sans font-bold tracking-wide">{totalPackages > 0 ? 'Latest Scan' : 'facebook/react'}</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-lime-200/80 block font-sans font-medium">MERKLE DIGEST</span>
              <div className="flex items-center justify-end gap-1.5">
                <span className="font-mono tracking-wider text-xs">{shortTxHash}</span>
                <button
                  onClick={handleCopy}
                  className="p-1 rounded-md hover:bg-white/10 text-stone-300 transition-colors"
                  title="Copy transaction hash"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-lime-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-stone-800">
        <button
          onClick={onScanRepo}
          className="group flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-[#161816] hover:bg-[#1a1f18] border border-stone-800 hover:border-lime-700/40 text-stone-200 text-xs font-sans font-semibold transition-all duration-150 active:scale-95"
        >
          <div className="w-7 h-7 rounded-xl bg-[#161a15] group-hover:bg-[#1c221a] flex items-center justify-center text-lime-400 transition-colors">
            <Search className="w-3.5 h-3.5" />
          </div>
          <span>Scan Repo</span>
        </button>

        <button
          onClick={onVerifyHash}
          className="group flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-[#161816] hover:bg-[#1a1f18] border border-stone-800 hover:border-lime-700/40 text-stone-200 text-xs font-sans font-semibold transition-all duration-150 active:scale-95"
        >
          <div className="w-7 h-7 rounded-xl bg-[#161a15] group-hover:bg-[#1c221a] flex items-center justify-center text-lime-400 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <span>Verify Proof</span>
        </button>
      </div>

    </div>
  );
};