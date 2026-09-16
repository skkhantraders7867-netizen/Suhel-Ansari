import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Check, Printer, Download, Share2, Receipt, Building2, 
  Calendar, CreditCard, Hash, FileText, IndianRupee, Trash2, ArrowRight
} from 'lucide-react';
import { Party, Invoice, BusinessProfile, BankAccount, PaymentVoucher, PaymentMode } from '../types';
import { formatIndianCurrency, numberToIndianWords } from '../utils/gstCalculations';
import { printElementSafely, downloadElementAsPdf } from '../utils/pdfExport';

interface PaymentReceivedVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  invoices: Invoice[];
  bankAccounts: BankAccount[];
  businessProfile: BusinessProfile;
  preSelectedParty?: Party | null;
  preSelectedInvoice?: Invoice | null;
  editingVoucher?: PaymentVoucher | null;
  onSaveVoucher: (voucher: PaymentVoucher, linkedInvoiceId?: string, bankAccountId?: string) => void;
  onDeleteVoucher?: (voucherId: string) => void;
}

export const PaymentReceivedVoucherModal: React.FC<PaymentReceivedVoucherModalProps> = ({
  isOpen,
  onClose,
  parties = [],
  invoices = [],
  bankAccounts = [],
  businessProfile,
  preSelectedParty = null,
  preSelectedInvoice = null,
  editingVoucher = null,
  onSaveVoucher,
  onDeleteVoucher,
}) => {
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const [voucherNumber, setVoucherNumber] = useState<string>('');
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const printReceiptRef = useRef<HTMLDivElement>(null);

  // Initialize form state
  useEffect(() => {
    if (!isOpen) return;

    if (editingVoucher) {
      setSelectedPartyId(editingVoucher.partyId);
      setSelectedInvoiceId(editingVoucher.invoiceId || '');
      setAmount(editingVoucher.amount);
      setDate(editingVoucher.date || new Date().toISOString().split('T')[0]);
      setPaymentMode(editingVoucher.paymentMode || 'UPI');
      setReferenceNumber(editingVoucher.referenceNumber || '');
      setRemarks(editingVoucher.remarks || '');
      setSelectedBankAccountId(editingVoucher.bankAccountId || '');
      setVoucherNumber(editingVoucher.voucherNumber);
    } else {
      const initialParty = preSelectedParty || (preSelectedInvoice ? parties.find(p => p.id === preSelectedInvoice.partyId) : parties[0]);
      setSelectedPartyId(initialParty?.id || '');
      
      if (preSelectedInvoice) {
        setSelectedInvoiceId(preSelectedInvoice.id);
        setAmount(preSelectedInvoice.balanceDue > 0 ? preSelectedInvoice.balanceDue : preSelectedInvoice.grandTotal);
        setRemarks(`Payment received for Invoice ${preSelectedInvoice.invoiceNumber}`);
      } else {
        setSelectedInvoiceId('');
        setAmount(initialParty ? Math.max(0, initialParty.currentBalance || 0) : 0);
        setRemarks('');
      }

      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMode('UPI');
      setReferenceNumber('');
      setSelectedBankAccountId(bankAccounts[0]?.id || '');
      
      const vNum = `RCV-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      setVoucherNumber(vNum);
    }
    setShowPrintPreview(false);
  }, [isOpen, editingVoucher, preSelectedParty, preSelectedInvoice, parties, bankAccounts]);

  if (!isOpen) return null;

  const currentParty = parties.find(p => p.id === selectedPartyId) || null;
  const partyInvoices = invoices.filter(inv => inv.partyId === selectedPartyId && inv.documentType !== 'QUOTATION' && inv.documentType !== 'PURCHASE_ESTIMATE');
  const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId) || null;

  // Handle party selection change
  const handlePartyChange = (newPartyId: string) => {
    setSelectedPartyId(newPartyId);
    setSelectedInvoiceId('');
    const party = parties.find(p => p.id === newPartyId);
    if (party) {
      setAmount(Math.max(0, party.currentBalance || 0));
    }
  };

  // Handle invoice selection change
  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    if (invId) {
      const inv = invoices.find(i => i.id === invId);
      if (inv) {
        setAmount(inv.balanceDue > 0 ? inv.balanceDue : inv.grandTotal);
        setRemarks(`Payment against Bill #${inv.invoiceNumber}`);
      }
    } else {
      setRemarks('On Account / Ledger Credit Payment');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentParty) return;
    if (amount <= 0) {
      alert('Please enter a valid payment amount greater than 0');
      return;
    }

    const bankAcc = bankAccounts.find(b => b.id === selectedBankAccountId);

    const voucher: PaymentVoucher = {
      id: editingVoucher?.id || `pv-${Date.now()}`,
      voucherNumber: voucherNumber || `RCV-${Date.now()}`,
      date,
      partyId: currentParty.id,
      partyName: currentParty.name,
      amount: Number(amount),
      paymentMode,
      referenceNumber: referenceNumber.trim() || 'N/A',
      invoiceId: selectedInvoice?.id,
      invoiceNumber: selectedInvoice?.invoiceNumber,
      invoiceAmount: selectedInvoice?.grandTotal,
      remarks: remarks.trim(),
      bankAccountId: bankAcc?.id,
      bankAccountName: bankAcc ? `${bankAcc.bankName} (${bankAcc.accountNumber.slice(-4)})` : undefined,
      createdAt: editingVoucher?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveVoucher(voucher, selectedInvoice?.id, selectedBankAccountId);
    onClose();
  };

  const handlePrint = () => {
    if (printReceiptRef.current) {
      printElementSafely(printReceiptRef.current, `Payment_Receipt_${voucherNumber}`);
    }
  };

  const handleDownloadPdf = async () => {
    if (printReceiptRef.current) {
      setIsExporting(true);
      await downloadElementAsPdf(printReceiptRef.current, `Payment_Receipt_${voucherNumber}.pdf`);
      setIsExporting(false);
    }
  };

  const newOutstanding = currentParty 
    ? (currentParty.currentBalance - amount)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Receipt className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {editingVoucher ? 'Edit Payment Received Voucher' : 'Payment Received Voucher (पेमेंट रिसीप्ट)'}
              </h2>
              <p className="text-[11px] text-emerald-200">
                Direct Party Ledger Credit &amp; Invoice Settlement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPrintPreview(!showPrintPreview)}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{showPrintPreview ? 'Edit Form' : 'Preview Receipt'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {!showPrintPreview ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            
            {/* Voucher No & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-emerald-700" /> Voucher / Receipt No.
                </label>
                <input 
                  type="text"
                  required
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold text-emerald-950 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" /> Payment Received Date *
                </label>
                <input 
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Customer / Company Select */}
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-700" /> Customer / Company (पार्टी का नाम) *
                </span>
                {currentParty && (
                  <span className="text-[11px] font-mono font-bold text-slate-600">
                    Current Balance: <strong className={currentParty.currentBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                      {formatIndianCurrency(currentParty.currentBalance)} {currentParty.currentBalance > 0 ? 'Dr (Due)' : 'Cr'}
                    </strong>
                  </span>
                )}
              </label>
              <select
                required
                value={selectedPartyId}
                onChange={(e) => handlePartyChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
              >
                <option value="">-- Select Customer / Company --</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone ? `(${p.phone})` : ''} - Due: {formatIndianCurrency(p.currentBalance)}
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Link Selection */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-600" /> Settle Against Specific Bill (Optional)
                </span>
                <span className="text-[10.5px] text-slate-500 font-normal">
                  Select invoice to auto-update invoice balance
                </span>
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:bg-white"
              >
                <option value="">— Direct Ledger Credit (On Account / Advance) —</option>
                {partyInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    Bill #{inv.invoiceNumber} | Date: {inv.date} | Total: {formatIndianCurrency(inv.grandTotal)} | Balance Due: {formatIndianCurrency(inv.balanceDue)} ({inv.paymentStatus})
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Summary Card if invoice selected */}
            {selectedInvoice && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10.5px]">Selected Bill:</span>
                  <div className="font-mono font-bold text-blue-950">#{selectedInvoice.invoiceNumber} ({selectedInvoice.date})</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10.5px]">Bill Amount:</span>
                  <div className="font-mono font-bold text-slate-900">{formatIndianCurrency(selectedInvoice.grandTotal)}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10.5px]">Already Received:</span>
                  <div className="font-mono font-bold text-emerald-800">{formatIndianCurrency(selectedInvoice.paidAmount || 0)}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10.5px]">Current Due:</span>
                  <div className="font-mono font-black text-rose-700">{formatIndianCurrency(selectedInvoice.balanceDue)}</div>
                </div>
              </div>
            )}

            {/* Amount & Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-700" /> Received Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input 
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                {amount > 0 && (
                  <div className="text-[10px] text-emerald-800 font-semibold mt-1">
                    {numberToIndianWords(amount)}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-slate-700" /> Payment Mode *
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm / BHIM)</option>
                  <option value="NEFT_RTGS">NEFT / RTGS / IMPS Bank Transfer</option>
                  <option value="NET_BANKING">Net Banking</option>
                  <option value="CHEQUE">Cheque (DD / Bank Cheque)</option>
                  <option value="CASH">Cash in Hand</option>
                  <option value="DEBIT_CARD">Debit Card / POS</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                </select>
              </div>
            </div>

            {/* Reference Number & Deposit Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Payment Ref / UTR / Cheque / UTS No.
                </label>
                <input 
                  type="text"
                  placeholder="e.g. UTR12345678, Chq #0042, UTS-9876"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Deposit Into (Bank / Cash Account)
                </label>
                <select
                  value={selectedBankAccountId}
                  onChange={(e) => setSelectedBankAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:bg-white"
                >
                  <option value="">-- Direct Party Ledger Only --</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.accountNumber} ({acc.accountType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Remarks / Payment Narration
              </label>
              <input 
                type="text"
                placeholder="e.g. Received full settlement for site electrical work"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white"
              />
            </div>

            {/* Live Balance Summary */}
            {currentParty && (
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Ledger Impact</div>
                  <div className="font-bold text-slate-800">
                    Old Balance: <span className="font-mono">{formatIndianCurrency(currentParty.currentBalance)}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <div className="text-right space-y-0.5">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">New Balance After Payment</div>
                  <div className="font-mono font-black text-emerald-800 text-sm">
                    {formatIndianCurrency(newOutstanding)} {newOutstanding > 0 ? 'Dr (Due)' : 'Cr (Settled)'}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              {editingVoucher && onDeleteVoucher ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this payment voucher? This will reverse the ledger credit.')) {
                      onDeleteVoucher(editingVoucher.id);
                      onClose();
                    }
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Voucher
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-4 h-4" /> Save Payment Voucher (वाउचर सेव करें)
                </button>
              </div>
            </div>

          </form>
        ) : (
          /* Printable Payment Voucher Preview */
          <div className="p-6 space-y-4">
            
            {/* Print Action Bar */}
            <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Official Payment Receipt / Money Voucher</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isExporting}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> {isExporting ? 'Exporting...' : 'Download PDF'}
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Receipt
                </button>
              </div>
            </div>

            {/* Printable Document Box */}
            <div 
              ref={printReceiptRef}
              className="bg-white p-6 border-2 border-slate-800 rounded-none text-slate-900 font-sans space-y-4 text-xs"
            >
              {/* Header */}
              <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-[#0f2e6b] uppercase">{businessProfile.name}</h1>
                  <p className="text-[11px] text-slate-600">{[businessProfile.address, businessProfile.city, businessProfile.state].filter(Boolean).join(', ')}</p>
                  <div className="text-[10px] text-slate-700 mt-0.5">
                    {businessProfile.gstin && <span><strong>GSTIN:</strong> {businessProfile.gstin} | </span>}
                    {businessProfile.phone && <span><strong>Phone:</strong> {businessProfile.phone}</span>}
                  </div>
                </div>
                <div className="text-right bg-emerald-50 border border-emerald-300 p-2 rounded-lg">
                  <div className="text-xs font-black uppercase text-emerald-900">PAYMENT RECEIPT</div>
                  <div className="text-[10px] font-mono font-bold text-slate-800 mt-0.5">No: {voucherNumber}</div>
                  <div className="text-[10px] text-slate-600 font-semibold">Date: {date}</div>
                </div>
              </div>

              {/* Receipt Body */}
              <div className="space-y-3 pt-2 text-xs leading-relaxed">
                <div className="flex items-baseline border-b border-dashed border-slate-400 pb-1.5">
                  <span className="font-bold text-slate-600 w-44 shrink-0">Received with thanks from:</span>
                  <span className="font-extrabold text-slate-950 uppercase text-sm">{currentParty?.name || 'Customer'}</span>
                </div>

                <div className="flex items-baseline border-b border-dashed border-slate-400 pb-1.5">
                  <span className="font-bold text-slate-600 w-44 shrink-0">The sum of Rupees:</span>
                  <span className="font-bold text-slate-900">{numberToIndianWords(amount)} Only</span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-dashed border-slate-400 pb-1.5">
                  <div className="flex items-baseline">
                    <span className="font-bold text-slate-600 w-44 shrink-0">Payment Mode:</span>
                    <span className="font-bold uppercase text-emerald-900">{paymentMode}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="font-bold text-slate-600 w-28 shrink-0">Reference / UTR:</span>
                    <span className="font-mono font-bold text-slate-900">{referenceNumber || 'N/A'}</span>
                  </div>
                </div>

                {selectedInvoice && (
                  <div className="flex items-baseline border-b border-dashed border-slate-400 pb-1.5">
                    <span className="font-bold text-slate-600 w-44 shrink-0">Against Invoice #:</span>
                    <span className="font-mono font-bold text-blue-900">{selectedInvoice.invoiceNumber} (Bill Total: {formatIndianCurrency(selectedInvoice.grandTotal)})</span>
                  </div>
                )}

                {remarks && (
                  <div className="flex items-baseline border-b border-dashed border-slate-400 pb-1.5">
                    <span className="font-bold text-slate-600 w-44 shrink-0">Remarks / Purpose:</span>
                    <span className="text-slate-800">{remarks}</span>
                  </div>
                )}
              </div>

              {/* Amount Box & Signature */}
              <div className="pt-4 flex justify-between items-end">
                <div className="bg-slate-100 border-2 border-slate-800 px-4 py-2 rounded-md">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Amount Received</div>
                  <div className="text-xl font-black font-mono text-emerald-900">
                    {formatIndianCurrency(amount)}
                  </div>
                </div>

                <div className="text-right space-y-8">
                  <div className="text-[10.5px] text-slate-700">For <strong>{businessProfile.name}</strong></div>
                  <div className="border-t border-slate-400 pt-1 text-[9.5px] font-bold uppercase text-slate-600">
                    Authorized Signatory
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
