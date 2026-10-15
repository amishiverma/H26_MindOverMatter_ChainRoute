import React, { useState } from 'react';
import { Network, ZoomIn, ZoomOut, RefreshCw, Search, Filter } from 'lucide-react';
import { DependencyNode, DependencyEdge } from '../types';

interface DependencyGraphProps {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  onSelectNode: (node: DependencyNode) => void;
  selectedNodeId?: string;
  isFullScreen?: boolean;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  nodes,
  edges,
  onSelectNode,
  selectedNodeId,
  isFullScreen = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'safe'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Position nodes spatially for a clean DAG layout
  const nodePositions: Record<string, { x: number; y: number }> = {
    'root-pkg': { x: 300, y: 70 },
    'pkg-react-dom': { x: 120, y: 170 },
    'pkg-zod-schema': { x: 280, y: 190 },
    'pkg-axios-http': { x: 480, y: 170 },
    'pkg-colors-ext': { x: 180, y: 290 },
    'pkg-crypto-utils': { x: 360, y: 300 },
    'pkg-event-stream': { x: 500, y: 310 },
    'pkg-xz-native': { x: 140, y: 410 },
  };

  const filteredNodes = nodes.filter((node) => {
    if (filterSeverity === 'critical' && node.status !== 'critical') return false;
    if (filterSeverity === 'warning' && node.status !== 'warning') return false;
    if (filterSeverity === 'safe' && node.status !== 'safe') return false;
    if (searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

  return (
    <div className={`rounded-3xl bg-[#161412]/80 backdrop-blur-xl border border-white/5 flex flex-col relative overflow-hidden shadow-2xl transition-all ${
      isFullScreen ? 'h-[80vh] p-6' : 'h-full p-6'
    }`}>
      {/* Top Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800 relative z-20">
        <div>
          <span className="text-xs font-sans text-stone-400 block">Supply Chain DAG</span>
          <h3 className="font-sans font-bold text-base sm:text-lg text-stone-100 flex items-center gap-2">
            Interactive Dependency Topology
            <span className="text-[10px] font-sans px-2.5 py-0.5 rounded-full bg-[#161a15] text-lime-400 border border-lime-800/40 font-medium">
              Click node to audit
            </span>
          </h3>
        </div>

        {/* Filter & Zoom controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Risk Filters */}
          <div className="flex items-center space-x-1 p-1 rounded-full bg-[#0e100f] border border-stone-800 text-xs font-sans">
            {(['all', 'critical', 'warning', 'safe'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterSeverity(lvl)}
                className={`px-3 py-1 rounded-full capitalize transition-all ${
                  filterSeverity === lvl
                    ? lvl === 'critical'
                      ? 'bg-rose-500 text-white font-medium'
                      : lvl === 'warning'
                      ? 'bg-amber-500 text-stone-950 font-semibold'
                      : lvl === 'safe'
                      ? 'bg-lime-600 text-stone-950 font-semibold'
                      : 'bg-gradient-to-r from-lime-600 via-emerald-700 to-stone-800 text-stone-100 font-semibold border border-lime-500/30'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center space-x-1 p-1 rounded-full bg-[#1e1b18] border border-white/5">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.15, 1.6))}
              className="p-1.5 rounded-full text-stone-400 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.15, 0.7))}
              className="p-1.5 rounded-full text-stone-400 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 rounded-full text-stone-400 hover:text-white transition-colors"
              title="Reset Zoom"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar within Graph */}
      <div className="my-3 relative z-20 max-w-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter node by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0e100f] border border-stone-800 rounded-full pl-8 pr-3 py-1.5 text-xs font-sans text-white placeholder-stone-500 focus:outline-none focus:border-lime-700/50"
          />
        </div>
      </div>

      {/* Graph Canvas Container */}
      <div className="relative flex-1 w-full min-h-[320px] bg-[#0b0d0c] rounded-2xl border border-stone-850 overflow-hidden p-4 flex items-center justify-center">
        
        {/* Scaled Graph Area */}
        <div
          className="relative transition-transform duration-200"
          style={{
            transform: `scale(${zoom})`,
            width: '640px',
            height: '460px',
          }}
        >
          {/* SVG Connector Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              <linearGradient id="edgeSageGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#84cc16" />
                <stop offset="100%" stopColor="#4d7c0f" />
              </linearGradient>
              <linearGradient id="edgeGlowRose" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#65a30d" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>

            {edges.map((edge, idx) => {
              const srcPos = nodePositions[edge.source];
              const tgtPos = nodePositions[edge.target];
              if (!srcPos || !tgtPos) return null;

              const isSourceVisible = filteredNodeIds.has(edge.source);
              const isTargetVisible = filteredNodeIds.has(edge.target);
              if (!isSourceVisible || !isTargetVisible) return null;

              const isHighRisk = edge.target === 'pkg-event-stream' || edge.target === 'pkg-xz-native';
              const isHighlighted = hoveredNodeId === edge.source || hoveredNodeId === edge.target;

              return (
                <g key={idx}>
                  <line
                    x1={srcPos.x + 60}
                    y1={srcPos.y + 24}
                    x2={tgtPos.x + 60}
                    y2={tgtPos.y + 24}
                    stroke={isHighRisk ? 'url(#edgeGlowRose)' : 'url(#edgeSageGradient)'}
                    strokeWidth={isHighlighted ? '2' : isHighRisk ? '1.8' : '1.2'}
                    strokeOpacity={isHighlighted ? 1 : isHighRisk ? 0.9 : 0.6}
                    strokeDasharray={isHighRisk ? '4 3' : undefined}
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive Nodes */}
          {filteredNodes.map((node) => {
            const pos = nodePositions[node.id] || { x: 300, y: 200 };
            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;
            const isCritical = node.status === 'critical';
            const isWarning = node.status === 'warning';

            return (
              <div
                key={node.id}
                onClick={() => onSelectNode(node)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                }}
                className={`group cursor-pointer select-none transition-all duration-200 transform ${
                  isHovered || isSelected ? 'scale-105 z-30' : 'z-10'
                }`}
              >
                <div
                  className={`relative w-44 rounded-2xl p-3.5 border transition-all ${
                    isCritical
                      ? isSelected
                        ? 'bg-[#181212] border-rose-500 shadow-lg'
                        : 'bg-[#141010] border-rose-500/60'
                      : isWarning
                      ? isSelected
                        ? 'bg-[#181612] border-amber-500 shadow-md'
                        : 'bg-[#141210] border-amber-500/50'
                      : isSelected
                      ? 'bg-[#161a15] border-lime-600 shadow-md'
                      : 'bg-[#141614] border-stone-800 hover:border-lime-700/50'
                  }`}
                >
                  {/* Top Node Pill */}
                  <div className="flex items-center justify-between text-[10px] font-sans mb-1.5">
                    <span className="text-stone-400 capitalize">
                      {node.category}
                    </span>
                    <span
                      className={`px-2 py-0.2 rounded-full font-bold ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-400'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-lime-500/20 text-lime-400'
                      }`}
                    >
                      {node.riskScore} Risk
                    </span>
                  </div>

                  {/* Node Name */}
                  <div className="font-sans text-xs font-bold text-stone-100 truncate group-hover:text-lime-400 transition-colors">
                    {node.name}
                  </div>
                  <div className="text-[10px] font-sans text-stone-400 truncate">
                    v{node.version}
                  </div>

                  {/* Bottom Indicator for CVE */}
                  <div className="mt-2 pt-1.5 border-t border-stone-800 flex items-center justify-between text-[10px] font-sans">
                    <span className="text-stone-400">
                      {node.cves.length > 0 ? `${node.cves.length} CVEs` : 'Clean AST'}
                    </span>
                    <span className={`font-semibold capitalize ${isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-lime-400'}`}>
                      {node.status}
                    </span>
                  </div>

                  {/* Indicator dot */}
                  {isCritical && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Legend / Status bar */}
      <div className="flex flex-wrap items-center justify-between pt-3 mt-2 border-t border-stone-800 text-xs font-sans text-stone-400">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-lime-500" />
            <span>&lt;30 Safe</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>31-69 Warning</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>70+ Critical Zero-Day</span>
          </span>
        </div>
        <span className="text-[11px] text-emerald-400 font-medium">
          Click any node to inspect Autonomous AI Threat Explanation
        </span>
      </div>

    </div>
  );
};
