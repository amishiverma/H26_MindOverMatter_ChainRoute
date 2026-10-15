import React from 'react';
import { 
  Home, 
  BarChart2, 
  Layers, 
  ShieldCheck, 
  Settings, 
  LogOut,
  Bell,
  FlaskConical
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onBackToLanding?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onBackToLanding,
}) => {
  const navItems: { id: ActiveTab; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { id: 'overview', icon: Home, label: 'Dashboard' },
    { id: 'sandbox', icon: FlaskConical, label: 'Sandbox & Exit Capsule' },
    { id: 'analytics', icon: BarChart2, label: 'Analytics' },
    { id: 'graph', icon: Layers, label: 'Risk Matrix' },
    { id: 'vulnerabilities', icon: ShieldCheck, label: 'Threat Logs' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[72px] sm:w-20 bg-[#0e100f]/80 backdrop-blur-xl border-r border-stone-800/80 flex flex-col items-center justify-between py-6 shrink-0 z-40 select-none">
      
      {/* Brand Icon at Top */}
      <div className="flex flex-col items-center space-y-6">
        <button
          onClick={onBackToLanding}
          className="group relative flex items-center justify-center w-11 h-11 rounded-full bg-[#121412] border border-stone-800 transition-transform hover:scale-105 active:scale-95"
          title="Return to Landing Page"
        >
          <img 
            src={logoImg} 
            alt="ChainRoute" 
            className="w-7 h-7 object-contain" 
          />
          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-lime-500 border-2 border-[#0e100f]" />
        </button>

        <div className="w-8 h-px bg-white/5" />

        {/* Navigation Icons Stack */}
        <nav className="flex flex-col items-center space-y-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={item.label}
                className={`relative group flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-br from-lime-600 via-emerald-700 to-stone-800 text-stone-100 font-semibold border border-lime-500/30 scale-105'
                    : 'text-stone-400 hover:text-lime-300 hover:bg-[#161915]'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                
                {/* Tooltip on hover */}
                <span className="absolute left-16 px-2.5 py-1 rounded-lg bg-[#141614] border border-stone-800 text-xs font-sans text-stone-200 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-md">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Action Icon (Logout / Landing) */}
      <div className="flex flex-col items-center space-y-3">
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            title="Public Landing Mode"
            className="flex items-center justify-center w-10 h-10 rounded-full text-stone-500 hover:text-lime-400 hover:bg-[#161915] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

    </aside>
  );
};
