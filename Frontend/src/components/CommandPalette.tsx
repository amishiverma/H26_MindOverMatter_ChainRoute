import React, { useState, useEffect } from 'react';
import { Search, X, Package, Shield, ExternalLink, ArrowRight, CornerDownLeft, Sparkles, FlaskConical } from 'lucide-react';
import { DependencyNode, ActiveTab } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: DependencyNode[];
  onSelectNode: (node: DependencyNode) => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  nodes,
  onSelectNode,
  onNavigateTab,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === 'Space') {
        e.preventDefault();
        // Toggle palette
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickNav = [
    { label: 'Overview Dashboard', tab: 'overview' as ActiveTab, icon: Shield },
    { label: 'Sandbox & Exit Capsule', tab: 'sandbox' as ActiveTab, icon: FlaskConical },
    { label: 'Interactive Dependency DAG', tab: 'graph' as ActiveTab, icon: Package },
    { label: 'Threat Analytics Matrix', tab: 'analytics' as ActiveTab, icon: Sparkles },
  ];

  const matchedNodes = nodes.filter(
    (n) =>
      n.name.toLowerCase().includes(query.toLowerCase()) ||
      n.cves.some((c) => c.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#121412] border border-stone-800 overflow-hidden shadow-2xl">
        
        {/* Search input */}
        <div className="flex items-center px-4 py-3.5 border-b border-stone-800 bg-[#0b0d0c]">
          <Search className="w-5 h-5 text-lime-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, package name, or CVE ID..."
            className="w-full bg-transparent text-sm font-sans text-stone-100 placeholder-stone-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline px-2 py-0.5 rounded-md bg-stone-850 border border-stone-800 text-[10px] font-mono text-stone-400">
            ESC to close
          </kbd>
        </div>

        {/* Content results */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          
          {/* Quick Nav Items */}
          {!query && (
            <div>
              <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                Quick Navigation
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        onNavigateTab(item.tab);
                        onClose();
                      }}
                      className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-[#0b0d0c] hover:bg-stone-900 border border-stone-800 hover:border-lime-700/50 text-left transition-all group"
                    >
                      <Icon className="w-4 h-4 text-lime-400 group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-medium text-stone-300 group-hover:text-stone-100">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Package Matches */}
          <div>
            <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
              Matched Packages ({matchedNodes.length})
            </div>
            <div className="space-y-1.5">
              {matchedNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => {
                    onSelectNode(node);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#0b0d0c] hover:bg-stone-900 border border-stone-800 hover:border-lime-700/50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className={`w-2 h-2 rounded-full ${
                      node.status === 'critical' ? 'bg-rose-500' :
                      node.status === 'warning' ? 'bg-amber-500' : 'bg-lime-500'
                    }`} />
                    <div>
                      <div className="text-xs font-semibold text-stone-200 group-hover:text-lime-300 transition-colors">
                        {node.name}
                      </div>
                      <div className="text-[11px] font-sans text-stone-400">
                        v{node.version} • {node.maintainer}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-md ${
                      node.status === 'critical' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                      node.status === 'warning' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                    }`}>
                      {node.riskScore} Risk
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-lime-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
