import React, { useState, useMemo } from 'react';
import { 
  HardHat, Plane, Home, Coffee, Truck, Building2, 
  Layers, ShieldCheck, Plus, Search, Filter, Download, 
  Printer, Trash2, Calendar, MapPin, User, CreditCard, 
  FileText, X, CheckCircle2, TrendingUp, Wallet, ArrowUpRight,
  Eye, RefreshCw, AlertCircle, Sparkles, Building, Pencil
} from 'lucide-react';
import { SiteExpense, SiteExpenseCategory, PaymentMode, BusinessProfile } from '../types';
import { formatIndianCurrency, downloadCSV } from '../utils/gstCalculations';
import { ConfirmModal } from './ConfirmModal';

interface SiteExpensesViewProps {
  siteExpenses: SiteExpense[];
  businessProfile: BusinessProfile;
  onAddSiteExpense: (expense: Omit<SiteExpense, 'id' | 'createdAt'>) => void;
  onUpdateSiteExpense: (expense: SiteExpense) => void;
  onDeleteSiteExpense: (id: string) => void;
}

// Exactly the 7 user-requested categories with icons and color schemes
export const SITE_EXPENSE_CATEGORIES: {
  category: SiteExpenseCategory;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
}[] = [
  {
    category: 'Site Travelling Expenses',
    label: 'Site Travelling Expenses',
    shortDesc: 'Travel allowance, tickets, taxi, supervisor transport',
    icon: Plane,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200 hover:border-blue-400',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
  },
  {
    category: 'Labour Accommodation & Food Expenses',
    label: 'Labour Accommodation & Food Expenses',
    shortDesc: 'Labour camp rent, mess ration, kitchen fuel & living',
    icon: Home,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
  },
  {
    category: 'Site Refreshment Expenses',
    label: 'Site Refreshment Expenses',
    shortDesc: 'Daily worker tea, snacks, RO water jars & refreshments',
    icon: Coffee,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200 hover:border-amber-400',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
  },
  {
    category: 'Vehicle & Fuel Expenses',
    label: 'Vehicle & Fuel Expenses',
    shortDesc: 'Diesel for hydra, crane, generator & site vehicle maintenance',
    icon: Truck,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200 hover:border-indigo-400',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
  },
  {
    category: 'Site Office Expenses',
    label: 'Site Office Expenses',
    shortDesc: 'Portacabin supplies, blueprints, stationery & site Wi-Fi',
    icon: Building2,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200 hover:border-sky-400',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
  },
  {
    category: 'Miscellaneous Site Expenses',
    label: 'Miscellaneous Site Expenses',
    shortDesc: 'Emergency hardware, safety tapes, tool repairs & petty cash',
    icon: Layers,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200 hover:border-rose-400',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
  },
  {
    category: 'Site Overheads',
    label: 'Site Overheads',
    shortDesc: 'Safety officer fees, local compliance, permits & inspection',
    icon: ShieldCheck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200 hover:border-purple-400',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
  },
];



