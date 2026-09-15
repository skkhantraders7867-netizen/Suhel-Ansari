import React, { useState, useMemo } from 'react';
import { 
  Layers, Plus, Search, Eye, Edit2, Copy, Trash2, 
  ArrowRight, CheckCircle2, Clock, AlertTriangle, Send, Share2, 
  Building, Phone, Calendar, Check, XCircle, FileCheck, ArrowUpRight, 
  Briefcase, Wrench, ShieldCheck, MapPin
} from 'lucide-react';
import { Invoice, BusinessProfile, Party } from '../types';
import { formatIndianCurrency } from '../utils/gstCalculations';

interface ServiceOrdersViewProps {
  invoices: Invoice[];
  parties: Party[];
  businessProfile: BusinessProfile;
  onCreateServiceOrder: () => void;
  onViewServiceOrder: (serviceOrder: Invoice) => void;
  onEditServiceOrder: (serviceOrder: Invoice) => void;
  onDeleteServiceOrder: (id: string) => void;
  onDuplicateServiceOrder: (serviceOrder: Invoice) => void;
  onConvertToTaxInvoice: (serviceOrder: Invoice) => void;
  onUpdateStatus?: (id: string, status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED') => void;
}

type ServiceOrderStatusFilter = 'ALL' | 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CONVERTED';

export const ServiceOrdersView: React.FC<ServiceOrdersViewProps> = ({
  invoices,
  parties,
  businessProfile,
  onCreateServiceOrder,
  onViewServiceOrder,
  onEditServiceOrder,
  onDeleteServiceOrder,
  onDuplicateServiceOrder,
  onConvertToTaxInvoice,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceOrderStatusFilter>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter only service orders
  const allServiceOrders = useMemo(() => {
    return invoices.filter(inv => inv.documentType === 'SERVICE_ORDER');
  }, [invoices]);

  // Service Order metrics
  const metrics = useMemo(() => {
    const totalCount = allServiceOrders.length;
    const totalAmount = allServiceOrders.reduce((sum, so) => sum + (so.grandTotal || 0), 0);
    const convertedCount = allServiceOrders.filter(so => so.quotationStatus === 'CONVERTED' || so.notes?.includes('Converted to Invoice')).length;
    const convertedAmount = allServiceOrders
      .filter(so => so.quotationStatus === 'CONVERTED' || so.notes?.includes('Converted to Invoice'))
      .reduce((sum, so) => sum + (so.grandTotal || 0), 0);
    const activeOrders = allServiceOrders.filter(so => 
      so.quotationStatus !== 'CONVERTED' && !so.notes?.includes('Converted to Invoice')
    );
    const activeCount = activeOrders.length;
    const activeAmount = activeOrders.reduce((sum, so) => sum + (so.grandTotal || 0), 0);

    return {
      totalCount,
      totalAmount,
      convertedCount,
      convertedAmount,
      activeCount,
      activeAmount,
    };
  }, [allServiceOrders]);

  // Filtered service orders list
  const filteredServiceOrders = useMemo(() => {
    return allServiceOrders.filter(order => {
      // Search matching
      const matchesSearch = 
        order.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.quotationSubject && order.quotationSubject.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.rfqNumber && order.rfqNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.partyGstin && order.partyGstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.items && order.items.some(it => it.name.toLowerCase().includes(searchTerm.toLowerCase())));

      if (!matchesSearch) return false;

      // Status matching
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'CONVERTED') {
        return order.quotationStatus === 'CONVERTED' || order.notes?.includes('Converted to Invoice');
      }
      if (statusFilter === 'ACTIVE') {
        return order.quotationStatus !== 'CONVERTED' && !order.notes?.includes('Converted to Invoice');
      }
      if (statusFilter === 'DRAFT') {
        return order.quotationStatus === 'DRAFT';
      }
      if (statusFilter === 'COMPLETED') {
        return order.quotationStatus === 'ACCEPTED' || order.quotationStatus === 'CONVERTED';
      }
      return true;
    });
  }, [allServiceOrders, searchTerm, statusFilter]);

