import React, { useState } from 'react';
import { 
  X, Building2, ShieldCheck, CreditCard, 
  Smartphone, FileText, Download, Upload, RefreshCw, Save,
  Image, Sparkles, Check, Database, Cloud
} from 'lucide-react';
import { BusinessProfile } from '../types';
import { GST_STATES } from '../data/mockData';
import { detectStateFromGSTIN, downloadCSV } from '../utils/gstCalculations';
import { SUPABASE_PROJECT_ID } from '../utils/supabaseClient';

interface BusinessSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessProfile: BusinessProfile;
  onSaveProfile: (profile: BusinessProfile) => void;
  onExportAllData: () => void;
  onResetData: () => void;
  onOpenCloudSync?: () => void;
}

export const BusinessSettingsModal: React.FC<BusinessSettingsModalProps> = ({
  isOpen,
  onClose,
  businessProfile,
  onSaveProfile,
  onExportAllData,
  onResetData,
  onOpenCloudSync,
}) => {
  const [profile, setProfile] = useState<BusinessProfile>({ 
    ...businessProfile,
    logoUrl: businessProfile.logoUrl || 'https://lh3.googleusercontent.com/d/16BUJ9mO_ZLvGvhuxxLRwnvlWxeiemQX8',
    billPadUrl: businessProfile.billPadUrl || 'https://lh3.googleusercontent.com/d/1XMbVyXZXJ4DsVd_wfJViJ1sooBv3brJ2',
    billPadHeaderOffset: businessProfile.billPadHeaderOffset ?? 160,
    billPadFooterOffset: businessProfile.billPadFooterOffset ?? 90,
    useCustomBillPad: businessProfile.useCustomBillPad ?? true,
  });
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'BANK_UPI' | 'BILL_PAD' | 'INVOICE_TERMS' | 'DATA_BACKUP'>('BILL_PAD');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(profile);
    onClose();
  };

  const handleGstinChange = (gstin: string) => {
    const upper = gstin.toUpperCase();
    const detected = detectStateFromGSTIN(upper);
    setProfile(prev => ({
      ...prev,
      gstin: upper,
      pan: upper.length >= 10 ? upper.substring(2, 12) : prev.pan,
      state: detected ? detected.name : prev.state,
      stateCode: detected ? detected.code : prev.stateCode,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-blue-300" />
            <div>
              <h2 className="text-base font-bold">Business Profile & GST Settings</h2>
              <p className="text-xs text-blue-200">Configure company info, GSTIN, Bank details & UPI QR payments</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('GENERAL')}
            className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'GENERAL' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Company & GST Details
          </button>
          <button
            onClick={() => setActiveTab('BANK_UPI')}
            className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'BANK_UPI' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Bank & UPI QR Code
          </button>
          <button
            onClick={() => setActiveTab('BILL_PAD')}
            className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'BILL_PAD' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Bill Pad & Letterhead</span>
          </button>
          <button
            onClick={() => setActiveTab('INVOICE_TERMS')}
            className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'INVOICE_TERMS' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Invoice Prefix & Terms
          </button>
          <button
            onClick={() => setActiveTab('DATA_BACKUP')}
            className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'DATA_BACKUP' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Backup & Reset
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          
          {/* TAB 1: GENERAL */}
          {activeTab === 'GENERAL' && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Legal Business Name *</label>
                <input 
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Business Tagline / Subtitle / Work Description <span className="text-slate-400 font-normal">(Optional - only prints when entered)</span>
                </label>
                <input 
                  type="text"
                  value={profile.tagline || ''}
                  onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                  placeholder="e.g. Electrical Contractor & Suppliers, Wholesaler, Engineering Works..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN (15-digit) *</label>
                  <input 
                    type="text"
                    required
                    maxLength={15}
                    value={profile.gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold text-blue-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Permanent Account Number (PAN)</label>
                  <input 
                    type="text"
                    maxLength={10}
                    value={profile.pan}
                    onChange={(e) => setProfile({ ...profile, pan: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input 
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="contact@yourbusiness.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone / Mobile Number</label>
                  <input 
                    type="text"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State & GST Code</label>
                  <select
                    value={profile.stateCode}
                    onChange={(e) => {
                      const st = GST_STATES.find(s => s.code === e.target.value);
                      if (st) {
                        setProfile({ ...profile, stateCode: st.code, state: st.name });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    {GST_STATES.map(s => (
                      <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input 
                    type="text"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Complete Registered Address</label>
                <textarea 
                  rows={2}
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          )}

          {/* TAB 2: BANK & UPI */}
          {activeTab === 'BANK_UPI' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-emerald-950 space-y-1">
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                  <span>Dynamic UPI QR Code Generator</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  When you add your UPI ID (GPay, PhonePe, Paytm, or BHIM), dynamic payment QR codes with exact bill amounts are automatically printed on every invoice!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">UPI ID (VPA) *</label>
                  <input 
                    type="text"
                    placeholder="yourname@okaxis"
                    value={profile.upiId}
                    onChange={(e) => setProfile({ ...profile, upiId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-emerald-800 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payee Name in UPI</label>
                  <input 
                    type="text"
                    placeholder="Merchant Name"
                    value={profile.upiName}
                    onChange={(e) => setProfile({ ...profile, upiName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Official Bank Account Details (RTGS / NEFT / IMPS)</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Account Holder Name (Beneficiary Name) *
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. SR Enterprises & Traders"
                    value={profile.accountHolderName || ''}
                    onChange={(e) => setProfile({ ...profile, accountHolderName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Exact beneficiary account name to display on all invoices, bills, and letterheads for payments.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. HDFC Bank Ltd."
                      value={profile.bankName}
                      onChange={(e) => setProfile({ ...profile, bankName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Account Number</label>
                    <input 
                      type="text"
                      placeholder="e.g. 50200084729103"
                      value={profile.accountNumber}
                      onChange={(e) => setProfile({ ...profile, accountNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">IFSC Code</label>
                    <input 
                      type="text"
                      placeholder="e.g. HDFC0001042"
                      value={profile.ifscCode}
                      onChange={(e) => setProfile({ ...profile, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Branch Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Vashi Sector 17 Branch"
                      value={profile.branchName}
                      onChange={(e) => setProfile({ ...profile, branchName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BILL PAD & LETTERHEAD */}
          {activeTab === 'BILL_PAD' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-indigo-500/10 p-4 rounded-xl border border-blue-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Official Bill Pad / Printed Letterhead
                    </h3>
                    <p className="text-slate-600 text-xs mt-1">
                      Invoices and bills exported to PDF or printed will automatically align and format directly over your official letterhead bill pad.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-xs">
                    <input
                      type="checkbox"
                      checked={profile.useCustomBillPad ?? true}
                      onChange={(e) => setProfile({ ...profile, useCustomBillPad: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="font-bold text-xs text-slate-800">Use Pad Mode</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bill Pad Image URL (Google Drive / Direct Link)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://drive.google.com/file/d/... or direct image URL"
                    value={profile.billPadUrl || ''}
                    onChange={(e) => {
                      let url = e.target.value.trim();
                      const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                      if (driveMatch && driveMatch[1]) {
                        url = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
                      }
                      setProfile({ ...profile, billPadUrl: url });
                    }}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProfile({
                        ...profile,
                        billPadUrl: 'https://lh3.googleusercontent.com/d/1XMbVyXZXJ4DsVd_wfJViJ1sooBv3brJ2',
                        billPadHeaderOffset: 248,
                        billPadFooterOffset: 125,
                        useCustomBillPad: true,
                      });
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl whitespace-nowrap transition-colors"
                  >
                    Reset S.K. Khan Pad
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  You can paste a Google Drive share link; the system will automatically convert it to a high-res image.
                </p>
              </div>

              {/* Upload Local Image */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Or Upload Bill Pad / Letterhead Image from Device</label>
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 rounded-xl cursor-pointer transition-colors text-slate-600 hover:text-blue-700">
                  <Upload className="w-4 h-4" />
                  <span className="font-bold text-xs">Choose Bill Pad Image File (.jpg, .png)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          if (evt.target?.result) {
                            setProfile({ ...profile, billPadUrl: evt.target.result as string });
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Pad Alignment & Margins */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Header Top Offset (Padding)</span>
                    <span className="font-mono font-bold text-blue-900">{profile.billPadHeaderOffset ?? 148}px</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={350}
                    step={5}
                    value={profile.billPadHeaderOffset ?? 148}
                    onChange={(e) => setProfile({ ...profile, billPadHeaderOffset: parseInt(e.target.value) || 148 })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500">Adjust content start position below your pre-printed letterhead blue/red line.</span>
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Footer Bottom Offset</span>
                    <span className="font-mono font-bold text-blue-900">{profile.billPadFooterOffset ?? 125}px</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={250}
                    step={5}
                    value={profile.billPadFooterOffset ?? 125}
                    onChange={(e) => setProfile({ ...profile, billPadFooterOffset: parseInt(e.target.value) || 125 })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500">Reserve margin above the bottom border and signature space.</span>
                </div>
              </div>

              {/* Pad Preview */}
              {profile.billPadUrl && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pad Preview</label>
                  <div className="border border-slate-300 rounded-xl overflow-hidden max-h-48 bg-slate-100 flex items-center justify-center p-2">
                    <img 
                      src={profile.billPadUrl} 
                      alt="Bill Pad Preview" 
                      className="max-h-44 object-contain shadow-xs rounded"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('thumbnail')) {
                          target.src = 'https://drive.google.com/thumbnail?id=1XMbVyXZXJ4DsVd_wfJViJ1sooBv3brJ2&sz=w1600';
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INVOICE PREFIX & TERMS */}
          {activeTab === 'INVOICE_TERMS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice Prefix</label>
                  <input 
                    type="text"
                    value={profile.invoicePrefix}
                    onChange={(e) => setProfile({ ...profile, invoicePrefix: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Next Sequence Number</label>
                  <input 
                    type="number"
                    value={profile.nextInvoiceNumber}
                    onChange={(e) => setProfile({ ...profile, nextInvoiceNumber: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* 1. Tax Invoice Terms */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-xs">1. Tax Invoice Terms & Conditions</label>
                  <button
                    type="button"
                    onClick={() => setProfile({
                      ...profile,
                      termsAndConditions: '1. Goods once sold will not be taken back or exchanged.\n2. Interest @ 18% p.a. will be charged if bill is not paid within due date.\n3. Subject to jurisdiction of our registered office.\n4. All disputes are subject to local arbitration.'
                    })}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    Reset Default Invoice Terms
                  </button>
                </div>
                <textarea 
                  rows={3}
                  value={profile.termsAndConditions}
                  onChange={(e) => setProfile({ ...profile, termsAndConditions: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono leading-relaxed"
                />
              </div>

              {/* 2. Quotation Terms */}
              <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-blue-950 text-xs flex items-center gap-1.5">
                    <span>2. Quotation / Estimation Terms & Conditions</span>
                    <span className="bg-blue-200 text-blue-900 text-[10px] font-bold px-1.5 py-0.5 rounded">Quotation Mode</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setProfile({
                      ...profile,
                      quotationTermsAndConditions: '1. Price Validity: This quotation is valid for 30 days from the date of issue.\n2. Payment Terms: 50% advance along with confirmed Purchase Order, balance against proforma before dispatch.\n3. Taxes & Duties: GST applicable as per prevailing statutory rates.\n4. Delivery Schedule: Within 2-3 weeks from receipt of clear PO and technical approval.\n5. Freight & Handling: Extra at actuals unless explicitly included.\n6. Jurisdiction: Subject to jurisdiction of our registered office.'
                    })}
                    className="text-[10px] text-blue-700 font-bold hover:underline"
                  >
                    Reset Default Quotation Terms
                  </button>
                </div>
                <textarea 
                  rows={4}
                  value={profile.quotationTermsAndConditions || ''}
                  onChange={(e) => setProfile({ ...profile, quotationTermsAndConditions: e.target.value })}
                  placeholder="Quotation terms (Price validity, advance %, delivery timeline, taxes extra)..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono leading-relaxed"
                />
              </div>

              {/* 3. Purchase Order / Bill Terms */}
              <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-amber-950 text-xs flex items-center gap-1.5">
                    <span>3. Purchase Order & Purchase Terms & Conditions</span>
                    <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded">Purchase Mode</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setProfile({
                      ...profile,
                      purchaseTermsAndConditions: '1. Delivery & Inspection: Materials must strictly comply with PO specifications and site inspection.\n2. Test Certificates: Mill Test Certificates (MTC) and inspection reports must accompany the delivery.\n3. Rejection Policy: Defective or non-compliant materials will be rejected at supplier cost.\n4. Payment Terms: Payment within 30 days of receipt of verified material and original tax invoice.\n5. Delivery Timeline: Strict adherence to agreed delivery schedules is mandatory.'
                    })}
                    className="text-[10px] text-amber-800 font-bold hover:underline"
                  >
                    Reset Default Purchase Terms
                  </button>
                </div>
                <textarea 
                  rows={4}
                  value={profile.purchaseTermsAndConditions || ''}
                  onChange={(e) => setProfile({ ...profile, purchaseTermsAndConditions: e.target.value })}
                  placeholder="Purchase terms (Quality inspection, test certificates, rejection clause, payment duration)..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Footer Note</label>
                <input 
                  type="text"
                  value={profile.invoiceNotes}
                  onChange={(e) => setProfile({ ...profile, invoiceNotes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 4: DATA BACKUP */}
          {activeTab === 'DATA_BACKUP' && (
            <div className="space-y-4 py-2">
              {/* Supabase Cloud Database Sync Card */}
              <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-emerald-950 text-sm">Supabase Cloud Database</div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200 text-emerald-900 uppercase">
                        Connected
                      </span>
                    </div>
                    <div className="text-emerald-800 text-xs mt-0.5">
                      Project ID: <span className="font-mono font-bold text-emerald-950">{SUPABASE_PROJECT_ID}</span> — Automatic cloud sync for invoices, parties, items &amp; settings.
                    </div>
                  </div>
                </div>
                {onOpenCloudSync && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCloudSync();
                    }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    Manage Cloud Sync
                  </button>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Export Full Accounting Data</div>
                  <div className="text-slate-500 text-xs mt-0.5">Download all invoices, parties, items, and tax records in JSON backup</div>
                </div>
                <button
                  type="button"
                  onClick={onExportAllData}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4 inline-block mr-1" /> Backup Data
                </button>
              </div>

              <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-rose-950 text-sm">Wipe All Demo &amp; Transaction Data</div>
                  <div className="text-rose-700 text-xs mt-0.5">Clear all invoices, parties, stock items, staff and start with a 100% clean blank slate</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onResetData();
                    onClose();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 inline-block mr-1" /> Clear All Data
                </button>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
            >
              Save Settings
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
