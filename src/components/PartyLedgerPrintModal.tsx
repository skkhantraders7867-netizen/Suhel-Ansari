import React, { useState, useRef } from 'react';
import { 
  X, Printer, Download, Share2, Upload, Image as ImageIcon, Trash2
} from 'lucide-react';
import { Party, Invoice, BusinessProfile } from '../types';
import { GST_STATES } from '../data/mockData';
import { formatIndianCurrency, numberToIndianWords } from '../utils/gstCalculations';
import { printElementSafely, downloadElementAsPdf } from '../utils/pdfExport';

interface LedgerEntry {
  id: string;
  date: string;
  type: string;        // e.g. JOURNAL
  invoiceNo: string;   // e.g. 13(26-27) or INV-001
  itemDescription: string; // Item Discription / Typed description from Invoice
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
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(
    businessProfile.logoUrl || 'https://lh3.googleusercontent.com/d/16BUJ9mO_ZLvGvhuxxLRwnvlWxeiemQX8'
  );
  const [openingBalance, setOpeningBalance] = useState<number>(party?.openingBalance || 0);
  const [balanceType, setBalanceType] = useState<'Dr' | 'Cr'>((party?.openingBalance || 0) < 0 ? 'Cr' : 'Dr');
  const [financialYear, setFinancialYear] = useState<string>('2025-2026');
  const [openingDate, setOpeningDate] = useState<string>('01-04-2025');

