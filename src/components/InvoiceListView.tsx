import React, { useState } from 'react';
import { 
  Search, Plus, Printer, Edit3,
  Trash2, Copy, ArrowRight, Download, FileText
} from 'lucide-react';
import { Invoice, DocumentType } from '../types';
import { formatIndianCurrency, getDocumentTypeName, downloadCSV } from '../utils/gstCalculations';

interface InvoiceListViewProps {
  invoices: Invoice[];
  onCreateInvoice: (docType?: DocumentType) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onDuplicateInvoice: (invoice: Invoice) => void;
  onConvertToTaxInvoice: (quotation: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
}

export const InvoiceListView: React.FC<InvoiceListViewProps> = ({
  invoices,
  onCreateInvoice,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onDuplicateInvoice,
  onConvertToTaxInvoice,
  onRecordPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [docFilter, setDocFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Only show invoice bills (strictly exclude quotations)
  const invoiceBills = invoices.filter(inv => inv.documentType !== 'QUOTATION');

  // Filter invoices
  const filteredInvoices = invoiceBills.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.serviceNumber && inv.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.serviceDate && inv.serviceDate.includes(searchTerm)) ||
      inv.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.partyGstin && inv.partyGstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      inv.partyPhone.includes(searchTerm);

    const matchesDoc = docFilter === 'ALL' || inv.documentType === docFilter;
    const matchesStatus = statusFilter === 'ALL' || inv.paymentStatus === statusFilter;

    return matchesSearch && matchesDoc && matchesStatus;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Invoice Number', 'Document Type', 'Date', 'Customer Name', 'GSTIN', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Grand Total', 'TDS Deducted', 'Net Payable', 'Paid Amount', 'Balance Due', 'Status'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      getDocumentTypeName(inv.documentType),
      inv.date,
      `"${inv.partyName}"`,
      inv.partyGstin || 'Unregistered',
      inv.taxableTotal,
      inv.cgstTotal,
      inv.sgstTotal,
      inv.igstTotal,
      inv.grandTotal,
      inv.tdsAmount || 0,
      inv.netPayableAfterTds || inv.grandTotal,
      inv.paidAmount,
      inv.balanceDue,
      inv.paymentStatus
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, `SRGroup_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-4 pb-12 text-slate-100">
      
      {/* Top Header Banner matching reference image */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#070e24]/95 backdrop-blur-xl p-5 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        <div>
          <h1 className="text-xl font-black text-white font-heading tracking-tight">Invoices &amp; Tax Bills</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage GST tax invoices, service work orders, debit notes, credit notes &amp; bills</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#09122e] hover:bg-[#0f1d44] text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-[#172654] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" /> Export CSV / Excel
          </button>

          <button
            onClick={() => onCreateInvoice('TAX_INVOICE')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-400/40 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" /> + Create New Bill
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-[#070e24]/95 backdrop-blur-xl p-4 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Search Box */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by Bill No, Customer, GSTIN, Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs font-medium text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
            />
          </div>

          {/* Doc Type Selector */}
          <div>
            <select
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs font-semibold text-slate-200 focus:border-cyan-500/70 outline-none cursor-pointer"
            >
              <option value="ALL">All Invoices &amp; Bills</option>
              <option value="TAX_INVOICE">Tax Invoices</option>
              <option value="SERVICE_ORDER">Service Orders / Work Orders</option>
              <option value="DEBIT_NOTE">Debit Notes</option>
              <option value="CREDIT_NOTE">Credit Notes</option>
              <option value="DELIVERY_CHALLAN">Delivery Challans</option>
              <option value="PURCHASE_BILL">Purchase Bills</option>
            </select>
          </div>

          {/* Status Selector */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs font-semibold text-slate-200 focus:border-cyan-500/70 outline-none cursor-pointer"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partially Paid</option>
              <option value="UNPAID">Unpaid / Due</option>
            </select>
          </div>

        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#09122e] border-b border-[#14234b] font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Invoice # &amp; Date</th>
                <th className="py-3 px-4">Customer Name &amp; GSTIN</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right">Taxable</th>
                <th className="py-3 px-3 text-right">GST Total</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#101b3d]">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-500 mb-2 opacity-50" />
                    <p className="font-semibold text-slate-300">No invoices or bills found</p>
                    <p className="text-xs text-slate-500 mt-0.5">Try adjusting your search terms or create a new invoice</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#0c183d]/60 transition-colors">
                    
                    {/* Bill No & Date */}
                    <td className="py-3.5 px-4 font-medium">
                      <div className="font-mono font-bold text-white text-xs">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap font-mono mt-0.5">
                        <span>{inv.date}</span>
                        {inv.serviceNumber && (
                          <span className="text-[10px] bg-cyan-950/70 text-cyan-300 font-mono px-1.5 py-0.2 rounded border border-cyan-500/30">
                            Srv: {inv.serviceNumber}
                          </span>
                        )}
                        {inv.originalInvoiceNumber && (
                          <span className="text-[10px] bg-amber-950/70 text-amber-300 font-mono px-1.5 py-0.2 rounded border border-amber-500/30">
                            Ref: {inv.originalInvoiceNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white uppercase">{inv.partyName}</div>
                      {inv.partyGstin ? (
                        <div className="font-mono text-[11px] text-cyan-400">{inv.partyGstin}</div>
                      ) : (
                        <div className="text-[11px] text-slate-500">Unregistered B2C</div>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                        inv.documentType === 'TAX_INVOICE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        inv.documentType === 'DEBIT_NOTE' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                        inv.documentType === 'CREDIT_NOTE' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        inv.documentType === 'QUOTATION' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        inv.documentType === 'DELIVERY_CHALLAN' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-700/30 text-slate-300 border border-slate-600/30'
                      }`}>
                        {getDocumentTypeName(inv.documentType)}
                      </span>
                    </td>

                    {/* Taxable */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                      ₹ {formatIndianCurrency(inv.taxableTotal, false)}
                    </td>

                    {/* GST Total */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-400 text-[11px]">
                      <div>₹ {formatIndianCurrency(inv.cgstTotal + inv.sgstTotal + inv.igstTotal, false)}</div>
                      <span className="text-[9px] text-slate-500">({inv.isInterState ? 'IGST' : 'CGST+SGST'})</span>
                    </td>

                    {/* Grand Total */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-mono font-black text-white text-xs">
                        ₹ {formatIndianCurrency(inv.grandTotal)}
                      </div>
                      {inv.isTdsApplicable && (inv.tdsAmount || 0) > 0 && (
                        <div className="text-[10px] text-purple-400 font-medium font-mono">
                          TDS {inv.tdsRate || 1}%: -₹ {formatIndianCurrency(inv.tdsAmount || 0)}
                        </div>
                      )}
                      {inv.balanceDue > 0 && (
                        <div className="text-[10px] text-rose-400 font-semibold font-mono">Due: ₹ {formatIndianCurrency(inv.balanceDue)}</div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        inv.paymentStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        inv.paymentStatus === 'PARTIAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {inv.paymentStatus}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="p-1.5 text-cyan-400 hover:text-white hover:bg-cyan-500/20 rounded-lg transition-colors cursor-pointer"
                          title="Print / View Bill"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onEditInvoice(inv)}
                          className="p-1.5 text-amber-400 hover:text-white hover:bg-amber-500/20 rounded-lg transition-colors cursor-pointer"
                          title="Edit Invoice (Modify details)"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {inv.balanceDue > 0 && (
                          <button
                            onClick={() => onRecordPayment(inv)}
                            className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg transition-colors font-bold text-xs cursor-pointer"
                            title="Collect Payment"
                          >
                            ₹ Pay
                          </button>
                        )}

                        {inv.documentType === 'QUOTATION' && (
                          <button
                            onClick={() => onConvertToTaxInvoice(inv)}
                            className="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Convert to Tax Invoice in 1-Click"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onDuplicateInvoice(inv)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/30 rounded-lg transition-colors cursor-pointer"
                          title="Duplicate Invoice"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteInvoice(inv.id)}
                          className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
