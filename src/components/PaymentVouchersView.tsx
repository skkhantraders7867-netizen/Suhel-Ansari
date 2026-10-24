import React, { useState, useMemo } from 'react';
import { 
  Receipt, Plus, Search, Filter, Printer, Download, Trash2, Edit2, 
  Share2, ArrowDownRight, Wallet, Building2, CheckCircle2, Calendar,
  CreditCard, QrCode, FileText, Check, AlertCircle, X, TrendingUp,
  Percent, ArrowUpRight, Clock, Users, ChevronRight, Eye, Send, Sparkles
} from 'lucide-react';
import { PaymentVoucher, DebitVoucher, Party, Invoice, BusinessProfile, BankAccount, PaymentMode } from '../types';
import { formatIndianCurrency, numberToIndianWords } from '../utils/gstCalculations';
import { DebitVouchersView } from './DebitVouchersView';

interface PaymentVouchersViewProps {
  paymentVouchers: PaymentVoucher[];
  debitVouchers?: DebitVoucher[];
  parties: Party[];
  invoices: Invoice[];
  bankAccounts: BankAccount[];
  businessProfile: BusinessProfile;
  onOpenCreateVoucher: (party?: Party, invoice?: Invoice) => void;
  onOpenEditVoucher: (voucher: PaymentVoucher) => void;
  onDeleteVoucher: (voucherId: string) => void;
  onOpenCreateDebitVoucher?: (party?: Party, bill?: Invoice) => void;
  onOpenEditDebitVoucher?: (voucher: DebitVoucher) => void;
  onDeleteDebitVoucher?: (voucherId: string) => void;
  onSwitchToDebitVouchers?: () => void;
}

type DashboardTab = 'VOUCHERS_LIST' | 'PENDING_DUES' | 'PARTY_SUMMARY';
type PeriodFilter = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH';

