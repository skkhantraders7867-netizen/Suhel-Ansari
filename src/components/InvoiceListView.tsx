import React, { useState } from 'react';
import { 
  Search, Filter, Plus, Printer, Share2, Eye, Edit3,
  Trash2, Copy, ArrowRight, Download, FileText, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { Invoice, DocumentType, PaymentStatus } from '../types';
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
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Invoices &amp; Tax Bills</h1>
          <p className="text-xs text-slate-500">Manage GST tax invoices, service work orders, debit notes, credit notes &amp; bills</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV / Excel
          </button>

          <button
            onClick={() => onCreateInvoice('TAX_INVOICE')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> + Create New Bill
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Search Box */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by Bill No, Customer, GSTIN, Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Doc Type Selector */}
          <div>
            <select
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white"
            >
              <option value="ALL">All Invoices &amp; Bills</option>
              <option value="TAX_INVOICE">Tax Invoices (टैक्स इनवॉइस)</option>
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white"
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                <th className="py-3 px-4">Invoice # & Date</th>
                <th className="py-3 px-4">Customer Name & GSTIN</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right">Taxable</th>
                <th className="py-3 px-3 text-right">GST Total</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-60" />
                    <p className="font-semibold text-slate-600">No invoices or bills found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search terms or create a new invoice</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Bill No & Date */}
                    <td className="py-3.5 px-4 font-medium">
                      <div className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span>{inv.date}</span>
                        {inv.serviceNumber && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.2 rounded border border-slate-200">
                            Srv: {inv.serviceNumber}
                          </span>
                        )}
                        {inv.originalInvoiceNumber && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 font-mono px-1.5 py-0.2 rounded border border-amber-200">
                            Ref: {inv.originalInvoiceNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{inv.partyName}</div>
                      {inv.partyGstin ? (
                        <div className="font-mono text-[11px] text-blue-700">{inv.partyGstin}</div>
                      ) : (
                        <div className="text-[11px] text-slate-400">Unregistered B2C</div>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        inv.documentType === 'TAX_INVOICE' ? 'bg-blue-100 text-blue-800' :
                        inv.documentType === 'DEBIT_NOTE' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                        inv.documentType === 'CREDIT_NOTE' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        inv.documentType === 'QUOTATION' ? 'bg-amber-100 text-amber-800' :
                        inv.documentType === 'DELIVERY_CHALLAN' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {getDocumentTypeName(inv.documentType)}
                      </span>
                    </td>

                    {/* Taxable */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                      {formatIndianCurrency(inv.taxableTotal, false)}
                    </td>

                    {/* GST Total */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-600 text-[11px]">
                      <div>{formatIndianCurrency(inv.cgstTotal + inv.sgstTotal + inv.igstTotal, false)}</div>
                      <span className="text-[9px] text-slate-400">({inv.isInterState ? 'IGST' : 'CGST+SGST'})</span>
                    </td>

                    {/* Grand Total */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {formatIndianCurrency(inv.grandTotal)}
                      </div>
                      {inv.isTdsApplicable && (inv.tdsAmount || 0) > 0 && (
                        <div className="text-[10px] text-purple-700 font-medium">
                          TDS {inv.tdsRate || 1}%: -{formatIndianCurrency(inv.tdsAmount || 0)}
                        </div>
                      )}
                      {inv.balanceDue > 0 && (
                        <div className="text-[10px] text-rose-600 font-medium">Due: {formatIndianCurrency(inv.balanceDue)}</div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        inv.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                        inv.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {inv.paymentStatus}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Print / View Bill"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onEditInvoice(inv)}
                          className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit Invoice (Modify details)"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {inv.balanceDue > 0 && (
                          <button
                            onClick={() => onRecordPayment(inv)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors font-bold text-xs"
                            title="Collect Payment"
                          >
                            ₹ Pay
                          </button>
                        )}

                        {inv.documentType === 'QUOTATION' && (
                          <button
                            onClick={() => onConvertToTaxInvoice(inv)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Convert to Tax Invoice in 1-Click"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onDuplicateInvoice(inv)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Duplicate Invoice"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteInvoice(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
