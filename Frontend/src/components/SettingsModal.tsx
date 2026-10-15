import React, { useState } from 'react';
import { Settings, Save, Key, Globe, Shield, Check, Cpu, Terminal } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const [ghToken, setGhToken] = useState('ghp_************************************');
  const [sensitivity, setSensitivity] = useState<'permissive' | 'balanced' | 'strict'>('strict');
  const [rpcUrl, setRpcUrl] = useState('https://polygon-mainnet.g.alchemy.com/v2/demo-chainroute-key');
  const [network, setNetwork] = useState<'polygon' | 'sepolia'>('polygon');
  const [autoQuarantine, setAutoQuarantine] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="rounded-2xl p-6 bg-[#121412] border border-stone-800">
        <div className="flex items-center space-x-2 text-xs font-semibold text-lime-400 mb-1 tracking-wider uppercase">
          <Settings className="w-4 h-4 text-lime-400" />
          <span>Configuration &amp; Credentials</span>
        </div>
        <h2 className="text-2xl font-display font-bold text-stone-100">
          ChainRoute System Settings
        </h2>
        <p className="text-sm text-stone-400 mt-1">
          Manage GitHub authentication tokens, heuristic sensitivity gates, and blockchain RPC endpoints.
        </p>
      </div>

      {/* Settings Form Cards */}
      <div className="rounded-2xl p-6 bg-[#121412] border border-stone-800 space-y-6 text-sm">
        
        {/* GitHub Credentials */}
        <div className="space-y-2">
          <label className="text-stone-200 font-medium flex items-center gap-2">
            <Key className="w-4 h-4 text-lime-400" />
            GitHub Enterprise Access Token
          </label>
          <input
            type="password"
            value={ghToken}
            onChange={(e) => setGhToken(e.target.value)}
            className="w-full bg-[#0b0d0c] border border-stone-800 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-lime-600/50 transition-colors"
          />
          <p className="text-xs text-stone-400">
            Requires 'repo' and 'security_events' scopes for automatic pull-request quarantine.
          </p>
        </div>

        {/* Heuristic Sensitivity */}
        <div className="space-y-2 pt-4 border-t border-stone-850">
          <label className="text-stone-200 font-medium flex items-center gap-2">
            <Shield className="w-4 h-4 text-lime-400" />
            Threat Heuristics Sensitivity Level
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'permissive', label: 'Permissive (Known CVEs Only)', desc: 'Blocks verified OSV advisories only.' },
              { id: 'balanced', label: 'Balanced (Heuristics + CVEs)', desc: 'Flags suspicious release velocity and bytecode anomalies.' },
              { id: 'strict', label: 'Strict (Zero-Tolerance)', desc: 'Auto-blocks sudden maintainer shifts and high entropy packages.' },
            ].map((mode) => (
              <div
                key={mode.id}
                onClick={() => setSensitivity(mode.id as any)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  sensitivity === mode.id
                    ? 'bg-stone-900 border-lime-600/60 text-white ring-1 ring-lime-600/30'
                    : 'bg-[#0b0d0c] border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="font-semibold text-white mb-1 text-xs">{mode.label}</div>
                <div className="text-xs text-stone-400 leading-snug">{mode.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Blockchain Network & RPC */}
        <div className="space-y-4 pt-4 border-t border-stone-850">
          <label className="text-stone-200 font-medium flex items-center gap-2">
            <Globe className="w-4 h-4 text-lime-400" />
            Blockchain Anchoring Network &amp; Custom RPC
          </label>

          <div className="flex gap-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="net"
                checked={network === 'polygon'}
                onChange={() => setNetwork('polygon')}
                className="accent-lime-500"
              />
              <span className="text-stone-200 text-sm">Polygon PoS (Mainnet)</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="net"
                checked={network === 'sepolia'}
                onChange={() => setNetwork('sepolia')}
                className="accent-lime-500"
              />
              <span className="text-stone-200 text-sm">Sepolia Testnet</span>
            </label>
          </div>

          <input
            type="text"
            value={rpcUrl}
            onChange={(e) => setRpcUrl(e.target.value)}
            className="w-full bg-[#0b0d0c] border border-stone-800 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-lime-600/50 transition-colors"
          />
        </div>

        {/* Auto Quarantine Toggle */}
        <div className="pt-4 border-t border-stone-850 flex items-center justify-between">
          <div>
            <div className="text-stone-200 font-medium">Autonomous GitHub PR Gate Interceptor</div>
            <div className="text-stone-400 text-xs mt-0.5">
              Automatically append commit checks that fail builds if critical zero-days are discovered.
            </div>
          </div>
          <button
            onClick={() => setAutoQuarantine(!autoQuarantine)}
            className={`w-12 h-6 rounded-full transition-colors p-0.5 ${
              autoQuarantine ? 'bg-gradient-to-r from-lime-600 to-emerald-700' : 'bg-stone-800 border border-stone-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-stone-100 transition-transform shadow-sm ${
                autoQuarantine ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Save Button */}
        <div className="pt-4 flex items-center justify-between">
          {saved && (
            <span className="text-lime-400 flex items-center gap-1.5 font-medium text-xs">
              <Check className="w-4 h-4 text-lime-400" />
              Settings saved &amp; synchronized across nodes!
            </span>
          )}
          {!saved && <div />}

          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-lime-600 via-emerald-700 to-stone-800 hover:from-lime-500 hover:to-emerald-600 text-stone-100 font-semibold text-xs border border-lime-500/30 transition-all shadow-[0_0_15px_rgba(132,204,22,0.15)]"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>

      </div>
    </div>
  );
};
