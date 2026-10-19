import React, { useState } from 'react';
import { 
  Building2, Plus, ShoppingBag, Search, 
  HelpCircle, Settings, ShieldCheck, Download, Bell, Sparkles,
  LayoutDashboard, Users, Package, WalletCards, User, LogIn, LogOut, ChevronDown,
  Menu, Moon, MapPin
} from 'lucide-react';
import { BusinessProfile, ViewMode, AuthUser } from '../types';

interface NavbarProps {
  businessProfile: BusinessProfile;
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onCreateInvoice: () => void;
  onOpenPos: () => void;
  onOpenHsnFinder: () => void;
  onOpenSettings: () => void;
  currentUser: AuthUser | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
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
  onCreateInvoice,
  onOpenPos,
  onOpenHsnFinder,
  onOpenSettings,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-30 bg-[#060c1e]/95 backdrop-blur-md border-b border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] no-print">
      <div className="max-w-[1750px] mx-auto px-3 sm:px-5 lg:px-6">
        
        {/* Top Tier: Brand, Search, Branch, User */}
        <div className="h-16 flex items-center justify-between gap-3 md:gap-6">
          
          {/* Brand Logo & Profile Name */}
          <div className="flex items-center gap-3 shrink-0">
            {/* High-tech SR glowing icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-sky-400 p-[1.5px] shadow-[0_0_15px_rgba(6,182,212,0.4)] shrink-0">
              <div className="w-full h-full bg-[#070e24] rounded-[10px] flex items-center justify-center font-black text-white text-base tracking-tighter">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-white font-extrabold font-heading">SR</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white font-heading">
                  SR Group Bills
                </span>
              </div>
              <div className="text-[10px] text-cyan-400/90 font-medium tracking-tight">
                Smart Billing for a Better Business
              </div>
            </div>

            {/* Hamburger button */}
            <button 
              type="button" 
              onClick={() => onSelectView('DASHBOARD')}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg ml-1 hover:bg-[#101b3d] transition-colors cursor-pointer"
              title="Toggle Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Center Search Input */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice, party, product, etc..."
                className="w-full pl-9 pr-16 py-2 bg-[#09122e] border border-[#1b2b5d] focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 transition-all outline-none"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <span className="text-[10px] font-mono text-slate-400 bg-[#12204a] px-1.5 py-0.5 rounded border border-[#21356f]">
                  Ctrl + K
                </span>
              </div>
            </div>
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
                className="p-2 rounded-xl bg-[#09122e] border border-[#1b2b5d] text-slate-300 hover:text-white hover:border-cyan-500/50 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center shadow-xs">
                  3
                </span>
              </button>
            </div>

            {/* Theme Toggle Moon Icon */}
            <button 
              type="button"
              className="p-2 rounded-xl bg-[#09122e] border border-[#1b2b5d] text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors cursor-pointer"
              title="Dark Theme"
            >
              <Moon className="w-4 h-4" />
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

