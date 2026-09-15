import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Plus, Search, Eye, Edit2, Copy, Trash2, 
  ArrowRight, CheckCircle2, Clock, AlertTriangle, Send, Share2, 
  Building, Phone, Calendar, Check, XCircle, FileCheck, ArrowUpRight, 
  Sparkles, Layers
} from 'lucide-react';
import { Invoice, BusinessProfile, Party } from '../types';
import { formatIndianCurrency } from '../utils/gstCalculations';

interface QuotationsViewProps {
  invoices: Invoice[];
  parties: Party[];
  businessProfile: BusinessProfile;
  onCreateQuotation: () => void;
  onViewQuotation: (quotation: Invoice) => void;
  onEditQuotation: (quotation: Invoice) => void;
  onDeleteQuotation: (id: string) => void;
  onDuplicateQuotation: (quotation: Invoice) => void;
  onConvertToTaxInvoice: (quotation: Invoice) => void;
  onUpdateQuotationStatus?: (id: string, status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED') => void;
}

type QuotationStatusFilter = 'ALL' | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'CONVERTED' | 'EXPIRED';

export const QuotationsView: React.FC<QuotationsViewProps> = ({
  invoices,
  parties,
  businessProfile,
  onCreateQuotation,
  onViewQuotation,
  onEditQuotation,
  onDeleteQuotation,
  onDuplicateQuotation,
  onConvertToTaxInvoice,
  onUpdateQuotationStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatusFilter>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter only quotations
  const allQuotations = useMemo(() => {
    return invoices.filter(inv => inv.documentType === 'QUOTATION');
  }, [invoices]);

  // Quotation metrics
  const metrics = useMemo(() => {
    const totalCount = allQuotations.length;
    const totalAmount = allQuotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
    const convertedCount = allQuotations.filter(q => q.quotationStatus === 'CONVERTED' || q.notes?.includes('Converted to Invoice')).length;
    const convertedAmount = allQuotations
      .filter(q => q.quotationStatus === 'CONVERTED' || q.notes?.includes('Converted to Invoice'))
      .reduce((sum, q) => sum + (q.grandTotal || 0), 0);
    const pendingQuotations = allQuotations.filter(q => 
      q.quotationStatus === 'SENT' || q.quotationStatus === 'DRAFT' || (!q.quotationStatus && !q.notes?.includes('Converted to Invoice'))
    );
    const pendingCount = pendingQuotations.length;
    const pendingAmount = pendingQuotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

    return {
      totalCount,
      totalAmount,
      convertedCount,
      convertedAmount,
      pendingCount,
      pendingAmount,
    };
  }, [allQuotations]);

  // Filtered quotations list
  const filteredQuotations = useMemo(() => {
    return allQuotations.filter(quote => {
      // Search matching
      const matchesSearch = 
        quote.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (quote.quotationSubject && quote.quotationSubject.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (quote.rfqNumber && quote.rfqNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (quote.partyGstin && quote.partyGstin.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // Status matching
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'CONVERTED') {
        return quote.quotationStatus === 'CONVERTED' || quote.notes?.includes('Converted to Invoice');
      }
      if (statusFilter === 'SENT') {
        return quote.quotationStatus === 'SENT' || (!quote.quotationStatus && !quote.notes?.includes('Converted to Invoice'));
      }
      return quote.quotationStatus === statusFilter;
    });
  }, [allQuotations, searchTerm, statusFilter]);

  // Helper to share quotation via WhatsApp
  const handleShareWhatsApp = (quote: Invoice) => {
    const totalTax = (quote.taxTotal && quote.taxTotal > 0)
      ? quote.taxTotal
      : ((quote.cgstTotal || 0) + (quote.sgstTotal || 0) + (quote.igstTotal || 0));
    
    const itemsSummary = (quote.items || [])
      .map((it, idx) => `${idx + 1}. ${it.name} (${it.quantity} ${it.unit}) @ ₹${it.rate}`)
      .slice(0, 4)
      .join('\n');

    const message = 
      `*QUOTATION ESTIMATE - ${businessProfile.name}*\n\n` +
      `*Quotation No:* ${quote.invoiceNumber}\n` +
      `*Date:* ${quote.date}\n` +
      `*Client:* ${quote.partyName}\n` +
      (quote.quotationSubject ? `*Subject:* ${quote.quotationSubject}\n` : '') +
      `*Valid Until:* ${quote.validUntil || quote.dueDate || '30 Days'}\n\n` +
      `*Items Summary:*\n${itemsSummary}\n\n` +
      `*Taxable Amount:* ${formatIndianCurrency(quote.taxableTotal, true)}\n` +
      `*GST Amount (18%):* ${formatIndianCurrency(totalTax, true)}\n` +
      `*Total Quotation Value:* ${formatIndianCurrency(quote.grandTotal, true)}\n\n` +
      `*Payment Terms:* ${quote.paymentTermsNote || '50% Advance with PO, 40% against dispatch, 10% on completion'}\n\n` +
      `Please contact us at ${businessProfile.phone || ''} for any queries. Thank you!`;

    const cleanPhone = (quote.partyPhone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone.length >= 10
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
  };

  const getStatusBadge = (quote: Invoice) => {
    const isConverted = quote.quotationStatus === 'CONVERTED' || quote.notes?.includes('Converted to Invoice');
    if (isConverted) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          <FileCheck className="w-3 h-3" /> Converted to Bill
        </span>
      );
    }
    switch (quote.quotationStatus) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Accepted / PO Received
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Expired
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
      case 'SENT':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Send className="w-3 h-3" /> Sent to Client
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-black">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 font-heading tracking-tight">
                Quotations & Estimates <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">कोटेशन हब</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Create commercial estimates, structural BOQ quotes with 18% GST & 1-Click Tax Invoice conversion
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCreateQuotation}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Create New Quotation (नया कोटेशन)</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Quotes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Quotations</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Layers className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-heading">
            {metrics.totalCount}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Worth <strong className="text-slate-800">{formatIndianCurrency(metrics.totalAmount, true)}</strong>
          </div>
        </div>

        {/* Pending Quotes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active / In Review</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Clock className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-amber-700 font-heading">
            {metrics.pendingCount}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Active Proposals: <strong className="text-amber-700">{formatIndianCurrency(metrics.pendingAmount, true)}</strong>
          </div>
        </div>

        {/* Converted to Invoice */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Converted to Bills</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><ArrowUpRight className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-indigo-700 font-heading">
            {metrics.convertedCount}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Billed Sales: <strong className="text-indigo-700">{formatIndianCurrency(metrics.convertedAmount, true)}</strong>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Conversion Rate</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-emerald-700 font-heading">
            {metrics.totalCount > 0 ? `${Math.round((metrics.convertedCount / metrics.totalCount) * 100)}%` : '0%'}
          </div>
          <div className="text-xs text-emerald-600 mt-1 font-medium">
            Quotes converted into real Tax Invoices
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search by Quotation No, Customer, GSTIN, Subject / Work Scope..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          {[
            { id: 'ALL', label: 'All Quotes' },
            { id: 'SENT', label: 'Sent / Active' },
            { id: 'ACCEPTED', label: 'Accepted' },
            { id: 'CONVERTED', label: 'Converted to Bill' },
            { id: 'EXPIRED', label: 'Expired' },
            { id: 'DRAFT', label: 'Drafts' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as QuotationStatusFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quotation Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredQuotations.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {searchTerm || statusFilter !== 'ALL' ? 'No matching quotations found' : 'No Quotations created yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create detailed price proposals, material and job work estimates with auto 18% GST calculation and convert to bills in one click.
            </p>
            <div className="pt-2">
              <button
                onClick={onCreateQuotation}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm"
              >
                + Create First Quotation (पहला कोटेशन बनाएं)
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <th className="py-3 px-4">Quotation # & Date</th>
                  <th className="py-3 px-4">Client / Party Details</th>
                  <th className="py-3 px-4">Subject / Work Scope</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4 text-right">Taxable & Tax (18%)</th>
                  <th className="py-3 px-4 text-right">Total Quote Value</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.map((quote) => {
                  const effectiveTax = (quote.taxTotal && quote.taxTotal > 0)
                    ? quote.taxTotal
                    : ((quote.cgstTotal || 0) + (quote.sgstTotal || 0) + (quote.igstTotal || 0));
                  
                  const isConverted = quote.quotationStatus === 'CONVERTED' || quote.notes?.includes('Converted to Invoice');

                  return (
                    <tr key={quote.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Quotation # & Date */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-mono font-black text-blue-700 text-sm flex items-center gap-1.5">
                          <span>{quote.invoiceNumber}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{quote.date}</span>
                        </div>
                        {quote.rfqNumber && (
                          <div className="text-[10px] text-slate-600 bg-slate-100 font-mono font-semibold px-1.5 py-0.5 rounded-md mt-1 inline-block">
                            Ref: {quote.rfqNumber}
                          </div>
                        )}
                      </td>

                      {/* Client / Party Details */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-slate-900 text-sm">
                          {quote.partyName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          {quote.partyAddress}, {quote.partyState}
                        </div>
                        {quote.partyGstin ? (
                          <div className="text-[10px] font-mono text-slate-600 font-semibold mt-0.5">
                            GSTIN: {quote.partyGstin}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">Unregistered Client</div>
                        )}
                      </td>

                      {/* Subject / Scope of Work */}
                      <td className="py-3.5 px-4 align-top max-w-[200px]">
                        {quote.quotationSubject ? (
                          <div className="font-medium text-slate-800 text-xs line-clamp-2" title={quote.quotationSubject}>
                            {quote.quotationSubject}
                          </div>
                        ) : (
                          <div className="text-slate-600 font-medium text-xs truncate">
                            {quote.items?.[0]?.name || 'Standard Quotation'}
                            {(quote.items?.length || 0) > 1 && ` (+${(quote.items?.length || 1) - 1} items)`}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {quote.items?.length || 0} line {quote.items?.length === 1 ? 'item' : 'items'}
                        </div>
                      </td>

                      {/* Validity Date */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="text-xs font-semibold text-slate-800">
                          {quote.validUntil || quote.dueDate || '30 Days'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Validity Period
                        </div>
                      </td>

                      {/* Taxable & Tax (18% GST) */}
                      <td className="py-3.5 px-4 align-top text-right font-mono">
                        <div className="text-xs font-medium text-slate-700">
                          {formatIndianCurrency(quote.taxableTotal, true)}
                        </div>
                        <div className="text-[11px] font-semibold text-blue-700 mt-0.5">
                          + GST: {formatIndianCurrency(effectiveTax, true)}
                        </div>
                      </td>

                      {/* Total Quote Value */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="text-sm font-black text-slate-900 font-mono">
                          {formatIndianCurrency(quote.grandTotal, true)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Incl. All Taxes
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <div>
                          {getStatusBadge(quote)}
                        </div>
                        {isConverted && (
                          <div className="text-[10px] text-indigo-600 font-semibold mt-1">
                            Bill Created
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          
                          {/* 1-Click Convert to Tax Invoice */}
                          {!isConverted && (
                            <button
                              type="button"
                              onClick={() => onConvertToTaxInvoice(quote)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-indigo-200/80 mr-1 shadow-2xs"
                              title="Convert to regular GST Tax Invoice"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>Convert Bill</span>
                            </button>
                          )}

                          {/* View & Print Modal */}
                          <button
                            type="button"
                            onClick={() => onViewQuotation(quote)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View & Print Quotation"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Share on WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(quote)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => onEditQuotation(quote)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Quotation"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => onDuplicateQuotation(quote)}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Duplicate Quotation"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => onDeleteQuotation(quote.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Quotation"
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
