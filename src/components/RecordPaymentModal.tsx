import React, { useState } from 'react';
import { X, Check, DollarSign, CreditCard, Smartphone, Building2 } from 'lucide-react';
import { Invoice, Party, PaymentMode } from '../types';
import { formatIndianCurrency } from '../utils/gstCalculations';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetInvoice?: Invoice | null;
  targetParty?: Party | null;
  onSavePayment: (data: {
    invoiceId?: string;
    partyId: string;
    partyName: string;
    amount: number;
    paymentMode: PaymentMode;
    referenceNumber: string;
    notes: string;
  }) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  targetInvoice,
  targetParty,
  onSavePayment,
}) => {
  const [amount, setAmount] = useState<number>(() => {
    if (targetInvoice) return targetInvoice.balanceDue;
    if (targetParty) return Math.abs(targetParty.currentBalance);
    return 0;
  });
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const partyName = targetInvoice?.partyName || targetParty?.name || 'Customer';
  const partyId = targetInvoice?.partyId || targetParty?.id || '';
  const dueAmount = targetInvoice?.balanceDue ?? (targetParty?.currentBalance ? Math.abs(targetParty.currentBalance) : 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    onSavePayment({
      invoiceId: targetInvoice?.id,
      partyId,
      partyName,
      amount,
      paymentMode,
      referenceNumber,
      notes,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Record Payment / Collection</h2>
            <p className="text-xs text-emerald-100">Log customer payment or vendor settlement</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Target Info */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Party:</span>
              <span className="font-bold text-slate-900">{partyName}</span>
            </div>
            {targetInvoice && (
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-mono font-bold text-blue-900">{targetInvoice.invoiceNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Total Outstanding Due:</span>
              <span className="font-mono font-bold text-rose-700">{formatIndianCurrency(dueAmount)}</span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">Payment Amount Received (₹) *</label>
            <input 
              type="number"
              min="1"
              required
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-black text-emerald-800 focus:bg-white focus:ring-2 focus:ring-emerald-600"
              autoFocus
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
            <div className="grid grid-cols-3 gap-2 font-medium">
              {(['UPI', 'CASH', 'NEFT_RTGS', 'CHEQUE', 'CARD'] as PaymentMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 px-2 rounded-xl text-center transition-colors ${
                    paymentMode === mode 
                      ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {mode === 'UPI' ? 'UPI / QR' : mode === 'NEFT_RTGS' ? 'NEFT / RTGS' : mode}
                </button>
              ))}
            </div>
          </div>

          {/* Reference / UTR */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reference Number / UPI UTR / Cheque No.</label>
            <input 
              type="text"
              placeholder="e.g. UPI/6231908231 or Cheque 99120"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Notes (Optional)</label>
            <input 
              type="text"
              placeholder="Payment remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors"
            >
              Record Payment
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
