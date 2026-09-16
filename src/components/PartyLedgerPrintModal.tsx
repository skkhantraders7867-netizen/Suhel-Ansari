import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Printer, Download, Share2, Upload, Image as ImageIcon, Trash2, Check, Save
} from 'lucide-react';
import { Party, Invoice, BusinessProfile, PaymentVoucher } from '../types';
import { GST_STATES } from '../data/mockData';
import { formatIndianCurrency, numberToIndianWords } from '../utils/gstCalculations';
import { printElementSafely, downloadElementAsPdf } from '../utils/pdfExport';

interface LedgerEntry {
  id: string;
  date: string;
  type: string;        // e.g. JOURNAL, RCPT, OB
  invoiceNo: string;   // e.g. 13(26-27) or INV-001
  itemDescription: string; // Item Discription / Typed description
  amount: number;      // Bill Amount (Debit)
  payment: number;     // Payment or TDS (Credit)
  tdsAmount?: number;
  tdsRate?: number;
  tdsSection?: string;
  entryType: 'OPENING' | 'INVOICE' | 'TDS' | 'PAYMENT';
  runningBalance: number;
}

interface PartyLedgerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
  invoices: Invoice[];
  businessProfile: BusinessProfile;
  paymentVouchers?: PaymentVoucher[];
  onUpdateParty?: (party: Party) => void;
}

