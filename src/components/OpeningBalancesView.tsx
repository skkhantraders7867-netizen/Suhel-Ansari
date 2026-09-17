import React, { useState } from 'react';
import { 
  Scale, Search, Plus, Save, Check, Printer, Download, 
  ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle, FileText,
  Users, Building2, Calendar, Filter, Sparkles
} from 'lucide-react';
import { Party, Invoice, BusinessProfile, PaymentVoucher } from '../types';
import { formatIndianCurrency } from '../utils/gstCalculations';
import { PartyLedgerPrintModal } from './PartyLedgerPrintModal';

interface OpeningBalancesViewProps {
  parties: Party[];
  invoices: Invoice[];
  businessProfile: BusinessProfile;
  paymentVouchers?: PaymentVoucher[];
  onUpdateParty: (party: Party) => void;
  onAddNewParty: (party: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>) => Party;
}

export const OpeningBalancesView: React.FC<OpeningBalancesViewProps> = ({
  parties,
  invoices,
  businessProfile,
  paymentVouchers = [],
  onUpdateParty,
  onAddNewParty,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL');
  const [filterBalance, setFilterBalance] = useState<'ALL' | 'WITH_OPENING' | 'ZERO_OPENING'>('ALL');
  const [financialYear, setFinancialYear] = useState('2025-26');
  
  // Local state for inline editing party opening balances: { [partyId]: { amount, type, date } }
  const [editingRows, setEditingRows] = useState<Record<string, { amount: number; type: 'DR' | 'CR'; date: string }>>(() => {
    const initial: Record<string, { amount: number; type: 'DR' | 'CR'; date: string }> = {};
    parties.forEach(p => {
      initial[p.id] = {
        amount: Math.abs(p.openingBalance || 0),
        type: p.openingBalanceType || ((p.openingBalance || 0) < 0 ? 'CR' : 'DR'),
        date: p.openingBalanceDate || '2025-04-01',
      };
    });
    return initial;
  });

  // Saved status tracker for visual confirmation: { [partyId]: boolean }
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
  const [globalSavedMsg, setGlobalSavedMsg] = useState<string | null>(null);

  // Selected party for Statement/Ledger Modal
  const [selectedPartyForLedger, setSelectedPartyForLedger] = useState<Party | null>(null);

  // Quick Add Party Modal
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyType, setNewPartyType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [newPartyGstin, setNewPartyGstin] = useState('');
  const [newPartyCity, setNewPartyCity] = useState('');
  const [newPartyAmount, setNewPartyAmount] = useState<number>(0);
  const [newPartyBalanceType, setNewPartyBalanceType] = useState<'DR' | 'CR'>('DR');
  const [newPartyDate, setNewPartyDate] = useState('2025-04-01');

  // Keep editing state in sync when parties list changes from outside
  React.useEffect(() => {
    setEditingRows(prev => {
      const next = { ...prev };
      parties.forEach(p => {
        if (!next[p.id]) {
          next[p.id] = {
            amount: Math.abs(p.openingBalance || 0),
            type: p.openingBalanceType || ((p.openingBalance || 0) < 0 ? 'CR' : 'DR'),
            date: p.openingBalanceDate || '2025-04-01',
          };
        }
      });
      return next;
    });
  }, [parties]);

  // Handle single row save
  const handleSaveRow = (partyId: string) => {
    const row = editingRows[partyId];
    const party = parties.find(p => p.id === partyId);
    if (!row || !party) return;

    const signedAmount = row.type === 'CR' ? -Math.abs(row.amount) : Math.abs(row.amount);
    
    // Calculate difference to adjust currentBalance
    const oldOpening = party.openingBalance || 0;
    const diff = signedAmount - oldOpening;
    const newCurrent = (party.currentBalance || 0) + diff;

    const updatedParty: Party = {
      ...party,
      openingBalance: signedAmount,
      openingBalanceType: row.type,
      openingBalanceDate: row.date,
      currentBalance: newCurrent,
    };

    onUpdateParty(updatedParty);

    // Show temporary check
    setSavedStatus(prev => ({ ...prev, [partyId]: true }));
    setTimeout(() => {
      setSavedStatus(prev => ({ ...prev, [partyId]: false }));
    }, 2500);
  };

  // Handle Save All Changes
  const handleSaveAll = () => {
    let count = 0;
    parties.forEach(party => {
      const row = editingRows[party.id];
      if (row) {
        const signedAmount = row.type === 'CR' ? -Math.abs(row.amount) : Math.abs(row.amount);
        const oldOpening = party.openingBalance || 0;
        if (signedAmount !== oldOpening || row.type !== party.openingBalanceType || row.date !== party.openingBalanceDate) {
          const diff = signedAmount - oldOpening;
          const updatedParty: Party = {
            ...party,
            openingBalance: signedAmount,
            openingBalanceType: row.type,
            openingBalanceDate: row.date,
            currentBalance: (party.currentBalance || 0) + diff,
          };
          onUpdateParty(updatedParty);
          count++;
        }
      }
    });

    setGlobalSavedMsg(`All ${count > 0 ? count : 'unchanged'} party opening balances saved & persisted to cloud database!`);
    setTimeout(() => setGlobalSavedMsg(null), 4000);
  };

  // Handle Quick Add Party
  const handleQuickAddParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) return;

    const signed = newPartyBalanceType === 'CR' ? -Math.abs(newPartyAmount) : Math.abs(newPartyAmount);

    const added = onAddNewParty({
      type: newPartyType,
      name: newPartyName.trim(),
      phone: newPartyPhone.trim(),
      gstin: newPartyGstin.trim().toUpperCase() || undefined,
      city: newPartyCity.trim() || '',
      state: businessProfile.state || 'Delhi',
      stateCode: businessProfile.stateCode || '07',
      billingAddress: newPartyCity.trim() || '',
      pincode: businessProfile.pincode || '',
      openingBalance: signed,
      openingBalanceType: newPartyBalanceType,
      openingBalanceDate: newPartyDate,
    });

    setIsAddPartyOpen(false);
    setNewPartyName('');
    setNewPartyPhone('');
    setNewPartyGstin('');
    setNewPartyCity('');
    setNewPartyAmount(0);

    setGlobalSavedMsg(`Party "${added.name}" added with opening balance of ${formatIndianCurrency(newPartyAmount)}!`);
    setTimeout(() => setGlobalSavedMsg(null), 4000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Party ID', 'Party Name', 'Type', 'Phone', 'GSTIN', 'City', 'Opening Balance (Rs)', 'Balance Type', 'As On Date', 'Current Outstanding (Rs)'];
    const rows = parties.map(p => {
      const row = editingRows[p.id] || {
        amount: Math.abs(p.openingBalance || 0),
        type: p.openingBalanceType || 'DR',
        date: p.openingBalanceDate || '2025-04-01',
      };
      return [
        `"${p.id}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        p.type,
        `"${p.phone || ''}"`,
        `"${p.gstin || ''}"`,
        `"${p.city || ''}"`,
        row.amount,
        row.type,
        row.date,
        p.currentBalance || 0,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Opening_Balances_Schedule_${financialYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print schedule
  const handlePrintSchedule = () => {
    window.print();
  };

  // Filtered parties list
  const filteredParties = parties.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone && p.phone.includes(searchTerm)) ||
      (p.gstin && p.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.city && p.city.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'ALL' || p.type === filterType;

    const row = editingRows[p.id];
    const amount = row ? row.amount : Math.abs(p.openingBalance || 0);
    const matchesBalance = 
      filterBalance === 'ALL' ||
      (filterBalance === 'WITH_OPENING' && amount > 0) ||
      (filterBalance === 'ZERO_OPENING' && amount === 0);

    return matchesSearch && matchesType && matchesBalance;
  });

  // Calculate KPIs
  let totalDrAmount = 0;
  let totalCrAmount = 0;
  let partiesWithOpeningCount = 0;

  parties.forEach(p => {
    const row = editingRows[p.id];
    const amt = row ? row.amount : Math.abs(p.openingBalance || 0);
    const type = row ? row.type : (p.openingBalanceType || 'DR');

    if (amt > 0) {
      partiesWithOpeningCount++;
      if (type === 'DR') {
        totalDrAmount += amt;
      } else {
        totalCrAmount += amt;
      }
    }
  });

  const netOpeningPosition = totalDrAmount - totalCrAmount;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-800 rounded-xl border border-amber-300/40">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Opening Balance Register &amp; Persistence
              </h1>
              <p className="text-xs text-slate-500">
                Manage, save, and persist customer &amp; vendor opening balances (DR/CR) as on Financial Year start
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Financial Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>FY:</span>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="bg-transparent font-bold text-slate-900 border-none outline-hidden cursor-pointer"
            >
              <option value="2024-25">2024-25 (01-Apr-2024)</option>
              <option value="2025-26">2025-26 (01-Apr-2025)</option>
              <option value="2026-27">2026-27 (01-Apr-2026)</option>
            </select>
          </div>

          <button
            onClick={() => setIsAddPartyOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Party with Balance
          </button>

          <button
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" /> Save All Balances
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
            title="Download CSV Schedule"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> CSV
          </button>

          <button
            onClick={handlePrintSchedule}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors no-print"
            title="Print Schedule"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" /> Print
          </button>
        </div>
      </div>

      {/* Global Saved Notification */}
      {globalSavedMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{globalSavedMsg}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Parties */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Parties Configured</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">{parties.length}</span>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              {partiesWithOpeningCount} with Balance
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {parties.filter(p => p.type === 'CUSTOMER').length} Customers • {parties.filter(p => p.type === 'SUPPLIER').length} Suppliers
          </p>
        </div>

        {/* Total DR (Receivable / लेना है) */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">
              Total DR (Receivable / लेना है)
            </span>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono">
            {formatIndianCurrency(totalDrAmount)}
          </div>
          <p className="text-[10px] text-slate-500">Opening money to be collected from customers</p>
        </div>

        {/* Total CR (Payable / देना है या Advance) */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
              Total CR (Payable / देना है)
            </span>
            <ArrowDownRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {formatIndianCurrency(totalCrAmount)}
          </div>
          <p className="text-[10px] text-slate-500">Opening advance received or vendor payables</p>
        </div>

        {/* Net Opening Position */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Net Opening Position</span>
          <div className={`text-2xl font-black font-mono ${
            netOpeningPosition >= 0 ? 'text-blue-700' : 'text-amber-700'
          }`}>
            {formatIndianCurrency(Math.abs(netOpeningPosition))} {netOpeningPosition >= 0 ? 'Dr (Net Rec)' : 'Cr (Net Pay)'}
          </div>
          <p className="text-[10px] text-slate-400">Total DR minus Total CR balance</p>
        </div>

      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Filter & Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by party name, phone, GSTIN, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 font-medium"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Party Type Filter */}
            <div className="flex p-1 bg-white border border-slate-200 rounded-xl text-xs font-bold">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterType === 'ALL' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({parties.length})
              </button>
              <button
                onClick={() => setFilterType('CUSTOMER')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterType === 'CUSTOMER' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Customers ({parties.filter(p => p.type === 'CUSTOMER').length})
              </button>
              <button
                onClick={() => setFilterType('SUPPLIER')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterType === 'SUPPLIER' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Suppliers ({parties.filter(p => p.type === 'SUPPLIER').length})
              </button>
            </div>

            {/* Opening Balance Filter */}
            <select
              value={filterBalance}
              onChange={(e) => setFilterBalance(e.target.value as any)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="ALL">All Balances</option>
              <option value="WITH_OPENING">With Opening Balance (&gt; ₹0)</option>
              <option value="ZERO_OPENING">Zero Opening (₹0)</option>
            </select>
          </div>

        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3 px-4">Party Details</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Opening Amount (₹)</th>
                <th className="py-3 px-3">Balance Type</th>
                <th className="py-3 px-3">As On Date</th>
                <th className="py-3 px-3 text-right">Current Balance</th>
                <th className="py-3 px-4 text-center">Save &amp; Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No parties match the selected search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredParties.map((party) => {
                  const row = editingRows[party.id] || {
                    amount: Math.abs(party.openingBalance || 0),
                    type: party.openingBalanceType || 'DR',
                    date: party.openingBalanceDate || '2025-04-01',
                  };
                  const isSaved = savedStatus[party.id];

                  return (
                    <tr key={party.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Party Details */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{party.name}</span>
                          {party.gstin && (
                            <span className="font-mono text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                              {party.gstin}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {party.phone} {party.city ? `• ${party.city}` : ''}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          party.type === 'CUSTOMER' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-purple-50 text-purple-800 border border-purple-200'
                        }`}>
                          {party.type === 'CUSTOMER' ? 'Customer' : 'Supplier'}
                        </span>
                      </td>

                      {/* Editable Amount */}
                      <td className="py-3 px-3">
                        <div className="relative max-w-[130px]">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input 
                            type="number"
                            min="0"
                            step="any"
                            value={row.amount || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditingRows(prev => ({
                                ...prev,
                                [party.id]: { ...row, amount: val },
                              }));
                            }}
                            className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-amber-50/30 focus:border-blue-500"
                            placeholder="0.00"
                          />
                        </div>
                      </td>

                      {/* Balance Type (DR/CR) */}
                      <td className="py-3 px-3">
                        <select
                          value={row.type}
                          onChange={(e) => {
                            const val = e.target.value as 'DR' | 'CR';
                            setEditingRows(prev => ({
                              ...prev,
                              [party.id]: { ...row, type: val },
                            }));
                          }}
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold border ${
                            row.type === 'DR' 
                              ? 'bg-rose-50 text-rose-800 border-rose-300' 
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          <option value="DR">DR (Receivable / लेना है)</option>
                          <option value="CR">CR (Payable / देना है)</option>
                        </select>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3">
                        <input 
                          type="date"
                          value={row.date}
                          onChange={(e) => {
                            setEditingRows(prev => ({
                              ...prev,
                              [party.id]: { ...row, date: e.target.value },
                            }));
                          }}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
                        />
                      </td>

                      {/* Current Balance */}
                      <td className="py-3 px-3 text-right">
                        <div className={`font-mono font-bold text-xs ${
                          (party.currentBalance || 0) > 0 ? 'text-rose-700' : (party.currentBalance || 0) < 0 ? 'text-emerald-700' : 'text-slate-500'
                        }`}>
                          {formatIndianCurrency(Math.abs(party.currentBalance || 0))}
                        </div>
                        <span className="text-[9.5px] text-slate-400">
                          {(party.currentBalance || 0) > 0 ? 'Dr (Due)' : (party.currentBalance || 0) < 0 ? 'Cr (Adv)' : 'Nil'}
                        </span>
                      </td>

                      {/* Save & Action Buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleSaveRow(party.id)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isSaved 
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200'
                            }`}
                            title="Save Party Opening Balance"
                          >
                            {isSaved ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Saved!</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setSelectedPartyForLedger(party)}
                            className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-800 text-slate-600 rounded-lg border border-slate-200 transition-colors"
                            title="Print 1-Page Party Statement & Ledger"
                          >
                            <Printer className="w-3.5 h-3.5" />
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

      {/* Quick Add Party Modal */}
      {isAddPartyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                <span>Add Party with Opening Balance</span>
              </h3>
              <button 
                onClick={() => setIsAddPartyOpen(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickAddParty} className="p-6 space-y-4 text-xs">
              
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewPartyType('CUSTOMER')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    newPartyType === 'CUSTOMER' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Customer (ग्राहक)
                </button>
                <button
                  type="button"
                  onClick={() => setNewPartyType('SUPPLIER')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    newPartyType === 'SUPPLIER' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Supplier / Vendor (आपूर्तिकर्ता)
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Party / Business Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Mahavir Trading Co."
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input 
                    type="tel"
                    required
                    placeholder="+91 98..."
                    value={newPartyPhone}
                    onChange={(e) => setNewPartyPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input 
                    type="text"
                    maxLength={15}
                    placeholder="27AA..."
                    value={newPartyGstin}
                    onChange={(e) => setNewPartyGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3.5 bg-amber-50/70 border border-amber-300 rounded-xl">
                <div>
                  <label className="block font-bold text-amber-950 mb-1">Opening Amount (₹)</label>
                  <input 
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={newPartyAmount || ''}
                    onChange={(e) => setNewPartyAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-amber-950 mb-1">Balance Type</label>
                  <select
                    value={newPartyBalanceType}
                    onChange={(e) => setNewPartyBalanceType(e.target.value as 'DR' | 'CR')}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold"
                  >
                    <option value="DR">DR (Receivable / लेना है)</option>
                    <option value="CR">CR (Payable / देना है)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-amber-950 mb-1">As On Date</label>
                  <input 
                    type="date"
                    value={newPartyDate}
                    onChange={(e) => setNewPartyDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">City / Location</label>
                <input 
                  type="text"
                  placeholder="City"
                  value={newPartyCity}
                  onChange={(e) => setNewPartyCity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddPartyOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  Save Party &amp; Opening Balance
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Party Ledger Statement Modal */}
      {selectedPartyForLedger && (
        <PartyLedgerPrintModal 
          isOpen={Boolean(selectedPartyForLedger)}
          onClose={() => setSelectedPartyForLedger(null)}
          party={selectedPartyForLedger}
          invoices={invoices}
          businessProfile={businessProfile}
          paymentVouchers={paymentVouchers}
          onUpdateParty={onUpdateParty}
        />
      )}

    </div>
  );
};
