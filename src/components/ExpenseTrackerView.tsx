import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, Download, Trash2, Calendar, 
  TrendingDown, TrendingUp, IndianRupee, PieChart, 
  FileText, CheckCircle2, AlertCircle, Tag, Wallet, ArrowUpRight
} from 'lucide-react';
import { Expense, PaymentMode, Invoice, Item } from '../types';

interface ExpenseTrackerViewProps {
  expenses: Expense[];
  invoices: Invoice[];
  items: Item[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  onDeleteExpense: (id: string) => void;
}

const EXPENSE_CATEGORIES = [
  'Rent & Lease',
  'Salaries & Wages',
  'Electricity & Utilities',
  'Logistics & Freight',
  'Tea & Refreshments',
  'Packaging & Supplies',
  'Office Stationery',
  'Marketing & Ads',
  'Repairs & Maintenance',
  'Internet & Phone',
  'Bank Charges & Fees',
  'Taxes & Legal',
  'Miscellaneous'
];

export const ExpenseTrackerView: React.FC<ExpenseTrackerViewProps> = ({
  expenses = [],
  invoices = [],
  items = [],
  onAddExpense,
  onDeleteExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Tea & Refreshments',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    partyName: '',
    paymentMode: 'CASH' as PaymentMode,
    isGstExpense: false,
    gstin: '',
    taxRate: 18,
    invoiceNumber: '',
    notes: '',
  });

  // Calculate Net Profit & Loss (P&L)
  const salesRevenue = useMemo(() => {
    return (invoices || [])
      .filter(inv => inv.documentType === 'TAX_INVOICE')
      .reduce((acc, inv) => acc + (inv.taxableTotal || 0), 0);
  }, [invoices]);

  // Estimated Cost of Goods Sold (COGS)
  const costOfGoodsSold = useMemo(() => {
    return (invoices || [])
      .filter(inv => inv.documentType === 'TAX_INVOICE')
      .reduce((acc, inv) => {
        const costForInvoice = (inv.items || []).reduce((itemAcc, line) => {
          const matchedItem = (items || []).find(i => i.id === line.itemId || i.name === line.name);
          const unitCost = matchedItem ? matchedItem.purchasePrice : line.rate * 0.7; // default 70% cost
          return itemAcc + (unitCost * line.quantity);
        }, 0);
        return acc + costForInvoice;
      }, 0);
  }, [invoices, items]);

  const grossProfit = salesRevenue - costOfGoodsSold;
  const totalExpenses = useMemo(() => {
    return expenses.reduce((acc, exp) => acc + exp.amount, 0);
  }, [expenses]);

  const netProfit = grossProfit - totalExpenses;
  const netMarginPercent = salesRevenue > 0 ? ((netProfit / salesRevenue) * 100).toFixed(1) : '0';

