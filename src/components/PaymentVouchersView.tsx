import React, { useState } from 'react';
import { 
  Receipt, Plus, Search, Filter, Printer, Download, Trash2, Edit2, 
  Share2, ArrowDownRight, Wallet, Building2, CheckCircle2, Calendar,
  CreditCard, QrCode, FileText, Check, AlertCircle, X
} from 'lucide-react';
import { PaymentVoucher, Party, Invoice, BusinessProfile, BankAccount, PaymentMode } from '../types';
import { formatIndianCurrency, numberToIndianWords } from '../utils/gstCalculations';

interface PaymentVouchersViewProps {
  paymentVouchers: PaymentVoucher[];
  parties: Party[];
  invoices: Invoice[];
  bankAccounts: BankAccount[];
  businessProfile: BusinessProfile;
  onOpenCreateVoucher: (party?: Party, invoice?: Invoice) => void;
  onOpenEditVoucher: (voucher: PaymentVoucher) => void;
  onDeleteVoucher: (voucherId: string) => void;
}

export const PaymentVouchersView: React.FC<PaymentVouchersViewProps> = ({
  paymentVouchers = [],
  parties = [],
  invoices = [],
  bankAccounts = [],
  businessProfile,
  onOpenCreateVoucher,
  onOpenEditVoucher,
  onDeleteVoucher,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterPeriod, setFilterPeriod] = useState<string>('ALL');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('ALL');

  // Printable Receipt Modal for a single voucher
  const [printingVoucher, setPrintingVoucher] = useState<PaymentVoucher | null>(null);

  // Filter logic
  const filteredVouchers = paymentVouchers.filter((pv) => {
    const matchesSearch = 
      pv.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pv.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pv.referenceNumber && pv.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pv.invoiceNumber && pv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pv.remarks && pv.remarks.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMode = filterMode === 'ALL' || pv.paymentMode === filterMode;
    const matchesParty = selectedPartyId === 'ALL' || pv.partyId === selectedPartyId;

    let matchesPeriod = true;
    const todayStr = new Date().toISOString().split('T')[0];
    if (filterPeriod === 'TODAY') {
      matchesPeriod = pv.date === todayStr;
    } else if (filterPeriod === 'THIS_MONTH') {
      const currentMonth = todayStr.substring(0, 7);
      matchesPeriod = pv.date.startsWith(currentMonth);
    }

    return matchesSearch && matchesMode && matchesParty && matchesPeriod;
  });

  // Calculate Statistics
  const totalAmountCollected = paymentVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCollection = paymentVouchers.filter(v => v.date === todayStr).reduce((sum, v) => sum + (v.amount || 0), 0);
  const cashCollection = paymentVouchers.filter(v => v.paymentMode === 'CASH').reduce((sum, v) => sum + (v.amount || 0), 0);
  const bankCollection = totalAmountCollected - cashCollection;

  // WhatsApp Share handler
  const handleShareWhatsApp = (voucher: PaymentVoucher) => {
    const party = parties.find(p => p.id === voucher.partyId);
    if (!party?.phone) return;

    const message = `*Payment Receipt from ${businessProfile.name}*
━━━━━━━━━━━━━━━━━━━━━━━━━
*Receipt No:* ${voucher.voucherNumber}
*Date:* ${voucher.date}
*Received From:* ${voucher.partyName}
*Amount Received:* ${formatIndianCurrency(voucher.amount)} (${numberToIndianWords(voucher.amount)})
*Payment Mode:* ${voucher.paymentMode} ${voucher.referenceNumber ? `(Ref: ${voucher.referenceNumber})` : ''}
${voucher.invoiceNumber ? `*Against Bill:* ${voucher.invoiceNumber}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for your payment!`;

    const cleanPhone = party.phone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Voucher No', 'Date', 'Party Name', 'Amount (Rs)', 'Payment Mode', 'Reference / UTR', 'Linked Invoice', 'Bank Account', 'Remarks'];
    const rows = paymentVouchers.map(v => [
      `"${v.voucherNumber}"`,
      v.date,
      `"${v.partyName.replace(/"/g, '""')}"`,
      v.amount,
      v.paymentMode,
      `"${v.referenceNumber || ''}"`,
      `"${v.invoiceNumber || 'Advance / Ledger'}"`,
      `"${v.bankAccountName || ''}"`,
      `"${(v.remarks || '').replace(/"/g, '""')}"`,
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Payment_Vouchers_Register_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-800 rounded-xl border border-emerald-300/40">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Payment Received Vouchers (पेमेंट रिसीप्ट वाउचर)
              </h1>
              <p className="text-xs text-slate-500">
                Direct party ledger credit vouchers, invoice payment reconciliation, cash &amp; bank allocation with 1-page receipt printing
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => onOpenCreateVoucher()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> + Create Payment Voucher (नया वाउचर)
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
            title="Export CSV Register"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors no-print"
            title="Print Vouchers List"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" /> Print
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Collected */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
              Total Receipts (कुल वसूली)
            </span>
            <ArrowDownRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800 font-mono">
            {formatIndianCurrency(totalAmountCollected)}
          </div>
          <p className="text-[10px] text-slate-500">Across {paymentVouchers.length} total payment vouchers</p>
        </div>

        {/* Today's Collection */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Today's Collection</span>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatIndianCurrency(todayCollection)}
          </div>
          <p className="text-[10px] text-slate-400">Recorded on {todayStr}</p>
        </div>

        {/* Cash Galla Receipts */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
              Cash Inflow (गल्ला)
            </span>
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800 font-mono">
            {formatIndianCurrency(cashCollection)}
          </div>
          <p className="text-[10px] text-slate-500">Direct cash register collections</p>
        </div>

        {/* Bank & Online Inflows */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block">
              Bank / UPI Inflows
            </span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-800 font-mono">
            {formatIndianCurrency(bankCollection)}
          </div>
          <p className="text-[10px] text-slate-500">UPI, NEFT, Cheques &amp; NetBanking</p>
        </div>

      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Search & Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by Voucher #, Party, UTR, Invoice #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 font-medium"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Period Filter */}
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="THIS_MONTH">This Month</option>
            </select>

            {/* Payment Mode Filter */}
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="ALL">All Modes</option>
              <option value="CASH">Cash (रोकड़)</option>
              <option value="UPI">UPI (Google Pay / PhonePe)</option>
              <option value="NEFT_RTGS">NEFT / RTGS</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CARD">Card / NetBanking</option>
            </select>

            {/* Party Filter */}
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 max-w-[180px] truncate"
            >
              <option value="ALL">All Parties</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Vouchers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3 px-4">Voucher No &amp; Date</th>
                <th className="py-3 px-4">Received From (Party)</th>
                <th className="py-3 px-3">Payment Mode &amp; Account</th>
                <th className="py-3 px-3">Ref / UTR No</th>
                <th className="py-3 px-3">Against Invoice</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold">No payment vouchers found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "+ Create Payment Voucher" to record your first payment received</p>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const party = parties.find(p => p.id === v.partyId);

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Voucher No & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{v.voucherNumber}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{v.date}</span>
                        </div>
                      </td>

                      {/* Party Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {v.partyName}
                        </div>
                        {party?.phone && (
                          <div className="text-[11px] text-slate-500">
                            {party.phone}
                          </div>
                        )}
                      </td>

                      {/* Mode & Bank */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {v.paymentMode}
                        </span>
                        {v.bankAccountName && (
                          <div className="text-[10.5px] text-slate-500 mt-1 truncate max-w-[140px]">
                            {v.bankAccountName}
                          </div>
                        )}
                      </td>

                      {/* Ref / UTR */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {v.referenceNumber || 'N/A'}
                        </span>
                        {v.remarks && (
                          <p className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-[130px]">
                            "{v.remarks}"
                          </p>
                        )}
                      </td>

                      {/* Against Invoice */}
                      <td className="py-3.5 px-3">
                        {v.invoiceNumber ? (
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                            {v.invoiceNumber}
                          </span>
                        ) : (
                          <span className="text-[10.5px] text-slate-500 italic">
                            Direct Ledger Credit
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-black text-emerald-800 text-sm">
                          {formatIndianCurrency(v.amount)}
                        </div>
                        <span className="text-[9.5px] font-semibold text-emerald-600 block">
                          Cr (Received)
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Receipt */}
                          <button
                            onClick={() => setPrintingVoucher(v)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 rounded-lg transition-colors"
                            title="Print 1-Page Receipt (प्रिंट रसीद)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp */}
                          {party?.phone && (
                            <button
                              onClick={() => handleShareWhatsApp(v)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-lg border border-emerald-200 transition-colors"
                              title="Send WhatsApp Receipt"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => onOpenEditVoucher(v)}
                            className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg transition-colors"
                            title="Edit Voucher"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete Voucher #${v.voucherNumber}? This will reverse the credit balance.`)) {
                                onDeleteVoucher(v.id);
                              }
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-lg transition-colors"
                            title="Delete Voucher"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 1-Page Printable Receipt Modal */}
      {printingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Payment Receipt Preview (रसीद पूर्वावलोकन)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Receipt (प्रिंट)
                </button>
                <button
                  onClick={() => setPrintingVoucher(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Card */}
            <div className="p-8 space-y-6 text-slate-800 bg-white" id="payment-voucher-printable-receipt">
              
              {/* Receipt Top Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    {businessProfile.logoUrl && (
                      <img 
                        src={businessProfile.logoUrl} 
                        alt="Logo" 
                        className="w-12 h-12 object-contain rounded-lg border border-slate-200 p-0.5" 
                      />
                    )}
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight font-heading">
                        {businessProfile.name}
                      </h2>
                      <p className="text-xs text-slate-600 font-medium">
                        {[businessProfile.address, businessProfile.city, businessProfile.state].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-4 pt-1 font-mono">
                    {businessProfile.gstin && <span>GSTIN: <strong>{businessProfile.gstin}</strong></span>}
                    {businessProfile.pan && <span>PAN: <strong>{businessProfile.pan}</strong></span>}
                    {businessProfile.phone && <span>Ph: <strong>{businessProfile.phone}</strong></span>}
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white text-xs font-black px-3 py-1 rounded-md tracking-wider uppercase mb-1.5">
                    Payment Receipt / रसीद
                  </div>
                  <div className="font-mono text-xs space-y-0.5">
                    <div>Receipt No: <strong className="text-slate-900">{printingVoucher.voucherNumber}</strong></div>
                    <div>Date: <strong className="text-slate-900">{printingVoucher.date}</strong></div>
                  </div>
                </div>
              </div>

              {/* Receipt Body Statement */}
              <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 text-xs space-y-3.5">
                <div className="flex items-baseline justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Received with thanks from:</span>
                  <span className="text-sm font-black text-slate-900">{printingVoucher.partyName}</span>
                </div>

                <div className="flex items-baseline justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Amount Received:</span>
                  <div className="text-right">
                    <span className="font-mono text-lg font-black text-emerald-800">
                      {formatIndianCurrency(printingVoucher.amount)}
                    </span>
                    <div className="text-[11px] text-slate-600 font-semibold italic">
                      ({numberToIndianWords(printingVoucher.amount)})
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-2 text-[11.5px]">
                  <div>
                    <span className="text-slate-500 block">Payment Mode:</span>
                    <strong className="text-slate-900">{printingVoucher.paymentMode}</strong>
                    {printingVoucher.bankAccountName && (
                      <span className="text-slate-600 block text-[10.5px]">({printingVoucher.bankAccountName})</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block">Transaction Ref / UTR / Cheque:</span>
                    <strong className="font-mono text-slate-900">{printingVoucher.referenceNumber || 'N/A'}</strong>
                  </div>
                </div>

                {printingVoucher.invoiceNumber && (
                  <div className="flex items-baseline justify-between text-[11.5px] border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Against Tax Invoice No:</span>
                    <strong className="font-mono text-blue-800">{printingVoucher.invoiceNumber}</strong>
                  </div>
                )}

                {printingVoucher.remarks && (
                  <div className="text-[11px] text-slate-600 italic">
                    Remark: "{printingVoucher.remarks}"
                  </div>
                )}
              </div>

              {/* Bottom Signatures & Seal */}
              <div className="pt-6 flex items-end justify-between border-t border-slate-200 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Payment Verified &amp; Ledger Credited</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Computer generated valid acknowledgment receipt</p>
                </div>

                <div className="text-right space-y-12">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    For {businessProfile.name}
                  </span>
                  <div className="border-t border-slate-400 pt-1 text-[11px] font-bold text-slate-800">
                    Authorized Signatory
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
