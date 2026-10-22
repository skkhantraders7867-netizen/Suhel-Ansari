import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, ShoppingBag, Search, 
  HelpCircle, Settings, ShieldCheck, Download, Bell, Sparkles,
  LayoutDashboard, Users, Package, WalletCards, User, LogIn, LogOut, ChevronDown,
  Menu, Moon, Sun, MapPin, ArrowLeft
} from 'lucide-react';
import { BusinessProfile, ViewMode, AuthUser } from '../types';

interface NavbarProps {
  businessProfile: BusinessProfile;
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onNavigateBack?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onCreateInvoice: () => void;
  onOpenPos: () => void;
  onOpenHsnFinder: () => void;
  onOpenSettings: () => void;
  currentUser: AuthUser | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenCommandPalette?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

// Google G Icon for Navbar
const GoogleGIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5 shrink-0" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({
  businessProfile,
  currentView,
  onSelectView,
  onNavigateBack,
  isSidebarOpen = false,
  onToggleSidebar,
  onCreateInvoice,
  onOpenPos,
  onOpenHsnFinder,
  onOpenSettings,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onOpenCommandPalette,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sr_bills_theme');
    if (saved) return saved === 'dark';
    return true; // Default dark
  });

  useEffect(() => {
    if (!isDarkMode) {
      document.documentElement.classList.add('light-theme');
      document.body.classList.add('light-theme');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('sr_bills_theme', 'light');
    } else {
      document.documentElement.classList.remove('light-theme');
      document.body.classList.remove('light-theme');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('sr_bills_theme', 'dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#04081a]/95 backdrop-blur-xl border-b border-[#14234b]/80 shadow-[0_4px_30px_rgba(0,0,0,0.6)] no-print">
      <div className="max-w-[1750px] mx-auto px-3 sm:px-5 lg:px-6">
        
        {/* Top Tier: Brand, Search, Branch, User */}
        <div className="h-16 flex items-center justify-between gap-2.5 md:gap-6">
          
          {/* Brand Logo & Profile Name with Menu Button on EXTREME LEFT */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* 1. Enhanced Ultra-Attractive 3D Cyber "Tree Dot" Menu Toggle Button */}
            <button 
              type="button" 
              onClick={onToggleSidebar}
              className={`p-2.5 sm:px-3 sm:py-2.5 rounded-2xl transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 active:scale-95 group relative border overflow-hidden ${
                isSidebarOpen 
                  ? 'bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-400 text-white border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.6)]' 
                  : 'bg-gradient-to-br from-[#0c1a45]/90 via-[#071233]/95 to-[#03091e] hover:from-[#132863] hover:to-[#0a1844] text-cyan-300 border-[#1f3775] hover:border-cyan-400/70 shadow-[0_0_18px_rgba(6,182,212,0.25)] hover:shadow-[0_0_28px_rgba(6,182,212,0.5)]'
              }`}
              title={isSidebarOpen ? "Close Menu" : "Open Menu (3-Dots)"}
              aria-label="Toggle Navigation Menu"
            >
              {/* Animated Cyber Sheen / Sweep on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></div>

              {/* 3 Glowing Dots along the length/vertical side with high-tech laser line */}
              <div className="relative flex flex-col gap-1.5 items-center justify-center w-4 h-6">
                {/* Thin vertical laser track connecting the dots */}
                <div className={`absolute top-0.5 bottom-0.5 w-[1.5px] rounded-full transition-all duration-300 ${
                  isSidebarOpen 
                    ? 'bg-white/80 shadow-[0_0_8px_#ffffff]' 
                    : 'bg-gradient-to-b from-cyan-400/40 via-blue-400/50 to-purple-400/40 group-hover:from-cyan-300 group-hover:to-blue-400'
                }`}></div>

                {/* Dot 1: Top Cyan Pulsing Pearl */}
                <div className="relative z-10 flex items-center justify-center">
                  <span className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isSidebarOpen 
                      ? 'bg-white shadow-[0_0_10px_#ffffff] scale-110' 
                      : 'bg-gradient-to-tr from-cyan-400 to-cyan-200 shadow-[0_0_8px_#22d3ee] group-hover:scale-125 group-hover:shadow-[0_0_12px_#22d3ee]'
                  }`}></span>
                  {!isSidebarOpen && (
                    <span className="absolute w-3 h-3 rounded-full bg-cyan-400/30 animate-ping pointer-events-none opacity-60"></span>
                  )}
                </div>

                {/* Dot 2: Center Electric Diamond / Pearl */}
                <div className="relative z-10 flex items-center justify-center">
                  <span className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isSidebarOpen 
                      ? 'bg-white shadow-[0_0_10px_#ffffff] scale-110' 
                      : 'bg-gradient-to-tr from-blue-400 to-sky-200 shadow-[0_0_8px_#38bdf8] group-hover:scale-125 group-hover:shadow-[0_0_12px_#38bdf8]'
                  }`}></span>
                </div>

                {/* Dot 3: Bottom Violet/Cyan Pearl */}
                <div className="relative z-10 flex items-center justify-center">
                  <span className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isSidebarOpen 
                      ? 'bg-white shadow-[0_0_10px_#ffffff] scale-110' 
                      : 'bg-gradient-to-tr from-indigo-400 to-cyan-300 shadow-[0_0_8px_#818cf8] group-hover:scale-125 group-hover:shadow-[0_0_12px_#818cf8]'
                  }`}></span>
                </div>
              </div>
            </button>

            {/* Back Button (Appears whenever inside any section other than Dashboard) */}
            {currentView !== 'DASHBOARD' && onNavigateBack && (
              <button 
                type="button" 
                onClick={onNavigateBack}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-900/60 via-cyan-950/70 to-[#071330] hover:from-blue-800/80 hover:to-cyan-900/80 border border-cyan-400/50 hover:border-cyan-300 text-cyan-300 hover:text-white transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] cursor-pointer active:scale-95 text-xs font-black shrink-0 group"
                title="Go Back to Previous Section (Back Button)"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
                <span className="font-extrabold tracking-wide">Back</span>
              </button>
            )}

            {/* 2. High-tech SR glowing icon */}
            <div 
              onClick={() => onSelectView('DASHBOARD')}
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-sky-400 p-[1.5px] shadow-[0_0_15px_rgba(6,182,212,0.4)] shrink-0 cursor-pointer hover:shadow-[0_0_22px_rgba(6,182,212,0.6)] transition-all group"
            >
              <div className="w-full h-full bg-[#070e24] rounded-[10px] flex items-center justify-center font-black text-white text-base tracking-tighter group-hover:bg-[#0a1538] transition-colors">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-white font-extrabold font-heading">SR</span>
              </div>
            </div>

            {/* 3. Title */}
            <div 
              onClick={() => onSelectView('DASHBOARD')}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white font-heading hover:text-cyan-300 transition-colors">
                  SR Group Bills
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span> Live
                </span>
              </div>
              <div className="text-[10px] text-cyan-400/90 font-medium tracking-tight">
                Smart Billing for a Better Business
              </div>
            </div>
          </div>

          {/* Quick Create Invoice Action Button */}
          <button
            type="button"
            onClick={onCreateInvoice}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl shadow-[0_0_12px_rgba(6,182,212,0.35)] border border-cyan-400/40 transition-all cursor-pointer active:scale-95"
            title="Create New Tax Invoice"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Bill</span>
          </button>

          {/* Center Search / Command Palette Input */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-2">
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="w-full relative flex items-center pl-9 pr-16 py-2 bg-[#081230]/90 hover:bg-[#0b173e] border border-[#1b2b5d] hover:border-cyan-500/60 focus:border-cyan-500/70 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer text-left shadow-inner group"
            >
              <Search className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 absolute left-3 top-1/2 -translate-y-1/2 transition-colors" />
              <span className="truncate">Search bills, customers, stock, or commands...</span>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span className="text-[10px] font-mono text-cyan-400/90 bg-[#12204a] px-2 py-0.5 rounded border border-[#21356f] shadow-xs">
                  Ctrl + K
                </span>
              </div>
            </button>
          </div>

          {/* Action Center (Branch, Notifications, Theme, Profile) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Branch Selector Capsule */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#09122e] border border-[#1b2b5d] hover:border-cyan-500/50 rounded-xl text-xs text-slate-300 transition-colors cursor-pointer">
              <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="text-left leading-tight">
                <div className="font-bold text-[11px] text-white">SRG/26-27</div>
                <div className="text-[9px] text-slate-400">Main Branch</div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                type="button"
                onClick={onOpenNotifications}
                className="p-2 rounded-xl bg-[#09122e] hover:bg-[#0e1a3e] border border-[#1b2b5d] hover:border-cyan-500/50 text-slate-300 hover:text-white transition-all cursor-pointer relative"
                title="Command Alerts & Notifications"
              >
                <Bell className="w-4 h-4 text-cyan-400" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white font-mono font-bold text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Command Palette Button for Mobile */}
            <button 
              type="button"
              onClick={onOpenCommandPalette}
              className="md:hidden p-2 rounded-xl bg-[#09122e] border border-[#1b2b5d] text-cyan-400 hover:text-white transition-colors cursor-pointer"
              title="Global Search (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Theme Toggle Button (Dark / Light) */}
            <button 
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                isDarkMode 
                  ? 'bg-[#09122e] border-[#1b2b5d] text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/50 shadow-xs' 
                  : 'bg-amber-500/10 border-amber-400/50 text-amber-500 hover:bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              }`}
              title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* User Profile Capsule */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 px-3 py-1.5 bg-[#09122e] hover:bg-[#0e1a3e] border border-[#1b2b5d] hover:border-cyan-500/50 rounded-xl transition-all cursor-pointer"
                title={currentUser ? `Logged in as ${currentUser.email}` : 'Suhel Ansari - Administrator'}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-xs border border-cyan-400/30">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="font-bold text-xs text-white truncate max-w-[110px]">
                    {currentUser?.name || 'Suhel Ansari'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Administrator
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-[#09122e] rounded-2xl shadow-2xl border border-[#1b2b5d] p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="p-3 bg-[#0d1a40] border border-[#1f316b] rounded-xl mb-1.5">
                    <p className="text-xs font-bold text-white">{currentUser?.name || 'Suhel Ansari'}</p>
                    <p className="text-[11px] font-mono text-cyan-400 truncate">{currentUser?.email || 'newsinfra@rediffmail.com'}</p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1">🏢 {businessProfile.name || 'SR Group'}</p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenAuthModal();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#12204a] rounded-lg transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-cyan-400" />
                    <span>Switch / Manage Account</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#12204a] rounded-lg transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Business Profile Settings</span>
                  </button>

                  {currentUser && (
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer mt-1 border-t border-[#1b2b5d] pt-2"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </header>
  );
};

