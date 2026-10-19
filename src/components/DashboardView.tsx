import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Package, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, Plus, FileText, ShoppingBag, 
  Receipt, Eye, ChevronRight, ShieldCheck,
  Trash2, Layers, ShoppingCart,
  CheckCircle2, Wallet, BookOpen, Calendar, Clock,
  Cloud, Headphones, Laptop, Check
} from 'lucide-react';
import { Invoice, Party, Item, BusinessProfile, DocumentType, ViewMode, PaymentVoucher, Expense, SiteExpense } from '../types';
import { formatIndianCurrency, getDocumentTypeName } from '../utils/gstCalculations';

interface DashboardViewProps {
  invoices: Invoice[];
  parties: Party[];
  items: Item[];
  expenses?: Expense[];
  siteExpenses?: SiteExpense[];
  businessProfile: BusinessProfile;
  paymentVouchers?: PaymentVoucher[];
  onCreateInvoice: (docType?: DocumentType) => void;
  onOpenPos: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onDeleteInvoice?: (id: string) => void;
  onDeleteParty?: (id: string) => void;
  onNavigateTab?: (tab: ViewMode) => void;
  onOpenHsnFinder?: () => void;
  onUpdateParty?: (party: Party) => void;
  onRecordVoucherForParty?: (party: Party) => void;
}

// Helpers for dynamic live calculations
function extractYearMonth(dateStr?: string): { year: number; month: number } | null {
  if (!dateStr) return null;
  const s = dateStr.trim();
  const ymd = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (ymd) {
    return { year: parseInt(ymd[1], 10), month: parseInt(ymd[2], 10) };
  }
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    return { year: parseInt(dmy[3], 10), month: parseInt(dmy[2], 10) };
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  return null;
}

function getNiceMax(val: number): number {
  if (val <= 0) return 10000;
  const mag = Math.pow(10, Math.floor(Math.log10(val)));
  const normalized = val / mag;
  let niceNorm: number;
  if (normalized <= 1) niceNorm = 1;
  else if (normalized <= 2) niceNorm = 2;
  else if (normalized <= 2.5) niceNorm = 2.5;
  else if (normalized <= 5) niceNorm = 5;
  else niceNorm = 10;
  return niceNorm * mag;
}

