import React from 'react';
import { 
  TrendingUp, Users, Package, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, Plus, FileText, ShoppingBag, 
  Receipt, Share2, Printer, Eye, ChevronRight, ShieldCheck, DollarSign,
  Trash2, UserCheck, Layers, FileSpreadsheet, ShoppingCart
} from 'lucide-react';
import { Invoice, Party, Item, BusinessProfile, DocumentType, ViewMode } from '../types';
import { formatIndianCurrency, getDocumentTypeName } from '../utils/gstCalculations';

interface DashboardViewProps {
  invoices: Invoice[];
  parties: Party[];
  items: Item[];
  businessProfile: BusinessProfile;
  onCreateInvoice: (docType?: DocumentType) => void;
  onOpenPos: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onDeleteInvoice?: (id: string) => void;
  onNavigateTab?: (tab: ViewMode) => void;
  onOpenHsnFinder?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  invoices = [],
  parties = [],
  items = [],
  businessProfile,
  onCreateInvoice,
  onOpenPos,
  onViewInvoice,
  onDeleteInvoice,
  onNavigateTab,
  onOpenHsnFinder,
}) => {
  // Calculations
  const taxInvoices = invoices.filter(i => i.documentType === 'TAX_INVOICE');
  
  const totalSales = taxInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalCollected = taxInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalReceivable = taxInvoices.reduce((sum, i) => sum + i.balanceDue, 0);
  
  // Total GST Collected this month
  const totalGstCollected = taxInvoices.reduce((sum, i) => sum + (i.cgstTotal + i.sgstTotal + i.igstTotal), 0);
  const totalCgst = taxInvoices.reduce((sum, i) => sum + i.cgstTotal, 0);
  const totalSgst = taxInvoices.reduce((sum, i) => sum + i.sgstTotal, 0);
  const totalIgst = taxInvoices.reduce((sum, i) => sum + i.igstTotal, 0);

  // Low Stock Items
  const lowStockItems = items.filter(item => item.currentStock <= item.minStockLevel);

  // Recent 5 Invoices
  const recentInvoices = [...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-200 border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>GSTIN: {businessProfile.gstin} • FY 2026-27</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {businessProfile.name}
            </h1>
            <p className="text-sm text-blue-200 max-w-xl">
              India's premier GST compliant billing & inventory dashboard. Manage invoices, track party khata, and file GST returns seamlessly.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onCreateInvoice('TAX_INVOICE')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs md:text-sm rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" /> New GST Invoice
            </button>
            <button
              onClick={() => onNavigateTab?.('LETTERHEAD_STUDIO')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs md:text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all transform active:scale-95"
            >
              <FileText className="w-4 h-4" /> Letterhead Studio
            </button>
            <button
              onClick={() => onNavigateTab?.('ATTENDANCE')}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all transform active:scale-95"
            >
              <UserCheck className="w-4 h-4 text-emerald-100" /> Attendance &amp; Wages
            </button>
            <button
              onClick={onOpenPos}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs md:text-sm rounded-xl backdrop-blur-md border border-white/20 transition-all"
            >
              <ShoppingBag className="w-4 h-4 text-amber-300" /> POS Counter
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-black text-slate-900">
            {formatIndianCurrency(totalSales)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{taxInvoices.length} Tax Invoices generated</span>
          </div>
        </div>

        {/* To Collect (Receivables) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">To Collect (Receivables)</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-black text-rose-700">
            {formatIndianCurrency(totalReceivable)}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Outstanding from {parties.filter(p => p.type === 'CUSTOMER').length} customers
          </div>
        </div>

        {/* GST Output Tax Payable */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">GST Output Tax</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-black text-indigo-950">
            {formatIndianCurrency(totalGstCollected)}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            CGST: {formatIndianCurrency(totalCgst, false)} | SGST: {formatIndianCurrency(totalSgst, false)} | IGST: {formatIndianCurrency(totalIgst, false)}
          </div>
        </div>

        {/* Inventory Items & Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory Status</span>
            <div className={`p-2 rounded-xl ${lowStockItems.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {lowStockItems.length > 0 ? <AlertTriangle className="w-4 h-4" /> : <Package className="w-4 h-4" />}
            </div>
          </div>
          <div className="font-mono text-2xl font-black text-slate-900">
            {items.length} <span className="text-sm font-normal text-slate-500">Products</span>
          </div>
          <div className="text-xs font-medium">
            {lowStockItems.length > 0 ? (
              <span className="text-amber-700 font-semibold">{lowStockItems.length} items low on stock!</span>
            ) : (
              <span className="text-emerald-600">All items well-stocked</span>
            )}
          </div>
        </div>

      </div>

      {/* Main Split: Recent Invoices & Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Recent Invoices List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Recent Bills & Quotations</h2>
              <p className="text-xs text-slate-500">Latest transactions with instant preview and WhatsApp sharing</p>
            </div>
            <button
              onClick={() => onNavigateTab?.('INVOICES')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All ({invoices.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentInvoices.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No bills or quotations created yet.</p>
              </div>
            ) : (
              recentInvoices.map((inv) => (
                <div 
                  key={inv.id}
                  className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4 transition-colors cursor-pointer group"
                  onClick={() => onViewInvoice(inv)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      inv.documentType === 'TAX_INVOICE' ? 'bg-blue-100 text-blue-800' :
                      inv.documentType === 'QUOTATION' ? 'bg-amber-100 text-amber-800' :
                      inv.documentType === 'DELIVERY_CHALLAN' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-900">{inv.invoiceNumber}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700">
                          {getDocumentTypeName(inv.documentType)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-medium mt-0.5 truncate">{inv.partyName}</div>
                      <div className="text-[11px] text-slate-400">{inv.date}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right space-y-1">
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {formatIndianCurrency(inv.grandTotal)}
                      </div>
                      <div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          inv.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                          inv.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {inv.paymentStatus}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Icons */}
                    <div className="flex items-center gap-1 border-l border-slate-100 pl-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onViewInvoice(inv);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title="View / Print"
                        aria-label="View Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {onDeleteInvoice && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDeleteInvoice(inv.id);
                          }}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 active:bg-rose-100 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                          title="Delete Bill"
                          aria-label="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Actions & Low Stock Alerts */}
        <div className="space-y-6">
          
          {/* Quick Create Tools */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Quick Document Creator</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onCreateInvoice('TAX_INVOICE')}
                className="p-3 text-left rounded-xl bg-blue-50/70 hover:bg-blue-50 border border-blue-100 text-blue-900 transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-600 mb-1" />
                <div className="font-bold text-xs">GST Tax Invoice</div>
                <div className="text-[10px] text-slate-500">Regular B2B / B2C</div>
              </button>

              <button
                onClick={() => onCreateInvoice('QUOTATION')}
                className="p-3 text-left rounded-xl bg-amber-50/70 hover:bg-amber-50 border border-amber-100 text-amber-900 transition-colors"
              >
                <Receipt className="w-4 h-4 text-amber-600 mb-1" />
                <div className="font-bold text-xs">Quotation &amp; Estimate</div>
                <div className="text-[10px] text-slate-500">Commercial offer</div>
              </button>

              <button
                onClick={() => onCreateInvoice('SERVICE_ORDER')}
                className="p-3 text-left rounded-xl bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-100 text-indigo-900 transition-colors"
              >
                <Layers className="w-4 h-4 text-indigo-600 mb-1" />
                <div className="font-bold text-xs">Service Order</div>
                <div className="text-[10px] text-slate-500">Work order &amp; Estimate</div>
              </button>

              <button
                onClick={() => onCreateInvoice('PURCHASE_ESTIMATE')}
                className="p-3 text-left rounded-xl bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200 text-amber-950 transition-colors"
              >
                <ShoppingCart className="w-4 h-4 text-amber-600 mb-1" />
                <div className="font-bold text-xs">Purchase Estimate</div>
                <div className="text-[10px] text-slate-500">Inward Vendor PO</div>
              </button>

              <button
                onClick={() => onCreateInvoice('DELIVERY_CHALLAN')}
                className="p-3 text-left rounded-xl bg-purple-50/70 hover:bg-purple-50 border border-purple-100 text-purple-900 transition-colors"
              >
                <Package className="w-4 h-4 text-purple-600 mb-1" />
                <div className="font-bold text-xs">Delivery Challan</div>
                <div className="text-[10px] text-slate-500">Dispatch note</div>
              </button>
            </div>
          </div>

          {/* Low Stock Warning List */}
          {lowStockItems.length > 0 && (
            <div className="bg-amber-50/60 rounded-2xl p-5 border border-amber-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Low Stock Reorder Alert</span>
              </div>
              <div className="space-y-2">
                {lowStockItems.map(item => (
                  <div key={item.id} className="bg-white p-2.5 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">HSN: {item.hsnCode}</div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-rose-600">{item.currentStock} {item.unit}</span>
                      <span className="text-[10px] text-slate-400 block">Min: {item.minStockLevel}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => onNavigateTab?.('INVENTORY')}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition-colors"
              >
                Manage Stock in Inventory
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
