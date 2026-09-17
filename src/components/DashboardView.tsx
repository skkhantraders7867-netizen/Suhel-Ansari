import React, { useMemo } from 'react';
import { 
  TrendingUp, Package, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, Plus, FileText, ShoppingBag, 
  Receipt, Eye, ChevronRight, ShieldCheck,
  Trash2, Layers, ShoppingCart,
  CheckCircle2, Wallet, BookOpen
} from 'lucide-react';
import { Invoice, Party, Item, BusinessProfile, DocumentType, ViewMode, PaymentVoucher } from '../types';
import { formatIndianCurrency, getDocumentTypeName } from '../utils/gstCalculations';

interface DashboardViewProps {
  invoices: Invoice[];
  parties: Party[];
  items: Item[];
  businessProfile: BusinessProfile;
  paymentVouchers?: PaymentVoucher[];
  onCreateInvoice: (docType?: DocumentType) => void;
  onOpenPos: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onDeleteInvoice?: (id: string) => void;
  onDeleteParty?: (id: string) => void;
  onNavigateTab?: (tab: ViewMode) => void;
  onOpenHsnFinder?: () => void;
  onUpdateParty?: (party: Party) => void;
  onRecordVoucherForParty?: (party: Party) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  invoices = [],
  parties = [],
  items = [],
  businessProfile,
  paymentVouchers = [],
  onCreateInvoice,
  onOpenPos,
  onViewInvoice,
  onDeleteInvoice,
  onDeleteParty,
  onNavigateTab,
  onOpenHsnFinder,
  onUpdateParty,
  onRecordVoucherForParty,
}) => {
  // Calculations
  const taxInvoices = invoices.filter(i => i.documentType === 'TAX_INVOICE');
  
  const totalSales = taxInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalCollected = taxInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalReceivable = taxInvoices.reduce((sum, i) => sum + i.balanceDue, 0);
  
  // Low Stock Items
  const lowStockItems = items.filter(item => item.currentStock <= item.minStockLevel);

  // Recent 5 Invoices
  const recentInvoices = [...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  // --- LEDGER & VOUCHER KHATA SUMMARY COMPUTATION ---
  const partyKhataSummaries = useMemo(() => {
    return parties.map((party) => {
      // 1. Opening Balance
      const opBal = party.openingBalanceType === 'CR' 
        ? -Math.abs(party.openingBalance || 0) 
        : Math.abs(party.openingBalance || 0);

      // 2. Party Invoices (Tax Invoices, Bills, etc. Exclude Quotations/Estimates)
      const partyInvs = invoices.filter(
        inv => (
          (inv.partyId && party.id && inv.partyId === party.id) || 
          (inv.partyName && party.name && inv.partyName.trim().toLowerCase() === party.name.trim().toLowerCase())
        ) && 
        inv.documentType !== 'QUOTATION' && inv.documentType !== 'PURCHASE_ESTIMATE'
      );

      // Total Billed Amount (Debit)
      const totalBilled = partyInvs.reduce((sum, inv) => {
        const invAmt = Number(
          inv.grandTotal ?? 
          (inv as any).total ?? 
          (inv as any).finalAmount ?? 
          (inv.taxableTotal ? (inv.taxableTotal + (inv.cgstTotal || 0) + (inv.sgstTotal || 0) + (inv.igstTotal || 0) + (inv.cessTotal || 0) + (inv.roundOff || 0)) : 0) ??
          (inv.items && inv.items.length > 0 ? inv.items.reduce((s, it) => s + (it.totalAmount || (it.quantity * it.rate)), 0) : 0)
        ) || 0;
        return sum + invAmt;
      }, 0);

      // TDS Deductions
      const totalTds = partyInvs.reduce((sum, inv) => sum + (inv.tdsAmount || 0), 0);

      // 3. Party Vouchers
      const partyVouchersList = paymentVouchers.filter(
        pv => (
          (pv.partyId && party.id && pv.partyId === party.id) || 
          (pv.partyName && party.name && pv.partyName.trim().toLowerCase() === party.name.trim().toLowerCase())
        )
      );

      const voucherReceivedTotal = partyVouchersList.reduce((sum, pv) => sum + Number(pv.amount || 0), 0);

      // Direct Invoice Payments (excluding those recorded via vouchers)
      const directPaymentsTotal = partyInvs.reduce((sum, inv) => {
        const hasVoucher = partyVouchersList.some(pv => pv.invoiceId === inv.id);
        return sum + (!hasVoucher ? (inv.paidAmount || 0) : 0);
      }, 0);

      const totalReceived = voucherReceivedTotal + directPaymentsTotal;

      // Net Remaining / Outstanding Balance
      // Positive = Receivable (Dr), Negative = Advance (Cr), Zero = Settled
      const netBalance = opBal + totalBilled - totalReceived - totalTds;

      return {
        party,
        openingBalance: opBal,
        totalBilled,
        totalReceived,
        totalTds,
        netBalance,
        voucherCount: partyVouchersList.length,
        invoiceCount: partyInvs.length,
      };
    });
  }, [parties, invoices, paymentVouchers]);

  // Aggregate Totals across all parties
  const aggregateKhata = useMemo(() => {
    let totalBilledAll = 0;
    let totalReceivedAll = 0;
    let totalPendingReceivableAll = 0;
    let totalAdvanceAll = 0;

    partyKhataSummaries.forEach(p => {
      totalBilledAll += p.totalBilled;
      totalReceivedAll += p.totalReceived;
      if (p.netBalance > 0) {
        totalPendingReceivableAll += p.netBalance;
      } else if (p.netBalance < 0) {
        totalAdvanceAll += Math.abs(p.netBalance);
      }
    });

    return {
      totalBilledAll,
      totalReceivedAll,
      totalPendingReceivableAll,
      totalAdvanceAll,
    };
  }, [partyKhataSummaries]);

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
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs md:text-sm rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New GST Invoice
            </button>
            <button
              onClick={() => onNavigateTab?.('PAYMENT_VOUCHERS')}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all transform active:scale-95 cursor-pointer"
            >
              <Wallet className="w-4 h-4" /> Payment Vouchers (वाउचर)
            </button>
            <button
              onClick={() => onNavigateTab?.('PARTIES')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs md:text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all transform active:scale-95 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" /> Party Khata & Ledgers
            </button>
            <button
              onClick={onOpenPos}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs md:text-sm rounded-xl backdrop-blur-md border border-white/20 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-amber-300" /> POS Counter
            </button>
          </div>
        </div>
      </div>

      {/* 3 Metric Cards Grid: कुल बिल (Billed), कुल प्राप्त (Received), कुल बाकी (Pending Due) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        
        {/* 1. कुल बिल (Billed) */}
        <div className="bg-white p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              कुल बिल (Billed)
            </span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="font-mono text-2xl lg:text-3xl font-black text-slate-900">
            {formatIndianCurrency(aggregateKhata.totalBilledAll)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{taxInvoices.length} Tax Invoices generated</span>
          </div>
        </div>

        {/* 2. कुल प्राप्त (Received) */}
        <div className="bg-white p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              कुल प्राप्त (Received)
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="font-mono text-2xl lg:text-3xl font-black text-emerald-700">
            {formatIndianCurrency(aggregateKhata.totalReceivedAll)}
          </div>
          <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{paymentVouchers.length} Payment Vouchers recorded</span>
          </div>
        </div>

        {/* 3. कुल बाकी (Pending Due) */}
        <div className="bg-white p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              कुल बाकी (Pending Due)
            </span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="font-mono text-2xl lg:text-3xl font-black text-rose-700">
            {formatIndianCurrency(aggregateKhata.totalPendingReceivableAll)}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Outstanding from {partyKhataSummaries.filter(p => p.netBalance > 0).length} parties
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
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
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
                        className="p-2 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
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
                className="p-3 text-left rounded-xl bg-blue-50/70 hover:bg-blue-50 border border-blue-100 text-blue-900 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-blue-600 mb-1" />
                <div className="font-bold text-xs">GST Tax Invoice</div>
                <div className="text-[10px] text-slate-500">Regular B2B / B2C</div>
              </button>

              <button
                onClick={() => onCreateInvoice('QUOTATION')}
                className="p-3 text-left rounded-xl bg-amber-50/70 hover:bg-amber-50 border border-amber-100 text-amber-900 transition-colors cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-amber-600 mb-1" />
                <div className="font-bold text-xs">Quotation &amp; Estimate</div>
                <div className="text-[10px] text-slate-500">Commercial offer</div>
              </button>

              <button
                onClick={() => onCreateInvoice('SERVICE_ORDER')}
                className="p-3 text-left rounded-xl bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-100 text-indigo-900 transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4 text-indigo-600 mb-1" />
                <div className="font-bold text-xs">Service Order</div>
                <div className="text-[10px] text-slate-500">Work order &amp; Estimate</div>
              </button>

              <button
                onClick={() => onCreateInvoice('PURCHASE_ESTIMATE')}
                className="p-3 text-left rounded-xl bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200 text-amber-950 transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4 text-amber-600 mb-1" />
                <div className="font-bold text-xs">Purchase Estimate</div>
                <div className="text-[10px] text-slate-500">Inward Vendor PO</div>
              </button>

              <button
                onClick={() => onCreateInvoice('DELIVERY_CHALLAN')}
                className="p-3 text-left rounded-xl bg-purple-50/70 hover:bg-purple-50 border border-purple-100 text-purple-900 transition-colors cursor-pointer"
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
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
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
