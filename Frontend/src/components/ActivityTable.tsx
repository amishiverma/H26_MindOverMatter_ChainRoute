import React, { useState } from 'react';
import { Activity, ShieldAlert, GitCommit, ExternalLink, Filter, CheckCircle2, AlertOctagon, Shield, Clock } from 'lucide-react';
import { ActivityLog } from '../types';

interface ActivityTableProps {
  logs: ActivityLog[];
  onSelectRepo: (repo: string) => void;
}

export const ActivityTable: React.FC<ActivityTableProps> = ({ logs, onSelectRepo }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    if (filterSeverity === 'all') return true;
    return log.severity === filterSeverity;
  });

  return (
    <div className="rounded-2xl p-5 sm:p-6 bg-[#121412] border border-stone-800 flex flex-col justify-between h-full relative overflow-hidden">
      
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-lime-400 mb-1 tracking-wider uppercase">
            <Activity className="w-4 h-4 text-lime-400" />
            <span>Telemetry Activity Stream</span>
          </div>
          <h3 className="font-display font-bold text-base sm:text-lg text-stone-100">
            Recent Threat Activity &amp; Action Bot Log
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Real-time automated policy decisions and blockchain verification proofs
          </p>
        </div>

        {/* Severity filter */}
        <div className="flex items-center space-x-1 p-1 rounded-full bg-[#0b0d0c] border border-stone-800 text-xs font-medium self-start sm:self-auto">
          {['all', 'critical', 'medium', 'low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1 rounded-full capitalize transition-all ${
                filterSeverity === sev
                  ? sev === 'critical'
                    ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/40'
                    : sev === 'medium'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                    : sev === 'low'
                    ? 'bg-lime-950/60 text-lime-400 font-semibold border border-lime-700/50'
                    : 'bg-gradient-to-r from-lime-600 via-emerald-700 to-stone-800 text-stone-100 font-semibold border border-lime-500/30'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 my-3 overflow-x-auto">
        <table className="w-full text-left font-sans text-xs border-collapse">
          <thead>
            <tr className="border-b border-stone-800 text-stone-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="py-2.5 px-3">Repository</th>
              <th className="py-2.5 px-3">Risk Score</th>
              <th className="py-2.5 px-3">Action Bot Status</th>
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-850">
            {filteredLogs.map((log) => {
              const isCritical = log.severity === 'critical';
              const isMedium = log.severity === 'medium';
              const isLow = log.severity === 'low';

              return (
                <tr
                  key={log.id}
                  className="hover:bg-stone-900/50 transition-colors group cursor-pointer"
                  onClick={() => onSelectRepo(log.repo)}
                >
                  {/* Repo & Branch */}
                  <td className="py-3 px-3">
                    <div className="font-semibold text-stone-200 group-hover:text-lime-300 transition-colors">
                      {log.repo}
                    </div>
                    <div className="text-[11px] font-sans text-stone-400 flex items-center gap-1 mt-0.5">
                      <GitCommit className="w-3 h-3 text-stone-500" />
                      <span>{log.branch} • <span className="font-mono text-stone-300">{log.commitHash}</span></span>
                    </div>
                  </td>

                  {/* Risk Severity Badge */}
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-sans font-medium ${
                        isCritical
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : isMedium
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isCritical ? 'bg-rose-500' : isMedium ? 'bg-amber-400' : 'bg-emerald-500'
                      }`} />
                      {log.riskScore} / 100
                    </span>
                  </td>

                  {/* GitHub Action Status */}
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-sans font-medium ${
                        log.actionStatus === 'BLOCKED PR'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : log.actionStatus === 'FLAGGED SUSPICIOUS'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : log.actionStatus === 'ANCHORED'
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {log.actionStatus}
                    </span>
                  </td>

                  {/* Timestamp */}
                  <td className="py-3 px-3 text-stone-400 text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-stone-500" />
                      <span>{log.timestamp}</span>
                    </div>
                  </td>

                  {/* Details / Action */}
                  <td className="py-3 px-3 text-right">
                    <span className="text-xs text-lime-400 group-hover:underline inline-flex items-center gap-1 font-medium">
                      <span>Audit</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Info bar */}
      <div className="flex items-center justify-between pt-3 border-t border-stone-800 text-xs font-sans text-stone-400">
        <span className="flex items-center gap-1.5 text-lime-400 font-medium">
          <Shield className="w-3.5 h-3.5" />
          Auto-Guard Bot Webhook: Active on 14 Org Repos
        </span>
        <span className="text-stone-500 text-xs">
          Showing {filteredLogs.length} recent events
        </span>
      </div>

    </div>
  );
};
