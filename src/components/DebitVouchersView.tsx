import React, { useState, useMemo } from 'react';
import { 
  Receipt, Plus, Search, Filter, Printer, Download, Trash2, Edit2, 
  Share2, ArrowDownRight, Wallet, Building2, CheckCircle2, Calendar,
  CreditCard, QrCode, FileText, Check, AlertCircle, X, TrendingUp,
  Percent, ArrowUpRight, Clock, Users, ChevronRight, Eye, Send, Sparkles,
  ArrowRightLeft
} from 'lucide-react';
import { DebitVoucher, Party, Invoice, BusinessProfile, BankAccount, PaymentMode } from '../types';
import { formatIndianCurrency, numberToIndianWords } from '../utils/gstCalculations';

interface DebitVouchersViewProps {
  debitVouchers: DebitVoucher[];
  parties: Party[];
  invoices: Invoice[];
  bankAccounts: BankAccount[];
  businessProfile: BusinessProfile;
  onOpenCreateVoucher: (party?: Party, bill?: Invoice) => void;
  onOpenEditVoucher: (voucher: DebitVoucher) => void;
  onDeleteVoucher: (voucherId: string) => void;
  onSwitchToPaymentReceived?: () => void;
}

type DashboardTab = 'VOUCHERS_LIST' | 'PENDING_DUES' | 'PARTY_SUMMARY';
type PeriodFilter = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH';

