import React from 'react';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface PromoCardProps {
  onCtaClick: () => void;
}

export const PromoCard: React.FC<PromoCardProps> = ({ onCtaClick }) => {
  return (
    <div className="w-full rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-950/80 via-[#0f1712] to-[#0a100d] text-white border border-emerald-800/30 relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      {/* Top subtle highlight reflection */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent pointer-events-none" />
      {/* Subtle radial glow overlay */}
      <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Left content: Title and Description */}
      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-700/40 text-[11px] font-sans font-semibold mb-3 text-emerald-300 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>SENTINEL AI SHIELD</span>
        </div>

        <h3 className="text-xl sm:text-2xl lg:text-3xl font-sans font-extrabold leading-tight tracking-tight mb-2 text-white">
          Trusted by Thousands. Secure Your Code Today!
        </h3>

        <p className="text-xs sm:text-sm text-stone-300 font-sans leading-relaxed">
          Autonomous zero-day heuristic protection and instant Polygon blockchain anchoring for modern enterprise software supply chains.
        </p>
      </div>

      {/* Right content: Avatars + Get Started Button */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 shrink-0 w-full lg:w-auto justify-between lg:justify-end">
        {/* Avatars Stack */}
        <div className="flex items-center space-x-3">
          <div className="flex -space-x-2 overflow-hidden">
            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-emerald-900 bg-stone-900 text-stone-200 flex items-center justify-center font-bold text-[10px]">
              ER
            </div>
            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-emerald-900 bg-stone-850 text-emerald-300 flex items-center justify-center font-bold text-[10px]">
              PV
            </div>
            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-emerald-900 bg-stone-800 text-stone-300 flex items-center justify-center font-bold text-[10px]">
              SL
            </div>
            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-emerald-900 bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
              +12k
            </div>
          </div>
          <span className="text-xs font-sans text-stone-300 font-medium whitespace-nowrap">
            Active Maintainers
          </span>
        </div>

        {/* Sleek Get Started Pill Button */}
        <button
          onClick={onCtaClick}
          className="w-full sm:w-auto py-3 px-6 rounded-full bg-white hover:bg-stone-100 text-stone-950 font-sans font-bold text-xs tracking-wider flex items-center justify-center space-x-2 transition-all duration-150 active:scale-95 shadow-md hover:shadow-lg shrink-0"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4 text-stone-950 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
