import React from 'react';
import { ShieldAlert, ShieldCheck, GitPullRequest, Coins, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

interface RecentTransactionsListProps {
  onSelectItem?: (name: string) => void;
}

export const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({ onSelectItem }) => {
  const auditEvents = [
    {
      id: 'tx-1',
      title: 'event-stream-patch',
      subtitle: 'PR #29482 Quarantined',
      timestamp: 'Today, 14:32',
      metric: 'CVSS 9.8',
      status: 'Blocked',
      statusType: 'blocked',
      icon: ShieldAlert,
      iconBg: 'bg-rose-500/15 text-rose-400',
    },
    {
      id: 'tx-2',
      title: 'Polygon Block #5928174',
      subtitle: 'Merkle Root Finality',
      timestamp: 'Today, 12:15',
      metric: 'Block #5.9M',
      status: 'Anchored',
      statusType: 'anchored',
      icon: Coins,
      iconBg: 'bg-emerald-950/60 text-emerald-300',
    },
    {
      id: 'tx-3',
      title: 'expressjs/express',
      subtitle: 'AST Graph Verified',
      timestamp: 'Yesterday, 19:40',
      metric: '2,847 Pkgs',
      status: 'Verified',
      statusType: 'verified',
      icon: ShieldCheck,
      iconBg: 'bg-emerald-950/60 text-emerald-400',
    },
    {
      id: 'tx-4',
      title: 'ansi-colors-turbo',
      subtitle: 'Maintainer Velocity Spike',
      timestamp: 'Oct 10, 11:04',
      metric: 'CVSS 5.8',
      status: 'Medium Risk',
      statusType: 'medium',
      icon: GitPullRequest,
      iconBg: 'bg-amber-500/15 text-amber-400',
    },
    {
      id: 'tx-5',
      title: 'web3/web3.js',
      subtitle: 'Cryptographic Audit Done',
      timestamp: 'Oct 09, 16:22',
      metric: 'Zero CVE',
      status: 'Verified',
      statusType: 'verified',
      icon: Layers,
      iconBg: 'bg-emerald-950/60 text-emerald-400',
    },
  ];

  const getStatusBadge = (type: string, label: string) => {
    switch (type) {
      case 'blocked':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'anchored':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40';
      case 'verified':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-stone-800 text-stone-300 border-stone-700';
    }
  };

  return (
    <div className="rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_12px_32px_rgba(0,0,0,0.5)] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden h-full">
      {/* Top subtle highlight reflection */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div>
          <span className="text-xs font-sans text-stone-400 block font-medium">Audit Activity Stream</span>
          <span className="text-sm font-sans font-bold text-white tracking-tight">Recent Scans &amp; Audit Events</span>
        </div>
        <span className="text-xs font-sans text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer font-medium">
          See all
        </span>
      </div>

      {/* List Items matching reference style with uniform padding */}
      <div className="space-y-2.5 my-2 max-h-56 overflow-y-auto pr-1">
        {auditEvents.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem && onSelectItem(item.title)}
              className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 hover:bg-black/60 transition-all duration-150 cursor-pointer group"
            >
              {/* Left: Icon Badge & Title */}
              <div className="flex items-center space-x-3">
                <div className={`w-9 h-9 rounded-xl ${item.iconBg} border border-white/5 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-sans font-bold text-stone-100 group-hover:text-emerald-400 transition-colors leading-tight truncate">
                    {item.title}
                  </h4>
                  <span className="text-[11px] text-stone-400 font-sans block mt-0.5">
                    {item.timestamp}
                  </span>
                </div>
              </div>

              {/* Right: Security Metric & Clean Status Badge */}
              <div className="text-right shrink-0 ml-2">
                <span className="text-xs font-sans font-bold text-stone-200 block leading-tight">
                  {item.metric}
                </span>
                <span className={`inline-block text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full border mt-1 uppercase tracking-wider ${getStatusBadge(item.statusType, item.status)}`}>
                  {item.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Footer */}
      <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-xs font-sans text-stone-400">
        <span>Auto-Audit Bot: Running</span>
        <span className="text-emerald-400 font-medium">100% Policy Pass</span>
      </div>

    </div>
  );
};
