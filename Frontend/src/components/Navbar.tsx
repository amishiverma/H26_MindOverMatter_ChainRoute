import React from 'react';
import { Terminal, Network, BookOpen, Layers, Coins, Cpu } from 'lucide-react';
import { GithubIcon, formatGithubUrl } from './GithubIcon';
import logoImg from '../assets/logo.png';

interface NavbarProps {
  onLaunchConsole: () => void;
  onOpenVR: () => void;
  onOpenDocs: () => void;
  onOpenPricing: () => void;
  onOpenEcosystem: () => void;
  isDashboard?: boolean;
  currentRepo?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onLaunchConsole,
  onOpenVR,
  onOpenDocs,
  onOpenPricing,
  onOpenEcosystem,
  isDashboard = false,
  currentRepo,
}) => {
  return (
    <header className="sticky top-4 z-50 w-full px-4 sm:px-6 pointer-events-none transition-all">
      <div className="relative pointer-events-auto max-w-6xl mx-auto rounded-full bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_12px_36px_rgba(0,0,0,0.5)] px-6 py-3 flex items-center justify-between overflow-hidden">
        
        {/* Top-edge light reflection catching the rim of real glass */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
        
        {/* Brand / Logo */}
        <div 
          className="flex items-center space-x-3 cursor-pointer group select-none relative z-10" 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] transition-transform group-hover:scale-105">
            <img 
              src={logoImg} 
              alt="TraceRoot Logo" 
              className="w-6 h-6 object-contain relative z-10" 
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border-2 border-[#121b18]" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-display font-bold text-lg tracking-wide text-white">
                TraceRoot
              </span>
            </div>
            <span className="text-[10px] text-stone-400 font-medium tracking-wider flex items-center gap-1 uppercase">
              <Cpu className="w-2.5 h-2.5 text-emerald-400" /> DevSecOps Trust Layer
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 relative z-10">
          <button
            onClick={onOpenVR}
            className="group flex items-center space-x-1.5 text-sm font-medium text-stone-300 hover:text-white transition-colors"
          >
            <Network className="w-4 h-4 text-stone-400 group-hover:text-emerald-400 transition-colors" />
            <span>Attack Surface</span>
            <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-white/[0.04] text-emerald-300 border border-white/10">3D</span>
          </button>

          <button
            onClick={onOpenEcosystem}
            className="group flex items-center space-x-1.5 text-sm font-medium text-stone-300 hover:text-white transition-colors"
          >
            <Layers className="w-4 h-4 text-stone-400 group-hover:text-emerald-400 transition-colors" />
            <span>Ecosystem</span>
          </button>

          <button
            onClick={onOpenPricing}
            className="group flex items-center space-x-1.5 text-sm font-medium text-stone-300 hover:text-white transition-colors"
          >
            <Coins className="w-4 h-4 text-stone-400 group-hover:text-emerald-400 transition-colors" />
            <span>Pricing</span>
          </button>

          <button
            onClick={onOpenDocs}
            className="group flex items-center space-x-1.5 text-sm font-medium text-stone-300 hover:text-white transition-colors"
          >
            <BookOpen className="w-4 h-4 text-stone-400 group-hover:text-emerald-400 transition-colors" />
            <span>Docs</span>
          </button>
        </nav>

        {/* Right Action Group: GitHub Repo Link + Console CTA */}
        <div className="flex items-center space-x-3 relative z-10">
          <a
            href={formatGithubUrl(currentRepo)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 text-stone-300 hover:text-white transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] group"
            title={currentRepo ? `Open ${currentRepo} directly on GitHub` : 'Open GitHub'}
          >
            <GithubIcon className="w-4 h-4 group-hover:scale-110 transition-transform text-stone-300 group-hover:text-emerald-300" />
          </a>

          <button
            onClick={onLaunchConsole}
            id="launch-console-btn"
            className="relative group overflow-hidden px-5 py-2.5 rounded-full text-xs tracking-wide text-stone-950 font-bold transition-all duration-200 hover:opacity-95 active:scale-[0.98] bg-gradient-to-r from-emerald-500 via-teal-400 to-lime-500 border border-white/20 shadow-[0_4px_16px_rgba(16,185,129,0.25)]"
          >
            <span className="relative z-10 flex items-center space-x-2 font-bold text-stone-950">
              <Terminal className="w-3.5 h-3.5 text-stone-950" />
              <span>{isDashboard ? 'Control Center' : 'Launch Console'}</span>
            </span>
          </button>
        </div>

      </div>
    </header>
  );
};
