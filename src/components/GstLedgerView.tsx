import React, { useState, useMemo } from 'react';
import { 
  FileCheck2, Calculator, Calendar, Filter, Plus, Edit2, Trash2, 
  CheckCircle2, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight, 
  FileSpreadsheet, Printer, Download, Search, RefreshCw, X, Check,
  Building2, Receipt, ShieldCheck, ChevronRight, CornerDownRight,
  TrendingUp, TrendingDown, DollarSign, Eye, ExternalLink, Layers, FileText,
  Copy, ArrowRight, ChevronDown
} from 'lucide-react';
import { 
  Invoice, BusinessProfile, GstFilingRecord, PurchaseBillReturnRecord, 
  GstFilingStatus, PurchaseReturnReceivedStatus, PurchaseReturnFilingStatus 
} from '../types';
import { formatIndianCurrency, downloadCSV } from '../utils/gstCalculations';

interface GstLedgerViewProps {
  invoices: Invoice[];
  businessProfile: BusinessProfile;
  gstFilingRecords: GstFilingRecord[];
  purchaseBillReturns: PurchaseBillReturnRecord[];
  onSaveGstFilingRecord: (record: GstFilingRecord) => void;
  onDeleteGstFilingRecord: (id: string) => void;
  onSavePurchaseBillReturn: (record: PurchaseBillReturnRecord) => void;
  onDeletePurchaseBillReturn: (id: string) => void;
  onViewInvoice?: (invoice: Invoice) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onDeleteInvoice?: (id: string) => void;
  onDuplicateInvoice?: (invoice: Invoice) => void;
  onAddNewInvoice?: () => void;
  onUpdateInvoice?: (invoice: Invoice) => void;
}

