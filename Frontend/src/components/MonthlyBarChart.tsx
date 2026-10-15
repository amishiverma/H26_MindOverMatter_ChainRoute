import React, { useState } from 'react';
import { BarChart3, TrendingUp, ShieldAlert } from 'lucide-react';

export const MonthlyBarChart: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // Default October

  const data = [
    { month: 'May', value: 200, label: '200', count: 18 },
    { month: 'Jun', value: 340, label: '340', count: 24 },
    { month: 'Jul', value: 280, label: '280', count: 19 },
    { month: 'Aug', value: 420, label: '420', count: 31 },
    { month: 'Sep', value: 390, label: '390', count: 28 },
    { month: 'Oct', value: 500, label: '500', count: 42 },
  ];

  const maxVal = 550;

  return (
    <div className="rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_12px_32px_rgba(0,0,0,0.5)] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden h-full">
      {/* Top subtle highlight reflection */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div>
          <span className="text-xs font-sans text-stone-400 block font-medium">Monthly Threat Mitigations</span>
          <span className="text-sm font-sans font-bold text-white tracking-tight">Package Risk Sweeps</span>
        </div>
        <span className="inline-flex items-center space-x-1 text-xs font-sans text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 shadow-sm">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>+24.8% Swept</span>
        </span>
      </div>

      {/* Bar Chart Area with Soft Glowing Vertical Indicators */}
      <div className="flex-1 flex items-end justify-between gap-2.5 sm:gap-3 py-4 min-h-[160px]">
        {data.map((item, idx) => {
          const isSelected = selectedMonth === idx;
          const heightPercent = (item.value / maxVal) * 100;

          return (
            <div
              key={item.month}
              onClick={() => setSelectedMonth(idx)}
              className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer group"
            >
              {/* Value on top of the bar */}
              <span
                className={`text-[11px] font-sans font-bold transition-all mb-2 ${
                  isSelected ? 'text-emerald-400 scale-105' : 'text-stone-400 group-hover:text-stone-200'
                }`}
              >
                {item.label}
              </span>

              {/* Vertical Bar Container */}
              <div className="w-full max-w-[42px] h-36 bg-black/40 rounded-2xl p-1 flex items-end overflow-hidden border border-white/5 group-hover:border-white/10 transition-colors">
                <div
                  className={`w-full rounded-xl transition-all duration-300 ${
                    isSelected
                      ? 'bg-gradient-to-t from-emerald-600 via-teal-500 to-lime-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                      : 'bg-gradient-to-t from-stone-800 to-stone-700/80 group-hover:from-emerald-950 group-hover:to-emerald-700/50'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>

              {/* Month Label below */}
              <span
                className={`text-xs font-sans mt-3 transition-colors ${
                  isSelected ? 'text-white font-bold' : 'text-stone-400 group-hover:text-stone-200'
                }`}
              >
                {item.month}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-sans text-stone-400">
        <span>Peak: October (500 Analyzed)</span>
        <span className="text-emerald-400 font-medium font-sans">42 zero-days deflected</span>
      </div>

    </div>
  );
};