function formatShortIndianCurrency(val: number): string {
  if (val >= 10000000) {
    const cr = val / 10000000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)}Cr`;
  }
  if (val >= 100000) {
    const l = val / 100000;
    return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)}L`;
  }
  if (val >= 1000) {
    const k = val / 1000;
    return `₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `₹${Math.round(val)}`;
}

function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  let path = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 >= points.length ? i + 1 : i + 2];
    
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return path;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  invoices = [],
  parties = [],
  items = [],
  expenses = [],
  siteExpenses = [],
  businessProfile,
  paymentVouchers = [],
  onCreateInvoice,
  onOpenPos,
  onViewInvoice,
  onDeleteInvoice,
  onDeleteParty,
  onNavigateTab,
  onOpenHsnFinder,
  onUpdateParty,
  onRecordVoucherForParty,
}) => {
  // Real Categorization based on live website data
  const salesInvoices = useMemo(() => {
    return invoices.filter(i => 
      i.documentType === 'TAX_INVOICE' || 
      i.documentType === 'POS_INVOICE' || 
      (!['QUOTATION', 'PURCHASE_BILL', 'PURCHASE_ESTIMATE', 'SERVICE_ORDER', 'DELIVERY_CHALLAN'].includes(i.documentType))
    );
  }, [invoices]);

  const purchaseBills = useMemo(() => {
    return invoices.filter(i => i.documentType === 'PURCHASE_BILL' || i.documentType === 'PURCHASE_ESTIMATE');
  }, [invoices]);

  // Real live KPI calculations
  const totalSales = useMemo(() => {
    return salesInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0);
  }, [salesInvoices]);

  const totalCollected = useMemo(() => {
    return salesInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  }, [salesInvoices]);

  const totalReceivable = useMemo(() => {
    return salesInvoices.reduce((sum, i) => sum + (i.balanceDue || 0), 0);
  }, [salesInvoices]);

  const totalPurchase = useMemo(() => {
    const pbSum = purchaseBills.reduce((sum, i) => sum + (i.grandTotal || 0), 0);
    const expSum = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const siteExpSum = siteExpenses?.reduce((sum, se) => sum + (se.amount || 0), 0) || 0;
    return pbSum + expSum + siteExpSum;
  }, [purchaseBills, expenses, siteExpenses]);

  const partiesWithDueCount = useMemo(() => {
    const count = parties.filter(p => (p.currentBalance || 0) > 0).length;
    return count > 0 ? count : (totalReceivable > 0 ? 1 : 0);
  }, [parties, totalReceivable]);

  // Format current date & time
  const formattedDate = useMemo(() => {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'short' });
    const day = now.getDate();
    const month = now.toLocaleDateString('en-US', { month: 'short' });
    const year = now.getFullYear();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return {
      dateStr: `${dayName}, ${day} ${month} ${year}`,
      timeStr: time,
    };
  }, []);

  // Real recent invoices from live data (sorted most recent first, no fake demo records)
  const recentInvoices = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    return [...invoices]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 5);
  }, [invoices]);

  // --- REAL DYNAMIC "SALES & PURCHASE OVERVIEW" (LAST 6 MONTHS) ---
  const monthlyOverview = useMemo(() => {
    const now = new Date();
    let latestYear = now.getFullYear();
    let latestMonth = now.getMonth() + 1; // 1..12

    // Scan all invoices to find latest month in case data has future or past dates
    invoices.forEach(inv => {
      const ym = extractYearMonth(inv.date);
      if (ym) {
        if (ym.year > latestYear || (ym.year === latestYear && ym.month > latestMonth)) {
          latestYear = ym.year;
          latestMonth = ym.month;
        }
      }
    });

    const months: {
      key: string;
      shortMonth: string;
      fullLabel: string;
      sales: number;
      purchase: number;
      salesCount: number;
      purchaseCount: number;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      let m = latestMonth - i;
      let y = latestYear;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const d = new Date(y, m - 1, 1);
      const shortMonth = d.toLocaleDateString('en-US', { month: 'short' });
      const fullLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      months.push({
        key,
        shortMonth,
        fullLabel,
        sales: 0,
        purchase: 0,
        salesCount: 0,
        purchaseCount: 0,
      });
    }

    // Populate actual sales & purchases from live invoices
    invoices.forEach(inv => {
      const ym = extractYearMonth(inv.date);
      if (!ym) return;
      const key = `${ym.year}-${String(ym.month).padStart(2, '0')}`;
      const bucket = months.find(b => b.key === key);
      if (bucket) {
        const isPurchase = inv.documentType === 'PURCHASE_BILL' || inv.documentType === 'PURCHASE_ESTIMATE';
        const isSales = inv.documentType === 'TAX_INVOICE' || inv.documentType === 'POS_INVOICE' || (!['QUOTATION', 'PURCHASE_BILL', 'PURCHASE_ESTIMATE', 'SERVICE_ORDER', 'DELIVERY_CHALLAN'].includes(inv.documentType));

        if (isPurchase) {
          bucket.purchase += (inv.grandTotal || 0);
          bucket.purchaseCount += 1;
        } else if (isSales) {
          bucket.sales += (inv.grandTotal || 0);
          bucket.salesCount += 1;
        }
      }
    });

    // Also include general expenses in purchase for the respective month
    expenses?.forEach(exp => {
      const ym = extractYearMonth(exp.date);
      if (!ym) return;
      const key = `${ym.year}-${String(ym.month).padStart(2, '0')}`;
      const bucket = months.find(b => b.key === key);
      if (bucket) {
        bucket.purchase += (exp.amount || 0);
        bucket.purchaseCount += 1;
      }
    });

    // Also include site expenses in purchase for the respective month
    siteExpenses?.forEach(se => {
      const ym = extractYearMonth(se.date);
      if (!ym) return;
      const key = `${ym.year}-${String(ym.month).padStart(2, '0')}`;
      const bucket = months.find(b => b.key === key);
      if (bucket) {
        bucket.purchase += (se.amount || 0);
        bucket.purchaseCount += 1;
      }
    });

    return months;
  }, [invoices, expenses, siteExpenses]);

  // Selected or hovered month for overview interactive tooltip (default to most recent month)
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number>(5);
  const activeMonth = monthlyOverview[hoveredMonthIndex] || monthlyOverview[monthlyOverview.length - 1];

  // Dynamic SVG chart geometry based on live monthly data
  const chartGeometry = useMemo(() => {
    const maxVal = Math.max(...monthlyOverview.map(m => Math.max(m.sales, m.purchase)), 0);
    const niceCeil = getNiceMax(maxVal);

    const xStart = 55;
    const xEnd = 460;
    const yTop = 25;
    const yBottom = 155;
    const yHeight = yBottom - yTop;
    const stepX = (xEnd - xStart) / 5;

    const salesPoints = monthlyOverview.map((m, i) => {
      const x = xStart + i * stepX;
      const y = yBottom - (m.sales / niceCeil) * yHeight;
      return { x, y: Math.max(yTop, Math.min(yBottom, y)) };
    });

    const purchasePoints = monthlyOverview.map((m, i) => {
      const x = xStart + i * stepX;
      const y = yBottom - (m.purchase / niceCeil) * yHeight;
      return { x, y: Math.max(yTop, Math.min(yBottom, y)) };
    });

    const salesPath = createSmoothPath(salesPoints);
    const purchasePath = createSmoothPath(purchasePoints);

    const salesArea = salesPoints.length > 0 
      ? `${salesPath} L ${salesPoints[salesPoints.length - 1].x},${yBottom} L ${salesPoints[0].x},${yBottom} Z` 
      : '';
    const purchaseArea = purchasePoints.length > 0 
      ? `${purchasePath} L ${purchasePoints[purchasePoints.length - 1].x},${yBottom} L ${purchasePoints[0].x},${yBottom} Z` 
      : '';

    return {
      niceCeil,
      salesPoints,
      purchasePoints,
      salesPath,
      purchasePath,
      salesArea,
      purchaseArea,
    };
  }, [monthlyOverview]);

  // --- REAL DYNAMIC "PAYMENT STATUS" DONUT BREAKDOWN ---
  const paymentBreakdown = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    let paidAmount = 0;
    let pendingAmount = 0;
    let partialAmount = 0;
    let overdueAmount = 0;

    let paidCount = 0;
    let pendingCount = 0;
    let partialCount = 0;
    let overdueCount = 0;

    salesInvoices.forEach(inv => {
      const isPaid = inv.paymentStatus === 'PAID' || (inv.balanceDue <= 0 && inv.grandTotal > 0);
      const isOverdue = inv.paymentStatus === 'OVERDUE' || (inv.balanceDue > 0 && Boolean(inv.dueDate && inv.dueDate < todayStr));
      const isPartial = !isPaid && !isOverdue && (inv.paymentStatus === 'PARTIAL' || (inv.paidAmount > 0 && inv.balanceDue > 0));

      if (isPaid) {
        paidCount++;
        paidAmount += (inv.grandTotal || 0);
      } else if (isOverdue) {
        overdueCount++;
        overdueAmount += (inv.balanceDue || 0);
        paidAmount += (inv.paidAmount || 0);
      } else if (isPartial) {
        partialCount++;
        partialAmount += (inv.balanceDue || 0);
        paidAmount += (inv.paidAmount || 0);
      } else {
        // Pending
        pendingCount++;
        pendingAmount += (inv.balanceDue || 0);
        paidAmount += (inv.paidAmount || 0);
      }
    });

    const totalAmount = paidAmount + pendingAmount + partialAmount + overdueAmount;
    const totalCount = paidCount + pendingCount + partialCount + overdueCount;

    let paidPct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
    let pendingPct = totalAmount > 0 ? Math.round((pendingAmount / totalAmount) * 100) : 0;
    let partialPct = totalAmount > 0 ? Math.round((partialAmount / totalAmount) * 100) : 0;
    let overduePct = totalAmount > 0 ? Math.max(0, 100 - paidPct - pendingPct - partialPct) : 0;

    // Normalize to exact 100%
    if (totalAmount > 0) {
      const sum = paidPct + pendingPct + partialPct + overduePct;
      if (sum !== 100) {
        const diff = 100 - sum;
        if (paidPct > 0) paidPct += diff;
        else if (pendingPct > 0) pendingPct += diff;
      }
    }

    // Circumference of SVG circle with r=38 is 2 * PI * 38 ≈ 238.76
    const C = 238.76;
    const paidArc = (paidPct / 100) * C;
    const pendingArc = (pendingPct / 100) * C;
    const partialArc = (partialPct / 100) * C;
    const overdueArc = (overduePct / 100) * C;

    return {
      totalAmount,
      totalCount,
      paidAmount,
      pendingAmount,
      partialAmount,
      overdueAmount,
      paidCount,
      pendingCount,
      partialCount,
      overdueCount,
      paidPct,
      pendingPct,
      partialPct,
      overduePct,
      paidArc,
      pendingArc,
      partialArc,
      overdueArc,
      C,
    };
  }, [salesInvoices]);

  return (
    <div className="space-y-4 pb-10 text-slate-100">
      
      {/* 1. Top Welcome Banner matching reference image */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#0a1638] via-[#091433] to-[#0c1a45] border border-blue-500/30 p-5 md:p-6 overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        {/* Futuristic glowing wave graphics */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-3/5 pointer-events-none opacity-45 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none" fill="none">
            <path d="M0,60 C150,120 300,10 500,70" stroke="url(#cyan-wave)" strokeWidth="2.5" />
            <path d="M0,80 C180,30 320,110 500,40" stroke="url(#blue-wave)" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M100,100 C250,20 380,90 500,20" stroke="url(#cyan-wave)" strokeWidth="1.5" opacity="0.6" />
            <defs>
              <linearGradient id="cyan-wave" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0066ff" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#00f2fe" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="blue-wave" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#2563eb" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.9" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight font-heading flex items-center gap-2">
              <span>Welcome Back, {businessProfile?.name || 'Suhel Ansari'}</span>
              <span>👋</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Here&apos;s what&apos;s happening with your business today.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#081230]/80 border border-[#1b2b5d] rounded-xl px-3.5 py-2 text-right">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="text-left text-xs leading-tight">
              <div className="font-bold text-white">{formattedDate.dateStr}</div>
              <div className="text-[10px] text-slate-400">{formattedDate.timeStr}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Four Financial KPI Cards with real live data & sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Total Billed */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] hover:border-cyan-500/50 p-4 relative overflow-hidden shadow-lg transition-all group">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-cyan-400 flex items-center justify-center font-bold text-base shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              ₹
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-400 mt-3">Total Billed</div>
          <div className="font-heading font-black text-white text-xl xl:text-2xl tracking-tight mt-0.5">
            ₹ {formatIndianCurrency(totalSales)}
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#14234b] flex items-center justify-between">
            <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
              <span>↗</span> {salesInvoices.length} Sales Invoices generated
            </span>
            <svg className="w-20 h-5" viewBox="0 0 80 20" fill="none">
              <path d="M0,15 Q20,3 40,12 T80,5" stroke="#00d2ff" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* KPI 2: Total Received */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] hover:border-emerald-500/50 p-4 relative overflow-hidden shadow-lg transition-all group">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-400 mt-3">Total Received</div>
          <div className="font-heading font-black text-white text-xl xl:text-2xl tracking-tight mt-0.5">
            ₹ {formatIndianCurrency(totalCollected)}
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#14234b] flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <span>↗</span> {paymentVouchers.length} Payment Vouchers recorded
            </span>
            <svg className="w-20 h-5" viewBox="0 0 80 20" fill="none">
              <path d="M0,14 Q20,18 40,8 T80,4" stroke="#10b981" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* KPI 3: Total Pending Due */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] hover:border-rose-500/50 p-4 relative overflow-hidden shadow-lg transition-all group">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.3)]">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-400 mt-3">Total Pending Due</div>
          <div className="font-heading font-black text-white text-xl xl:text-2xl tracking-tight mt-0.5">
            ₹ {formatIndianCurrency(totalReceivable)}
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#14234b] flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              Outstanding from {partiesWithDueCount} {partiesWithDueCount === 1 ? 'party' : 'parties'}
            </span>
            <svg className="w-20 h-5" viewBox="0 0 80 20" fill="none">
              <path d="M0,6 Q20,16 40,9 T80,14" stroke="#f43f5e" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* KPI 4: Total Purchase */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] hover:border-purple-500/50 p-4 relative overflow-hidden shadow-lg transition-all group">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-400 mt-3">Total Purchase</div>
          <div className="font-heading font-black text-white text-xl xl:text-2xl tracking-tight mt-0.5">
            ₹ {formatIndianCurrency(totalPurchase)}
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#14234b] flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
              <span>↗</span> {purchaseBills.length} Purchase Bills recorded
            </span>
            <svg className="w-20 h-5" viewBox="0 0 80 20" fill="none">
              <path d="M0,16 Q20,4 40,11 T80,6" stroke="#c084fc" strokeWidth="2" />
            </svg>
          </div>
        </div>

      </div>

      {/* 3. Middle Section: Dynamic Real Live Sales & Purchase Overview, Payment Status, Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Left: Dynamic Sales & Purchase Overview Chart (6 cols) */}
        <div className="lg:col-span-6 bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] p-4 sm:p-5 relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-extrabold text-sm text-white font-heading">
                  Sales &amp; Purchase Overview
                </h3>
                <span className="text-[10px] text-slate-400">Last 6 Months (Live Data)</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                  Sales
                </span>
                <span className="flex items-center gap-1.5 text-purple-400">
                  <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]"></span>
                  Purchase
                </span>
              </div>
            </div>

            {/* Glowing SVG Multi-line Chart bound to real data */}
            <div className="relative h-56 w-full pt-4">
              {/* Dynamic Interactive Tooltip */}
              <div className="absolute right-4 sm:right-8 top-2 bg-[#0c1840]/95 border border-cyan-500/40 rounded-xl p-2.5 shadow-[0_0_20px_rgba(6,182,212,0.35)] z-20 text-[11px] backdrop-blur-md pointer-events-none transition-all">
                <div className="text-slate-200 font-bold mb-1.5 flex items-center justify-between gap-4">
                  <span>{activeMonth.fullLabel}</span>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {activeMonth.salesCount + activeMonth.purchaseCount} bills
                  </span>
                </div>
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></span>
                  <span>Sales:</span>
                  <span className="ml-auto font-mono">₹ {formatIndianCurrency(activeMonth.sales)}</span>
                </div>
                <div className="flex items-center gap-2 text-purple-300 font-bold mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]"></span>
                  <span>Purchase:</span>
                  <span className="ml-auto font-mono">₹ {formatIndianCurrency(activeMonth.purchase)}</span>
                </div>
                {(activeMonth.sales > 0 || activeMonth.purchase > 0) && (
                  <div className="mt-1 pt-1 border-t border-[#1b2b5a] flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Margin:</span>
                    <span className={`font-mono font-bold ${activeMonth.sales >= activeMonth.purchase ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeMonth.sales >= activeMonth.purchase ? '+' : '-'}₹ {formatIndianCurrency(Math.abs(activeMonth.sales - activeMonth.purchase))}
                    </span>
                  </div>
                )}
              </div>

              <svg className="w-full h-full" viewBox="0 0 500 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="live-sales-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#00d2ff" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="live-purchase-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-axis grid lines */}
                <line x1="45" y1="25" x2="490" y2="25" stroke="#162348" strokeDasharray="3 3" />
                <line x1="45" y1="57.5" x2="490" y2="57.5" stroke="#162348" strokeDasharray="3 3" />
                <line x1="45" y1="90" x2="490" y2="90" stroke="#162348" strokeDasharray="3 3" />
                <line x1="45" y1="122.5" x2="490" y2="122.5" stroke="#162348" strokeDasharray="3 3" />
                <line x1="45" y1="155" x2="490" y2="155" stroke="#1b2b5a" />

                {/* Y-axis labels dynamically calculated */}
                <text x="5" y="28" fill="#64748b" fontSize="10">{formatShortIndianCurrency(chartGeometry.niceCeil)}</text>
                <text x="5" y="61" fill="#64748b" fontSize="10">{formatShortIndianCurrency(chartGeometry.niceCeil * 0.75)}</text>
                <text x="5" y="94" fill="#64748b" fontSize="10">{formatShortIndianCurrency(chartGeometry.niceCeil * 0.5)}</text>
                <text x="5" y="126" fill="#64748b" fontSize="10">{formatShortIndianCurrency(chartGeometry.niceCeil * 0.25)}</text>
                <text x="5" y="159" fill="#64748b" fontSize="10">₹ 0</text>

                {/* Vertical hover indicator line */}
                {chartGeometry.salesPoints[hoveredMonthIndex] && (
                  <line 
                    x1={chartGeometry.salesPoints[hoveredMonthIndex].x} 
                    y1="25" 
                    x2={chartGeometry.salesPoints[hoveredMonthIndex].x} 
                    y2="155" 
                    stroke="#38bdf8" 
                    strokeWidth="1.5" 
                    strokeDasharray="3 3" 
                    opacity="0.6" 
                  />
                )}

                {/* Shaded Areas */}
                {chartGeometry.salesArea && (
                  <path d={chartGeometry.salesArea} fill="url(#live-sales-grad)" />
                )}
                {chartGeometry.purchaseArea && (
                  <path d={chartGeometry.purchaseArea} fill="url(#live-purchase-grad)" />
                )}

                {/* Sales Wave Line (Cyan) */}
                <path
                  d={chartGeometry.salesPath}
                  fill="none"
                  stroke="#00d2ff"
                  strokeWidth="3"
                  className="drop-shadow-[0_0_8px_rgba(0,210,255,0.8)]"
                />

                {/* Purchase Wave Line (Purple) */}
                <path
                  d={chartGeometry.purchasePath}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="3"
                  className="drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]"
                />

                {/* Interactive Points & Click/Hover Columns */}
                {chartGeometry.salesPoints.map((pt, i) => {
                  const isHovered = hoveredMonthIndex === i;
                  const purPt = chartGeometry.purchasePoints[i];
                  return (
                    <g key={i}>
                      {/* Transparent hit target for hover/click */}
                      <rect 
                        x={pt.x - 35} 
                        y="15" 
                        width="70" 
                        height="145" 
                        fill="transparent" 
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredMonthIndex(i)}
                        onClick={() => setHoveredMonthIndex(i)}
                      />

                      {/* Sales point */}
                      <circle 
                        cx={pt.x} 
                        cy={pt.y} 
                        r={isHovered ? 5.5 : 3.5} 
                        fill={isHovered ? '#00f2fe' : '#00d2ff'} 
                        stroke={isHovered ? '#ffffff' : '#070e24'} 
                        strokeWidth={isHovered ? 2 : 1.5}
                        className={isHovered ? 'drop-shadow-[0_0_8px_#00f2fe]' : ''}
                      />

                      {/* Purchase point */}
                      {purPt && (
                        <circle 
                          cx={purPt.x} 
                          cy={purPt.y} 
                          r={isHovered ? 5.5 : 3.5} 
                          fill={isHovered ? '#e879f9' : '#c084fc'} 
                          stroke={isHovered ? '#ffffff' : '#070e24'} 
                          strokeWidth={isHovered ? 2 : 1.5}
                          className={isHovered ? 'drop-shadow-[0_0_8px_#c084fc]' : ''}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* X-axis labels with interactive selection */}
            <div className="flex justify-between pl-11 pr-7 text-[10px] font-mono mt-1">
              {monthlyOverview.map((m, idx) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setHoveredMonthIndex(idx)}
                  onMouseEnter={() => setHoveredMonthIndex(idx)}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    hoveredMonthIndex === idx 
                      ? 'text-cyan-300 font-bold bg-cyan-950/70 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.4)]' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m.shortMonth}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Real Live Dynamic Payment Status Donut (3 cols) */}
        <div className="lg:col-span-3 bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] p-4 sm:p-5 relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-white font-heading">
                Payment Status
              </h3>
              <span className="text-[10px] text-slate-400">Live Breakdown</span>
            </div>
            
            {/* Donut Chart container bound to real payment data */}
            <div className="relative flex items-center justify-center my-4">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" stroke="#132248" strokeWidth="11" fill="none" />

                {paymentBreakdown.totalAmount > 0 && (
                  <>
                    {/* Paid segment (Green) */}
                    {paymentBreakdown.paidPct > 0 && (
                      <circle 
                        cx="50" cy="50" r="38" 
                        stroke="#10b981" strokeWidth="11" fill="none"
                        strokeDasharray={`${paymentBreakdown.paidArc} ${paymentBreakdown.C - paymentBreakdown.paidArc}`}
                        strokeDashoffset="0"
                        className="drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                      />
                    )}

                    {/* Pending segment (Amber) */}
                    {paymentBreakdown.pendingPct > 0 && (
                      <circle 
                        cx="50" cy="50" r="38" 
                        stroke="#f59e0b" strokeWidth="11" fill="none"
                        strokeDasharray={`${paymentBreakdown.pendingArc} ${paymentBreakdown.C - paymentBreakdown.pendingArc}`}
                        strokeDashoffset={`${-paymentBreakdown.paidArc}`}
                      />
                    )}

                    {/* Partial segment (Cyan) */}
                    {paymentBreakdown.partialPct > 0 && (
                      <circle 
                        cx="50" cy="50" r="38" 
                        stroke="#06b6d4" strokeWidth="11" fill="none"
                        strokeDasharray={`${paymentBreakdown.partialArc} ${paymentBreakdown.C - paymentBreakdown.partialArc}`}
                        strokeDashoffset={`${-(paymentBreakdown.paidArc + paymentBreakdown.pendingArc)}`}
                      />
                    )}

                    {/* Overdue segment (Rose) */}
                    {paymentBreakdown.overduePct > 0 && (
                      <circle 
                        cx="50" cy="50" r="38" 
                        stroke="#f43f5e" strokeWidth="11" fill="none"
                        strokeDasharray={`${paymentBreakdown.overdueArc} ${paymentBreakdown.C - paymentBreakdown.overdueArc}`}
                        strokeDashoffset={`${-(paymentBreakdown.paidArc + paymentBreakdown.pendingArc + paymentBreakdown.partialArc)}`}
                      />
                    )}
                  </>
                )}
              </svg>

              {/* Inside Donut Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <div className="text-2xl font-black text-white font-heading tracking-tight">
                  {paymentBreakdown.totalAmount > 0 ? `${paymentBreakdown.paidPct}%` : '0%'}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {paymentBreakdown.totalAmount > 0 ? (paymentBreakdown.paidPct >= 50 ? 'Paid' : 'Collected') : 'No Bills'}
                </div>
              </div>
            </div>

            {/* Dynamic Legend with live counts & percentages */}
            <div className="space-y-1.5 text-xs pt-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
                  <span>Paid {paymentBreakdown.paidCount > 0 && <span className="text-[10px] text-slate-400">({paymentBreakdown.paidCount})</span>}</span>
                </span>
                <span className="font-bold text-white font-mono">{paymentBreakdown.paidPct}%</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]"></span>
                  <span>Pending {paymentBreakdown.pendingCount > 0 && <span className="text-[10px] text-slate-400">({paymentBreakdown.pendingCount})</span>}</span>
                </span>
                <span className="font-bold text-white font-mono">{paymentBreakdown.pendingPct}%</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_6px_#06b6d4]"></span>
                  <span>Partial {paymentBreakdown.partialCount > 0 && <span className="text-[10px] text-slate-400">({paymentBreakdown.partialCount})</span>}</span>
                </span>
                <span className="font-bold text-white font-mono">{paymentBreakdown.partialPct}%</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]"></span>
                  <span>Overdue {paymentBreakdown.overdueCount > 0 && <span className="text-[10px] text-slate-400">({paymentBreakdown.overdueCount})</span>}</span>
                </span>
                <span className="font-bold text-white font-mono">{paymentBreakdown.overduePct}%</span>
              </div>
            </div>

            {/* Total Analyzed in Footer */}
            <div className="mt-3 pt-2 border-t border-[#14234b] text-[10.5px] text-slate-400 flex items-center justify-between">
              <span>Total Value:</span>
              <span className="font-mono font-bold text-slate-200">₹ {formatIndianCurrency(paymentBreakdown.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions (3 cols) */}
        <div className="lg:col-span-3 bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] p-4 sm:p-5 relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-white font-heading mb-3">
              Quick Actions
            </h3>
            
            <div className="space-y-2.5">
              {/* + New GST Invoice */}
              <button
                type="button"
                onClick={() => onCreateInvoice('TAX_INVOICE')}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs flex items-center justify-between shadow-[0_0_15px_rgba(2,132,199,0.35)] border border-cyan-400/40 transition-all cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>New GST Invoice</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/80" />
              </button>

              {/* Payment Vouchers */}
              <button
                type="button"
                onClick={() => onNavigateTab?.('PAYMENT_VOUCHERS')}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400/40 transition-all cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  <span>Payment Vouchers</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/80" />
              </button>

              {/* Party Ledger */}
              <button
                type="button"
                onClick={() => onNavigateTab?.('PARTIES')}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-xs flex items-center justify-between shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-400/40 transition-all cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Party Ledger</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/80" />
              </button>

              {/* POS Counter */}
              <button
                type="button"
                onClick={onOpenPos}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold text-xs flex items-center justify-between shadow-[0_0_15px_rgba(168,85,247,0.35)] border border-purple-400/40 transition-all cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>POS Counter</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/80" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Lower Section: Recent Bills & Quotations (8 cols) + Quick Document Creator (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Left Table: Recent Bills & Quotations */}
        <div className="lg:col-span-8 bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-white font-heading">
                  Recent Bills &amp; Quotations
                </h3>
                <span className="text-[10.5px] text-slate-400">
                  Latest transactions with instant preview and WhatsApp sharing
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab?.('INVOICES')}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View All ({invoices.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Table */}
            {recentInvoices.length === 0 ? (
              <div className="text-center py-10 px-4 border border-dashed border-[#172654] rounded-xl bg-[#09122e]/40">
                <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                <p className="text-xs font-bold text-slate-300">No invoices or bills created yet</p>
                <p className="text-[11px] text-slate-500 mt-1">Create your first Tax Invoice or Quotation to see it here.</p>
                <button
                  type="button"
                  onClick={() => onCreateInvoice('TAX_INVOICE')}
                  className="mt-3 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Create First Invoice</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#14234b] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-2.5">Type</th>
                      <th className="pb-2.5">No. / Party</th>
                      <th className="pb-2.5">Date</th>
                      <th className="pb-2.5">Amount</th>
                      <th className="pb-2.5">Status</th>
                      <th className="pb-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#101b3d]">
                    {recentInvoices.map((inv) => {
                      const isQuotation = inv.documentType === 'QUOTATION';
                      const isUnpaid = inv.paymentStatus === 'UNPAID';

                      return (
                        <tr key={inv.id} className="hover:bg-[#0c183d]/60 transition-colors">
                          {/* Type Badge */}
                          <td className="py-3 pr-2 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[10.5px] ${
                              isQuotation 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                : inv.documentType === 'TAX_INVOICE'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            }`}>
                              <FileText className="w-3 h-3" />
                              <span>{isQuotation ? 'Quotation' : inv.documentType === 'TAX_INVOICE' ? 'Sales Invoice' : getDocumentTypeName(inv.documentType)}</span>
                            </span>
                          </td>

                          {/* No / Party */}
                          <td className="py-3 px-2">
                            <div className="font-bold text-white text-xs">{inv.invoiceNumber}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px] sm:max-w-xs uppercase">
                              {inv.partyName}
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-2 whitespace-nowrap text-slate-300 text-[11px] font-mono">
                            {inv.date}
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-2 whitespace-nowrap font-mono font-bold text-white text-xs">
                            ₹ {formatIndianCurrency(inv.grandTotal || 0)}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-2 whitespace-nowrap">
                            <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isUnpaid 
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                                : inv.paymentStatus === 'PARTIAL'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {inv.paymentStatus || 'UNPAID'}
                            </span>
                          </td>

                          {/* Action Icons */}
                          <td className="py-3 pl-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => inv && (inv as Invoice).items ? onViewInvoice(inv as Invoice) : onCreateInvoice('TAX_INVOICE')}
                                className="p-1.5 text-cyan-400 hover:text-white hover:bg-cyan-600/20 rounded-lg transition-colors cursor-pointer"
                                title="Preview"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteInvoice && (
                                <button
                                  type="button"
                                  onClick={() => inv.id && onDeleteInvoice(inv.id)}
                                  className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-600/20 rounded-lg transition-colors cursor-pointer"
                                  title="Delete"
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

        {/* Right: Quick Document Creator (4 cols) */}
        <div className="lg:col-span-4 bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-white font-heading mb-3">
              Quick Document Creator
            </h3>

            <div className="space-y-2">
              {/* GST Tax Invoice */}
              <button
                type="button"
                onClick={() => onCreateInvoice('TAX_INVOICE')}
                className="w-full p-2.5 rounded-xl bg-[#0a1435] hover:bg-[#0f1d47] border border-[#182859] hover:border-cyan-500/40 text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-cyan-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                      GST Tax Invoice
                    </div>
                    <div className="text-[10px] text-slate-400">Regular B2B / B2C</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              </button>

              {/* Quotation & Estimate */}
              <button
                type="button"
                onClick={() => onCreateInvoice('QUOTATION')}
                className="w-full p-2.5 rounded-xl bg-[#0a1435] hover:bg-[#0f1d47] border border-[#182859] hover:border-amber-500/40 text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <Receipt className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors">
                      Quotation &amp; Estimate
                    </div>
                    <div className="text-[10px] text-slate-400">Commercial offer</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
              </button>

              {/* Service Order */}
              <button
                type="button"
                onClick={() => onCreateInvoice('SERVICE_ORDER')}
                className="w-full p-2.5 rounded-xl bg-[#0a1435] hover:bg-[#0f1d47] border border-[#182859] hover:border-cyan-500/40 text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                      Service Order
                    </div>
                    <div className="text-[10px] text-slate-400">Work order &amp; Estimate</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              </button>

              {/* Purchase Estimate */}
              <button
                type="button"
                onClick={() => onCreateInvoice('PURCHASE_ESTIMATE')}
                className="w-full p-2.5 rounded-xl bg-[#0a1435] hover:bg-[#0f1d47] border border-[#182859] hover:border-amber-500/40 text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors">
                      Purchase Estimate
                    </div>
                    <div className="text-[10px] text-slate-400">Inward Vendor PO</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
              </button>

              {/* Delivery Challan */}
              <button
                type="button"
                onClick={() => onCreateInvoice('DELIVERY_CHALLAN')}
                className="w-full p-2.5 rounded-xl bg-[#0a1435] hover:bg-[#0f1d47] border border-[#182859] hover:border-purple-500/40 text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
                    <Package className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors">
                      Delivery Challan
                    </div>
                    <div className="text-[10px] text-slate-400">Dispatch note</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Bottom Feature Badges & App Branding Footer matching reference image */}
      <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
          {/* Fast & Secure */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-xs text-white">Fast &amp; Secure</div>
              <div className="text-[10px] text-slate-400">Your data is safe with us</div>
            </div>
          </div>

          {/* Cloud Backup */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-xs text-white">Cloud Backup</div>
              <div className="text-[10px] text-slate-400">1-click JSON export</div>
            </div>
          </div>

          {/* GST Compliant */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-xs text-white">GST Compliant</div>
              <div className="text-[10px] text-slate-400">Auto GST calculations</div>
            </div>
          </div>

          {/* 24/7 Support */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-xs text-white">24/7 Support</div>
              <div className="text-[10px] text-slate-400">Always here for you</div>
            </div>
          </div>
        </div>

        {/* Right: Laptop Illustration & App Tagline */}
        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-[#14234b] pt-3 md:pt-0 md:pl-5 shrink-0 w-full md:w-auto justify-between md:justify-end">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            <Laptop className="w-4 h-4" />
          </div>
          <div className="text-right leading-tight">
            <div className="font-black text-xs text-white font-heading tracking-wide">SR Group Bills</div>
            <div className="text-[9.5px] text-cyan-400/90 font-medium">Simplify Your Accounting</div>
            <div className="text-[9.5px] text-slate-400">Grow Your Business</div>
          </div>
        </div>
      </div>

    </div>
  );
};
