import React, { useState, useRef, useMemo } from 'react';
import { 
  X, Printer, Download, Landmark, Check, Sliders, Building2, 
  FileText, ShieldCheck, Eye, Sparkles, AlertCircle, Copy
} from 'lucide-react';
import { StaffMember, AttendanceRecord, AttendanceCompany, BusinessProfile } from '../types';
import { formatIndianCurrency, numberToIndianWords } from '../utils/gstCalculations';
import { downloadElementAsPdf, printElementSafely } from '../utils/pdfExport';
import { SUHEL_ENGINEERING_LETTERHEAD_URL } from '../data/letterTemplates';

interface BankPaymentAdviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
  formattedMonthTitle: string;
  businessProfile: BusinessProfile;
  monthRecords: AttendanceRecord[];
  staffMembers: StaffMember[];
  initialSelectedCompany?: string;
  availableCompanies: AttendanceCompany[];
}

export const BankPaymentAdviceModal: React.FC<BankPaymentAdviceModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  formattedMonthTitle,
  businessProfile,
  monthRecords,
  staffMembers,
  initialSelectedCompany = 'ALL',
  availableCompanies,
}) => {
  // Configurable options
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>(initialSelectedCompany || 'ALL');
  const [useLetterheadPad, setUseLetterheadPad] = useState<boolean>(true);
  const [showIfscColumn, setShowIfscColumn] = useState<boolean>(true);
  const [contentFontSize, setContentFontSize] = useState<number>(9.5);
  const [rowDensity, setRowDensity] = useState<'compact' | 'standard'>('compact');
  
  // Custom Letterpad offsets (clears top banner and bottom footer cleanly)
  const [headerOffset, setHeaderOffset] = useState<number>(businessProfile.billPadHeaderOffset || 170);
  const [footerOffset, setFooterOffset] = useState<number>(businessProfile.billPadFooterOffset || 105);

  // Letter editable fields
  const [refNo, setRefNo] = useState<string>(() => `SR/BNK-SAL/${selectedMonth.replace('-', '')}/01`);
  const [adviceDate, setAdviceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [bankName, setBankName] = useState<string>(() => businessProfile.bankName || 'State Bank of India');
  const [branchName, setBranchName] = useState<string>(() => businessProfile.branchName || 'Main Branch');
  const [companyAccountNo, setCompanyAccountNo] = useState<string>(() => businessProfile.accountNumber || '');
  const [signatoryName, setSignatoryName] = useState<string>(() => businessProfile.name || 'Authorized Signatory');
  const [signatoryDesignation, setSignatoryDesignation] = useState<string>('Director / Authorized Signatory');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(true);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Filter records for the selected company
  const recordsToPay = useMemo(() => {
    return monthRecords.filter((rec) => {
      const staffObj = staffMembers.find((s) => s.id === rec.staffId);
      const effectiveComp = (rec.companyName || staffObj?.companyName || '').trim();

      if (selectedCompanyFilter !== 'ALL') {
        return effectiveComp.toLowerCase() === selectedCompanyFilter.trim().toLowerCase();
      }
      return true;
    });
  }, [monthRecords, staffMembers, selectedCompanyFilter]);

  // Aggregate totals
  const totalNetPayable = useMemo(() => {
    return recordsToPay.reduce((sum, r) => sum + (r.netPayable || 0), 0);
  }, [recordsToPay]);

  const totalWorkersCount = recordsToPay.length;

  const letterheadImageUrl = businessProfile.billPadUrl || SUHEL_ENGINEERING_LETTERHEAD_URL;

  // Print handler
  const handlePrint = () => {
    if (!printAreaRef.current) return;
    printElementSafely(printAreaRef.current, `Bank_Salary_Advice_${selectedMonth}`, {
      orientation: 'portrait',
      pageMargin: '0mm',
      customStyles: `
        @page { size: A4 portrait !important; margin: 0 !important; }
        html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
        #bank-payment-advice-document { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
      `
    });
  };

  // PDF Export handler
  const handleExportPdf = async () => {
    if (!printAreaRef.current) return;
    setIsExportingPdf(true);
    try {
      const fileName = `Bank_Salary_Payment_Advice_${selectedMonth}_${selectedCompanyFilter.replace(/\s+/g, '_')}.pdf`;
      await downloadElementAsPdf(printAreaRef.current, fileName, {
        orientation: 'portrait',
        scale: 2.5,
      });
    } catch (err) {
      console.error('Failed to export bank payment advice PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  const formattedDateString = (() => {
    try {
      return new Date(adviceDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch (e) {
      return adviceDate;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="bg-slate-100 rounded-3xl border border-slate-300 shadow-2xl w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">
                  Bank Salary Payment Advice (बैंक भुगतान पत्र)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase tracking-wider border border-emerald-500/30">
                  {formattedMonthTitle}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Letter Pad format with Emp ID, Account Holder Name, Account Number, Net Salary &amp; Mohar/Signatures
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
                showSettingsPanel 
                  ? 'bg-slate-800 text-amber-300 border-amber-500/40' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              {showSettingsPanel ? 'Hide Controls' : 'Edit Letter Details'}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Letter (प्रिंट)
            </button>

            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isExportingPdf ? 'Exporting PDF...' : 'Download PDF (लेटर पैड)'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Layout: Settings Sidebar + Live A4 Letterhead Preview */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left Controls / Form Panel */}
          {showSettingsPanel && (
            <div className="w-full lg:w-96 bg-white border-r border-slate-200 p-4 overflow-y-auto space-y-4 shrink-0 text-xs">
              
              {/* Filter Company / Site */}
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="font-extrabold text-slate-800 flex items-center justify-between">
                  <span>Company / Site Filter</span>
                  <span className="text-emerald-700 font-bold">{totalWorkersCount} Workers</span>
                </label>
                <select
                  value={selectedCompanyFilter}
                  onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-blue-600"
                >
                  <option value="ALL">All Companies / Sites (All Workers)</option>
                  {availableCompanies.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-slate-500 flex justify-between pt-1 font-mono">
                  <span>Net Total:</span>
                  <span className="font-bold text-emerald-700">{formatIndianCurrency(totalNetPayable)}</span>
                </div>
              </div>

              {/* Letter Pad Mode */}
              <div className="space-y-2 bg-blue-50/60 p-3 rounded-2xl border border-blue-200">
                <label className="font-extrabold text-slate-800 block">
                  Letter Pad Printing Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUseLetterheadPad(true)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      useLetterheadPad
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="font-bold text-[11px]">Official Letter Pad</div>
                    <div className="text-[9px] opacity-80">प्रिंट में पैड दिखेगा</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseLetterheadPad(false)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      !useLetterheadPad
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="font-bold text-[11px]">Pre-printed Paper</div>
                    <div className="text-[9px] opacity-80">सादे लेटर पैड हेतु</div>
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 pt-0.5">
                  {useLetterheadPad 
                    ? 'कंपनी का ऑथेंटिक लेटर पैड बैकग्राउंड और वॉटरमार्क सहित प्रिंट होगा।' 
                    : 'प्रिंटर में पहले से मौजूद लेटर पैड स्टेशनरी पर सीधे प्रिंट करने के लिए बैकग्राउंड छुपा दिया गया है।'}
                </div>
              </div>

              {/* Table Configuration & Capacity */}
              <div className="space-y-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="font-extrabold text-slate-800 flex items-center justify-between">
                  <span>Row Density &amp; Capacity</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                    Fits {rowDensity === 'compact' ? '25-30+' : '16-20'} Workers
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRowDensity('compact')}
                    className={`py-1.5 px-2 rounded-lg text-center font-bold text-[11px] cursor-pointer border transition-colors ${
                      rowDensity === 'compact'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Ultra Compact (ज्यादा नाम)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRowDensity('standard')}
                    className={`py-1.5 px-2 rounded-lg text-center font-bold text-[11px] cursor-pointer border transition-colors ${
                      rowDensity === 'standard'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Standard (सामान्य)
                  </button>
                </div>
                
                <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={showIfscColumn}
                    onChange={(e) => setShowIfscColumn(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                  <span className="font-semibold text-slate-800 text-xs">
                    Show IFSC Code Column (आईएफएससी कोड)
                  </span>
                </label>

                <div className="pt-1">
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                    <span>Font Size (फॉन्ट आकार):</span>
                    <span className="font-bold text-slate-900">{contentFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={12}
                    step={0.5}
                    value={contentFontSize}
                    onChange={(e) => setContentFontSize(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Letter Customization */}
              <div className="space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="font-extrabold text-slate-800">Letter &amp; Bank Details</div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Reference No.</label>
                  <input
                    type="text"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-medium focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Letter Date</label>
                  <input
                    type="date"
                    value={adviceDate}
                    onChange={(e) => setAdviceDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. State Bank of India"
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Branch / City</label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="e.g. Main Branch"
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Debit Company Account No.</label>
                  <input
                    type="text"
                    value={companyAccountNo}
                    onChange={(e) => setCompanyAccountNo(e.target.value)}
                    placeholder="Enter Current A/c No"
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Signatory Name</label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Designation</label>
                    <input
                      type="text"
                      value={signatoryDesignation}
                      onChange={(e) => setSignatoryDesignation(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Margins / Offsets */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="font-extrabold text-slate-800">Letterhead Margins</div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                    <span>Top Gap (Header Offset):</span>
                    <span className="font-bold">{headerOffset}px</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={220}
                    value={headerOffset}
                    onChange={(e) => setHeaderOffset(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                    <span>Bottom Gap (Footer Offset):</span>
                    <span className="font-bold">{footerOffset}px</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={180}
                    value={footerOffset}
                    onChange={(e) => setFooterOffset(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

            </div>
          )}

          {/* Right Live Document Preview Viewport */}
          <div className="flex-1 bg-slate-200 p-4 sm:p-6 overflow-y-auto flex justify-center items-start">
            <div 
              ref={printAreaRef}
              id="bank-payment-advice-document"
              className="printable-area bg-white shadow-2xl relative select-text transition-all"
              style={{
                width: '794px',
                minHeight: '1123px',
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              {/* Background Letterhead Graphic Pad (Optional / Toggleable) */}
              {useLetterheadPad && (
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden print:opacity-100">
                  <img
                    src={letterheadImageUrl}
                    alt="Official Letterhead Pad"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-fill select-none pointer-events-none"
                    style={{
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                      imageRendering: 'auto',
                    }}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('thumbnail')) {
                        target.src = 'https://drive.google.com/thumbnail?id=1XMbVyXZXJ4DsVd_wfJViJ1sooBv3brJ2&sz=w2000';
                      }
                    }}
                  />
                </div>
              )}

              {/* Printable Letter Content */}
              <div 
                className="relative z-10 font-sans text-slate-950 flex flex-col justify-between"
                style={{
                  paddingTop: `${headerOffset}px`,
                  paddingBottom: `${footerOffset}px`,
                  paddingLeft: '38px',
                  paddingRight: '38px',
                  minHeight: '1123px',
                  boxSizing: 'border-box',
                  fontSize: `${contentFontSize}px`,
                  lineHeight: 1.45,
                }}
              >
                {/* Upper Letterhead Section */}
                <div className="space-y-1.5">
                  {/* Top Ref & Date */}
                  <div className="flex items-center justify-between border-b-2 border-slate-900/80 pb-1">
                    <div className="font-bold text-slate-800 text-[10px]">
                      <span className="text-slate-500 uppercase text-[9px] mr-1.5 tracking-wider">REF NO:</span>
                      <span className="font-mono text-slate-950 font-black px-1.5 py-0.5 bg-white/90 border border-slate-300 rounded shadow-2xs">
                        {refNo}
                      </span>
                    </div>
                    <div className="font-bold text-slate-800 text-right text-[10px]">
                      <span className="text-slate-500 uppercase text-[9px] mr-1.5 tracking-wider">DATE:</span>
                      <span className="text-slate-950 font-black">
                        {formattedDateString}
                      </span>
                    </div>
                  </div>

                  {/* Compact Unified Bank & Subject Dispatch Strip (Replaces bulky text boxes) */}
                  <div className="bg-slate-900 text-white rounded-md p-2 flex flex-col gap-1 text-[10px] shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80 pb-1">
                      <div className="flex items-center gap-1">
                        <span className="text-amber-400 font-black tracking-wider text-[9px]">TO:</span>
                        <span className="font-extrabold text-white">The Branch Manager, {bankName}</span>
                        {branchName && <span className="text-slate-300 font-medium">({branchName})</span>}
                      </div>
                      <div className="font-mono text-[9.5px]">
                        <span className="text-amber-400 font-bold mr-1">DEBIT CURRENT A/C NO:</span>
                        <span className="font-black underline tracking-wider text-white">
                          {companyAccountNo || '____________________'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-1 font-bold">
                        <span className="text-amber-400 font-black tracking-wider text-[9px]">SUBJECT:</span>
                        <span className="tracking-tight text-white uppercase">
                          SALARY PAYMENT ADVICE - {formattedMonthTitle.toUpperCase()}
                          {selectedCompanyFilter !== 'ALL' ? ` (${selectedCompanyFilter})` : ''}
                        </span>
                      </div>
                      <div className="text-slate-300 font-bold text-[9.5px]">
                        TOTAL: <span className="text-emerald-300 font-black">{totalWorkersCount} Workers</span> &bull; <span className="text-emerald-300 font-black font-mono">{formatIndianCurrency(totalNetPayable)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bank Schedule Table (EMP ID, Bank Holder Name, Bank Account Number, Net Salary) */}
                  <div className="border-2 border-slate-900 rounded-lg overflow-hidden my-1 shadow-2xs bg-white">
                    <table 
                      className="w-full text-left border-collapse"
                      style={{ fontSize: `${contentFontSize}px` }}
                    >
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold text-[9px] uppercase tracking-wider">
                          <th className="py-1 px-1.5 text-center border-r border-slate-700" style={{ width: '5%' }}>#</th>
                          <th className="py-1 px-1.5 text-center border-r border-slate-700" style={{ width: '15%' }}>EMP ID</th>
                          <th className="py-1 px-2 text-left border-r border-slate-700" style={{ width: showIfscColumn ? '34%' : '44%' }}>Bank Holder Name</th>
                          <th className="py-1 px-2 text-left border-r border-slate-700" style={{ width: showIfscColumn ? '25%' : '35%' }}>Bank Account No.</th>
                          {showIfscColumn && (
                            <th className="py-1 px-1.5 text-left border-r border-slate-700" style={{ width: '15%' }}>IFSC Code</th>
                          )}
                          <th className="py-1 px-2 text-right" style={{ width: '17%' }}>Net Salary (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 font-medium">
                        {recordsToPay.length === 0 ? (
                          <tr>
                            <td colSpan={showIfscColumn ? 6 : 5} className="py-6 text-center text-slate-500 italic">
                              No worker attendance records found for {formattedMonthTitle}
                            </td>
                          </tr>
                        ) : (
                          recordsToPay.map((r, idx) => {
                            const staffObj = staffMembers.find((s) => s.id === r.staffId);
                            const empId = r.employeeId || staffObj?.employeeId || `EMP-${String(idx + 1).padStart(3, '0')}`;
                            
                            // Bank holder name: priority to accountHolderName, fallback to worker name
                            const holderName = (r.accountHolderName || staffObj?.accountHolderName || r.staffName || '').trim();
                            const isDifferentPerson = r.accountHolderName && r.accountHolderName.trim().toLowerCase() !== r.staffName.trim().toLowerCase();
                            
                            const accNo = (r.accountNumber || staffObj?.accountNumber || '').trim();
                            const ifsc = (r.ifscCode || staffObj?.ifscCode || '').trim();

                            const cellPadding = rowDensity === 'compact' ? 'py-0.5 px-1.5' : 'py-1 px-2';

                            return (
                              <tr key={r.id || idx} className="hover:bg-slate-50">
                                <td className={`${cellPadding} text-center font-mono font-bold text-slate-600 border-r border-slate-200 text-[9px]`}>
                                  {idx + 1}
                                </td>
                                <td className={`${cellPadding} text-center font-mono font-bold text-slate-900 border-r border-slate-200 text-[9.5px]`}>
                                  {empId}
                                </td>
                                <td className={`${cellPadding} border-r border-slate-200`}>
                                  <div className="font-bold text-slate-950 uppercase tracking-tight leading-tight">
                                    {holderName || '-'}
                                  </div>
                                  {isDifferentPerson && (
                                    <div className="text-[8px] text-slate-500 font-medium leading-none">
                                      Worker: {r.staffName}
                                    </div>
                                  )}
                                </td>
                                <td className={`${cellPadding} font-mono font-black text-slate-950 border-r border-slate-200 tracking-wider text-[9.5px]`}>
                                  {accNo ? (
                                    <span>{accNo}</span>
                                  ) : (
                                    <span className="text-rose-600 font-sans text-[8.5px] italic">A/c Pending</span>
                                  )}
                                </td>
                                {showIfscColumn && (
                                  <td className={`${cellPadding} font-mono text-[9px] font-semibold text-slate-800 border-r border-slate-200`}>
                                    {ifsc || '-'}
                                  </td>
                                )}
                                <td className={`${cellPadding} text-right font-mono font-black text-slate-950`}>
                                  {formatIndianCurrency(r.netPayable)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-black border-t-2 border-slate-900 text-[9.5px]">
                          <td colSpan={showIfscColumn ? 4 : 3} className="py-1 px-2 uppercase border-r border-slate-300">
                            Total Workers: {totalWorkersCount}
                          </td>
                          {showIfscColumn && (
                            <td className="py-1 px-1.5 border-r border-slate-300 font-mono text-[8.5px] text-slate-600">
                              -
                            </td>
                          )}
                          <td className="py-1 px-2 text-right font-mono text-[10.5px] text-slate-950 bg-emerald-50/80">
                            {formatIndianCurrency(totalNetPayable)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Total Amount in Words (Sleek 1-line strip) */}
                  <div className="px-2.5 py-1 rounded border border-slate-300 bg-white/95 text-slate-950 flex flex-wrap items-center gap-1.5 text-[9.5px] shadow-2xs">
                    <span className="font-black text-slate-700 uppercase tracking-wider shrink-0 text-[9px]">
                      Amount in Words:
                    </span>
                    <span className="font-extrabold text-slate-950 font-serif italic text-[10px]">
                      {numberToIndianWords(totalNetPayable)}
                    </span>
                  </div>
                </div>

                {/* Bottom Mohar & Authorized Signatory Section (Clean, lined-up without bank receiving box) */}
                <div className="pt-2 mt-auto">
                  <div className="flex justify-end">
                    <div className="w-60 text-right space-y-1">
                      <div className="text-[9.5px] font-black text-slate-950 uppercase tracking-tight">
                        For <strong>{businessProfile.tradeName || businessProfile.name || 'Suhel Engineering'}</strong>
                      </div>

                      {/* Generous Rubber Stamp / Mohar Area */}
                      <div className="h-12 flex items-center justify-center border border-dashed border-slate-400 rounded-lg text-[9px] text-slate-400 font-serif italic my-0.5 bg-slate-50/60">
                        [ Company Rubber Stamp / कंपनी की मुहर ]
                      </div>

                      {/* Authorized Signatory Line */}
                      <div className="border-t-2 border-slate-900 pt-0.5 text-center w-52 ml-auto">
                        <div className="font-black text-slate-950 text-[11px] leading-tight">
                          {signatoryName}
                        </div>
                        <div className="text-[9px] font-bold text-slate-600">
                          {signatoryDesignation}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
