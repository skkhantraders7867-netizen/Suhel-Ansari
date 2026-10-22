import React, { useState, useMemo } from 'react';
import { 
  Bell, AlertTriangle, AlertCircle, Calendar, 
  CheckCircle2, X, ChevronRight, FileText, Package, ArrowUpRight
} from 'lucide-react';
import { Invoice, Item, ViewMode } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  items: Item[];
  onSelectView: (view: ViewMode) => void;
  onSelectInvoice?: (inv: Invoice) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  invoices = [],
  items = [],
  onSelectView,
  onSelectInvoice,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'OVERDUE' | 'STOCK' | 'COMPLIANCE'>('ALL');

  // Real calculations
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const overdueInvoices = useMemo(() => {
    return invoices.filter(inv => {
      return (
        inv.paymentStatus === 'OVERDUE' ||
        ((inv.balanceDue || 0) > 0 && inv.dueDate && inv.dueDate < todayStr)
      );
    });
  }, [invoices, todayStr]);

  const lowStockItems = useMemo(() => {
    return items.filter(it => (it.currentStock ?? 0) <= (it.minStockLevel ?? 5));
  }, [items]);

  // Tax reminders
  const complianceAlerts = useMemo(() => {
    const now = new Date();
    const day = now.getDate();
    return [
      {
        id: 'comp-gstr1',
        title: 'GSTR-1 Monthly Return Filing',
        description: 'Outward supplies statement due by 11th of every month on GST portal.',
        dueStatus: day <= 11 ? `Due in ${11 - day} days` : 'Past due / next cycle',
        urgent: day >= 8 && day <= 11,
      },
      {
        id: 'comp-gstr3b',
        title: 'GSTR-3B Monthly Return Filing',
        description: 'Summary return & tax payment due by 20th of every month.',
        dueStatus: day <= 20 ? `Due in ${20 - day} days` : 'Past due / next cycle',
        urgent: day >= 16 && day <= 20,
      },
      {
        id: 'comp-payroll',
        title: 'Monthly Staff Wage Register',
        description: 'Generate monthly attendance summary & staff salary disbursement advice.',
        dueStatus: 'End of current month',
        urgent: false,
      },
    ];
  }, []);

  const totalAlertCount = overdueInvoices.length + lowStockItems.length + (complianceAlerts.filter(c => c.urgent).length);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-5 bg-black/70 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-[#050b1d] border border-[#1b2b5d] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_25px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col max-h-[88vh] animate-in slide-in-from-right-10 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#14234b] bg-[#070e24] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white font-heading">
                Command Alerts &amp; Notifications
              </h3>
              <p className="text-[10.5px] text-slate-400">
                {totalAlertCount > 0 ? `${totalAlertCount} items require your attention` : 'All business records are up to date'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#101b3d] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 p-2 bg-[#040816] border-b border-[#14234b] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'ALL' 
                ? 'bg-blue-600/30 text-cyan-300 border border-cyan-400/40' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({totalAlertCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OVERDUE')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'OVERDUE' 
                ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overdue ({overdueInvoices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STOCK')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'STOCK' 
                ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Low Stock ({lowStockItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COMPLIANCE')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'COMPLIANCE' 
                ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-500/40' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            GST Due
          </button>
        </div>

        {/* Scrollable Notifications Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
          
          {/* Overdue Invoices List */}
          {(activeTab === 'ALL' || activeTab === 'OVERDUE') && overdueInvoices.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-extrabold uppercase text-rose-400/90 tracking-wider flex items-center gap-1.5 px-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Overdue Invoices ({overdueInvoices.length})</span>
              </div>
              {overdueInvoices.map(inv => (
                <div 
                  key={inv.id}
                  onClick={() => {
                    onSelectInvoice?.(inv);
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-gradient-to-r from-rose-950/30 to-[#0a122e] border border-rose-500/30 hover:border-rose-400/60 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white group-hover:text-rose-300 transition-colors">
                        {inv.invoiceNumber}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-800">
                        ₹{inv.balanceDue?.toLocaleString('en-IN')} Due
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 truncate mt-0.5">
                      {inv.partyName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Due date: {inv.dueDate || inv.date || 'Past due'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition-colors shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Low Stock Items List */}
          {(activeTab === 'ALL' || activeTab === 'STOCK') && lowStockItems.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <div className="text-[10px] font-extrabold uppercase text-amber-400/90 tracking-wider flex items-center gap-1.5 px-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Low Stock Items ({lowStockItems.length})</span>
              </div>
              {lowStockItems.map(item => (
                <div 
                  key={item.id}
                  onClick={() => {
                    onSelectView('INVENTORY');
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-gradient-to-r from-amber-950/30 to-[#0a122e] border border-amber-500/30 hover:border-amber-400/60 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors truncate">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800 shrink-0">
                        {item.currentStock ?? 0} {item.unit || 'left'}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">
                      HSN: {item.hsnCode || 'N/A'} · Rate: ₹{item.sellingPrice || 0}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Compliance Deadlines */}
          {(activeTab === 'ALL' || activeTab === 'COMPLIANCE') && (
            <div className="space-y-1.5 pt-2">
              <div className="text-[10px] font-extrabold uppercase text-cyan-400/90 tracking-wider flex items-center gap-1.5 px-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>GST Compliance Deadlines</span>
              </div>
              {complianceAlerts.map(comp => (
                <div 
                  key={comp.id}
                  onClick={() => {
                    onSelectView('REPORTS');
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-gradient-to-r from-blue-950/30 to-[#0a122e] border border-[#1b2b5d] hover:border-cyan-500/50 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                        {comp.title}
                      </span>
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${
                        comp.urgent 
                          ? 'text-rose-400 bg-rose-950/60 border-rose-800' 
                          : 'text-cyan-300 bg-cyan-950/60 border-cyan-800'
                      }`}>
                        {comp.dueStatus}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                      {comp.description}
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state when nothing is overdue or low stock */}
          {overdueInvoices.length === 0 && lowStockItems.length === 0 && activeTab !== 'COMPLIANCE' && (
            <div className="text-center py-8 px-4 bg-[#070e24] rounded-xl border border-[#14234b]">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-white">No overdue invoices or low stock warnings!</p>
              <p className="text-[11px] text-slate-400 mt-1">All client collections are on track and catalog stock levels are healthy.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#040816] border-t border-[#14234b] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Local DB &amp; Auto-Sync Active</span>
          </div>
          <button 
            type="button" 
            onClick={() => {
              onSelectView('INVOICES');
              onClose();
            }}
            className="text-cyan-400 hover:text-cyan-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <span>All Invoices</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
