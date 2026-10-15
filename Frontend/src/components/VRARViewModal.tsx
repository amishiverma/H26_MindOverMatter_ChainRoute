import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCw, Network, ShieldAlert, ShieldCheck } from 'lucide-react';

export interface AttackSurfaceModalProps {
  onClose: () => void;
  onSelectNodeByName?: (name: string) => void;
}

export type VRARViewModalProps = AttackSurfaceModalProps;

interface AttackSurfaceNode {
  name: string;
  version: string;
  risk: number;
  riskLevel: 'critical' | 'warning' | 'safe';
  riskLabel: string;
  category: string;
  color: string;
  darkColor: string;
  glowColor: string;
  summary: string;
  astAnalysis: string;
  provenance: string;
}

// Pre-computed per-node orbit distances (alternating two radii)
const ORBIT_DISTANCES = [165, 210, 165, 210, 165];

export const AttackSurfaceModal: React.FC<AttackSurfaceModalProps> = ({ onClose, onSelectNodeByName }) => {
  const [angle, setAngle] = useState(24);
  // clickedNode = explicitly clicked (persists on mouse leave)
  // hoveredNodeName = hover-only (clears on mouse leave)
  const [clickedNode, setClickedNode] = useState<string | null>(null);
  const [hoveredNodeName, setHoveredNodeName] = useState<string | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const angleRef = useRef(24);

  // Telemetry box shows for hovered OR clicked node
  const activeVectorNode = hoveredNodeName ?? clickedNode;

  // Smooth autonomous orbit — use ref so tick never re-creates interval
  useEffect(() => {
    if (!isAutoRotating) return;
    const interval = setInterval(() => {
      angleRef.current = (angleRef.current + 0.3) % 360;
      setAngle(angleRef.current);
    }, 50);
    return () => clearInterval(interval);
  }, [isAutoRotating]);

  const vectorNodes: AttackSurfaceNode[] = [
    {
      name: '@traceroot/core',
      version: 'v2.4.0',
      risk: 12,
      riskLevel: 'safe',
      riskLabel: 'Verified Hub',
      category: 'Root Anchor',
      color: '#10b981',
      darkColor: '#064e3b',
      glowColor: 'rgba(16, 185, 129, 0.55)',
      summary: 'Clean verified root module. Cryptographic signing with developer GPG keys and SLSA Level 3 build provenance.',
      astAnalysis: 'AST traversal verified: zero dynamic eval hooks, unverified network egress, or bytecode tampering found.',
      provenance: 'SLSA Level 3 • GitHub Actions OIDC',
    },
    {
      name: 'event-stream-patch',
      version: 'v4.0.1',
      risk: 94,
      riskLevel: 'critical',
      riskLabel: 'Zero-Day Exploit',
      category: 'Transitive (Tier 3)',
      color: '#f43f5e',
      darkColor: '#881337',
      glowColor: 'rgba(244, 63, 94, 0.6)',
      summary: 'Sudden maintainer transfer with obfuscated crypto wallet stealer in postinstall lifecycle.',
      astAnalysis: 'High-entropy Base64 bytecode injected into test/data.json exfiltrating private tokens to foreign hosts.',
      provenance: 'Compromised Maintainer Account',
    },
    {
      name: 'liblzma-native-async',
      version: 'v5.6.1-rc2',
      risk: 88,
      riskLevel: 'critical',
      riskLabel: 'Malware Backdoor',
      category: 'Native Addon',
      color: '#e11d48',
      darkColor: '#4c0519',
      glowColor: 'rgba(225, 29, 72, 0.6)',
      summary: 'M4 macro obfuscation tampering with system authentication symbol table.',
      astAnalysis: 'Build script modifies IFUNC symbol resolution during compilation to bypass RSA verification hooks.',
      provenance: 'State-Sponsored Backdoor Fingerprint',
    },
    {
      name: 'ansi-colors-turbo',
      version: 'v1.4.2',
      risk: 58,
      riskLevel: 'warning',
      riskLabel: 'Dormant Trigger',
      category: 'Direct Dependency',
      color: '#f59e0b',
      darkColor: '#78350f',
      glowColor: 'rgba(245, 158, 11, 0.55)',
      summary: 'Dormant infinite loop trigger discovered in terminal string escape utility.',
      astAnalysis: 'Code introduces deliberate CPU exhaustion condition triggered by terminal escape sequence recursion.',
      provenance: 'Maintainer Protest Denial-of-Service',
    },
    {
      name: 'react-dom-renderer',
      version: 'v18.3.1',
      risk: 18,
      riskLevel: 'safe',
      riskLabel: 'Vendor Library',
      category: 'Direct Dependency',
      color: '#10b981',
      darkColor: '#064e3b',
      glowColor: 'rgba(16, 185, 129, 0.5)',
      summary: 'Official vendor release. Provenance verified against Meta release engineering pipeline.',
      astAnalysis: 'Clean AST syntax trees. Zero anomalous runtime mutation or unverified outbound sockets.',
      provenance: 'Official Meta GPG Key',
    },
    {
      name: 'elliptic-curve-fast',
      version: 'v2.1.0',
      risk: 42,
      riskLevel: 'warning',
      riskLabel: 'Side-Channel Leak',
      category: 'Direct Dependency',
      color: '#14b8a6',
      darkColor: '#134e4a',
      glowColor: 'rgba(20, 184, 166, 0.55)',
      summary: 'Timing variance detected in cryptographic scalar multiplication routine.',
      astAnalysis: 'Side-channel latency variance detected. Cryptographic signatures can leak private keys under timing analysis.',
      provenance: 'Verified Community Package',
    },
  ];

  // Telemetry box data — driven by hover or click
  const currentNode = activeVectorNode
    ? (vectorNodes.find((n) => n.name === activeVectorNode) ?? null)
    : null;

  // Orbiting nodes = all except root anchor (index 0, @traceroot/core)
  const orbitingNodes = vectorNodes.slice(1);

  const handleNodeClick = (name: string) => {
    // Toggle: clicking the same ball again deselects it
    setClickedNode(prev => prev === name ? null : name);
  };

  const handleMouseEnter = (name: string) => {
    setHoveredNodeName(name);
  };

  const handleMouseLeave = () => {
    // Clear hover — box hides unless a click is locked
    setHoveredNodeName(null);
  };

  const handleCanvasClick = () => {
    // Clicking empty canvas clears the click lock
    setClickedNode(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md">
      <div 
        className="relative w-full max-w-5xl h-[86vh] rounded-3xl bg-[#0c0a09] border border-white/10 flex flex-col justify-between overflow-hidden shadow-2xl"
        onMouseEnter={() => setIsAutoRotating(false)}
        onMouseLeave={() => setIsAutoRotating(true)}
      >
        
        {/* Top Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-white/10 relative z-20 bg-[#0c0a09]/95 backdrop-blur-md">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-emerald-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-sans font-semibold text-lg text-white tracking-tight">
                Autonomous Supply Chain Attack Surface
              </h2>
              <p className="text-xs font-sans text-stone-400 mt-0.5">
                Transitive dependency topology matrix and recursive threat vector analysis
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAngle((a) => a + 30)}
              className="p-2 rounded-full bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 text-stone-300 hover:text-white transition-colors"
              title="Rotate Vector Grid"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/[0.04] border border-white/10 hover:border-white/20 text-stone-300 hover:text-white transition-colors"
              title="Close Matrix"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3D Visual Canvas Area */}
        <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden bg-[#0c0a09]" onClick={handleCanvasClick}>
          
          {/* Subtle Ambient Radial Backlight */}
          <div className="absolute w-[600px] h-[600px] rounded-full bg-emerald-950/15 blur-3xl pointer-events-none" />

          {/* Minimalist Radar & Orbital Depth Rings */}
          <div className="absolute w-[640px] h-[640px] rounded-full border border-stone-800/40 pointer-events-none animate-spin" style={{ animationDuration: '100s' }} />
          <div className="absolute w-[470px] h-[470px] rounded-full border border-stone-800/60 pointer-events-none" />
          <div className="absolute w-[310px] h-[310px] rounded-full border border-emerald-900/30 pointer-events-none" />
          <div className="absolute w-[170px] h-[170px] rounded-full border border-emerald-900/20 pointer-events-none" />

          {/* Radar Axis Lines */}
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-stone-800/35 to-transparent pointer-events-none" />
          <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-stone-800/35 to-transparent pointer-events-none" />

          {/* Central 3D Plane — no pointer events on the rotating wrapper itself */}
          <div
            className="relative w-[500px] h-[500px] flex items-center justify-center"
            style={{
              transform: `perspective(900px) rotateX(56deg) rotateZ(${angle}deg)`,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Grid Floor */}
            <div className="absolute inset-0 border border-emerald-900/20 sage-grid opacity-40 rounded-full pointer-events-none" />

            {/* SVG Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 500">
              <defs>
                {orbitingNodes.map((node) => (
                  <linearGradient key={`grad-${node.name}`} id={`grad-${node.name}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor={node.color} stopOpacity="0.75" />
                  </linearGradient>
                ))}
              </defs>
              {orbitingNodes.map((node, index) => {
                const rad = (angle + index * (360 / orbitingNodes.length)) * (Math.PI / 180);
                const dist = ORBIT_DISTANCES[index] ?? 165;
                const px = 250 + Math.cos(rad) * dist;
                const py = 250 + Math.sin(rad) * dist;
                const isActive = activeVectorNode === node.name;
                return (
                  <g key={`line-${node.name}`}>
                    <line x1="250" y1="250" x2={px} y2={py}
                      stroke={`url(#grad-${node.name})`}
                      strokeWidth={isActive ? 2 : 1.2}
                      strokeDasharray={isActive ? 'none' : '4 4'}
                      strokeOpacity={isActive ? 0.9 : 0.4}
                    />
                    {isActive && (
                      <circle cx={(250 + px) / 2} cy={(250 + py) / 2} r="3" fill={node.color} className="animate-ping" />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* ── CENTER ROOT NODE
                 CRITICAL FIX: position via left/top/margin NOT transform:translate
                 so that counter-rotate scale NEVER moves the anchor point.       */}
            <div
              className="absolute cursor-pointer flex items-center justify-center"
              style={{
                // 70×70 hit area — bigger than sphere at max scale so cursor never exits
                width: '70px', height: '70px',
                left: '50%', top: '50%',
                marginLeft: '-35px', marginTop: '-35px',
                transform: `rotateZ(-${angle}deg) rotateX(-56deg)`,
                transformStyle: 'preserve-3d',
                zIndex: 20,
              }}
              onClick={(e) => { e.stopPropagation(); handleNodeClick(vectorNodes[0].name); }}
              onMouseEnter={() => handleMouseEnter(vectorNodes[0].name)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="absolute -inset-2.5 rounded-full border border-emerald-500/30 animate-pulse pointer-events-none" />
              <div className="absolute -inset-5 rounded-full border border-emerald-500/15 pointer-events-none" />
              {/* Scale ONLY the inner sphere div — position container is never scaled */}
              <div
                className="w-14 h-14 rounded-full relative"
                style={{
                  background: 'radial-gradient(circle at 30% 28%, #ffffff 0%, #34d399 25%, #059669 65%, #022c22 100%)',
                  boxShadow: hoveredNodeName === vectorNodes[0].name
                    ? '0 0 32px rgba(16,185,129,0.75), inset 0 0 12px rgba(255,255,255,0.7), inset -2px -4px 8px rgba(0,0,0,0.8)'
                    : '0 0 24px rgba(16,185,129,0.6), inset 0 0 10px rgba(255,255,255,0.6), inset -2px -4px 8px rgba(0,0,0,0.8)',
                  transform: hoveredNodeName === vectorNodes[0].name ? 'scale(1.18)' : 'scale(1)',
                  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                }}
              >
                <div className="absolute top-2 left-2.5 w-3 h-2 rounded-full bg-white/80 blur-[0.6px] -rotate-45 pointer-events-none" />
              </div>
            </div>

            {/* ── ORBITING NODES
                 CRITICAL FIX: position via left/top/margin NOT transform:translate
                 Scale applied ONLY to inner sphere div — orbital coordinates never shift. */}
            {orbitingNodes.map((node, index) => {
              const rad = (angle + index * (360 / orbitingNodes.length)) * (Math.PI / 180);
              const dist = ORBIT_DISTANCES[index] ?? 165;
              const px = Math.cos(rad) * dist;
              const py = Math.sin(rad) * dist;
              const isActive = activeVectorNode === node.name;
              const isHovered = hoveredNodeName === node.name;

              return (
                <div
                  key={node.name}
                  className="absolute cursor-pointer flex items-center justify-center"
                  style={{
                    // 54×54 hit area — bigger than 34px sphere at max scale(1.22) ≈ 41.5px
                    // so the cursor never exits the DOM box during scale animation (no flicker)
                    width: '54px', height: '54px',
                    left: '50%', top: '50%',
                    marginLeft: `${px - 27}px`,
                    marginTop: `${py - 27}px`,
                    transform: `rotateZ(-${angle}deg) rotateX(-56deg)`,
                    transformStyle: 'preserve-3d',
                    zIndex: 10,
                  }}
                  onClick={(e) => { e.stopPropagation(); handleNodeClick(node.name); }}
                  onMouseEnter={() => handleMouseEnter(node.name)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Sphere — 34×34, centered inside the 54×54 hit area */}
                  <div
                    style={{
                      width: '34px', height: '34px',
                      borderRadius: '50%',
                      position: 'relative',
                      flexShrink: 0,
                      background: `radial-gradient(circle at 30% 28%, #ffffff 0%, ${node.color} 32%, ${node.darkColor} 75%, #0a0a0a 100%)`,
                      boxShadow: isHovered || isActive
                        ? `0 0 26px ${node.glowColor}, inset 0 0 10px rgba(255,255,255,0.7), inset -2px -3px 6px rgba(0,0,0,0.85)`
                        : `0 0 14px ${node.glowColor}, inset 0 0 6px rgba(255,255,255,0.45), inset -2px -3px 5px rgba(0,0,0,0.75)`,
                      transform: isHovered ? 'scale(1.22)' : 'scale(1)',
                      transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                    }}
                  >
                    <div className="absolute top-1.5 left-2 w-2 h-1.5 rounded-full bg-white/90 blur-[0.5px] -rotate-45 pointer-events-none" />
                    <div className="absolute bottom-1 w-3.5 h-1 rounded-full opacity-70 blur-[0.8px] pointer-events-none" style={{ backgroundColor: node.color, left: '50%', transform: 'translateX(-50%)' }} />
                    {(isActive || isHovered) && (
                      <div className="absolute -inset-2 rounded-full border animate-ping pointer-events-none opacity-40" style={{ borderColor: node.color }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── SINGLE UNIFIED TOOLTIP LAYER (2D, above all 3D transforms) ─────── */}
          {/* Only ONE card ever renders — no duplicates possible */}
          {hoveredNodeName && (() => {
            const node = vectorNodes.find(n => n.name === hoveredNodeName);
            if (!node) return null;

            if (node.name === vectorNodes[0].name) {
              // Root node tooltip — placed to the right of center
              return (
                <div className="absolute pointer-events-none z-50" style={{ left: 'calc(50% + 52px)', top: 'calc(50% - 20px)' }}>
                  <div className="px-3.5 py-2.5 rounded-2xl backdrop-blur-xl border border-emerald-500/40 bg-stone-900/95 shadow-2xl min-w-[170px]">
                    <div className="flex items-center justify-between gap-2.5">
                      <span className="font-sans font-semibold text-xs text-white tracking-tight">{node.name}</span>
                      <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">{node.riskLabel}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-sans text-stone-400 mt-1">
                      <span>{node.category}</span>
                      <span className="font-semibold text-emerald-400">{node.risk}/100</span>
                    </div>
                  </div>
                </div>
              );
            }

            // Orbiting node tooltip — project 3D → 2D screen coords
            const idx = orbitingNodes.findIndex(n => n.name === node.name);
            const rad = (angle + idx * (360 / orbitingNodes.length)) * (Math.PI / 180);
            const dist = ORBIT_DISTANCES[idx] ?? 165;
            const worldX = Math.cos(rad) * dist;
            const worldY = Math.sin(rad) * dist;
            const degX = 56 * (Math.PI / 180);
            const screenX = worldX;
            const screenY = worldY * Math.cos(degX);
            const isLeft = screenX < 0;

            return (
              <div
                className="absolute pointer-events-none z-50"
                style={{
                  left: `calc(50% + ${screenX + (isLeft ? -190 : 24)}px)`,
                  top: `calc(50% + ${screenY - 20}px)`,
                }}
              >
                <div
                  className="px-3.5 py-2.5 rounded-2xl backdrop-blur-xl border shadow-2xl min-w-[170px] bg-stone-900/95"
                  style={{ borderColor: node.color, boxShadow: `0 10px 28px rgba(0,0,0,0.7), 0 0 16px ${node.glowColor}` }}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="font-sans font-semibold text-xs text-white tracking-tight truncate max-w-[110px]">{node.name}</span>
                    <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full border whitespace-nowrap"
                      style={{ color: node.color, backgroundColor: `${node.color}15`, borderColor: `${node.color}35` }}>
                      {node.riskLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-sans text-stone-400 mt-1 gap-2">
                    <span className="truncate">{node.category}</span>
                    <span className="font-semibold" style={{ color: node.color }}>{node.risk}/100</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── VECTOR TARGET LOCK — hidden until user interacts with a node ── */}
          {currentNode && (
          <div className="absolute top-6 left-6 p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] max-w-sm text-xs pointer-events-none">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-emerald-400 font-sans font-semibold flex items-center gap-1.5">
                {currentNode.riskLevel === 'safe' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4" style={{ color: currentNode.color }} />
                )}
                <span>Vector Target Lock</span>
              </div>
              <span
                className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full border"
                style={{ color: currentNode.color, backgroundColor: `${currentNode.color}18`, borderColor: `${currentNode.color}40` }}
              >
                {currentNode.riskLabel}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-white font-sans font-bold text-sm tracking-tight truncate">{currentNode.name}</div>
              <span className="text-stone-400 font-sans text-[11px]">{currentNode.version}</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-sans">
                <span className="text-stone-400">Threat Index</span>
                <span className="font-semibold" style={{ color: currentNode.color }}>{currentNode.risk} / 100</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${currentNode.risk}%`, backgroundColor: currentNode.color }} />
              </div>
            </div>
            <p className="text-stone-300 text-xs font-sans mt-2.5 leading-relaxed">{currentNode.astAnalysis}</p>
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-sans text-stone-400">
              <span className="truncate max-w-[180px]">{currentNode.provenance}</span>
              <span className="font-medium text-stone-300">{currentNode.category}</span>
            </div>
            {onSelectNodeByName && (
              <button
                onClick={() => onSelectNodeByName(currentNode.name)}
                className="w-full mt-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-stone-200 border border-white/10 text-xs font-sans font-medium flex items-center justify-center gap-1.5 transition-colors pointer-events-auto"
              >
                <span>Inspect in Threat Audit Drawer</span>
                <span className="text-emerald-400">→</span>
              </button>
            )}
          </div>
          )}

          {/* Top-Right Telemetry & DevSecOps HUD */}
          <div className="absolute top-6 right-6 p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] font-sans text-xs text-stone-300 space-y-2 min-w-[220px]">
            <div className="text-stone-400 flex items-center justify-between text-[11px]">
              <span>Analysis Protocol:</span>
              <span className="text-stone-200 font-medium">Dynamic AST Vector</span>
            </div>
            <div className="text-stone-400 flex items-center justify-between text-[11px]">
              <span>Traversal Depth:</span>
              <span className="text-stone-200 font-medium">7-Tier Recursive</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-stone-400">Threat Status:</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Vectors Mapped
              </span>
            </div>
            <div className="pt-2 border-t border-white/10 text-[11px] text-stone-400 flex items-center justify-between">
              <span>Monitored Nodes:</span>
              <span className="text-stone-200 font-medium">6 Active Vectors</span>
            </div>
            <div className="text-[11px] text-stone-400 flex items-center justify-between">
              <span>Security Isolation:</span>
              <span className="text-emerald-400 font-medium">Sandbox Enforced</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="px-6 py-4 bg-[#0c0a09]/95 backdrop-blur-md border-t border-white/10 flex items-center justify-between text-xs text-stone-400 relative z-20">
          <span className="font-sans text-stone-400">
            Interactive Topology Map: Hover or click nodes to lock vector telemetry • Orbit: {Math.round(angle)}°
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-stone-100 font-sans font-medium text-xs border border-white/15 transition-all shadow-sm"
          >
            Close Matrix
          </button>
        </div>

      </div>
    </div>
  );
};

export const VRARViewModal = AttackSurfaceModal;
