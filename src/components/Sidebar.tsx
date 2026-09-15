import React from 'react';
import { 
  LayoutDashboard, FileText, ShoppingBag, 
  Users, Package, FileSpreadsheet, Settings, Plus, Sparkles,
  Receipt, Truck, Wallet, QrCode, Layers, ShieldCheck,
  User, LogIn, KeyRound, UserCheck, ShoppingCart
} from 'lucide-react';
import { ViewMode, AuthUser } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  unpaidCount: number;
  lowStockCount: number;
  currentUser?: AuthUser | null;
  onOpenAuthModal?: () => void;
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
}) => {

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
          label: 'Quotations & Estimates (कोटेशन)',
          icon: FileSpreadsheet,
          tag: '18% GST',
        },
        {
          id: 'SERVICE_ORDERS' as ViewMode,
          label: 'Service Order & Estimate (सर्विस ऑर्डर)',
          icon: Layers,
          tag: 'Work Order',
        },
        {
          id: 'PURCHASE_ESTIMATES' as ViewMode,
          label: 'Purchase Estimate (खरीद एस्टीमेट)',
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
      title: 'Parties & Khata',
      items: [
        {
          id: 'PARTIES' as ViewMode,
          label: 'Customer & Supplier Ledger',
          icon: Users,
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
          id: 'CASH_BANK' as ViewMode,
          label: 'Cash Galla & Banks',
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
    <aside className="w-full md:w-64 shrink-0 no-print space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 space-y-4">
        {pages.map((page) => {
          return (
            <div key={page.pageNumber} className="space-y-1">
              {/* Page Section Title */}
              <div className="px-2 py-1 flex items-center justify-between">
                <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-400">
                  Page {page.pageNumber} • {page.title}
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
                      onClick={() => onSelectView(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold text-xs transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.tag && (
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                            isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {item.tag}
                          </span>
                        )}
                        {item.badge && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive ? 'bg-blue-800 text-blue-100' : item.badgeColor
                          }`}>
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-400">
            Account & Security
          </span>
          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
            Active
          </span>
        </div>

        {currentUser ? (
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                {currentUser.provider === 'google' && (
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200">
                    <GoogleGIcon className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                  {currentUser.provider === 'google' && (
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                      Google
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-mono truncate">{currentUser.email}</p>
              </div>
            </div>
            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="w-full py-1.5 px-2.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <GoogleGIcon className="w-3.5 h-3.5" />
                <span>Switch / Google Login</span>
              </button>
            )}
          </div>
        ) : (
          <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <p className="text-xs text-blue-950 font-medium leading-tight">
              Sign in with Google or Email to access your business khata & invoices.
            </p>
            {onOpenAuthModal && (
              <div className="space-y-1.5">
                <button
                  onClick={onOpenAuthModal}
                  className="w-full py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <GoogleGIcon className="w-3.5 h-3.5" />
                  <span>Continue with Google</span>
                </button>
                <button
                  onClick={onOpenAuthModal}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Email Sign In / Register</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Security & Indian GST Compliance Card */}
      <div className="p-3.5 bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl text-white space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Offline & Private</span>
        </div>
        <p className="text-[10px] text-slate-300 leading-relaxed">
          Your GST data, client khata & invoices are securely saved with 1-click JSON backup export.
        </p>
      </div>
    </aside>
  );
};
