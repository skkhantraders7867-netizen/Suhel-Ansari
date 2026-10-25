import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Printer, Download, Share2, Upload, Image as ImageIcon, Trash2, Check, Save,
  ZoomIn, ZoomOut, Layers, Maximize2, Minimize2, FileText, Sliders, Building2, Eye, EyeOff,
  Calendar, Filter, RefreshCw
} from 'lucide-react';
import { Party, Invoice, BusinessProfile, PaymentVoucher, DebitVoucher } from '../types';
import { GST_STATES } from '../data/mockData';
import { formatIndianCurrency, numberToIndianWords } from '../utils/gstCalculations';
import { printElementSafely, downloadElementAsPdf } from '../utils/pdfExport';

interface LedgerEntry {
  id: string;
  date: string;
  rawDate?: string;
  txTimestamp?: number;
  type: string;        // e.g. JOURNAL, RCPT, OB, PUR-BILL, PMT, DB-NT
  invoiceNo: string;   // e.g. 13(26-27) or INV-001 or PB-001
  itemDescription: string; // Item Description
  amount: number;      // Bill Amount (Debit for customer, Credit for supplier)
  payment: number;     // Payment or TDS (Credit for customer, Debit for supplier)
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
  debitVouchers?: DebitVoucher[];
  onUpdateParty?: (party: Party) => void;
  initialDateFilterEnabled?: boolean;
  initialFromDate?: string;
  initialToDate?: string;
}

type PageLayoutMode = 'AUTO_MULTI' | 'FIT_1_PAGE' | 'FIT_2_PAGES' | 'CUSTOM';
type DensityMode = 'COMPACT' | 'NORMAL' | 'COMFORTABLE';

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

function parseDateForSort(dateStr?: string): number {
  if (!dateStr) return 0;
  const str = dateStr.trim();
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day).getTime();
  }
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day).getTime();
  }
  const parsed = Date.parse(str);
  return isNaN(parsed) ? 0 : parsed;
}

function parseDateToMidnight(dateStr?: string): number {
  if (!dateStr) return 0;
  const str = dateStr.trim();
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day, 0, 0, 0, 0).getTime();
  }
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day, 0, 0, 0, 0).getTime();
  }
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
  }
  return 0;
}

function getTodayYmd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getFirstDayOfCurrentMonthYmd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function parseInvoiceOrVoucherSerial(invStr?: string): number {
  if (!invStr || invStr === '-') return 999999999;
  const leadingMatch = invStr.trim().match(/^(\d+)/);
  if (leadingMatch) {
    return parseInt(leadingMatch[1], 10);
  }
  const anyNumMatch = invStr.trim().match(/(\d+)/g);
  if (anyNumMatch && anyNumMatch.length > 0) {
    return parseInt(anyNumMatch[anyNumMatch.length - 1], 10);
  }
  return 999999999;
}

