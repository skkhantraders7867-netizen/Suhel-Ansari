import React, { useState, useRef, useMemo } from 'react';
import { 
  X, Printer, Download, Building2, Calendar, Users, CheckCircle2, 
  Landmark, FileSpreadsheet, Copy, Check, ShieldCheck, Sparkles, AlertCircle
} from 'lucide-react';
import { StaffMember, AttendanceRecord, AttendanceCompany, BusinessProfile } from '../types';
import { formatIndianCurrency, numberToIndianWords } from '../utils/gstCalculations';
import { downloadElementAsPdf, printElementSafely } from '../utils/pdfExport';

interface MonthlyCompanySlipModalProps {
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

export const MonthlyCompanySlipModal: React.FC<MonthlyCompanySlipModalProps> = ({
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
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>(initialSelectedCompany || 'ALL');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copiedBankData, setCopiedBankData] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Filter records for the selected company & month
  const activeCompanyRecords = useMemo(() => {
    const list = monthRecords.filter((rec) => {
      const staffObj = staffMembers.find((s) => s.id === rec.staffId);
      const effectiveComp = (rec.companyName || staffObj?.companyName || '').trim();

      if (selectedCompanyFilter !== 'ALL') {
        return effectiveComp.toLowerCase() === selectedCompanyFilter.trim().toLowerCase();
      }
      return true;
    });

    // Sort strictly by employee ID number or name
    return list.sort((a, b) => {
      const sObjA = staffMembers.find((s) => s.id === a.staffId);
      const sObjB = staffMembers.find((s) => s.id === b.staffId);
      const empIdA = a.employeeId || sObjA?.employeeId || '';
      const empIdB = b.employeeId || sObjB?.employeeId || '';
      const matchA = empIdA.match(/\d+/);
      const matchB = empIdB.match(/\d+/);
      const numA = matchA ? parseInt(matchA[0], 10) : 999999;
      const numB = matchB ? parseInt(matchB[0], 10) : 999999;
      if (numA !== numB) return numA - numB;
      return (a.staffName || '').localeCompare(b.staffName || '');
    });
  }, [monthRecords, staffMembers, selectedCompanyFilter]);

  // Aggregate monthly workforce metrics ("har month kitne worker ne kam kiya")
  const totalWorkersWorked = activeCompanyRecords.length;
  
  const totalDutyDays = useMemo(() => {
    return activeCompanyRecords.reduce((sum, r) => sum + (r.dutyDays || 0), 0);
  }, [activeCompanyRecords]);

  const totalOvertimeHours = useMemo(() => {
    return activeCompanyRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
  }, [activeCompanyRecords]);

  const totalOvertimeAmount = useMemo(() => {
    return activeCompanyRecords.reduce((sum, r) => sum + (r.overtimeAmount || 0), 0);
  }, [activeCompanyRecords]);

  const totalGrossSalary = useMemo(() => {
    return activeCompanyRecords.reduce((sum, r) => sum + (r.totalSalary || 0) + (r.overtimeAmount || 0), 0);
  }, [activeCompanyRecords]);

  const totalAdvanceDeducted = useMemo(() => {
    return activeCompanyRecords.reduce((sum, r) => sum + (r.advanceDeduction || 0), 0);
  }, [activeCompanyRecords]);

  const totalNetPayable = useMemo(() => {
    return activeCompanyRecords.reduce((sum, r) => sum + (r.netPayable || 0), 0);
  }, [activeCompanyRecords]);

  const totalPaidWorkers = useMemo(() => {
    return activeCompanyRecords.filter((r) => r.paymentStatus === 'PAID').length;
  }, [activeCompanyRecords]);

  const totalUnpaidWorkers = totalWorkersWorked - totalPaidWorkers;

  // Effective Company display name
  const effectiveCompanyName = useMemo(() => {
    if (selectedCompanyFilter !== 'ALL') {
      const found = availableCompanies.find(
        (c) => c.name.trim().toLowerCase() === selectedCompanyFilter.trim().toLowerCase()
      );
      if (found) return found.name;
      return selectedCompanyFilter;
    }
    return businessProfile.name || 'SR GROUP & FABRICATION';
  }, [selectedCompanyFilter, availableCompanies, businessProfile]);

  // Copy Tab-Separated Data for Bank Transfer Excel Upload
  const handleCopyBankData = () => {
    if (activeCompanyRecords.length === 0) return;

    const headers = ['Sr', 'Worker Name', 'Account Holder', 'Bank Name', 'Account Number', 'IFSC Code', 'Net Salary', 'Status'];
    const rows = activeCompanyRecords.map((r, i) => {
      const staff = staffMembers.find((s) => s.id === r.staffId);
      const accHolder = r.accountHolderName || staff?.accountHolderName || r.staffName;
      const accNo = r.accountNumber || staff?.accountNumber || 'N/A';
      const bName = r.bankName || staff?.bankName || 'N/A';
      const ifsc = r.ifscCode || staff?.ifscCode || 'N/A';
      return [
        i + 1,
        `"${r.staffName}"`,
        `"${accHolder}"`,
        `"${bName}"`,
        `'${accNo}`,
        `"${ifsc}"`,
        r.netPayable,
        r.paymentStatus || 'UNPAID'
      ].join('\t');
    });

    const tsvContent = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopiedBankData(true);
      setTimeout(() => setCopiedBankData(false), 3000);
    });
  };

  // Print Handler
  const handlePrint = () => {
    if (!printAreaRef.current) return;
    printElementSafely(printAreaRef.current, `Monthly_Company_Salary_Slip_${effectiveCompanyName.replace(/\s+/g, '_')}_${selectedMonth}`, {
      orientation: printOrientation,
      pageMargin: '4mm 5mm',
      customStyles: `
        @page { size: A4 ${printOrientation} !important; margin: 4mm 5mm !important; }
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: #fff !important; }
      `
    });
  };

  // PDF Export Handler
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsExportingPdf(true);
    try {
      await downloadElementAsPdf(
        printAreaRef.current,
        `Monthly_Company_Slip_${effectiveCompanyName.replace(/\s+/g, '_')}_${selectedMonth}.pdf`,
        {
          orientation: printOrientation,
          scale: 2.5
        }
      );
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-[#07102b] border border-[#1b2d62] rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.9)] w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* MODAL TOP HEADER */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[#14234d] bg-[#091538]/95 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white font-heading">
                  Monthly Company Slip PDF
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Bank Payout Statement
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Monthly worker count, bank account numbers, IFSC codes &amp; net salary transfer sheet
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyBankData}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0d1a45] hover:bg-[#12235c] text-cyan-300 text-xs font-bold rounded-xl border border-cyan-500/30 transition-all cursor-pointer shadow-xs"
              title="Copy Bank Data for Excel / NetBanking"
            >
              {copiedBankData ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy Bank Data</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0d1a45] hover:bg-[#12235c] text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-[#21356e] transition-all cursor-pointer shadow-xs"
              title="Print Monthly Company Slip"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print Slip</span>
            </button>

            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl border border-purple-400/40 shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Download Monthly Company Slip PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Exporting...' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer ml-1"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLS BAR: COMPANY & MONTH FILTERS */}
        <div className="px-4 py-2.5 sm:px-6 bg-[#060c23] border-b border-[#14234d] flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Company Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                Company / Site:
              </span>
              <select
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="bg-[#091538] border border-[#1b2d62] text-xs font-bold text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="ALL">All Companies ({monthRecords.length} Workers)</option>
                {availableCompanies.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name} {c.code ? `(${c.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-950/60 border border-blue-800/40 rounded-lg text-cyan-300 font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedMonthTitle}</span>
            </div>

            {/* Workers Count Badge */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-purple-950/60 border border-purple-800/40 rounded-lg text-purple-300 font-extrabold">
              <Users className="w-3.5 h-3.5" />
              <span>{totalWorkersWorked} Workers Worked</span>
            </div>
          </div>

          {/* Orientation toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold">Page Layout:</span>
            <div className="inline-flex rounded-lg border border-[#1a2d65] p-0.5 bg-[#091538]">
              <button
                type="button"
                onClick={() => setPrintOrientation('landscape')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  printOrientation === 'landscape'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Landscape (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setPrintOrientation('portrait')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  printOrientation === 'portrait'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Portrait
              </button>
            </div>
          </div>
        </div>

        {/* MODAL BODY / PRINTABLE PREVIEW SHEET */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-900/60 flex justify-center">
          {/* Printable White Sheet Container */}
          <div
            ref={printAreaRef}
            className={`bg-white text-slate-900 shadow-2xl rounded-lg p-6 sm:p-8 w-full border border-slate-300 font-sans print:m-0 print:border-none print:shadow-none print:p-4 ${
              printOrientation === 'landscape' ? 'max-w-[1100px]' : 'max-w-[850px]'
            }`}
          >
            {/* 1. COMPANY HEADER / LETTERHEAD STYLE */}
            <div className="border-b-2 border-slate-800 pb-4 mb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3.5">
                  {businessProfile.logoUrl && (
                    <img
                      src={businessProfile.logoUrl}
                      alt="Company Logo"
                      className="w-14 h-14 object-contain rounded-md border border-slate-200 p-1"
                    />
                  )}
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight font-heading">
                      {effectiveCompanyName}
                    </h1>
                    <p className="text-xs text-slate-600 max-w-xl">
                      {businessProfile.address || 'Industrial Area, Phase 1'}
                      {businessProfile.state ? `, ${businessProfile.state}` : ''}
                      {businessProfile.pincode ? ` - ${businessProfile.pincode}` : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-slate-700 mt-0.5">
                      {businessProfile.gstin && (
                        <span>GSTIN: <strong className="font-mono text-slate-900">{businessProfile.gstin}</strong></span>
                      )}
                      {businessProfile.phone && <span>• Ph: {businessProfile.phone}</span>}
                      {businessProfile.email && <span>• Email: {businessProfile.email}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Document Reference
                  </div>
                  <div className="font-mono font-extrabold text-xs text-slate-900">
                    SRG/MCS/{selectedMonth.replace('-', '')}/01
                  </div>
                  <div className="text-[10.5px] text-slate-600 mt-1">
                    Date: <strong>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                  </div>
                  <div className="text-[10.5px] text-purple-700 font-extrabold uppercase mt-0.5">
                    Month: {formattedMonthTitle}
                  </div>
                </div>
              </div>

              {/* Title Banner */}
              <div className="mt-3.5 pt-2 border-t border-slate-200 text-center">
                <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                  MONTHLY WORKFORCE SALARY STATEMENT &amp; BANK DISBURSEMENT SLIP
                </h2>
                <p className="text-[11px] text-slate-600">
                  Detailed duty record, verified bank account details &amp; net salary transfer advice for {formattedMonthTitle}
                </p>
              </div>
            </div>

            {/* 2. MONTHLY WORKER COUNT & SUMMARY KPI BOXES ("har manth kinane worker ne kam ki") */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Workers Worked
                </div>
                <div className="text-lg font-black text-slate-900">
                  {totalWorkersWorked}
                </div>
                <div className="text-[9.5px] text-slate-500">Active Staff</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Total Duty Days
                </div>
                <div className="text-lg font-black text-blue-700">
                  {totalDutyDays}
                </div>
                <div className="text-[9.5px] text-slate-500">Man Days Logged</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Overtime (Hrs)
                </div>
                <div className="text-lg font-black text-amber-700">
                  {totalOvertimeHours}
                </div>
                <div className="text-[9.5px] text-slate-500">₹ {formatIndianCurrency(totalOvertimeAmount)}</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Gross Wages
                </div>
                <div className="text-lg font-black text-slate-800">
                  ₹ {formatIndianCurrency(totalGrossSalary)}
                </div>
                <div className="text-[9.5px] text-slate-500">Earned Amount</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Advances Deducted
                </div>
                <div className="text-lg font-black text-purple-700">
                  ₹ {formatIndianCurrency(totalAdvanceDeducted)}
                </div>
                <div className="text-[9.5px] text-slate-500">Recovered</div>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2.5 text-center col-span-2 sm:col-span-1">
                <div className="text-[10px] font-black uppercase text-emerald-800">
                  Net Salary Payable
                </div>
                <div className="text-lg font-black text-emerald-700">
                  ₹ {formatIndianCurrency(totalNetPayable)}
                </div>
                <div className="text-[9.5px] text-emerald-800 font-bold">
                  {totalPaidWorkers} Paid • {totalUnpaidWorkers} Unpaid
                </div>
              </div>
            </div>

            {/* 3. MAIN TABLE OF WORKERS & BANK ACCOUNT DETAILS */}
            {activeCompanyRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-300 rounded-lg">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold">No worker records found for {formattedMonthTitle}.</p>
                <p className="text-xs text-slate-400">Please select another company or add workers in Attendance Register.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-300 rounded-lg mb-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-300">
                      <th className="py-2 px-2 text-center w-8 border-r border-slate-300">#</th>
                      <th className="py-2 px-2.5 min-w-[130px] border-r border-slate-300">Worker Name &amp; ID</th>
                      <th className="py-2 px-2.5 min-w-[130px] border-r border-slate-300">Account Holder Name</th>
                      <th className="py-2 px-2.5 min-w-[120px] border-r border-slate-300">Account Number</th>
                      <th className="py-2 px-2.5 min-w-[110px] border-r border-slate-300">Bank Name</th>
                      <th className="py-2 px-2 text-center min-w-[95px] border-r border-slate-300">IFSC Code</th>
                      <th className="py-2 px-1.5 text-center w-14 border-r border-slate-300">Duty Days</th>
                      <th className="py-2 px-1.5 text-center w-14 border-r border-slate-300">OT (Hrs)</th>
                      <th className="py-2 px-2 text-right min-w-[80px] border-r border-slate-300">Advance</th>
                      <th className="py-2 px-2.5 text-right min-w-[100px] bg-emerald-50 text-emerald-950 font-black border-r border-slate-300">
                        Net Salary (₹)
                      </th>
                      <th className="py-2 px-2 text-center w-20 border-r border-slate-300">Status</th>
                      <th className="py-2 px-2 text-center min-w-[80px]">Worker Signature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeCompanyRecords.map((rec, idx) => {
                      const staff = staffMembers.find((s) => s.id === rec.staffId);
                      const accHolder = rec.accountHolderName || staff?.accountHolderName || rec.staffName;
                      const accNo = rec.accountNumber || staff?.accountNumber || '—';
                      const bName = rec.bankName || staff?.bankName || '—';
                      const ifsc = rec.ifscCode || staff?.ifscCode || '—';
                      const empId = rec.employeeId || staff?.employeeId || `EMP-${String(idx + 1).padStart(3, '0')}`;
                      const isPaid = rec.paymentStatus === 'PAID';

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Index */}
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-500 border-r border-slate-200">
                            {idx + 1}
                          </td>

                          {/* Worker Name */}
                          <td className="py-2 px-2.5 border-r border-slate-200">
                            <div className="font-extrabold text-slate-900 text-xs">
                              {rec.staffName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {empId} • {rec.role || staff?.role || 'Staff'}
                            </div>
                          </td>

                          {/* Account Holder Name */}
                          <td className="py-2 px-2.5 font-medium text-slate-800 text-[11px] border-r border-slate-200">
                            {accHolder}
                          </td>

                          {/* Account Number */}
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-900 text-xs tracking-wider border-r border-slate-200">
                            {accNo}
                          </td>

                          {/* Bank Name */}
                          <td className="py-2 px-2.5 text-slate-700 text-[11px] font-semibold border-r border-slate-200">
                            {bName}
                          </td>

                          {/* IFSC Code */}
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-800 text-[10.5px] uppercase border-r border-slate-200">
                            {ifsc}
                          </td>

                          {/* Duty Days */}
                          <td className="py-2 px-1.5 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                            {rec.dutyDays || 0}
                          </td>

                          {/* Overtime */}
                          <td className="py-2 px-1.5 text-center font-mono text-amber-800 border-r border-slate-200">
                            {rec.overtimeHours ? `${rec.overtimeHours}h` : '—'}
                          </td>

                          {/* Advance */}
                          <td className="py-2 px-2 text-right font-mono text-purple-700 border-r border-slate-200">
                            {rec.advanceDeduction ? `₹${formatIndianCurrency(rec.advanceDeduction)}` : '₹0'}
                          </td>

                          {/* Net Salary */}
                          <td className="py-2 px-2.5 text-right font-mono font-black text-emerald-800 text-xs bg-emerald-50/50 border-r border-slate-200">
                            ₹ {formatIndianCurrency(rec.netPayable)}
                          </td>

                          {/* Payment Status */}
                          <td className="py-2 px-2 text-center border-r border-slate-200">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {isPaid ? 'PAID' : 'UNPAID'}
                            </span>
                          </td>

                          {/* Worker Signature */}
                          <td className="py-2 px-2 text-center text-slate-300 text-[10px]">
                            &nbsp;
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* GRAND TOTAL FOOTER */}
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-800 text-xs font-black text-slate-900">
                      <td colSpan={6} className="py-2.5 px-3 border-r border-slate-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="uppercase text-[11px] tracking-wider">
                            Total Workers: {totalWorkersWorked}
                          </span>
                          <span className="text-[10px] text-slate-600 font-normal italic">
                            In Words: {numberToIndianWords(Math.round(totalNetPayable))}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-1 text-center font-mono border-r border-slate-300">
                        {totalDutyDays}
                      </td>
                      <td className="py-2 px-1 text-center font-mono text-amber-800 border-r border-slate-300">
                        {totalOvertimeHours}h
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-purple-700 border-r border-slate-300">
                        ₹{formatIndianCurrency(totalAdvanceDeducted)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-sm font-black text-emerald-800 bg-emerald-100 border-r border-slate-300">
                        ₹ {formatIndianCurrency(totalNetPayable)}
                      </td>
                      <td colSpan={2} className="py-2 px-2 text-center text-[10px] text-slate-600">
                        Verified
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* 4. BANK TRANSFER DISBURSEMENT INSTRUCTION */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-[11px] text-slate-700 mb-6">
              <div className="font-bold text-slate-900 mb-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Declaration &amp; Bank Transfer Mandate:</span>
              </div>
              <p>
                We hereby certify that the above statement reflects actual duties logged, overtime, and advances deducted for the month of <strong>{formattedMonthTitle}</strong>. Respective net salaries have been audited and verified for electronic direct bank transfer to the beneficiary accounts listed above.
              </p>
            </div>

            {/* 5. AUTHORIZED SIGNATURE BLOCKS */}
            <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs">
              <div>
                <div className="h-12 border-b border-slate-400 mb-1"></div>
                <div className="font-extrabold text-slate-800">Prepared By</div>
                <div className="text-[10px] text-slate-500">Accountant / HR In-charge</div>
              </div>

              <div>
                <div className="h-12 border-b border-slate-400 mb-1"></div>
                <div className="font-extrabold text-slate-800">Checked &amp; Verified By</div>
                <div className="text-[10px] text-slate-500">Site Supervisor / Works Manager</div>
              </div>

              <div>
                <div className="h-12 border-b border-slate-400 mb-1"></div>
                <div className="font-extrabold text-slate-900 uppercase">
                  {effectiveCompanyName}
                </div>
                <div className="text-[10px] text-slate-500">Authorized Signatory &amp; Company Seal</div>
              </div>
            </div>

          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-4 py-3 sm:px-6 bg-[#081230] border-t border-[#14234d] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div>
            Showing <strong className="text-white">{activeCompanyRecords.length}</strong> workers • Net Salary: <strong className="text-emerald-400">₹ {formatIndianCurrency(totalNetPayable)}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#0d1a45] hover:bg-[#12235c] text-slate-200 font-bold rounded-lg border border-[#21356e] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