function formatDateToDMY(dateStr?: string): string {
  if (!dateStr) return '';
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export const PartyLedgerPrintModal: React.FC<PartyLedgerPrintModalProps> = ({
  isOpen,
  onClose,
  party,
  invoices = [],
  businessProfile,
  paymentVouchers = [],
  onUpdateParty,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(
    businessProfile.logoUrl || 'https://lh3.googleusercontent.com/d/16BUJ9mO_ZLvGvhuxxLRwnvlWxeiemQX8'
  );
  const [openingBalance, setOpeningBalance] = useState<number>(Math.abs(party?.openingBalance || 0));
  const [balanceType, setBalanceType] = useState<'Dr' | 'Cr'>(
    party?.openingBalanceType ? (party.openingBalanceType === 'CR' ? 'Cr' : 'Dr') : ((party?.openingBalance || 0) < 0 ? 'Cr' : 'Dr')
  );
  const [financialYear, setFinancialYear] = useState<string>('2025-2026');
  const [openingDate, setOpeningDate] = useState<string>(party?.openingBalanceDate || '01-04-2025');
  const [isSavedOpening, setIsSavedOpening] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or party changes
  useEffect(() => {
    if (isOpen && party) {
      setLogoUrl(businessProfile.logoUrl || 'https://lh3.googleusercontent.com/d/16BUJ9mO_ZLvGvhuxxLRwnvlWxeiemQX8');
      setOpeningBalance(Math.abs(party.openingBalance || 0));
      setBalanceType(
        party.openingBalanceType 
          ? (party.openingBalanceType === 'CR' ? 'Cr' : 'Dr') 
          : ((party.openingBalance || 0) < 0 ? 'Cr' : 'Dr')
      );
      setOpeningDate(party.openingBalanceDate || '01-04-2025');
      setIsSavedOpening(false);
    }
  }, [businessProfile.logoUrl, party, isOpen]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setLogoUrl(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  // Save Opening Balance to Party and Database permanently
  const handleSaveOpeningBalance = () => {
    const signedBalance = balanceType === 'Cr' ? -Math.abs(Number(openingBalance) || 0) : Math.abs(Number(openingBalance) || 0);
    if (onUpdateParty && party) {
      onUpdateParty({
        ...party,
        openingBalance: signedBalance,
        openingBalanceType: balanceType === 'Cr' ? 'CR' : 'DR',
        openingBalanceDate: openingDate,
      });
      setIsSavedOpening(true);
      setTimeout(() => setIsSavedOpening(false), 3000);
    }
  };

  if (!isOpen) return null;

  // Calculate effective opening balance value with sign
  const effectiveOpeningBalance = balanceType === 'Cr' ? -Math.abs(Number(openingBalance) || 0) : Math.abs(Number(openingBalance) || 0);

  // Filter invoices for this party
  const partyInvoices = invoices.filter(
    inv => (inv.partyId === party.id || inv.partyName.toLowerCase() === party.name.toLowerCase()) && 
           inv.documentType !== 'QUOTATION' && inv.documentType !== 'PURCHASE_ESTIMATE'
  );

  // Filter payment vouchers for this party
  const partyVouchers = paymentVouchers.filter(
    pv => pv.partyId === party.id || pv.partyName.toLowerCase() === party.name.toLowerCase()
  );

  // Build Chronological Ledger Entries
  const rawEntries: Omit<LedgerEntry, 'runningBalance'>[] = [];

  // 1. Opening Balance Entry (Always present as top row)
  rawEntries.push({
    id: 'entry-opening',
    date: openingDate || '01-04-2025',
    type: 'OB',
    invoiceNo: '-',
    itemDescription: `OPENING BALANCE B/F (F.Y. ${financialYear})`,
    amount: effectiveOpeningBalance > 0 ? effectiveOpeningBalance : 0,
    payment: effectiveOpeningBalance < 0 ? Math.abs(effectiveOpeningBalance) : 0,
    entryType: 'OPENING',
  });

  // Sort invoices by date ascending
  const sortedInvoices = [...partyInvoices].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedInvoices.forEach((inv) => {
    // Extract Item Names & descriptions from invoice items
    const itemNamesList = inv.items && inv.items.length > 0
      ? inv.items.map(item => (item.name || item.description || '').toUpperCase()).filter(Boolean)
      : [];

    const itemDescription = itemNamesList.length > 0
      ? itemNamesList.join('\n')
      : (inv.notes?.toUpperCase() || 'SALES / BILL ISSUED');

    const billAmount = Number(inv.grandTotal || 0);

    // 2. Invoice Debit Entry (Bill Amount)
    rawEntries.push({
      id: `entry-inv-${inv.id}`,
      date: formatDateToDMY(inv.date),
      type: 'JOURNAL',
      invoiceNo: inv.invoiceNumber,
      itemDescription: itemDescription,
      amount: billAmount,
      payment: 0,
      entryType: 'INVOICE',
    });

    // 3. TDS Deduction Entry if applicable (Accounted as Credit in Ledger)
    if (inv.isTdsApplicable && (inv.tdsAmount || 0) > 0) {
      const tdsAmt = Number(inv.tdsAmount || 0);
      const tdsRate = inv.tdsRate || 1;
      const tdsSec = inv.tdsSection || 'Sec 194C / 194Q';
      rawEntries.push({
        id: `entry-tds-${inv.id}`,
        date: formatDateToDMY(inv.date),
        type: '',
        invoiceNo: '',
        itemDescription: `TDS On Contract - ${tdsSec} (${tdsRate}%)`,
        amount: 0,
        payment: tdsAmt,
        tdsAmount: tdsAmt,
        tdsRate: tdsRate,
        tdsSection: tdsSec,
        entryType: 'TDS',
      });
    }

    // 4. If invoice has recorded paidAmount that is NOT from a PaymentVoucher, include it
    const hasVoucherForInv = partyVouchers.some(pv => pv.invoiceId === inv.id);
    if (!hasVoucherForInv && (inv.paidAmount || 0) > 0) {
      const paidAmt = Number(inv.paidAmount || 0);
      rawEntries.push({
        id: `entry-pay-${inv.id}`,
        date: formatDateToDMY(inv.date),
        type: 'RCPT',
        invoiceNo: inv.invoiceNumber,
        itemDescription: inv.paymentReference 
          ? `PAYMENT RECEIVED VIA ${inv.paymentMode?.toUpperCase() || 'BANK / UPI'} (REF: ${inv.paymentReference})`
          : `PAYMENT RECEIVED VIA ${inv.paymentMode?.toUpperCase() || 'BANK / UPI'}`,
        amount: 0,
        payment: paidAmt,
        entryType: 'PAYMENT',
      });
    }
  });

  // 5. Add all dedicated Payment Vouchers
  partyVouchers.forEach((pv) => {
    rawEntries.push({
      id: `entry-pv-${pv.id}`,
      date: formatDateToDMY(pv.date),
      type: 'RCPT',
      invoiceNo: pv.invoiceNumber || pv.voucherNumber || '-',
      itemDescription: `PAYMENT RECEIVED VIA ${pv.paymentMode.toUpperCase()} (REF: ${pv.referenceNumber || 'N/A'})${pv.remarks ? ` - ${pv.remarks}` : ''}`,
      amount: 0,
      payment: Number(pv.amount || 0),
      entryType: 'PAYMENT',
    });
  });

  // Calculate running balances
  let runningBal = 0;
  const entries: LedgerEntry[] = rawEntries.map((e) => {
    if (e.entryType === 'OPENING') {
      runningBal = (e.amount || 0) - (e.payment || 0);
    } else {
      runningBal += (e.amount || 0) - (e.payment || 0);
    }
    return {
      ...e,
      runningBalance: runningBal,
    };
  });

  // Calculate Totals for Summary
  const totalDebit = entries.reduce((sum, e) => sum + (e.entryType !== 'OPENING' ? e.amount : 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.entryType !== 'OPENING' ? e.payment : 0), 0);
  const totalTdsDeducted = entries.reduce((sum, e) => sum + (e.tdsAmount || 0), 0);
  const totalPaymentsReceived = entries.reduce((sum, e) => sum + (e.entryType === 'PAYMENT' ? e.payment : 0), 0);
  const finalBalance = runningBal;

  // Print Handler
  const handlePrint = () => {
    if (printRef.current) {
      printElementSafely(printRef.current, `Statement_${party.name.replace(/\s+/g, '_')}`);
    }
  };

  // PDF Export Handler with intelligent 1-page fit
  const handleExportPdf = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      await downloadElementAsPdf(printRef.current, `Statement_${party.name.replace(/\s+/g, '_')}.pdf`, {
        scale: entries.length > 15 ? 2.0 : 2.5,
      });
    } catch (err) {
      console.error('Failed to export ledger PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // WhatsApp Statement Message
  const handleShareWhatsApp = () => {
    if (!party.phone) return;
    const msg = `*STATEMENT OF ACCOUNT*
From: *${businessProfile.name || 'SR GROUP'}*
Customer: *${party.name}*
Date: ${new Date().toLocaleDateString('en-IN')}

━━━━━━━━━━━━━━━━━━━━━━━━
📊 *Summary of Account:*
• Total Billed (Dr): ${formatIndianCurrency(totalDebit)}
• TDS Deducted: ${formatIndianCurrency(totalTdsDeducted)}
• Payments Received: ${formatIndianCurrency(totalPaymentsReceived)}
━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ *Current Outstanding Balance: ${formatIndianCurrency(Math.abs(finalBalance))} ${finalBalance >= 0 ? '(Dr - Receivable)' : '(Cr - Settled)'}*
━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for your business!`;

    const cleanPhone = party.phone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Intelligent scaling classes based on number of rows to guarantee single page fit
  const rowCount = entries.length;
  const isDense = rowCount > 12;
  const isSuperDense = rowCount > 20;

  const tableFontSize = isSuperDense ? 'text-[8.5px]' : isDense ? 'text-[9.5px]' : 'text-[10px]';
  const cellPadding = isSuperDense ? 'py-1 px-1' : isDense ? 'py-1.5 px-1.5' : 'py-2 px-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl my-4 overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* Top Modal Controls Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <input 
            type="file" 
            ref={logoInputRef} 
            onChange={handleLogoUpload} 
            accept="image/png, image/jpeg, image/webp, image/svg+xml" 
            className="hidden" 
          />

          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs">
              📜
            </span>
            <div>
              <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                <span>Party Ledger Statement (1-Page Fit)</span>
                <span className="text-[11px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded font-mono">
                  {party.name}
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                Official statement format with Item Description, Bills, Payments &amp; TDS
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Logo Upload Section Controls */}
            {logoUrl ? (
              <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-slate-200 hover:text-white hover:bg-slate-700 font-medium text-xs rounded-lg transition-colors"
                  title="Change Logo for PDF"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" /> Change Logo
                </button>
                <button
                  onClick={handleRemoveLogo}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors"
                  title="Remove Logo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs rounded-xl border border-slate-700 shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" /> Upload Logo (लोगो लगाएं)
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" /> Print (1-Page)
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> {isExporting ? 'Exporting...' : 'PDF'}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors"
            >
              <Share2 className="w-4 h-4" /> WhatsApp
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Opening Balance Toolbar & Save Option (no-print) */}
        <div className="bg-slate-800 border-b border-slate-700 px-5 py-2.5 text-white flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <span>⚖️ Opening Balance:</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Financial Year Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 text-[11px] font-semibold">F.Y.:</span>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1 text-white font-mono font-bold text-xs focus:ring-1 focus:ring-blue-500"
              >
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2023-2024">2023-2024</option>
              </select>
            </div>

            {/* Opening Date */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 text-[11px] font-semibold">Date:</span>
              <input
                type="text"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                placeholder="01-04-2025"
                className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-white font-mono text-xs w-24 text-center focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Opening Balance Amount */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 text-[11px] font-semibold">Amount (₹):</span>
              <input
                type="number"
                min="0"
                step="any"
                value={openingBalance || ''}
                onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                placeholder="0.00"
                className="bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1 text-white font-mono font-bold text-xs w-28 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Dr / Cr Toggle */}
            <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-600">
              <button
                type="button"
                onClick={() => setBalanceType('Dr')}
                className={`px-2.5 py-0.5 rounded text-xs font-bold transition-colors ${
                  balanceType === 'Dr' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dr (Receivable)
              </button>
              <button
                type="button"
                onClick={() => setBalanceType('Cr')}
                className={`px-2.5 py-0.5 rounded text-xs font-bold transition-colors ${
                  balanceType === 'Cr' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cr (Advance)
              </button>
            </div>

            {/* Save Opening Balance Button */}
            <button
              type="button"
              onClick={handleSaveOpeningBalance}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs ${
                isSavedOpening 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
              title="Save Opening Balance to Party & Database permanently"
            >
              {isSavedOpening ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Saved to Database!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save Opening Balance
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Printable Statement Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center bg-slate-300/60">
          <div 
            ref={printRef}
            className="printable-area bg-white text-black shadow-2xl border border-slate-300 rounded-none w-full max-w-[840px] p-5 md:p-7 space-y-3 font-sans"
            style={{ boxSizing: 'border-box' }}
          >
            {/* Embedded Print CSS for Single Page layout */}
            <style>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 6mm !important;
                }
                html, body {
                  height: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  overflow: hidden !important;
                  background: #fff !important;
                }
                .printable-area {
                  box-shadow: none !important;
                  border: 1.5px solid #000 !important;
                  padding: 8px 12px !important;
                  margin: 0 !important;
                  max-height: 98vh !important;
                  page-break-inside: avoid !important;
                  page-break-after: avoid !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>

            {/* 1. Header Banner - Matching Company Details & Statement Badge */}
            <div className="border-b-2 border-slate-800 pb-2.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5">
              {/* Left: Company Details & Logo Section */}
              <div className="flex items-center gap-3 max-w-[70%]">
                {logoUrl && (
                  <div className="relative shrink-0">
                    <img 
                      src={logoUrl} 
                      alt="Company Logo" 
                      className="max-h-16 max-w-[110px] object-contain rounded-xs border border-slate-200/80 p-0.5 bg-white shadow-2xs"
                    />
                  </div>
                )}

                <div className="space-y-0.5">
                  <h1 className="text-xl md:text-2xl font-black text-[#0f2e6b] uppercase tracking-wide">
                    {businessProfile.name || businessProfile.tradeName || 'SR GROUP'}
                  </h1>
                  {businessProfile.tagline && businessProfile.tagline.trim() !== '' && (
                    <p className="text-[10.5px] font-bold text-slate-800">
                      {businessProfile.tagline.trim()}
                    </p>
                  )}
                  {(businessProfile.address || businessProfile.city || businessProfile.state) && (
                    <div className="text-[10px] text-slate-700 leading-tight">
                      {[businessProfile.address, businessProfile.city, businessProfile.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 text-[10px] text-slate-800 pt-0.5">
                    {businessProfile.gstin && (
                      <span><strong>GSTIN:</strong> <span className="font-mono font-bold">{businessProfile.gstin}</span></span>
                    )}
                    {businessProfile.phone && (
                      <span><strong>Mobile:</strong> <span className="font-bold">{businessProfile.phone}</span></span>
                    )}
                    {businessProfile.email && (
                      <span><strong>Email:</strong> <span className="text-slate-800">{businessProfile.email}</span></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Statement of Account Badge */}
              <div className="text-right bg-blue-50 border border-blue-200 p-2 rounded-xl shrink-0 min-w-[170px]">
                <div className="text-xs font-black uppercase text-[#0f2e6b] tracking-wider">
                  STATEMENT OF ACCOUNT
                </div>
                <div className="text-[9px] text-slate-500 font-semibold">Customer / Party Ledger</div>
                <div className="text-[10px] font-mono font-bold text-slate-800 mt-0.5">
                  Date: {currentDateFormatted}
                </div>
              </div>
            </div>

            {/* 2. Account / Party Details Card */}
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex flex-col md:flex-row justify-between gap-2.5 text-xs">
              {/* Left: Party Details */}
              <div className="space-y-0.5 max-w-[65%]">
                <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider block">
                  ACCOUNT / PARTY DETAILS:
                </span>
                <div className="text-sm font-black text-slate-950 uppercase">{party.name}</div>
                <div className="text-[10px] text-slate-700 leading-snug">
                  {party.billingAddress && (
                    <span>
                      <span className="font-semibold text-slate-600 uppercase">ADDRESS: </span>
                      {party.billingAddress}
                    </span>
                  )}
                  {party.city && <span className="uppercase">{party.billingAddress ? ', ' : ''}CITY: {party.city}</span>}
                  {party.state && <span className="uppercase"> STATE: {party.state}</span>}
                </div>
              </div>

              {/* Right: Party GSTIN, Phone, State Code */}
              <div className="text-left md:text-right space-y-0.5 text-[10px] shrink-0">
                {party.gstin && (
                  <div>
                    <span className="text-slate-500">Party GSTIN: </span>
                    <span className="font-mono font-bold text-[#0f2e6b]">{party.gstin}</span>
                  </div>
                )}
                {party.phone && (
                  <div>
                    <span className="text-slate-500">Phone: </span>
                    <span className="font-semibold text-slate-800">{party.phone}</span>
                  </div>
                )}
                {(() => {
                  let pState = party.state?.trim() || '';
                  let pCode = party.stateCode?.trim() || '';
                  if (!pCode && party.gstin && /^\d{2}/.test(party.gstin.trim())) {
                    pCode = party.gstin.trim().substring(0, 2);
                  }
                  if (!pCode && pState) {
                    pCode = GST_STATES.find(s => s.name.toLowerCase() === pState.toLowerCase() || pState.toLowerCase().includes(s.name.toLowerCase()))?.code || '';
                  }
                  if (!pState && pCode) {
                    pState = GST_STATES.find(s => s.code === pCode)?.name || '';
                  }
                  if (!pState && !pCode) return null;
                  return (
                    <div>
                      <span className="text-slate-500">State: </span>
                      <span className="font-semibold text-slate-800">
                        {pState} {pCode ? `(Code: ${pCode})` : ''}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 3. Main Ledger Table */}
            <div className="w-full border-2 border-black overflow-hidden mt-2">
              <table className={`w-full text-left border-collapse table-fixed ${tableFontSize}`}>
                <colgroup>
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '37%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-[#cad9e8] text-black font-bold text-center border-b-2 border-black text-[10px]">
                    <th className="py-1.5 px-1 border-r border-black font-bold text-center">Date</th>
                    <th className="py-1.5 px-1 border-r border-black font-bold text-center">Type</th>
                    <th className="py-1.5 px-1 border-r border-black font-bold text-center">Invoice #</th>
                    <th className="py-1.5 px-2 border-r border-black font-bold text-center">Item Description</th>
                    <th className="py-1.5 px-1.5 border-r border-black font-bold text-center">Amount (Dr)</th>
                    <th className="py-1.5 px-1.5 border-r border-black font-bold text-center">Payment (Cr)</th>
                    <th className="py-1.5 px-1.5 font-bold text-center">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-medium text-black">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500 font-semibold">
                        No transactions recorded for this party.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, idx) => (
                      <tr 
                        key={entry.id || idx} 
                        className="border-b border-black"
                      >
                        {/* Date */}
                        <td className={`${cellPadding} font-mono text-center font-bold border-r border-black align-middle`}>
                          {entry.date}
                        </td>

                        {/* Type */}
                        <td className={`${cellPadding} text-center font-bold border-r border-black uppercase align-middle`}>
                          {entry.type}
                        </td>

                        {/* Invoice # */}
                        <td className={`${cellPadding} text-center font-mono font-bold border-r border-black align-middle`}>
                          {entry.invoiceNo}
                        </td>

                        {/* Item Description */}
                        <td className={`${cellPadding} border-r border-black align-middle text-left font-bold text-black`}>
                          <div className="whitespace-pre-line leading-tight">
                            {entry.itemDescription}
                          </div>
                        </td>

                        {/* Amount (Debit) */}
                        <td className={`${cellPadding} text-right font-mono font-bold text-black border-r border-black align-middle tabular-nums`}>
                          {entry.amount > 0 ? formatIndianCurrency(entry.amount, true) : ''}
                        </td>

                        {/* Payment (Credit / TDS / Payment) */}
                        <td className={`${cellPadding} text-right font-mono font-bold text-black border-r border-black align-middle tabular-nums`}>
                          {entry.payment > 0 ? formatIndianCurrency(entry.payment, true) : ''}
                        </td>

                        {/* Balance (Running Balance) */}
                        <td className={`${cellPadding} text-right font-mono font-black text-black align-middle tabular-nums`}>
                          {formatIndianCurrency(entry.runningBalance, true)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* 4. STATEMENT TOTALS ROW */}
                <tfoot>
                  <tr className="bg-slate-100 font-black border-t-2 border-black text-[10px]">
                    <td colSpan={4} className="py-1.5 px-2 text-right uppercase text-slate-900 border-r border-black tracking-wider font-extrabold">
                      STATEMENT TOTALS:
                    </td>
                    <td className="py-1.5 px-1.5 text-right font-mono text-slate-950 border-r border-black tabular-nums font-bold">
                      {formatIndianCurrency(totalDebit, true)}
                    </td>
                    <td className="py-1.5 px-1.5 text-right font-mono text-slate-950 border-r border-black tabular-nums font-bold">
                      {formatIndianCurrency(totalCredit, true)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-black text-[#0f2e6b] bg-[#dce6f1] tabular-nums">
                      {formatIndianCurrency(Math.abs(finalBalance), true)} {finalBalance >= 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5. Net Outstanding In Words Card */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-1.5 text-[10px]">
              <div>
                <span className="text-[9px] font-bold uppercase text-slate-500 block">
                  NET OUTSTANDING BALANCE IN WORDS:
                </span>
                <span className="font-bold text-slate-900 leading-tight">
                  {numberToIndianWords(Math.abs(finalBalance))} Only {finalBalance >= 0 ? '(Receivable)' : '(Settled)'}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">TOTAL TDS INCLUDED:</span>
                <span className="font-mono font-bold text-amber-900">
                  {formatIndianCurrency(totalTdsDeducted, true)}
                </span>
              </div>
            </div>

            {/* 6. Bank Details & Authorized Signatory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[10px]">
              {/* Left: Bank Details */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-0.5">
                <div className="font-bold text-slate-900 uppercase text-[9px]">
                  BANK DETAILS FOR PAYMENT SETTLEMENT:
                </div>
                {businessProfile.bankName && (
                  <div><span className="text-slate-500">Bank Name: </span><strong className="text-slate-800">{businessProfile.bankName}</strong></div>
                )}
                {businessProfile.accountNumber && (
                  <div><span className="text-slate-500">Account No: </span><strong className="font-mono text-[#0f2e6b]">{businessProfile.accountNumber}</strong></div>
                )}
                {businessProfile.ifscCode && (
                  <div><span className="text-slate-500">IFSC Code: </span><strong className="font-mono text-slate-800">{businessProfile.ifscCode}</strong></div>
                )}
                {!businessProfile.bankName && !businessProfile.accountNumber && (
                  <div className="text-slate-500 text-[9.5px] italic">Bank details not configured in Profile Settings</div>
                )}
              </div>

              {/* Right: Authorised Signatory */}
              <div className="flex flex-col justify-between items-end text-right p-2.5 min-h-[75px]">
                <div className="text-slate-700 text-[10px]">
                  For <strong>{businessProfile.name || businessProfile.tradeName || 'SR GROUP'}</strong>
                </div>
                <div className="space-y-0.5 pt-4">
                  <div className="font-bold text-slate-900 text-[9.5px] uppercase tracking-wider">
                    AUTHORISED SIGNATORY
                  </div>
                  <div className="text-[8.5px] text-slate-400">Computer Generated Statement</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
