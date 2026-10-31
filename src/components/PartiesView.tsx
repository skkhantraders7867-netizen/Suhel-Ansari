import React, { useState } from 'react';
import { 
  Search, Plus, Phone, Mail, MapPin, Share2, 
  ArrowUpRight, ArrowDownRight, FileText, UserPlus, Trash2, Edit2, ShieldCheck, ChevronRight,
  Printer, Percent, Download, Receipt, Save, Check, Calendar, X
} from 'lucide-react';
import { Party, Invoice, BusinessProfile, PaymentVoucher, DebitVoucher } from '../types';
import { formatIndianCurrency, generateUpiUrl, detectStateFromGSTIN, numberToIndianWords } from '../utils/gstCalculations';
import { GST_STATES } from '../data/mockData';
import { PartyLedgerPrintModal } from './PartyLedgerPrintModal';

interface PartiesViewProps {
  parties: Party[];
  invoices: Invoice[];
  businessProfile: BusinessProfile;
  paymentVouchers?: PaymentVoucher[];
  debitVouchers?: DebitVoucher[];
  onAddNewParty: (party: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>) => Party;
  onUpdateParty: (party: Party) => void;
  onDeleteParty: (id: string) => void;
  onCreateInvoiceForParty: (partyId: string) => void;
  onRecordPayment: (party: Party) => void;
  onRecordDebitVoucher?: (party: Party) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onDeleteInvoice?: (id: string) => void;
  onEditVoucher?: (voucher: PaymentVoucher) => void;
  onDeleteVoucher?: (id: string) => void;
  onEditDebitVoucher?: (voucher: DebitVoucher) => void;
  onDeleteDebitVoucher?: (id: string) => void;
}

