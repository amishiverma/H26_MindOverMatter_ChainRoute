import React, { useState } from 'react';
import { Activity, TrendingDown } from 'lucide-react';
import { mockTrendData } from '../data/mockData';
import { ScanHistoryEntry } from '../types';

type FilterPeriod = '30 Days' | '6 Months' | '1 Year';

interface AnalyticsChartProps {
  history?: ScanHistoryEntry[];
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ history = [] }) => {
  const [period, setPeriod] = useState<FilterPeriod>('30 Days');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // If history is provided and has items, use latest scan stats to inform metric cards
  const latestScan = history.length > 0 ? history[0] : null;
  const data = mockTrendData[period];

  // SVG dimensions
  const width = 640;
  const height = 240;
  const paddingX = 45;
  const paddingY = 35;

  const maxRisk = 100;

  // Calculate points
  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - (d.riskScore / maxRisk) * (height - 2 * paddingY);
    return { x, y, ...d };
  });

  // Construct SVG path string
  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  // Fill area path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const hoveredItem = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];

  const hasCriticalAlerts = (hoveredIndex !== null ? hoveredItem.anomalies : (latestScan ? latestScan.criticalCount : 2)) > 0;

  return (
    <div className="rounded-3xl bg-white/[0.06] backdrop-blur-xl border border-white/10 p-6 sm:p-7 flex flex-col justify-between h-full relative overflow-hidden shadow-2xl">
      
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
        <div>
          <span className="text-xs font-sans text-stone-400 block">Security Analytics</span>
          <h3 className="font-sans font-bold text-lg text-stone-100">
            Package Health &amp; Risk Score Progression
          </h3>
          <p className="text-xs text-stone-400 font-sans mt-0.5">
            Automated heuristic risk score reduction vs. zero-day incursions
          </p>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center space-x-1 p-1 rounded-full bg-white/[0.04] border border-white/10 self-start sm:self-auto backdrop-blur-md">
          {(['30 Days', '6 Months', '1 Year'] as FilterPeriod[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setPeriod(tab);
                setHoveredIndex(null);
              }}
              className={`px-3 py-1 rounded-full text-xs font-sans transition-all ${
                period === tab
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-3 gap-3 my-4 relative z-10 font-sans text-xs">
        <div className="p-3.5 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 shadow-sm">
          <span className="text-stone-400 block text-[10px] font-sans font-medium uppercase tracking-wider">CURRENT RISK INDEX</span>
          <span className="text-lg font-bold text-emerald-400 flex items-center gap-1 font-sans mt-0.5">
            {hoveredIndex !== null 
              ? hoveredItem.riskScore 
              : (latestScan ? latestScan.overallRiskScore : 28)}{' '}
            <span className="text-[10px] text-stone-400 font-sans">/ 100</span>
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 shadow-sm">
          <span className="text-stone-400 block text-[10px] font-sans font-medium uppercase tracking-wider">TOTAL SCANNED</span>
          <span className="text-lg font-bold text-stone-100 font-sans mt-0.5">
            {hoveredIndex !== null 
              ? hoveredItem.packages.toLocaleString() 
              : (latestScan ? latestScan.totalPackages.toLocaleString() : '2,847')}
          </span>
        </div>
        <div className={`p-3.5 rounded-2xl backdrop-blur-xl border shadow-sm transition-all ${
          hasCriticalAlerts
            ? 'bg-rose-950/25 border-rose-500/40 text-rose-300 shadow-[0_4px_20px_rgba(244,63,94,0.15)]'
            : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
        }`}>
          <span className="text-stone-400 block text-[10px] font-sans font-medium uppercase tracking-wider">CRITICAL ALERTS</span>
          <span className={`text-lg font-bold flex items-center gap-1 font-sans mt-0.5 ${
            hasCriticalAlerts ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {hoveredIndex !== null 
              ? hoveredItem.anomalies 
              : (latestScan ? latestScan.criticalCount : 2)}
          </span>
        </div>
      </div>

      {/* Interactive SVG Chart Canvas */}
      <div className="relative w-full h-52 flex items-center justify-center my-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="chartSageGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#84cc16" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3f6212" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = height - paddingY - (val / maxRisk) * (height - 2 * paddingY);
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="rgba(255,255,255,0.04)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-stone-500 font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill="url(#chartSageGradient)" />

          {/* Clean Line (Zero Glow) */}
          <path
            d={pathD}
            fill="none"
            stroke="#84cc16"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                className="cursor-pointer"
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 3.5}
                  fill={pt.riskScore > 70 ? '#f43f5e' : pt.riskScore > 30 ? '#84cc16' : '#65a30d'}
                  stroke="#121412"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />
                {/* X-axis labels */}
                <text
                  x={pt.x}
                  y={height - 10}
                  textAnchor="middle"
                  className={`text-[9px] font-sans transition-colors ${
                    isHovered ? 'fill-lime-400 font-bold' : 'fill-stone-500'
                  }`}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && (
          <div
            className="absolute pointer-events-none -top-2 rounded-xl bg-[#141614] border border-stone-800 p-2.5 shadow-xl text-xs font-sans"
            style={{
              left: `${Math.min(Math.max((points[hoveredIndex].x / width) * 100, 15), 85)}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-white font-bold">{points[hoveredIndex].label}</div>
            <div className="text-emerald-400 font-sans font-medium">Risk: {points[hoveredIndex].riskScore}/100</div>
            <div className="text-stone-400 text-[11px] font-sans">Packages: {points[hoveredIndex].packages}</div>
          </div>
        )}
      </div>

      {/* Bottom Health Indicator */}
      <div className="flex items-center justify-between pt-3 border-t border-stone-800 text-xs font-sans text-stone-400">
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <TrendingDown className="w-3.5 h-3.5" />
          -48% Risk Reduction in Last 30 Days
        </span>
        <span className="text-[11px] text-stone-400 font-sans font-medium">
          Heuristic Recursion Active
        </span>
      </div>

    </div>
  );
};
