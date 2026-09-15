import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, Plus, Search, Eye, Edit2, Copy, Trash2, 
  ArrowRight, CheckCircle2, Clock, AlertTriangle, Send, Share2, 
  Building, Phone, Calendar, Check, XCircle, FileCheck, ArrowUpRight, 
  Package, Truck, Receipt
} from 'lucide-react';
import { Invoice, BusinessProfile, Party } from '../types';
import { formatIndianCurrency } from '../utils/gstCalculations';

interface PurchaseEstimatesViewProps {
  invoices: Invoice[];
  parties: Party[];
  businessProfile: BusinessProfile;
  onCreatePurchaseEstimate: () => void;
  onViewPurchaseEstimate: (estimate: Invoice) => void;
  onEditPurchaseEstimate: (estimate: Invoice) => void;
  onDeletePurchaseEstimate: (id: string) => void;
  onDuplicatePurchaseEstimate: (estimate: Invoice) => void;
  onConvertToPurchaseBill: (estimate: Invoice) => void;
  onUpdateStatus?: (id: string, status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED') => void;
}

type PurchaseEstimateStatusFilter = 'ALL' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'CONVERTED';

export const PurchaseEstimatesView: React.FC<PurchaseEstimatesViewProps> = ({
  invoices,
  parties,
  businessProfile,
  onCreatePurchaseEstimate,
  onViewPurchaseEstimate,
  onEditPurchaseEstimate,
  onDeletePurchaseEstimate,
  onDuplicatePurchaseEstimate,
  onConvertToPurchaseBill,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseEstimateStatusFilter>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter only purchase estimates
  const allPurchaseEstimates = useMemo(() => {
    return invoices.filter(inv => inv.documentType === 'PURCHASE_ESTIMATE');
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

    return {
      totalCount,
      totalAmount,
      convertedCount,
      convertedAmount,
      pendingCount,
      pendingAmount,
    };
  }, [allPurchaseEstimates]);

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
      `*Total Estimated Inward Value:* ${formatIndianCurrency(est.grandTotal, true)}\n\n` +
      `Please provide confirmation & dispatch details. Contact: ${businessProfile.phone || ''}. Thank you!`;

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
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          <FileCheck className="w-3.5 h-3.5" /> Billed to Purchase Bill
        </span>
      );
    }
    switch (est.quotationStatus) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved by Vendor
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Cancelled / Rejected
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5" /> Draft Estimate
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Pending Inward Stock
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
              <span>Purchase Estimates &amp; Inward Orders (खरीद एस्टीमेट व कोटेशन)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
              <span>Purchase Estimates</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/30 text-amber-300 border border-amber-400/30">
                Vendor Quotations
              </span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Create supplier purchase estimates, track vendor quotes, compare inward costs, and convert approved estimates to Inward Purchase Bills with 1 click.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCreatePurchaseEstimate}
              className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" /> Create Purchase Estimate
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Purchase Estimates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Purchase Estimates</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-black text-slate-900">
            {formatIndianCurrency(metrics.totalAmount)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>{metrics.totalCount} Purchase estimates created</span>
          </div>
        </div>

        {/* Pending Inward Estimates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Vendor Inward</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-black text-blue-900">
            {formatIndianCurrency(metrics.pendingAmount)}
          </div>
          <div className="text-xs text-blue-700 font-medium">
            {metrics.pendingCount} Estimates awaiting supplier delivery
          </div>
        </div>

        {/* Billed to Purchase Bill */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Billed to Purchase Bill</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-black text-emerald-700">
            {formatIndianCurrency(metrics.convertedAmount)}
          </div>
          <div className="text-xs text-emerald-700 font-medium">
            {metrics.convertedCount} Converted to official Purchase Bill
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
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'ALL' as PurchaseEstimateStatusFilter, label: 'All Estimates' },
              { id: 'PENDING' as PurchaseEstimateStatusFilter, label: 'Pending' },
              { id: 'APPROVED' as PurchaseEstimateStatusFilter, label: 'Approved' },
              { id: 'CONVERTED' as PurchaseEstimateStatusFilter, label: 'Billed to Purchase Bill' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-colors ${
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

      {/* Purchase Estimates Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredEstimates.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No Purchase Estimates found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'ALL' 
                ? 'No purchase estimates match your active search and filter criteria.' 
                : 'Create your first Purchase Estimate to record supplier quotes and calculate inward purchase margins.'}
            </p>
            <button
              onClick={onCreatePurchaseEstimate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" /> Create Purchase Estimate
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Estimate No &amp; Date</th>
                  <th className="py-3.5 px-4">Supplier / Vendor</th>
                  <th className="py-3.5 px-4">Subject / Notes</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4 text-right">Estimate Value</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEstimates.map((est) => {
                  const isConverted = est.quotationStatus === 'CONVERTED' || est.notes?.includes('Converted to Purchase Bill');

                  return (
                    <tr key={est.id} className="hover:bg-slate-50/70 transition-colors group">
                      
                      {/* Estimate No & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-amber-950 text-xs flex items-center gap-1.5">
                          <span>{est.invoiceNumber}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(est.invoiceNumber);
                              setCopiedId(est.id);
                              setTimeout(() => setCopiedId(null), 1500);
                            }}
                            className="text-slate-400 hover:text-amber-700"
                            title="Copy Estimate Number"
                          >
                            {copiedId === est.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{est.date}</span>
                          {est.dueDate && <span className="text-slate-400"> • Expected: {est.dueDate}</span>}
                        </div>
                      </td>

                      {/* Supplier / Vendor Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{est.partyName}</div>
                        {est.partyPhone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{est.partyPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Subject / Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-800 font-medium truncate">
                          {est.quotationSubject || est.notes || 'Inward Material / Goods Purchase Estimate'}
                        </div>
                        {est.poNumber && (
                          <div className="text-[10.5px] font-mono text-slate-500">
                            PO: {est.poNumber}
                          </div>
                        )}
                      </td>

                      {/* Items Count */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[11px]">
                          {est.items.length} {est.items.length === 1 ? 'Item' : 'Items'}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-extrabold text-slate-900 text-sm">
                          {formatIndianCurrency(est.grandTotal)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Taxable: {formatIndianCurrency(est.taxableTotal, false)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(est)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          
                          {/* View / Print */}
                          <button
                            onClick={() => onViewPurchaseEstimate(est)}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title="View & Print Purchase Estimate"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            onClick={() => handleShareWhatsApp(est)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* 1-Click Convert to Inward Purchase Bill */}
                          {!isConverted && (
                            <button
                              onClick={() => onConvertToPurchaseBill(est)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10.5px] rounded-lg border border-emerald-200 transition-colors flex items-center gap-1"
                              title="Convert to Inward Purchase Bill"
                            >
                              <ArrowRight className="w-3 h-3" /> Purchase Bill
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => onEditPurchaseEstimate(est)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Purchase Estimate"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => onDuplicatePurchaseEstimate(est)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Duplicate as New"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => onDeletePurchaseEstimate(est.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Purchase Estimate"
                          >
                            <Trash2 className="w-4 h-4" />
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

    </div>
  );
};