export const PartiesView: React.FC<PartiesViewProps> = ({
  parties = [],
  invoices = [],
  businessProfile,
  paymentVouchers = [],
  debitVouchers = [],
  onAddNewParty,
  onUpdateParty,
  onDeleteParty,
  onCreateInvoiceForParty,
  onRecordPayment,
  onRecordDebitVoucher,
  onEditInvoice,
  onDeleteInvoice,
  onEditVoucher,
  onDeleteVoucher,
  onEditDebitVoucher,
  onDeleteDebitVoucher,
}) => {
  const [activeType, setActiveType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(parties[0] || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  // Date to Date Ledger Range Modal State
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
  const [ledgerFromDate, setLedgerFromDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [ledgerToDate, setLedgerToDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

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
  const [formPincode, setFormPincode] = useState('');
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

  // Calculate party ledger transactions (matching by partyId and partyName fallback)
  const partyInvoices = invoices.filter(inv => {
    const matchesParty = (
      (inv.partyId && selectedParty?.id && inv.partyId === selectedParty.id) ||
      (inv.partyName && selectedParty?.name && inv.partyName.trim().toLowerCase() === selectedParty.name.trim().toLowerCase())
    );
    if (!matchesParty) return false;
    if (inv.documentType === 'QUOTATION') return false;
    // For suppliers, include purchase bills and purchase estimates
    if (selectedParty?.type === 'SUPPLIER') return true;
    // For customers, exclude draft purchase estimates
    if (inv.documentType === 'PURCHASE_ESTIMATE') {
      return inv.quotationStatus === 'CONVERTED' || (inv.paidAmount && inv.paidAmount > 0);
    }
    return true;
  });

  const partyVouchers = paymentVouchers.filter(pv => 
    (pv.partyId && selectedParty?.id && pv.partyId === selectedParty.id) ||
    (pv.partyName && selectedParty?.name && pv.partyName.trim().toLowerCase() === selectedParty.name.trim().toLowerCase())
  );

  const partyDebitVouchers = debitVouchers.filter(dv => 
    (dv.partyId && selectedParty?.id && dv.partyId === selectedParty.id) ||
    (dv.partyName && selectedParty?.name && dv.partyName.trim().toLowerCase() === selectedParty.name.trim().toLowerCase())
  );

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

  const handleOpenEditParty = (party: Party) => {
    setEditingParty(party);
    setActiveType(party.type || 'CUSTOMER');
    setFormName(party.name || '');
    setFormPhone(party.phone || '');
    setFormGstin(party.gstin || '');
    setFormEmail(party.email || '');
    setFormAddress(party.billingAddress || '');
    setFormCity(party.city || '');
    setFormPincode(party.pincode || '');
    setFormStateCode(party.stateCode || businessProfile.stateCode || '07');
    setFormOpeningBalance(Math.abs(party.openingBalance || 0));
    setFormOpeningType(party.openingBalanceType || ((party.openingBalance || 0) < 0 ? 'CR' : 'DR'));
    setFormOpeningDate(party.openingBalanceDate || '2025-04-01');
    setFormCreditLimit(party.creditLimit || 50000);
    setFormPaymentDays(party.paymentTermsDays || 15);
    setIsAddModalOpen(true);
  };

  const handleOpenAddParty = () => {
    setEditingParty(null);
    setFormName('');
    setFormPhone('');
    setFormGstin('');
    setFormEmail('');
    setFormAddress('');
    setFormCity('');
    setFormPincode('');
    setFormStateCode(businessProfile.stateCode || '07');
    setFormOpeningBalance(0);
    setFormOpeningType('DR');
    setFormOpeningDate('2025-04-01');
    setFormCreditLimit(50000);
    setFormPaymentDays(15);
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const stateObj = GST_STATES.find(s => s.code === formStateCode) || GST_STATES[0];
    const signedOpening = formOpeningType === 'CR' ? -Math.abs(formOpeningBalance) : Math.abs(formOpeningBalance);

    if (editingParty) {
      const updatedParty: Party = {
        ...editingParty,
        type: activeType,
        name: formName.trim(),
        phone: formPhone.trim() || '',
        email: formEmail.trim() || undefined,
        gstin: formGstin.trim().toUpperCase() || undefined,
        billingAddress: formAddress.trim() || '',
        city: formCity.trim() || '',
        state: stateObj ? stateObj.name : '',
        stateCode: stateObj ? stateObj.code : '',
        pincode: formPincode.trim(),
        openingBalance: signedOpening,
        openingBalanceType: formOpeningType,
        openingBalanceDate: formOpeningDate,
        creditLimit: formCreditLimit,
        paymentTermsDays: formPaymentDays,
      };
      onUpdateParty(updatedParty);
      setSelectedParty(updatedParty);
      setIsAddModalOpen(false);
      setEditingParty(null);
      return;
    }

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
      pincode: formPincode.trim(),
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
    setFormPincode('');
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#070e24]/95 backdrop-blur-xl p-5 rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-white font-heading tracking-tight">Party &amp; Ledger Directory</h1>
          <p className="text-xs text-slate-400">Manage customers, vendors, opening balances, ledgers, and payment receipts</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Toggle Type */}
          <div className="flex p-1 bg-[#09122e] rounded-xl border border-[#172654]">
            <button
              onClick={() => {
                setActiveType('CUSTOMER');
                const firstCust = parties.find(p => p.type === 'CUSTOMER');
                if (firstCust) setSelectedParty(firstCust);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeType === 'CUSTOMER' ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)] border border-cyan-400/40' : 'text-slate-400 hover:text-white'
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeType === 'SUPPLIER' ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)] border border-cyan-400/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Suppliers ({parties.filter(p => p.type === 'SUPPLIER').length})
            </button>
          </div>

          <button
            onClick={handleOpenAddParty}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-400/40 transition-all cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Add {activeType === 'CUSTOMER' ? 'Customer' : 'Supplier'}
          </button>
        </div>
      </div>

      {/* Main Grid: Left List (5 cols), Right Details (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left: Party List (5 Cols) */}
        <div className="lg:col-span-5 bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Search Box */}
          <div className="p-3.5 border-b border-[#14234b] bg-[#09122e]/60">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder={`Search ${activeType.toLowerCase()}s by name, phone, GSTIN...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#09122e] border border-[#1b2b5d] rounded-xl text-xs text-white font-semibold placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          {/* List Items */}
          <div className="divide-y divide-[#101b3d] max-h-[620px] overflow-y-auto">
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
                    className={`p-4 cursor-pointer transition-all flex items-center justify-between gap-3 group ${
                      isSelected ? 'bg-[#0c183d] border-l-4 border-cyan-400' : 'hover:bg-[#0c183d]/50'
                    }`}
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5 truncate">
                        <span className="truncate">{p.name}</span>
                        {p.gstin && (
                          <span className="font-mono text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded-sm font-semibold shrink-0">
                            GST
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{p.phone} • {p.city || p.state}</div>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <div>
                        <div className={`font-mono font-bold text-xs ${
                          p.currentBalance > 0 ? 'text-rose-600' : p.currentBalance < 0 ? 'text-emerald-600' : 'text-slate-500'
                        }`}>
                          {formatIndianCurrency(Math.abs(p.currentBalance))}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.currentBalance > 0 ? 'To Collect' : p.currentBalance < 0 ? 'To Pay' : 'Settled'}
                        </div>
                      </div>

                      {/* Red circle delete button on Party card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteParty(p.id);
                        }}
                        className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer hover:scale-110"
                        title={`Delete Party "${p.name}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
              <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl p-5 border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#14234b]">
                  <div>
                    <h2 className="text-lg font-black text-white font-heading">{selectedParty.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-cyan-400" /> {selectedParty.phone}</span>
                      {selectedParty.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-cyan-400" /> {selectedParty.email}</span>}
                      {(selectedParty.city || selectedParty.state || selectedParty.pincode) && (
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-400" /> {[selectedParty.city, selectedParty.state, selectedParty.pincode ? `PIN: ${selectedParty.pincode}` : ''].filter(Boolean).join(', ')}</span>
                      )}
                    </div>
                    {selectedParty.gstin && (
                      <div className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2 py-0.5 rounded-md inline-block mt-2">
                        GSTIN: {selectedParty.gstin}
                      </div>
                    )}
                  </div>

                  {/* Balance Highlight Box & Edit / Delete Party Button */}
                  <div className="flex items-center gap-2.5">
                    <div className="bg-[#09122e] p-3.5 rounded-xl border border-[#172654] text-right min-w-[160px]">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Current Outstanding</span>
                      <div className={`font-mono text-xl font-black ${
                        selectedParty.currentBalance > 0 ? 'text-rose-400' : selectedParty.currentBalance < 0 ? 'text-emerald-400' : 'text-slate-300'
                      }`}>
                        ₹ {formatIndianCurrency(Math.abs(selectedParty.currentBalance))}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {selectedParty.currentBalance > 0 ? 'Receivable (Pending)' : selectedParty.currentBalance < 0 ? 'Advance Paid' : 'Zero Balance'}
                      </span>
                    </div>

                    {/* Blue Circular Edit Party Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditParty(selectedParty)}
                      className="w-10 h-10 rounded-full bg-blue-600/20 hover:bg-blue-600 text-cyan-400 hover:text-white border border-blue-500/40 hover:border-blue-500 flex items-center justify-center transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer hover:scale-110 shrink-0"
                      title={`Edit Party "${selectedParty.name}"`}
                      aria-label="Edit Party"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Red Circular Delete Party Button */}
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteParty(selectedParty.id);
                      }}
                      className="w-10 h-10 rounded-full bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/40 hover:border-rose-500 flex items-center justify-center transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)] cursor-pointer hover:scale-110 shrink-0"
                      title={`Delete Party "${selectedParty.name}"`}
                      aria-label="Delete Party"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Opening Balance Quick Settings Card */}
                <div className="p-3 bg-[#09122e] rounded-xl border border-[#172654] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <span>⚖️ Opening Balance Configuration</span>
                      {isQuickSaved && (
                        <span className="text-emerald-300 font-bold text-[10.5px] bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Saved!
                        </span>
                      )}
                    </span>
                    {!isEditingOpeningBalance ? (
                      <button
                        onClick={() => setIsEditingOpeningBalance(true)}
                        className="text-cyan-400 hover:text-cyan-300 font-bold text-[11px] underline cursor-pointer"
                      >
                        ✏️ Edit Opening Balance
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditingOpeningBalance(false)}
                        className="text-slate-400 hover:text-white text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {!isEditingOpeningBalance ? (
                    <div className="flex flex-wrap items-center gap-4 text-slate-300 text-[11.5px]">
                      <div>
                        <span className="text-slate-400">Opening Amount: </span>
                        <strong className="font-mono text-white">
                          ₹ {formatIndianCurrency(Math.abs(selectedParty.openingBalance || 0))}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Type: </span>
                        <span className="font-bold px-1.5 py-0.5 rounded bg-[#0c1840] border border-amber-500/40 text-amber-300">
                          {selectedParty.openingBalanceType || ((selectedParty.openingBalance || 0) < 0 ? 'CR (Advance)' : 'DR (Receivable)')}
                        </span>
                      </div>
                      {selectedParty.openingBalanceDate && (
                        <div>
                          <span className="text-slate-400">As on: </span>
                          <strong className="text-slate-200">{selectedParty.openingBalanceDate}</strong>
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
                        className="px-2.5 py-1.5 bg-[#070e24] border border-[#1b2b5d] rounded-lg text-xs font-mono font-bold text-cyan-300 w-28 focus:outline-none focus:border-cyan-500"
                      />
                      <select
                        value={quickOpeningType}
                        onChange={(e) => setQuickOpeningType(e.target.value as 'DR' | 'CR')}
                        className="px-2 py-1.5 bg-[#070e24] border border-[#1b2b5d] rounded-lg text-xs font-bold text-white focus:outline-none"
                      >
                        <option value="DR">DR (Receivable)</option>
                        <option value="CR">CR (Advance / Payable)</option>
                      </select>
                      <input 
                        type="date"
                        value={quickOpeningDate}
                        onChange={(e) => setQuickOpeningDate(e.target.value)}
                        className="px-2 py-1.5 bg-[#070e24] border border-[#1b2b5d] rounded-lg text-xs text-white focus:outline-none"
                      />
                      <button
                        onClick={handleSaveQuickOpeningBalance}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> Save Balance
                      </button>
                    </div>
                  )}
                </div>

                {/* Party Actions Bar */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => {
                      setDateFilterEnabled(false);
                      setIsLedgerModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#09122e] hover:bg-[#0f1d44] border border-[#172654] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-cyan-400" /> 🖨️ Print Ledger
                  </button>

                  <button
                    onClick={() => {
                      setIsDateRangeModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    title="Date to Date Ledger Print"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-300" /> 📅 Date to Date Print
                  </button>

                  <button
                    onClick={() => onCreateInvoiceForParty(selectedParty.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl shadow-[0_0_12px_rgba(6,182,212,0.4)] border border-cyan-400/40 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> + New Bill
                  </button>

                  <button
                    onClick={() => onRecordPayment(selectedParty)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-colors cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" /> ₹ Record Payment
                  </button>

                  {onRecordDebitVoucher && (
                    <button
                      onClick={() => onRecordDebitVoucher(selectedParty)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-[0_0_12px_rgba(225,29,72,0.3)] transition-colors cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5 text-rose-200" /> ₹ Debit Voucher
                    </button>
                  )}

                  {selectedParty.currentBalance > 0 && (
                    <button
                      onClick={() => handleSendReminder(selectedParty)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs rounded-xl border border-emerald-500/30 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" /> WhatsApp Reminder
                    </button>
                  )}
                </div>
              </div>

              {/* Transaction Ledger Table */}
              <div className="bg-[#070e24]/95 backdrop-blur-xl rounded-2xl border border-[#14234b] shadow-[0_4px_25px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="p-4 bg-[#09122e]/60 border-b border-[#14234b] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-white font-heading flex items-center gap-1.5">
                      <span>Transaction Ledger History ({partyInvoices.length} Bills/Purchases, {partyVouchers.length + partyDebitVouchers.length} Vouchers)</span>
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      {selectedParty?.type === 'SUPPLIER' ? 'Includes Purchase Bills, Inward Entries, Payments Paid & Debit Vouchers' : 'Includes Sales Invoices, TDS Deductions (1%), and Payment receipts'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsDateRangeModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold text-[11px] rounded-lg border border-indigo-500/30 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" /> 📅 Date to Date Statement
                    </button>
                    <button
                      onClick={() => {
                        setDateFilterEnabled(false);
                        setIsLedgerModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] rounded-lg border border-cyan-500/30 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Full Statement Print (1-Page)
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-[#101b3d]">
                  {partyInvoices.length === 0 && partyVouchers.length === 0 && partyDebitVouchers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No invoices, purchase bills, or payment vouchers recorded for this party yet.
                    </div>
                  ) : (
                    <>
                      {/* Invoices & Purchase Bills */}
                      {partyInvoices.map((inv) => (
                        <div key={inv.id} className="p-3.5 hover:bg-[#0c183d]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-colors">
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-white flex items-center gap-2">
                              <span>{inv.invoiceNumber}</span>
                              <span className={`text-[10px] font-sans font-semibold px-1.5 py-0.2 rounded border ${
                                inv.documentType === 'PURCHASE_BILL' || inv.documentType === 'PURCHASE_ESTIMATE'
                                  ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                                  : 'bg-[#09122e] text-cyan-300 border-[#1b2b5d]'
                              }`}>
                                {inv.documentType === 'PURCHASE_BILL' ? 'Purchase Bill' : inv.documentType === 'PURCHASE_ESTIMATE' ? 'Purchase Entry' : inv.documentType === 'TAX_INVOICE' ? 'Tax Invoice' : inv.documentType}
                              </span>
                              {inv.isRetentionApplicable && (inv.retentionAmount || 0) > 0 && (
                                <span className="text-[10px] font-sans font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-0.5">
                                  <Percent className="w-2.5 h-2.5" /> Retention {inv.retentionRate || 5}% ({formatIndianCurrency(inv.retentionAmount || 0)})
                                </span>
                              )}
                              {inv.isTdsApplicable && (inv.tdsAmount || 0) > 0 && (
                                <span className="text-[10px] font-sans font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 flex items-center gap-0.5">
                                  <Percent className="w-2.5 h-2.5" /> TDS {inv.tdsRate || 1}% ({formatIndianCurrency(inv.tdsAmount || 0)})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Date: {inv.date} {inv.dueDate ? `• Due: ${inv.dueDate}` : ''}
                            </div>
                            {inv.items && inv.items.length > 0 && (
                              <div className="text-[11.5px] font-semibold text-slate-300 pt-0.5">
                                {inv.items.map(it => it.name || it.description).filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-left sm:text-right space-y-0.5">
                              <div className="font-mono font-bold text-white flex sm:justify-end items-center gap-2">
                                <span>Bill: ₹ {formatIndianCurrency(inv.grandTotal)}</span>
                                {(inv.isTdsApplicable || inv.isRetentionApplicable) && (
                                  <span className="text-[11px] font-normal text-slate-400 font-mono">
                                    (Net: ₹ {formatIndianCurrency(inv.netPayableAfterDeductions || inv.netPayableAfterTds || (inv.grandTotal - (inv.tdsAmount || 0) - (inv.retentionAmount || 0)))})
                                  </span>
                                )}
                              </div>
                              <div className={`text-[10px] font-semibold ${inv.paymentStatus === 'PAID' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {inv.paymentStatus === 'PAID' ? '✓ FULLY PAID' : `${inv.paymentStatus} (${formatIndianCurrency(inv.balanceDue)} due)`}
                                {inv.paidAmount > 0 && inv.paymentStatus !== 'PAID' && (
                                  <span className="text-slate-400 ml-1">[{formatIndianCurrency(inv.paidAmount)} received]</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {onEditInvoice && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onEditInvoice(inv);
                                  }}
                                  className="w-7 h-7 rounded-full bg-blue-600/20 hover:bg-blue-600 text-cyan-400 hover:text-white border border-blue-500/30 flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer hover:scale-110"
                                  title={`Edit Bill ${inv.invoiceNumber}`}
                                  aria-label="Edit Invoice"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {onDeleteInvoice && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteInvoice(inv.id);
                                  }}
                                  className="w-7 h-7 rounded-full bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer hover:scale-110"
                                  title={`Delete Bill ${inv.invoiceNumber}`}
                                  aria-label="Delete Invoice"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Payment Vouchers */}
                      {partyVouchers.map((pv) => (
                        <div key={pv.id} className="p-3.5 bg-emerald-950/20 hover:bg-emerald-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs border-l-4 border-emerald-500 transition-colors group">
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-emerald-300 flex items-center gap-2">
                              <span>{pv.voucherNumber}</span>
                              <span className="text-[10px] font-sans font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                                Payment Received ({pv.paymentMode})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Date: {pv.date} • Ref / UTR: <span className="font-mono font-bold text-cyan-400">{pv.referenceNumber || 'N/A'}</span>
                            </div>
                            {pv.remarks && (
                              <div className="text-[11px] text-slate-300 italic">
                                &ldquo;{pv.remarks}&rdquo;
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-left sm:text-right space-y-0.5">
                              <div className="font-mono font-black text-emerald-400 text-sm">
                                - ₹ {formatIndianCurrency(pv.amount)} (Cr)
                              </div>
                              <div className="text-[10px] text-emerald-300/80 font-semibold">
                                Direct Ledger Credit
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {onEditVoucher && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onEditVoucher(pv);
                                  }}
                                  className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer hover:scale-110"
                                  title={`Edit Voucher ${pv.voucherNumber}`}
                                  aria-label="Edit Voucher"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {onDeleteVoucher && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteVoucher(pv.id);
                                  }}
                                  className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer hover:scale-110"
                                  title={`Delete Voucher ${pv.voucherNumber}`}
                                  aria-label="Delete Voucher"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Debit Vouchers */}
                      {partyDebitVouchers.map((dv) => (
                        <div key={dv.id} className="p-3.5 bg-rose-950/20 hover:bg-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs border-l-4 border-rose-500 transition-colors group">
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-rose-300 flex items-center gap-2">
                              <span>{dv.voucherNumber}</span>
                              <span className="text-[10px] font-sans font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded">
                                Debit Voucher ({dv.paymentMode})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Date: {dv.date} • Ref / UTR: <span className="font-mono font-bold text-cyan-400">{dv.referenceNumber || 'N/A'}</span>
                            </div>
                            {dv.remarks && (
                              <div className="text-[11px] text-slate-300 italic">
                                &ldquo;{dv.remarks}&rdquo;
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-left sm:text-right space-y-0.5">
                              <div className="font-mono font-black text-rose-400 text-sm">
                                + ₹ {formatIndianCurrency(dv.amount)} (Dr)
                              </div>
                              <div className="text-[10px] text-rose-300/80 font-semibold">
                                Direct Ledger Debit
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {onEditDebitVoucher && (
                                <button
                                  type="button"
                                  onClick={() => onEditDebitVoucher(dv)}
                                  className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer hover:scale-110"
                                  title={`Edit Debit Voucher ${dv.voucherNumber}`}
                                  aria-label="Edit Debit Voucher"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {onDeleteDebitVoucher && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteDebitVoucher(dv.id)}
                                  className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer hover:scale-110"
                                  title={`Delete Debit Voucher ${dv.voucherNumber}`}
                                  aria-label="Delete Debit Voucher"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
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

      {/* Add / Edit Party Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-blue-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingParty ? `Edit ${editingParty.name} (${activeType === 'CUSTOMER' ? 'Customer' : 'Supplier'})` : `Add New ${activeType === 'CUSTOMER' ? 'Customer' : 'Supplier'}`}
              </h3>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingParty(null);
                }}
                className="text-white/80 hover:text-white cursor-pointer"
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

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
                  <input 
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 370201"
                    value={formPincode}
                    onChange={(e) => setFormPincode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingParty(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
                >
                  {editingParty ? 'Update Party Details' : 'Save Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Date-to-Date Ledger Range Selection Dialog */}
      {isDateRangeModalOpen && selectedParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-700 via-indigo-800 to-blue-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Date to Date Ledger Print</h3>
                  <p className="text-[11px] text-indigo-200">
                    {selectedParty.type === 'SUPPLIER' ? 'Supplier' : 'Customer'} Date-wise Ledger Statement
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDateRangeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Party Information Banner */}
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-700 block">
                    {selectedParty.type === 'SUPPLIER' ? 'Supplier:' : 'Party / Customer:'}
                  </span>
                  <div className="font-bold text-slate-900 text-sm">{selectedParty.name}</div>
                  {selectedParty.phone && (
                    <div className="text-[11px] text-slate-500">📞 {selectedParty.phone}</div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Current Balance:</span>
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border inline-block mt-0.5 ${
                    selectedParty.currentBalance > 0 
                      ? 'bg-rose-50 text-rose-800 border-rose-200' 
                      : selectedParty.currentBalance < 0 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-slate-50 text-slate-800 border-slate-200'
                  }`}>
                    {formatIndianCurrency(Math.abs(selectedParty.currentBalance))}
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Quick Presets:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const y = now.getFullYear();
                      const m = String(now.getMonth() + 1).padStart(2, '0');
                      const lastD = String(new Date(y, now.getMonth() + 1, 0).getDate()).padStart(2, '0');
                      setLedgerFromDate(`${y}-${m}-01`);
                      setLedgerToDate(`${y}-${m}-${lastD}`);
                    }}
                    className="p-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl font-semibold text-slate-800 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>📅 This Month</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                      const y = prevMonth.getFullYear();
                      const m = String(prevMonth.getMonth() + 1).padStart(2, '0');
                      const lastD = String(new Date(y, prevMonth.getMonth() + 1, 0).getDate()).padStart(2, '0');
                      setLedgerFromDate(`${y}-${m}-01`);
                      setLedgerToDate(`${y}-${m}-${lastD}`);
                    }}
                    className="p-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl font-semibold text-slate-800 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>📅 Last Month</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
                      setLedgerFromDate(`${fyStart}-04-01`);
                      setLedgerToDate(`${fyStart + 1}-03-31`);
                    }}
                    className="p-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl font-semibold text-slate-800 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>📈 Current FY (FY 2025-26)</span>
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
                      setLedgerFromDate(`${y30}-${m30}-${day30}`);
                      setLedgerToDate(`${yNow}-${mNow}-${dayNow}`);
                    }}
                    className="p-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl font-semibold text-slate-800 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>⏱️ Last 30 Days</span>
                  </button>
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    From Date:
                  </label>
                  <input
                    type="date"
                    value={ledgerFromDate}
                    onChange={(e) => setLedgerFromDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    To Date:
                  </label>
                  <input
                    type="date"
                    value={ledgerToDate}
                    onChange={(e) => setLedgerToDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setDateFilterEnabled(false);
                    setIsDateRangeModalOpen(false);
                    setIsLedgerModalOpen(true);
                  }}
                  className="px-3 py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  All Dates (Full Ledger)
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDateRangeModalOpen(false)}
                    className="px-3 py-2 text-slate-500 hover:text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterEnabled(true);
                      setIsDateRangeModalOpen(false);
                      setIsLedgerModalOpen(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Ledger
                  </button>
                </div>
              </div>
            </div>
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
          debitVouchers={debitVouchers}
          onUpdateParty={onUpdateParty}
          initialDateFilterEnabled={dateFilterEnabled}
          initialFromDate={ledgerFromDate}
          initialToDate={ledgerToDate}
        />
      )}

    </div>
  );
};