  const printRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or party changes
  React.useEffect(() => {
    if (isOpen && party) {
      setLogoUrl(businessProfile.logoUrl || 'https://lh3.googleusercontent.com/d/16BUJ9mO_ZLvGvhuxxLRwnvlWxeiemQX8');
      setOpeningBalance(Math.abs(party.openingBalance || 0));
      setBalanceType((party.openingBalance || 0) < 0 ? 'Cr' : 'Dr');
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

  if (!isOpen) return null;

  // Calculate effective opening balance value with sign
  const effectiveOpeningBalance = balanceType === 'Cr' ? -Math.abs(Number(openingBalance) || 0) : Math.abs(Number(openingBalance) || 0);

  // Filter invoices for this party
  const partyInvoices = invoices.filter(
    inv => inv.partyId === party.id || inv.partyName.toLowerCase() === party.name.toLowerCase()
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
    // Extract Item Names & descriptions from invoice items (formatted in uppercase per line)
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

    // 4. Payment Received Entry if any paid amount recorded
    if ((inv.paidAmount || 0) > 0) {
      const paidAmt = Number(inv.paidAmount || 0);
      rawEntries.push({
        id: `entry-pay-${inv.id}`,
        date: formatDateToDMY(inv.date),
        type: '',
        invoiceNo: '',
        itemDescription: inv.paymentReference 
          ? `PAYMENT RECEIVED VIA ${inv.paymentMode?.toUpperCase() || 'BANK / UPI'} (REF: ${inv.paymentReference})`
          : `PAYMENT RECEIVED VIA ${inv.paymentMode?.toUpperCase() || 'BANK / UPI'}`,
        amount: 0,
        payment: paidAmt,
        entryType: 'PAYMENT',
      });
    }
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

  // PDF Export Handler
  const handleExportPdf = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      await downloadElementAsPdf(printRef.current, `Statement_${party.name.replace(/\s+/g, '_')}.pdf`, {
        scale: 2.5,
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
From: *${businessProfile.name || 'NEW SR INFRA'}*
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
                <span>Party Ledger Statement</span>
                <span className="text-[11px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded font-mono">
                  {party.name}
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                Official statement format with Item Discription, Journal entries, Payments &amp; TDS
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
              <Printer className="w-4 h-4" /> Print Ledger (लेजर प्रिंट)
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

        {/* Opening Balance & Financial Year Quick Toolbar (no-print) */}
        <div className="bg-slate-800 border-b border-slate-700 px-5 py-2 text-white flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1">
              <span>⚖️ Opening Balance &amp; F.Y. Setup:</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Financial Year Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 text-[11px] font-semibold">Financial Year:</span>
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
              <span className="text-slate-300 text-[11px] font-semibold">Opening Date:</span>
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
          </div>
        </div>

        {/* Scrollable Printable Statement Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center bg-slate-300/60">
          <div 
            ref={printRef}
            className="printable-area bg-white text-black shadow-2xl border border-slate-300 rounded-none w-full max-w-[860px] p-6 md:p-8 space-y-4 text-xs font-sans"
            style={{ boxSizing: 'border-box', minHeight: '1050px' }}
          >
            {/* 1. Header Banner - Matching Company Details & Statement Badge with Logo Section */}
            <div className="border-b-2 border-slate-800 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              {/* Left: Company Details & Logo Section */}
              <div className="flex items-center gap-3.5 max-w-[70%]">
                {/* Logo Section for Ledger / PDF */}
                {logoUrl ? (
                  <div className="relative group shrink-0">
                    <img 
                      src={logoUrl} 
                      alt="Company Logo" 
                      className="max-h-20 max-w-[120px] object-contain rounded-xs border border-slate-200/80 p-0.5 bg-white shadow-2xs"
                    />
                    <div className="no-print absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xs flex items-center justify-center gap-1">
                      <button 
                        onClick={() => logoInputRef.current?.click()}
                        className="p-1 bg-white/90 rounded text-slate-900 hover:bg-white text-[10px]"
                        title="Change Logo"
                      >
                        <ImageIcon className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={handleRemoveLogo}
                        className="p-1 bg-red-600 rounded text-white hover:bg-red-700 text-[10px]"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="no-print shrink-0 w-24 h-16 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 transition-colors p-1 text-center"
                    title="Click to upload logo for Ledger PDF"
                  >
                    <Upload className="w-4 h-4 mb-0.5" />
                    <span className="text-[9px] font-bold">+ Add Logo</span>
                  </button>
                )}

                <div className="space-y-0.5">
                  <h1 className="text-xl md:text-2xl font-black text-[#0f2e6b] uppercase tracking-wide">
                    {businessProfile.name || businessProfile.tradeName || 'BUSINESS STATEMENT'}
                  </h1>
                  {businessProfile.tagline && businessProfile.tagline.trim() !== '' && (
                    <p className="text-[11px] font-bold text-slate-800">
                      {businessProfile.tagline.trim()}
                    </p>
                  )}
                  {(businessProfile.address || businessProfile.city || businessProfile.state || businessProfile.pincode) && (
                    <div className="text-[10px] text-slate-700 leading-tight">
                      {[businessProfile.address, businessProfile.city, businessProfile.state].filter(Boolean).join(', ')}
                      {businessProfile.pincode ? ` - ${businessProfile.pincode}` : ''}
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
              <div className="text-right bg-blue-50 border border-blue-200 p-2.5 rounded-xl shrink-0 min-w-[180px]">
                <div className="text-xs font-black uppercase text-[#0f2e6b] tracking-wider">
                  STATEMENT OF ACCOUNT
                </div>
                <div className="text-[9.5px] text-slate-500 font-semibold">Customer / Party Ledger</div>
                <div className="text-[10.5px] font-mono font-bold text-slate-800 mt-0.5">
                  Date: {currentDateFormatted}
                </div>
              </div>
            </div>

            {/* 2. Account / Party Details Card */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col md:flex-row justify-between gap-3">
              {/* Left: Party Details */}
              <div className="space-y-0.5 max-w-[62%]">
                <span className="text-[9.5px] font-bold uppercase text-slate-500 tracking-wider block">
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
                  {party.pincode && <span> PIN CODE: {party.pincode}</span>}
                </div>
              </div>

              {/* Right: Party GSTIN, Phone, State Code */}
              <div className="text-left md:text-right space-y-0.5 text-[10.5px] shrink-0">
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

            {/* 3. Main Ledger Table - Exact Headline Format & Item Discription from Image */}
            <div className="w-full border-2 border-black overflow-hidden mt-3">
              <table className="w-full text-left border-collapse table-fixed text-[10px]">
                <colgroup>
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '36%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-[#cad9e8] text-black font-bold text-center border-b-2 border-black text-[10.5px]">
                    <th className="py-2 px-1 border-r border-black font-bold text-center">Date</th>
                    <th className="py-2 px-1 border-r border-black font-bold text-center">Type</th>
                    <th className="py-2 px-1 border-r border-black font-bold text-center">Invoice #</th>
                    <th className="py-2 px-2 border-r border-black font-bold text-center">Item Discription</th>
                    <th className="py-2 px-1.5 border-r border-black font-bold text-center">Amount</th>
                    <th className="py-2 px-1.5 border-r border-black font-bold text-center">Payment</th>
                    <th className="py-2 px-1.5 font-bold text-center">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-medium text-black">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-semibold">
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
                        <td className="py-2 px-1 font-mono text-center font-bold border-r border-black align-middle text-[10px]">
                          {entry.date}
                        </td>

                        {/* Type */}
                        <td className="py-2 px-1 text-center font-bold border-r border-black uppercase align-middle text-[9.5px]">
                          {entry.type}
                        </td>

                        {/* Invoice # */}
                        <td className="py-2 px-1 text-center font-mono font-bold border-r border-black align-middle text-[10px]">
                          {entry.invoiceNo}
                        </td>

                        {/* Item Discription */}
                        <td className="py-2 px-2.5 border-r border-black align-middle text-left font-bold text-black text-[9.5px]">
                          <div className="whitespace-pre-line leading-relaxed">
                            {entry.itemDescription}
                          </div>
                        </td>

                        {/* Amount (Debit) */}
                        <td className="py-2 px-1.5 text-right font-mono font-bold text-black border-r border-black align-middle tabular-nums text-[10px]">
                          {entry.amount > 0 ? formatIndianCurrency(entry.amount, true) : ''}
                        </td>

                        {/* Payment (Credit / TDS / Payment) */}
                        <td className="py-2 px-1.5 text-right font-mono font-bold text-black border-r border-black align-middle tabular-nums text-[10px]">
                          {entry.payment > 0 ? formatIndianCurrency(entry.payment, true) : ''}
                        </td>

                        {/* Balance (Running Balance) */}
                        <td className="py-2 px-1.5 text-right font-mono font-black text-black align-middle tabular-nums text-[10px]">
                          {formatIndianCurrency(entry.runningBalance, true)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* 4. STATEMENT TOTALS ROW */}
                <tfoot>
                  <tr className="bg-slate-100 font-black border-t-2 border-black text-[10.5px]">
                    <td colSpan={4} className="py-2 px-2 text-right uppercase text-slate-900 border-r border-black tracking-wider font-extrabold">
                      STATEMENT TOTALS:
                    </td>
                    <td className="py-2 px-1.5 text-right font-mono text-slate-950 border-r border-black tabular-nums font-bold">
                      {formatIndianCurrency(totalDebit, true)}
                    </td>
                    <td className="py-2 px-1.5 text-right font-mono text-slate-950 border-r border-black tabular-nums font-bold">
                      {formatIndianCurrency(totalCredit, true)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-black text-[#0f2e6b] bg-[#dce6f1] tabular-nums">
                      {formatIndianCurrency(Math.abs(finalBalance), true)} {finalBalance >= 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5. Net Outstanding In Words Card */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-[10.5px]">
              <div>
                <span className="text-[9.5px] font-bold uppercase text-slate-500 block">
                  NET OUTSTANDING BALANCE IN WORDS:
                </span>
                <span className="font-bold text-slate-900 leading-snug">
                  {numberToIndianWords(Math.abs(finalBalance))} Only {finalBalance >= 0 ? '(Receivable)' : '(Settled)'}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9.5px] font-bold text-slate-500 uppercase block">TOTAL TDS INCLUDED:</span>
                <span className="font-mono font-bold text-amber-900">
                  {formatIndianCurrency(totalTdsDeducted, true)} (1%)
                </span>
              </div>
            </div>

            {/* 6. Bank Details & Authorized Signatory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-[10.5px]">
              {/* Left: Bank Details */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 uppercase text-[9.5px]">
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
                  <div className="text-slate-500 text-[10px] italic">Bank details not configured in Profile Settings</div>
                )}
              </div>

              {/* Right: Authorised Signatory (without top line) */}
              <div className="flex flex-col justify-between items-end text-right p-3 min-h-[95px]">
                <div className="text-slate-700 text-[10.5px]">
                  For <strong>{businessProfile.name || businessProfile.tradeName || 'AUTHORIZED FIRM'}</strong>
                </div>
                <div className="space-y-0.5 pt-8">
                  <div className="font-bold text-slate-900 text-[10px] uppercase tracking-wider">
                    AUTHORISED SIGNATORY
                  </div>
                  <div className="text-[9px] text-slate-400">Computer Generated Statement</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};



