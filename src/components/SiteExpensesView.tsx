import React, { useState, useMemo } from 'react';
import { 
  HardHat, Plane, Home, Coffee, Truck, Building2, 
  Layers, Plus, Search, Download, 
  Printer, Trash2, MapPin, User,
  FileText, X, Eye, Pencil, CreditCard, Smartphone, Landmark, Phone
} from 'lucide-react';
import { SiteExpense, SiteExpenseCategory, PaymentMode, BusinessProfile } from '../types';
import { formatIndianCurrency, downloadCSV } from '../utils/gstCalculations';

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
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30 hover:border-cyan-400',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300',
  },
  {
    category: 'Labour Accommodation & Food Expenses',
    label: 'Labour Accommodation & Food Expenses',
    shortDesc: 'Labour camp rent, mess ration, kitchen fuel & living',
    icon: Home,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30 hover:border-emerald-400',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
  },
  {
    category: 'Site Refreshment Expenses',
    label: 'Site Refreshment Expenses',
    shortDesc: 'Daily worker tea, snacks, RO water jars & refreshments',
    icon: Coffee,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30 hover:border-amber-400',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
  },
  {
    category: 'Vehicle & Fuel Expenses',
    label: 'Vehicle & Fuel Expenses',
    shortDesc: 'Diesel for hydra, crane, generator & site vehicle maintenance',
    icon: Truck,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30 hover:border-indigo-400',
    badgeBg: 'bg-indigo-500/20',
    badgeText: 'text-indigo-300',
  },
  {
    category: 'Site Office Expenses',
    label: 'Site Office Expenses',
    shortDesc: 'Portacabin supplies, blueprints, stationery & site Wi-Fi',
    icon: Building2,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30 hover:border-sky-400',
    badgeBg: 'bg-sky-500/20',
    badgeText: 'text-sky-300',
  },
  {
    category: 'Miscellaneous Site Expenses',
    label: 'Miscellaneous Site Expenses',
    shortDesc: 'Emergency hardware, safety tapes, tool repairs & petty cash',
    icon: Layers,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30 hover:border-rose-400',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
  },
  {
    category: 'Site Overheads',
    label: 'Site Overheads',
    shortDesc: 'Site security guards, DG set backup power, safety helmets',
    icon: HardHat,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30 hover:border-purple-400',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300',
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

  // Form State for Recording New Site Expense
  const [formData, setFormData] = useState({
    title: '',
    category: 'Site Travelling Expenses' as SiteExpenseCategory,
    siteName: '',
    customSite: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paidTo: '',
    paymentMode: 'CASH' as PaymentMode,
    receiptNumber: '',
    approvedBy: 'Site Engineer',
    notes: '',
    // Account & UPI Destination Details
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    ifscCode: '',
    upiId: '',
    payeePhone: '',
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
    return siteExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [siteExpenses]);

  // Category-wise totals & counts
  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number }> = {};
    SITE_EXPENSE_CATEGORIES.forEach(c => {
      stats[c.category] = { total: 0, count: 0 };
    });
    siteExpenses.forEach(exp => {
      if (!stats[exp.category]) {
        stats[exp.category] = { total: 0, count: 0 };
      }
      stats[exp.category].total += exp.amount || 0;
      stats[exp.category].count += 1;
    });
    return stats;
  }, [siteExpenses]);

  // Available unique months
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    siteExpenses.forEach(exp => {
      if (exp.date) {
        set.add(exp.date.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(set).sort().reverse();
  }, [siteExpenses]);

  // Filtered site expenses
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
    });
  }, [siteExpenses, searchTerm, selectedCategory, selectedSite, selectedMonth]);

  // Filtered Total
  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredExpenses]);

  // Modal Handlers
  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormData({
      title: '',
      category: 'Site Travelling Expenses',
      siteName: '',
      customSite: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paidTo: '',
      paymentMode: 'CASH',
      receiptNumber: `STE-${new Date().getFullYear()}-${String(siteExpenses.length + 1).padStart(3, '0')}`,
      approvedBy: 'Site Engineer',
      notes: '',
      accountHolderName: '',
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      upiId: '',
      payeePhone: '',
    });
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingExpense(null);
  };

  const handleStartEdit = (exp: SiteExpense) => {
    setEditingExpense(exp);
    setFormData({
      title: exp.title || '',
      category: exp.category,
      siteName: exp.siteName || '',
      customSite: '',
      amount: exp.amount ? exp.amount.toString() : '',
      date: exp.date || new Date().toISOString().split('T')[0],
      paidTo: exp.paidTo || '',
      paymentMode: exp.paymentMode || 'CASH',
      receiptNumber: exp.receiptNumber || '',
      approvedBy: exp.approvedBy || '',
      notes: exp.notes || '',
      accountHolderName: exp.accountHolderName || '',
      accountNumber: exp.accountNumber || '',
      bankName: exp.bankName || '',
      ifscCode: exp.ifscCode || '',
      upiId: exp.upiId || '',
      payeePhone: exp.payeePhone || '',
    });
    setIsAddModalOpen(true);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = parseFloat(formData.amount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return;
    }

    const finalSite = formData.siteName.trim() || 'Project Site';

    const payload = {
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
      accountHolderName: formData.accountHolderName.trim() || undefined,
      accountNumber: formData.accountNumber.trim() || undefined,
      bankName: formData.bankName.trim() || undefined,
      ifscCode: formData.ifscCode.trim().toUpperCase() || undefined,
      upiId: formData.upiId.trim() || undefined,
      payeePhone: formData.payeePhone.trim() || undefined,
    };

    if (editingExpense) {
      onUpdateSiteExpense({
        ...editingExpense,
        ...payload,
      });
    } else {
      onAddSiteExpense(payload);
    }

    // Reset and close
    setEditingExpense(null);
    setFormData({
      title: '',
      category: 'Site Travelling Expenses',
      siteName: '',
      customSite: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paidTo: '',
      paymentMode: 'CASH',
      receiptNumber: '',
      approvedBy: 'Site Engineer',
      notes: '',
      accountHolderName: '',
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      upiId: '',
      payeePhone: '',
    });
    setIsAddModalOpen(false);
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Voucher / Receipt #',
      'Expense Category',
      'Project Site',
      'Expense Title',
      'Paid To / Payee',
      'Payment Mode',
      'Amount (INR)',
      'Account Holder',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'UPI ID',
      'Payee Mobile',
      'Approved By',
      'Remarks',
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
      `"${(exp.accountHolderName || 'N/A').replace(/"/g, '""')}"`,
      `"${(exp.bankName || 'N/A').replace(/"/g, '""')}"`,
      `"${(exp.accountNumber || 'N/A').replace(/"/g, '""')}"`,
      `"${(exp.ifscCode || 'N/A').replace(/"/g, '""')}"`,
      `"${(exp.upiId || 'N/A').replace(/"/g, '""')}"`,
      `"${(exp.payeePhone || 'N/A').replace(/"/g, '""')}"`,
      `"${(exp.approvedBy || 'N/A').replace(/"/g, '""')}"`,
      `"${(exp.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, `SR_Group_Site_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Direct print handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-12 text-slate-100">
      {/* 1. Header Banner matching reference image */}
      <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] p-5 sm:p-6 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Description */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-sky-400 text-white flex items-center justify-center shadow-[0_0_18px_rgba(6,182,212,0.4)] shrink-0">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-heading">
                  Site Expenses
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  7 Expense Categories
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0a1538] text-slate-300 border border-[#1a2c5a]">
                  {businessProfile.name || 'SR Group'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Record and manage all project site operational costs, labour accommodation, vehicle fuel, refreshments, and on-site overheads.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-[#09122e] hover:bg-[#0f1d44] text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-[#172654]"
              title="Download CSV Spreadsheet"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-[#09122e] hover:bg-[#0f1d44] text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-[#172654]"
              title="Print Site Expenses Report"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Print Report</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-400/40 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Record Site Expense</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#14234b]">
          <div className="bg-[#09122e]/90 rounded-xl p-3 border border-[#172654]">
            <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Site Expenses</div>
            <div className="text-lg sm:text-xl font-black text-white font-mono mt-0.5">
              ₹ {formatIndianCurrency(totalSiteAmount)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Across {siteExpenses.length} transactions</div>
          </div>

          <div className="bg-[#09122e]/90 rounded-xl p-3 border border-[#172654]">
            <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Filtered View Total</div>
            <div className="text-lg sm:text-xl font-black text-cyan-400 font-mono mt-0.5">
              ₹ {formatIndianCurrency(filteredTotal)}
            </div>
            <div className="text-[10px] text-cyan-300/80 font-medium mt-0.5">{filteredExpenses.length} matching entries</div>
          </div>

          <div className="bg-[#09122e]/90 rounded-xl p-3 border border-[#172654]">
            <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Active Site Locations</div>
            <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
              {allSiteNames.length} Sites
            </div>
            <div className="text-[10px] text-emerald-300/80 font-medium mt-0.5">Project sites active</div>
          </div>

          <div className="bg-[#09122e]/90 rounded-xl p-3 border border-[#172654]">
            <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Active Categories</div>
            <div className="text-lg sm:text-xl font-black text-purple-400 mt-0.5">
              7 Categories
            </div>
            <div className="text-[10px] text-purple-300/80 font-medium mt-0.5">100% On-Site Breakdown</div>
          </div>
        </div>
      </div>

      {/* 2. All 7 Expense Categories: Modern Cards Grid */}
      <div className="no-print">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400/90 font-heading">
              Site Expense Categories (7)
            </h2>
            <p className="text-[11px] text-slate-400">
              Click any card to immediately filter recorded site expenses by category
            </p>
          </div>
          {selectedCategory !== 'ALL' && (
            <button
              onClick={() => setSelectedCategory('ALL')}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Reset Filter</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                className={`bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border p-4 transition-all cursor-pointer relative overflow-hidden group shadow-[0_4px_20px_rgba(0,0,0,0.4)] ${
                  isSelected 
                    ? 'ring-2 ring-cyan-500 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] bg-[#0c1840]' 
                    : `${cat.borderColor} hover:border-cyan-500/50 hover:bg-[#0a1438]`
                }`}
              >
                {/* Top Row: Category Number & Icon */}
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-9 h-9 rounded-xl ${cat.bgColor} ${cat.color} flex items-center justify-center shrink-0 border border-current/20 transition-transform group-hover:scale-105`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">
                      #{index + 1}
                    </span>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                      {stats.count} {stats.count === 1 ? 'entry' : 'entries'}
                    </div>
                  </div>
                </div>

                {/* Category Title */}
                <h3 className="font-bold text-xs sm:text-sm text-white mt-3 leading-snug line-clamp-1 font-heading">
                  {cat.label}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                  {cat.shortDesc}
                </p>

                {/* Bottom Row: Amount & Share */}
                <div className="mt-3.5 pt-2.5 border-t border-[#14234b] flex items-center justify-between">
                  <div>
                    <div className="text-[9.5px] text-slate-400 font-semibold uppercase">Total Spent</div>
                    <div className="text-sm sm:text-base font-black text-white font-mono">
                      ₹ {formatIndianCurrency(stats.total)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.badgeBg} ${cat.badgeText} border border-current/30`}>
                      {percentOfTotal}% share
                    </span>
                  </div>
                </div>

                {/* Active Indicator Bar */}
                {isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Detailed Site Expenses Register Table & Controls */}
      <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] overflow-hidden">
        
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#14234b] bg-[#09122e]/60 no-print space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search expense, site name, payee, voucher #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
                className="px-3 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500/70 cursor-pointer"
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
                className="px-3 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500/70 cursor-pointer"
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
                className="px-3 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500/70 cursor-pointer"
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
                  className="px-2.5 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
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
            <thead className="bg-[#09122e] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-[#14234b]">
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
            <tbody className="divide-y divide-[#101b3d]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-[#09122e] border border-[#172654] text-cyan-400 flex items-center justify-center mx-auto mb-3">
                      <HardHat className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-white">No site expenses found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || selectedCategory !== 'ALL' || selectedSite !== 'ALL'
                        ? 'Try clearing your filters or search terms.'
                        : 'Click "Record Site Expense" to log your first project cost.'}
                    </p>
                    <button
                      onClick={handleOpenAddModal}
                      className="mt-4 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs rounded-xl shadow-[0_0_12px_rgba(6,182,212,0.4)] inline-flex items-center gap-1.5 cursor-pointer no-print"
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
                    <tr key={exp.id} className="hover:bg-[#0c183d]/60 transition-colors">
                      {/* Date & Voucher */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-white font-mono">{exp.date}</div>
                        <div className="text-[10px] font-mono text-cyan-400/80">
                          {exp.receiptNumber || 'VOU-SITE'}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg ${catConfig.bgColor} ${catConfig.color} flex items-center justify-center shrink-0 border border-current/20`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-200 block leading-tight">
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
                        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{exp.siteName}</span>
                        </div>
                      </td>

                      {/* Expense Details & Payee */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white leading-snug">{exp.title}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                          {exp.paidTo && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-cyan-400" />
                              <span>Paid to: <strong className="text-slate-200">{exp.paidTo}</strong></span>
                            </span>
                          )}
                          {exp.accountNumber && (
                            <span className="flex items-center gap-1 text-[10px] bg-blue-500/15 text-cyan-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono">
                              <Landmark className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span>A/c: {exp.accountNumber}{exp.bankName ? ` (${exp.bankName})` : ''}</span>
                            </span>
                          )}
                          {exp.upiId && (
                            <span className="flex items-center gap-1 text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-mono">
                              <Smartphone className="w-3 h-3 text-purple-400 shrink-0" />
                              <span>UPI: {exp.upiId}</span>
                            </span>
                          )}
                          {exp.payeePhone && !exp.upiId && (
                            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                              <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>Mob: {exp.payeePhone}</span>
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
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#09122e] text-slate-300 border border-[#1b2b5d] inline-block">
                          {exp.paymentMode}
                        </span>
                        {exp.upiId && (
                          <div className="text-[10px] text-purple-300 font-mono mt-0.5 truncate max-w-[120px]" title={exp.upiId}>
                            {exp.upiId}
                          </div>
                        )}
                        {!exp.upiId && exp.accountNumber && (
                          <div className="text-[10px] text-cyan-300 font-mono mt-0.5 truncate max-w-[120px]" title={exp.accountNumber}>
                            A/c: ...{exp.accountNumber.slice(-4)}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="text-sm font-black text-cyan-300 font-mono">
                          ₹ {formatIndianCurrency(exp.amount)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Voucher Details Button */}
                          <button
                            type="button"
                            onClick={() => setViewingExpense(exp)}
                            className="p-1.5 text-cyan-400 hover:text-white hover:bg-cyan-500/20 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-cyan-500/30"
                            title="View Voucher Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {/* Dedicated Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(exp)}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                            title="Edit Site Expense"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* 1-Click Instant Delete Button */}
                          <button
                            type="button"
                            onClick={() => onDeleteSiteExpense(exp.id)}
                            className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer active:scale-95 border border-transparent hover:border-rose-500/30"
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
              <tfoot className="bg-[#09122e] font-bold border-t border-[#14234b] text-slate-200">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-right uppercase tracking-wider text-[11px] text-slate-400">
                    Total Site Expenses ({filteredExpenses.length} entries):
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-black text-cyan-300 font-mono">
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#070e24] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[#14234b] w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#09122e] border-b border-[#14234b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${editingExpense ? 'bg-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.4)]'}`}>
                  {editingExpense ? <Pencil className="w-4 h-4" /> : <HardHat className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight font-heading">
                    {editingExpense ? 'Edit Site Expense' : 'Record Site Expense'}
                  </h3>
                  <p className="text-xs text-slate-400">
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto custom-scrollbar">
              
              {/* Category Selector (Strictly 7 Categories) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Expense Category (Select 1 of 7) *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as SiteExpenseCategory })}
                  className="w-full px-3.5 py-2.5 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all cursor-pointer"
                  required
                >
                  {SITE_EXPENSE_CATEGORIES.map(c => (
                    <option key={c.category} value={c.category} className="bg-[#09122e] text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {SITE_EXPENSE_CATEGORIES.find(c => c.category === formData.category)?.shortDesc}
                </p>
              </div>

              {/* Site Location */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Project Site Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter project site name..."
                  value={formData.siteName}
                  onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  required
                />
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Expense Title / Purpose *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Travel tickets for 3 technicians, Monthly room rent, Generator diesel..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50"
                  required
                />
              </div>

              {/* Amount & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full pl-8 pr-3.5 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs font-black text-cyan-300 font-mono focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50"
                    required
                  />
                </div>
              </div>

              {/* Payee & Payment Mode Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Paid To / Vendor / Worker
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar, Petrol Pump, Tea Stall..."
                    value={formData.paidTo}
                    onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Payment Mode *
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as PaymentMode })}
                    className="w-full px-3.5 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-cyan-500/70 cursor-pointer"
                  >
                    <option value="CASH" className="bg-[#09122e] text-white">Cash</option>
                    <option value="UPI" className="bg-[#09122e] text-white">UPI / GPay / PhonePe</option>
                    <option value="NEFT_RTGS" className="bg-[#09122e] text-white">NEFT / RTGS / Net Banking</option>
                    <option value="CARD" className="bg-[#09122e] text-white">Debit / Credit Card</option>
                    <option value="CHEQUE" className="bg-[#09122e] text-white">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Payment Destination / Transfer Details Section (Account & UPI) */}
              <div className="p-4 bg-[#050b1d] border border-cyan-500/30 rounded-xl space-y-3.5 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-[#14234b]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Payment Destination (Account / UPI Details)
                      </span>
                      <span className="text-[10px] text-cyan-400/90 block">
                        Kiske account ya UPI me payment bheja gaya hai
                      </span>
                    </div>
                  </div>
                  {formData.paymentMode === 'UPI' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      UPI Payment
                    </span>
                  ) : formData.paymentMode === 'NEFT_RTGS' || formData.paymentMode === 'CHEQUE' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                      Bank Transfer
                    </span>
                  ) : null}
                </div>

                {/* Bank Account Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300">
                    <Landmark className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Bank Account Details (Account Transfer)</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Kumar / Vendor Name"
                        value={formData.accountHolderName}
                        onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                        className="w-full px-3 py-1.5 bg-[#09122e] border border-[#1b2b5d] rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/70"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 50100458921345"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        className="w-full px-3 py-1.5 bg-[#09122e] border border-[#1b2b5d] rounded-lg text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/70"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC Bank, SBI, ICICI Bank"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full px-3 py-1.5 bg-[#09122e] border border-[#1b2b5d] rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/70"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC0001234 / SBIN0004567"
                        value={formData.ifscCode}
                        onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-1.5 bg-[#09122e] border border-[#1b2b5d] rounded-lg text-xs text-white font-mono uppercase placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/70"
                      />
                    </div>
                  </div>
                </div>

                {/* UPI & Mobile Details */}
                <div className="pt-2.5 border-t border-[#14234b]/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-300">
                    <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                    <span>UPI &amp; Mobile Transfer Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        UPI ID / VPA
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ramesh@okhdfcbank / 9876543210@paytm"
                        value={formData.upiId}
                        onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                        className="w-full px-3 py-1.5 bg-[#09122e] border border-[#1b2b5d] rounded-lg text-xs text-cyan-300 font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/70"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Payee Mobile Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 9876543210"
                        value={formData.payeePhone}
                        onChange={(e) => setFormData({ ...formData, payeePhone: e.target.value })}
                        className="w-full px-3 py-1.5 bg-[#09122e] border border-[#1b2b5d] rounded-lg text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/70"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Receipt No & Approved By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Voucher / Receipt No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VOU-789, REC-120"
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500/70"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Approved By
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Site Engineer / Project Manager"
                    value={formData.approvedBy}
                    onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/70"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Remarks / Site Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional remarks, vehicle meter reading, fuel quantity, or specific site references..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500/70 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#14234b] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-[#09122e] hover:bg-[#0f1d44] border border-[#172654] text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer text-white active:scale-95 ${
                    editingExpense 
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-400/40'
                  }`}
                >
                  {editingExpense ? 'Update Site Expense' : 'Save Site Expense'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. View Voucher Details Modal with Edit and 1-Click Delete */}
      {viewingExpense && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#070e24] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[#14234b] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-[#09122e] border-b border-[#14234b] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold">
                  VOUCHER #{viewingExpense.receiptNumber || viewingExpense.id}
                </span>
                <h3 className="text-base font-black font-heading">{viewingExpense.category}</h3>
              </div>
              <button
                onClick={() => setViewingExpense(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-[#09122e] p-4 rounded-xl border border-[#172654] text-center">
                <div className="text-slate-400 font-medium">Expense Amount</div>
                <div className="text-2xl font-black text-cyan-300 font-mono mt-1">
                  ₹ {formatIndianCurrency(viewingExpense.amount)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Paid via {viewingExpense.paymentMode} on {viewingExpense.date}
                </div>
              </div>

              <div className="space-y-2 border-t border-[#14234b] pt-3 text-slate-300">
                <div className="flex justify-between py-1 border-b border-[#101b3d]">
                  <span className="text-slate-400 font-medium">Title:</span>
                  <span className="font-bold text-white text-right">{viewingExpense.title}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#101b3d]">
                  <span className="text-slate-400 font-medium">Project Site:</span>
                  <span className="font-bold text-white text-right">{viewingExpense.siteName}</span>
                </div>
                {viewingExpense.paidTo && (
                  <div className="flex justify-between py-1 border-b border-[#101b3d]">
                    <span className="text-slate-400 font-medium">Paid To / Payee:</span>
                    <span className="font-bold text-white text-right">{viewingExpense.paidTo}</span>
                  </div>
                )}
                {viewingExpense.approvedBy && (
                  <div className="flex justify-between py-1 border-b border-[#101b3d]">
                    <span className="text-slate-400 font-medium">Approved By:</span>
                    <span className="font-bold text-emerald-400 text-right">{viewingExpense.approvedBy}</span>
                  </div>
                )}

                {/* Bank / UPI Destination Details */}
                {(viewingExpense.accountNumber || viewingExpense.accountHolderName || viewingExpense.bankName || viewingExpense.ifscCode || viewingExpense.upiId || viewingExpense.payeePhone) && (
                  <div className="p-3 bg-[#050b1d] rounded-xl border border-cyan-500/30 space-y-2 mt-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Payment Destination Details</span>
                    </div>

                    {/* Bank Details */}
                    {(viewingExpense.accountNumber || viewingExpense.accountHolderName || viewingExpense.bankName || viewingExpense.ifscCode) && (
                      <div className="space-y-1 text-[11px]">
                        {viewingExpense.accountHolderName && (
                          <div className="flex justify-between py-0.5 border-b border-[#101b3d]">
                            <span className="text-slate-400">A/c Holder:</span>
                            <span className="font-semibold text-white">{viewingExpense.accountHolderName}</span>
                          </div>
                        )}
                        {viewingExpense.bankName && (
                          <div className="flex justify-between py-0.5 border-b border-[#101b3d]">
                            <span className="text-slate-400">Bank Name:</span>
                            <span className="font-semibold text-white">{viewingExpense.bankName}</span>
                          </div>
                        )}
                        {viewingExpense.accountNumber && (
                          <div className="flex justify-between py-0.5 border-b border-[#101b3d]">
                            <span className="text-slate-400">A/c Number:</span>
                            <span className="font-mono font-bold text-cyan-300">{viewingExpense.accountNumber}</span>
                          </div>
                        )}
                        {viewingExpense.ifscCode && (
                          <div className="flex justify-between py-0.5 border-b border-[#101b3d]">
                            <span className="text-slate-400">IFSC Code:</span>
                            <span className="font-mono font-bold text-white uppercase">{viewingExpense.ifscCode}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* UPI Details */}
                    {(viewingExpense.upiId || viewingExpense.payeePhone) && (
                      <div className="space-y-1 text-[11px] pt-1">
                        {viewingExpense.upiId && (
                          <div className="flex justify-between py-0.5 border-b border-[#101b3d]">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Smartphone className="w-3 h-3 text-purple-400" />
                              <span>UPI ID:</span>
                            </span>
                            <span className="font-mono font-bold text-purple-300">{viewingExpense.upiId}</span>
                          </div>
                        )}
                        {viewingExpense.payeePhone && (
                          <div className="flex justify-between py-0.5 border-b border-[#101b3d]">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-400" />
                              <span>Payee Mobile:</span>
                            </span>
                            <span className="font-mono font-bold text-emerald-300">{viewingExpense.payeePhone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {viewingExpense.notes && (
                  <div className="py-1">
                    <span className="text-slate-400 font-medium block mb-1">Remarks &amp; Site Notes:</span>
                    <p className="bg-[#09122e] p-2.5 rounded-lg text-slate-200 leading-relaxed font-normal border border-[#172654]">
                      {viewingExpense.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer with Edit, Delete, and Close Buttons */}
              <div className="pt-3 border-t border-[#14234b] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = viewingExpense.id;
                    setViewingExpense(null);
                    onDeleteSiteExpense(id);
                  }}
                  className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const exp = viewingExpense;
                      setViewingExpense(null);
                      handleStartEdit(exp);
                    }}
                    className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/30 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Voucher</span>
                  </button>

                  <button
                    onClick={() => setViewingExpense(null)}
                    className="px-4 py-2 bg-[#09122e] hover:bg-[#0f1d44] border border-[#172654] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
