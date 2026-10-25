import React, { useEffect } from 'react';
import { 
  LayoutDashboard, FileText, ShoppingBag, 
  Users, Package, FileSpreadsheet, Settings, Plus, Sparkles,
  Receipt, Truck, Wallet, QrCode, Layers, ShieldCheck,
  User, LogIn, KeyRound, UserCheck, ShoppingCart, Scale, FileCheck2, HardHat,
  ArrowUpRight, X
} from 'lucide-react';
import { ViewMode, AuthUser } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  unpaidCount: number;
  lowStockCount: number;
  currentUser?: AuthUser | null;
  onOpenAuthModal?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

// Google G Icon for Sidebar
const GoogleGIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5 shrink-0" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  unpaidCount,
  lowStockCount,
  currentUser,
  onOpenAuthModal,
  isOpen = false,
  onClose,
}) => {
  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleItemClick = (id: ViewMode) => {
    onSelectView(id);
    onClose();
  };

  const pages = [
    {
      pageNumber: '1',
      title: 'Billing & Sales',
      items: [
        {
          id: 'DASHBOARD' as ViewMode,
          label: 'Overview Dashboard',
          icon: LayoutDashboard,
        },
        {
          id: 'INVOICES' as ViewMode,
          label: 'Invoices & Tax Bills',
          icon: FileText,
          badge: unpaidCount > 0 ? `${unpaidCount} Due` : undefined,
          badgeColor: 'bg-amber-100 text-amber-800',
        },
        {
          id: 'QUOTATIONS' as ViewMode,
          label: 'Quotations & Estimates',
          icon: FileSpreadsheet,
          tag: '18% GST',
        },
        {
          id: 'SERVICE_ORDERS' as ViewMode,
          label: 'Service Order & Estimate',
          icon: Layers,
          tag: 'Work Order',
        },
        {
          id: 'PURCHASE_ESTIMATES' as ViewMode,
          label: 'Purchase Estimates',
          icon: ShoppingCart,
          tag: 'Inward PO',
        },
        {
          id: 'POS' as ViewMode,
          label: 'POS Counter Sale',
          icon: ShoppingBag,
          tag: 'Fast',
        },
        {
          id: 'LETTERHEAD_STUDIO' as ViewMode,
          label: 'Letterhead & Letters',
          icon: Sparkles,
          tag: 'Suhel A4',
        },
      ],
    },
    {
      pageNumber: '2',
      title: 'Parties & Ledgers',
      items: [
        {
          id: 'PARTIES' as ViewMode,
          label: 'Customer & Supplier Ledger',
          icon: Users,
        },
        {
          id: 'OPENING_BALANCES' as ViewMode,
          label: 'Opening Balance',
          icon: Scale,
          tag: 'DR/CR FY',
        },
        {
          id: 'PAYMENT_VOUCHERS' as ViewMode,
          label: 'Payment Received Dashboard',
          icon: Receipt,
          tag: 'Receipts & Dues',
        },
        {
          id: 'GST_LEDGER' as ViewMode,
          label: 'GST Ledger',
          icon: FileCheck2,
          tag: 'GST Ledger',
        },
      ],
    },
    {
      pageNumber: '3',
      title: 'Stock & Barcodes',
      items: [
        {
          id: 'INVENTORY' as ViewMode,
          label: 'Products & Live Stock',
          icon: Package,
          badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined,
          badgeColor: 'bg-rose-100 text-rose-800',
        },
        {
          id: 'BARCODE_STUDIO' as ViewMode,
          label: 'Barcode Label Studio',
          icon: QrCode,
          tag: 'Stickers',
        },
      ],
    },
    {
      pageNumber: '4',
      title: 'Accounts & Tax Hub',
      items: [
        {
          id: 'EXPENSES' as ViewMode,
          label: 'Expenses & P&L (ITC)',
          icon: Receipt,
          tag: 'P&L',
        },
        {
          id: 'SITE_EXPENSES' as ViewMode,
          label: 'Site Expenses',
          icon: HardHat,
          tag: '7 Categories',
        },
        {
          id: 'CASH_BANK' as ViewMode,
          label: 'Cash & Bank Accounts',
          icon: Wallet,
        },
        {
          id: 'EWAY_BILLS' as ViewMode,
          label: 'E-Way Bills & Transit',
          icon: Truck,
          tag: 'NIC',
        },
        {
          id: 'REPORTS' as ViewMode,
          label: 'GST Returns (GSTR-1/3B)',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      pageNumber: '5',
      title: 'Staff & Wages',
      items: [
        {
          id: 'ATTENDANCE' as ViewMode,
          label: 'Attendance & Salary',
          icon: UserCheck,
          tag: 'Auto-Total',
        },
      ],
    },
  ];

  return (
    <>
      {/* 1. Backdrop Overlay */}
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-black/75 backdrop-blur-xs z-50 transition-opacity duration-300 no-print ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 2. Slide-out Navigation Drawer containing everything in the red circle */}
      <aside 
        className={`fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-[#050b1a] border-r border-[#14234b] shadow-[0_0_60px_rgba(0,0,0,0.95)] z-50 flex flex-col justify-between transition-transform duration-300 ease-out no-print ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header with Title and Close X */}
        <div className="p-3.5 px-4 border-b border-[#14234b] flex items-center justify-between shrink-0 bg-[#070e24]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-cyan-500 to-sky-400 p-[1.5px] flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <div className="w-full h-full bg-[#070e24] rounded-[6.5px] flex items-center justify-center font-black text-white text-xs">
                SR
              </div>
            </div>
            <div>
              <div className="font-extrabold text-sm text-white font-heading">SR Group Bills</div>
              <div className="text-[10px] text-cyan-400/90 font-medium">Navigation Menu</div>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#101b3d] border border-transparent hover:border-cyan-500/30 transition-all cursor-pointer"
            title="Close Menu"
          >
            <X className="w-5 h-5 text-cyan-300" />
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="p-3.5 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Top Standalone Dashboard Button */}
          <button
            onClick={() => handleItemClick('DASHBOARD')}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              currentView === 'DASHBOARD'
                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-[0_0_18px_rgba(2,132,199,0.45)] border border-cyan-400/40'
                : 'bg-[#09122e] hover:bg-[#0e1a3e] text-slate-200 border border-[#172654]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-white shrink-0" />
            <span className="font-heading tracking-wide">Dashboard</span>
          </button>

          {/* Main Navigation Pages Card */}
          <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] p-3 space-y-4">
            {pages.map((page) => {
              return (
                <div key={page.pageNumber} className="space-y-1">
                  {/* Page Section Title */}
                  <div className="px-2 py-1 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase text-cyan-400/80">
                      PAGE {page.pageNumber} : {page.title}
                    </span>
                  </div>

                  {/* Sub-items */}
                  <div className="space-y-0.5">
                    {page.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemClick(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/40'
                              : 'text-slate-300 hover:bg-[#0f1d44] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            <span className="truncate">{item.label}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.tag && (
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                item.tag === '18% GST' || item.tag === 'Receipts'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : item.tag === 'Work Order'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  : item.tag === 'Inward PO' || item.tag === 'Stickers' || item.tag === 'Suhel A4'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : item.tag === 'Fast' || item.tag === 'NIC'
                                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                  : item.tag === 'DR/CR FY'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : item.tag === 'GST Ledger'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                              }`}>
                                {item.tag}
                              </span>
                            )}
                            {item.badge && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Account / Email Login Card */}
          <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-cyan-400/80">
                Account & Security
              </span>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <div className="p-2.5 bg-[#0a1435] border border-[#162758] rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs border border-cyan-400/30">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  {currentUser?.provider === 'google' && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#070e24] rounded-full flex items-center justify-center shadow-xs border border-slate-700">
                      <GoogleGIcon className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white truncate uppercase">
                      {currentUser?.name || 'SUHEL ANSARI'}
                    </p>
                    {currentUser?.provider === 'google' && (
                      <span className="text-[9px] font-bold text-blue-400 bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-800">
                        Google
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {currentUser?.email || 'newsinfra@rediffmail.com'}
                  </p>
                </div>
              </div>
              {onOpenAuthModal && (
                <button
                  onClick={onOpenAuthModal}
                  className="w-full py-1.5 px-2.5 bg-[#0f1d47] hover:bg-[#162961] border border-[#213876] hover:border-cyan-500/50 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                >
                  <GoogleGIcon className="w-3.5 h-3.5" />
                  <span>Switch / Google Login</span>
                </button>
              )}
            </div>
          </div>

          {/* Security & Indian GST Compliance Card */}
          <div className="p-3.5 bg-gradient-to-br from-[#0c183d] to-[#060c1e] rounded-2xl border border-[#14234b] text-white space-y-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Offline & Private</span>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Your GST data, client ledgers & Invoices are securely saved with 1-click JSON backup export.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
