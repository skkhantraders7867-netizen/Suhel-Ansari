import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, 
  CreditCard, Smartphone, Check, ArrowLeft, Printer, RefreshCw, User, Tag, ShieldCheck
} from 'lucide-react';
import { Item, Party, BusinessProfile, Invoice, InvoiceItem } from '../types';
import { formatIndianCurrency, calculateLineItem, calculateInvoiceTotals } from '../utils/gstCalculations';

interface PosBillingViewProps {
  items: Item[];
  parties: Party[];
  businessProfile: BusinessProfile;
  onSaveInvoice: (invoice: Invoice, openPreview?: boolean) => void;
  onBack: () => void;
}

interface CartItem {
  item: Item;
  quantity: number;
  discountPercent: number;
}

export const PosBillingView: React.FC<PosBillingViewProps> = ({
  items = [],
  parties = [],
  businessProfile,
  onSaveInvoice,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Selected Customer (default: Walk-in / Cash Customer)
  const [customerName, setCustomerName] = useState('Walk-in Cash Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Payment mode
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD'>('UPI');
  const [receivedAmount, setReceivedAmount] = useState<number | ''>('');

  // Extract unique categories
  const categories = ['ALL', ...Array.from(new Set((items || []).map(i => i.category)))];

  // Filter items
  const filteredItems = (items || []).filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.barcode && item.barcode.includes(searchTerm)) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Add to cart
  const handleAddToCart = (item: Item) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.item.id === item.id);
      if (existing) {
        return prev.map(ci => ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { item, quantity: 1, discountPercent: 0 }];
    });
  };

  // Update quantity
  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(ci => {
          if (ci.item.id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Set exact quantity directly by typing
  const handleSetExactQty = (itemId: string, exactQty: number) => {
    setCart(prev => {
      return prev
        .map(ci => {
          if (ci.item.id === itemId) {
            return exactQty > 0 ? { ...ci, quantity: exactQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Clear Cart
  const handleClearCart = () => {
    setCart([]);
  };

  // Convert Cart to Invoice Items
  const invoiceItems: InvoiceItem[] = cart.map((ci, idx) => {
    const calc = calculateLineItem(
      ci.quantity,
      ci.item.sellingPrice,
      ci.discountPercent,
      ci.item.taxRate,
      false, // Intra-state by default for counter retail
      0
    );

    return {
      id: `pos-item-${idx}`,
      itemId: ci.item.id,
      name: ci.item.name,
      hsnCode: ci.item.hsnCode,
      unit: ci.item.unit,
      ...calc,
    };
  });

  // Totals
  const totals = calculateInvoiceTotals(invoiceItems, 0, 0, receivedAmount === '' ? undefined : receivedAmount);

  // Complete POS Sale
  const handleCheckout = (openPrint: boolean = true) => {
    if (cart.length === 0) return;

    const newInvoice: Invoice = {
      id: `pos-inv-${Date.now()}`,
      documentType: 'TAX_INVOICE',
      invoiceNumber: `POS-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      partyId: 'walkin-pos',
      partyName: customerName.trim() || 'Walk-in Cash Customer',
      partyPhone: customerPhone.trim() || '+91 99999 00000',
      partyAddress: 'Counter Retail Sale',
      partyState: businessProfile.state,
      partyStateCode: businessProfile.stateCode,
      placeOfSupply: `${businessProfile.stateCode} - ${businessProfile.state}`,
      isInterState: false,
      isReverseCharge: false,
      items: invoiceItems,
      subTotal: totals.subTotal,
      itemDiscountTotal: totals.itemDiscountTotal,
      extraDiscount: 0,
      shippingCharges: 0,
      taxableTotal: totals.taxableTotal,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      cessTotal: 0,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      paidAmount: totals.grandTotal, // Full counter payment
      balanceDue: 0,
      paymentStatus: 'PAID',
      paymentMode: paymentMode,
      notes: 'Counter POS sale. Paid in full.',
      terms: 'Warranty as per manufacturer terms.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.7 }
    });

    onSaveInvoice(newInvoice, openPrint);
    setCart([]);
    setCustomerName('Walk-in Cash Customer');
    setCustomerPhone('');
  };

  return (
    <div className="space-y-4 pb-12">
      
      {/* POS Top Header */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <span>Quick POS Counter Billing</span>
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                ⚡ Lightning Checkout
              </span>
            </h1>
            <p className="text-xs text-slate-400">Barcode scanner ready • Rapid thermal & A4 billing</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
          <span>{businessProfile.name}</span>
          <span className="font-mono bg-slate-800 px-2 py-1 rounded-md text-emerald-400 font-bold">Online</span>
        </div>
      </div>

      {/* Main Grid: Products (Left) + Cart & Checkout (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Product Grid (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search & Categories */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Scan barcode or type item name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600"
                autoFocus
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                    selectedCategory === cat 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const inCart = cart.find(ci => ci.item.id === item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => handleAddToCart(item)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none text-left flex flex-col justify-between h-36 ${
                    inCart 
                      ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs' 
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug">{item.name}</span>
                      {inCart && (
                        <span className="shrink-0 bg-blue-600 text-white font-mono font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                          {inCart.quantity}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">HSN: {item.hsnCode}</div>
                  </div>

                  <div className="flex items-end justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span className="font-mono font-black text-sm text-slate-900">{formatIndianCurrency(item.sellingPrice)}</span>
                      <span className="text-[9px] text-slate-400 block">GST {item.taxRate}%</span>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      + Add
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right: Active POS Cart (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden min-h-[600px]">
          
          {/* Cart Header */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-sm text-slate-900">Current Sale Cart</span>
              <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {cart.reduce((s, c) => s + c.quantity, 0)} items
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Customer Input Sub-bar */}
          <div className="p-3 bg-slate-100/60 border-b border-slate-200 grid grid-cols-2 gap-2 text-xs">
            <input 
              type="text"
              placeholder="Customer Name (e.g. Rahul)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium"
            />
            <input 
              type="tel"
              placeholder="Customer Mobile (Optional)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium"
            />
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-2 opacity-50" />
                <p className="font-semibold text-slate-600 text-sm">Cart is empty</p>
                <p className="text-xs text-slate-400">Click products or scan barcode to add items</p>
              </div>
            ) : (
              cart.map((ci) => (
                <div key={ci.item.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 leading-tight">{ci.item.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {formatIndianCurrency(ci.item.sellingPrice)} × {ci.quantity} {ci.item.unit}
                    </div>
                  </div>

                  {/* Qty +/- & Direct Input */}
                  <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
                    <button
                      onClick={() => handleUpdateQty(ci.item.id, -1)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-700"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={ci.quantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        handleSetExactQty(ci.item.id, isNaN(val) ? 0 : val);
                      }}
                      className="font-mono font-bold w-12 text-center text-xs px-0.5 py-0.5 border-0 bg-transparent focus:ring-1 focus:ring-blue-500 rounded"
                      title="Type exact quantity"
                    />
                    <button
                      onClick={() => handleUpdateQty(ci.item.id, 1)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-700"
                      title="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="font-mono font-bold text-slate-900 text-right w-16">
                    {formatIndianCurrency(ci.quantity * ci.item.sellingPrice)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Bottom Summary & Fast Pay */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
            
            {/* Calculation rows */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount</span>
                <span className="font-mono">{formatIndianCurrency(totals.taxableTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (CGST + SGST)</span>
                <span className="font-mono">{formatIndianCurrency(totals.cgstTotal + totals.sgstTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total Payable</span>
                <span className="font-mono text-xl text-blue-900">{formatIndianCurrency(totals.grandTotal)}</span>
              </div>
            </div>

            {/* Payment Method Pills */}
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold pt-1">
              <button
                type="button"
                onClick={() => setPaymentMode('UPI')}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
                  paymentMode === 'UPI' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> UPI
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('CASH')}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
                  paymentMode === 'CASH' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('CARD')}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
                  paymentMode === 'CARD' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" /> Card
              </button>
            </div>

            {/* Complete Sale Button */}
            <button
              disabled={cart.length === 0}
              onClick={() => handleCheckout(true)}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all transform active:scale-98"
            >
              <Printer className="w-4 h-4" /> Charge {formatIndianCurrency(totals.grandTotal)} & Print
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