export const DebitVouchersView: React.FC<DebitVouchersViewProps> = ({
  debitVouchers = [],
  parties = [],
  invoices = [],
  bankAccounts = [],
  businessProfile,
  onOpenCreateVoucher,
  onOpenEditVoucher,
  onDeleteVoucher,
  onSwitchToPaymentReceived,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('VOUCHERS_LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('ALL');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('ALL');
  const [selectedBankId, setSelectedBankId] = useState<string>('ALL');

  // Printable Receipt Modal for a single voucher
  const [printingVoucher, setPrintingVoucher] = useState<DebitVoucher | null>(null);

  // Today and Month references
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  // Filtered Vouchers based on period, search, mode, party
  const filteredVouchers = useMemo(() => {
    return debitVouchers.filter((dv) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        dv.voucherNumber.toLowerCase().includes(q) ||
        dv.partyName.toLowerCase().includes(q) ||
        (dv.referenceNumber && dv.referenceNumber.toLowerCase().includes(q)) ||
        (dv.billNumber && dv.billNumber.toLowerCase().includes(q)) ||
        (dv.remarks && dv.remarks.toLowerCase().includes(q));

      const matchesMode = filterMode === 'ALL' || dv.paymentMode === filterMode;
      const matchesParty = selectedPartyId === 'ALL' || dv.partyId === selectedPartyId;
      const matchesBank = selectedBankId === 'ALL' || dv.bankAccountId === selectedBankId;

      let matchesPeriod = true;
      if (filterPeriod === 'TODAY') {
        matchesPeriod = dv.date === todayStr;
      } else if (filterPeriod === 'THIS_MONTH') {
        matchesPeriod = dv.date.startsWith(currentMonthStr);
      } else if (filterPeriod === 'THIS_WEEK') {
        const voucherDate = new Date(dv.date);
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startOfWeek.setHours(0, 0, 0, 0);
        matchesPeriod = voucherDate >= startOfWeek;
      } else if (filterPeriod === 'LAST_MONTH') {
        const now = new Date();
        now.setMonth(now.getMonth() - 1);
        const lastMonthStr = now.toISOString().substring(0, 7);
        matchesPeriod = dv.date.startsWith(lastMonthStr);
      }

      return matchesSearch && matchesMode && matchesParty && matchesBank && matchesPeriod;
    });
  }, [debitVouchers, searchTerm, filterMode, filterPeriod, selectedPartyId, selectedBankId, todayStr, currentMonthStr]);

  // Overall Financial Analytics for Debits / Payments Made
  const analytics = useMemo(() => {
    const totalDebited = debitVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
    const todayDebits = debitVouchers.filter(v => v.date === todayStr).reduce((sum, v) => sum + (v.amount || 0), 0);
    const todayCount = debitVouchers.filter(v => v.date === todayStr).length;

    const thisMonthDebits = debitVouchers.filter(v => v.date.startsWith(currentMonthStr)).reduce((sum, v) => sum + (v.amount || 0), 0);
    const thisMonthCount = debitVouchers.filter(v => v.date.startsWith(currentMonthStr)).length;

    // Mode-wise debit breakdown
    const cashDebits = debitVouchers.filter(v => v.paymentMode === 'CASH').reduce((sum, v) => sum + (v.amount || 0), 0);
    const upiDebits = debitVouchers.filter(v => v.paymentMode === 'UPI').reduce((sum, v) => sum + (v.amount || 0), 0);
    const neftDebits = debitVouchers.filter(v => v.paymentMode === 'NEFT_RTGS').reduce((sum, v) => sum + (v.amount || 0), 0);
    const chequeDebits = debitVouchers.filter(v => v.paymentMode === 'CHEQUE').reduce((sum, v) => sum + (v.amount || 0), 0);
    const cardDebits = debitVouchers.filter(v => v.paymentMode === 'CARD' || v.paymentMode === 'NET_BANKING').reduce((sum, v) => sum + (v.amount || 0), 0);
    const bankDebits = upiDebits + neftDebits + chequeDebits + cardDebits;

    const cashShare = totalDebited > 0 ? Math.round((cashDebits / totalDebited) * 100) : 0;
    const bankShare = totalDebited > 0 ? 100 - cashShare : 0;

    // Supplier Bills & Payables Due
    const pendingSupplierBills = invoices.filter(inv => 
      (inv.documentType === 'PURCHASE_ESTIMATE' || inv.balanceDue > 0) &&
      inv.balanceDue > 0
    );
    const totalPendingPayables = pendingSupplierBills.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
    const unpaidBillsCount = pendingSupplierBills.length;

    return {
      totalDebited,
      totalCount: debitVouchers.length,
      todayDebits,
      todayCount,
      thisMonthDebits,
      thisMonthCount,
      cashDebits,
      upiDebits,
      neftDebits,
      chequeDebits,
      cardDebits,
      bankDebits,
      cashShare,
      bankShare,
      pendingPayables: totalPendingPayables,
      unpaidBillsCount,
    };
  }, [debitVouchers, invoices, todayStr, currentMonthStr]);

  // Top 5 Parties Paid (Ranked by Total Debits)
  const topPaidParties = useMemo(() => {
    const map = new Map<string, { partyId: string; partyName: string; totalPaid: number; count: number; lastDate: string }>();

    debitVouchers.forEach(dv => {
      const existing = map.get(dv.partyId) || {
        partyId: dv.partyId,
        partyName: dv.partyName,
        totalPaid: 0,
        count: 0,
        lastDate: dv.date,
      };

      existing.totalPaid += dv.amount;
      existing.count += 1;
      if (dv.date > existing.lastDate) {
        existing.lastDate = dv.date;
      }

      map.set(dv.partyId, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 5);
  }, [debitVouchers]);

  // Pending Bills List
  const pendingBills = useMemo(() => {
    return invoices
      .filter(inv => inv.balanceDue > 0)
      .sort((a, b) => (b.balanceDue || 0) - (a.balanceDue || 0));
  }, [invoices]);

  // Party Debit Summaries
  const partyDebitSummaries = useMemo(() => {
    return parties.map(p => {
      const partyVouchers = debitVouchers.filter(v => v.partyId === p.id);
      const totalPaid = partyVouchers.reduce((sum, v) => sum + v.amount, 0);
      const lastPayment = partyVouchers.length > 0 
        ? partyVouchers.sort((a, b) => b.date.localeCompare(a.date))[0].date 
        : null;

      return {
        party: p,
        totalPaid,
        balance: p.currentBalance || 0,
        vouchersCount: partyVouchers.length,
        lastPayment,
      };
    });
  }, [parties, debitVouchers]);

  // WhatsApp share helper
  const handleShareWhatsApp = (voucher: DebitVoucher) => {
    const party = parties.find(p => p.id === voucher.partyId);
    const phone = party?.phone?.replace(/[^0-9]/g, '') || '';
    const text = encodeURIComponent(
      `*DEBIT VOUCHER / PAYMENT ADVICE*\n` +
      `--------------------------------\n` +
      `*From:* ${businessProfile.name}\n` +
      `*Paid To:* ${voucher.partyName}\n` +
      `*Voucher No:* ${voucher.voucherNumber}\n` +
      `*Date:* ${voucher.date}\n` +
      `*Amount Debited:* ₹${voucher.amount.toLocaleString('en-IN')} (Dr)\n` +
      `*Mode:* ${voucher.paymentMode}${voucher.referenceNumber ? ` (Ref: ${voucher.referenceNumber})` : ''}\n` +
      `${voucher.billNumber ? `*Bill Ref:* ${voucher.billNumber}\n` : ''}` +
      `${voucher.remarks ? `*Particulars:* ${voucher.remarks}\n` : ''}` +
      `--------------------------------\n` +
      `Payment debited and accounted in ledger. Thank you!`
    );

    const url = phone ? `https://wa.me/91${phone.slice(-10)}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  // Export CSV
  const handleExportCSV = () => {
    if (debitVouchers.length === 0) {
      alert('Export karne ke liye koi debit vouchers uplabdh nahi hain.');
      return;
    }

    const headers = [
      'Voucher No',
      'Date',
      'Party Name',
      'Amount (INR)',
      'Payment Mode',
      'Ref / UTR No',
      'Bank Account',
      'Linked Bill',
      'Remarks',
    ];

    const rows = filteredVouchers.map(v => [
      `"${v.voucherNumber}"`,
      `"${v.date}"`,
      `"${v.partyName.replace(/"/g, '""')}"`,
      v.amount,
      `"${v.paymentMode}"`,
      `"${(v.referenceNumber || '').replace(/"/g, '""')}"`,
      `"${(v.bankAccountName || '').replace(/"/g, '""')}"`,
      `"${(v.billNumber || '').replace(/"/g, '""')}"`,
      `"${(v.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Debit_Vouchers_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">

      {/* TOP DASHBOARD SWITCHER (Payment Received <-> Debit Voucher) */}
      <div className="bg-[#070e24]/95 p-1.5 rounded-2xl border border-[#14234b] flex items-center justify-between gap-2 shadow-[0_4px_25px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSwitchToPaymentReceived}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-[#0c183d] transition-all cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
            <span>Payment Received Dashboard</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md border border-rose-400/50">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-200" />
            <span>Debit Voucher Dashboard</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 pr-2 text-[11px] text-slate-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span>Outflow &amp; Payables Center</span>
        </div>
      </div>

      {/* 1. HERO HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1f0a14] via-[#0f1128] to-[#0a0f24] border border-rose-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.6)] p-6 md:p-8">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-amber-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/20 backdrop-blur-md rounded-full text-xs font-bold text-rose-300 border border-rose-400/30">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Payables &amp; Outflow Intelligence</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Debit Voucher Dashboard</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-400/30">
                Outflow Verified
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Track supplier debits, cash payments, online bank disbursements (NEFT/RTGS/UPI), pending supplier bills, and issue instant verified debit vouchers with ledger sync.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onOpenCreateVoucher()}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-sm rounded-xl shadow-lg shadow-rose-600/30 transition-all transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Record Debit Voucher
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#09122e] hover:bg-[#12224d] text-slate-200 font-semibold text-xs rounded-xl border border-[#1b2b5d] transition-colors cursor-pointer"
              title="Download Full Debit Register"
            >
              <Download className="w-3.5 h-3.5 text-rose-400" /> Export CSV
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#09122e] hover:bg-[#12224d] text-slate-200 font-semibold text-xs rounded-xl border border-[#1b2b5d] transition-colors cursor-pointer no-print"
              title="Print Dashboard Summary"
            >
              <Printer className="w-3.5 h-3.5 text-rose-300" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE FINANCIAL KPIS (5 CARDS GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Total Debited */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl p-4.5 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Total Debited
            </span>
            <div className="p-1.5 bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/30">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-300 font-mono">
            {formatIndianCurrency(analytics.totalDebited)}
          </div>
          <div className="text-[10.5px] text-slate-400 font-medium">
            Across {analytics.totalCount} debit vouchers
          </div>
        </div>

        {/* Card 2: Today's Debits */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl p-4.5 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Today's Debits
            </span>
            <div className="p-1.5 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono">
            {formatIndianCurrency(analytics.todayDebits)}
          </div>
          <div className="text-[10.5px] text-slate-400 font-medium">
            {analytics.todayCount} Debits logged today
          </div>
        </div>

        {/* Card 3: This Month Outflow */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl p-4.5 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              This Month Outflow
            </span>
            <div className="p-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg border border-cyan-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-300 font-mono">
            {formatIndianCurrency(analytics.thisMonthDebits)}
          </div>
          <div className="text-[10.5px] text-slate-400 font-medium">
            {analytics.thisMonthCount} Vouchers in {new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Card 4: Pending Payables */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl p-4.5 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">
              Pending Payables
            </span>
            <div className="p-1.5 bg-red-500/20 text-red-300 rounded-lg border border-red-500/30">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-300 font-mono">
            {formatIndianCurrency(analytics.pendingPayables)}
          </div>
          <div className="text-[10.5px] text-red-400 font-bold">
            {analytics.unpaidBillsCount} Bills awaiting payment
          </div>
        </div>

        {/* Card 5: Outflow Split */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl p-4.5 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
              Cash vs Bank Outflow
            </span>
            <div className="p-1.5 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/30">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Cash:</span>
              <span className="font-mono font-bold text-amber-300">₹{analytics.cashDebits.toLocaleString('en-IN')} ({analytics.cashShare}%)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Bank / UPI:</span>
              <span className="font-mono font-bold text-cyan-300">₹{analytics.bankDebits.toLocaleString('en-IN')} ({analytics.bankShare}%)</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. VISUAL ANALYTICS & RECENT INTELLIGENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Payment Modes Distribution */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl p-5 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#14234b] pb-2.5">
            <h3 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-rose-400" />
              Debit Modes Distribution
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Total 100%</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* UPI */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-300">UPI (Google Pay / PhonePe)</span>
                <span className="font-mono text-rose-300">₹{analytics.upiDebits.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-[#09122e] border border-[#1b2b5d] rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-rose-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${analytics.totalDebited > 0 ? (analytics.upiDebits / analytics.totalDebited) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* NEFT / RTGS */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-300">NEFT / RTGS Transfer</span>
                <span className="font-mono text-cyan-300">₹{analytics.neftDebits.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-[#09122e] border border-[#1b2b5d] rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${analytics.totalDebited > 0 ? (analytics.neftDebits / analytics.totalDebited) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Cash */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-300">Cash Payments</span>
                <span className="font-mono text-amber-300">₹{analytics.cashDebits.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-[#09122e] border border-[#1b2b5d] rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${analytics.totalDebited > 0 ? (analytics.cashDebits / analytics.totalDebited) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Cheque */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-300">Cheque / Demand Draft</span>
                <span className="font-mono text-purple-300">₹{analytics.chequeDebits.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-[#09122e] border border-[#1b2b5d] rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${analytics.totalDebited > 0 ? (analytics.chequeDebits / analytics.totalDebited) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top 5 Parties Paid Leaderboard */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl p-5 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-3">
          <div className="flex items-center justify-between border-b border-[#14234b] pb-2.5">
            <h3 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-rose-400" />
              Top Paid Parties / Suppliers
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Ranked by Debits</span>
          </div>

          {topPaidParties.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No debit vouchers logged yet.
            </div>
          ) : (
            <div className="divide-y divide-[#101b3d] text-xs">
              {topPaidParties.map((party, idx) => (
                <div key={party.partyId} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#09122e] border border-[#1b2b5d] text-rose-300 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white truncate max-w-[140px]">{party.partyName}</div>
                      <div className="text-[10px] text-slate-400">{party.count} vouchers • Last: {party.lastDate}</div>
                    </div>
                  </div>
                  <div className="font-mono font-black text-rose-300 text-right">
                    ₹{party.totalPaid.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Debit Voucher Actions */}
        <div className="bg-gradient-to-br from-[#1f0a14] via-[#0f1128] to-[#0a0f24] text-white p-5 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30">
                <Receipt className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-white">Quick Debit Voucher</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Instantly debit a supplier/party ledger, settle purchase bills or advances, and generate a verified 1-page A4/Thermal debit voucher with WhatsApp sharing.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#14234b] text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Total Debits Issued:</span>
              <span className="font-mono text-rose-400 font-bold">{analytics.totalCount} Vouchers</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Pending Payables:</span>
              <span className="font-mono text-red-400 font-bold">₹{analytics.pendingPayables.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button
            onClick={() => onOpenCreateVoucher()}
            className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + Create Debit Voucher
          </button>
        </div>

      </div>

      {/* 4. DASHBOARD TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-[#14234b] pb-2">
        <button
          onClick={() => setActiveTab('VOUCHERS_LIST')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
            activeTab === 'VOUCHERS_LIST'
              ? 'bg-rose-600/90 text-white shadow-lg shadow-rose-600/20 border border-rose-500/40'
              : 'bg-[#09122e] text-slate-300 hover:bg-[#0e1a3e] border border-[#14234b]'
          }`}
        >
          <Receipt className="w-4 h-4 text-rose-400" />
          <span>Debit Vouchers Register ({filteredVouchers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PENDING_DUES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
            activeTab === 'PENDING_DUES'
              ? 'bg-rose-600/90 text-white shadow-lg shadow-rose-600/20 border border-rose-500/40'
              : 'bg-[#09122e] text-slate-300 hover:bg-[#0e1a3e] border border-[#14234b]'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>Pending Bills to Pay ({pendingBills.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PARTY_SUMMARY')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
            activeTab === 'PARTY_SUMMARY'
              ? 'bg-rose-600/90 text-white shadow-lg shadow-rose-600/20 border border-rose-500/40'
              : 'bg-[#09122e] text-slate-300 hover:bg-[#0e1a3e] border border-[#14234b]'
          }`}
        >
          <Users className="w-4 h-4 text-rose-400" />
          <span>Supplier / Party Ledger Summary</span>
        </button>
      </div>

      {/* 5. TAB 1: ALL DEBIT VOUCHERS TABLE */}
      {activeTab === 'VOUCHERS_LIST' && (
        <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] overflow-hidden space-y-3">
          
          {/* Search & Multi-Filters Toolbar */}
          <div className="p-4 bg-[#09122e] border-b border-[#14234b] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search by Voucher #, Party Name, UTR, Bill #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#070e24] border border-[#1b2b5d] rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/40 font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
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
                className="px-3 py-1.5 bg-[#070e24] border border-[#1b2b5d] rounded-xl text-xs font-semibold text-slate-200 cursor-pointer focus:border-cyan-500/70"
              >
                <option value="ALL" className="bg-[#070e24] text-slate-200">All Dates</option>
                <option value="TODAY" className="bg-[#070e24] text-slate-200">Today</option>
                <option value="THIS_WEEK" className="bg-[#070e24] text-slate-200">This Week</option>
                <option value="THIS_MONTH" className="bg-[#070e24] text-slate-200">This Month</option>
                <option value="LAST_MONTH" className="bg-[#070e24] text-slate-200">Last Month</option>
              </select>

              {/* Mode Filter */}
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="px-3 py-1.5 bg-[#070e24] border border-[#1b2b5d] rounded-xl text-xs font-semibold text-slate-200 cursor-pointer focus:border-cyan-500/70"
              >
                <option value="ALL" className="bg-[#070e24] text-slate-200">All Payment Modes</option>
                <option value="UPI" className="bg-[#070e24] text-slate-200">UPI</option>
                <option value="NEFT_RTGS" className="bg-[#070e24] text-slate-200">NEFT / RTGS</option>
                <option value="CASH" className="bg-[#070e24] text-slate-200">Cash</option>
                <option value="CHEQUE" className="bg-[#070e24] text-slate-200">Cheque</option>
                <option value="NET_BANKING" className="bg-[#070e24] text-slate-200">Net Banking</option>
                <option value="CARD" className="bg-[#070e24] text-slate-200">Card</option>
              </select>

              {/* Party Filter */}
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="px-3 py-1.5 bg-[#070e24] border border-[#1b2b5d] rounded-xl text-xs font-semibold text-slate-200 max-w-[160px] truncate cursor-pointer focus:border-cyan-500/70"
              >
                <option value="ALL" className="bg-[#070e24] text-slate-200">All Parties</option>
                {parties.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#070e24] text-slate-200">{p.name}</option>
                ))}
              </select>

              {/* Bank Account Filter */}
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="px-3 py-1.5 bg-[#070e24] border border-[#1b2b5d] rounded-xl text-xs font-semibold text-slate-200 max-w-[160px] truncate cursor-pointer focus:border-cyan-500/70"
              >
                <option value="ALL" className="bg-[#070e24] text-slate-200">All Bank Accounts</option>
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id} className="bg-[#070e24] text-slate-200">{b.bankName} (*{b.accountNumber.slice(-4)})</option>
                ))}
              </select>

            </div>

          </div>

          {/* Vouchers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#091433] border-b border-[#172a5a] text-cyan-300 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-4">Voucher No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Debited / Paid To</th>
                  <th className="py-3 px-3">Mode &amp; Reference</th>
                  <th className="py-3 px-3">Disbursed From</th>
                  <th className="py-3 px-3">Linked Bill / Purpose</th>
                  <th className="py-3 px-4 text-right">Amount (₹ Dr)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#101b3d]">
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <Receipt className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                      <p className="font-bold text-slate-300">No debit vouchers found.</p>
                      <p className="text-[11px] text-slate-500">Click "+ Create Debit Voucher" to log a new payment outflow.</p>
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((dv) => (
                    <tr key={dv.id} className="hover:bg-[#0c183d]/60 transition-colors">
                      
                      {/* Voucher No */}
                      <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-semibold">
                          {dv.voucherNumber}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-300 font-mono whitespace-nowrap">
                        {dv.date}
                      </td>

                      {/* Paid To Party */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{dv.partyName}</div>
                      </td>

                      {/* Mode & Ref */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#09122e] text-slate-200 border border-[#1b2b5d] uppercase">
                            {dv.paymentMode}
                          </span>
                        </div>
                        {dv.referenceNumber && (
                          <div className="text-[10px] font-mono text-cyan-400/80 pt-0.5">
                            Ref: {dv.referenceNumber}
                          </div>
                        )}
                      </td>

                      {/* Bank / Cash */}
                      <td className="py-3 px-3 text-slate-300">
                        {dv.paymentMode === 'CASH' ? (
                          <span className="text-[11px] font-medium text-amber-300 flex items-center gap-1">
                            <Wallet className="w-3 h-3 text-amber-400" /> Cash Register
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-300 font-medium truncate block max-w-[130px]">
                            {dv.bankAccountName || 'Bank Account'}
                          </span>
                        )}
                      </td>

                      {/* Linked Bill / Remarks */}
                      <td className="py-3 px-3">
                        {dv.billNumber ? (
                          <span className="text-[11px] font-bold text-rose-300 bg-rose-500/15 px-1.5 py-0.5 rounded border border-rose-500/30">
                            Bill #{dv.billNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic truncate block max-w-[130px]">
                            {dv.remarks || 'Ledger Debit'}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-300 text-sm whitespace-nowrap">
                        {formatIndianCurrency(dv.amount)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Print Receipt */}
                          <button
                            type="button"
                            onClick={() => setPrintingVoucher(dv)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#09122e] rounded-lg transition-colors cursor-pointer"
                            title="View / Print Debit Voucher Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(dv)}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-[#09122e] rounded-lg transition-colors cursor-pointer"
                            title="Share Debit Voucher on WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => onOpenEditVoucher(dv)}
                            className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-[#09122e] rounded-lg transition-colors cursor-pointer"
                            title="Edit Debit Voucher"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => onDeleteVoucher(dv.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-[#09122e] rounded-lg transition-colors cursor-pointer"
                            title="Delete Debit Voucher"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* 6. TAB 2: PENDING BILLS TO PAY */}
      {activeTab === 'PENDING_DUES' && (
        <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] overflow-hidden space-y-3">
          
          <div className="p-4 bg-[#09122e] border-b border-[#14234b]">
            <h3 className="font-black text-sm text-white">Pending Supplier Bills &amp; Payables</h3>
            <p className="text-xs text-slate-400">Unsettled purchase estimates and supplier invoices awaiting disbursement.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#091433] border-b border-[#172a5a] text-cyan-300 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-4">Bill No</th>
                  <th className="py-3 px-4">Bill Date</th>
                  <th className="py-3 px-4">Supplier / Party</th>
                  <th className="py-3 px-3 text-right">Total Bill</th>
                  <th className="py-3 px-3 text-right">Paid So Far</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#101b3d]">
                {pendingBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                      <p className="font-bold text-slate-200">No pending supplier bills found!</p>
                      <p className="text-[11px] text-slate-400">All purchase bills and payables are fully settled.</p>
                    </td>
                  </tr>
                ) : (
                  pendingBills.map((inv) => {
                    const party = parties.find(p => p.id === inv.partyId);
                    return (
                      <tr key={inv.id} className="hover:bg-[#0c183d]/60 transition-colors">
                        
                        <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                          {inv.invoiceNumber}
                        </td>

                        <td className="py-3 px-4 text-slate-300 font-mono whitespace-nowrap">
                          {inv.date}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{inv.partyName}</div>
                          {party?.phone && <div className="text-[10.5px] text-cyan-400/80 font-mono">{party.phone}</div>}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          {formatIndianCurrency(inv.grandTotal)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-emerald-400 font-bold">
                          {formatIndianCurrency(inv.paidAmount || 0)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black text-rose-300 text-sm">
                          {formatIndianCurrency(inv.balanceDue || inv.grandTotal)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onOpenCreateVoucher(party, inv)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                          >
                            + Pay / Debit Voucher
                          </button>
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

      {/* 7. TAB 3: SUPPLIER / PARTY LEDGER SUMMARY */}
      {activeTab === 'PARTY_SUMMARY' && (
        <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] overflow-hidden space-y-3">
          
          <div className="p-4 bg-[#09122e] border-b border-[#14234b]">
            <h3 className="font-black text-sm text-white">Supplier &amp; Party Debits Ledger Summary</h3>
            <p className="text-xs text-slate-400">Summary of total debits paid, vouchers issued, and current ledger balances per party.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#091433] border-b border-[#172a5a] text-cyan-300 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-4">Party / Supplier Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-3 text-right">Total Debits Paid</th>
                  <th className="py-3 px-3 text-center">Vouchers Count</th>
                  <th className="py-3 px-4 text-right">Ledger Balance</th>
                  <th className="py-3 px-4 text-center">Last Payment Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#101b3d]">
                {partyDebitSummaries.map(({ party, totalPaid, balance, vouchersCount, lastPayment }) => (
                  <tr key={party.id} className="hover:bg-[#0c183d]/60 transition-colors">
                    
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{party.name}</div>
                      {party.tradeName && <div className="text-[10.5px] text-slate-400">{party.tradeName}</div>}
                    </td>

                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                      {party.phone || '—'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-300">
                      {formatIndianCurrency(totalPaid)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-slate-300">
                      {vouchersCount}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-black text-sm">
                      <span className={balance < 0 ? 'text-rose-400' : balance > 0 ? 'text-emerald-400' : 'text-slate-400'}>
                        {formatIndianCurrency(Math.abs(balance))} {balance < 0 ? '(Payable)' : balance > 0 ? '(Receivable)' : '(Nil)'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">
                      {lastPayment || 'No debits'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenCreateVoucher(party)}
                        className="px-3 py-1 bg-[#09122e] hover:bg-rose-500/20 text-rose-300 font-bold rounded-lg text-xs border border-[#1b2b5d] hover:border-rose-500/40 transition-colors cursor-pointer"
                      >
                        + Debit Voucher
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* 8. SINGLE DEBIT VOUCHER PRINT MODAL */}
      {printingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 uppercase flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-700" />
                Debit Voucher Receipt
              </h3>
              <button
                onClick={() => setPrintingVoucher(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Card Body */}
            <div id="debit-voucher-printable-receipt" className="border-2 border-slate-900 rounded-2xl p-6 bg-white space-y-4 text-slate-900">
              
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                <h2 className="text-xl font-black uppercase tracking-tight">{businessProfile.name}</h2>
                <p className="text-xs text-slate-600">{businessProfile.address}, {businessProfile.city} - {businessProfile.pincode}</p>
                <p className="text-xs font-mono font-bold text-slate-700">GSTIN: {businessProfile.gstin} | PAN: {businessProfile.pan}</p>
                <div className="pt-1">
                  <span className="px-3 py-0.5 rounded-full bg-rose-900 text-white font-black text-xs uppercase tracking-wider">
                    Official Debit Voucher (Payment Advice)
                  </span>
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-200 pb-3">
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block">Debit Voucher No:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{printingVoucher.voucherNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 uppercase text-[10px] block">Disbursement Date:</span>
                  <span className="font-mono font-bold text-slate-900">{printingVoucher.date}</span>
                </div>
              </div>

              {/* Party & Payment Details */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block">Paid / Debited To:</span>
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
                    <span className="text-slate-500 uppercase text-[10px] block">Disbursed From Bank Account:</span>
                    <span className="font-bold text-slate-900">{printingVoucher.bankAccountName}</span>
                  </div>
                )}

                {printingVoucher.billNumber && (
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Adjusted Against Bill:</span>
                    <span className="font-mono font-bold text-rose-800">{printingVoucher.billNumber}</span>
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
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-300 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-700 uppercase block">Amount Debited:</span>
                  <span className="text-xs text-rose-900 italic font-medium">{numberToIndianWords(printingVoucher.amount)}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black text-rose-900">
                    {formatIndianCurrency(printingVoucher.amount)}
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 flex items-end justify-between text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Computer Generated Voucher</div>
                  <div className="font-semibold text-slate-700">Receiver's Signature / Stamp</div>
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
                <Share2 className="w-3.5 h-3.5" /> WhatsApp Voucher
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Voucher
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