  // Helper to share service order via WhatsApp
  const handleShareWhatsApp = (order: Invoice) => {
    const totalTax = (order.taxTotal && order.taxTotal > 0)
      ? order.taxTotal
      : ((order.cgstTotal || 0) + (order.sgstTotal || 0) + (order.igstTotal || 0));
    
    const itemsSummary = (order.items || [])
      .map((it, idx) => `${idx + 1}. ${it.name} (${it.quantity} ${it.unit}) @ ₹${it.rate}`)
      .slice(0, 4)
      .join('\n');

    const message = 
      `*SERVICE ORDER & ESTIMATE - ${businessProfile.name}*\n\n` +
      `*Order No:* ${order.invoiceNumber}\n` +
      `*Date:* ${order.date}\n` +
      `*Client / Vendor:* ${order.partyName}\n` +
      (order.quotationSubject ? `*Subject/Work Scope:* ${order.quotationSubject}\n` : '') +
      (order.poNumber ? `*Ref PO/WO No:* ${order.poNumber}\n` : '') +
      `*Due / Execution Date:* ${order.dueDate || 'Immediate'}\n\n` +
      `*Items & Services Summary:*\n${itemsSummary}\n\n` +
      `*Taxable Amount:* ${formatIndianCurrency(order.taxableTotal, true)}\n` +
      `*GST Amount (18%):* ${formatIndianCurrency(totalTax, true)}\n` +
      `*Total Service Order Value:* ${formatIndianCurrency(order.grandTotal, true)}\n\n` +
      `*Terms & Execution:* As per agreed industrial service scope & specifications.\n\n` +
      `Please contact us at ${businessProfile.phone || ''} for any queries. Thank you!`;

    const cleanPhone = (order.partyPhone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone.length >= 10
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
  };

  const getStatusBadge = (order: Invoice) => {
    const isConverted = order.quotationStatus === 'CONVERTED' || order.notes?.includes('Converted to Invoice');
    if (isConverted) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          <FileCheck className="w-3.5 h-3.5" /> Billed to Tax Invoice
        </span>
      );
    }
    switch (order.quotationStatus) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Work Approved / In Progress
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Closed / Rejected
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
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> Active Service Order
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-200 border border-white/10">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Service Orders &amp; Work Estimates (सर्विस ऑर्डर व एस्टीमेट)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
              <span>Service Orders &amp; Estimates</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500/30 text-blue-300 border border-blue-400/30">
                8 PO Clauses Ready
              </span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Create formal Service Orders, Work Estimates &amp; Contractor Work Orders with 8 comprehensive PO clauses, technical specifications, and 1-click conversion to GST Tax Invoices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCreateServiceOrder}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" /> Create Service Order &amp; Estimate
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Service Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Service Orders</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-black text-slate-900">
            {formatIndianCurrency(metrics.totalAmount)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>{metrics.totalCount} Total service orders logged</span>
          </div>
        </div>

        {/* Active Work Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active / In-Progress</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-black text-amber-700">
            {formatIndianCurrency(metrics.activeAmount)}
          </div>
          <div className="text-xs text-amber-700 font-medium">
            {metrics.activeCount} Service orders awaiting billing
          </div>
        </div>

        {/* Billed to Tax Invoice */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Billed to Tax Invoice</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-black text-emerald-700">
            {formatIndianCurrency(metrics.convertedAmount)}
          </div>
          <div className="text-xs text-emerald-700 font-medium">
            {metrics.convertedCount} Converted to final Tax Invoice
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
              placeholder="Search by Order No, Client, Subject, Item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-600"
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
              { id: 'ALL' as ServiceOrderStatusFilter, label: 'All Orders' },
              { id: 'ACTIVE' as ServiceOrderStatusFilter, label: 'Active / Pending' },
              { id: 'COMPLETED' as ServiceOrderStatusFilter, label: 'Approved' },
              { id: 'CONVERTED' as ServiceOrderStatusFilter, label: 'Billed to Invoice' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-colors ${
                  statusFilter === tab.id 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Service Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredServiceOrders.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No Service Orders found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'ALL' 
                ? 'No service orders match your active search and filter criteria.' 
                : 'Create your first professional Service Order & Estimate with 8 PO clauses and print in standard A4 format.'}
            </p>
            <button
              onClick={onCreateServiceOrder}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" /> Create Service Order &amp; Estimate
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Service Order No &amp; Date</th>
                  <th className="py-3.5 px-4">Client / Party Name</th>
                  <th className="py-3.5 px-4">Scope / Subject</th>
                  <th className="py-3.5 px-4 text-center">Items / Work</th>
                  <th className="py-3.5 px-4 text-right">Order Value</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServiceOrders.map((order) => {
                  const isConverted = order.quotationStatus === 'CONVERTED' || order.notes?.includes('Converted to Invoice');

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors group">
                      
                      {/* Order No & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-blue-900 text-xs flex items-center gap-1.5">
                          <span>{order.invoiceNumber}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(order.invoiceNumber);
                              setCopiedId(order.id);
                              setTimeout(() => setCopiedId(null), 1500);
                            }}
                            className="text-slate-400 hover:text-blue-600"
                            title="Copy Order Number"
                          >
                            {copiedId === order.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{order.date}</span>
                          {order.dueDate && <span className="text-slate-400"> • Due: {order.dueDate}</span>}
                        </div>
                      </td>

                      {/* Client / Party Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{order.partyName}</div>
                        {order.partyPhone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{order.partyPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Scope / Subject */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-800 font-medium truncate">
                          {order.quotationSubject || order.notes || 'Industrial Service & Maintenance Work'}
                        </div>
                        {order.poNumber && (
                          <div className="text-[10.5px] font-mono text-slate-500">
                            Ref: {order.poNumber}
                          </div>
                        )}
                      </td>

                      {/* Items Count */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[11px]">
                          {order.items.length} {order.items.length === 1 ? 'Item' : 'Items'}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-extrabold text-slate-900 text-sm">
                          {formatIndianCurrency(order.grandTotal)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Taxable: {formatIndianCurrency(order.taxableTotal, false)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(order)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          
                          {/* View / Print */}
                          <button
                            onClick={() => onViewServiceOrder(order)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View & Print Service Order"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            onClick={() => handleShareWhatsApp(order)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* 1-Click Convert to GST Tax Invoice */}
                          {!isConverted && (
                            <button
                              onClick={() => onConvertToTaxInvoice(order)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10.5px] rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
                              title="Convert to GST Tax Invoice"
                            >
                              <ArrowRight className="w-3 h-3" /> Bill Now
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => onEditServiceOrder(order)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Service Order"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => onDuplicateServiceOrder(order)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Duplicate as New"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => onDeleteServiceOrder(order.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Service Order"
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