export const SiteExpensesView: React.FC<SiteExpensesViewProps> = ({
  siteExpenses = [],
  businessProfile,
  onAddSiteExpense,
  onUpdateSiteExpense,
  onDeleteSiteExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSite, setSelectedSite] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<SiteExpense | null>(null);
  const [editingExpense, setEditingExpense] = useState<SiteExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<SiteExpense | null>(null);

  // Form State for Recording New Site Expense
  const [formData, setFormData] = useState({
    title: '',
    category: 'Site Travelling Expenses' as SiteExpenseCategory,
    siteName: 'HIGC Gujarat Project Site',
    customSite: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paidTo: '',
    paymentMode: 'CASH' as PaymentMode,
    receiptNumber: '',
    approvedBy: 'Site Engineer',
    notes: '',
  });

  // Extract unique site names for filtering
  const allSiteNames = useMemo(() => {
    const set = new Set<string>();
    siteExpenses.forEach(exp => {
      if (exp.siteName) set.add(exp.siteName);
    });
    return Array.from(set);
  }, [siteExpenses]);

  // Overall totals
  const totalSiteAmount = useMemo(() => {
    return siteExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [siteExpenses]);

  // Category-wise totals and counts
  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number }> = {};
    SITE_EXPENSE_CATEGORIES.forEach(c => {
      stats[c.category] = { total: 0, count: 0 };
    });

    siteExpenses.forEach(exp => {
      if (!stats[exp.category]) {
        stats[exp.category] = { total: 0, count: 0 };
      }
      stats[exp.category].total += Number(exp.amount) || 0;
      stats[exp.category].count += 1;
    });

    return stats;
  }, [siteExpenses]);

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return siteExpenses.filter(exp => {
      // Search filter
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        exp.title.toLowerCase().includes(q) ||
        exp.siteName.toLowerCase().includes(q) ||
        (exp.paidTo && exp.paidTo.toLowerCase().includes(q)) ||
        (exp.receiptNumber && exp.receiptNumber.toLowerCase().includes(q)) ||
        (exp.notes && exp.notes.toLowerCase().includes(q));

      // Category filter
      const matchesCategory = selectedCategory === 'ALL' || exp.category === selectedCategory;

      // Site filter
      const matchesSite = selectedSite === 'ALL' || exp.siteName === selectedSite;

      // Month filter
      const matchesMonth = selectedMonth === 'ALL' || (exp.date && exp.date.startsWith(selectedMonth));

      return matchesSearch && matchesCategory && matchesSite && matchesMonth;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [siteExpenses, searchTerm, selectedCategory, selectedSite, selectedMonth]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [filteredExpenses]);

  // Available months list from recorded expenses
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    siteExpenses.forEach(exp => {
      if (exp.date && exp.date.length >= 7) {
        set.add(exp.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [siteExpenses]);

  // Open modal for recording a new site expense
  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormData({
      title: '',
      category: 'Site Travelling Expenses',
      siteName: 'HIGC Gujarat Project Site',
      customSite: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paidTo: '',
      paymentMode: 'CASH',
      receiptNumber: '',
      approvedBy: 'Site Engineer',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingExpense(null);
  };

  // Open modal for editing an existing site expense
  const handleStartEdit = (exp: SiteExpense) => {
    setEditingExpense(exp);
    setFormData({
      title: exp.title || '',
      category: exp.category,
      siteName: exp.siteName || 'HIGC Gujarat Project Site',
      customSite: '',
      amount: exp.amount ? exp.amount.toString() : '',
      date: exp.date || new Date().toISOString().split('T')[0],
      paidTo: exp.paidTo || '',
      paymentMode: exp.paymentMode || 'CASH',
      receiptNumber: exp.receiptNumber || '',
      approvedBy: exp.approvedBy || '',
      notes: exp.notes || '',
    });
    setIsAddModalOpen(true);
  };

  // Form submission handler (Add or Update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = parseFloat(formData.amount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return;
    }

    const finalSite = formData.siteName.trim() || 'General Site';

    if (editingExpense) {
      onUpdateSiteExpense({
        ...editingExpense,
        title: formData.title.trim() || `${formData.category} - ${finalSite}`,
        category: formData.category,
        siteName: finalSite,
        amount: finalAmount,
        date: formData.date || new Date().toISOString().split('T')[0],
        paidTo: formData.paidTo.trim() || undefined,
        paymentMode: formData.paymentMode,
        receiptNumber: formData.receiptNumber.trim() || undefined,
        approvedBy: formData.approvedBy.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
    } else {
      onAddSiteExpense({
        title: formData.title.trim() || `${formData.category} - ${finalSite}`,
        category: formData.category,
        siteName: finalSite,
        amount: finalAmount,
        date: formData.date || new Date().toISOString().split('T')[0],
        paidTo: formData.paidTo.trim() || undefined,
        paymentMode: formData.paymentMode,
        receiptNumber: formData.receiptNumber.trim() || undefined,
        approvedBy: formData.approvedBy.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
    }

    // Reset and close
    setEditingExpense(null);
    setFormData({
      title: '',
      category: 'Site Travelling Expenses',
      siteName: 'HIGC Gujarat Project Site',
      customSite: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paidTo: '',
      paymentMode: 'CASH',
      receiptNumber: '',
      approvedBy: 'Site Engineer',
      notes: '',
    });
    setIsAddModalOpen(false);
  };

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Voucher / Receipt No',
      'Category',
      'Project Site Location',
      'Expense Title',
      'Paid To / Payee',
      'Payment Mode',
      'Amount (INR)',
      'Approved By',
      'Site Notes'
    ];

    const rows = filteredExpenses.map(exp => [
      `"${exp.date}"`,
      `"${(exp.receiptNumber || 'N/A').replace(/"/g, '""')}"`,
      `"${exp.category.replace(/"/g, '""')}"`,
      `"${exp.siteName.replace(/"/g, '""')}"`,
      `"${exp.title.replace(/"/g, '""')}"`,
      `"${(exp.paidTo || 'N/A').replace(/"/g, '""')}"`,
      `"${exp.paymentMode}"`,
      exp.amount.toString(),
      `"${(exp.approvedBy || 'N/A').replace(/"/g, '""')}"`,
      `"${(exp.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, 'SR_Group_Site_Expenses_Report.csv');
  };

  // Direct print handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Description */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-heading">
                  Site Expenses
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  7 Expense Categories
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {businessProfile.name || 'SR Group'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Record and manage all project site operational costs, labour accommodation, vehicle fuel, refreshments, and on-site overheads.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
              title="Download CSV Spreadsheet"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
              title="Print Site Expenses Report"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Report</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Site Expense</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Site Expenses</div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              ₹ {formatIndianCurrency(totalSiteAmount)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Across {siteExpenses.length} transactions</div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filtered View Total</div>
            <div className="text-lg sm:text-xl font-black text-blue-700 mt-0.5">
              ₹ {formatIndianCurrency(filteredTotal)}
            </div>
            <div className="text-[10px] text-blue-600 font-medium mt-0.5">{filteredExpenses.length} matching entries</div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Site Locations</div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">
              {allSiteNames.length} Sites
            </div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">HIGC, Mundra, Hazira & more</div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Categories</div>
            <div className="text-lg sm:text-xl font-black text-purple-700 mt-0.5">
              7 Categories
            </div>
            <div className="text-[10px] text-purple-600 font-medium mt-0.5">100% On-Site Breakdown</div>
          </div>
        </div>
      </div>

      {/* 2. All 7 Expense Categories: Attractive Modern Cards Grid */}
      <div className="no-print">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              Site Expense Categories (7)
            </h2>
            <p className="text-xs text-slate-500">
              Click any card to immediately filter recorded site expenses by category
            </p>
          </div>
          {selectedCategory !== 'ALL' && (
            <button
              onClick={() => setSelectedCategory('ALL')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Reset Filter</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {SITE_EXPENSE_CATEGORIES.map((cat, index) => {
            const Icon = cat.icon;
            const stats = categoryStats[cat.category] || { total: 0, count: 0 };
            const isSelected = selectedCategory === cat.category;
            const percentOfTotal = totalSiteAmount > 0 
              ? ((stats.total / totalSiteAmount) * 100).toFixed(0) 
              : '0';

            return (
              <div
                key={cat.category}
                onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat.category)}
                className={`bg-white rounded-2xl border p-4 transition-all cursor-pointer relative overflow-hidden group shadow-2xs ${
                  isSelected 
                    ? 'ring-2 ring-blue-600 border-blue-600 shadow-md bg-blue-50/20' 
                    : `${cat.borderColor} hover:shadow-sm`
                }`}
              >
                {/* Top Row: Category Number & Icon */}
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cat.bgColor} ${cat.color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      #{index + 1}
                    </span>
                    <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                      {stats.count} {stats.count === 1 ? 'entry' : 'entries'}
                    </div>
                  </div>
                </div>

                {/* Category Title */}
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 mt-3 leading-snug line-clamp-1">
                  {cat.label}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  {cat.shortDesc}
                </p>

                {/* Bottom Row: Amount & Share */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Spent</div>
                    <div className="text-base font-black text-slate-900">
                      ₹ {formatIndianCurrency(stats.total)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.badgeBg} ${cat.badgeText}`}>
                      {percentOfTotal}% share
                    </span>
                  </div>
                </div>

                {/* Active Indicator Bar */}
                {isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Detailed Site Expenses Register Table & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 no-print space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search expense, site name, payee, voucher #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-2 flex-wrap">
              
              {/* Category Filter Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="ALL">All Categories (7)</option>
                {SITE_EXPENSE_CATEGORIES.map(c => (
                  <option key={c.category} value={c.category}>
                    {c.label}
                  </option>
                ))}
              </select>

              {/* Site Location Dropdown */}
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="ALL">All Project Sites</option>
                {allSiteNames.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Month Dropdown */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="ALL">All Months</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {(selectedCategory !== 'ALL' || selectedSite !== 'ALL' || selectedMonth !== 'ALL' || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setSelectedSite('ALL');
                    setSelectedMonth('ALL');
                    setSearchTerm('');
                  }}
                  className="px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Clear all filters"
                >
                  Clear Filters
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Print Header (Visible only when printed) */}
        <div className="hidden print:block p-6 border-b border-slate-300">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {businessProfile.name || 'SR GROUP'}
              </h1>
              <p className="text-xs text-slate-600">{businessProfile.address || 'Gandhidham, Gujarat'}</p>
              <h2 className="text-base font-bold text-slate-800 mt-2 uppercase">
                Site Expenses Register &amp; Audit Report
              </h2>
            </div>
            <div className="text-right text-xs text-slate-600">
              <div>Date: {new Date().toLocaleDateString('en-IN')}</div>
              <div>Filter: {selectedCategory === 'ALL' ? 'All 7 Categories' : selectedCategory}</div>
              <div>Site: {selectedSite === 'ALL' ? 'All Sites' : selectedSite}</div>
              <div className="font-bold text-slate-900 mt-1">Total: ₹ {formatIndianCurrency(filteredTotal)}</div>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date &amp; Voucher</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Project Site</th>
                <th className="py-3 px-4">Expense Details &amp; Payee</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <HardHat className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No site expenses found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchTerm || selectedCategory !== 'ALL' || selectedSite !== 'ALL'
                        ? 'Try clearing your filters or search terms.'
                        : 'Click "Record Site Expense" to log your first project cost.'}
                    </p>
                    <button
                      onClick={handleOpenAddModal}
                      className="mt-4 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer no-print"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Expense Now</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const catConfig = SITE_EXPENSE_CATEGORIES.find(c => c.category === exp.category) || SITE_EXPENSE_CATEGORIES[0];
                  const Icon = catConfig.icon;

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date & Voucher */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{exp.date}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {exp.receiptNumber || 'VOU-SITE'}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg ${catConfig.bgColor} ${catConfig.color} flex items-center justify-center shrink-0`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block leading-tight">
                              {exp.category}
                            </span>
                            {exp.approvedBy && (
                              <span className="text-[10px] text-slate-400 block">
                                Appr: {exp.approvedBy}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Project Site */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{exp.siteName}</span>
                        </div>
                      </td>

                      {/* Expense Details & Payee */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 leading-snug">{exp.title}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                          {exp.paidTo && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>Paid to: <strong className="text-slate-700">{exp.paidTo}</strong></span>
                            </span>
                          )}
                          {exp.notes && (
                            <span className="text-slate-400 italic truncate max-w-xs">
                              • {exp.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {exp.paymentMode}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="text-sm font-black text-slate-900 font-mono">
                          ₹ {formatIndianCurrency(exp.amount)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingExpense(exp)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                            title="View Voucher Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {/* Dedicated Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(exp)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-900 border border-amber-200 hover:border-amber-300 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                            title="Edit Site Expense"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setExpenseToDelete(exp)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer active:scale-95 border border-transparent hover:border-rose-200"
                            title="Delete Site Expense"
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
            {filteredExpenses.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-right uppercase tracking-wider text-[11px]">
                    Total Site Expenses ({filteredExpenses.length} entries):
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-black text-blue-700 font-mono">
                    ₹ {formatIndianCurrency(filteredTotal)}
                  </td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 4. Record New Site Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${editingExpense ? 'bg-amber-600' : 'bg-blue-600'}`}>
                  {editingExpense ? <Pencil className="w-4 h-4" /> : <HardHat className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    {editingExpense ? 'Edit Site Expense' : 'Record Site Expense'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {editingExpense ? 'Update site cost voucher details' : 'Add operational costs for project site'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Category Selector (Strictly 7 Categories) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Expense Category (Select 1 of 7) *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as SiteExpenseCategory })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all cursor-pointer"
                  required
                >
                  {SITE_EXPENSE_CATEGORIES.map(c => (
                    <option key={c.category} value={c.category}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {SITE_EXPENSE_CATEGORIES.find(c => c.category === formData.category)?.shortDesc}
                </p>
              </div>

              {/* Site Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Project Site Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter project site name (e.g. HIGC Gujarat Site)..."
                  value={formData.siteName}
                  onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Expense Title / Purpose *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Travel tickets for 3 technicians, Monthly room rent, Generator diesel..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              {/* Amount & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
              </div>

              {/* Payee & Payment Mode Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Paid To / Vendor / Worker
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar, Petrol Pump, Tea Stall..."
                    value={formData.paidTo}
                    onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Mode *
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as PaymentMode })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="NEFT_RTGS">NEFT / RTGS / Net Banking</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Receipt No & Approved By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Voucher / Receipt No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VOU-789, REC-120"
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Approved By
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Site Engineer / Project Manager"
                    value={formData.approvedBy}
                    onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Remarks / Site Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional remarks, vehicle meter reading, fuel quantity, or specific site references..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer text-white ${editingExpense ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {editingExpense ? 'Update Site Expense' : 'Save Site Expense'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. View Voucher Details Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">
                  VOUCHER #{viewingExpense.receiptNumber || viewingExpense.id}
                </span>
                <h3 className="text-base font-black">{viewingExpense.category}</h3>
              </div>
              <button
                onClick={() => setViewingExpense(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <div className="text-slate-500 font-medium">Expense Amount</div>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                  ₹ {formatIndianCurrency(viewingExpense.amount)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Paid via {viewingExpense.paymentMode} on {viewingExpense.date}
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Title:</span>
                  <span className="font-bold text-slate-900 text-right">{viewingExpense.title}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Project Site:</span>
                  <span className="font-bold text-slate-900 text-right">{viewingExpense.siteName}</span>
                </div>
                {viewingExpense.paidTo && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Paid To / Payee:</span>
                    <span className="font-bold text-slate-900 text-right">{viewingExpense.paidTo}</span>
                  </div>
                )}
                {viewingExpense.approvedBy && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Approved By:</span>
                    <span className="font-bold text-emerald-700 text-right">{viewingExpense.approvedBy}</span>
                  </div>
                )}
                {viewingExpense.notes && (
                  <div className="py-1">
                    <span className="text-slate-500 font-medium block mb-1">Remarks &amp; Site Notes:</span>
                    <p className="bg-slate-50 p-2.5 rounded-lg text-slate-800 leading-relaxed font-normal">
                      {viewingExpense.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setViewingExpense(null)}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(expenseToDelete)}
        title="Delete Site Expense"
        message={`Are you sure you want to delete this site expense "${expenseToDelete?.title || expenseToDelete?.category}" of ₹${expenseToDelete?.amount || ''}?`}
        confirmLabel="Delete Now"
        onConfirm={() => {
          if (expenseToDelete) {
            onDeleteSiteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
          }
        }}
        onCancel={() => setExpenseToDelete(null)}
      />

    </div>
  );
};
