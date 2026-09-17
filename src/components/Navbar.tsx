import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, ShoppingBag, Search, 
  HelpCircle, Settings, ShieldCheck, Download, Bell, Sparkles,
  LayoutDashboard, Users, Package, WalletCards, User, LogIn, LogOut, ChevronDown,
  Database, Cloud, RefreshCw
} from 'lucide-react';
import { BusinessProfile, ViewMode, AuthUser } from '../types';
import { getCloudSyncState, subscribeToSyncState, CloudSyncState } from '../utils/supabaseSync';
import { SUPABASE_PROJECT_ID } from '../utils/supabaseClient';

interface NavbarProps {
  businessProfile: BusinessProfile;
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onCreateInvoice: () => void;
  onOpenPos: () => void;
  onOpenHsnFinder: () => void;
  onOpenSettings: () => void;
  onOpenCloudSync?: () => void;
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
  onOpenCloudSync,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [syncState, setSyncState] = useState<CloudSyncState>(getCloudSyncState());

  useEffect(() => {
    const unsub = subscribeToSyncState(state => setSyncState({ ...state }));
    return unsub;
  }, []);

  // Determine which of the 4 main pages is currently active
  const isPage1 = ['DASHBOARD', 'INVOICES', 'QUOTATIONS', 'POS', 'CREATE_INVOICE'].includes(currentView);
  const isPage2 = ['PARTIES', 'OPENING_BALANCES', 'PAYMENT_VOUCHERS'].includes(currentView);
  const isPage3 = ['INVENTORY', 'BARCODE_STUDIO'].includes(currentView);
  const isPage4 = ['EXPENSES', 'CASH_BANK', 'EWAY_BILLS', 'REPORTS'].includes(currentView);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Tier: Brand, Global Actions & 4-Page Navigation */}
        <div className="h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Profile Name */}
          <div className="flex items-center gap-3">
            <img 
              src={businessProfile.logoUrl || "https://lh3.googleusercontent.com/d/16BUJ9mO_ZLvGvhuxxLRwnvlWxeiemQX8"} 
              alt="SR Group Logo" 
              className="w-10 h-10 object-contain rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs shrink-0" 
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 font-heading">
                  SR <span className="text-blue-600">Group</span>
                </span>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline">
                  GST Suite
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium truncate max-w-[140px] sm:max-w-[220px]">
                {businessProfile.name}
              </div>
            </div>
          </div>

          {/* 4 Main Core Pages Bar (Desktop / Tablet) */}
          <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 gap-1">
            
            {/* Page 1 */}
            <button
              onClick={() => onSelectView('DASHBOARD')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isPage1
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] flex items-center justify-center font-black">1</span>
              <span>Billing & Sales</span>
            </button>

            {/* Page 2 */}
            <button
              onClick={() => onSelectView('PARTIES')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isPage2
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-800 text-[10px] flex items-center justify-center font-black">2</span>
              <span>Parties & Khata</span>
            </button>

            {/* Page 3 */}
            <button
              onClick={() => onSelectView('INVENTORY')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isPage3
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-black">3</span>
              <span>Stock & Barcodes</span>
            </button>

            {/* Page 4 */}
            <button
              onClick={() => onSelectView('EXPENSES')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isPage4
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-800 text-[10px] flex items-center justify-center font-black">4</span>
              <span>Accounts & Tax</span>
            </button>

          </div>

          {/* Action Center */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* HSN Code Lookup Button */}
            <button
              onClick={onOpenHsnFinder}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              title="Search Indian HSN / SAC Codes & GST Rates"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>HSN Directory</span>
            </button>

            {/* POS Counter Billing Button */}
            <button
              onClick={onOpenPos}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all transform active:scale-95"
              title="Open Fast Counter POS Billing"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden xs:inline">POS</span>
            </button>

            {/* Supabase Cloud Sync Status Button */}
            <button
              onClick={onOpenCloudSync}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                syncState.status === 'ERROR'
                  ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              }`}
              title={`Supabase Cloud Backend (Project: ${SUPABASE_PROJECT_ID})\nStatus: ${syncState.status === 'SYNCING' ? 'Syncing...' : syncState.lastSyncedAt ? 'Synced at ' + syncState.lastSyncedAt : 'Active'}`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="flex items-center gap-1">
                <span>Supabase</span>
                <span className={`w-2 h-2 rounded-full ${
                  syncState.status === 'SYNCING' 
                    ? 'bg-amber-500 animate-spin' 
                    : syncState.status === 'ERROR'
                    ? 'bg-rose-500'
                    : 'bg-emerald-500 animate-pulse'
                }`} />
              </span>
            </button>

            {/* + New GST Bill Button */}
            <button
              onClick={onCreateInvoice}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Bill</span>
            </button>

            {/* User Account / Google & Email Login Button */}
            <div className="relative">
              {currentUser ? (
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                  title={`Logged in as ${currentUser.email}`}
                >
                  <div className="relative">
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-[11px] shadow-xs">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    {currentUser.provider === 'google' && (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200">
                        <GoogleGIcon className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[110px] flex items-center gap-1">
                      <span>{currentUser.name}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 truncate max-w-[110px] leading-tight font-mono">
                      {currentUser.email}
                    </p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              ) : (
                <button
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}

              {/* Dropdown Menu */}
              {showUserDropdown && currentUser && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl mb-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                      {currentUser.provider === 'google' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-white border border-blue-200 px-1.5 py-0.5 rounded-full shadow-2xs">
                          <GoogleGIcon className="w-2.5 h-2.5" />
                          <span>Google</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-full">
                          <span>Supabase Auth</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-600 truncate">{currentUser.email}</p>
                    {currentUser.businessName && (
                      <p className="text-[11px] font-semibold text-blue-700 mt-1">🏢 {currentUser.businessName}</p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenAuthModal();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Switch / Manage Account</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Business Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      if (onOpenCloudSync) onOpenCloudSync();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>Supabase Cloud DB</span>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              title="Company & GST Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

          </div>

        </div>

        {/* Mobile / Tablet 4-Page Bar */}
        <div className="flex lg:hidden overflow-x-auto pb-2 gap-1 scrollbar-none border-t border-slate-100 pt-1.5">
          <button
            onClick={() => onSelectView('DASHBOARD')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
              isPage1 ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            <span>1. Billing & Sales</span>
          </button>
          <button
            onClick={() => onSelectView('PARTIES')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
              isPage2 ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            <span>2. Parties & Khata</span>
          </button>
          <button
            onClick={() => onSelectView('INVENTORY')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
              isPage3 ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            <span>3. Stock & Barcodes</span>
          </button>
          <button
            onClick={() => onSelectView('EXPENSES')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
              isPage4 ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            <span>4. Accounts & Tax</span>
          </button>
        </div>

      </div>
    </header>
  );
};
