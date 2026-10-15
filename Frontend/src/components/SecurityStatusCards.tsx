import React, { useState } from 'react';
import { PackageCheck, ShieldAlert, CheckCircle2, Copy, Check, ArrowUpRight, Lock } from 'lucide-react';

interface SecurityStatusCardsProps {
  onViewBlockchain: () => void;
}

export const SecurityStatusCards: React.FC<SecurityStatusCardsProps> = ({ onViewBlockchain }) => {
  const [copied, setCopied] = useState(false);
  const txHash = '0x8f4d92a39b4012948123acbbef01293e8f49e79b';

  const handleCopy = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
      
      {/* Card 1: Total Packages Scanned */}
      <div className="rounded-3xl bg-[#121412] border border-stone-800 p-6 hover:border-lime-700/40 transition-all flex flex-col justify-between shadow-lg">
        <div>
          <div className="flex items-center justify-between text-xs font-sans text-stone-400 mb-2">
            <span className="flex items-center gap-1.5 text-lime-400 font-medium">
              <PackageCheck className="w-4 h-4" />
              Inventory Audit
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#161a15] text-lime-400 border border-lime-800/40 font-medium">
              AST Verified
            </span>
          </div>

          <div className="text-3xl font-sans font-extrabold text-stone-100 mt-1">
            2,847
          </div>
          <p className="text-xs text-stone-400 font-sans mt-1">
            Direct &amp; transitive dependencies mapped across 7 recursive tiers.
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between text-xs font-sans">
          <span className="text-lime-400 font-medium flex items-center gap-1">
            <span>+14.8%</span> scan throughput
          </span>
          <span className="text-stone-400 font-sans text-xs">18ms latency</span>
        </div>
      </div>

      {/* Card 2: Zero-Days Prevented */}
      <div className="rounded-3xl bg-[#121412] border border-stone-800 p-6 hover:border-stone-700 transition-all flex flex-col justify-between shadow-lg">
        <div>
          <div className="flex items-center justify-between text-xs font-sans text-stone-400 mb-2">
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <ShieldAlert className="w-4 h-4" />
              Zero-Days Prevented
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20 font-medium font-sans">
              Intercepted
            </span>
          </div>

          <div className="text-3xl font-sans font-extrabold text-rose-400 mt-1">
            18
          </div>
          <p className="text-xs text-stone-400 font-sans mt-1">
            Backdoors, high-entropy bytecode, &amp; account hijacking attacks deflected.
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between text-xs font-sans">
          <span className="text-amber-400 font-medium flex items-center gap-1">
            <span>2 Pending Quarantines</span>
          </span>
          <span className="text-stone-400 font-sans text-xs">Auto-Gated</span>
        </div>
      </div>

      {/* Card 3: Trust Chain Card */}
      <div className="sm:col-span-2 rounded-3xl bg-[#121412] border border-stone-800 p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-[#161a15] border border-lime-800/40 flex items-center justify-center text-lime-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-stone-100 text-sm">
                  Trust Chain Status: Verified on Polygon
                </span>
                <span className="text-lime-400 text-xs font-sans font-bold">✓</span>
              </div>
              <span className="text-xs text-stone-400 font-sans">
                PoS Consensus Block #5,928,174 • Finality Confirmed
              </span>
            </div>
          </div>

          <button
            onClick={onViewBlockchain}
            className="flex items-center space-x-1 text-xs font-sans text-lime-400 hover:text-white transition-colors self-start sm:self-auto font-medium"
          >
            <span>Explore Proofs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Transaction Hash Preview */}
        <div className="mt-2 rounded-2xl bg-[#0e100f] border border-stone-800 p-3.5 font-sans text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 overflow-hidden">
            <span className="text-stone-400 font-sans text-xs font-medium shrink-0">TX HASH:</span>
            <span className="text-emerald-400 font-mono truncate font-medium">
              {txHash}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#161816] border border-stone-800 hover:border-lime-700/40 text-stone-300 hover:text-white transition-all shrink-0 self-end sm:self-auto text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-lime-400" />
                <span className="text-lime-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Hash</span>
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};