export const GstLedgerView: React.FC<GstLedgerViewProps> = ({
  invoices,
  businessProfile,
  gstFilingRecords,
  purchaseBillReturns,
  onSaveGstFilingRecord,
  onDeleteGstFilingRecord,
  onSavePurchaseBillReturn,
  onDeletePurchaseBillReturn,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onDuplicateInvoice,
  onAddNewInvoice,
  onUpdateInvoice,
}) => {
  // Navigation tabs within GST Ledger: default to INVOICES_LEDGER so created invoices are immediately visible!
  const [activeTab, setActiveTab] = useState<'INVOICES_LEDGER' | 'OVERVIEW' | 'FILING_STATUS' | 'PURCHASE_RETURNS'>('INVOICES_LEDGER');

  // Tracking Interval: Monthly vs Quarterly vs All
  const [trackingMode, setTrackingMode] = useState<'MONTHLY' | 'QUARTERLY' | 'ALL'>('ALL');
  
  // Selected Month (Default to current month YYYY-MM)
  const currentYearMonth = new Date().toISOString().substring(0, 7); // e.g. "2026-10"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);

  // Selected Financial Year & Quarter
  const [selectedFY, setSelectedFY] = useState<string>('2026-2027');
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q3');

  // Search & Filter in Invoices Ledger
  const [invoiceCategoryFilter, setInvoiceCategoryFilter] = useState<'ALL' | 'SALES' | 'PURCHASE' | 'B2B' | 'B2C'>('ALL');
  const [invoiceFilingStatusFilter, setInvoiceFilingStatusFilter] = useState<'ALL' | 'FILED' | 'DUE'>('ALL');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');

  // Search & Filter in Return Tables
  const [searchQuery, setSearchQuery] = useState('');
  const [returnReceivedFilter, setReturnReceivedFilter] = useState<'ALL' | 'RECEIVED' | 'NOT_RECEIVED'>('ALL');
  const [returnFilingFilter, setReturnFilingFilter] = useState<'ALL' | 'FILED' | 'PENDING'>('ALL');

  // Modal States
  const [isFilingModalOpen, setIsFilingModalOpen] = useState(false);
  const [editingFilingRecord, setEditingFilingRecord] = useState<GstFilingRecord | null>(null);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [editingReturnRecord, setEditingReturnRecord] = useState<PurchaseBillReturnRecord | null>(null);

  // Quick Modal for marking Invoice GST Filed / Due with ARN & date
  const [isInvoiceFilingModalOpen, setIsInvoiceFilingModalOpen] = useState(false);
  const [targetInvoiceForFiling, setTargetInvoiceForFiling] = useState<Invoice | null>(null);
  const [filingModalStatus, setFilingModalStatus] = useState<'FILED' | 'DUE'>('FILED');
  const [filingModalDate, setFilingModalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filingModalArn, setFilingModalArn] = useState<string>('');

  // Helper to reliably extract GST & taxable amounts from ANY created invoice document
  const getInvoiceTaxDetails = (inv: Invoice) => {
    const taxable = Number(inv.taxableTotal) || 
      inv.items?.reduce((s, it) => {
        const lineTotal = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
        const disc = it.discountPercent ? lineTotal * (Number(it.discountPercent) / 100) : 0;
        return s + (lineTotal - disc);
      }, 0) || 
      Number(inv.subTotal) || 0;
    
    let cgst = Number(inv.cgstTotal) || 0;
    let sgst = Number(inv.sgstTotal) || 0;
    let igst = Number(inv.igstTotal) || 0;

    if (cgst === 0 && sgst === 0 && igst === 0 && inv.items && inv.items.length > 0) {
      cgst = inv.items.reduce((s, it) => s + (Number(it.cgstAmount) || 0), 0);
      sgst = inv.items.reduce((s, it) => s + (Number(it.sgstAmount) || 0), 0);
      igst = inv.items.reduce((s, it) => s + (Number(it.igstAmount) || 0), 0);
    }
    
    const totalGst = Number(inv.taxTotal) || (cgst + sgst + igst);
    const grandTotal = Number(inv.grandTotal) || (taxable + totalGst);
    
    return { taxable, cgst, sgst, igst, totalGst, grandTotal };
  };

  // Filter Sales Invoices and Purchase Bills:
  // Sales includes TAX_INVOICE, SERVICE_ORDER, PROFORMA_INVOICE, DEBIT_NOTE, or any sales document
  const salesInvoices = useMemo(() => {
    return invoices.filter(i => {
      if (!i) return false;
      const t = i.documentType;
      // Quotations and purchase estimates are quotes/estimates, not final taxable bills
      if (t === 'QUOTATION' || t === 'PURCHASE_ESTIMATE' || t === 'PURCHASE_BILL') {
        return false;
      }
      return true;
    });
  }, [invoices]);

  const purchaseBills = useMemo(() => {
    return invoices.filter(i => i.documentType === 'PURCHASE_BILL');
  }, [invoices]);

  // Combined all GST invoices
  const allLedgerInvoices = useMemo(() => {
    return [...salesInvoices, ...purchaseBills];
  }, [salesInvoices, purchaseBills]);

  // Robust date parser: supports YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, ISO strings
  const parseDateParts = (dateStr?: string) => {
    if (!dateStr) return null;
    const clean = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const parts = clean.split('-');
      return { y: parseInt(parts[0], 10), m: parseInt(parts[1], 10) };
    }
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(clean)) {
      const parts = clean.split(/[\/\-]/);
      return { y: parseInt(parts[2], 10), m: parseInt(parts[1], 10) };
    }
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    }
    return null;
  };

  // Determine date boundary or filter based on trackingMode
  const isDateInSelectedPeriod = (dateStr?: string): boolean => {
    if (!dateStr) return true; // Fail-safe: don't exclude invoices with empty date
    if (trackingMode === 'ALL') return true;

    const parts = parseDateParts(dateStr);
    if (!parts) return true;

    if (trackingMode === 'MONTHLY') {
      const [selY, selM] = selectedMonth.split('-').map(Number);
      return parts.y === selY && parts.m === selM;
    }

    if (trackingMode === 'QUARTERLY') {
      const startYear = parseInt(selectedFY.split('-')[0], 10);
      const endYear = parseInt(selectedFY.split('-')[1], 10);
      const { y, m } = parts;

      if (selectedQuarter === 'Q1') {
        return y === startYear && (m >= 4 && m <= 6);
      } else if (selectedQuarter === 'Q2') {
        return y === startYear && (m >= 7 && m <= 9);
      } else if (selectedQuarter === 'Q3') {
        return y === startYear && (m >= 10 && m <= 12);
      } else if (selectedQuarter === 'Q4') {
        return y === endYear && (m >= 1 && m <= 3);
      }
    }
    return true;
  };

  // Period label string
  const currentPeriodLabel = useMemo(() => {
    if (trackingMode === 'ALL') return 'All Time (Complete GST History)';
    if (trackingMode === 'MONTHLY') {
      const [year, month] = selectedMonth.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) + ` (${selectedMonth})`;
    }
    const qLabels = {
      Q1: 'Q1: Apr - Jun',
      Q2: 'Q2: Jul - Sep',
      Q3: 'Q3: Oct - Dec',
      Q4: 'Q4: Jan - Mar',
    };
    return `FY ${selectedFY} • ${qLabels[selectedQuarter]}`;
  }, [trackingMode, selectedMonth, selectedFY, selectedQuarter]);

  const currentPeriodKey = useMemo(() => {
    if (trackingMode === 'MONTHLY') return selectedMonth;
    if (trackingMode === 'QUARTERLY') return `${selectedFY}-${selectedQuarter}`;
    return 'ALL';
  }, [trackingMode, selectedMonth, selectedFY, selectedQuarter]);

  // Period-filtered Sales Invoices & Purchases
  const periodSalesInvoices = useMemo(() => {
    return salesInvoices.filter(i => isDateInSelectedPeriod(i.date));
  }, [salesInvoices, trackingMode, selectedMonth, selectedFY, selectedQuarter]);

  const periodPurchaseBills = useMemo(() => {
    return purchaseBills.filter(i => isDateInSelectedPeriod(i.date));
  }, [purchaseBills, trackingMode, selectedMonth, selectedFY, selectedQuarter]);

  // Output Tax (Sales GST)
  const salesCgst = useMemo(() => periodSalesInvoices.reduce((s, i) => s + getInvoiceTaxDetails(i).cgst, 0), [periodSalesInvoices]);
  const salesSgst = useMemo(() => periodSalesInvoices.reduce((s, i) => s + getInvoiceTaxDetails(i).sgst, 0), [periodSalesInvoices]);
  const salesIgst = useMemo(() => periodSalesInvoices.reduce((s, i) => s + getInvoiceTaxDetails(i).igst, 0), [periodSalesInvoices]);
  const salesTaxable = useMemo(() => periodSalesInvoices.reduce((s, i) => s + getInvoiceTaxDetails(i).taxable, 0), [periodSalesInvoices]);
  const totalOutputGst = salesCgst + salesSgst + salesIgst;

  // Input Tax (Purchase GST / ITC)
  const purchaseCgst = useMemo(() => periodPurchaseBills.reduce((s, i) => s + getInvoiceTaxDetails(i).cgst, 0), [periodPurchaseBills]);
  const purchaseSgst = useMemo(() => periodPurchaseBills.reduce((s, i) => s + getInvoiceTaxDetails(i).sgst, 0), [periodPurchaseBills]);
  const purchaseIgst = useMemo(() => periodPurchaseBills.reduce((s, i) => s + getInvoiceTaxDetails(i).igst, 0), [periodPurchaseBills]);
  const purchaseTaxable = useMemo(() => periodPurchaseBills.reduce((s, i) => s + getInvoiceTaxDetails(i).taxable, 0), [periodPurchaseBills]);
  const totalInputGst = purchaseCgst + purchaseSgst + purchaseIgst;

  // Net GST Payable = Output GST - Input GST
  const netGstPayable = Math.max(0, totalOutputGst - totalInputGst);
  const excessItc = Math.max(0, totalInputGst - totalOutputGst);

  // Active Filing Record for the current period (if any)
  const currentPeriodFilingRecord = useMemo(() => {
    return gstFilingRecords.find(r => r.periodKey === currentPeriodKey);
  }, [gstFilingRecords, currentPeriodKey]);

  // Overall Totals for Filing Records
  const totalFiledOverall = useMemo(() => {
    return gstFilingRecords.reduce((s, r) => s + (r.gstFiledAmount || 0), 0);
  }, [gstFilingRecords]);

  const totalPendingOverall = useMemo(() => {
    return gstFilingRecords.reduce((s, r) => s + (r.gstPendingAmount || 0), 0);
  }, [gstFilingRecords]);

  // Period-filtered or overall Purchase Returns
  const filteredPurchaseReturns = useMemo(() => {
    return purchaseBillReturns.filter(ret => {
      // Period filter
      const matchesPeriod = isDateInSelectedPeriod(ret.billDate || ret.returnDate || '');
      // Text search
      const matchesSearch = 
        searchQuery === '' ||
        ret.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ret.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ret.partyGstin && ret.partyGstin.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ret.returnChallanNumber && ret.returnChallanNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ret.arnNumber && ret.arnNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      // Return Received Filter
      const matchesReceived = 
        returnReceivedFilter === 'ALL' || ret.returnReceivedStatus === returnReceivedFilter;
      // Return Filing Filter
      const matchesFiling = 
        returnFilingFilter === 'ALL' || ret.returnFilingStatus === returnFilingFilter;

      return (trackingMode === 'ALL' || matchesPeriod) && matchesSearch && matchesReceived && matchesFiling;
    });
  }, [purchaseBillReturns, trackingMode, selectedMonth, selectedFY, selectedQuarter, searchQuery, returnReceivedFilter, returnFilingFilter]);

  // Purchase Return metrics
  const totalReturnsCount = purchaseBillReturns.length;
  const returnsReceivedCount = purchaseBillReturns.filter(r => r.returnReceivedStatus === 'RECEIVED').length;
  const returnsNotReceivedCount = purchaseBillReturns.filter(r => r.returnReceivedStatus === 'NOT_RECEIVED').length;
  const returnsFiledCount = purchaseBillReturns.filter(r => r.returnFilingStatus === 'FILED').length;
  const returnsUnfiledCount = purchaseBillReturns.filter(r => r.returnFilingStatus === 'PENDING').length;

  const totalReturnTaxableValue = purchaseBillReturns.reduce((s, r) => s + (r.returnTaxableAmount || 0), 0);
  const totalReturnGstValue = purchaseBillReturns.reduce((s, r) => s + (r.returnGstAmount || 0), 0);

  // Handlers for Filing Status Form
  const handleOpenFilingModal = (record?: GstFilingRecord) => {
    if (record) {
      setEditingFilingRecord(record);
    } else {
      // Create new record default pre-filled with active period and net GST
      const initialTotal = currentPeriodFilingRecord 
        ? currentPeriodFilingRecord.totalGstDue 
        : (netGstPayable > 0 ? netGstPayable : totalOutputGst);

      setEditingFilingRecord({
        id: `gst-file-${Date.now()}`,
        periodType: trackingMode === 'QUARTERLY' ? 'QUARTERLY' : 'MONTHLY',
        periodKey: currentPeriodKey,
        periodLabel: currentPeriodLabel,
        returnType: 'GSTR-3B',
        totalGstDue: initialTotal,
        gstFiledAmount: initialTotal,
        gstPendingAmount: 0,
        filingStatus: 'FILED',
        filingDate: new Date().toISOString().substring(0, 10),
        arnNumber: '',
        challanNumber: '',
        notes: '',
        updatedAt: new Date().toISOString(),
      });
    }
    setIsFilingModalOpen(true);
  };

  const handleSaveFilingModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFilingRecord) return;
    onSaveGstFilingRecord(editingFilingRecord);
    setIsFilingModalOpen(false);
    setEditingFilingRecord(null);
  };

  // Handlers for Purchase Bill Return Form
  const handleOpenReturnModal = (record?: PurchaseBillReturnRecord) => {
    if (record) {
      setEditingReturnRecord(record);
    } else {
      setEditingReturnRecord({
        id: `pbr-${Date.now()}`,
        billNumber: '',
        billDate: new Date().toISOString().substring(0, 10),
        partyName: '',
        partyGstin: '',
        billAmount: 0,
        billGstAmount: 0,
        returnReceivedStatus: 'RECEIVED',
        returnDate: new Date().toISOString().substring(0, 10),
        returnChallanNumber: `DN-${Date.now().toString().slice(-4)}`,
        returnTaxableAmount: 0,
        returnGstAmount: 0,
        returnTotalAmount: 0,
        returnFilingStatus: 'PENDING',
        returnFilingDate: '',
        arnNumber: '',
        returnReason: 'Damage / Defective Material',
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setIsReturnModalOpen(true);
  };

  const handleSaveReturnModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReturnRecord) return;
    onSavePurchaseBillReturn(editingReturnRecord);
    setIsReturnModalOpen(false);
    setEditingReturnRecord(null);
  };

  // 1-Click Toggle for Return Received
  const handleQuickToggleReceived = (record: PurchaseBillReturnRecord) => {
    const nextStatus: PurchaseReturnReceivedStatus = 
      record.returnReceivedStatus === 'RECEIVED' ? 'NOT_RECEIVED' : 'RECEIVED';
    onSavePurchaseBillReturn({
      ...record,
      returnReceivedStatus: nextStatus,
      updatedAt: new Date().toISOString(),
    });
  };

  // 1-Click Toggle for Return Filing
  const handleQuickToggleFiled = (record: PurchaseBillReturnRecord) => {
    const nextStatus: PurchaseReturnFilingStatus = 
      record.returnFilingStatus === 'FILED' ? 'PENDING' : 'FILED';
    onSavePurchaseBillReturn({
      ...record,
      returnFilingStatus: nextStatus,
      returnFilingDate: nextStatus === 'FILED' && !record.returnFilingDate ? new Date().toISOString().substring(0, 10) : record.returnFilingDate,
      updatedAt: new Date().toISOString(),
    });
  };

  // Toggle for showing all invoices or period-filtered in Invoices Ledger
  const [showAllPeriodsInvoices, setShowAllPeriodsInvoices] = useState(true);

  // Filtered invoices for the Invoices Ledger tab
  const filteredInvoicesLedger = useMemo(() => {
    return invoices.filter(inv => {
      if (!inv) return false;

      // Period filter unless user toggled show all periods
      if (!showAllPeriodsInvoices && !isDateInSelectedPeriod(inv.date)) {
        return false;
      }

      // Category filter
      if (invoiceCategoryFilter === 'SALES') {
        if (inv.documentType === 'PURCHASE_BILL') return false;
      } else if (invoiceCategoryFilter === 'PURCHASE') {
        if (inv.documentType !== 'PURCHASE_BILL') return false;
      } else if (invoiceCategoryFilter === 'B2B') {
        if (!inv.partyGstin || inv.partyGstin.trim().length < 5) return false;
      } else if (invoiceCategoryFilter === 'B2C') {
        if (inv.partyGstin && inv.partyGstin.trim().length >= 5) return false;
      }

      // Search query filter (Invoice No, Party Name, GSTIN, Phone)
      if (invoiceSearchQuery.trim()) {
        const q = invoiceSearchQuery.toLowerCase().trim();
        const numMatch = inv.invoiceNumber?.toLowerCase().includes(q);
        const nameMatch = inv.partyName?.toLowerCase().includes(q) || inv.billingAddress?.name?.toLowerCase().includes(q);
        const gstinMatch = inv.partyGstin?.toLowerCase().includes(q);
        const phoneMatch = inv.partyPhone?.toLowerCase().includes(q);
        if (!numMatch && !nameMatch && !gstinMatch && !phoneMatch) return false;
      }

      // Filing status filter (ALL / FILED / DUE)
      if (invoiceFilingStatusFilter === 'FILED') {
        if (inv.gstFilingStatus !== 'FILED') return false;
      } else if (invoiceFilingStatusFilter === 'DUE') {
        if (inv.gstFilingStatus === 'FILED') return false;
      }

      return true;
    });
  }, [invoices, showAllPeriodsInvoices, isDateInSelectedPeriod, invoiceCategoryFilter, invoiceFilingStatusFilter, invoiceSearchQuery]);

  // Totals for filtered invoices in Invoices Ledger
  const invoicesLedgerTotals = useMemo(() => {
    let actualTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;
    let totalGrand = 0;

    for (const inv of filteredInvoicesLedger) {
      const details = getInvoiceTaxDetails(inv);
      actualTaxable += details.taxable;
      totalCgst += details.cgst;
      totalSgst += details.sgst;
      totalIgst += details.igst;
      totalTax += details.totalGst;
      totalGrand += details.grandTotal;
    }

    return { actualTaxable, totalCgst, totalSgst, totalIgst, totalTax, totalGrand };
  }, [filteredInvoicesLedger]);

  // Counts for Category Tabs
  const b2bCount = useMemo(() => invoices.filter(i => i.partyGstin && i.partyGstin.trim().length >= 5).length, [invoices]);
  const b2cCount = useMemo(() => invoices.filter(i => !i.partyGstin || i.partyGstin.trim().length < 5).length, [invoices]);

  // Counts & Tax Totals for GST Filing Status (Filed vs Due)
  const filedCount = useMemo(() => invoices.filter(i => i.gstFilingStatus === 'FILED').length, [invoices]);
  const dueCount = useMemo(() => invoices.filter(i => i.gstFilingStatus !== 'FILED').length, [invoices]);

  const filedGstTotal = useMemo(() => {
    return invoices
      .filter(i => i.gstFilingStatus === 'FILED')
      .reduce((sum, i) => sum + getInvoiceTaxDetails(i).totalGst, 0);
  }, [invoices]);

  const dueGstTotal = useMemo(() => {
    return invoices
      .filter(i => i.gstFilingStatus !== 'FILED')
      .reduce((sum, i) => sum + getInvoiceTaxDetails(i).totalGst, 0);
  }, [invoices]);

  // Handler to set invoice GST filing status directly or from modal
  const handleSetInvoiceFiling = (invoice: Invoice, status: 'FILED' | 'DUE', filingDate?: string, arn?: string) => {
    if (!onUpdateInvoice) return;
    const updated: Invoice = {
      ...invoice,
      gstFilingStatus: status,
      gstFilingDate: status === 'FILED' ? (filingDate || invoice.gstFilingDate || new Date().toISOString().split('T')[0]) : undefined,
      gstFilingArn: status === 'FILED' ? (arn !== undefined ? arn : (invoice.gstFilingArn || '')) : undefined,
      updatedAt: new Date().toISOString(),
    };
    onUpdateInvoice(updated);
  };

  // CSV Exporter for GST Invoices Ledger Table
  const handleExportInvoicesCsv = () => {
    const headers = [
      'Invoice No', 'Date', 'Due Date', 'Document Type', 'Party / Company Name', 
      'Party GSTIN', 'State / Place of Supply', 'Taxable Value (Actual Value)', 
      'CGST Amount', 'SGST Amount', 'IGST Amount', 'Total GST Tax Value', 
      'Invoice Total Value', 'Payment Status', 'GST Filing Status', 'Filing Date', 'Filing ARN'
    ];
    const rows = filteredInvoicesLedger.map(inv => {
      const tax = getInvoiceTaxDetails(inv);
      return [
        `"${inv.invoiceNumber}"`,
        inv.date,
        inv.dueDate || '',
        `"${inv.documentType}"`,
        `"${inv.partyName || ''}"`,
        `"${inv.partyGstin || ''}"`,
        `"${inv.placeOfSupply || inv.billingAddress?.state || ''}"`,
        tax.taxable.toFixed(2),
        tax.cgst.toFixed(2),
        tax.sgst.toFixed(2),
        tax.igst.toFixed(2),
        tax.totalGst.toFixed(2),
        tax.grandTotal.toFixed(2),
        inv.paymentStatus || 'UNPAID',
        inv.gstFilingStatus === 'FILED' ? 'FILED' : 'DUE',
        inv.gstFilingDate || '',
        `"${inv.gstFilingArn || ''}"`
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, `GST_Invoices_Ledger_${businessProfile.gstin || 'SR_GROUP'}.csv`);
  };

  // CSV Exporter for GST Ledger Returns
  const handleExportCsv = () => {
    const headers = [
      'Record Type', 'Period', 'Bill Number', 'Party Name', 'GSTIN', 
      'Return Received?', 'Return Filed?', 'Return Value', 'Return GST', 'Filing ARN'
    ];
    const rows = filteredPurchaseReturns.map(r => [
      'Purchase Return',
      currentPeriodLabel,
      r.billNumber,
      `"${r.partyName}"`,
      r.partyGstin || '',
      r.returnReceivedStatus === 'RECEIVED' ? 'YES (Received)' : 'NO (Pending)',
      r.returnFilingStatus === 'FILED' ? 'YES (Filed)' : 'NO (Pending)',
      r.returnTotalAmount,
      r.returnGstAmount,
      r.arnNumber || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, `GST_Ledger_${selectedMonth}_${businessProfile.gstin || 'SR_GROUP'}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Page 2 • GST Ledger & Return Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <FileCheck2 className="w-8 h-8 text-amber-400" />
              GST Ledger & Return Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Track Net GST Liability, Monthly & Quarterly returns, GST Filing Status (Filed vs Pending amounts), and Purchase Bill Returns with 1-click status updates.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenFilingModal()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Update GST Filing
            </button>
            <button
              onClick={() => handleOpenReturnModal()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-900/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
              Enter Purchase Bill Return
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              title="Print GST Ledger"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {/* Period Selector Bar (Monthly / Quarterly / All) */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tracking Mode Toggles */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-2xl border border-slate-700/80 w-fit">
            <button
              onClick={() => setTrackingMode('MONTHLY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                trackingMode === 'MONTHLY'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Monthly
            </button>
            <button
              onClick={() => setTrackingMode('QUARTERLY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                trackingMode === 'QUARTERLY'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Quarterly
            </button>
            <button
              onClick={() => setTrackingMode('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                trackingMode === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Sub-selectors for Month or Quarter */}
          <div className="flex items-center gap-2">
            {trackingMode === 'MONTHLY' && (
              <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-xs font-bold text-slate-300">Select Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-900 text-white font-bold text-xs px-2.5 py-1 rounded-lg border border-slate-600 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                />
              </div>
            )}

            {trackingMode === 'QUARTERLY' && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(e.target.value)}
                  className="bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="2026-2027">FY 2026-2027</option>
                  <option value="2025-2026">FY 2025-2026</option>
                  <option value="2024-2025">FY 2024-2025</option>
                </select>

                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => (
                    <button
                      key={q}
                      onClick={() => setSelectedQuarter(q)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                        selectedQuarter === q
                          ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="hidden sm:block text-xs font-semibold px-3 py-1.5 bg-blue-900/40 text-blue-200 border border-blue-500/30 rounded-xl">
              Selected Period: <strong className="text-white">{currentPeriodLabel}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (Feature 1: Total GST & Filing metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net GST / Liability */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              1. Total Net GST Liability
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {formatIndianCurrency(netGstPayable > 0 ? netGstPayable : totalOutputGst)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500 border-t border-slate-100 pt-2">
            <span>Sales GST: <strong className="text-slate-800">{formatIndianCurrency(totalOutputGst)}</strong></span>
            <span>Purchase ITC: <strong className="text-emerald-700">{formatIndianCurrency(totalInputGst)}</strong></span>
          </div>
          {excessItc > 0 && (
            <div className="mt-1 text-[11px] font-bold text-emerald-600">
              ✅ Excess ITC Credit: {formatIndianCurrency(excessItc)}
            </div>
          )}
        </div>

        {/* GST Filing Status: Filed vs Pending */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              2. GST Filing Status (Filed)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">
            {formatIndianCurrency(currentPeriodFilingRecord ? currentPeriodFilingRecord.gstFiledAmount : totalFiledOverall)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500 border-t border-slate-100 pt-2">
            <span>
              {currentPeriodFilingRecord 
                ? (currentPeriodFilingRecord.filingStatus === 'FILED' ? '✅ Filed' : '⏳ Partial / Pending')
                : 'Total Records Filed'}
            </span>
            <button
              onClick={() => handleOpenFilingModal(currentPeriodFilingRecord || undefined)}
              className="text-blue-600 hover:text-blue-800 font-bold text-[11px] underline cursor-pointer"
            >
              Update
            </button>
          </div>
        </div>

        {/* GST Filing Status: Pending Amount */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              3. GST Pending Amount
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">
            {formatIndianCurrency(currentPeriodFilingRecord ? currentPeriodFilingRecord.gstPendingAmount : totalPendingOverall)}
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>
              {currentPeriodFilingRecord?.gstPendingAmount === 0 
                ? '🎉 All Taxes Paid' 
                : 'Pending to Pay'}
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              (currentPeriodFilingRecord ? currentPeriodFilingRecord.gstPendingAmount : totalPendingOverall) > 0
                ? 'bg-rose-100 text-rose-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {(currentPeriodFilingRecord ? currentPeriodFilingRecord.gstPendingAmount : totalPendingOverall) > 0 ? 'DUE' : 'CLEAR'}
            </span>
          </div>
        </div>

        {/* Purchase Bill Return Summary */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              4. Purchase Bill Return
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <CornerDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalReturnsCount}</span>
            <span className="text-xs font-bold text-slate-500">Bill Returns</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-600 border-t border-slate-100 pt-2">
            <span className="text-emerald-700">
              Received: <strong>{returnsReceivedCount}</strong>
            </span>
            <span className="text-amber-700">
              Pending: <strong>{returnsNotReceivedCount}</strong>
            </span>
            <span className="text-blue-700">
              Filed: <strong>{returnsFiledCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('INVOICES_LEDGER')}
          className={`pb-3 px-4 text-xs font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'INVOICES_LEDGER'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>GST Invoices Ledger (All Invoices)</span>
          <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`pb-3 px-4 text-xs font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'OVERVIEW'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>GST Ledger Overview & Tax Math</span>
        </button>

        <button
          onClick={() => setActiveTab('FILING_STATUS')}
          className={`pb-3 px-4 text-xs font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'FILING_STATUS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>GST Filing Status (Filed / Pending)</span>
          {gstFilingRecords.length > 0 && (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
              {gstFilingRecords.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('PURCHASE_RETURNS')}
          className={`pb-3 px-4 text-xs font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'PURCHASE_RETURNS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CornerDownRight className="w-4 h-4" />
          <span>Purchase Bill Return (Received / Filing)</span>
          {purchaseBillReturns.length > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full font-bold">
              {purchaseBillReturns.length}
            </span>
          )}
        </button>
      </div>

      {/* --- TAB 0: GST INVOICES LEDGER (ALL CREATED & FUTURE INVOICES) --- */}
      {activeTab === 'INVOICES_LEDGER' && (
        <div className="space-y-6">
          {/* Summary KPI Cards for Invoices Ledger */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-black uppercase tracking-wider">Total Documents</span>
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{filteredInvoicesLedger.length}</span>
                <span className="text-xs font-bold text-slate-500">of {invoices.length} total</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-semibold border-t border-slate-100 pt-2 flex items-center justify-between">
                <span>Sales: <strong className="text-blue-700">{salesInvoices.length}</strong></span>
                <span>Purchases: <strong className="text-emerald-700">{purchaseBills.length}</strong></span>
                <span>B2B: <strong className="text-purple-700">{b2bCount}</strong></span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-black uppercase tracking-wider">1. Actual Taxable Value</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {formatIndianCurrency(invoicesLedgerTotals.actualTaxable)}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-semibold border-t border-slate-100 pt-2">
                Subtotal before GST taxes
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-black uppercase tracking-wider">2. Total Tax Value (GST)</span>
                <Calculator className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-blue-700">
                {formatIndianCurrency(invoicesLedgerTotals.totalTax)}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-semibold border-t border-slate-100 pt-2 flex items-center justify-between">
                <span>CGST: <strong className="text-slate-800">{formatIndianCurrency(invoicesLedgerTotals.totalCgst)}</strong></span>
                <span>SGST: <strong className="text-slate-800">{formatIndianCurrency(invoicesLedgerTotals.totalSgst)}</strong></span>
                {invoicesLedgerTotals.totalIgst > 0 && (
                  <span>IGST: <strong className="text-slate-800">{formatIndianCurrency(invoicesLedgerTotals.totalIgst)}</strong></span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-black uppercase tracking-wider">3. Grand Total (Net)</span>
                <Receipt className="w-4 h-4 text-purple-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {formatIndianCurrency(invoicesLedgerTotals.totalGrand)}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-semibold border-t border-slate-100 pt-2">
                Net value of all filtered bills
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-black uppercase tracking-wider">4. GST Filing (Filed / Due)</span>
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <span className="text-xl font-black text-emerald-700">{filedCount}</span>
                  <span className="text-[10px] font-bold text-emerald-800 ml-1 bg-emerald-100 px-1.5 py-0.5 rounded">Filed</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-amber-700">{dueCount}</span>
                  <span className="text-[10px] font-bold text-amber-800 ml-1 bg-amber-100 px-1.5 py-0.5 rounded">Due</span>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-semibold border-t border-slate-100 pt-2 flex items-center justify-between">
                <span className="text-emerald-700 font-bold">Tax: {formatIndianCurrency(filedGstTotal)}</span>
                <span className="text-amber-700 font-bold">Due: {formatIndianCurrency(dueGstTotal)}</span>
              </div>
            </div>
          </div>

          {/* Main Invoices Table Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header & Controls */}
            <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/70">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  GST Invoices Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  Showing Invoice No., Company Name, Actual Value, Tax Value, and GST Filing Status (Filed / Due) with edit option.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleExportInvoicesCsv}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
                {onAddNewInvoice && (
                  <button
                    onClick={onAddNewInvoice}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    + Create New Invoice
                  </button>
                )}
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 bg-slate-50/50 border-b border-slate-200 space-y-3">
              {/* Category Pills & Search */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  <button
                    onClick={() => setInvoiceCategoryFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      invoiceCategoryFilter === 'ALL'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    All Invoices ({invoices.length})
                  </button>
                  <button
                    onClick={() => setInvoiceCategoryFilter('SALES')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      invoiceCategoryFilter === 'SALES'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Sales Invoices ({salesInvoices.length})
                  </button>
                  <button
                    onClick={() => setInvoiceCategoryFilter('PURCHASE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      invoiceCategoryFilter === 'PURCHASE'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Purchase Bills ({purchaseBills.length})
                  </button>
                  <button
                    onClick={() => setInvoiceCategoryFilter('B2B')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      invoiceCategoryFilter === 'B2B'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    B2B Registered ({b2bCount})
                  </button>
                  <button
                    onClick={() => setInvoiceCategoryFilter('B2C')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      invoiceCategoryFilter === 'B2C'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    B2C Consumer ({b2cCount})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search invoice no, party, GSTIN..."
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                    />
                    {invoiceSearchQuery && (
                      <button
                        onClick={() => setInvoiceSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white px-3 py-2 rounded-xl border border-slate-200 cursor-pointer select-none whitespace-nowrap hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={showAllPeriodsInvoices}
                      onChange={(e) => setShowAllPeriodsInvoices(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span>All Periods</span>
                  </label>
                </div>
              </div>

              {/* Sub-bar: Filing Status (Filed / Due) Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1 mr-1">
                    <Filter className="w-3 h-3 text-slate-400" />
                    GST Filing:
                  </span>

                  <button
                    onClick={() => setInvoiceFilingStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      invoiceFilingStatusFilter === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>All Status</span>
                    <span className="text-[10px] bg-slate-700 text-white px-1.5 py-0.2 rounded-full font-bold">
                      {invoices.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setInvoiceFilingStatusFilter('FILED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      invoiceFilingStatusFilter === 'FILED'
                        ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ Filed</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      invoiceFilingStatusFilter === 'FILED' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'
                    }`}>
                      {filedCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setInvoiceFilingStatusFilter('DUE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      invoiceFilingStatusFilter === 'DUE'
                        ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/30'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>⏳ Due</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      invoiceFilingStatusFilter === 'DUE' ? 'bg-amber-800 text-white' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {dueCount}
                    </span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 font-semibold">
                  Showing <strong className="text-slate-900">{filteredInvoicesLedger.length}</strong> invoice{filteredInvoicesLedger.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Invoices Table */}
            {filteredInvoicesLedger.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No Invoices Found in GST Ledger</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {invoiceSearchQuery 
                    ? `No invoice matched "${invoiceSearchQuery}". Try clearing the search.`
                    : 'No invoices have been recorded matching this filter. Create an invoice to see it appear here.'}
                </p>
                {onAddNewInvoice && (
                  <button
                    onClick={onAddNewInvoice}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Invoice
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 uppercase font-extrabold text-[11px] border-b border-slate-200">
                      <th className="py-3.5 px-4 w-44">1. Invoice No.</th>
                      <th className="py-3.5 px-4 min-w-[220px]">2. Company Name</th>
                      <th className="py-3.5 px-4 text-right min-w-[240px]">3. Actual Value & Tax Value</th>
                      <th className="py-3.5 px-4 text-center min-w-[170px]">4. GST Filing (Filed / Due)</th>
                      <th className="py-3.5 px-4 text-center w-28">GST Rates</th>
                      <th className="py-3.5 px-4 text-center w-48">Actions (Edit / View)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredInvoicesLedger.map((inv) => {
                      const taxDetails = getInvoiceTaxDetails(inv);
                      const isPurchase = inv.documentType === 'PURCHASE_BILL';
                      const isQuotation = inv.documentType === 'QUOTATION';
                      const isB2B = Boolean(inv.partyGstin && inv.partyGstin.trim().length >= 5);

                      // Extract distinct tax rates from invoice items
                      const rates = Array.from(new Set(
                        (inv.items || [])
                          .map(it => Number(it.taxRate ?? it.gstRate ?? 18))
                          .filter(r => !isNaN(r))
                      ));

                      return (
                        <tr key={inv.id} className="hover:bg-blue-50/30 transition-colors">
                          {/* Column 1: Invoice No. */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-slate-900 text-sm">
                                  {inv.invoiceNumber}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1">
                                <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  isPurchase 
                                    ? 'bg-amber-100 text-amber-900' 
                                    : isQuotation
                                    ? 'bg-purple-100 text-purple-900'
                                    : 'bg-blue-100 text-blue-900'
                                }`}>
                                  {isPurchase ? 'PURCHASE' : (inv.documentType?.replace(/_/g, ' ') || 'TAX INVOICE')}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{inv.date}</span>
                                {inv.dueDate && (
                                  <span className="text-slate-400"> • Due: {inv.dueDate}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Company Name */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className="font-black text-slate-900 text-sm">
                                  {inv.partyName || inv.billingAddress?.name || 'Cash Customer'}
                                </span>
                              </div>

                              <div>
                                {isB2B ? (
                                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                    GSTIN: {inv.partyGstin}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    B2C • Unregistered / Consumer
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-slate-500">
                                {inv.placeOfSupply ? (
                                  <span>Place of Supply: <strong className="text-slate-700">{inv.placeOfSupply}</strong></span>
                                ) : inv.billingAddress?.state ? (
                                  <span>State: <strong className="text-slate-700">{inv.billingAddress.state}</strong></span>
                                ) : (
                                  <span className="text-slate-400">State: Same as Business</span>
                                )}
                                {inv.partyPhone && (
                                  <span className="text-slate-400"> • Ph: {inv.partyPhone}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Column 3: Invoice Actual Value and Tax Value */}
                          <td className="py-3.5 px-4 align-top text-right">
                            <div className="space-y-1">
                              {/* Actual / Taxable Value */}
                              <div className="flex items-center justify-end gap-2 text-xs">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">Actual (Taxable):</span>
                                <span className="font-black text-slate-900 text-sm">
                                  {formatIndianCurrency(taxDetails.taxable)}
                                </span>
                              </div>

                              {/* Tax Value with Breakdown */}
                              <div className="flex items-center justify-end gap-2 text-xs">
                                <span className="text-[11px] font-bold text-blue-600 uppercase">Tax Value:</span>
                                <span className="font-black text-blue-700 text-sm">
                                  {formatIndianCurrency(taxDetails.totalGst)}
                                </span>
                              </div>

                              {/* CGST / SGST or IGST breakdown */}
                              <div className="text-[10px] font-semibold text-slate-500">
                                {taxDetails.igst > 0 ? (
                                  <span>IGST: {formatIndianCurrency(taxDetails.igst)}</span>
                                ) : (
                                  <span>
                                    CGST: {formatIndianCurrency(taxDetails.cgst)} + SGST: {formatIndianCurrency(taxDetails.sgst)}
                                  </span>
                                )}
                              </div>

                              {/* Invoice Grand Total */}
                              <div className="pt-1 border-t border-slate-200/80 flex items-center justify-end gap-2">
                                <span className="text-[11px] font-extrabold text-slate-700">Total Value:</span>
                                <span className="text-base font-black text-slate-900">
                                  {formatIndianCurrency(taxDetails.grandTotal)}
                                </span>
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                  inv.paymentStatus === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : inv.paymentStatus === 'PARTIAL'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {inv.paymentStatus || 'UNPAID'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Column 4: GST Filing Status (Filed / Due) - Requested by User */}
                          <td className="py-3.5 px-4 align-top text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              {/* Interactive Filing Status Dropdown */}
                              <div className="relative inline-flex items-center">
                                <select
                                  value={inv.gstFilingStatus === 'FILED' ? 'FILED' : 'DUE'}
                                  onChange={(e) => {
                                    const val = e.target.value as 'FILED' | 'DUE';
                                    if (val === 'FILED') {
                                      handleSetInvoiceFiling(
                                        inv,
                                        'FILED',
                                        inv.gstFilingDate || new Date().toISOString().split('T')[0],
                                        inv.gstFilingArn || ''
                                      );
                                    } else {
                                      handleSetInvoiceFiling(inv, 'DUE');
                                    }
                                  }}
                                  className={`text-xs font-black px-3 py-1.5 rounded-xl border cursor-pointer appearance-none pr-7 transition-all shadow-2xs ${
                                    inv.gstFilingStatus === 'FILED'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 ring-1 ring-emerald-400/30'
                                      : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 ring-1 ring-amber-400/30'
                                  }`}
                                  title="Change GST Filing Status: Filed or Due"
                                >
                                  <option value="DUE">⏳ Due</option>
                                  <option value="FILED">✓ Filed</option>
                                </select>
                                <ChevronDown className={`w-3.5 h-3.5 absolute right-2 pointer-events-none ${
                                  inv.gstFilingStatus === 'FILED' ? 'text-emerald-700' : 'text-amber-800'
                                }`} />
                              </div>

                              {/* Filing details / ARN / Date */}
                              {inv.gstFilingStatus === 'FILED' ? (
                                <div className="text-[10px] text-center space-y-0.5">
                                  <div className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Filed: {inv.gstFilingDate || inv.date}</span>
                                  </div>
                                  {inv.gstFilingArn && (
                                    <div className="font-mono text-slate-500 font-medium">
                                      ARN: {inv.gstFilingArn}
                                    </div>
                                  )}
                                  <button
                                    onClick={() => {
                                      setTargetInvoiceForFiling(inv);
                                      setFilingModalStatus('FILED');
                                      setFilingModalDate(inv.gstFilingDate || new Date().toISOString().split('T')[0]);
                                      setFilingModalArn(inv.gstFilingArn || '');
                                      setIsInvoiceFilingModalOpen(true);
                                    }}
                                    className="text-blue-600 hover:underline font-bold text-[10px] cursor-pointer block mx-auto"
                                  >
                                    {inv.gstFilingArn ? 'Edit ARN' : '+ Add ARN'}
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[10px] text-center space-y-0.5">
                                  <span className="text-amber-700 font-bold block">
                                    Return Due
                                  </span>
                                  <button
                                    onClick={() => {
                                      setTargetInvoiceForFiling(inv);
                                      setFilingModalStatus('FILED');
                                      setFilingModalDate(new Date().toISOString().split('T')[0]);
                                      setFilingModalArn('');
                                      setIsInvoiceFilingModalOpen(true);
                                    }}
                                    className="text-blue-600 hover:underline font-bold text-[10px] cursor-pointer block mx-auto"
                                  >
                                    + Mark with ARN
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Column 5: GST Rates */}
                          <td className="py-3.5 px-4 align-top text-center">
                            <div className="space-y-1">
                              <span className="inline-block text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                                {rates.length > 0 ? rates.map(r => `${r}%`).join(', ') : '18%'}
                              </span>
                              <div className="text-[10px] text-slate-400 font-semibold">
                                {taxDetails.igst > 0 ? 'Inter-state' : 'Intra-state'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {inv.items?.length || 0} line item{(inv.items?.length || 0) !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </td>

                          {/* Column 6: Actions (Edit, View PDF, Duplicate, Delete) */}
                          <td className="py-3.5 px-4 align-top text-center">
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                              {/* Edit Option (Requested: "aur edit ka bhi option ho") */}
                              {onEditInvoice && (
                                <button
                                  onClick={() => onEditInvoice(inv)}
                                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs border border-blue-200"
                                  title="Edit Invoice"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-blue-700" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {/* View / Print PDF */}
                              {onViewInvoice && (
                                <button
                                  onClick={() => onViewInvoice(inv)}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-slate-200"
                                  title="View / Print PDF"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                                  <span>PDF</span>
                                </button>
                              )}

                              {/* Duplicate */}
                              {onDuplicateInvoice && (
                                <button
                                  onClick={() => onDuplicateInvoice(inv)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                  title="Duplicate Invoice"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete */}
                              {onDeleteInvoice && (
                                <button
                                  onClick={() => onDeleteInvoice(inv.id)}
                                  className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Invoice"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
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
      )}

      {/* --- TAB 1: OVERVIEW & TAX LEDGER --- */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* GST Calculation Ledger Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  Total GST Breakdown ({currentPeriodLabel})
                </h3>
                <p className="text-xs text-slate-500">
                  Outward Tax (Sales) vs Inward Tax Credit (Purchases)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenFilingModal(currentPeriodFilingRecord || undefined)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Update Filing Status for Period
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 uppercase font-extrabold text-[11px] border-b border-slate-200">
                    <th className="py-3.5 px-4">Tax Component</th>
                    <th className="py-3.5 px-4 text-right">Taxable Value</th>
                    <th className="py-3.5 px-4 text-right">CGST (Central)</th>
                    <th className="py-3.5 px-4 text-right">SGST (State)</th>
                    <th className="py-3.5 px-4 text-right">IGST (Interstate)</th>
                    <th className="py-3.5 px-4 text-right">Total GST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {/* Row 1: Output Tax (Sales) */}
                  <tr className="hover:bg-blue-50/40">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <ArrowUpRight className="w-4 h-4 text-blue-600" />
                        <div>
                          <span>Outward Tax (Sales Invoices)</span>
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Total Bills: {periodSalesInvoices.length}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                      {formatIndianCurrency(salesTaxable)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                      {formatIndianCurrency(salesCgst)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                      {formatIndianCurrency(salesSgst)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                      {formatIndianCurrency(salesIgst)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-blue-700">
                      {formatIndianCurrency(totalOutputGst)}
                    </td>
                  </tr>

                  {/* Row 2: Input Tax Credit (Purchases) */}
                  <tr className="hover:bg-emerald-50/40">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span>Inward Tax Credit (Purchase Bills - ITC)</span>
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Total Bills: {periodPurchaseBills.length}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                      {formatIndianCurrency(purchaseTaxable)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-800">
                      {formatIndianCurrency(purchaseCgst)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-800">
                      {formatIndianCurrency(purchaseSgst)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-800">
                      {formatIndianCurrency(purchaseIgst)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-700">
                      {formatIndianCurrency(totalInputGst)}
                    </td>
                  </tr>

                  {/* Row 3: Net Tax Payable */}
                  <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-300">
                    <td className="py-4 px-4">
                      <span className="text-xs uppercase font-black text-slate-800">
                        Net Payable GST Liability:
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-slate-600">
                      -
                    </td>
                    <td className="py-4 px-4 text-right text-slate-900">
                      {formatIndianCurrency(Math.max(0, salesCgst - purchaseCgst))}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-900">
                      {formatIndianCurrency(Math.max(0, salesSgst - purchaseSgst))}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-900">
                      {formatIndianCurrency(Math.max(0, salesIgst - purchaseIgst))}
                    </td>
                    <td className="py-4 px-4 text-right text-sm font-black text-blue-900">
                      {formatIndianCurrency(netGstPayable)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Current Filing Status Snapshot Card */}
            <div className="p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-slate-700">
                      {currentPeriodLabel} GST Filing Status:
                    </span>
                    {currentPeriodFilingRecord ? (
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        currentPeriodFilingRecord.filingStatus === 'FILED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentPeriodFilingRecord.filingStatus === 'PARTIALLY_FILED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {currentPeriodFilingRecord.filingStatus === 'FILED'
                          ? '✅ FILED'
                          : currentPeriodFilingRecord.filingStatus === 'PARTIALLY_FILED'
                          ? '⚠️ PARTIALLY FILED'
                          : '⏳ PENDING'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        No Record Found
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-4 pt-1">
                    <span>
                      Filed Amount: <strong className="text-emerald-700 font-black">
                        {formatIndianCurrency(currentPeriodFilingRecord ? currentPeriodFilingRecord.gstFiledAmount : 0)}
                      </strong>
                    </span>
                    <span>
                      Pending Amount: <strong className="text-rose-700 font-black">
                        {formatIndianCurrency(currentPeriodFilingRecord ? currentPeriodFilingRecord.gstPendingAmount : netGstPayable)}
                      </strong>
                    </span>
                    {currentPeriodFilingRecord?.filingDate && (
                      <span>Date: <strong>{currentPeriodFilingRecord.filingDate}</strong></span>
                    )}
                    {currentPeriodFilingRecord?.arnNumber && (
                      <span>ARN: <strong className="font-mono text-slate-800">{currentPeriodFilingRecord.arnNumber}</strong></span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenFilingModal(currentPeriodFilingRecord || undefined)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap self-start sm:self-center"
                >
                  {currentPeriodFilingRecord ? 'Edit Filing Status' : '+ Enter Filing Status'}
                </button>
              </div>
            </div>

            {/* Quick Link to GST Invoices Ledger */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-black text-xs text-blue-950">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>GST Invoices in this Period ({periodSalesInvoices.length + periodPurchaseBills.length} Invoices)</span>
                </div>
                <p className="text-[11px] text-blue-800/80">
                  View, edit, and manage all bills with Invoice No., Company Name, Actual Value & Tax Value.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('INVOICES_LEDGER')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap self-start sm:self-center"
              >
                <span>Open Invoices Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: GST FILING STATUS (FEATURE 3) --- */}
      {activeTab === 'FILING_STATUS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  GST Filing Status Management
                </h3>
                <p className="text-xs text-slate-500">
                  Track how much GST is filed and how much is pending manually. All records are saved securely.
                </p>
              </div>

              <button
                onClick={() => handleOpenFilingModal()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Add Filing Status Record
              </button>
            </div>

            {/* List of GST Filing Records */}
            {gstFilingRecords.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No GST Filing Records Added Yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click the button above to manually record your monthly or quarterly GST filing status (Filed Amount, Pending Amount, ARN).
                </p>
                <button
                  onClick={() => handleOpenFilingModal()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add First Filing Record
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 uppercase font-extrabold text-[11px] border-b border-slate-200">
                      <th className="py-3.5 px-4">Period</th>
                      <th className="py-3.5 px-4">Return Type</th>
                      <th className="py-3.5 px-4 text-right">Total Due GST</th>
                      <th className="py-3.5 px-4 text-right">Filed GST</th>
                      <th className="py-3.5 px-4 text-right">Pending GST</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4">ARN / Filing Info</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {gstFilingRecords.map((record) => {
                      return (
                        <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-black text-slate-900 block">{record.periodLabel}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{record.periodKey}</span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-blue-700">
                            {record.returnType}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-900">
                            {formatIndianCurrency(record.totalGstDue)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-emerald-600">
                            {formatIndianCurrency(record.gstFiledAmount)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-rose-600">
                            {formatIndianCurrency(record.gstPendingAmount)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full ${
                              record.filingStatus === 'FILED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : record.filingStatus === 'PARTIALLY_FILED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {record.filingStatus === 'FILED'
                                ? '✅ FILED'
                                : record.filingStatus === 'PARTIALLY_FILED'
                                ? '⚠️ PARTIALLY FILED'
                                : '⏳ PENDING'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {record.filingDate && (
                              <div className="text-slate-700 font-semibold">{record.filingDate}</div>
                            )}
                            {record.arnNumber ? (
                              <div className="text-[10px] font-mono text-slate-500">ARN: {record.arnNumber}</div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic">No ARN</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenFilingModal(record)}
                                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                                title="Edit Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteGstFilingRecord(record.id)}
                                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* --- TAB 3: PURCHASE BILL RETURN (FEATURE 4) --- */}
      {activeTab === 'PURCHASE_RETURNS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <CornerDownRight className="w-5 h-5 text-amber-600" />
                  Purchase Bill Return Management
                </h3>
                <p className="text-xs text-slate-500">
                  Track whether Purchase Bill returns have been received and whether returns have been filed on the GST portal.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV Export
                </button>
                <button
                  onClick={() => handleOpenReturnModal()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  + Add Purchase Return
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by Bill No, Supplier Name, GSTIN or ARN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Return Received Filter */}
                <select
                  value={returnReceivedFilter}
                  onChange={(e) => setReturnReceivedFilter(e.target.value as any)}
                  className="bg-white text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Return Received: All</option>
                  <option value="RECEIVED">✅ Received</option>
                  <option value="NOT_RECEIVED">⏳ Pending</option>
                </select>

                {/* Return Filing Filter */}
                <select
                  value={returnFilingFilter}
                  onChange={(e) => setReturnFilingFilter(e.target.value as any)}
                  className="bg-white text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Filing Status: All</option>
                  <option value="FILED">✅ Filed</option>
                  <option value="PENDING">❌ Pending</option>
                </select>
              </div>
            </div>

            {/* Table of Purchase Returns */}
            {filteredPurchaseReturns.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <CornerDownRight className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No Purchase Bill Return Records Found</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click the button below to record whether purchase bill returns have arrived and whether they are filed on the portal.
                </p>
                <button
                  onClick={() => handleOpenReturnModal()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Add Purchase Bill Return
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 uppercase font-extrabold text-[11px] border-b border-slate-200">
                      <th className="py-3.5 px-4">Purchase Bill Info</th>
                      <th className="py-3.5 px-4">Supplier / Party</th>
                      <th className="py-3.5 px-4 text-right">Bill Total / GST</th>
                      <th className="py-3.5 px-4 text-right">Return Value / GST</th>
                      <th className="py-3.5 px-4 text-center">1. Return Received?</th>
                      <th className="py-3.5 px-4 text-center">2. Return Filed?</th>
                      <th className="py-3.5 px-4">Challan / ARN</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredPurchaseReturns.map((ret) => {
                      const isReceived = ret.returnReceivedStatus === 'RECEIVED';
                      const isFiled = ret.returnFilingStatus === 'FILED';

                      return (
                        <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-black text-slate-900 block font-mono">
                              {ret.billNumber || 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Date: {ret.billDate || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{ret.partyName}</span>
                            {ret.partyGstin && (
                              <span className="text-[10px] font-mono text-slate-500 font-semibold">
                                {ret.partyGstin}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-bold text-slate-800">{formatIndianCurrency(ret.billAmount)}</div>
                            <div className="text-[10px] text-slate-400">GST: {formatIndianCurrency(ret.billGstAmount)}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-black text-amber-700">{formatIndianCurrency(ret.returnTotalAmount)}</div>
                            <div className="text-[10px] text-slate-500">GST: {formatIndianCurrency(ret.returnGstAmount)}</div>
                          </td>

                          {/* Feature 4a: Return Received Status with 1-click toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleQuickToggleReceived(ret)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all cursor-pointer border ${
                                isReceived
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                  : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                              }`}
                              title="Click to toggle received status"
                            >
                              {isReceived ? '✅ Received' : '⏳ Pending'}
                            </button>
                            <span className="block text-[9px] text-slate-400 mt-0.5">Click to toggle</span>
                          </td>

                          {/* Feature 4b: Return Filed Status with 1-click toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleQuickToggleFiled(ret)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all cursor-pointer border ${
                                isFiled
                                  ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                                  : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                              }`}
                              title="Click to toggle filing status"
                            >
                              {isFiled ? '✅ Filed' : '❌ Pending'}
                            </button>
                            <span className="block text-[9px] text-slate-400 mt-0.5">Click to toggle</span>
                          </td>

                          <td className="py-3.5 px-4">
                            {ret.returnChallanNumber && (
                              <div className="font-mono text-slate-800 text-[11px] font-bold">
                                Ch: {ret.returnChallanNumber}
                              </div>
                            )}
                            {ret.arnNumber && (
                              <div className="font-mono text-slate-500 text-[10px]">
                                ARN: {ret.arnNumber}
                              </div>
                            )}
                            {ret.returnReason && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                {ret.returnReason}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenReturnModal(ret)}
                                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                                title="Edit Return Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeletePurchaseBillReturn(ret.id)}
                                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Delete Return Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* --- MODAL 1: GST FILING STATUS UPDATE MODAL --- */}
      {isFilingModalOpen && editingFilingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Update GST Filing Status
                </h3>
                <p className="text-xs text-slate-300">
                  Record GST filed amount, pending balance, and filing reference
                </p>
              </div>
              <button
                onClick={() => setIsFilingModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFilingModalSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Period Label */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Period Label
                  </label>
                  <input
                    type="text"
                    required
                    value={editingFilingRecord.periodLabel}
                    onChange={(e) => setEditingFilingRecord({ ...editingFilingRecord, periodLabel: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Return Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Return Type
                  </label>
                  <select
                    value={editingFilingRecord.returnType}
                    onChange={(e) => setEditingFilingRecord({ ...editingFilingRecord, returnType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  >
                    <option value="GSTR-3B">GSTR-3B (Monthly / Quarterly Tax Payment)</option>
                    <option value="GSTR-1">GSTR-1 (Outward Sales Return)</option>
                    <option value="CMP-08">CMP-08 (Composition Challan)</option>
                    <option value="ALL_IN_ONE">All-in-One GST Returns</option>
                  </select>
                </div>

                {/* Total GST Due */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Total GST Due Amount ₹
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingFilingRecord.totalGstDue}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const pending = Math.max(0, val - editingFilingRecord.gstFiledAmount);
                      setEditingFilingRecord({ 
                        ...editingFilingRecord, 
                        totalGstDue: val,
                        gstPendingAmount: pending,
                        filingStatus: pending === 0 ? 'FILED' : (editingFilingRecord.gstFiledAmount > 0 ? 'PARTIALLY_FILED' : 'PENDING')
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* GST Filed Amount */}
                <div>
                  <label className="block text-xs font-black text-emerald-700 mb-1">
                    Filed GST Amount ₹
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingFilingRecord.gstFiledAmount}
                    onChange={(e) => {
                      const filedVal = parseFloat(e.target.value) || 0;
                      const pending = Math.max(0, editingFilingRecord.totalGstDue - filedVal);
                      setEditingFilingRecord({ 
                        ...editingFilingRecord, 
                        gstFiledAmount: filedVal,
                        gstPendingAmount: pending,
                        filingStatus: pending === 0 ? 'FILED' : (filedVal > 0 ? 'PARTIALLY_FILED' : 'PENDING')
                      });
                    }}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-black focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* GST Pending Amount */}
                <div>
                  <label className="block text-xs font-black text-rose-700 mb-1">
                    Pending GST Amount ₹
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingFilingRecord.gstPendingAmount}
                    onChange={(e) => {
                      const pendVal = parseFloat(e.target.value) || 0;
                      setEditingFilingRecord({ 
                        ...editingFilingRecord, 
                        gstPendingAmount: pendVal,
                        filingStatus: pendVal === 0 ? 'FILED' : (editingFilingRecord.gstFiledAmount > 0 ? 'PARTIALLY_FILED' : 'PENDING')
                      });
                    }}
                    className="w-full px-3 py-2 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs font-black focus:outline-hidden focus:border-rose-500"
                  />
                </div>

                {/* Filing Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Filing Status
                  </label>
                  <select
                    value={editingFilingRecord.filingStatus}
                    onChange={(e) => setEditingFilingRecord({ ...editingFilingRecord, filingStatus: e.target.value as GstFilingStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  >
                    <option value="FILED">✅ FILED</option>
                    <option value="PARTIALLY_FILED">⚠️ PARTIALLY FILED</option>
                    <option value="PENDING">⏳ PENDING</option>
                  </select>
                </div>

                {/* Filing Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Filing Date
                  </label>
                  <input
                    type="date"
                    value={editingFilingRecord.filingDate || ''}
                    onChange={(e) => setEditingFilingRecord({ ...editingFilingRecord, filingDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* ARN / Challan Reference */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ARN / Challan No. (Reference No.)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AA2710260012345"
                    value={editingFilingRecord.arnNumber || ''}
                    onChange={(e) => setEditingFilingRecord({ ...editingFilingRecord, arnNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="CA / Tax Consultant notes or payment reference..."
                  value={editingFilingRecord.notes || ''}
                  onChange={(e) => setEditingFilingRecord({ ...editingFilingRecord, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFilingModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: PURCHASE BILL RETURN MODAL --- */}
      {isReturnModalOpen && editingReturnRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-amber-950 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <CornerDownRight className="w-5 h-5 text-amber-400" />
                  Enter Purchase Bill Return Details
                </h3>
                <p className="text-xs text-slate-300">
                  Track return receipt status and GST portal filing status
                </p>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReturnModalSubmit} className="p-6 space-y-4">
              {/* Optional: Pick from existing purchase bills */}
              {purchaseBills.length > 0 && (
                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 space-y-1">
                  <label className="block text-[11px] font-black uppercase text-amber-900">
                    💡 Auto-fill from Existing Purchase Bill (Optional)
                  </label>
                  <select
                    onChange={(e) => {
                      const selected = purchaseBills.find(b => b.id === e.target.value);
                      if (selected) {
                        setEditingReturnRecord({
                          ...editingReturnRecord,
                          billNumber: selected.invoiceNumber,
                          billDate: selected.date,
                          partyName: selected.partyName,
                          partyGstin: selected.partyGstin || '',
                          partyId: selected.partyId,
                          billAmount: selected.grandTotal,
                          billGstAmount: (selected.cgstTotal || 0) + (selected.sgstTotal || 0) + (selected.igstTotal || 0),
                        });
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold focus:outline-hidden cursor-pointer"
                  >
                    <option value="">-- Select Purchase Bill --</option>
                    {purchaseBills.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.invoiceNumber} • {b.partyName} (₹{b.grandTotal})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bill Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Purchase Bill Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PB-2026-089"
                    value={editingReturnRecord.billNumber}
                    onChange={(e) => setEditingReturnRecord({ ...editingReturnRecord, billNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Bill Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bill Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editingReturnRecord.billDate}
                    onChange={(e) => setEditingReturnRecord({ ...editingReturnRecord, billDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Supplier Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UltraTech Traders"
                    value={editingReturnRecord.partyName}
                    onChange={(e) => setEditingReturnRecord({ ...editingReturnRecord, partyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Supplier GSTIN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supplier GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="27AAAAA0000A1Z5"
                    value={editingReturnRecord.partyGstin || ''}
                    onChange={(e) => setEditingReturnRecord({ ...editingReturnRecord, partyGstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Original Bill Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Original Bill Total ₹
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingReturnRecord.billAmount}
                    onChange={(e) => setEditingReturnRecord({ ...editingReturnRecord, billAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Original GST Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Original Bill GST Amount ₹
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingReturnRecord.billGstAmount}
                    onChange={(e) => setEditingReturnRecord({ ...editingReturnRecord, billGstAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* High Visibility Status Radios: 1. Return Received or Pending? */}
              <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-300 space-y-2">
                <label className="block text-xs font-black text-slate-900">
                  1. Purchase Bill Return Received? *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                    editingReturnRecord.returnReceivedStatus === 'RECEIVED'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="returnReceived"
                      checked={editingReturnRecord.returnReceivedStatus === 'RECEIVED'}
                      onChange={() => setEditingReturnRecord({ ...editingReturnRecord, returnReceivedStatus: 'RECEIVED' })}
                      className="sr-only"
                    />
                    <span>✅ Yes, Return Received</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                    editingReturnRecord.returnReceivedStatus === 'NOT_RECEIVED'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="returnReceived"
                      checked={editingReturnRecord.returnReceivedStatus === 'NOT_RECEIVED'}
                      onChange={() => setEditingReturnRecord({ ...editingReturnRecord, returnReceivedStatus: 'NOT_RECEIVED' })}
                      className="sr-only"
                    />
                    <span>⏳ Not Received (Pending)</span>
                  </label>
                </div>
              </div>

              {/* High Visibility Status Radios: 2. Return Filed on GST Portal? */}
              <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-300 space-y-2">
                <label className="block text-xs font-black text-slate-900">
                  2. Is this Return Filed on GST Portal? *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                    editingReturnRecord.returnFilingStatus === 'FILED'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="returnFiling"
                      checked={editingReturnRecord.returnFilingStatus === 'FILED'}
                      onChange={() => setEditingReturnRecord({ 
                        ...editingReturnRecord, 
                        returnFilingStatus: 'FILED',
                        returnFilingDate: editingReturnRecord.returnFilingDate || new Date().toISOString().substring(0, 10)
                      })}
                      className="sr-only"
                    />
                    <span>✅ Yes, Filed</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                    editingReturnRecord.returnFilingStatus === 'PENDING'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="returnFiling"
                      checked={editingReturnRecord.returnFilingStatus === 'PENDING'}
                      onChange={() => setEditingReturnRecord({ ...editingReturnRecord, returnFilingStatus: 'PENDING' })}
                      className="sr-only"
                    />
                    <span>❌ Filing Pending</span>
                  </label>
                </div>
              </div>

              {/* Return Specific Values */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Total Return Value ₹ *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingReturnRecord.returnTotalAmount}
                    onChange={(e) => setEditingReturnRecord({ ...editingReturnRecord, returnTotalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-amber-900 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Return GST Amount ₹
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingReturnRecord.returnGstAmount}
                    onChange={(e) => setEditingReturnRecord({ ...editingReturnRecord, returnGstAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Return Challan / Debit Note No.
                  </label>
                  <input
                    type="text"
                    placeholder="DN-001 / Ret-01"
                    value={editingReturnRecord.returnChallanNumber || ''}
                    onChange={(e) => setEditingReturnRecord({ ...editingReturnRecord, returnChallanNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Dates & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Return Received Date
                  </label>
                  <input
                    type="date"
                    value={editingReturnRecord.returnDate || ''}
                    onChange={(e) => setEditingReturnRecord({ ...editingReturnRecord, returnDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Filing ARN / Reference No (if filed)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ARN-2026-RET-098"
                    value={editingReturnRecord.arnNumber || ''}
                    onChange={(e) => setEditingReturnRecord({ ...editingReturnRecord, arnNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Return Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Return
                </label>
                <select
                  value={editingReturnRecord.returnReason || ''}
                  onChange={(e) => setEditingReturnRecord({ ...editingReturnRecord, returnReason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="Damage / Defective Material">Defective / Damaged Material</option>
                  <option value="Rate Difference / Discount">Rate Difference / Discount</option>
                  <option value="Excess / Short Quantity">Excess / Shortage Quantity</option>
                  <option value="Order Cancellation">Order Cancelled</option>
                  <option value="Quality Rejection">Quality Not Matching / Rejection</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Remarks
                </label>
                <input
                  type="text"
                  placeholder="Additional remarks..."
                  value={editingReturnRecord.notes || ''}
                  onChange={(e) => setEditingReturnRecord({ ...editingReturnRecord, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Save Return Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Invoice GST Filing Status Modal */}
      {isInvoiceFilingModalOpen && targetInvoiceForFiling && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">
                  GST Filing Status
                </h3>
              </div>
              <button
                onClick={() => setIsInvoiceFilingModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Invoice Number:</span>
                <span className="font-mono font-black text-slate-900">{targetInvoiceForFiling.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Party / Customer:</span>
                <span className="font-black text-slate-900">{targetInvoiceForFiling.partyName || 'Cash Customer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Invoice Date:</span>
                <span className="font-semibold text-slate-700">{targetInvoiceForFiling.date}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-bold">GST Tax Amount:</span>
                <span className="font-black text-blue-700">{formatIndianCurrency(getInvoiceTaxDetails(targetInvoiceForFiling).totalGst)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Select Filing Status *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFilingModalStatus('FILED')}
                    className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      filingModalStatus === 'FILED'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>✓ Filed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilingModalStatus('DUE')}
                    className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      filingModalStatus === 'DUE'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>⏳ Due</span>
                  </button>
                </div>
              </div>

              {filingModalStatus === 'FILED' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Filing Date
                    </label>
                    <input
                      type="date"
                      value={filingModalDate}
                      onChange={(e) => setFilingModalDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ARN Number / Reference (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AA0703260123456"
                      value={filingModalArn}
                      onChange={(e) => setFilingModalArn(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsInvoiceFilingModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSetInvoiceFiling(
                    targetInvoiceForFiling, 
                    filingModalStatus, 
                    filingModalStatus === 'FILED' ? filingModalDate : undefined,
                    filingModalStatus === 'FILED' ? filingModalArn : undefined
                  );
                  setIsInvoiceFilingModalOpen(false);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Status</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