export const PartyLedgerPrintModal: React.FC<PartyLedgerPrintModalProps> = ({
  isOpen,
  onClose,
  party,
  invoices = [],
  businessProfile,
  paymentVouchers = [],
  debitVouchers = [],
  onUpdateParty,
  initialDateFilterEnabled = false,
  initialFromDate,
  initialToDate,
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

  // Date to Date Filtering State
  const [isDateFilterActive, setIsDateFilterActive] = useState<boolean>(initialDateFilterEnabled);
  const [fromDate, setFromDate] = useState<string>(initialFromDate || getFirstDayOfCurrentMonthYmd());
  const [toDate, setToDate] = useState<string>(initialToDate || getTodayYmd());

  // Layout and Page scaling controls (1-Page or Multi-Page custom scaling)
  const [pageMode, setPageMode] = useState<PageLayoutMode>('AUTO_MULTI');
  const [zoomScale, setZoomScale] = useState<number>(100); // 65% to 130%
  const [density, setDensity] = useState<DensityMode>('NORMAL');
  const [showAdvanceControls, setShowAdvanceControls] = useState<boolean>(false);

  // Bank Details Delete/Hide Toggle
  const [showBankDetails, setShowBankDetails] = useState<boolean>(true);

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
      setShowBankDetails(true);
      if (initialDateFilterEnabled !== undefined) {
        setIsDateFilterActive(initialDateFilterEnabled);
      }
      if (initialFromDate) setFromDate(initialFromDate);
      if (initialToDate) setToDate(initialToDate);
    }
  }, [businessProfile.logoUrl, party, isOpen, initialDateFilterEnabled, initialFromDate, initialToDate]);

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

  // Filter invoices for this party (including Purchase Bills and Purchase Estimates for suppliers)
  const partyInvoices = invoices.filter(inv => {
    const matchesParty = (
      (inv.partyId && party.id && inv.partyId === party.id) || 
      (inv.partyName && party.name && inv.partyName.trim().toLowerCase() === party.name.trim().toLowerCase())
    );
    if (!matchesParty) return false;
    // Quotations and Service Orders are not financial bills, strictly exclude from ledger
    if (inv.documentType === 'QUOTATION' || inv.documentType === 'SERVICE_ORDER') return false;
    // Always include Purchase Estimates and Purchase Bills
    if (inv.documentType === 'PURCHASE_ESTIMATE' || inv.documentType === 'PURCHASE_BILL') return true;
    // If party is supplier, include all supplier purchase bills and bills
    if (party.type === 'SUPPLIER') return true;
    return true;
  });

  // Filter payment vouchers (receipts)
  const partyVouchers = (paymentVouchers || []).filter(
    pv => (
      (pv.partyId && party.id && pv.partyId === party.id) || 
      (pv.partyName && party.name && pv.partyName.trim().toLowerCase() === party.name.trim().toLowerCase())
    )
  );

  // Filter debit vouchers (payments made to suppliers/vendors)
  const partyDebitVouchers = (debitVouchers || []).filter(
    dv => (
      (dv.partyId && party.id && dv.partyId === party.id) || 
      (dv.partyName && party.name && dv.partyName.trim().toLowerCase() === party.name.trim().toLowerCase())
    )
  );

  // Build Chronological Ledger Entries
  // 1. Collect all transaction entries (Invoices, Purchase Bills, Purchase Estimates, TDS, Payments, Vouchers)
  const allTransactionEntries: Omit<LedgerEntry, 'runningBalance'>[] = [];

  // Add all Invoices, Purchase Bills & Purchase Estimates
  partyInvoices.forEach((inv) => {
    const isPurchaseEstimate = inv.documentType === 'PURCHASE_ESTIMATE';
    const isPurchaseBill = inv.documentType === 'PURCHASE_BILL';
    const isPurchase = isPurchaseBill || isPurchaseEstimate || party.type === 'SUPPLIER';

    const itemDesc = (inv.items && inv.items.length > 0)
      ? `${isPurchaseEstimate ? 'PURCHASE ESTIMATE: ' : isPurchaseBill ? 'PURCHASE BILL: ' : isPurchase ? 'PURCHASE: ' : ''}${inv.items.map(item => `${item.name || item.description || 'Item'} (Qty: ${item.quantity} ${item.unit || 'PCS'})`).join(', ')}`
      : isPurchaseEstimate
        ? (inv.notes || 'PURCHASE ESTIMATE / INWARD ENTRY')
        : isPurchase
          ? (inv.notes || 'PURCHASE OF GOODS / SERVICES')
          : 'TAX INVOICE GOODS / SERVICES';

    // Calculate invoice/bill total amount safely with all possible fallbacks
    const invBillAmount = Number(
      inv.grandTotal ?? 
      (inv as any).total ?? 
      (inv as any).finalAmount ?? 
      (inv.taxableTotal ? (inv.taxableTotal + (inv.cgstTotal || 0) + (inv.sgstTotal || 0) + (inv.igstTotal || 0) + (inv.cessTotal || 0) + (inv.roundOff || 0)) : 0) ??
      (inv.items && inv.items.length > 0 ? inv.items.reduce((sum, it) => sum + (it.totalAmount || (it.quantity * it.rate)), 0) : 0)
    ) || 0;

    const txTime = parseDateToMidnight(inv.date);

    allTransactionEntries.push({
      id: `entry-inv-${inv.id}`,
      date: formatDateToDMY(inv.date),
      rawDate: inv.date,
      txTimestamp: txTime,
      type: isPurchaseEstimate ? 'PUR-EST' : isPurchase ? 'PUR-BILL' : 'JOURNAL',
      invoiceNo: inv.invoiceNumber,
      itemDescription: itemDesc,
      amount: invBillAmount,
      payment: 0,
      entryType: 'INVOICE',
    });

    // 2. If invoice has TDS, add separate TDS line
    if ((inv.tdsAmount || 0) > 0) {
      const tdsAmt = Number(inv.tdsAmount || 0);
      allTransactionEntries.push({
        id: `entry-tds-${inv.id}`,
        date: formatDateToDMY(inv.date),
        rawDate: inv.date,
        txTimestamp: txTime,
        type: isPurchase ? 'TDS' : 'RCPT',
        invoiceNo: inv.invoiceNumber,
        itemDescription: `TDS DEDUCTED @${inv.tdsRate || 0}% SEC ${inv.tdsSection || '194C'} (CHALLAN ADJUSTMENT)`,
        amount: 0,
        payment: tdsAmt,
        tdsAmount: tdsAmt,
        tdsRate: inv.tdsRate,
        tdsSection: inv.tdsSection,
        entryType: 'TDS',
      });
    }

    // 3. If invoice has recorded paidAmount that is NOT from a PaymentVoucher or DebitVoucher, include it
    const hasVoucherForInv = partyVouchers.some(pv => pv.invoiceId === inv.id) || partyDebitVouchers.some(dv => dv.billId === inv.id);
    if (!hasVoucherForInv && (inv.paidAmount || 0) > 0) {
      const paidAmt = Number(inv.paidAmount || 0);
      allTransactionEntries.push({
        id: `entry-pay-${inv.id}`,
        date: formatDateToDMY(inv.date),
        rawDate: inv.date,
        txTimestamp: txTime,
        type: isPurchase ? 'PMT' : 'RCPT',
        invoiceNo: inv.invoiceNumber,
        itemDescription: inv.paymentReference 
          ? `${isPurchase ? 'PAYMENT PAID TO SUPPLIER' : 'PAYMENT RECEIVED'} VIA ${inv.paymentMode?.toUpperCase() || 'BANK / UPI'} (REF: ${inv.paymentReference})`
          : `${isPurchase ? 'PAYMENT PAID TO SUPPLIER' : 'PAYMENT RECEIVED'} VIA ${inv.paymentMode?.toUpperCase() || 'BANK / UPI'}`,
        amount: 0,
        payment: paidAmt,
        entryType: 'PAYMENT',
      });
    }

    // 4. If purchase has return amount or debit note, include deductions
    if (isPurchase && (inv.purchaseReturnAmount || 0) > 0) {
      allTransactionEntries.push({
        id: `entry-ret-${inv.id}`,
        date: formatDateToDMY(inv.date),
        rawDate: inv.date,
        txTimestamp: txTime,
        type: 'DB-NT',
        invoiceNo: inv.invoiceNumber,
        itemDescription: `PURCHASE RETURN: GOODS RETURNED TO SUPPLIER${inv.purchaseReturnNotes ? ` (${inv.purchaseReturnNotes})` : ''}`,
        amount: 0,
        payment: Number(inv.purchaseReturnAmount || 0),
        entryType: 'PAYMENT',
      });
    }

    if (isPurchase && (inv.purchaseDebitAmount || 0) > 0) {
      allTransactionEntries.push({
        id: `entry-deb-${inv.id}`,
        date: formatDateToDMY(inv.date),
        rawDate: inv.date,
        txTimestamp: txTime,
        type: 'DB-NT',
        invoiceNo: inv.invoiceNumber,
        itemDescription: `DEBIT NOTE: RATE DIFFERENCE / SHORTAGE DEDUCTION${inv.purchaseDebitPercent ? ` (${inv.purchaseDebitPercent}%)` : ''}`,
        amount: 0,
        payment: Number(inv.purchaseDebitAmount || 0),
        entryType: 'PAYMENT',
      });
    }
  });

  // 5. Add all dedicated Payment Vouchers (Receipts from customer)
  partyVouchers.forEach((pv) => {
    allTransactionEntries.push({
      id: `entry-pv-${pv.id}`,
      date: formatDateToDMY(pv.date),
      rawDate: pv.date,
      txTimestamp: parseDateToMidnight(pv.date),
      type: 'RCPT',
      invoiceNo: pv.invoiceNumber || pv.voucherNumber || '-',
      itemDescription: `PAYMENT RECEIVED VIA ${pv.paymentMode.toUpperCase()} (REF: ${pv.referenceNumber || 'N/A'})${pv.remarks ? ` - ${pv.remarks}` : ''}`,
      amount: 0,
      payment: Number(pv.amount || 0),
      entryType: 'PAYMENT',
    });
  });

  // 6. Add all dedicated Debit Vouchers (Payments made to suppliers)
  partyDebitVouchers.forEach((dv) => {
    allTransactionEntries.push({
      id: `entry-dv-${dv.id}`,
      date: formatDateToDMY(dv.date),
      rawDate: dv.date,
      txTimestamp: parseDateToMidnight(dv.date),
      type: 'PMT',
      invoiceNo: dv.billNumber || dv.voucherNumber || '-',
      itemDescription: `PAYMENT PAID TO SUPPLIER VIA ${dv.paymentMode.toUpperCase()} (REF: ${dv.referenceNumber || 'N/A'})${dv.remarks ? ` - ${dv.remarks}` : ''}`,
      amount: 0,
      payment: Number(dv.amount || 0),
      entryType: 'PAYMENT',
    });
  });

  // Sort all transactions strictly in ascending date and serial number order
  allTransactionEntries.sort((a, b) => {
    const dateA = a.txTimestamp ?? parseDateForSort(a.date);
    const dateB = b.txTimestamp ?? parseDateForSort(b.date);
    if (dateA !== dateB) {
      return dateA - dateB;
    }

    const serialA = parseInvoiceOrVoucherSerial(a.invoiceNo);
    const serialB = parseInvoiceOrVoucherSerial(b.invoiceNo);
    if (serialA !== serialB) {
      return serialA - serialB;
    }

    // Invoice comes first, then its TDS deduction, then Payment
    const typePriority: Record<string, number> = {
      INVOICE: 1,
      TDS: 2,
      PAYMENT: 3,
    };
    const orderA = typePriority[a.entryType] || 4;
    const orderB = typePriority[b.entryType] || 4;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return (a.invoiceNo || '').localeCompare(b.invoiceNo || '');
  });

  // Date Filtering Calculations
  let openingEntry: Omit<LedgerEntry, 'runningBalance'>;
  let activeTransactionEntries: Omit<LedgerEntry, 'runningBalance'>[] = [];

  const fromTimestamp = isDateFilterActive && fromDate ? parseDateToMidnight(fromDate) : 0;
  const toTimestamp = isDateFilterActive && toDate ? (parseDateToMidnight(toDate) + 86399999) : Infinity;

  if (isDateFilterActive && fromDate) {
    // Calculate accurate Opening Balance as on fromDate by adding prior debits & subtracting prior credits
    const priorEntries = allTransactionEntries.filter(t => (t.txTimestamp || 0) < fromTimestamp);
    const priorDebits = priorEntries.reduce((sum, t) => sum + (t.amount || 0), 0);
    const priorCredits = priorEntries.reduce((sum, t) => sum + (t.payment || 0), 0);
    const periodOpeningBalance = effectiveOpeningBalance + priorDebits - priorCredits;

    openingEntry = {
      id: 'entry-opening-period',
      date: formatDateToDMY(fromDate),
      rawDate: fromDate,
      txTimestamp: fromTimestamp,
      type: 'OB',
      invoiceNo: '-',
      itemDescription: `OPENING BALANCE B/F (As on ${formatDateToDMY(fromDate)})`,
      amount: periodOpeningBalance > 0 ? periodOpeningBalance : 0,
      payment: periodOpeningBalance < 0 ? Math.abs(periodOpeningBalance) : 0,
      entryType: 'OPENING',
    };

    activeTransactionEntries = allTransactionEntries.filter(
      t => (t.txTimestamp || 0) >= fromTimestamp && (t.txTimestamp || 0) <= toTimestamp
    );
  } else {
    // Full statement mode
    openingEntry = {
      id: 'entry-opening',
      date: formatDateToDMY(openingDate || '2025-04-01') || '01-04-2025',
      type: 'OB',
      invoiceNo: '-',
      itemDescription: `OPENING BALANCE B/F (F.Y. ${financialYear})`,
      amount: effectiveOpeningBalance > 0 ? effectiveOpeningBalance : 0,
      payment: effectiveOpeningBalance < 0 ? Math.abs(effectiveOpeningBalance) : 0,
      entryType: 'OPENING',
    };

    activeTransactionEntries = allTransactionEntries;
  }

  // Combine opening balance with active transaction entries
  const rawEntries: Omit<LedgerEntry, 'runningBalance'>[] = [openingEntry, ...activeTransactionEntries];

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

  const rowCount = entries.length;

  // Auto-estimate pages based on mode and row count
  let estimatedPages = 1;
  if (pageMode === 'FIT_1_PAGE') {
    estimatedPages = 1;
  } else if (pageMode === 'FIT_2_PAGES') {
    estimatedPages = 2;
  } else {
    // AUTO_MULTI
    const effectiveRowsPerPage = density === 'COMPACT' ? 22 : density === 'COMFORTABLE' ? 12 : 16;
    estimatedPages = Math.max(1, Math.ceil((rowCount + 4) / effectiveRowsPerPage));
  }

  // Determine effective font and padding styles
  let effectiveFontSize = 'text-[10px]';
  let cellPadding = 'py-1.5 px-1.5';
  let tableHeaderSize = 'text-[10px]';

  if (pageMode === 'FIT_1_PAGE') {
    if (rowCount > 22) {
      effectiveFontSize = 'text-[7.5px]';
      cellPadding = 'py-0.5 px-1';
      tableHeaderSize = 'text-[8.5px]';
    } else if (rowCount > 14) {
      effectiveFontSize = 'text-[8.5px]';
      cellPadding = 'py-1 px-1';
      tableHeaderSize = 'text-[9px]';
    } else {
      effectiveFontSize = 'text-[9.5px]';
      cellPadding = 'py-1.5 px-1.5';
      tableHeaderSize = 'text-[10px]';
    }
  } else if (pageMode === 'FIT_2_PAGES') {
    effectiveFontSize = 'text-[9px]';
    cellPadding = 'py-1 px-1.5';
    tableHeaderSize = 'text-[9.5px]';
  } else {
    // AUTO_MULTI or CUSTOM
    if (density === 'COMPACT') {
      effectiveFontSize = 'text-[8.5px]';
      cellPadding = 'py-1 px-1';
      tableHeaderSize = 'text-[9px]';
    } else if (density === 'COMFORTABLE') {
      effectiveFontSize = 'text-[11px]';
      cellPadding = 'py-2.5 px-2';
      tableHeaderSize = 'text-[11px]';
    } else {
      effectiveFontSize = 'text-[9.5px]';
      cellPadding = 'py-1.5 px-1.5';
      tableHeaderSize = 'text-[10px]';
    }
  }

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
        scale: 2.2,
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
    const periodLine = isDateFilterActive && fromDate && toDate 
      ? `\n📅 *Period:* ${formatDateToDMY(fromDate)} to ${formatDateToDMY(toDate)}` 
      : '';

    const msg = `*STATEMENT OF ACCOUNT*
From: *${businessProfile.name || 'SR GROUP'}*
${party.type === 'SUPPLIER' ? 'Supplier' : 'Customer'}: *${party.name}*${periodLine}
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

          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xs">
              📜
            </span>
            <div>
              <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                <span>Party Ledger Statement</span>
                <span className="text-[11px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded font-mono">
                  {party.name}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  estimatedPages === 1 
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                }`}>
                  📄 {estimatedPages} {estimatedPages === 1 ? 'Page' : 'Pages'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                1-Page or Multi-Page (2+ Page) Ledger Printing and Custom Scaling
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Logo Upload Section Controls */}
            {logoUrl ? (
              <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-slate-200 hover:text-white hover:bg-slate-700 font-medium text-xs rounded-lg transition-colors cursor-pointer"
                  title="Change Logo for PDF"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" /> Change Logo
                </button>
                <button
                  onClick={handleRemoveLogo}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                  title="Remove Logo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs rounded-xl border border-slate-700 shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" /> Upload Logo
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print ({estimatedPages} Page{estimatedPages > 1 ? 's' : ''})
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" /> {isExporting ? 'Exporting...' : 'PDF'}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" /> WhatsApp
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 📅 DATE TO DATE LEDGER FILTER TOOLBAR */}
        <div className="bg-slate-850 border-b border-slate-700 px-5 py-2.5 text-white flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Ledger Date Range:</span>
            </span>

            {/* Toggle All Dates vs Date-to-Date */}
            <div className="inline-flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setIsDateFilterActive(false)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  !isDateFilterActive 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Full statement from start to today"
              >
                All Dates
              </button>

              <button
                type="button"
                onClick={() => setIsDateFilterActive(true)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isDateFilterActive 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Date to date statement"
              >
                <span>📅 Date to Date</span>
                <span className={`w-2 h-2 rounded-full ${isDateFilterActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              </button>
            </div>
          </div>

          {/* Date Pickers & Presets (Visible when Date-to-Date is active) */}
          {isDateFilterActive ? (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-200">
              {/* From Date */}
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10.5px] font-bold">FROM:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-slate-800 text-white text-xs px-2 py-0.5 rounded border border-slate-600 font-mono font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
                />
              </div>

              {/* To Date */}
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10.5px] font-bold">TO:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-slate-800 text-white text-xs px-2 py-0.5 rounded border border-slate-600 font-mono font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, '0');
                    const lastD = String(new Date(y, now.getMonth() + 1, 0).getDate()).padStart(2, '0');
                    setFromDate(`${y}-${m}-01`);
                    setToDate(`${y}-${m}-${lastD}`);
                  }}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[10.5px] font-medium rounded-md border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
                  title="Current month"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const y = prevMonth.getFullYear();
                    const m = String(prevMonth.getMonth() + 1).padStart(2, '0');
                    const lastD = String(new Date(y, prevMonth.getMonth() + 1, 0).getDate()).padStart(2, '0');
                    setFromDate(`${y}-${m}-01`);
                    setToDate(`${y}-${m}-${lastD}`);
                  }}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[10.5px] font-medium rounded-md border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
                  title="Last month"
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
                    setFromDate(`${fyStart}-04-01`);
                    setToDate(`${fyStart + 1}-03-31`);
                  }}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[10.5px] font-medium rounded-md border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
                  title="Financial year (1 Apr to 31 Mar)"
                >
                  Current FY
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    const y30 = d30.getFullYear();
                    const m30 = String(d30.getMonth() + 1).padStart(2, '0');
                    const day30 = String(d30.getDate()).padStart(2, '0');
                    const yNow = now.getFullYear();
                    const mNow = String(now.getMonth() + 1).padStart(2, '0');
                    const dayNow = String(now.getDate()).padStart(2, '0');
                    setFromDate(`${y30}-${m30}-${day30}`);
                    setToDate(`${yNow}-${mNow}-${dayNow}`);
                  }}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[10.5px] font-medium rounded-md border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
                  title="Last 30 days"
                >
                  Last 30 Days
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Showing: <strong>All bills &amp; vouchers from start to date</strong></span>
            </div>
          )}
        </div>

        {/* 🌟 USER PAGE SIZE & SCALING CONTROLS TOOLBAR */}
        <div className="bg-slate-800/95 border-b border-slate-700 px-5 py-2.5 text-white flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Left: Page Mode Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Layers className="w-3.5 h-3.5" /> Page Mode:
            </span>

            <div className="inline-flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setPageMode('AUTO_MULTI');
                  setZoomScale(100);
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  pageMode === 'AUTO_MULTI' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Clean multi-page printing across 2, 3 or more pages"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Auto Multi-Page</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPageMode('FIT_1_PAGE');
                  setZoomScale(100);
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  pageMode === 'FIT_1_PAGE' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Fit entire statement on 1 page"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Fit 1-Page</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPageMode('FIT_2_PAGES');
                  setZoomScale(95);
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  pageMode === 'FIT_2_PAGES' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Fit entire statement cleanly across 2 pages"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fit 2-Pages</span>
              </button>
            </div>
          </div>

          {/* Right: Zoom Scale % & Row Density Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Scale +/- Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="text-[11px] font-semibold text-slate-300">Scale:</span>
              <button
                type="button"
                onClick={() => {
                  setPageMode('CUSTOM');
                  setZoomScale(prev => Math.max(65, prev - 5));
                }}
                disabled={zoomScale <= 65}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 cursor-pointer"
                title="Zoom Out (-5%)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-bold text-xs text-amber-300 w-11 text-center">
                {zoomScale}%
              </span>
              <button
                type="button"
                onClick={() => {
                  setPageMode('CUSTOM');
                  setZoomScale(prev => Math.min(130, prev + 5));
                }}
                disabled={zoomScale >= 130}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 cursor-pointer"
                title="Zoom In (+5%)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {zoomScale !== 100 && (
                <button
                  type="button"
                  onClick={() => setZoomScale(100)}
                  className="text-[10px] text-blue-400 hover:underline ml-1 font-semibold cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Density Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="text-[11px] font-semibold text-slate-300">Density:</span>
              <select
                value={density}
                onChange={(e) => setDensity(e.target.value as DensityMode)}
                className="bg-slate-800 border-none text-white text-xs rounded px-1.5 py-0.5 focus:ring-0 font-medium cursor-pointer"
              >
                <option value="COMPACT">Compact</option>
                <option value="NORMAL">Normal</option>
                <option value="COMFORTABLE">Relaxed</option>
              </select>
            </div>

            {/* Bank Details Delete/Hide Toggle */}
            <button
              type="button"
              onClick={() => setShowBankDetails(!showBankDetails)}
              className={`p-1.5 rounded-lg border flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer ${
                !showBankDetails 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                  : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="Toggle Bank Details"
            >
              {showBankDetails ? <Building2 className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-400" />}
              <span>{showBankDetails ? 'Bank Info' : 'Bank Hidden'}</span>
            </button>

            {/* Advance Opening Settings Button */}
            <button
              type="button"
              onClick={() => setShowAdvanceControls(!showAdvanceControls)}
              className={`p-1.5 rounded-lg border flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer ${
                showAdvanceControls 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="Toggle Opening Balance & FY Controls"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Opening Balance</span>
            </button>
          </div>
        </div>

        {/* Opening Balance Toolbar & Save Option (Dropdown/Expandable) */}
        {showAdvanceControls && (
          <div className="bg-slate-850 border-b border-slate-700 px-5 py-2.5 text-white flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                <span>⚖️ Opening Balance Settings:</span>
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
                  className={`px-2.5 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                    balanceType === 'Dr' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Dr (Receivable)
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceType('Cr')}
                  className={`px-2.5 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
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
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer ${
                  isSavedOpening 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
                title="Save Opening Balance to Party & Database permanently"
              >
                {isSavedOpening ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> Save to Party
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Printable Statement Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center bg-slate-300/60">
          <div 
            ref={printRef}
            className={`printable-area ${pageMode !== 'FIT_1_PAGE' ? 'multi-page-doc' : ''} bg-white text-black shadow-2xl border border-slate-300 rounded-none w-full max-w-[840px] p-5 md:p-7 space-y-3 font-sans`}
            style={{ 
              boxSizing: 'border-box',
              zoom: zoomScale !== 100 ? `${zoomScale}%` : undefined,
              transformOrigin: 'top center'
            }}
          >
            {/* Embedded Print CSS for Dynamic Single or Multi-Page layout */}
            <style>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: ${pageMode === 'FIT_1_PAGE' ? '6mm 8mm' : '8mm 10mm'} !important;
                }
                html, body {
                  height: ${pageMode === 'FIT_1_PAGE' ? '100%' : 'auto'} !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  overflow: ${pageMode === 'FIT_1_PAGE' ? 'hidden' : 'visible'} !important;
                  background: #fff !important;
                }
                .printable-area {
                  box-shadow: none !important;
                  border: 1.5px solid #000 !important;
                  padding: ${pageMode === 'FIT_1_PAGE' ? '6px 10px' : '10px 14px'} !important;
                  margin: 0 auto !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  height: ${pageMode === 'FIT_1_PAGE' ? '98vh' : 'auto'} !important;
                  max-height: ${pageMode === 'FIT_1_PAGE' ? '98vh' : 'none'} !important;
                  overflow: ${pageMode === 'FIT_1_PAGE' ? 'hidden' : 'visible'} !important;
                  page-break-inside: ${pageMode === 'FIT_1_PAGE' ? 'avoid' : 'auto'} !important;
                  page-break-after: ${pageMode === 'FIT_1_PAGE' ? 'avoid' : 'auto'} !important;
                }
                table {
                  width: 100% !important;
                  page-break-inside: auto !important;
                }
                thead {
                  display: table-header-group !important;
                }
                tfoot {
                  display: table-row-group !important;
                }
                tr {
                  page-break-inside: avoid !important;
                  page-break-after: auto !important;
                }
                .avoid-page-break {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
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
                <div className="text-[9px] text-slate-500 font-semibold">
                  {party.type === 'SUPPLIER' ? 'Supplier / Vendor Ledger' : 'Customer / Party Ledger'}
                </div>
                {isDateFilterActive && fromDate && toDate ? (
                  <div className="text-[9.5px] font-bold text-indigo-950 bg-indigo-100/90 border border-indigo-200 px-2 py-0.5 rounded mt-1 inline-block">
                    PERIOD: {formatDateToDMY(fromDate)} TO {formatDateToDMY(toDate)}
                  </div>
                ) : (
                  <div className="text-[9.5px] font-mono font-bold text-slate-700 mt-0.5">
                    F.Y.: {financialYear}
                  </div>
                )}
                <div className="text-[9.5px] font-mono font-bold text-slate-800 mt-0.5">
                  Print Date: {currentDateFormatted}
                </div>
              </div>
            </div>

            {/* 2. Account / Party Details Card */}
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex flex-col md:flex-row justify-between gap-2.5 text-xs avoid-page-break">
              {/* Left: Party Details */}
              <div className="space-y-0.5 max-w-[65%]">
                <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider block">
                  {party.type === 'SUPPLIER' ? 'SUPPLIER / VENDOR DETAILS:' : 'ACCOUNT / PARTY DETAILS:'}
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
              <table className={`w-full text-left border-collapse table-fixed ${effectiveFontSize}`}>
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
                  <tr className={`bg-[#cad9e8] text-black font-bold text-center border-b-2 border-black ${tableHeaderSize}`}>
                    <th className="py-1.5 px-1 border-r border-black font-bold text-center">Date</th>
                    <th className="py-1.5 px-1 border-r border-black font-bold text-center">Type</th>
                    <th className="py-1.5 px-1 border-r border-black font-bold text-center">Invoice #</th>
                    <th className="py-1.5 px-2 border-r border-black font-bold text-center">Item Description</th>
                    <th className="py-1.5 px-1.5 border-r border-black font-bold text-center">
                      Amount
                    </th>
                    <th className="py-1.5 px-1.5 border-r border-black font-bold text-center">
                      Payment (dr)
                    </th>
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

                        {/* Amount (Debit for customer, Credit for supplier) */}
                        <td className={`${cellPadding} text-right font-mono font-bold text-black border-r border-black align-middle tabular-nums`}>
                          {(entry.entryType === 'INVOICE' || entry.amount > 0) ? formatIndianCurrency(entry.amount, true) : ''}
                        </td>

                        {/* Payment (Credit for customer, Debit for supplier) */}
                        <td className={`${cellPadding} text-right font-mono font-bold text-black border-r border-black align-middle tabular-nums`}>
                          {(entry.entryType === 'PAYMENT' || entry.entryType === 'TDS' || entry.payment > 0) ? formatIndianCurrency(entry.payment, true) : ''}
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
                      {isDateFilterActive && fromDate && toDate
                        ? `PERIOD TOTALS (${formatDateToDMY(fromDate)} TO ${formatDateToDMY(toDate)}):`
                        : 'STATEMENT TOTALS:'}
                    </td>
                    <td className="py-1.5 px-1.5 text-right font-mono text-slate-950 border-r border-black tabular-nums font-bold">
                      {formatIndianCurrency(totalDebit, true)}
                    </td>
                    <td className="py-1.5 px-1.5 text-right font-mono text-slate-950 border-r border-black tabular-nums font-bold">
                      {formatIndianCurrency(totalCredit, true)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-black text-[#0f2e6b] bg-[#dce6f1] tabular-nums">
                      {formatIndianCurrency(Math.abs(finalBalance), true)} {party.type === 'SUPPLIER' ? (finalBalance >= 0 ? 'Cr (Payable)' : 'Dr (Advance)') : (finalBalance >= 0 ? 'Dr' : 'Cr')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5. Net Outstanding In Words Card */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-1.5 text-[10px] avoid-page-break">
              <div>
                <span className="text-[9px] font-bold uppercase text-slate-500 block">
                  {isDateFilterActive && toDate
                    ? `CLOSING BALANCE AS ON ${formatDateToDMY(toDate)} IN WORDS:`
                    : 'NET OUTSTANDING BALANCE IN WORDS:'}
                </span>
                <span className="font-bold text-slate-900 leading-tight">
                  {numberToIndianWords(Math.abs(finalBalance))} Only {party.type === 'SUPPLIER' ? (finalBalance >= 0 ? '(Payable to Supplier)' : '(Advance Settled)') : (finalBalance >= 0 ? '(Receivable)' : '(Settled)')}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[10px] avoid-page-break">
              {/* Left: Bank Details */}
              {showBankDetails ? (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-0.5 relative group">
                  <button
                    type="button"
                    onClick={() => setShowBankDetails(false)}
                    className="no-print absolute top-1 right-1 text-slate-400 hover:text-rose-600 p-0.5 rounded text-[9px]"
                    title="Hide Bank Details"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
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
              ) : (
                <div className="border border-dashed border-slate-300 p-2 rounded-xl flex items-center justify-between no-print">
                  <span className="text-slate-400 text-[10px] italic">Bank details hidden</span>
                  <button
                    type="button"
                    onClick={() => setShowBankDetails(true)}
                    className="text-[10px] text-blue-600 hover:underline font-bold"
                  >
                    + Show Bank Details
                  </button>
                </div>
              )}

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
