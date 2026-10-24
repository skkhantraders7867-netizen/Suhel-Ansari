import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, FileText, Users, Package, ArrowRight, Plus, 
  Receipt, ShoppingBag, LayoutDashboard, Settings, Layers, 
  Truck, Wallet, HardHat, FileSpreadsheet, UserCheck, Scale, QrCode, ArrowUpRight
} from 'lucide-react';
import { ViewMode, Invoice, Party, Item, DocumentType } from '../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  parties: Party[];
  items: Item[];
  onSelectView: (view: ViewMode) => void;
  onSelectInvoice?: (inv: Invoice) => void;
  onCreateInvoice?: (type: DocumentType) => void;
  onOpenSettings?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  invoices,
  parties,
  items,
  onSelectView,
  onSelectInvoice,
  onCreateInvoice,
  onOpenSettings,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    const results: Array<{
      id: string;
      category: 'Action' | 'Navigation' | 'Invoice' | 'Party' | 'Item';
      title: string;
      subtitle: string;
      badge?: string;
      badgeColor?: string;
      icon: React.ComponentType<{ className?: string }>;
      action: () => void;
    }> = [];

    // Quick Actions
    const quickActions = [
      {
        id: 'action-new-tax-inv',
        category: 'Action' as const,
        title: 'Create New Tax Invoice',
        subtitle: 'B2B / B2C GST billing with automatic tax calculations',
        badge: 'Ctrl+N',
        badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800',
        icon: Plus,
        action: () => {
          onCreateInvoice?.('TAX_INVOICE');
          onClose();
        },
      },
      {
        id: 'action-pos',
        category: 'Action' as const,
        title: 'Open POS Counter Sale',
        subtitle: 'High-speed retail counter billing with barcode & thermal print',
        badge: 'POS',
        badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800',
        icon: ShoppingBag,
        action: () => {
          onSelectView('POS');
          onClose();
        },
      },
      {
        id: 'action-new-quote',
        category: 'Action' as const,
        title: 'Create Quotation / Estimate',
        subtitle: 'Commercial price quote with custom terms & conditions',
        badge: 'Quote',
        badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
        icon: FileSpreadsheet,
        action: () => {
          onCreateInvoice?.('QUOTATION');
          onClose();
        },
      },
      {
        id: 'action-voucher',
        category: 'Action' as const,
        title: 'Payment Received Dashboard',
        subtitle: 'Customer receipts, receivables, cash & bank inflow intelligence',
        badge: 'Receipts',
        badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800',
        icon: Receipt,
        action: () => {
          onSelectView('PAYMENT_VOUCHERS');
          onClose();
        },
      },
      {
        id: 'action-settings',
        category: 'Action' as const,
        title: 'Business Profile & GST Settings',
        subtitle: 'Company name, address, GSTIN, bank details and invoice templates',
        badge: 'Config',
        badgeColor: 'text-slate-400 bg-slate-900 border-slate-700',
        icon: Settings,
        action: () => {
          onOpenSettings?.();
          onClose();
        },
      },
    ];

    // Navigation Pages
    const navPages = [
      { id: 'nav-dashboard', title: 'Dashboard & Command Overview', view: 'DASHBOARD' as ViewMode, icon: LayoutDashboard },
      { id: 'nav-invoices', title: 'Tax Invoices & Bills', view: 'INVOICES' as ViewMode, icon: FileText },
      { id: 'nav-quotations', title: 'Quotations & Commercial Offers', view: 'QUOTATIONS' as ViewMode, icon: FileSpreadsheet },
      { id: 'nav-service-orders', title: 'Service Orders & Work Orders', view: 'SERVICE_ORDERS' as ViewMode, icon: Layers },
      { id: 'nav-parties', title: 'Customer & Supplier Ledgers', view: 'PARTIES' as ViewMode, icon: Users },
      { id: 'nav-inventory', title: 'Products, Catalog & Live Stock', view: 'INVENTORY' as ViewMode, icon: Package },
      { id: 'nav-barcodes', title: 'Barcode Label Studio', view: 'BARCODE_STUDIO' as ViewMode, icon: QrCode },
      { id: 'nav-expenses', title: 'Business Expenses & P&L', view: 'EXPENSES' as ViewMode, icon: Receipt },
      { id: 'nav-site-expenses', title: 'Project Site Expenses (7 Categories)', view: 'SITE_EXPENSES' as ViewMode, icon: HardHat },
      { id: 'nav-cash-bank', title: 'Cash Drawer Galla & Bank Accounts', view: 'CASH_BANK' as ViewMode, icon: Wallet },
      { id: 'nav-eway', title: 'E-Way Bills & Transit JSON', view: 'EWAY_BILLS' as ViewMode, icon: Truck },
      { id: 'nav-gst-ledger', title: 'GST Ledger & Input Tax Credit', view: 'GST_LEDGER' as ViewMode, icon: FileText },
      { id: 'nav-opening-balance', title: 'Opening Balances (FY DR/CR)', view: 'OPENING_BALANCES' as ViewMode, icon: Scale },
      { id: 'nav-attendance', title: 'Staff Attendance & Wages Register', view: 'ATTENDANCE' as ViewMode, icon: UserCheck },
    ];

    if (!q) {
      // Default initial state: show actions & primary navigation
      quickActions.forEach(a => results.push(a));
      navPages.slice(0, 5).forEach(n => {
        results.push({
          id: n.id,
          category: 'Navigation',
          title: n.title,
          subtitle: `Navigate to ${n.title}`,
          icon: n.icon,
          action: () => {
            onSelectView(n.view);
            onClose();
          },
        });
      });
      return results;
    }

    // Filter Quick Actions
    quickActions.forEach(a => {
      if (a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)) {
        results.push(a);
      }
    });

    // Filter Navigation Pages
    navPages.forEach(n => {
      if (n.title.toLowerCase().includes(q)) {
        results.push({
          id: n.id,
          category: 'Navigation',
          title: n.title,
          subtitle: `Jump directly to ${n.title}`,
          icon: n.icon,
          action: () => {
            onSelectView(n.view);
            onClose();
          },
        });
      }
    });

    // Filter Invoices (up to 5)
    const matchedInvoices = invoices.filter(inv => 
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.partyName?.toLowerCase().includes(q) ||
      inv.partyGstin?.toLowerCase().includes(q) ||
      inv.grandTotal?.toString().includes(q)
    ).slice(0, 5);

    matchedInvoices.forEach(inv => {
      results.push({
        id: `inv-${inv.id}`,
        category: 'Invoice',
        title: `${inv.invoiceNumber} — ${inv.partyName}`,
        subtitle: `₹${inv.grandTotal.toLocaleString('en-IN')} · ${inv.date} · ${inv.paymentStatus || 'UNPAID'}`,
        badge: inv.documentType || 'BILL',
        badgeColor: 'text-cyan-300 bg-cyan-950/70 border-cyan-800',
        icon: FileText,
        action: () => {
          onSelectInvoice?.(inv);
          onClose();
        },
      });
    });

    // Filter Parties (up to 4)
    const matchedParties = parties.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.gstin?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q)
    ).slice(0, 4);

    matchedParties.forEach(p => {
      results.push({
        id: `party-${p.id}`,
        category: 'Party',
        title: p.name,
        subtitle: `${p.city || 'Local'} · Phone: ${p.phone || 'N/A'} · GSTIN: ${p.gstin || 'Unregistered'}`,
        badge: (p.currentBalance || 0) > 0 ? `Due ₹${p.currentBalance}` : 'Customer',
        badgeColor: (p.currentBalance || 0) > 0 ? 'text-amber-400 bg-amber-950/60 border-amber-800' : 'text-slate-300 bg-slate-900 border-slate-700',
        icon: Users,
        action: () => {
          onSelectView('PARTIES');
          onClose();
        },
      });
    });

    // Filter Items (up to 4)
    const matchedItems = items.filter(it =>
      it.name?.toLowerCase().includes(q) ||
      it.hsnCode?.toLowerCase().includes(q) ||
      it.category?.toLowerCase().includes(q)
    ).slice(0, 4);

    matchedItems.forEach(it => {
      const stock = it.currentStock ?? 0;
      const minStock = it.minStockLevel ?? 5;
      const isLow = stock <= minStock;
      results.push({
        id: `item-${it.id}`,
        category: 'Item',
        title: it.name,
        subtitle: `HSN: ${it.hsnCode || 'N/A'} · Price: ₹${it.sellingPrice || 0} · Stock: ${stock} ${it.unit || 'PCS'}`,
        badge: isLow ? 'Low Stock' : `${stock} in stock`,
        badgeColor: isLow ? 'text-rose-400 bg-rose-950/60 border-rose-800' : 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
        icon: Package,
        action: () => {
          onSelectView('INVENTORY');
          onClose();
        },
      });
    });

    return results;
  }, [query, invoices, parties, items, onSelectView, onSelectInvoice, onCreateInvoice, onOpenSettings, onClose]);

  // Keyboard navigation inside command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, searchResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        searchResults[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-gradient-to-b from-[#070e28] to-[#040817] border border-cyan-500/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-[#15234c] bg-[#060c22]/80">
          <Search className="w-5 h-5 text-cyan-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search bills, parties, stock or actions..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-slate-500 outline-none font-medium"
          />
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400 bg-[#0d183d] px-2 py-0.5 rounded border border-[#1b2b5d]">
              ESC to exit
            </span>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {searchResults.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Search className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-slate-300">No matching results found</p>
              <p className="text-xs text-slate-500 mt-1">Try searching for an invoice number, party name, item HSN or action.</p>
            </div>
          ) : (
            searchResults.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = selectedIndex === idx;

              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-gradient-to-r from-blue-600/30 via-cyan-500/20 to-transparent border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-white' 
                      : 'text-slate-300 hover:bg-[#0a1435] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isSelected 
                        ? 'bg-blue-600/30 border-cyan-400/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                        : 'bg-[#0a1538] border-[#182859] text-slate-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="font-bold text-xs sm:text-sm truncate text-white flex items-center gap-2">
                        <span>{item.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.badge && (
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${item.badgeColor || 'text-slate-400 bg-slate-900 border-slate-700'}`}>
                        {item.badge}
                      </span>
                    )}
                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2 bg-[#040816] border-t border-[#14234b] text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><strong className="text-slate-200">↑↓</strong> Navigate</span>
            <span><strong className="text-slate-200">↵</strong> Select</span>
            <span><strong className="text-slate-200">ESC</strong> Close</span>
          </div>
          <span className="text-cyan-400/80 font-mono text-[10px]">SR Group Command Center</span>
        </div>
      </div>
    </div>
  );
};