  // Total GST Input Tax Credit (ITC) from expenses
  const totalGstItc = useMemo(() => {
    return expenses
      .filter(exp => exp.isGstExpense)
      .reduce((acc, exp) => acc + ((exp.cgstAmount || 0) + (exp.sgstAmount || 0) + (exp.igstAmount || 0)), 0);
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = 
        exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.partyName && exp.partyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (exp.invoiceNumber && exp.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'ALL' || exp.category === selectedCategory;
      const matchesMonth = selectedMonth === 'ALL' || exp.date.startsWith(selectedMonth);

      return matchesSearch && matchesCategory && matchesMonth;
    });
  }, [expenses, searchTerm, selectedCategory, selectedMonth]);

  // Category breakdown
  const categorySummary = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(exp => {
      map[exp.category] = (map[exp.category] || 0) + exp.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(formData.amount) || 0;
    if (amountVal <= 0 || !formData.title.trim()) {
      alert('Please enter a valid title and amount.');
      return;
    }

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (formData.isGstExpense && formData.taxRate > 0) {
      // Calculate GST portion from taxable or gross
      const taxFactor = formData.taxRate / 100;
      const baseTax = amountVal * taxFactor;
      cgstAmount = parseFloat((baseTax / 2).toFixed(2));
      sgstAmount = parseFloat((baseTax / 2).toFixed(2));
    }

    onAddExpense({
      title: formData.title.trim(),
      category: formData.category,
      amount: amountVal,
      date: formData.date,
      partyName: formData.partyName.trim() || undefined,
      paymentMode: formData.paymentMode,
      isGstExpense: formData.isGstExpense,
      gstin: formData.gstin.trim().toUpperCase() || undefined,
      taxRate: formData.isGstExpense ? formData.taxRate : undefined,
      cgstAmount: formData.isGstExpense ? cgstAmount : undefined,
      sgstAmount: formData.isGstExpense ? sgstAmount : undefined,
      igstAmount: formData.isGstExpense ? igstAmount : undefined,
      invoiceNumber: formData.invoiceNumber.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });

    setFormData({
      title: '',
      category: 'Tea & Refreshments',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      partyName: '',
      paymentMode: 'CASH',
      isGstExpense: false,
      gstin: '',
      taxRate: 18,
      invoiceNumber: '',
      notes: '',
    });
    setIsAddModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Expense Title', 'Category', 'Vendor / Payee', 'Payment Mode', 'Amount (INR)', 'GST Bill?', 'Vendor GSTIN', 'CGST', 'SGST', 'Bill No', 'Notes'];
    const rows = filteredExpenses.map(e => [
      `"${e.date}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${(e.partyName || '').replace(/"/g, '""')}"`,
      `"${e.paymentMode}"`,
      e.amount,
      e.isGstExpense ? 'YES' : 'NO',
      `"${e.gstin || ''}"`,
      e.cgstAmount || 0,
      e.sgstAmount || 0,
      `"${e.invoiceNumber || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SRGroup_Expenses_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#070e24]/95 backdrop-blur-xl p-5 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white font-heading">Expense &amp; Cash Outflow Manager</h1>
            <span className="text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
              P&amp;L Tracker
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track daily business expenses, petty cash, rent, staff salary, and claim GST Input Tax Credit (ITC).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#09122e] hover:bg-[#0e1a3e] border border-[#14234b] text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Expense</span>
          </button>
        </div>
      </div>

      {/* P&L Financial Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Sales Revenue */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl p-4 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Sales Revenue (Taxable)</span>
            <div className="p-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-white">
            ₹{salesRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            From total billed invoices
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl p-4 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Business Expenses</span>
            <div className="p-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-rose-400">
            ₹{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {expenses.length} expense entries recorded
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl p-4 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Estimated Net Profit</span>
            <div className={`p-1.5 rounded-lg border ${netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-xl font-extrabold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ₹{netProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-400">
            Margin: <span className="font-bold text-white">{netMarginPercent}%</span> (After COGS &amp; Operating Expenses)
          </div>
        </div>

        {/* GST ITC Claimable */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl p-4 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>GST ITC Claimable</span>
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-indigo-400">
            ₹{totalGstItc.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Save on monthly GSTR-3B tax payment
          </div>
        </div>

      </div>

      {/* Filter and Category Cards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Category Breakdown list (1 Col) */}
        <div className="bg-[#070e24]/95 backdrop-blur-xl p-5 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-cyan-400" />
              Category-wise Outflows
            </h3>
            <span className="text-[11px] text-slate-400">{categorySummary.length} Categories</span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {categorySummary.map(([cat, amt]) => {
              const percent = totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(0) : '0';
              return (
                <div 
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? 'ALL' : cat)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    selectedCategory === cat 
                      ? 'bg-cyan-500/15 border-cyan-500/50 ring-1 ring-cyan-500/30' 
                      : 'bg-[#09122e] border-[#14234b] hover:bg-[#0e1a3e]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{cat}</span>
                    <span className="font-bold text-white">₹{amt.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 bg-[#070e24] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-cyan-500 h-full rounded-full transition-all" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{percent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses Table (2 Cols) */}
        <div className="lg:col-span-2 bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
          
          {/* Table Controls */}
          <div className="p-4 bg-[#09122e] border-b border-[#14234b] flex flex-wrap items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input
                type="text"
                placeholder="Search expense, vendor, invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#070e24] border border-[#1b2b5d] rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/40"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-[#070e24] border border-[#1b2b5d] rounded-xl text-xs font-medium text-slate-200 focus:border-cyan-500/70"
            >
              <option value="ALL" className="bg-[#070e24] text-slate-200">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c} className="bg-[#070e24] text-slate-200">{c}</option>
              ))}
            </select>

            {/* Quick Reset Filter */}
            {(selectedCategory !== 'ALL' || searchTerm) && (
              <button
                onClick={() => { setSelectedCategory('ALL'); setSearchTerm(''); }}
                className="text-xs text-cyan-400 hover:underline font-semibold cursor-pointer"
              >
                Reset
              </button>
            )}

          </div>

          {/* Table List */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#091433] border-b border-[#172a5a] text-cyan-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date &amp; Details</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">GST ITC</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#101b3d] text-slate-200">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No expenses found. Click "+ Record Expense" to log your first business expense.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#0c183d]/60 transition-colors">
                      
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{exp.title}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{exp.date}</span>
                          {exp.partyName && <span>• {exp.partyName}</span>}
                          {exp.invoiceNumber && <span className="text-cyan-400 font-mono">#{exp.invoiceNumber}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 bg-[#09122e] border border-[#1b2b5d] text-slate-300 rounded-md font-medium text-[11px]">
                          {exp.category}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-300 text-[11px]">
                          {exp.paymentMode}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {exp.isGstExpense ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" />
                              {exp.taxRate}% GST
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              +₹{((exp.cgstAmount || 0) + (exp.sgstAmount || 0) + (exp.igstAmount || 0)).toFixed(0)} ITC
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">No GST</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-rose-300 text-sm">
                          ₹{exp.amount.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#09122e] rounded-lg transition-colors cursor-pointer"
                          title="Delete Expense Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-3 bg-[#09122e] border-t border-[#14234b] flex items-center justify-between text-xs text-slate-400">
            <span>Showing {filteredExpenses.length} of {expenses.length} records</span>
            <span className="font-bold text-white">
              Total Filtered: ₹{filteredExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN')}
            </span>
          </div>

        </div>

      </div>

      {/* Record Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  ₹
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Record Business Expense</h3>
                  <p className="text-xs text-slate-500">Add shop kharcha, rent, utilities, or supplier bill</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 mt-4 text-xs">
              
              {/* Title & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Expense Title / Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Godown Rent, Staff Tea, Office Electricity"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 1500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Paid Via</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as PaymentMode })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="CASH">Cash (Petty / Galla)</option>
                    <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                    <option value="NEFT_RTGS">Bank Transfer (NEFT / RTGS / IMPS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CARD">Debit / Credit Card</option>
                  </select>
                </div>
              </div>

              {/* Vendor / Payee & Invoice No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payee / Vendor Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. MSEDCL, Jai Travels, Tea Stall"
                    value={formData.partyName}
                    onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Bill / Voucher No. (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. BILL-9821"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* GST Tax Invoice & ITC Checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900">
                  <input
                    type="checkbox"
                    checked={formData.isGstExpense}
                    onChange={(e) => setFormData({ ...formData, isGstExpense: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>This is a GST Tax Invoice (Claim ITC)</span>
                </label>

                {formData.isGstExpense && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Vendor GSTIN</label>
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="27AAAAA0000A1Z5"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg uppercase font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">GST Rate (%)</label>
                      <select
                        value={formData.taxRate}
                        onChange={(e) => setFormData({ ...formData, taxRate: parseInt(e.target.value) })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                      >
                        <option value={5}>5% (Freight / Food)</option>
                        <option value={12}>12% (Job work / Printing)</option>
                        <option value={18}>18% (Rent / IT / Services)</option>
                        <option value={28}>28% (Commercial Auto)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Notes / Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Additional remarks..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/20"
                >
                  Save Expense
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
