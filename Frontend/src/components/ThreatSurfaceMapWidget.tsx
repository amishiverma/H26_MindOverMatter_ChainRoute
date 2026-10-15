import React, { useState } from 'react';
import { Network, Maximize2, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

interface ThreatSurfaceMapWidgetProps {
  onOpenSurfaceMap?: () => void;
  onSelectNode?: (name: string) => void;
}

interface PreviewNode {
  id: string;
  name: string;
  x: number;
  y: number;
  r: number;
  risk: number;
  color: string;
  glow: string;
  status: 'critical' | 'high' | 'medium' | 'safe';
}

export const ThreatSurfaceMapWidget: React.FC<ThreatSurfaceMapWidgetProps> = ({
  onOpenSurfaceMap,
  onSelectNode,
}) => {
  const [hoveredNode, setHoveredNode] = useState<PreviewNode | null>(null);

  const nodes: PreviewNode[] = [
    {
      id: 'core',
      name: '@chainroute/core',
      x: 170,
      y: 95,
      r: 10,
      risk: 12,
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)',
      status: 'safe',
    },
    {
      id: 'event-stream',
      name: 'event-stream-patch',
      x: 270,
      y: 55,
      r: 8,
      risk: 94,
      color: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.5)',
      status: 'critical',
    },
    {
      id: 'liblzma',
      name: 'liblzma-native',
      x: 75,
      y: 125,
      r: 8,
      risk: 88,
      color: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.5)',
      status: 'critical',
    },
    {
      id: 'ansi',
      name: 'ansi-colors-turbo',
      x: 245,
      y: 140,
      r: 7,
      risk: 58,
      color: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.4)',
      status: 'medium',
    },
    {
      id: 'react-dom',
      name: 'react-dom-renderer',
      x: 100,
      y: 50,
      r: 7,
      risk: 18,
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.3)',
      status: 'safe',
    },
    {
      id: 'socket',
      name: 'raw-socket-tunnel',
      x: 185,
      y: 160,
      r: 7,
      risk: 76,
      color: '#fb923c',
      glow: 'rgba(251, 146, 60, 0.4)',
      status: 'high',
    },
  ];

  const edges = [
    { from: 'core', to: 'event-stream', color: '#f43f5e' },
    { from: 'core', to: 'liblzma', color: '#f43f5e' },
    { from: 'core', to: 'ansi', color: '#f59e0b' },
    { from: 'core', to: 'react-dom', color: '#10b981' },
    { from: 'core', to: 'socket', color: '#fb923c' },
    { from: 'react-dom', to: 'liblzma', color: '#334155' },
    { from: 'ansi', to: 'event-stream', color: '#334155' },
  ];

  return (
    <div className="rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_12px_32px_rgba(0,0,0,0.5)] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden h-full group">
      {/* Top subtle highlight reflection */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

      {/* Header: Title + Status Pill */}
      <div>
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-sans text-stone-400 block font-medium">
                Threat Surface Map
              </span>
              <span className="text-sm font-sans font-bold text-white tracking-tight">
                Autonomous DAG Vector Analysis
              </span>
            </div>
          </div>

          {/* Live Scan Active Pill */}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-[11px] font-sans font-semibold text-emerald-400 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Scan Active</span>
          </div>
        </div>

        {/* Real-time Severity Threat Counters (4 Pills) */}
        <div className="grid grid-cols-4 gap-2 mt-2 font-sans">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
            <span className="text-[10px] text-stone-400 block uppercase font-medium">Critical</span>
            <span className="text-base font-bold text-rose-400">1</span>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <span className="text-[10px] text-stone-400 block uppercase font-medium">High</span>
            <span className="text-base font-bold text-amber-400">2</span>
          </div>
          <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
            <span className="text-[10px] text-stone-400 block uppercase font-medium">Medium</span>
            <span className="text-base font-bold text-yellow-400">5</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-[10px] text-stone-400 block uppercase font-medium">Low</span>
            <span className="text-base font-bold text-emerald-400">42</span>
          </div>
        </div>
      </div>

      {/* Interactive 3D/Glass Network Node Preview */}
      <div className="relative my-3 rounded-2xl bg-black/40 border border-white/5 p-2 overflow-hidden h-44 sm:h-48 flex items-center justify-center">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.06)_0%,_transparent_70%)] pointer-events-none" />

        <svg
          viewBox="0 0 340 190"
          className="w-full h-full overflow-visible select-none"
        >
          {/* Orbital Rings */}
          <ellipse
            cx="170"
            cy="95"
            rx="120"
            ry="60"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />
          <ellipse
            cx="170"
            cy="95"
            rx="75"
            ry="38"
            fill="none"
            stroke="rgba(16,185,129,0.12)"
          />

          {/* Connection Lines */}
          {edges.map((e, idx) => {
            const fromNode = nodes.find((n) => n.id === e.from);
            const toNode = nodes.find((n) => n.id === e.to);
            if (!fromNode || !toNode) return null;

            return (
              <line
                key={idx}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={e.color}
                strokeWidth={e.color === '#334155' ? '1' : '1.5'}
                strokeOpacity={e.color === '#334155' ? '0.3' : '0.6'}
                strokeDasharray={e.color === '#f43f5e' ? '4 2' : undefined}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isHovered = hoveredNode?.id === node.id;
            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onSelectNode && onSelectNode(node.name)}
                className="cursor-pointer transition-transform"
              >
                {/* Glow ring */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r + (isHovered ? 8 : 4)}
                  fill={node.glow}
                  className="transition-all duration-200"
                />
                {/* Main node sphere */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  fill={node.color}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeOpacity="0.8"
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip on Hover */}
        {hoveredNode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-[#121412]/95 border border-white/10 text-xs font-sans text-white shadow-xl backdrop-blur-md pointer-events-none z-20 flex items-center space-x-2">
            <span className="font-semibold text-emerald-300">{hoveredNode.name}</span>
            <span className="text-stone-500">•</span>
            <span
              className={`font-bold ${
                hoveredNode.status === 'critical'
                  ? 'text-rose-400'
                  : hoveredNode.status === 'high'
                  ? 'text-amber-400'
                  : hoveredNode.status === 'medium'
                  ? 'text-yellow-400'
                  : 'text-emerald-400'
              }`}
            >
              Risk: {hoveredNode.risk}/100
            </span>
          </div>
        )}
      </div>

      {/* Footer / Expand Button */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs font-sans text-stone-400">
          7-Tier Recursive AST Engine
        </span>
        <button
          onClick={onOpenSurfaceMap}
          className="flex items-center space-x-1.5 text-xs font-sans font-semibold text-emerald-400 hover:text-emerald-300 transition-colors group/btn"
        >
          <span>Expand Surface Map</span>
          <Maximize2 className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" />
        </button>
      </div>
    </div>
  );
};
