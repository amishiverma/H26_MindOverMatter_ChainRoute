import React from 'react';
import { motion } from 'framer-motion';
import { Network, Bot, ShieldCheck, GitPullRequest, ArrowUpRight, Cpu, Check, Terminal, Zap } from 'lucide-react';

interface FeaturesSectionProps {
  onExploreFeature: (featureName: string) => void;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ onExploreFeature }) => {
  return (
    <section className="relative py-24 bg-[#0b0d0c] border-t border-stone-800/80 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header with Scroll-Triggered Reveal */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#16201a] border border-emerald-500/20 text-xs font-sans text-emerald-400 mb-4 font-medium">
            <Cpu className="w-3.5 h-3.5" />
            <span>ARCHITECTURAL CAPABILITIES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-sans font-bold text-white tracking-tight mb-4">
            Next-Gen DevSecOps{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-lime-500 bg-clip-text text-transparent">
              Defense Matrix
            </span>
          </h2>
          <p className="text-stone-400 font-sans text-base sm:text-lg leading-relaxed">
            Built from first principles to defeat software supply chain infiltration, maintainer account hijacking, and zero-day dependency attacks.
          </p>
        </motion.div>

        {/* Feature Grid: 4 Core Sections with Sideways Slide-In Animations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          
          {/* Card 1 (Left): DAG Topology Engine - Slide in from Left */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onExploreFeature('Dependency Graph')}
            className="relative rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_36px_rgba(0,0,0,0.5)] hover:border-white/20 p-7 sm:p-8 transition-all duration-300 group flex flex-col justify-between cursor-pointer overflow-hidden"
          >
            {/* Top-edge light reflection */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Network className="w-6 h-6" />
                </div>
                <span className="text-xs font-sans px-3 py-1 rounded-full bg-white/[0.04] text-emerald-300 border border-white/10 font-medium">
                  DAG Topology Engine
                </span>
              </div>

              <h3 className="text-2xl font-sans font-bold text-white mb-3 flex items-center gap-2 group-hover:text-emerald-300 transition-colors">
                Unleashing the Power of Dependency Graphs
                <ArrowUpRight className="w-5 h-5 text-emerald-400 opacity-60 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </h3>

              <p className="text-stone-400 text-sm sm:text-base leading-relaxed mb-6 font-sans">
                Traverse multi-tier recursive dependency trees in milliseconds. Trace deeply nested transitive dependencies, peer conflicts, and hidden runtime payloads across NPM, PyPI, and Go ecosystems.
              </p>
            </div>

            {/* Inner Structured Statistic / Visual Preview Box */}
            <div className="bg-black/30 border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between text-xs font-sans text-stone-400 pb-3 border-b border-white/5">
                <span className="flex items-center gap-2 text-stone-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  DAG Visualizer Preview
                </span>
                <span className="font-sans text-stone-400">Depth: 7 Tiers</span>
              </div>

              {/* Node connection mock */}
              <div className="py-6 flex items-center justify-around relative">
                <div className="px-3.5 py-2.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-sans text-emerald-300 text-center">
                  @chainroute/core
                  <div className="text-[10px] text-stone-400 font-sans mt-0.5">Risk: 12 (Safe)</div>
                </div>

                <div className="h-0.5 w-12 bg-gradient-to-r from-emerald-600 to-stone-600" />

                <div className="px-3.5 py-2.5 rounded-full bg-white/[0.03] border border-white/10 text-xs font-sans text-stone-300 text-center">
                  ansi-colors-turbo
                  <div className="text-[10px] text-stone-400 font-sans mt-0.5">Risk: 58 (Review)</div>
                </div>

                <div className="h-0.5 w-12 bg-gradient-to-r from-stone-600 to-rose-500" />

                <div className="px-3.5 py-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-sans text-rose-400 text-center">
                  event-stream-patch
                  <div className="text-[10px] text-rose-400 font-bold font-sans mt-0.5">Risk: 94 (Zero-Day)</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs font-sans text-stone-500 border-t border-white/5">
                <span>Cycles Detected: 0</span>
                <span className="text-emerald-400 font-medium">Blast Radius Analysis Active</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2 (Right): AI Threat Explainer - Slide in from Right */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onExploreFeature('Overview')}
            className="relative rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_36px_rgba(0,0,0,0.5)] hover:border-white/20 p-7 sm:p-8 transition-all duration-300 group flex flex-col justify-between cursor-pointer overflow-hidden"
          >
            {/* Top-edge light reflection */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Bot className="w-6 h-6" />
                </div>
                <span className="text-xs font-sans px-3 py-1 rounded-full bg-white/[0.04] text-emerald-300 border border-white/10 font-medium">
                  Sentinel Heuristic AI
                </span>
              </div>

              <h3 className="text-2xl font-sans font-bold text-white mb-3 flex items-center gap-2 group-hover:text-emerald-300 transition-colors">
                Autonomous AI Threat Explainer
                <ArrowUpRight className="w-5 h-5 text-emerald-400 opacity-60 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </h3>

              <p className="text-stone-400 text-sm sm:text-base leading-relaxed mb-6 font-sans">
                Instant natural language intelligence on anomalous maintainer changes, sudden commit spikes, dormancy releases, and obfuscated entropy payloads. No cryptic CVE codes without context.
              </p>
            </div>

            {/* AI Explanation Terminal Mock */}
            <div className="bg-black/30 border border-white/5 rounded-2xl p-5 font-mono text-xs text-stone-300">
              <div className="flex items-center space-x-2 text-emerald-400 pb-2.5 border-b border-white/5">
                <Terminal className="w-4 h-4" />
                <span className="font-bold">SENTINEL AST SYNTHESIS #ZX-882</span>
              </div>
              <div className="mt-3 space-y-2 text-stone-300">
                <p className="text-emerald-300">
                  &gt; Maintainer account email changed to disposable address 18h prior to publication.
                </p>
                <p className="text-stone-400">
                  &gt; Injected 24KB Base64 blob inside test fixture with runtime <span className="text-emerald-400 font-semibold">eval()</span> execution pattern.
                </p>
                <p className="text-rose-400 font-semibold">
                  &gt; Verdict: High-confidence supply chain backdoor targeting cloud credential stores.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 3 (Left): Blockchain Trust Anchor - Slide in from Left */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onExploreFeature('Blockchain')}
            className="relative rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_36px_rgba(0,0,0,0.5)] hover:border-white/20 p-7 sm:p-8 transition-all duration-300 group flex flex-col justify-between cursor-pointer overflow-hidden"
          >
            {/* Top-edge light reflection */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-xs font-sans px-3 py-1 rounded-full bg-white/[0.04] text-emerald-300 border border-white/10 font-medium">
                  Polygon PoS Proof
                </span>
              </div>

              <h3 className="text-2xl font-sans font-bold text-white mb-3 flex items-center gap-2 group-hover:text-emerald-300 transition-colors">
                Blockchain Trust Anchor
                <ArrowUpRight className="w-5 h-5 text-emerald-400 opacity-60 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </h3>

              <p className="text-stone-400 text-sm sm:text-base leading-relaxed mb-6 font-sans">
                Every clean repository scan creates a cryptographic Merkle root anchored immutably to Polygon Mainnet. Prevent malicious repo tampering, build-system poisoning, and historical revisionism.
              </p>
            </div>

            {/* Blockchain Receipt Mock */}
            <div className="bg-black/30 border border-white/5 rounded-2xl p-5 font-mono text-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                <span className="text-stone-400">NETWORK:</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" /> Polygon PoS Validated
                </span>
              </div>
              <div className="mt-2.5 space-y-1.5 text-stone-400">
                <div className="flex justify-between">
                  <span>BLOCK HEIGHT:</span>
                  <span className="text-white font-bold">#5,928,174</span>
                </div>
                <div className="flex justify-between">
                  <span>MERKLE ROOT:</span>
                  <span className="text-emerald-400 truncate max-w-[200px]">0x184fa9e283109a12cce49104fae9021481903be9</span>
                </div>
                <div className="flex justify-between">
                  <span>TX RECEIPT:</span>
                  <span className="text-stone-300 truncate max-w-[200px]">0x8f4d92a39b4012948123acbbef01293e8f49e79b</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 4 (Right): Automated GitHub Action Bot - Slide in from Right */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onExploreFeature('Overview')}
            className="relative rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_36px_rgba(0,0,0,0.5)] hover:border-white/20 p-7 sm:p-8 transition-all duration-300 group flex flex-col justify-between cursor-pointer overflow-hidden"
          >
            {/* Top-edge light reflection */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                  <GitPullRequest className="w-6 h-6" />
                </div>
                <span className="text-xs font-sans px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                  CI/CD Security Gate
                </span>
              </div>

              <h3 className="text-2xl font-sans font-bold text-white mb-3 flex items-center gap-2 group-hover:text-rose-300 transition-colors">
                Automated GitHub Action Bot
                <ArrowUpRight className="w-5 h-5 text-rose-400 opacity-60 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </h3>

              <p className="text-stone-400 text-sm sm:text-base leading-relaxed mb-6 font-sans">
                Stops poisoned pull requests dead in their tracks. Our automated bot intercepts PRs before merge, generates cryptographic audits, and blocks untrusted dependencies with zero human latency.
              </p>
            </div>

            {/* PR Simulation Mock */}
            <div className="bg-black/30 border border-white/5 rounded-2xl p-5 font-mono text-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                <span className="text-rose-400 font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 fill-rose-400" />
                  GATEWAY STATUS: BLOCKED PR #412
                </span>
                <span className="text-stone-500">Exit Code: 1</span>
              </div>
              <div className="mt-2.5 text-stone-300 space-y-1">
                <p className="text-stone-500">&gt; chainroute-bot [action] evaluate-dependencies --strict</p>
                <p className="text-rose-400 font-semibold">&gt; CRITICAL: High-risk package event-stream-patch blocked from production bundle.</p>
                <p className="text-stone-400">&gt; Cryptographic proof recorded. PR author notified with remediation diff.</p>
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
};
