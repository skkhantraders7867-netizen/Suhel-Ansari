import React, { useState, useRef, useMemo } from 'react';
import { 
  X, Printer, Download, Landmark, FileText, Check, Building2, 
  Users, Sparkles, Loader2, Search, ArrowDownRight, CreditCard
} from 'lucide-react';
import { StaffMember, AttendanceRecord, AttendanceCompany, BusinessProfile } from '../types';
import { formatIndianCurrency, numberToIndianWords } from '../utils/gstCalculations';
import { downloadElementAsPdf, printElementSafely } from '../utils/pdfExport';
import { SUHEL_ENGINEERING_LETTERHEAD_URL } from '../data/letterTemplates';

interface CompanyMonthlySlipPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
  formattedMonthTitle: string;
  businessProfile: BusinessProfile;
  monthRecords: AttendanceRecord[];
  staffMembers: StaffMember[];
  availableCompanies: AttendanceCompany[];
}

export const CompanyMonthlySlipPdfModal: React.FC<CompanyMonthlySlipPdfModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  formattedMonthTitle,
  businessProfile,
  monthRecords,
  staffMembers,
  availableCompanies,
}) => {
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [slipDate, setSlipDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [refNo, setRefNo] = useState<string>(() => `SR/SAL-SLIP/${selectedMonth.replace('-', '')}/01`);
  const [useLetterhead, setUseLetterhead] = useState<boolean>(true);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Filter records by company and search
  const filteredRecords = useMemo(() => {
    return monthRecords
      .filter((rec) => {
        const staffObj = staffMembers.find((s) => s.id === rec.staffId);
        const effectiveCompany = (rec.companyName || staffObj?.companyName || 'SR Group & Fabrication').trim();

        if (selectedCompany !== 'ALL' && effectiveCompany.toLowerCase() !== selectedCompany.trim().toLowerCase()) {
          return false;
        }

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchName = rec.staffName.toLowerCase().includes(q);
          const holderName = (rec.accountHolderName || staffObj?.accountHolderName || '').toLowerCase();
          const matchHolder = holderName.includes(q);
          const matchBank = (rec.bankName || staffObj?.bankName || '').toLowerCase().includes(q);
          const matchAcc = (rec.accountNumber || staffObj?.accountNumber || '').includes(q);
          return matchName || matchHolder || matchBank || matchAcc;
        }

        return true;
      })
      .sort((a, b) => {
        const sObjA = staffMembers.find((s) => s.id === a.staffId);
        const sObjB = staffMembers.find((s) => s.id === b.staffId);
        const empA = a.employeeId || sObjA?.employeeId || '';
        const empB = b.employeeId || sObjB?.employeeId || '';
        return empA.localeCompare(empB, undefined, { numeric: true });
      });
  }, [monthRecords, staffMembers, selectedCompany, searchTerm]);

  // Aggregate totals
  const totalWorkersCount = filteredRecords.length;
  const totalNetSalary = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (r.netPayable || 0), 0);
  }, [filteredRecords]);

  const activeCompanyName = selectedCompany !== 'ALL' 
    ? selectedCompany 
    : (businessProfile.name || 'SR Group & Fabrication');

  // Print Handler
  const handlePrint = () => {
    if (!printAreaRef.current) return;
    printElementSafely(printAreaRef.current, `Monthly_Company_Salary_Slip_${selectedMonth}`, {
      orientation: 'portrait',
      pageMargin: '4mm',
    });
  };

  // PDF Export Handler
  const handleExportPdf = async () => {
    if (!printAreaRef.current) return;
    setIsExportingPdf(true);
    try {
      const fileName = `Monthly_Company_Salary_Slip_${selectedMonth}_${activeCompanyName.replace(/\s+/g, '_')}.pdf`;
      await downloadElementAsPdf(printAreaRef.current, fileName, {
        orientation: 'portrait',
        scale: 2.5,
      });
    } catch (err) {
      console.error('Failed to export Monthly Company Slip PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#070e24] border border-[#1b2f65] rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Bar */}
        <div className="p-4 px-6 bg-[#091538] border-b border-[#14234d] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <FileText className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <h2 className="font-black text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                <span>Monthly Company Salary Slip PDF</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  {formattedMonthTitle}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Total <strong>{totalWorkersCount} Workers</strong> &bull; Total Net Salary: <strong className="text-emerald-400 font-mono">₹{totalNetSalary.toLocaleString('en-IN')}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download A4 Slip PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#101e47] hover:bg-[#162758] text-white font-bold text-xs rounded-xl border border-[#213977] transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#101e47] transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Filter & Options Bar */}
        <div className="p-3 px-6 bg-[#060c20] border-b border-[#14234d] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Company Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] font-bold">Company / Site:</span>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="bg-[#0a163b] border border-[#1b2f65] text-white rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
              >
                <option value="ALL">All Companies &amp; Sites</option>
                {availableCompanies.map((c) => (
                  <option key={c.id || c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Quick Search */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search worker or bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0a163b] border border-[#1b2f65] text-white rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-cyan-400 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Slip Ref:</span>
            <input
              type="text"
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
              className="bg-[#0a163b] border border-[#1b2f65] text-cyan-300 font-mono text-[11px] rounded-lg px-2 py-1 w-44"
            />
          </div>
        </div>

        {/* Document Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#040817] flex justify-center custom-scrollbar">
          
          {/* Printable A4 Document Sheet */}
          <div
            ref={printAreaRef}
            id="company-monthly-salary-slip-document"
            className="bg-white text-slate-900 shadow-2xl relative select-text transition-all rounded-lg overflow-hidden"
            style={{
              width: '794px',
              minHeight: '1123px',
              boxSizing: 'border-box',
              padding: '36px 38px',
              fontSize: '11px',
              lineHeight: 1.45,
            }}
          >
            {/* Header Section */}
            <div className="border-b-2 border-slate-900 pb-3 space-y-1 text-center">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h1 className="text-xl font-black uppercase tracking-tight text-slate-950 font-heading">
                    {activeCompanyName}
                  </h1>
                  <p className="text-[10px] text-slate-600 font-medium">
                    {businessProfile.address}, {businessProfile.city} {businessProfile.pincode ? `- ${businessProfile.pincode}` : ''}
                  </p>
                  <p className="text-[10px] font-mono text-slate-700">
                    GSTIN: {businessProfile.gstin || '24CTGPR1641K1ZJ'} | PAN: {businessProfile.pan || 'CTGPR1641K'}
                  </p>
                </div>
                <div className="text-right font-mono text-[10px] text-slate-700 space-y-0.5">
                  <div><strong>REF NO:</strong> <span className="text-slate-950 font-bold">{refNo}</span></div>
                  <div><strong>DATE:</strong> <span className="text-slate-950 font-bold">{slipDate}</span></div>
                  <div><strong>MONTH:</strong> <span className="text-blue-900 font-black uppercase">{formattedMonthTitle}</span></div>
                </div>
              </div>

              {/* Title Ribbon */}
              <div className="pt-2">
                <div className="bg-slate-900 text-white py-1.5 px-4 rounded-md font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-2xs">
                  <span>MONTHLY COMPANY SALARY SLIP &amp; BANK ADVICE</span>
                  <span className="text-cyan-300 font-mono">{formattedMonthTitle.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Total Workers Summary Banner */}
            <div className="my-3 p-3 bg-slate-100 rounded-xl border border-slate-300 grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Active Workers</span>
                <span className="text-lg font-black text-slate-950 font-mono">{totalWorkersCount} Workers</span>
              </div>
              <div className="border-x border-slate-300">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Net Salary Disbursed</span>
                <span className="text-lg font-black text-emerald-800 font-mono">₹{totalNetSalary.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Payment Month</span>
                <span className="text-sm font-black text-blue-900 uppercase font-heading">{formattedMonthTitle}</span>
              </div>
            </div>

            {/* Worker Bank & Net Salary Table (Worker Name, Account Holder Name, Account Number, Bank Name, IFSC Code, Net Salary) */}
            <div className="border-2 border-slate-900 rounded-lg overflow-hidden my-3 bg-white">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[9px]">
                    <th className="py-2 px-2 text-center border-r border-slate-700 w-8">#</th>
                    <th className="py-2 px-2.5 text-left border-r border-slate-700 min-w-[130px]">Worker Name</th>
                    <th className="py-2 px-2.5 text-left border-r border-slate-700 min-w-[130px]">Account Holder Name</th>
                    <th className="py-2 px-2.5 text-left border-r border-slate-700 min-w-[120px]">Account Number</th>
                    <th className="py-2 px-2.5 text-left border-r border-slate-700 min-w-[100px]">Bank Name</th>
                    <th className="py-2 px-2 text-center border-r border-slate-700 min-w-[90px]">IFSC Code</th>
                    <th className="py-2 px-2.5 text-right min-w-[90px]">Net Salary (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                        No worker attendance records found for {formattedMonthTitle}.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec, idx) => {
                      const staffObj = staffMembers.find((s) => s.id === rec.staffId);
                      const empId = rec.employeeId || staffObj?.employeeId || `EMP-${String(idx + 1).padStart(3, '0')}`;
                      
                      // Worker Name
                      const workerName = rec.staffName;
                      
                      // Account Holder Name (defaults to accountHolderName, or fallback to workerName)
                      const holderName = rec.accountHolderName || staffObj?.accountHolderName || workerName;
                      
                      // Account Number
                      const accountNo = rec.accountNumber || staffObj?.accountNumber || '—';
                      
                      // Bank Name
                      const bankName = rec.bankName || staffObj?.bankName || 'State Bank of India';
                      
                      // IFSC Code
                      const ifscCode = rec.ifscCode || staffObj?.ifscCode || '—';
                      
                      // Net Salary
                      const netSalary = rec.netPayable || 0;

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-600 border-r border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-200 font-bold text-slate-950">
                            <div>{workerName}</div>
                            <div className="text-[8.5px] text-slate-500 font-mono font-medium">{empId} &bull; {rec.role}</div>
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-200 font-bold text-slate-900">
                            {holderName}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-200 font-mono font-bold text-slate-950 tracking-wider">
                            {accountNo}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-800 font-medium">
                            {bankName}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono font-semibold text-slate-700">
                            {ifscCode}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-black text-slate-950 text-[11px]">
                            ₹{netSalary.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black border-t-2 border-slate-900 text-[10.5px]">
                    <td colSpan={6} className="py-2 px-3 uppercase border-r border-slate-300 text-slate-900">
                      Total Workforce: {totalWorkersCount} Workers (Consolidated Salary Outflow)
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-xs text-slate-950 bg-emerald-100/80">
                      ₹{totalNetSalary.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Total in Words */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-300 text-[10px] space-y-0.5">
              <span className="font-bold text-slate-600 uppercase mr-1">Total Net Salary In Words:</span>
              <span className="font-extrabold text-slate-950 capitalize">
                {numberToIndianWords(totalNetSalary)}
              </span>
            </div>

            {/* Signatures & Certification Block */}
            <div className="pt-8 flex items-end justify-between text-[10px]">
              <div className="space-y-1">
                <div className="h-8 border-b border-slate-400 w-36"></div>
                <div className="font-bold text-slate-800">Prepared By</div>
                <div className="text-slate-500 text-[9px]">Accountant / Timekeeper</div>
              </div>

              <div className="space-y-1 text-center">
                <div className="h-8 border-b border-slate-400 w-36"></div>
                <div className="font-bold text-slate-800">Verified By</div>
                <div className="text-slate-500 text-[9px]">HR / Project Engineer</div>
              </div>

              <div className="space-y-1 text-right">
                <div className="h-8 border-b border-slate-400 w-44 ml-auto"></div>
                <div className="font-black text-slate-950 text-[11px]">Authorized Signatory</div>
                <div className="text-slate-600 text-[9px]">For {activeCompanyName}</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
