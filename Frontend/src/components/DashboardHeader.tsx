import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  RefreshCw, 
  ChevronDown, 
  Check, 
  ShieldAlert, 
  ShieldCheck, 
  ExternalLink,
  GitBranch,
  Key,
  LogOut,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { GithubIcon, formatGithubUrl } from './GithubIcon';
import { NotificationItem, DependencyNode } from '../types';

interface DashboardHeaderProps {
  onOpenSearch: () => void;
  onBackToLanding: () => void;
  notifications: NotificationItem[];
  currentRepo: string;
  onSelectRepo?: (repo: string) => void;
  onSelectPackage?: (name: string) => void;
  nodes?: DependencyNode[];
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onOpenSearch,
  onBackToLanding,
  notifications,
  currentRepo,
  onSelectRepo,
  onSelectPackage,
  nodes = [],
}) => {
  // State management for interactive buttons
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(notifications);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Refs for click-outside detection
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = unreadNotifications.filter((n) => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Interactive Refresh Click Handler
  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshToast(true);

    setTimeout(() => {
      setIsRefreshing(false);
      setTimeout(() => setRefreshToast(false), 2000);
    }, 900);
  };

  const markAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUnreadNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Filter packages for quick search dropdown
  const filteredPackages = searchQuery.trim()
    ? nodes.filter((n) => n.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : nodes.slice(0, 4);

  const availableRepos = [
    'psf/requests',
    'fastapi/fastapi',
    'pydantic/pydantic',
    'pallets/flask',
  ];

  return (
    <header className="w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2 z-30 sticky top-0 flex justify-center pointer-events-none select-none">
      
      {/* 2. Floating Glassmorphic Bar Pill */}
      <div className="max-w-7xl w-full rounded-full bg-[#121b18]/70 backdrop-blur-md border border-emerald-500/20 shadow-2xl px-5 sm:px-6 py-2.5 flex items-center justify-between pointer-events-auto relative">
        
        {/* Top subtle highlight reflection line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent pointer-events-none" />

        {/* ------------------------------------------------------------------ */}
        {/* LEFT: Focusable Search Input with Active Dropdown State            */}
        {/* ------------------------------------------------------------------ */}
        <div ref={searchRef} className="relative flex-1 max-w-[260px] sm:max-w-xs md:max-w-sm">
          <div className="flex items-center px-3.5 py-1.5 sm:py-2 rounded-full bg-white/[0.04] border border-white/10 hover:border-emerald-500/35 focus-within:border-emerald-400/80 focus-within:bg-black/60 transition-all text-stone-300 text-xs sm:text-sm">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400/80 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search packages, hash, CVEs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredPackages.length > 0) {
                  onSelectPackage?.(filteredPackages[0].name);
                  setIsSearchFocused(false);
                  setSearchQuery('');
                }
              }}
              className="bg-transparent text-xs sm:text-sm text-stone-100 placeholder-stone-400 focus:outline-none w-full font-sans"
            />
            <button
              onClick={onOpenSearch}
              title="Open full command palette"
              className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-stone-400 bg-white/5 border border-white/10 hover:text-stone-100 shrink-0 ml-1.5 transition-colors"
            >
              ⌘K
            </button>
          </div>

          {/* Active Search Dropdown Suggestions */}
          {isSearchFocused && (
            <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-[#0e1411]/95 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-white/10 px-2 text-[11px] font-sans text-stone-400">
                <span>{searchQuery ? 'Matching Packages' : 'Suggested Packages'}</span>
                <span className="text-[10px] text-emerald-400 font-mono">Press Enter</span>
              </div>
              <div className="space-y-1">
                {filteredPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => {
                      onSelectPackage?.(pkg.name);
                      setIsSearchFocused(false);
                      setSearchQuery('');
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.08] cursor-pointer transition-colors text-xs font-sans group"
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${pkg.status === 'critical' ? 'bg-rose-400' : pkg.status === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <span className="text-stone-200 group-hover:text-emerald-300 font-medium">{pkg.name}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">v{pkg.version}</span>
                  </div>
                ))}
              </div>
              <div 
                onClick={() => {
                  setIsSearchFocused(false);
                  onOpenSearch();
                }}
                className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between px-2 text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer font-sans"
              >
                <span>Open Full Command Palette</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          )}
        </div>

        {/* CENTER: Target Repository Badge (Clickable to exact repo URL on GitHub) */}
        {currentRepo && (
          <div className="hidden md:flex items-center">
            <a
              href={`https://github.com/${currentRepo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-950/20 text-stone-300 hover:text-emerald-300 transition-all text-xs group"
              title={`Open https://github.com/${currentRepo} in new tab`}
            >
              <GitBranch className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
              <span className="font-mono text-stone-200 group-hover:text-emerald-300 font-medium">{currentRepo}</span>
              <ExternalLink className="w-3 h-3 text-stone-400 group-hover:text-emerald-400" />
            </a>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* RIGHT: Action Buttons (Refresh, GitHub, Notifications, Profile)    */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex items-center space-x-2 sm:space-x-3">

          {/* GitHub Active Repository Link */}
          <a
            href={formatGithubUrl(currentRepo)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 sm:p-2.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 text-stone-300 hover:text-emerald-300 transition-all flex items-center justify-center group"
            title={currentRepo ? `Open ${currentRepo} directly on GitHub` : 'Open GitHub'}
          >
            <GithubIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
          </a>

          {/* Refresh Utility Button with Animation & Feedback */}
          <div className="relative">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 sm:p-2.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 text-stone-300 hover:text-emerald-300 transition-all ${
                isRefreshing ? 'bg-emerald-950/40 border-emerald-500/50' : ''
              }`}
              title="Refresh AST Telemetry & On-Chain Feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-700 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Subtle Refresh Toast Tooltip */}
            {refreshToast && (
              <div className="absolute right-0 -bottom-8 px-2.5 py-1 rounded-md bg-emerald-950/90 border border-emerald-800/60 text-[10px] text-emerald-300 font-sans shadow-lg whitespace-nowrap animate-in fade-in duration-150">
                Telemetry Synced
              </div>
            )}
          </div>

          {/* Notification Bell with Dropdown Menu */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 sm:p-2.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 text-stone-300 hover:text-emerald-300 transition-colors"
              title="Security Alerts & Notifications"
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-[#0e1411]/95 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center space-x-2">
                    <span className="font-sans font-semibold text-sm text-stone-100">Security Alerts</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-sans font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-sans font-medium transition-colors"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="divide-y divide-white/10 max-h-72 overflow-y-auto mt-2 pr-1">
                  {unreadNotifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`py-3 px-2 rounded-xl transition-colors hover:bg-white/[0.04] ${!notif.read ? 'bg-emerald-950/15' : ''}`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center space-x-2">
                          {notif.severity === 'critical' ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                          <span className={`font-semibold ${notif.severity === 'critical' ? 'text-rose-400' : 'text-stone-100'}`}>
                            {notif.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-sans">{notif.timestamp}</span>
                      </div>
                      <p className="text-xs text-stone-300 font-sans pl-5 leading-relaxed">{notif.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Dropdown Menu */}
          <div ref={profileRef} className="relative">
            <div
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 sm:space-x-3 pl-1.5 sm:pl-2 py-1 pr-2.5 sm:pr-3 rounded-full bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 transition-colors cursor-pointer select-none"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-700 to-stone-700 p-0.5">
                  <div className="w-full h-full rounded-full bg-[#0e100f] flex items-center justify-center text-xs font-bold text-emerald-300">
                    ER
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#121412]" />
              </div>

              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-stone-100 font-sans leading-snug">
                  Ethan Reynolds
                </span>
                <span className="text-[10px] text-stone-400 font-sans leading-none">
                  @ethan_reynolds
                </span>
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${showProfileMenu ? 'rotate-180 text-emerald-400' : ''}`} />
            </div>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-[#0e1411]/95 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-sans text-xs">
                {/* Account Header */}
                <div className="p-2 border-b border-white/10 mb-2">
                  <span className="font-semibold text-stone-100 block">Ethan Reynolds</span>
                  <span className="text-[10px] text-stone-400 block">Lead DevSecOps Engineer</span>
                  <div className="mt-1.5 inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-[10px] text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Python 3.12/3.13 Sandbox Active</span>
                  </div>
                </div>

                {/* Switch Target Repository Section */}
                <div className="space-y-1 mb-2">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold px-2 block mb-1">
                    Quick Switch Repository
                  </span>
                  {availableRepos.map((repo) => (
                    <button
                      key={repo}
                      onClick={() => {
                        onSelectRepo?.(repo);
                        setShowProfileMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors ${
                        repo === currentRepo
                          ? 'bg-emerald-950/50 text-emerald-300 font-semibold'
                          : 'text-stone-300 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <GitBranch className="w-3 h-3 text-stone-400" />
                        <span>{repo}</span>
                      </div>
                      {repo === currentRepo && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>
                  ))}
                </div>

                {/* Account Options */}
                <div className="border-t border-white/10 pt-2 space-y-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenSearch();
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-stone-300 hover:bg-white/[0.05] transition-colors"
                  >
                    <Key className="w-3.5 h-3.5 text-stone-400" />
                    <span>API Credentials & Webhooks</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onBackToLanding();
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Return to Landing Page</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </header>
  );
};
