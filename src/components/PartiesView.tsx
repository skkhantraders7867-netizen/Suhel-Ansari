import React, { useState } from 'react';
import { 
  Search, Plus, Phone, Mail, MapPin, Share2, 
  ArrowUpRight, ArrowDownRight, FileText, UserPlus, Trash2, Edit2, ShieldCheck, ChevronRight,
  Printer, Percent, Download, Receipt, Save, Check
} from 'lucide-react';
import { Party, Invoice, BusinessProfile, PaymentVoucher } from '../types';
import { formatIndianCurrency, generateUpiUrl, detectStateFromGSTIN, numberToIndianWords } from '../utils/gstCalculations';
import { GST_STATES } from '../data/mockData';
import { PartyLedgerPrintModal } from './PartyLedgerPrintModal';

interface PartiesViewProps {
  parties: Party[];
  invoices: Invoice[];
  businessProfile: BusinessProfile;
  paymentVouchers?: PaymentVoucher[];
  onAddNewParty: (party: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>) => Party;
  onUpdateParty: (party: Party) => void;
  onDeleteParty: (id: string) => void;
  onCreateInvoiceForParty: (partyId: string) => void;
  onRecordPayment: (party: Party) => void;
}

export const PartiesView: React.FC<PartiesViewProps> = ({
  parties = [],
  invoices = [],
  businessProfile,
  paymentVouchers = [],
  onAddNewParty,
  onUpdateParty,
  onDeleteParty,
  onCreateInvoiceForParty,
  onRecordPayment,
}) => {
  const [activeType, setActiveType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(parties[0] || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  // Opening Balance Inline Editing
  const [isEditingOpeningBalance, setIsEditingOpeningBalance] = useState(false);
  const [quickOpeningBalance, setQuickOpeningBalance] = useState<number>(0);
  const [quickOpeningType, setQuickOpeningType] = useState<'DR' | 'CR'>('DR');
  const [quickOpeningDate, setQuickOpeningDate] = useState<string>('2025-04-01');
  const [isQuickSaved, setIsQuickSaved] = useState(false);

  // New Party Form
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formStateCode, setFormStateCode] = useState(businessProfile.stateCode || '07');
  const [formOpeningBalance, setFormOpeningBalance] = useState<number>(0);
  const [formOpeningType, setFormOpeningType] = useState<'DR' | 'CR'>('DR');
  const [formOpeningDate, setFormOpeningDate] = useState<string>('2025-04-01');
  const [formCreditLimit, setFormCreditLimit] = useState<number>(50000);
  const [formPaymentDays, setFormPaymentDays] = useState<number>(15);

  // When selected party changes, update inline state
  React.useEffect(() => {
    if (selectedParty) {
      setQuickOpeningBalance(Math.abs(selectedParty.openingBalance || 0));
      setQuickOpeningType(selectedParty.openingBalanceType || ((selectedParty.openingBalance || 0) < 0 ? 'CR' : 'DR'));
      setQuickOpeningDate(selectedParty.openingBalanceDate || '2025-04-01');
      setIsEditingOpeningBalance(false);
      setIsQuickSaved(false);
    }
  }, [selectedParty]);

  // Filter parties
  const filteredParties = parties.filter(p => {
    const matchesType = p.type === activeType;
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm) ||
      (p.gstin && p.gstin.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  // Calculate party ledger transactions
  const partyInvoices = invoices.filter(inv => inv.partyId === selectedParty?.id && inv.documentType !== 'QUOTATION' && inv.documentType !== 'PURCHASE_ESTIMATE');
  const partyVouchers = paymentVouchers.filter(pv => pv.partyId === selectedParty?.id);

  // WhatsApp Payment Reminder
  const handleSendReminder = (party: Party) => {
    if (!party.phone) return;
    const upiUrl = generateUpiUrl(
      businessProfile.upiId,
      businessProfile.upiName || businessProfile.name,
      party.currentBalance,
      'Statement'
    );

    const message = `*Payment Reminder from ${businessProfile.name}*
Dear ${party.name},
This is a friendly reminder that your outstanding balance is *${formatIndianCurrency(party.currentBalance)}*.

Kindly settle the amount at your earliest convenience.
Pay via UPI: ${businessProfile.upiId}

Bank Details:
Bank: ${businessProfile.bankName}
A/C: ${businessProfile.accountNumber}
IFSC: ${businessProfile.ifscCode}

Thank you for your prompt response!`;

    const cleanPhone = party.phone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const stateObj = GST_STATES.find(s => s.code === formStateCode) || GST_STATES[0];
    const signedOpening = formOpeningType === 'CR' ? -Math.abs(formOpeningBalance) : Math.abs(formOpeningBalance);

    const newParty = onAddNewParty({
      type: activeType,
      name: formName.trim(),
      phone: formPhone.trim() || '',
      email: formEmail.trim() || undefined,
      gstin: formGstin.trim().toUpperCase() || undefined,
      billingAddress: formAddress.trim() || '',
      city: formCity.trim() || '',
      state: stateObj ? stateObj.name : '',
      stateCode: stateObj ? stateObj.code : '',
      openingBalance: signedOpening,
      openingBalanceType: formOpeningType,
      openingBalanceDate: formOpeningDate,
      creditLimit: formCreditLimit,
      paymentTermsDays: formPaymentDays,
    });

    setSelectedParty(newParty);
    setIsAddModalOpen(false);
    setFormName('');
    setFormPhone('');
    setFormGstin('');
    setFormEmail('');
    setFormAddress('');
    setFormCity('');
    setFormOpeningBalance(0);
  };

  const handleSaveQuickOpeningBalance = () => {
    if (!selectedParty) return;
    const signedBalance = quickOpeningType === 'CR' ? -Math.abs(quickOpeningBalance) : Math.abs(quickOpeningBalance);
    const updated = {
      ...selectedParty,
      openingBalance: signedBalance,
      openingBalanceType: quickOpeningType,
      openingBalanceDate: quickOpeningDate,
    };
    onUpdateParty(updated);
    setSelectedParty(updated);
    setIsEditingOpeningBalance(false);
    setIsQuickSaved(true);
    setTimeout(() => setIsQuickSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Party &amp; Ledger Directory</h1>
          <p className="text-xs text-slate-500">Manage customers, vendors, opening balances, ledgers, and payment receipts</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Toggle Type */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => {
                setActiveType('CUSTOMER');
                const firstCust = parties.find(p => p.type === 'CUSTOMER');
                if (firstCust) setSelectedParty(firstCust);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeType === 'CUSTOMER' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customers ({parties.filter(p => p.type === 'CUSTOMER').length})
            </button>
            <button
              onClick={() => {
                setActiveType('SUPPLIER');
                const firstSupp = parties.find(p => p.type === 'SUPPLIER');
                if (firstSupp) setSelectedParty(firstSupp);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeType === 'SUPPLIER' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Suppliers ({parties.filter(p => p.type === 'SUPPLIER').length})
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Add {activeType === 'CUSTOMER' ? 'Customer' : 'Supplier'}
          </button>
        </div>
      </div>

      {/* Main Grid: Left List (5 cols), Right Details (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Party List (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Search Box */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder={`Search ${activeType.toLowerCase()}s by name, phone, GSTIN...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* List Items */}
          <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
            {filteredParties.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No {activeType.toLowerCase()}s found.
              </div>
            ) : (
              filteredParties.map((p) => {
                const isSelected = selectedParty?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedParty(p)}
                    className={`p-4 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-0.5 flex-1">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {p.gstin && (
                          <span className="font-mono text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-sm font-semibold">
                            GST
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">{p.phone} • {p.city || p.state}</div>
                    </div>

                    <div className="text-right">
                      <div className={`font-mono font-bold text-xs ${
                        p.currentBalance > 0 ? 'text-rose-600' : p.currentBalance < 0 ? 'text-emerald-600' : 'text-slate-500'
                      }`}>
                        {formatIndianCurrency(Math.abs(p.currentBalance))}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {p.currentBalance > 0 ? 'To Collect' : p.currentBalance < 0 ? 'To Pay' : 'Settled'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right: Selected Party Detailed Ledger & Actions (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedParty ? (
            <>
              {/* Party Profile Banner */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedParty.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedParty.phone}</span>
                      {selectedParty.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selectedParty.email}</span>}
                      {(selectedParty.city || selectedParty.state) && (
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {[selectedParty.city, selectedParty.state].filter(Boolean).join(', ')}</span>
                      )}
                    </div>
                    {selectedParty.gstin && (
                      <div className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-2">
                        GSTIN: {selectedParty.gstin}
                      </div>
                    )}
                  </div>

                  {/* Balance Highlight Box */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-right min-w-[160px]">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Current Outstanding</span>
                    <div className={`font-mono text-xl font-black ${
                      selectedParty.currentBalance > 0 ? 'text-rose-700' : selectedParty.currentBalance < 0 ? 'text-emerald-700' : 'text-slate-800'
                    }`}>
                      {formatIndianCurrency(Math.abs(selectedParty.currentBalance))}
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      {selectedParty.currentBalance > 0 ? 'Receivable (Pending)' : selectedParty.currentBalance < 0 ? 'Advance Paid' : 'Zero Balance'}
                    </span>
                  </div>
                </div>

                {/* Opening Balance Quick Settings Card */}
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 flex items-center gap-1">
                      <span>⚖️ Opening Balance Configuration</span>
                      {isQuickSaved && (
                        <span className="text-emerald-700 font-bold text-[10.5px] bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Saved!
                        </span>
                      )}
                    </span>
                    {!isEditingOpeningBalance ? (
                      <button
                        onClick={() => setIsEditingOpeningBalance(true)}
                        className="text-amber-800 hover:text-amber-950 font-bold text-[11px] underline"
                      >
                        ✏️ Edit Opening Balance
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditingOpeningBalance(false)}
                        className="text-slate-500 hover:text-slate-700 text-[11px]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {!isEditingOpeningBalance ? (
                    <div className="flex flex-wrap items-center gap-4 text-slate-700 text-[11.5px]">
                      <div>
                        <span className="text-slate-500">Opening Amount: </span>
                        <strong className="font-mono text-slate-950">
                          {formatIndianCurrency(Math.abs(selectedParty.openingBalance || 0))}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Type: </span>
                        <span className="font-bold px-1.5 py-0.5 rounded bg-white border border-amber-300 text-amber-950">
                          {selectedParty.openingBalanceType || ((selectedParty.openingBalance || 0) < 0 ? 'CR (Advance)' : 'DR (Receivable)')}
                        </span>
                      </div>
                      {selectedParty.openingBalanceDate && (
                        <div>
                          <span className="text-slate-500">As on: </span>
                          <strong className="text-slate-800">{selectedParty.openingBalanceDate}</strong>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <input 
                        type="number"
                        min="0"
                        placeholder="Amount"
                        value={quickOpeningBalance || ''}
                        onChange={(e) => setQuickOpeningBalance(parseFloat(e.target.value) || 0)}
                        className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold w-28"
                      />
                      <select
                        value={quickOpeningType}
                        onChange={(e) => setQuickOpeningType(e.target.value as 'DR' | 'CR')}
                        className="px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold"
                      >
                        <option value="DR">DR (Receivable / लेना है)</option>
                        <option value="CR">CR (Advance / देना है)</option>
                      </select>
                      <input 
                        type="date"
                        value={quickOpeningDate}
                        onChange={(e) => setQuickOpeningDate(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                      />
                      <button
                        onClick={handleSaveQuickOpeningBalance}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs"
                      >
                        <Save className="w-3.5 h-3.5" /> Save Balance
                      </button>
                    </div>
                  )}
                </div>

                {/* Party Actions Bar */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setIsLedgerModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-400" /> 🖨️ Print Ledger (लेजर प्रिंट)
                  </button>

                  <button
                    onClick={() => onCreateInvoiceForParty(selectedParty.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> + New Bill
                  </button>

                  <button
                    onClick={() => onRecordPayment(selectedParty)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5" /> ₹ Record Payment (वाउचर)
                  </button>

                  {selectedParty.currentBalance > 0 && (
                    <button
                      onClick={() => handleSendReminder(selectedParty)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-200 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" /> WhatsApp Reminder
                    </button>
                  )}
                </div>
              </div>

              {/* Transaction Ledger Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <span>Transaction Ledger History ({partyInvoices.length} Bills, {partyVouchers.length} Vouchers)</span>
                    </h3>
                    <span className="text-[10px] text-slate-500">Includes Sales, TDS Deductions (1%), and Payment receipts</span>
                  </div>

                  <button
                    onClick={() => setIsLedgerModalOpen(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[11px] rounded-lg border border-blue-200 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" /> Full Statement Print (1-Page)
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {partyInvoices.length === 0 && partyVouchers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No invoices or payment vouchers recorded for this party yet.
                    </div>
                  ) : (
                    <>
                      {/* Invoices */}
                      {partyInvoices.map((inv) => (
                        <div key={inv.id} className="p-3.5 hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-slate-900 flex items-center gap-2">
                              <span>{inv.invoiceNumber}</span>
                              <span className="text-[10px] font-sans font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                                {inv.documentType === 'TAX_INVOICE' ? 'Tax Invoice' : inv.documentType}
                              </span>
                              {inv.isTdsApplicable && (inv.tdsAmount || 0) > 0 && (
                                <span className="text-[10px] font-sans font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded border border-amber-300 flex items-center gap-0.5">
                                  <Percent className="w-2.5 h-2.5" /> TDS {inv.tdsRate || 1}% ({formatIndianCurrency(inv.tdsAmount || 0)})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Date: {inv.date} {inv.dueDate ? `• Due: ${inv.dueDate}` : ''}
                            </div>
                            {inv.items && inv.items.length > 0 && (
                              <div className="text-[11.5px] font-semibold text-slate-800 pt-0.5">
                                {inv.items.map(it => it.name || it.description).filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>

                          <div className="text-left sm:text-right space-y-0.5">
                            <div className="font-mono font-bold text-slate-900 flex sm:justify-end items-center gap-2">
                              <span>Bill: {formatIndianCurrency(inv.grandTotal)}</span>
                              {inv.isTdsApplicable && (inv.tdsAmount || 0) > 0 && (
                                <span className="text-[11px] font-normal text-slate-500">
                                  (Net: {formatIndianCurrency(inv.netPayableAfterTds || (inv.grandTotal - (inv.tdsAmount || 0)))})
                                </span>
                              )}
                            </div>
                            <div className={`text-[10px] font-semibold ${inv.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {inv.paymentStatus === 'PAID' ? '✓ FULLY PAID' : `${inv.paymentStatus} (${formatIndianCurrency(inv.balanceDue)} due)`}
                              {inv.paidAmount > 0 && inv.paymentStatus !== 'PAID' && (
                                <span className="text-slate-500 ml-1">[{formatIndianCurrency(inv.paidAmount)} received]</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Payment Vouchers */}
                      {partyVouchers.map((pv) => (
                        <div key={pv.id} className="p-3.5 bg-emerald-50/40 hover:bg-emerald-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs border-l-4 border-emerald-600">
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-emerald-950 flex items-center gap-2">
                              <span>{pv.voucherNumber}</span>
                              <span className="text-[10px] font-sans font-bold bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded border border-emerald-300">
                                Payment Received ({pv.paymentMode})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              Date: {pv.date} • Ref / UTR: <span className="font-mono font-bold">{pv.referenceNumber || 'N/A'}</span>
                            </div>
                            {pv.remarks && (
                              <div className="text-[11px] text-slate-700 italic">
                                "{pv.remarks}"
                              </div>
                            )}
                          </div>

                          <div className="text-left sm:text-right space-y-0.5">
                            <div className="font-mono font-black text-emerald-800 text-sm">
                              - {formatIndianCurrency(pv.amount)} (Cr)
                            </div>
                            <div className="text-[10px] text-emerald-700 font-semibold">
                              Direct Ledger Credit
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
              Select a party from the left list to view their ledger and statement.
            </div>
          )}
        </div>

      </div>

      {/* Add Party Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-blue-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New {activeType === 'CUSTOMER' ? 'Customer' : 'Supplier'}</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Business / Customer Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Mahavir Trading Co."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
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
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input 
                    type="text"
                    maxLength={15}
                    placeholder="27AA..."
                    value={formGstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setFormGstin(val);
                      const detected = detectStateFromGSTIN(val);
                      if (detected) setFormStateCode(detected.code);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input 
                    type="email"
                    placeholder="email@domain.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <select
                    value={formStateCode}
                    onChange={(e) => setFormStateCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {GST_STATES.map(s => (
                      <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input 
                    type="text"
                    placeholder="City"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
                  <input 
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={formOpeningBalance || ''}
                    onChange={(e) => setFormOpeningBalance(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Balance Type</label>
                  <select
                    value={formOpeningType}
                    onChange={(e) => setFormOpeningType(e.target.value as 'DR' | 'CR')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="DR">DR (Receivable)</option>
                    <option value="CR">CR (Payable / Adv)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Address</label>
                <textarea 
                  rows={2}
                  placeholder="Street / Office address..."
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  Save Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Party Ledger Statement Print Modal */}
      {isLedgerModalOpen && selectedParty && (
        <PartyLedgerPrintModal 
          isOpen={isLedgerModalOpen}
          onClose={() => setIsLedgerModalOpen(false)}
          party={selectedParty}
          invoices={invoices}
          businessProfile={businessProfile}
          paymentVouchers={paymentVouchers}
          onUpdateParty={onUpdateParty}
        />
      )}

    </div>
  );
};
