import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Check, Printer, Share2, Receipt, Building2, 
  Calendar, CreditCard, Hash, FileText, IndianRupee, Trash2, ArrowRight,
  Sparkles, Wallet, AlertCircle
} from 'lucide-react';
import { Party, Invoice, BusinessProfile, BankAccount, DebitVoucher, PaymentMode } from '../types';
import { formatIndianCurrency, numberToIndianWords } from '../utils/gstCalculations';
import { printElementSafely } from '../utils/pdfExport';

interface DebitVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  invoices: Invoice[];
  bankAccounts: BankAccount[];
  businessProfile: BusinessProfile;
  preSelectedParty?: Party | null;
  preSelectedBill?: Invoice | null;
  targetParty?: Party | null;
  targetBill?: Invoice | null;
  debitVouchers?: DebitVoucher[];
  editingVoucher?: DebitVoucher | null;
  onSaveVoucher: (voucher: DebitVoucher, linkedBillId?: string, bankAccountId?: string) => void;
  onDeleteVoucher?: (voucherId: string) => void;
}

export const DebitVoucherModal: React.FC<DebitVoucherModalProps> = ({
  isOpen,
  onClose,
  parties = [],
  invoices = [],
  bankAccounts = [],
  businessProfile,
  preSelectedParty = null,
  preSelectedBill = null,
  targetParty = null,
  targetBill = null,
  debitVouchers = [],
  editingVoucher = null,
  onSaveVoucher,
  onDeleteVoucher,
}) => {
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const [voucherNumber, setVoucherNumber] = useState<string>('');
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);

  const printReceiptRef = useRef<HTMLDivElement>(null);

  // Helper to generate next sequential serial number (DV-1, DV-2...)
  const getNextVoucherSerial = () => {
    if (!debitVouchers || debitVouchers.length === 0) return 'DV-1';
    const numericIds = debitVouchers
      .map(v => {
        const match = v.voucherNumber ? v.voucherNumber.trim().match(/\d+$/) : null;
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => !isNaN(n) && n > 0);

    if (numericIds.length > 0) {
      return `DV-${Math.max(...numericIds) + 1}`;
    }
    return `DV-${debitVouchers.length + 1}`;
  };

  // Initialize form state
  useEffect(() => {
    if (!isOpen) return;

    if (editingVoucher) {
      setSelectedPartyId(editingVoucher.partyId);
      setSelectedBillId(editingVoucher.billId || '');
      setAmount(editingVoucher.amount);
      setDate(editingVoucher.date || new Date().toISOString().split('T')[0]);
      setPaymentMode(editingVoucher.paymentMode || 'UPI');
      setReferenceNumber(editingVoucher.referenceNumber || '');
      setRemarks(editingVoucher.remarks || '');
      setSelectedBankAccountId(editingVoucher.bankAccountId || '');
      setVoucherNumber(editingVoucher.voucherNumber);
    } else {
      const activeTargetParty = targetParty || preSelectedParty;
      const activeTargetBill = targetBill || preSelectedBill;

      // Prefer supplier parties or first available party
      const supplierParties = parties.filter(p => p.type === 'SUPPLIER');
      const initialParty = activeTargetParty || (activeTargetBill ? parties.find(p => p.id === activeTargetBill.partyId) : (supplierParties[0] || parties[0]));
      
      setSelectedPartyId(initialParty?.id || '');
      
      if (activeTargetBill) {
        setSelectedBillId(activeTargetBill.id);
        setAmount(activeTargetBill.balanceDue > 0 ? activeTargetBill.balanceDue : activeTargetBill.grandTotal);
        setRemarks(`Payment made against Bill #${activeTargetBill.invoiceNumber}`);
      } else {
        setSelectedBillId('');
        // If party has payable balance (negative balance or To Pay)
        const due = initialParty ? Math.abs(initialParty.currentBalance || 0) : 0;
        setAmount(due > 0 ? due : 0);
        setRemarks('Debit / Payment voucher issued to supplier');
      }

      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMode('UPI');
      setReferenceNumber('');
      setVoucherNumber(getNextVoucherSerial());
      setSelectedBankAccountId(bankAccounts[0]?.id || '');
    }
    setShowPrintPreview(false);
  }, [isOpen, editingVoucher, targetParty, targetBill, preSelectedParty, preSelectedBill]);

  // Current selected party details
  const currentParty = parties.find(p => p.id === selectedPartyId);

  // Eligible bills / purchase estimates for selected party
  const partyBills = invoices.filter(inv => 
    inv.partyId === selectedPartyId && 
    (inv.documentType === 'PURCHASE_ESTIMATE' || inv.balanceDue > 0)
  );

  // Handle bill selection change
  const handleBillSelect = (billId: string) => {
    setSelectedBillId(billId);
    if (!billId) {
      if (currentParty) {
        setAmount(Math.abs(currentParty.currentBalance || 0));
      }
      return;
    }
    const target = invoices.find(inv => inv.id === billId);
    if (target) {
      setAmount(target.balanceDue > 0 ? target.balanceDue : target.grandTotal);
      setRemarks(`Payment made against Bill #${target.invoiceNumber}`);
    }
  };

  // Handle Save
  const handleSave = (shouldPrint = false) => {
    if (!selectedPartyId) {
      alert('Kripya Party / Supplier chunein.');
      return;
    }
    if (!amount || amount <= 0) {
      alert('Kripya valid payment amount dalein.');
      return;
    }
    if (!voucherNumber.trim()) {
      alert('Kripya Debit Voucher Number dalein.');
      return;
    }

    const linkedBill = invoices.find(i => i.id === selectedBillId);
    const selectedBank = bankAccounts.find(b => b.id === selectedBankAccountId);

    const savedVoucher: DebitVoucher = {
      id: editingVoucher?.id || `dv-${Date.now()}`,
      voucherNumber: voucherNumber.trim(),
      date,
      partyId: selectedPartyId,
      partyName: currentParty?.name || 'Party',
      amount: Number(amount),
      paymentMode,
      referenceNumber: referenceNumber.trim(),
      billId: selectedBillId || undefined,
      billNumber: linkedBill?.invoiceNumber || undefined,
      billAmount: linkedBill?.grandTotal || undefined,
      remarks: remarks.trim() || undefined,
      bankAccountId: paymentMode !== 'CASH' ? selectedBankAccountId : undefined,
      bankAccountName: paymentMode !== 'CASH' ? (selectedBank ? `${selectedBank.bankName} (${selectedBank.accountNumber.slice(-4)})` : undefined) : undefined,
      createdAt: editingVoucher?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveVoucher(savedVoucher, selectedBillId || undefined, paymentMode !== 'CASH' ? selectedBankAccountId : undefined);

    if (shouldPrint) {
      setShowPrintPreview(true);
    } else {
      onClose();
    }
  };

  // WhatsApp share helper
  const handleShareWhatsApp = () => {
    if (!currentParty) return;
    const phone = currentParty.phone?.replace(/[^0-9]/g, '') || '';
    const text = encodeURIComponent(
      `*DEBIT VOUCHER / PAYMENT ADVICE*\n` +
      `--------------------------------\n` +
      `*From:* ${businessProfile.name}\n` +
      `*Paid To:* ${currentParty.name}\n` +
      `*Voucher No:* ${voucherNumber}\n` +
      `*Date:* ${date}\n` +
      `*Amount Paid:* ₹${amount.toLocaleString('en-IN')} (Dr)\n` +
      `*Payment Mode:* ${paymentMode}${referenceNumber ? ` (Ref: ${referenceNumber})` : ''}\n` +
      `${selectedBillId ? `*Adjusted Against Bill:* ${invoices.find(i => i.id === selectedBillId)?.invoiceNumber}\n` : ''}` +
      `${remarks ? `*Particulars:* ${remarks}\n` : ''}` +
      `--------------------------------\n` +
      `Payment successfully debited from our account. Thank you!`
    );

    const url = phone ? `https://wa.me/91${phone.slice(-10)}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:px-6 bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white flex items-center justify-between border-b border-rose-700/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-xl border border-rose-400/30 text-rose-300">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {editingVoucher ? 'Edit Debit Voucher' : 'Record Debit Voucher'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30">
                  भुगतान अदायगी
                </span>
              </div>
              <p className="text-xs text-rose-200/80">
                Payment made to supplier / vendor with direct ledger debit &amp; instant voucher receipt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-rose-200 hover:text-white hover:bg-rose-800/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Row 1: Voucher Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-rose-700" /> Voucher Number *
              </label>
              <input
                type="text"
                value={voucherNumber}
                onChange={(e) => setVoucherNumber(e.target.value)}
                placeholder="e.g. DV-1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-700" /> Payment Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>
          </div>

          {/* Row 2: Select Party (Supplier / Vendor) */}
          <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-rose-700" /> Paid To (Party / Supplier / Vendor) *
              </label>
              {currentParty && (
                <span className={`text-[11px] font-bold ${
                  currentParty.currentBalance < 0 
                    ? 'text-rose-700' 
                    : currentParty.currentBalance > 0 
                      ? 'text-emerald-700' 
                      : 'text-slate-500'
                }`}>
                  Balance: ₹{Math.abs(currentParty.currentBalance).toLocaleString('en-IN')}{' '}
                  {currentParty.currentBalance < 0 ? '(Payable / To Pay)' : currentParty.currentBalance > 0 ? '(Receivable)' : '(Nil)'}
                </span>
              )}
            </div>

            <select
              value={selectedPartyId}
              onChange={(e) => {
                setSelectedPartyId(e.target.value);
                setSelectedBillId('');
                const p = parties.find(party => party.id === e.target.value);
                if (p) {
                  setAmount(Math.abs(p.currentBalance || 0));
                }
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 cursor-pointer"
            >
              <option value="">-- Choose Party / Supplier --</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.type === 'SUPPLIER' ? '🏷️ [Supplier]' : '👤 [Customer]'} • Balance: ₹{Math.abs(p.currentBalance || 0).toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </div>

          {/* Row 3: Linked Purchase Bill / Invoice (Optional) */}
          {partyBills.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" /> Link Against Bill / Purchase Estimate (Optional)
              </label>
              <select
                value={selectedBillId}
                onChange={(e) => handleBillSelect(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
              >
                <option value="">Direct Ledger Payment (No specific bill)</option>
                {partyBills.map(b => (
                  <option key={b.id} value={b.id}>
                    Bill #{b.invoiceNumber} ({b.date}) • Due: ₹{formatIndianCurrency(b.balanceDue || b.grandTotal)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Row 4: Amount Input & Live Indian Words */}
          <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-rose-400" /> Amount Paid (₹ Debit) *
              </label>
              <span className="text-[10px] text-slate-400">Indian Rupee</span>
            </div>
            
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-rose-400 font-mono">₹</span>
              <input
                type="number"
                min="0"
                step="any"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xl font-mono font-black text-rose-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-hidden"
              />
            </div>

            {amount > 0 && (
              <div className="text-[11px] text-rose-200/90 italic pt-1 border-t border-slate-800/80 font-medium">
                👉 {numberToIndianWords(amount)}
              </div>
            )}
          </div>

          {/* Row 5: Payment Mode & Source Bank Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-rose-700" /> Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="NEFT_RTGS">NEFT / RTGS Bank Transfer</option>
                <option value="CASH">Cash (Petty Cash / Galla)</option>
                <option value="CHEQUE">Cheque / Demand Draft</option>
                <option value="NET_BANKING">Net Banking (IMPS)</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>

            {paymentMode !== 'CASH' ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" /> Paid From Bank Account
                </label>
                <select
                  value={selectedBankAccountId}
                  onChange={(e) => setSelectedBankAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  <option value="">Default Business Account</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} - A/C *{acc.accountNumber.slice(-4)} (Bal: ₹{acc.balance.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" /> Cash Account
                </label>
                <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
                  <span>Cash Galla / Counter Balance</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Auto Outflow
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Row 6: Reference Number (UTR / Cheque No) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-500" /> 
                {paymentMode === 'CHEQUE' ? 'Cheque Number' : paymentMode === 'CASH' ? 'Cash Memo / Receipt No.' : 'UTR / Transaction Ref No.'}
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Optional</span>
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={paymentMode === 'CHEQUE' ? 'e.g. 000124' : 'e.g. UTR190823901249'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Row 7: Remarks / Particulars & Quick Tags */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700">Remarks / Payment Particulars</label>
              <div className="flex items-center gap-1">
                {['Advance Payment', 'Bill Settlement', 'Material Purchase', 'Freight / Labour'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setRemarks(tag)}
                    className="text-[9.5px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-medium transition-colors"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Payment made towards steel plates delivery and fabrication advance..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 leading-relaxed"
            />
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div>
            {editingVoucher && onDeleteVoucher && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete debit voucher "${editingVoucher.voucherNumber}"?`)) {
                    onDeleteVoucher(editingVoucher.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2 text-rose-700 hover:bg-rose-100 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Voucher
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Save &amp; Print
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-black rounded-xl text-xs shadow-md shadow-rose-700/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" /> Save Debit Voucher
            </button>
          </div>
        </div>

      </div>

      {/* Instant Print Preview Modal after Saving */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 uppercase flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-700" />
                Debit Voucher Receipt Ready
              </h3>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Area */}
            <div ref={printReceiptRef} className="border-2 border-slate-900 rounded-2xl p-6 bg-white space-y-4 text-slate-900">
              <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                <h2 className="text-xl font-black uppercase tracking-tight">{businessProfile.name}</h2>
                <p className="text-xs text-slate-600">{businessProfile.address}, {businessProfile.city} - {businessProfile.pincode}</p>
                <p className="text-xs font-mono font-bold text-slate-700">GSTIN: {businessProfile.gstin} | PAN: {businessProfile.pan}</p>
                <div className="pt-1">
                  <span className="px-3 py-0.5 rounded-full bg-rose-900 text-white font-black text-xs uppercase tracking-wider">
                    Official Debit Voucher (Payment Advice)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-200 pb-3">
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block">Voucher No:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{voucherNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 uppercase text-[10px] block">Date:</span>
                  <span className="font-mono font-bold text-slate-900">{date}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block">Debited / Paid To:</span>
                  <span className="font-black text-slate-950 text-base">{currentParty?.name || 'Party'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Payment Mode:</span>
                    <span className="font-bold text-slate-900">{paymentMode}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Ref / UTR No:</span>
                    <span className="font-mono font-bold text-slate-900">{referenceNumber || 'N/A'}</span>
                  </div>
                </div>

                {remarks && (
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Particulars / Remarks:</span>
                    <span className="text-slate-700 italic">{remarks}</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-800 uppercase block">Amount Debited:</span>
                  <span className="text-xs text-rose-900 italic font-medium">{numberToIndianWords(amount)}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black text-rose-900">
                    {formatIndianCurrency(amount)}
                  </span>
                </div>
              </div>

              <div className="pt-6 flex items-end justify-between text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Computer Generated Voucher</div>
                  <div className="font-semibold text-slate-700">Receiver's Signature / Seal</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="h-10 border-b border-slate-400 w-40 ml-auto"></div>
                  <div className="font-black text-slate-900 text-xs">Authorized Signatory</div>
                  <div className="text-[10px] text-slate-500">{businessProfile.name}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp Voucher
              </button>
              <button
                type="button"
                onClick={() => {
                  if (printReceiptRef.current) {
                    printElementSafely(printReceiptRef.current, `Debit_Voucher_${voucherNumber}`);
                  } else {
                    window.print();
                  }
                }}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Voucher
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
