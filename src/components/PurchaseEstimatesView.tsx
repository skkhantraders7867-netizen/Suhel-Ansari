import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, Plus, Search, Eye, Edit2, Copy, Trash2, 
  ArrowRight, CheckCircle2, Clock, AlertTriangle, Send, Share2, 
  Building, Phone, Calendar, Check, XCircle, FileCheck, ArrowUpRight, 
  Package, Truck, Receipt, RotateCcw, Percent, FileText, X, Printer
} from 'lucide-react';
import { Invoice, BusinessProfile, Party, PaymentVoucher, DebitVoucher } from '../types';
import { formatIndianCurrency } from '../utils/gstCalculations';
import { PartyLedgerPrintModal } from './PartyLedgerPrintModal';

interface PurchaseEstimatesViewProps {
  invoices: Invoice[];
  parties: Party[];
  businessProfile: BusinessProfile;
  paymentVouchers?: PaymentVoucher[];
  debitVouchers?: DebitVoucher[];
  onCreatePurchaseEstimate: () => void;
  onViewPurchaseEstimate: (estimate: Invoice) => void;
  onEditPurchaseEstimate: (estimate: Invoice) => void;
  onDeletePurchaseEstimate: (id: string) => void;
  onDuplicatePurchaseEstimate: (estimate: Invoice) => void;
  onConvertToPurchaseBill: (estimate: Invoice) => void;
  onUpdateStatus?: (id: string, status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED') => void;
  onUpdateInvoice?: (invoice: Invoice) => void;
}

type PurchaseEstimateStatusFilter = 'ALL' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'CONVERTED' | 'WITH_RETURNS';

export const PurchaseEstimatesView: React.FC<PurchaseEstimatesViewProps> = ({
  invoices,
  parties,
  businessProfile,
  paymentVouchers = [],
  debitVouchers = [],
  onCreatePurchaseEstimate,
  onViewPurchaseEstimate,
  onEditPurchaseEstimate,
  onDeletePurchaseEstimate,
  onDuplicatePurchaseEstimate,
  onConvertToPurchaseBill,
  onUpdateStatus,
  onUpdateInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseEstimateStatusFilter>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal state for recording / editing Return, Debit & %
  const [returnDebitTarget, setReturnDebitTarget] = useState<Invoice | null>(null);
  const [inputReturnAmount, setInputReturnAmount] = useState<number>(0);
  const [inputDebitAmount, setInputDebitAmount] = useState<number>(0);
  const [inputDebitPercent, setInputDebitPercent] = useState<number>(0);
  const [inputReturnNotes, setInputReturnNotes] = useState<string>('');

  // Party Ledger Print Modal State
  const [selectedPartyForLedger, setSelectedPartyForLedger] = useState<Party | null>(null);
  const [isSupplierSelectModalOpen, setIsSupplierSelectModalOpen] = useState<boolean>(false);

  const handleOpenLedgerForEstimate = (est: Invoice) => {
    let targetParty = parties.find(p => p.id === est.partyId);
    if (!targetParty && est.partyName) {
      targetParty = parties.find(p => p.name.trim().toLowerCase() === est.partyName.trim().toLowerCase());
    }
    if (targetParty) {
      targetParty = {
        ...targetParty,
        type: 'SUPPLIER',
      };
    } else {
      targetParty = {
        id: est.partyId || `supp-${Date.now()}`,
        name: est.partyName || 'Supplier',
        phone: est.partyPhone || '',
        gstin: est.partyGstin || '',
        billingAddress: est.partyAddress || '',
        city: est.partyCity || '',
        state: est.partyState || '',
        stateCode: est.partyStateCode || '',
        currentBalance: 0,
        type: 'SUPPLIER',
        createdAt: new Date().toISOString(),
      };
    }
    setSelectedPartyForLedger(targetParty);
  };

  // Filter purchase estimates (or purchase bills if applicable)
  const allPurchaseEstimates = useMemo(() => {
    return invoices.filter(inv => inv.documentType === 'PURCHASE_ESTIMATE' || inv.documentType === 'PURCHASE_BILL');
  }, [invoices]);

  // Metrics summary
  const metrics = useMemo(() => {
    const totalCount = allPurchaseEstimates.length;
    const totalAmount = allPurchaseEstimates.reduce((sum, pe) => sum + (pe.grandTotal || 0), 0);
    const convertedCount = allPurchaseEstimates.filter(pe => pe.quotationStatus === 'CONVERTED' || pe.notes?.includes('Converted to Purchase Bill')).length;
    const convertedAmount = allPurchaseEstimates
      .filter(pe => pe.quotationStatus === 'CONVERTED' || pe.notes?.includes('Converted to Purchase Bill'))
      .reduce((sum, pe) => sum + (pe.grandTotal || 0), 0);
    const pendingEstimates = allPurchaseEstimates.filter(pe => 
      pe.quotationStatus !== 'CONVERTED' && !pe.notes?.includes('Converted to Purchase Bill')
    );
    const pendingCount = pendingEstimates.length;
    const pendingAmount = pendingEstimates.reduce((sum, pe) => sum + (pe.grandTotal || 0), 0);

    // Return & Debit Metrics
    const totalReturnAmount = allPurchaseEstimates.reduce((sum, pe) => sum + (pe.purchaseReturnAmount || 0), 0);
    const totalDebitAmount = allPurchaseEstimates.reduce((sum, pe) => sum + (pe.purchaseDebitAmount || 0), 0);
    const totalReturnDebit = totalReturnAmount + totalDebitAmount;
    const overallPercent = totalAmount > 0 
      ? Number(((totalReturnDebit / totalAmount) * 100).toFixed(2)) 
      : 0;

    return {
      totalCount,
      totalAmount,
      convertedCount,
      convertedAmount,
      pendingCount,
      pendingAmount,
      totalReturnAmount,
      totalDebitAmount,
      overallPercent,
    };
  }, [allPurchaseEstimates]);

  // Open Return, Debit & % Edit Modal
  const handleOpenReturnDebitModal = (est: Invoice) => {
    setReturnDebitTarget(est);
    setInputReturnAmount(est.purchaseReturnAmount || 0);
    setInputDebitAmount(est.purchaseDebitAmount || 0);
    const calculatedPct = est.purchaseDebitPercent !== undefined 
      ? est.purchaseDebitPercent 
      : (est.grandTotal > 0 ? Number(((((est.purchaseReturnAmount || 0) + (est.purchaseDebitAmount || 0)) / est.grandTotal) * 100).toFixed(2)) : 0);
    setInputDebitPercent(calculatedPct);
    setInputReturnNotes(est.purchaseReturnNotes || '');
  };

  // Auto-calculate % when Return or Debit amount changes
  const handleReturnAmountChange = (val: number) => {
    setInputReturnAmount(val);
    if (returnDebitTarget && returnDebitTarget.grandTotal > 0) {
      const pct = Number((((val + inputDebitAmount) / returnDebitTarget.grandTotal) * 100).toFixed(2));
      setInputDebitPercent(pct);
    }
  };

  const handleDebitAmountChange = (val: number) => {
    setInputDebitAmount(val);
    if (returnDebitTarget && returnDebitTarget.grandTotal > 0) {
      const pct = Number((((inputReturnAmount + val) / returnDebitTarget.grandTotal) * 100).toFixed(2));
      setInputDebitPercent(pct);
    }
  };

  // Save Return, Debit & % to Invoice
  const handleSaveReturnDebit = () => {
    if (!returnDebitTarget || !onUpdateInvoice) {
      setReturnDebitTarget(null);
      return;
    }

    const updated: Invoice = {
      ...returnDebitTarget,
      purchaseReturnAmount: inputReturnAmount > 0 ? inputReturnAmount : 0,
      purchaseDebitAmount: inputDebitAmount > 0 ? inputDebitAmount : 0,
      purchaseDebitPercent: inputDebitPercent >= 0 ? inputDebitPercent : 0,
      purchaseReturnNotes: inputReturnNotes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onUpdateInvoice(updated);
    setReturnDebitTarget(null);
  };

  // Filtered list
  const filteredEstimates = useMemo(() => {
    return allPurchaseEstimates.filter(est => {
      // Search matching
      const matchesSearch = 
        est.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (est.quotationSubject && est.quotationSubject.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (est.rfqNumber && est.rfqNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (est.partyGstin && est.partyGstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (est.items && est.items.some(it => it.name.toLowerCase().includes(searchTerm.toLowerCase())));

      if (!matchesSearch) return false;

      // Status matching
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'WITH_RETURNS') {
        return (est.purchaseReturnAmount || 0) > 0 || (est.purchaseDebitAmount || 0) > 0;
      }
      if (statusFilter === 'CONVERTED') {
        return est.quotationStatus === 'CONVERTED' || est.notes?.includes('Converted to Purchase Bill');
      }
      if (statusFilter === 'PENDING') {
        return est.quotationStatus !== 'CONVERTED' && !est.notes?.includes('Converted to Purchase Bill');
      }
      if (statusFilter === 'DRAFT') {
        return est.quotationStatus === 'DRAFT';
      }
      if (statusFilter === 'APPROVED') {
        return est.quotationStatus === 'ACCEPTED' || est.quotationStatus === 'CONVERTED';
      }
      return true;
    });
  }, [allPurchaseEstimates, searchTerm, statusFilter]);

  // WhatsApp share
  const handleShareWhatsApp = (est: Invoice) => {
    const totalTax = (est.taxTotal && est.taxTotal > 0)
      ? est.taxTotal
      : ((est.cgstTotal || 0) + (est.sgstTotal || 0) + (est.igstTotal || 0));
    
    const itemsSummary = (est.items || [])
      .map((it, idx) => `${idx + 1}. ${it.name} (${it.quantity} ${it.unit}) @ ₹${it.rate}`)
      .slice(0, 4)
      .join('\n');

    const returnDebitText = ((est.purchaseReturnAmount || 0) > 0 || (est.purchaseDebitAmount || 0) > 0)
      ? `\n*Return Amount:* ₹${est.purchaseReturnAmount || 0}\n*Debit Note:* ₹${est.purchaseDebitAmount || 0}\n*Return/Debit %:* ${est.purchaseDebitPercent || 0}%\n`
      : '';

    const message = 
      `*PURCHASE ESTIMATE / INWARD PO - ${businessProfile.name}*\n\n` +
      `*Estimate No:* ${est.invoiceNumber}\n` +
      `*Date:* ${est.date}\n` +
      `*Supplier / Vendor:* ${est.partyName}\n` +
      (est.quotationSubject ? `*Subject:* ${est.quotationSubject}\n` : '') +
      (est.poNumber ? `*Ref PO No:* ${est.poNumber}\n` : '') +
      `*Expected Delivery Date:* ${est.dueDate || 'Standard'}\n\n` +
      `*Items Requested:*\n${itemsSummary}\n\n` +
      `*Estimated Taxable:* ${formatIndianCurrency(est.taxableTotal, true)}\n` +
      `*Estimated GST (18%):* ${formatIndianCurrency(totalTax, true)}\n` +
      `*Total Estimated Inward Value:* ${formatIndianCurrency(est.grandTotal, true)}\n` +
      returnDebitText +
      `\nPlease provide confirmation & dispatch details. Contact: ${businessProfile.phone || ''}. Thank you!`;

    const cleanPhone = (est.partyPhone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone.length >= 10
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
  };

  const getStatusBadge = (est: Invoice) => {
    const isConverted = est.quotationStatus === 'CONVERTED' || est.notes?.includes('Converted to Purchase Bill');
    if (isConverted) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          <FileCheck className="w-3 h-3" /> Billed
        </span>
      );
    }
    switch (est.quotationStatus) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Send className="w-3 h-3" /> Sent to Vendor
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3" /> Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-amber-200 border border-white/10">
              <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
              <span>Purchase Hub &amp; Inward POs</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
              <span>Purchase Inward Register</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/30 text-amber-300 border border-amber-400/30">
                Return, Debit &amp; Margin %
              </span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Manage purchase estimates, track supplier orders, monitor purchase returns, log debit notes, and view return/debit percentages in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const suppliers = parties.filter(p => p.type === 'SUPPLIER');
                if (suppliers.length === 1) {
                  setSelectedPartyForLedger(suppliers[0]);
                } else {
                  setIsSupplierSelectModalOpen(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 transition-all active:scale-95 cursor-pointer shadow-md"
              title="Print Supplier / Party Ledger"
            >
              <Printer className="w-4 h-4 text-cyan-300" />
              <span>🖨️ Print Ledger</span>
            </button>

            <button
              onClick={onCreatePurchaseEstimate}
              className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-all transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Purchase
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Summary Cards (Including Return, Debit & % KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Purchases */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Purchases</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-black text-slate-900">
            {formatIndianCurrency(metrics.totalAmount)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>{metrics.totalCount} Purchase records</span>
          </div>
        </div>

        {/* Total Purchase Return */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Purchase Return</span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-black text-amber-900">
            {formatIndianCurrency(metrics.totalReturnAmount)}
          </div>
          <div className="text-xs text-amber-700 font-medium">
            Material returned to suppliers
          </div>
        </div>

        {/* Total Debit Notes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">Debit Notes</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-black text-purple-900">
            {formatIndianCurrency(metrics.totalDebitAmount)}
          </div>
          <div className="text-xs text-purple-700 font-medium">
            Rate difference &amp; vendor debits
          </div>
        </div>

        {/* Overall Return & Debit % */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Return &amp; Debit %</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-black text-blue-900">
            {metrics.overallPercent}%
          </div>
          <div className="text-xs text-blue-700 font-medium">
            Avg deduction on gross inward
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Estimate No, Supplier, Item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-amber-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'ALL' as PurchaseEstimateStatusFilter, label: 'All Purchases' },
              { id: 'WITH_RETURNS' as PurchaseEstimateStatusFilter, label: 'With Returns / Debit' },
              { id: 'PENDING' as PurchaseEstimateStatusFilter, label: 'Pending' },
              { id: 'APPROVED' as PurchaseEstimateStatusFilter, label: 'Approved' },
              { id: 'CONVERTED' as PurchaseEstimateStatusFilter, label: 'Billed to Purchase Bill' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.id 
                    ? 'bg-amber-500 text-slate-950 shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Purchase Table with Return, Debit, and % Columns */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredEstimates.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No Purchase records found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'ALL' 
                ? 'No purchase records match your active search and filter criteria.' 
                : 'Create your first Purchase record to track vendor quotes, purchase returns, debit notes, and inward purchase margins.'}
            </p>
            <button
              onClick={onCreatePurchaseEstimate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Purchase
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-3 min-w-[130px]">Estimate / Bill No</th>
                  <th className="py-3.5 px-3 min-w-[150px]">Supplier / Vendor</th>
                  <th className="py-3.5 px-3 min-w-[140px]">Subject / Notes</th>
                  <th className="py-3.5 px-2 text-center w-16">Items</th>
                  <th className="py-3.5 px-3 text-right min-w-[110px]">Purchase Value</th>
                  
                  {/* Requested Columns: Return, Debit, and % */}
                  <th className="py-3.5 px-3 text-center bg-amber-50/70 border-x border-amber-100 min-w-[105px]">
                    <span className="text-amber-900 font-extrabold flex items-center justify-center gap-1">
                      <RotateCcw className="w-3 h-3 text-amber-700" /> Return (₹)
                    </span>
                  </th>
                  <th className="py-3.5 px-3 text-center bg-purple-50/70 border-r border-purple-100 min-w-[105px]">
                    <span className="text-purple-900 font-extrabold flex items-center justify-center gap-1">
                      <Receipt className="w-3 h-3 text-purple-700" /> Debit (₹)
                    </span>
                  </th>
                  <th className="py-3.5 px-2 text-center bg-blue-50/70 border-r border-blue-100 min-w-[70px]">
                    <span className="text-blue-900 font-extrabold flex items-center justify-center gap-0.5">
                      <Percent className="w-3 h-3 text-blue-700" /> %
                    </span>
                  </th>

                  <th className="py-3.5 px-3 text-center min-w-[90px]">Status</th>
                  <th className="py-3.5 px-3 text-right min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEstimates.map((est) => {
                  const isConverted = est.quotationStatus === 'CONVERTED' || est.notes?.includes('Converted to Purchase Bill');
                  const returnAmt = est.purchaseReturnAmount || 0;
                  const debitAmt = est.purchaseDebitAmount || 0;
                  const debitReturnPct = est.purchaseDebitPercent !== undefined 
                    ? est.purchaseDebitPercent 
                    : (est.grandTotal > 0 ? Number((((returnAmt + debitAmt) / est.grandTotal) * 100).toFixed(1)) : 0);

                  return (
                    <tr key={est.id} className="hover:bg-slate-50/70 transition-colors group">
                      
                      {/* Estimate No & Date */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-amber-950 text-xs flex items-center gap-1.5">
                          <span>{est.invoiceNumber}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(est.invoiceNumber);
                              setCopiedId(est.id);
                              setTimeout(() => setCopiedId(null), 1500);
                            }}
                            className="text-slate-400 hover:text-amber-700 cursor-pointer"
                            title="Copy Number"
                          >
                            {copiedId === est.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{est.date}</span>
                        </div>
                      </td>

                      {/* Supplier / Vendor Name */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{est.partyName}</div>
                        {est.partyPhone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{est.partyPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Subject / Notes */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="text-slate-800 font-medium truncate">
                          {est.quotationSubject || est.notes || 'Inward Goods Purchase'}
                        </div>
                        {est.purchaseReturnNotes && (
                          <div className="text-[10px] text-amber-700 italic truncate">
                            Note: {est.purchaseReturnNotes}
                          </div>
                        )}
                      </td>

                      {/* Items Count */}
                      <td className="py-3 px-2 text-center font-mono">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[11px]">
                          {est.items?.length || 0}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-extrabold text-slate-900 text-sm">
                          {formatIndianCurrency(est.grandTotal)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Taxable: {formatIndianCurrency(est.taxableTotal, false)}
                        </div>
                      </td>

                      {/* Column 1: Return (₹) */}
                      <td className="py-3 px-3 text-center bg-amber-50/40 border-x border-amber-100">
                        {returnAmt > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReturnDebitModal(est)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-black bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
                            title="Click to edit Return amount"
                          >
                            <span>₹{returnAmt.toLocaleString('en-IN')}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenReturnDebitModal(est)}
                            className="text-[11px] text-slate-400 hover:text-amber-700 hover:bg-amber-100/60 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                            title="Add Return Amount"
                          >
                            + Return
                          </button>
                        )}
                      </td>

                      {/* Column 2: Debit (₹) */}
                      <td className="py-3 px-3 text-center bg-purple-50/40 border-r border-purple-100">
                        {debitAmt > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReturnDebitModal(est)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-black bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200 transition-colors cursor-pointer"
                            title="Click to edit Debit amount"
                          >
                            <span>₹{debitAmt.toLocaleString('en-IN')}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenReturnDebitModal(est)}
                            className="text-[11px] text-slate-400 hover:text-purple-700 hover:bg-purple-100/60 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                            title="Add Debit Note"
                          >
                            + Debit
                          </button>
                        )}
                      </td>

                      {/* Column 3: % (Return/Debit percentage) */}
                      <td className="py-3 px-2 text-center bg-blue-50/40 border-r border-blue-100">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-mono font-bold ${
                          debitReturnPct > 0 
                            ? 'bg-blue-100 text-blue-900 border border-blue-200 font-black' 
                            : 'text-slate-400 bg-slate-100'
                        }`}>
                          {debitReturnPct}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {getStatusBadge(est)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          
                          {/* Quick Edit Return/Debit */}
                          <button
                            onClick={() => handleOpenReturnDebitModal(est)}
                            className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                            title="Set Return, Debit & %"
                          >
                            <Percent className="w-3.5 h-3.5" />
                          </button>

                          {/* View / Print Purchase */}
                          <button
                            onClick={() => onViewPurchaseEstimate(est)}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="View & Print Purchase"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Print Party / Supplier Ledger */}
                          <button
                            type="button"
                            onClick={() => handleOpenLedgerForEstimate(est)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title={`Print Ledger for ${est.partyName || 'Supplier'}`}
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            onClick={() => handleShareWhatsApp(est)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* 1-Click Convert to Inward Purchase Bill */}
                          {!isConverted && (
                            <button
                              onClick={() => onConvertToPurchaseBill(est)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10.5px] rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Convert to Inward Purchase Bill"
                            >
                              <ArrowRight className="w-3 h-3" /> Bill
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => onEditPurchaseEstimate(est)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Purchase"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => onDuplicatePurchaseEstimate(est)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Duplicate as New"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => onDeletePurchaseEstimate(est.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Purchase"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Return, Debit & % Edit Modal */}
      {returnDebitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-amber-600" />
                  <span>Purchase Return, Debit &amp; %</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {returnDebitTarget.invoiceNumber} • {returnDebitTarget.partyName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReturnDebitTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Summary Banner */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Gross Purchase Value:</span>
              <span className="font-mono font-black text-slate-900 text-sm">
                {formatIndianCurrency(returnDebitTarget.grandTotal)}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              
              {/* Return Amount */}
              <div>
                <label className="block font-bold text-amber-900 uppercase mb-1 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  Return Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={inputReturnAmount || ''}
                  onChange={(e) => handleReturnAmountChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-amber-600"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Goods/material value returned back to supplier
                </span>
              </div>

              {/* Debit Note Amount */}
              <div>
                <label className="block font-bold text-purple-900 uppercase mb-1 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-purple-600" />
                  Debit Note Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={inputDebitAmount || ''}
                  onChange={(e) => handleDebitAmountChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-purple-600"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Debit note issued for rate difference, discount or shortage
                </span>
              </div>

              {/* Debit / Return % */}
              <div>
                <label className="block font-bold text-blue-900 uppercase mb-1 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-blue-600" />
                  Return &amp; Debit % (Auto-calculated / Custom)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0"
                    value={inputDebitPercent || ''}
                    onChange={(e) => setInputDebitPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-blue-300 rounded-xl pl-3 pr-8 py-2 text-sm font-mono font-bold text-blue-900 focus:outline-blue-600"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-blue-600 text-xs">%</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Total deduction: {(((inputReturnAmount + inputDebitAmount) / (returnDebitTarget.grandTotal || 1)) * 100).toFixed(1)}% of bill value
                </span>
              </div>

              {/* Return Notes / Reason */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Reason / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5 Pcs damaged in transit, rate diff 2%"
                  value={inputReturnNotes}
                  onChange={(e) => setInputReturnNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-blue-600"
                />
              </div>

              {/* Live Net Purchase Summary */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Inward Value:</span>
                  <span className="font-mono">₹{returnDebitTarget.grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-amber-800 font-medium">
                  <span>Less: Return &amp; Debit Total:</span>
                  <span className="font-mono font-bold">-₹{(inputReturnAmount + inputDebitAmount).toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-amber-200 pt-1 flex justify-between font-extrabold text-slate-900">
                  <span>Net Payable to Vendor:</span>
                  <span className="font-mono text-emerald-800 text-sm">
                    ₹{Math.max(0, returnDebitTarget.grandTotal - (inputReturnAmount + inputDebitAmount)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReturnDebitTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReturnDebit}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
              >
                Save Return, Debit &amp; %
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Supplier Selection Modal for Header Print Ledger Button */}
      {isSupplierSelectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm">Select Supplier to Print Ledger</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsSupplierSelectModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto divide-y divide-slate-100">
              {parties.filter(p => p.type === 'SUPPLIER').length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No suppliers registered yet. You can also print ledger directly using the printer icon on each purchase row.
                </div>
              ) : (
                parties.filter(p => p.type === 'SUPPLIER').map((supp) => (
                  <button
                    key={supp.id}
                    type="button"
                    onClick={() => {
                      setSelectedPartyForLedger(supp);
                      setIsSupplierSelectModalOpen(false);
                    }}
                    className="w-full py-3 px-3 hover:bg-slate-50 flex items-center justify-between text-left transition-colors cursor-pointer rounded-xl group"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs group-hover:text-blue-600">{supp.name}</div>
                      <div className="text-[11px] text-slate-500">{supp.phone} {supp.city ? `• ${supp.city}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                      <span>Open Ledger</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Party Ledger Statement Modal */}
      {selectedPartyForLedger && (
        <PartyLedgerPrintModal 
          isOpen={Boolean(selectedPartyForLedger)}
          onClose={() => setSelectedPartyForLedger(null)}
          party={selectedPartyForLedger}
          invoices={invoices}
          businessProfile={businessProfile}
          paymentVouchers={paymentVouchers}
          debitVouchers={debitVouchers}
        />
      )}

    </div>
  );
};