export const PaymentVouchersView: React.FC<PaymentVouchersViewProps> = ({
  paymentVouchers = [],
  debitVouchers = [],
  parties = [],
  invoices = [],
  bankAccounts = [],
  businessProfile,
  onOpenCreateVoucher,
  onOpenEditVoucher,
  onDeleteVoucher,
  onOpenCreateDebitVoucher,
  onOpenEditDebitVoucher,
  onDeleteDebitVoucher,
  onSwitchToDebitVouchers,
}) => {
  const [dashboardMode, setDashboardMode] = useState<'RECEIPTS' | 'DEBITS'>('RECEIPTS');
  const [activeTab, setActiveTab] = useState<DashboardTab>('VOUCHERS_LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('ALL');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('ALL');
  const [selectedBankId, setSelectedBankId] = useState<string>('ALL');

  // Printable Receipt Modal for a single voucher
  const [printingVoucher, setPrintingVoucher] = useState<PaymentVoucher | null>(null);

  // Today and Month references
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  // Filtered Vouchers based on period, search, mode, party
  const filteredVouchers = useMemo(() => {
    return paymentVouchers.filter((pv) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        pv.voucherNumber.toLowerCase().includes(q) ||
        pv.partyName.toLowerCase().includes(q) ||
        (pv.referenceNumber && pv.referenceNumber.toLowerCase().includes(q)) ||
        (pv.invoiceNumber && pv.invoiceNumber.toLowerCase().includes(q)) ||
        (pv.remarks && pv.remarks.toLowerCase().includes(q));

      const matchesMode = filterMode === 'ALL' || pv.paymentMode === filterMode;
      const matchesParty = selectedPartyId === 'ALL' || pv.partyId === selectedPartyId;
      const matchesBank = selectedBankId === 'ALL' || pv.bankAccountId === selectedBankId;

      let matchesPeriod = true;
      if (filterPeriod === 'TODAY') {
        matchesPeriod = pv.date === todayStr;
      } else if (filterPeriod === 'THIS_MONTH') {
        matchesPeriod = pv.date.startsWith(currentMonthStr);
      } else if (filterPeriod === 'THIS_WEEK') {
        const voucherDate = new Date(pv.date);
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startOfWeek.setHours(0, 0, 0, 0);
        matchesPeriod = voucherDate >= startOfWeek;
      } else if (filterPeriod === 'LAST_MONTH') {
        const now = new Date();
        now.setMonth(now.getMonth() - 1);
        const lastMonthStr = now.toISOString().substring(0, 7);
        matchesPeriod = pv.date.startsWith(lastMonthStr);
      }

      return matchesSearch && matchesMode && matchesParty && matchesBank && matchesPeriod;
    });
  }, [paymentVouchers, searchTerm, filterMode, filterPeriod, selectedPartyId, selectedBankId, todayStr, currentMonthStr]);

  // Overall Financial Analytics
  const analytics = useMemo(() => {
    const totalCollected = paymentVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
    const todayCollection = paymentVouchers.filter(v => v.date === todayStr).reduce((sum, v) => sum + (v.amount || 0), 0);
    const todayCount = paymentVouchers.filter(v => v.date === todayStr).length;

    const thisMonthCollection = paymentVouchers.filter(v => v.date.startsWith(currentMonthStr)).reduce((sum, v) => sum + (v.amount || 0), 0);
    const thisMonthCount = paymentVouchers.filter(v => v.date.startsWith(currentMonthStr)).length;

    // Mode-wise collection breakdown
    const cashCollection = paymentVouchers.filter(v => v.paymentMode === 'CASH').reduce((sum, v) => sum + (v.amount || 0), 0);
    const upiCollection = paymentVouchers.filter(v => v.paymentMode === 'UPI').reduce((sum, v) => sum + (v.amount || 0), 0);
    const neftCollection = paymentVouchers.filter(v => v.paymentMode === 'NEFT_RTGS').reduce((sum, v) => sum + (v.amount || 0), 0);
    const chequeCollection = paymentVouchers.filter(v => v.paymentMode === 'CHEQUE').reduce((sum, v) => sum + (v.amount || 0), 0);
    const cardCollection = paymentVouchers.filter(v => v.paymentMode === 'CARD' || v.paymentMode === 'NET_BANKING').reduce((sum, v) => sum + (v.amount || 0), 0);
    const bankCollection = totalCollected - cashCollection;

    const cashShare = totalCollected > 0 ? Number(((cashCollection / totalCollected) * 100).toFixed(1)) : 0;
    const bankShare = totalCollected > 0 ? Number(((bankCollection / totalCollected) * 100).toFixed(1)) : 0;

    // Pending Receivables from Invoices
    const salesInvoices = invoices.filter(i => 
      i.documentType === 'TAX_INVOICE' || 
      i.documentType === 'PROFORMA_INVOICE' || 
      (!['QUOTATION', 'PURCHASE_BILL', 'PURCHASE_ESTIMATE', 'SERVICE_ORDER', 'DELIVERY_CHALLAN'].includes(i.documentType))
    );
    const totalBilled = salesInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0);
    const pendingReceivables = salesInvoices.reduce((sum, i) => sum + (i.balanceDue || 0), 0);
    const unpaidInvoicesCount = salesInvoices.filter(i => (i.balanceDue || 0) > 0).length;

    // Collection rate
    const collectionRate = totalBilled > 0 ? Number(((totalCollected / totalBilled) * 100).toFixed(1)) : 0;

    return {
      totalCollected,
      totalCount: paymentVouchers.length,
      todayCollection,
      todayCount,
      thisMonthCollection,
      thisMonthCount,
      cashCollection,
      bankCollection,
      upiCollection,
      neftCollection,
      chequeCollection,
      cardCollection,
      cashShare,
      bankShare,
      totalBilled,
      pendingReceivables,
      unpaidInvoicesCount,
      collectionRate,
    };
  }, [paymentVouchers, invoices, todayStr, currentMonthStr]);

  // Unpaid Invoices for Pending Dues Tab
  const unpaidInvoices = useMemo(() => {
    return invoices
      .filter(i => 
        (i.balanceDue || 0) > 0 &&
        (i.documentType === 'TAX_INVOICE' || i.documentType === 'PROFORMA_INVOICE' || !['QUOTATION', 'PURCHASE_BILL', 'PURCHASE_ESTIMATE', 'SERVICE_ORDER'].includes(i.documentType))
      )
      .sort((a, b) => (b.balanceDue || 0) - (a.balanceDue || 0));
  }, [invoices]);

  // Top Paying Customers Leaderboard
  const topPayingCustomers = useMemo(() => {
    const partyMap = new Map<string, { partyId: string; partyName: string; totalPaid: number; count: number; lastDate: string }>();
    paymentVouchers.forEach(pv => {
      const existing = partyMap.get(pv.partyId) || { partyId: pv.partyId, partyName: pv.partyName, totalPaid: 0, count: 0, lastDate: pv.date };
      existing.totalPaid += (pv.amount || 0);
      existing.count += 1;
      if (pv.date > existing.lastDate) existing.lastDate = pv.date;
      partyMap.set(pv.partyId, existing);
    });
    return Array.from(partyMap.values()).sort((a, b) => b.totalPaid - a.totalPaid).slice(0, 5);
  }, [paymentVouchers]);

  // Party summary table
  const partyPaymentSummaries = useMemo(() => {
    return parties.map(party => {
      const partyVouchers = paymentVouchers.filter(v => v.partyId === party.id);
      const totalPaid = partyVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
      const partyInvoices = invoices.filter(i => i.partyId === party.id && !['QUOTATION', 'PURCHASE_BILL', 'PURCHASE_ESTIMATE', 'SERVICE_ORDER'].includes(i.documentType));
      const totalBilled = partyInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0);
      const balanceDue = partyInvoices.reduce((sum, i) => sum + (i.balanceDue || 0), 0);
      const lastPayment = partyVouchers.length > 0 
        ? partyVouchers.reduce((latest, v) => v.date > latest ? v.date : latest, partyVouchers[0].date)
        : null;

      return {
        party,
        totalPaid,
        totalBilled,
        balanceDue,
        vouchersCount: partyVouchers.length,
        lastPayment,
      };
    }).sort((a, b) => b.totalPaid - a.totalPaid);
  }, [parties, paymentVouchers, invoices]);

  // WhatsApp Share handler
  const handleShareWhatsApp = (voucher: PaymentVoucher) => {
    const party = parties.find(p => p.id === voucher.partyId);
    const phone = party?.phone || '';

    const message = `*PAYMENT RECEIPT VOUCHER - ${businessProfile.name}*
━━━━━━━━━━━━━━━━━━━━━━━━━
*Receipt No:* ${voucher.voucherNumber}
*Date:* ${voucher.date}
*Received From:* ${voucher.partyName}
*Amount Received:* ${formatIndianCurrency(voucher.amount)}
*Amount in Words:* ${numberToIndianWords(voucher.amount)}
*Payment Mode:* ${voucher.paymentMode} ${voucher.referenceNumber ? `(Ref: ${voucher.referenceNumber})` : ''}
${voucher.bankAccountName ? `*Deposited To:* ${voucher.bankAccountName}` : ''}
${voucher.invoiceNumber ? `*Adjusted Against Bill:* ${voucher.invoiceNumber}` : '*Type:* On Account / Ledger Credit'}
━━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for your prompt payment! Contact: ${businessProfile.phone || ''}`;

    const cleanPhone = phone.replace(/\D/g, '');
    const url = cleanPhone.length >= 10
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
  };

  // WhatsApp Due Reminder
  const handleSendDueReminder = (inv: Invoice) => {
    const cleanPhone = (inv.partyPhone || '').replace(/\D/g, '');
    const message = `*PAYMENT REMINDER - ${businessProfile.name}*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear ${inv.partyName},
This is a gentle reminder that an amount of *${formatIndianCurrency(inv.balanceDue || 0)}* is pending against Invoice No: *${inv.invoiceNumber}* (Dated: ${inv.date}).

*Total Bill Value:* ${formatIndianCurrency(inv.grandTotal)}
*Already Paid:* ${formatIndianCurrency(inv.paidAmount || 0)}
*Balance Due:* ${formatIndianCurrency(inv.balanceDue || 0)}

Please arrange the payment at your earliest convenience.
*Bank:* ${businessProfile.bankName} | *A/C:* ${businessProfile.accountNumber} | *IFSC:* ${businessProfile.ifscCode}
*UPI ID:* ${businessProfile.upiId}

Thank you!`;

    const url = cleanPhone.length >= 10
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
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
    link.setAttribute('download', `Payment_Received_Register_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (dashboardMode === 'DEBITS') {
    return (
      <DebitVouchersView
        debitVouchers={debitVouchers}
        parties={parties}
        invoices={invoices}
        bankAccounts={bankAccounts}
        businessProfile={businessProfile}
        onOpenCreateVoucher={onOpenCreateDebitVoucher || (() => {})}
        onOpenEditVoucher={onOpenEditDebitVoucher || (() => {})}
        onDeleteVoucher={onDeleteDebitVoucher || (() => {})}
        onSwitchToPaymentReceived={() => setDashboardMode('RECEIPTS')}
      />
    );
  }

  return (
    <div className="space-y-6 pb-16">
      
      {/* TOP DASHBOARD SWITCHER (Payment Received <-> Debit Voucher) */}
      <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-2 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDashboardMode('RECEIPTS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              dashboardMode === 'RECEIPTS'
                ? 'bg-emerald-600 text-white shadow-md border border-emerald-500/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-200" />
            <span>Payment Received Dashboard (भुगतान प्राप्ति)</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardMode('DEBITS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dashboardMode === 'DEBITS'
                ? 'bg-rose-600 text-white shadow-md border border-rose-500/50 font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
            <span>Debit Voucher Dashboard (डेबिट वाउचर / अदायगी)</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 pr-2 text-[11px] text-slate-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Inflow &amp; Receivables Center</span>
        </div>
      </div>

      {/* 1. TOP DASHBOARD COMMAND BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-[#071f1d] to-slate-950 text-white p-6 md:p-8 rounded-3xl border border-emerald-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -top-10 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 backdrop-blur-md rounded-full text-xs font-bold text-emerald-300 border border-emerald-400/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Receivables &amp; Inflow Intelligence</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Payment Received Dashboard</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                भुगतान प्राप्ति
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Track customer collections, cash galla receipts, online bank transfers (UPI/NEFT), pending invoice receivables, and issue instant verified payment vouchers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onOpenCreateVoucher()}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/30 transition-all transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Record Payment Received
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Download Full Received Register"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer no-print"
              title="Print Dashboard Summary"
            >
              <Printer className="w-3.5 h-3.5 text-teal-400" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE FINANCIAL KPIS (5 CARDS GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Total Collections */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Total Received
            </span>
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900 font-mono">
            {formatIndianCurrency(analytics.totalCollected)}
          </div>
          <div className="text-[10.5px] text-slate-500 font-medium">
            Across {analytics.totalCount} payment vouchers
          </div>
        </div>

        {/* Card 2: Today's Collection */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 border-l-4 border-l-teal-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
              Today's Receipts
            </span>
            <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-900 font-mono">
            {formatIndianCurrency(analytics.todayCollection)}
          </div>
          <div className="text-[10.5px] text-slate-500 font-medium">
            {analytics.todayCount} Receipts logged today
          </div>
        </div>

        {/* Card 3: This Month Collections */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              This Month Inflow
            </span>
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-900 font-mono">
            {formatIndianCurrency(analytics.thisMonthCollection)}
          </div>
          <div className="text-[10.5px] text-slate-500 font-medium">
            {analytics.thisMonthCount} Vouchers in {new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Card 4: Pending Customer Receivables */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Pending Dues
            </span>
            <div className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-900 font-mono">
            {formatIndianCurrency(analytics.pendingReceivables)}
          </div>
          <div className="text-[10.5px] text-rose-700 font-bold">
            {analytics.unpaidInvoicesCount} Invoices awaiting payment
          </div>
        </div>

        {/* Card 5: Inflow Split (Cash vs Bank) */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
              Cash vs Digital
            </span>
            <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Cash Galla:</span>
              <span className="font-mono font-bold text-amber-700">₹{analytics.cashCollection.toLocaleString('en-IN')} ({analytics.cashShare}%)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Bank / UPI:</span>
              <span className="font-mono font-bold text-blue-700">₹{analytics.bankCollection.toLocaleString('en-IN')} ({analytics.bankShare}%)</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. VISUAL ANALYTICS & RECENT INTELLIGENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Payment Modes Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Payment Modes Distribution
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Total 100%</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* UPI */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-700">UPI (Google Pay / PhonePe)</span>
                <span className="font-mono text-emerald-700">₹{analytics.upiCollection.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${analytics.totalCollected > 0 ? (analytics.upiCollection / analytics.totalCollected) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* NEFT / RTGS */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-700">NEFT / RTGS Transfer</span>
                <span className="font-mono text-blue-700">₹{analytics.neftCollection.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${analytics.totalCollected > 0 ? (analytics.neftCollection / analytics.totalCollected) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Cash */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-700">Cash Counter</span>
                <span className="font-mono text-amber-700">₹{analytics.cashCollection.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${analytics.totalCollected > 0 ? (analytics.cashCollection / analytics.totalCollected) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Cheque */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-700">Cheques Received</span>
                <span className="font-mono text-purple-700">₹{analytics.chequeCollection.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${analytics.totalCollected > 0 ? (analytics.chequeCollection / analytics.totalCollected) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top 5 Paying Customers Leaderboard */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              Top Paying Customers
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Ranked by Receipts</span>
          </div>

          {topPayingCustomers.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No payments logged yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {topPayingCustomers.map((cust, idx) => (
                <div key={cust.partyId} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 truncate max-w-[140px]">{cust.partyName}</div>
                      <div className="text-[10px] text-slate-400">{cust.count} receipts • Last: {cust.lastDate}</div>
                    </div>
                  </div>
                  <div className="font-mono font-black text-emerald-800 text-right">
                    ₹{cust.totalPaid.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Collection Actions & Reminders */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <Receipt className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-white">Quick Cash &amp; Bank Voucher</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Instantly credit a customer's ledger, settle outstanding sales invoices, and print or share a 1-page A4/Thermal receipt voucher on WhatsApp.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Collection Efficiency:</span>
              <span className="font-mono text-emerald-400 font-bold">{analytics.collectionRate}%</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Pending Receivables:</span>
              <span className="font-mono text-rose-400 font-bold">₹{analytics.pendingReceivables.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button
            onClick={() => onOpenCreateVoucher()}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + Create Payment Voucher
          </button>
        </div>

      </div>

      {/* 4. DASHBOARD TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('VOUCHERS_LIST')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
            activeTab === 'VOUCHERS_LIST'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Received Payments Register ({filteredVouchers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PENDING_DUES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
            activeTab === 'PENDING_DUES'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <span>Pending Invoices &amp; Dues ({unpaidInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PARTY_SUMMARY')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
            activeTab === 'PARTY_SUMMARY'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Customer Ledger Summary</span>
        </button>
      </div>

      {/* 5. TAB 1: ALL RECEIVED PAYMENT VOUCHERS TABLE */}
      {activeTab === 'VOUCHERS_LIST' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
          
          {/* Search & Multi-Filters Toolbar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search by Voucher #, Party Name, UTR, Invoice #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 font-medium"
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

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Period Filter */}
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value as PeriodFilter)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today Only</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_MONTH">Last Month</option>
              </select>

              {/* Payment Mode Filter */}
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Modes</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI (Google Pay / PhonePe)</option>
                <option value="NEFT_RTGS">NEFT / RTGS</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Card / NetBanking</option>
              </select>

              {/* Party Filter */}
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 max-w-[170px] truncate cursor-pointer"
              >
                <option value="ALL">All Customers</option>
                {parties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Bank Account Filter */}
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 max-w-[170px] truncate cursor-pointer"
              >
                <option value="ALL">All Bank Accounts</option>
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber.slice(-4)}</option>
                ))}
              </select>

            </div>

          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-4 min-w-[140px]">Voucher No &amp; Date</th>
                  <th className="py-3 px-4 min-w-[160px]">Received From (Customer)</th>
                  <th className="py-3 px-3 min-w-[140px]">Payment Mode &amp; Account</th>
                  <th className="py-3 px-3 min-w-[120px]">Ref / UTR No</th>
                  <th className="py-3 px-3 min-w-[130px]">Against Invoice</th>
                  <th className="py-3 px-4 text-right min-w-[110px]">Amount (₹)</th>
                  <th className="py-3 px-4 text-right min-w-[150px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold">No payment vouchers found</p>
                      <p className="text-[11px] text-slate-400 mt-1">Adjust your search or filter above, or record a new receipt.</p>
                      <button
                        onClick={() => onOpenCreateVoucher()}
                        className="mt-3 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Record Payment
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((voucher, idx) => {
                    return (
                      <tr key={voucher.id} className="hover:bg-slate-50/80 transition-colors group">
                        
                        {/* Index */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Voucher No & Date */}
                        <td className="py-3 px-4">
                          <div className="font-mono font-black text-slate-900 flex items-center gap-1.5">
                            <span>{voucher.voucherNumber}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{voucher.date}</span>
                          </div>
                        </td>

                        {/* Party Name */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{voucher.partyName}</div>
                          {voucher.remarks && (
                            <div className="text-[10px] text-slate-500 italic truncate max-w-xs">
                              {voucher.remarks}
                            </div>
                          )}
                        </td>

                        {/* Mode & Bank */}
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                            voucher.paymentMode === 'CASH'
                              ? 'bg-amber-100 text-amber-800'
                              : voucher.paymentMode === 'UPI'
                              ? 'bg-emerald-100 text-emerald-800'
                              : voucher.paymentMode === 'NEFT_RTGS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {voucher.paymentMode}
                          </span>
                          {voucher.bankAccountName && (
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[130px]">
                              {voucher.bankAccountName}
                            </div>
                          )}
                        </td>

                        {/* Ref / UTR */}
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {voucher.referenceNumber || '—'}
                        </td>

                        {/* Linked Invoice */}
                        <td className="py-3 px-3">
                          {voucher.invoiceNumber ? (
                            <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-bold border border-blue-200">
                              {voucher.invoiceNumber}
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-slate-400 italic">
                              On Account
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-black text-emerald-800 text-sm">
                            {formatIndianCurrency(voucher.amount)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* View / Print Receipt */}
                            <button
                              type="button"
                              onClick={() => setPrintingVoucher(voucher)}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Print Official Payment Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* WhatsApp Share */}
                            <button
                              type="button"
                              onClick={() => handleShareWhatsApp(voucher)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Share Receipt on WhatsApp"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => onOpenEditVoucher(voucher)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Voucher"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete payment voucher ${voucher.voucherNumber} for ₹${voucher.amount}?`)) {
                                  onDeleteVoucher(voucher.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Voucher"
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* Table Footer Total */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Showing {filteredVouchers.length} vouchers</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Filtered Total:</span>
              <span className="font-mono text-emerald-800 text-sm font-black">
                {formatIndianCurrency(filteredVouchers.reduce((sum, v) => sum + (v.amount || 0), 0))}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* 6. TAB 2: PENDING RECEIVABLES & UNPAID BILLS */}
      {activeTab === 'PENDING_DUES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
          
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900">Unpaid &amp; Pending Invoices</h3>
              <p className="text-xs text-slate-500">Directly receive payment against any invoice or send WhatsApp payment reminders.</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Total Pending Receivables</div>
              <div className="font-mono text-lg font-black text-rose-800">
                {formatIndianCurrency(analytics.pendingReceivables)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-4">Invoice No &amp; Date</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-3 text-right">Grand Total</th>
                  <th className="py-3 px-3 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unpaidInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                      <p className="font-semibold text-slate-700">All invoices are fully paid!</p>
                      <p className="text-xs text-slate-500 mt-1">No outstanding balances on any customer invoice.</p>
                    </td>
                  </tr>
                ) : (
                  unpaidInvoices.map((inv) => {
                    const party = parties.find(p => p.id === inv.partyId);

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</div>
                          <div className="text-[10.5px] text-slate-500">{inv.date} {inv.dueDate ? `• Due: ${inv.dueDate}` : ''}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{inv.partyName}</div>
                          {inv.partyPhone && (
                            <div className="text-[10.5px] text-slate-500">{inv.partyPhone}</div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {formatIndianCurrency(inv.grandTotal)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-emerald-700">
                          {formatIndianCurrency(inv.paidAmount || 0)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black text-rose-800 text-sm">
                          {formatIndianCurrency(inv.balanceDue || 0)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {inv.paymentStatus || 'UNPAID'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Receive Payment Button */}
                            <button
                              type="button"
                              onClick={() => onOpenCreateVoucher(party, inv)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Receive Payment for this Invoice"
                            >
                              <Plus className="w-3.5 h-3.5" /> Receive
                            </button>

                            {/* WhatsApp Reminder Button */}
                            <button
                              type="button"
                              onClick={() => handleSendDueReminder(inv)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Send Due Reminder on WhatsApp"
                            >
                              <Send className="w-3.5 h-3.5" />
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
      )}

      {/* 7. TAB 3: CUSTOMER LEDGER PAYMENT SUMMARY */}
      {activeTab === 'PARTY_SUMMARY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
          
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-black text-sm text-slate-900">Customer Wise Receivables &amp; Collections</h3>
            <p className="text-xs text-slate-500">Summary of all total billed, collected receipts and pending ledger balances per customer.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-3 text-right">Total Billed</th>
                  <th className="py-3 px-3 text-right">Total Received</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4 text-center">Last Payment Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {partyPaymentSummaries.map(({ party, totalPaid, totalBilled, balanceDue, lastPayment }) => (
                  <tr key={party.id} className="hover:bg-slate-50 transition-colors">
                    
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{party.name}</div>
                      {party.tradeName && <div className="text-[10.5px] text-slate-500">{party.tradeName}</div>}
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {party.phone || '—'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {formatIndianCurrency(totalBilled)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                      {formatIndianCurrency(totalPaid)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-black text-sm">
                      <span className={balanceDue > 0 ? 'text-rose-800' : 'text-slate-500'}>
                        {formatIndianCurrency(balanceDue)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-600 text-[11px]">
                      {lastPayment || 'No receipts'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenCreateVoucher(party)}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs border border-emerald-200 transition-colors cursor-pointer"
                      >
                        + Receive Payment
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* 8. SINGLE PAYMENT RECEIPT PRINT MODAL */}
      {printingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 uppercase flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Payment Received Voucher Receipt
              </h3>
              <button
                onClick={() => setPrintingVoucher(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Card Body */}
            <div id="payment-voucher-printable-receipt" className="border-2 border-slate-900 rounded-2xl p-6 bg-white space-y-4 text-slate-900">
              
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                <h2 className="text-xl font-black uppercase tracking-tight">{businessProfile.name}</h2>
                <p className="text-xs text-slate-600">{businessProfile.address}, {businessProfile.city} - {businessProfile.pincode}</p>
                <p className="text-xs font-mono font-bold text-slate-700">GSTIN: {businessProfile.gstin} | PAN: {businessProfile.pan}</p>
                <div className="pt-1">
                  <span className="px-3 py-0.5 rounded-full bg-slate-900 text-white font-black text-xs uppercase tracking-wider">
                    Official Payment Receipt Voucher
                  </span>
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-200 pb-3">
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block">Receipt Voucher No:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{printingVoucher.voucherNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 uppercase text-[10px] block">Receipt Date:</span>
                  <span className="font-mono font-bold text-slate-900">{printingVoucher.date}</span>
                </div>
              </div>

              {/* Party & Payment Details */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block">Received with thanks from:</span>
                  <span className="font-black text-slate-950 text-base">{printingVoucher.partyName}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Payment Mode:</span>
                    <span className="font-bold text-slate-900">{printingVoucher.paymentMode}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">UTR / Cheque / Ref No:</span>
                    <span className="font-mono font-bold text-slate-900">{printingVoucher.referenceNumber || 'N/A'}</span>
                  </div>
                </div>

                {printingVoucher.bankAccountName && (
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Deposited Bank Account:</span>
                    <span className="font-bold text-slate-900">{printingVoucher.bankAccountName}</span>
                  </div>
                )}

                {printingVoucher.invoiceNumber && (
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Adjusted Against Bill:</span>
                    <span className="font-mono font-bold text-blue-800">{printingVoucher.invoiceNumber}</span>
                  </div>
                )}

                {printingVoucher.remarks && (
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Remarks / Notes:</span>
                    <span className="text-slate-700 italic">{printingVoucher.remarks}</span>
                  </div>
                )}
              </div>

              {/* Amount Box */}
              <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-300 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Amount Received:</span>
                  <span className="text-xs text-slate-700 italic font-medium">{numberToIndianWords(printingVoucher.amount)}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black text-emerald-800">
                    {formatIndianCurrency(printingVoucher.amount)}
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 flex items-end justify-between text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Computer Generated Receipt</div>
                  <div className="font-semibold text-slate-700">Thank you for your business!</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="h-10 border-b border-slate-400 w-40 ml-auto"></div>
                  <div className="font-black text-slate-900 text-xs">Authorized Signatory</div>
                  <div className="text-[10px] text-slate-500">{businessProfile.name}</div>
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPrintingVoucher(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleShareWhatsApp(printingVoucher)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp Receipt
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
