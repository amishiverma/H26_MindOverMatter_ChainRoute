import React, { useState } from 'react';
import { ArrowUpRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

type TimeFilter = '1 year' | '6 month' | '3-month' | '1 month';

interface MainBalanceChartProps {
  criticalCount?: number;
  warningCount?: number;
  safeCount?: number;
  totalPackages?: number;
}

export const MainBalanceChart: React.FC<MainBalanceChartProps> = ({
  criticalCount = 0,
  warningCount = 0,
  safeCount = 0,
  totalPackages = 0,
}) => {
  const [filter, setFilter] = useState<TimeFilter>('1 year');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const trustRating = totalPackages > 0 
    ? Math.max(10, Math.min(100, Math.round(((safeCount + warningCount * 0.5) / totalPackages) * 100))) 
    : 98.4;

  // Time datasets with codebase security index percentages
  const datasets: Record<TimeFilter, { labels: string[]; values: number[]; percent: string }> = {
    '1 year': {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      values: [82.4, 85.1, 84.0, 88.5, 87.2, 91.0, 93.4, 92.8, 95.6, 94.9, 97.2, 98.4],
      percent: '↑ 2.92% Integrity',
    },
    '6 month': {
      labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
      values: [91.0, 92.5, 93.4, 94.0, 96.8, 98.4],
      percent: '↑ 3.84% Integrity',
    },
    '3-month': {
      labels: ['Aug', 'Sep', 'Oct'],
      values: [94.0, 96.2, 98.4],
      percent: '↑ 1.75% Integrity',
    },
    '1 month': {
      labels: ['W1', 'W2', 'W3', 'W4'],
      values: [96.8, 97.4, 98.0, 98.4],
      percent: '↑ 0.98% Integrity',
    },
  };

  const currentData = datasets[filter];
  const maxVal = 100;
  const minVal = 75;

  // SVG dimensions
  const svgWidth = 680;
  const svgHeight = 220;
  const padX = 24;
  const padY = 28;

  // Compute points
  const points = currentData.values.map((v, i) => {
    const x = padX + (i / (currentData.values.length - 1)) * (svgWidth - 2 * padX);
    const y = svgHeight - padY - ((v - minVal) / (maxVal - minVal)) * (svgHeight - 2 * padY);
    return { x, y, val: v, label: currentData.labels[i] };
  });

  // Construct smooth bezier SVG curve
  const curvePath = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cpX1 = prev.x + (pt.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (pt.x - prev.x) / 2;
    const cpY2 = pt.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pt.x} ${pt.y}`;
  }, '');

  const areaPath = `${curvePath} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`;

  return (
    <div className="rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_12px_32px_rgba(0,0,0,0.5)] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden h-full">
      {/* Top subtle highlight reflection */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
      
      {/* Top Header: Codebase Security Index Title + Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2">
        <div>
          <span className="text-xs font-sans text-stone-400 block tracking-wide font-medium">
            Codebase Security Index
          </span>
          <div className="flex items-baseline space-x-3 mt-1.5 flex-wrap gap-y-1">
            <span className="text-3xl sm:text-4xl font-sans font-extrabold text-white tracking-tight">
              {trustRating}%
            </span>
            <span className="text-sm font-sans font-medium bg-gradient-to-r from-emerald-400 via-teal-300 to-lime-300 bg-clip-text text-transparent">
              Trust Rating
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 text-xs font-sans font-semibold border border-emerald-800/40">
              <span>{currentData.percent}</span>
            </span>
          </div>
          <span className="text-[11px] text-stone-400 font-sans mt-1.5 block">
            {totalPackages > 0 
              ? `${totalPackages} Packages Audited • ${criticalCount} Critical, ${warningCount} Warning, ${safeCount} Safe`
              : '2,847 Packages Audited • Zero-Day Defense Verified'}
          </span>
        </div>

        {/* Time Filter Pills matching the reference image */}
        <div className="inline-flex items-center p-1 rounded-full bg-black/40 border border-white/10 self-start sm:self-auto backdrop-blur-md">
          {(['1 year', '6 month', '3-month', '1 month'] as TimeFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setFilter(tab);
                setHoveredPoint(null);
              }}
              className={`px-3 py-1 rounded-full text-xs font-sans transition-all duration-200 capitalize ${
                filter === tab
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold border border-white/20 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Wave Chart */}
      <div className="relative w-full h-52 sm:h-56 mt-4">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="warmGlowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.42" />
              <stop offset="50%" stopColor="#dc2626" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity="0.02" />
            </linearGradient>
            <filter id="redLineGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Under Area Fill - Rich & Bold Gradient */}
          <path d={areaPath} fill="url(#warmGlowGradient)" />

          {/* Bold, Sharp Warning Red Bezier Stroke Line */}
          <path
            d={curvePath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#redLineGlow)"
            className="opacity-100"
          />

          {/* Interactive Data Points (Solid Red Nodes with High-Contrast Dark Border) */}
          {points.map((pt, i) => {
            const isHovered = hoveredPoint === i;
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4.5}
                  fill={isHovered ? '#ffffff' : '#ef4444'}
                  stroke="#0b0d0c"
                  strokeWidth="2.5"
                  className="transition-all duration-150 drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint !== null && (
          <div
            className="absolute -top-3 pointer-events-none rounded-xl bg-[#141614] border border-stone-800 px-3 py-1.5 text-xs shadow-xl z-20 font-sans transform -translate-x-1/2"
            style={{
              left: `${(points[hoveredPoint].x / svgWidth) * 100}%`,
            }}
          >
            <span className="text-stone-400 text-[11px] block font-sans">
              {points[hoveredPoint].label} 2026 Audit
            </span>
            <span className="text-stone-100 font-bold">
              {points[hoveredPoint].val}% Security Rating
            </span>
          </div>
        )}
      </div>

      {/* Month Label Indicators along bottom */}
      <div className="flex items-center justify-between px-2 pt-2 border-t border-stone-800 text-[11px] font-sans text-stone-500">
        {points.map((pt, i) => (
          <span
            key={i}
            className={`transition-colors ${hoveredPoint === i ? 'text-lime-400 font-semibold' : ''}`}
          >
            {pt.label}
          </span>
        ))}
      </div>

    </div>
  );
};
