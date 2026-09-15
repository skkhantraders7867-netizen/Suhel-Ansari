import React, { useState, useMemo } from 'react';
import { 
  Landmark, Wallet, ArrowDownRight, ArrowUpRight, Plus, 
  Search, Download, RefreshCw, CheckCircle2, AlertCircle, 
  ArrowLeftRight, IndianRupee, ShieldCheck, Clock, Building
} from 'lucide-react';
import { BankAccount, CashTransaction, Invoice, Expense, PaymentRecord } from '../types';

interface CashBankViewProps {
  bankAccounts: BankAccount[];
  cashTransactions: CashTransaction[];
  invoices: Invoice[];
  expenses: Expense[];
  onAddBankTransaction: (accountId: string, amount: number, type: 'DEPOSIT' | 'WITHDRAW') => void;
  onTransferBankFunds: (fromAccountId: string, toAccountId: string, amount: number, notes: string) => void;
  onAddCashTransaction: (tx: Omit<CashTransaction, 'id' | 'createdAt'>) => void;
  onAddNewBankAccount: (account: Omit<BankAccount, 'id'>) => void;
}

export const CashBankView: React.FC<CashBankViewProps> = ({
  bankAccounts,
  cashTransactions,
  invoices,
  expenses,
  onAddBankTransaction,
  onTransferBankFunds,
  onAddCashTransaction,
  onAddNewBankAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'CASH_GALLA' | 'BANK_ACCOUNTS'>('CASH_GALLA');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isAddCashModalOpen, setIsAddCashModalOpen] = useState(false);
  const [isBankTransferModalOpen, setIsBankTransferModalOpen] = useState(false);
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);

  // Cash count reconciliation state
  const [physicalCashCount, setPhysicalCashCount] = useState<string>('');

  // Forms
  const [cashFormData, setCashFormData] = useState({
    type: 'INFLOW' as 'INFLOW' | 'OUTFLOW',
    category: 'SALE' as CashTransaction['category'],
    amount: '',
    description: '',
    partyName: '',
    referenceNumber: '',
  });

  const [transferFormData, setTransferFormData] = useState({
    fromAccountId: bankAccounts[0]?.id || '',
    toAccountId: bankAccounts[1]?.id || '',
    amount: '',
    notes: 'Inter-bank balance rebalance',
  });

  const [bankFormData, setBankFormData] = useState({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    accountType: 'CURRENT' as BankAccount['accountType'],
    balance: '',
    isDefault: false,
    upiId: '',
  });

  // Calculate Total Cash Balance
  const totalCashInflow = useMemo(() => {
    return cashTransactions
      .filter(tx => tx.type === 'INFLOW')
      .reduce((acc, tx) => acc + tx.amount, 0);
  }, [cashTransactions]);

  const totalCashOutflow = useMemo(() => {
    return cashTransactions
      .filter(tx => tx.type === 'OUTFLOW')
      .reduce((acc, tx) => acc + tx.amount, 0);
  }, [cashTransactions]);

  const expectedCashInHand = totalCashInflow - totalCashOutflow;

  // Calculate Total Bank Balance
  const totalBankBalance = useMemo(() => {
    return bankAccounts.reduce((acc, b) => acc + b.balance, 0);
  }, [bankAccounts]);

  const cashDiff = physicalCashCount ? (parseFloat(physicalCashCount) - expectedCashInHand) : 0;

  // Cash Form submit
  const handleCashFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(cashFormData.amount) || 0;
    if (amountVal <= 0 || !cashFormData.description.trim()) {
      alert('Please enter a valid amount and description.');
      return;
    }

    onAddCashTransaction({
      date: new Date().toISOString().split('T')[0],
      type: cashFormData.type,
      category: cashFormData.category,
      amount: amountVal,
      description: cashFormData.description.trim(),
      partyName: cashFormData.partyName.trim() || undefined,
      referenceNumber: cashFormData.referenceNumber.trim() || undefined,
    });

    setCashFormData({
      type: 'INFLOW',
      category: 'SALE',
      amount: '',
      description: '',
      partyName: '',
      referenceNumber: '',
    });
    setIsAddCashModalOpen(false);
  };

  // Transfer Submit
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(transferFormData.amount) || 0;
    if (amountVal <= 0) {
      alert('Please enter a valid transfer amount.');
      return;
    }
    if (transferFormData.fromAccountId === transferFormData.toAccountId) {
      alert('Source and destination bank accounts cannot be the same.');
      return;
    }

    onTransferBankFunds(
      transferFormData.fromAccountId,
      transferFormData.toAccountId,
      amountVal,
      transferFormData.notes
    );

    setTransferFormData({
      fromAccountId: bankAccounts[0]?.id || '',
      toAccountId: bankAccounts[1]?.id || '',
      amount: '',
      notes: 'Inter-bank balance rebalance',
    });
    setIsBankTransferModalOpen(false);
  };

  // Add Bank Submit
  const handleAddBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankFormData.bankName || !bankFormData.accountNumber) {
      alert('Please enter bank name and account number.');
      return;
    }

    onAddNewBankAccount({
      bankName: bankFormData.bankName.trim(),
      accountHolderName: bankFormData.accountHolderName.trim() || 'Primary Account Holder',
      accountNumber: bankFormData.accountNumber.trim(),
      ifscCode: bankFormData.ifscCode.trim().toUpperCase(),
      branchName: bankFormData.branchName.trim(),
      accountType: bankFormData.accountType,
      balance: parseFloat(bankFormData.balance) || 0,
      isDefault: bankFormData.isDefault,
      upiId: bankFormData.upiId.trim() || undefined,
    });

    setBankFormData({
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: '',
      accountType: 'CURRENT',
      balance: '',
      isDefault: false,
      upiId: '',
    });
    setIsAddBankModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 font-heading">Cash & Bank Accounts Management</h1>
            <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              Galla & Passbook
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time shop counter cash drawer (Galla Hisaab), multiple bank account balances, and inter-bank transfers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'CASH_GALLA' ? (
            <button
              onClick={() => setIsAddCashModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Record Cash Entry</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBankTransferModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                <span>Transfer Funds</span>
              </button>
              <button
                onClick={() => setIsAddBankModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Bank Account</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Cash in Galla */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Cash in Hand (Galla Counter)</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">
            ₹{expectedCashInHand.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 flex items-center gap-1">
            <span>+{cashTransactions.filter(t => t.type === 'INFLOW').length} inflows</span>
            <span>• -{cashTransactions.filter(t => t.type === 'OUTFLOW').length} outflows</span>
          </div>
        </div>

        {/* Total in Bank Accounts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Bank Balance</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-blue-700">
            ₹{totalBankBalance.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Across {bankAccounts.length} verified bank accounts
          </div>
        </div>

        {/* Total Liquid Capital */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Liquid Business Funds</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-indigo-700">
            ₹{(expectedCashInHand + totalBankBalance).toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Cash in drawer + Live bank balances
          </div>
        </div>

      </div>

      {/* Tabs Switcher: Cash Galla vs Bank Accounts */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('CASH_GALLA')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'CASH_GALLA'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Daily Cash Drawer (Galla Hisaab)</span>
        </button>

        <button
          onClick={() => setActiveTab('BANK_ACCOUNTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'BANK_ACCOUNTS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Bank Accounts & Statements ({bankAccounts.length})</span>
        </button>
      </div>

      {/* TAB 1: CASH GALLA VIEW */}
      {activeTab === 'CASH_GALLA' && (
        <div className="space-y-6">
          
          {/* Daily Physical Cash Drawer Reconciliation Box */}
          <div className="bg-gradient-to-br from-slate-900 to-emerald-950 p-5 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                  Daily Evening Galla Tally (Closing Match)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-md">
                Enter your physical cash drawer notes count at day end to verify if any cash is missing or extra.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Physical Cash in Drawer (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 23500"
                  value={physicalCashCount}
                  onChange={(e) => setPhysicalCashCount(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {physicalCashCount && (
                <div className="pt-4">
                  {cashDiff === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" /> Perfectly Matched!
                    </span>
                  ) : cashDiff > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-xl border border-blue-500/30">
                      +₹{cashDiff} Extra Cash
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-rose-500/20 text-rose-300 px-3 py-1.5 rounded-xl border border-rose-500/30">
                      <AlertCircle className="w-4 h-4" /> -₹{Math.abs(cashDiff)} Cash Short
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cash Transactions List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Recent Cash Movements & Counter Logs
              </span>
              <span className="text-xs text-slate-500">{cashTransactions.length} entries</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Category & Details</th>
                    <th className="py-3 px-3">Party / Ref</th>
                    <th className="py-3 px-4 text-right">Inflow (Cash +)</th>
                    <th className="py-3 px-4 text-right">Outflow (Cash -)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {cashTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{tx.date}</div>
                        <div className="text-[10px] text-slate-400">
                          {tx.createdAt.replace('T', ' ').slice(11, 16)}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                          tx.type === 'INFLOW' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {tx.type === 'INFLOW' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.type}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{tx.description}</div>
                        <div className="text-[10px] text-slate-500">{tx.category}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-800">{tx.partyName || '—'}</div>
                        {tx.referenceNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">#{tx.referenceNumber}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-black text-emerald-600">
                        {tx.type === 'INFLOW' ? `+₹${tx.amount.toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-black text-rose-600">
                        {tx.type === 'OUTFLOW' ? `-₹${tx.amount.toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: BANK ACCOUNTS VIEW */}
      {activeTab === 'BANK_ACCOUNTS' && (
        <div className="space-y-6">
          
          {/* Bank Accounts Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bankAccounts.map((acc) => (
              <div 
                key={acc.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between"
              >
                {acc.isDefault && (
                  <span className="absolute top-3 right-3 text-[9px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase">
                    Default Bank
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <Building className="w-5 h-5" />
                    <span className="font-extrabold text-sm text-slate-900">{acc.bankName}</span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div><span className="font-semibold">A/C No:</span> <span className="font-mono font-bold text-slate-900">{acc.accountNumber}</span></div>
                    <div><span className="font-semibold">IFSC:</span> <span className="font-mono text-slate-700">{acc.ifscCode}</span></div>
                    <div><span className="font-semibold">Branch:</span> {acc.branchName}</div>
                    <div><span className="font-semibold">Type:</span> {acc.accountType} Account</div>
                    {acc.upiId && (
                      <div className="text-blue-600 font-mono text-[11px] pt-1">
                        UPI: {acc.upiId}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Current Balance</div>
                    <div className="text-lg font-black text-slate-900">
                      ₹{acc.balance.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const amt = prompt(`Enter deposit amount for ${acc.bankName}:`);
                        if (amt && parseFloat(amt) > 0) {
                          onAddBankTransaction(acc.id, parseFloat(amt), 'DEPOSIT');
                        }
                      }}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                    >
                      + Deposit
                    </button>
                    <button
                      onClick={() => {
                        const amt = prompt(`Enter withdrawal amount for ${acc.bankName}:`);
                        if (amt && parseFloat(amt) > 0) {
                          onAddBankTransaction(acc.id, parseFloat(amt), 'WITHDRAW');
                        }
                      }}
                      className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors"
                    >
                      - Withdraw
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* --- ADD CASH ENTRY MODAL --- */}
      {isAddCashModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">Record Galla / Cash Movement</h3>
              <button onClick={() => setIsAddCashModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCashFormSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Cash Flow Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCashFormData({ ...cashFormData, type: 'INFLOW' })}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 ${
                      cashFormData.type === 'INFLOW' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" /> Cash Received (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashFormData({ ...cashFormData, type: 'OUTFLOW' })}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 ${
                      cashFormData.type === 'OUTFLOW' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" /> Cash Paid Out (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 5000"
                  value={cashFormData.amount}
                  onChange={(e) => setCashFormData({ ...cashFormData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-base"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description / Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Counter sale, Supplier cash payment, Bank cash deposit"
                  value={cashFormData.description}
                  onChange={(e) => setCashFormData({ ...cashFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Party / Person (Optional)</label>
                <input
                  type="text"
                  placeholder="Customer or Supplier Name"
                  value={cashFormData.partyName}
                  onChange={(e) => setCashFormData({ ...cashFormData, partyName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddCashModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs">
                  Save Cash Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- INTER-BANK TRANSFER MODAL --- */}
      {isBankTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">Inter-Bank Fund Transfer</h3>
              <button onClick={() => setIsBankTransferModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Transfer From (Debit Bank)</label>
                <select
                  value={transferFormData.fromAccountId}
                  onChange={(e) => setTransferFormData({ ...transferFormData, fromAccountId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                >
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.bankName} (₹{b.balance.toLocaleString('en-IN')})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Transfer To (Credit Bank)</label>
                <select
                  value={transferFormData.toAccountId}
                  onChange={(e) => setTransferFormData({ ...transferFormData, toAccountId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                >
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.bankName} (₹{b.balance.toLocaleString('en-IN')})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Transfer Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={transferFormData.amount}
                  onChange={(e) => setTransferFormData({ ...transferFormData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsBankTransferModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs">
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD NEW BANK ACCOUNT MODAL --- */}
      {isAddBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">Add New Business Bank Account</h3>
              <button onClick={() => setIsAddBankModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleAddBankSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Axis Bank Ltd, Punjab National Bank"
                  value={bankFormData.bankName}
                  onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Account Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="9120200..."
                    value={bankFormData.accountNumber}
                    onChange={(e) => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="UTIB0000123"
                    value={bankFormData.ifscCode}
                    onChange={(e) => setBankFormData({ ...bankFormData, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Branch</label>
                  <input
                    type="text"
                    placeholder="Vashi Branch"
                    value={bankFormData.branchName}
                    onChange={(e) => setBankFormData({ ...bankFormData, branchName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={bankFormData.balance}
                    onChange={(e) => setBankFormData({ ...bankFormData, balance: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddBankModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs">
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
