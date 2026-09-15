import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  UserCheck, Calendar, Clock, DollarSign, Printer, Download, Plus, 
  Trash2, Edit3, Search, CheckCircle2, AlertCircle, Calculator, 
  ChevronLeft, ChevronRight, FileText, Sparkles, X, Building2, 
  Phone, Briefcase, Eye, ArrowUpDown, Check, RefreshCw, CreditCard, Copy,
  AlertTriangle, Hash, Upload, File, Image as ImageIcon, Paperclip, Users, User, ShieldCheck,
  FolderOpen, Landmark
} from 'lucide-react';
import { StaffMember, AttendanceRecord, AttendanceCompany, BusinessProfile, PaymentMode, WorkerDocument } from '../types';
import { formatIndianCurrency, numberToIndianWords } from '../utils/gstCalculations';
import { downloadElementAsPdf, printElementSafely } from '../utils/pdfExport';
import { BankPaymentAdviceModal } from './BankPaymentAdviceModal';

interface WorkerDocumentUploadSectionProps {
  documents: WorkerDocument[];
  onChange: (docs: WorkerDocument[]) => void;
  onPreview: (doc: WorkerDocument) => void;
}

const WorkerDocumentUploadSection: React.FC<WorkerDocumentUploadSectionProps> = ({
  documents,
  onChange,
  onPreview,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'aadhaar' | 'pan' | 'bank_passbook' | 'photo' | 'other'>('aadhaar');
  const [docLabel, setDocLabel] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryPresets: { id: 'aadhaar' | 'pan' | 'bank_passbook' | 'photo' | 'other'; label: string; defaultName: string }[] = [
    { id: 'aadhaar', label: 'Aadhaar Card (आधार)', defaultName: 'Aadhaar Card' },
    { id: 'pan', label: 'PAN Card (पैन)', defaultName: 'PAN Card' },
    { id: 'bank_passbook', label: 'Bank Passbook / Cheque (पासबुक)', defaultName: 'Bank Passbook Copy' },
    { id: 'photo', label: 'Worker Photo (फोटो)', defaultName: 'Worker Photo' },
    { id: 'other', label: 'Other ID Proof (अन्य)', defaultName: 'Identity Document' },
  ];

  const handleFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    files.forEach((file) => {
      // Limit 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" is larger than 10MB. Please choose a smaller file.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = e.target?.result as string;
        if (!fileData) return;

        const preset = categoryPresets.find((p) => p.id === selectedCategory);
        const autoName = docLabel.trim() || preset?.defaultName || file.name;

        const newDoc: WorkerDocument = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: autoName,
          category: selectedCategory,
          fileData,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        };

        onChange([...documents, newDoc]);
        setDocLabel('');
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemove = (id: string) => {
    onChange(documents.filter((d) => d.id !== id));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="pt-3 border-t border-slate-200 space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-extrabold text-blue-950 uppercase flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-blue-600" />
          Worker KYC &amp; Document Upload (दस्तावेज़ अपलोड)
        </h4>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
          {documents.length} {documents.length === 1 ? 'file attached' : 'files attached'}
        </span>
      </div>

      {/* Category selector pills */}
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-600 uppercase">
          Select Document Type (दस्तावेज़ का प्रकार चुनें):
        </label>
        <div className="flex flex-wrap gap-1.5">
          {categoryPresets.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                setDocLabel(cat.defaultName);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional Document Title / Label */}
      <div>
        <input
          type="text"
          placeholder="Document Label / Title (e.g. Aadhaar Front & Back, SBI Passbook)"
          value={docLabel}
          onChange={(e) => setDocLabel(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-blue-600 font-medium"
        />
      </div>

      {/* Drag & Drop Upload Zone + Manual Selection */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-600 bg-blue-50/90 scale-[0.99]'
            : 'border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
        <div className="flex flex-col items-center justify-center gap-1.5 text-slate-600">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">
              Drag &amp; drop document here, or <span className="text-blue-600 underline">browse files</span>
            </p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">
              Upload Aadhaar, PAN card, Bank Passbook, or Worker Photo (Images or PDF up to 10MB)
            </p>
          </div>
        </div>
      </div>

      {/* Attached Documents Grid */}
      {documents.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-600" />
            Uploaded Documents ({documents.length}):
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {documents.map((doc) => {
              const isImage = doc.fileType?.startsWith('image/') || doc.fileData.startsWith('data:image/');
              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl border border-slate-200 p-2.5 flex items-center justify-between gap-2 shadow-2xs hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isImage ? (
                      <img
                        src={doc.fileData}
                        alt={doc.name}
                        className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0 text-red-600">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-slate-900 truncate" title={doc.name}>
                        {doc.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <span className="truncate max-w-[90px]">{doc.fileName}</span>
                        {doc.fileSize ? <span>• {formatFileSize(doc.fileSize)}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPreview(doc)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Preview Document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(doc.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface AttendanceViewProps {
  businessProfile: BusinessProfile;
  staffMembers: StaffMember[];
  attendanceRecords: AttendanceRecord[];
  attendanceCompanies?: AttendanceCompany[];
  onAddStaffMember: (staff: StaffMember) => void;
  onUpdateStaffMember: (staff: StaffMember) => void;
  onDeleteStaffMember: (staffId: string) => void;
  onSaveAttendanceRecord: (record: AttendanceRecord) => void;
  onDeleteAttendanceRecord: (recordId: string, deleteStaffToo?: boolean, staffId?: string, staffName?: string) => void;
  onRecordSalaryPayment: (recordId: string, paidAmount: number, paymentMode: PaymentMode) => void;
  onAddAttendanceCompany?: (company: AttendanceCompany) => void;
  onUpdateAttendanceCompany?: (company: AttendanceCompany, oldName?: string) => void;
  onDeleteAttendanceCompany?: (companyId: string, companyName?: string) => void;
  onClearAllAttendanceAndStaff?: (clearStaffToo?: boolean) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  businessProfile,
  staffMembers,
  attendanceRecords,
  attendanceCompanies = [],
  onAddStaffMember,
  onUpdateStaffMember,
  onDeleteStaffMember,
  onSaveAttendanceRecord,
  onDeleteAttendanceRecord,
  onRecordSalaryPayment,
  onAddAttendanceCompany,
  onUpdateAttendanceCompany,
  onDeleteAttendanceCompany,
  onClearAllAttendanceAndStaff,
}) => {
  // Current active month in 'YYYY-MM' format (persisted in localStorage)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sr_attendance_selected_month');
      if (saved && /^\d{4}-\d{2}$/.test(saved)) {
        return saved;
      }
    } catch (e) {
      // ignore
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const changeSelectedMonth = (newMonth: string) => {
    setSelectedMonth(newMonth);
    try {
      localStorage.setItem('sr_attendance_selected_month', newMonth);
    } catch (e) {
      // ignore
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID' | 'PARTIAL'>('ALL');

  // Import workers modal states
  const [isImportStaffModalOpen, setIsImportStaffModalOpen] = useState(false);
  const [selectedStaffIdsToImport, setSelectedStaffIdsToImport] = useState<string[]>([]);
  const [importSearchQuery, setImportSearchQuery] = useState('');

  // Company filtering and management states
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [companySearchInput, setCompanySearchInput] = useState<string>('');
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState<boolean>(false);
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [newCompanyCode, setNewCompanyCode] = useState<string>('');
  const [newCompanyLocation, setNewCompanyLocation] = useState<string>('');
  const [newCompanyContactPerson, setNewCompanyContactPerson] = useState<string>('');
  const [newCompanyPhone, setNewCompanyPhone] = useState<string>('');
  const [newCompanyNotes, setNewCompanyNotes] = useState<string>('');

  // Company Edit & Delete state
  const [editingCompany, setEditingCompany] = useState<AttendanceCompany | null>(null);
  const [editCompanyName, setEditCompanyName] = useState<string>('');
  const [editCompanyCode, setEditCompanyCode] = useState<string>('');
  const [editCompanyLocation, setEditCompanyLocation] = useState<string>('');
  const [editCompanyContactPerson, setEditCompanyContactPerson] = useState<string>('');
  const [editCompanyPhone, setEditCompanyPhone] = useState<string>('');
  const [editCompanyNotes, setEditCompanyNotes] = useState<string>('');
  const [companyToDelete, setCompanyToDelete] = useState<{ id: string; name: string; workerCount: number } | null>(null);

  // Quick Live Calculator State
  const [calcStaffId, setCalcStaffId] = useState<string>(staffMembers[0]?.id || 'custom');
  const [calcStaffName, setCalcStaffName] = useState<string>(staffMembers[0]?.name || '');
  const [calcEmployeeId, setCalcEmployeeId] = useState<string>(staffMembers[0]?.employeeId || 'EMP-001');
  const [calcCompanyName, setCalcCompanyName] = useState<string>(staffMembers[0]?.companyName || 'SR Group & Fabrication');
  const [calcRole, setCalcRole] = useState<string>(staffMembers[0]?.role || 'Worker');
  const [calcSalaryRate, setCalcSalaryRate] = useState<number>(staffMembers[0]?.defaultRate || 650);
  const [calcDutyDays, setCalcDutyDays] = useState<number>(26);
  const [calcDutyDate, setCalcDutyDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [calcOvertimeHours, setCalcOvertimeHours] = useState<number>(0);
  const [calcOvertimeRate, setCalcOvertimeRate] = useState<number>(80);
  const [calcAdvance, setCalcAdvance] = useState<number>(0);
  const [calcBonus, setCalcBonus] = useState<number>(0);
  const [calcNotes, setCalcNotes] = useState<string>('');
  const [showQuickCalculator, setShowQuickCalculator] = useState(true);

  // Modals state: New Join Worker
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [newStaffEmployeeId, setNewStaffEmployeeId] = useState('');
  const [newStaffCompanyName, setNewStaffCompanyName] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Fabricator');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffDefaultRate, setNewStaffDefaultRate] = useState<number>(700);
  const [newStaffJoiningDate, setNewStaffJoiningDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newStaffAccountHolderName, setNewStaffAccountHolderName] = useState('');
  const [newStaffRelationName, setNewStaffRelationName] = useState('Self');
  const [newStaffAccountNumber, setNewStaffAccountNumber] = useState('');
  const [newStaffBankName, setNewStaffBankName] = useState('');
  const [newStaffIfscCode, setNewStaffIfscCode] = useState('');
  const [newStaffUpiId, setNewStaffUpiId] = useState('');
  const [newStaffDocuments, setNewStaffDocuments] = useState<WorkerDocument[]>([]);

  // Modals state: Edit Staff Member Profile
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editStaffEmployeeId, setEditStaffEmployeeId] = useState('');
  const [editStaffCompanyName, setEditStaffCompanyName] = useState('');
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffRole, setEditStaffRole] = useState('');
  const [editStaffPhone, setEditStaffPhone] = useState('');
  const [editStaffDefaultRate, setEditStaffDefaultRate] = useState<number>(700);
  const [editStaffJoiningDate, setEditStaffJoiningDate] = useState('');
  const [editStaffAccountHolderName, setEditStaffAccountHolderName] = useState('');
  const [editStaffRelationName, setEditStaffRelationName] = useState('Self');
  const [editStaffAccountNumber, setEditStaffAccountNumber] = useState('');
  const [editStaffBankName, setEditStaffBankName] = useState('');
  const [editStaffIfscCode, setEditStaffIfscCode] = useState('');
  const [editStaffUpiId, setEditStaffUpiId] = useState('');
  const [editStaffDocuments, setEditStaffDocuments] = useState<WorkerDocument[]>([]);

  // Preview & View Documents modals
  const [previewingDoc, setPreviewingDoc] = useState<WorkerDocument | null>(null);
  const [viewingWorkerDocsStaff, setViewingWorkerDocsStaff] = useState<StaffMember | null>(null);

  // Daily Attendance marking modal
  const [activeAttendanceModalRecord, setActiveAttendanceModalRecord] = useState<AttendanceRecord | null>(null);

  // Salary slip print modal
  const [viewingSalarySlip, setViewingSalarySlip] = useState<AttendanceRecord | null>(null);
  const salarySlipPrintRef = useRef<HTMLDivElement>(null);
  const monthlySheetPrintRef = useRef<HTMLDivElement>(null);
  const [isBankAdviceModalOpen, setIsBankAdviceModalOpen] = useState(false);

  // Quick Pay Modal
  const [payingRecord, setPayingRecord] = useState<AttendanceRecord | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<PaymentMode>('CASH');

  // In-App Confirmation Modals for Delete (fixes blocked window.confirm in iframe)
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);
  const [deleteWorkerToo, setDeleteWorkerToo] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [clearStaffToo, setClearStaffToo] = useState(true);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newY = prevDate.getFullYear();
    const newM = String(prevDate.getMonth() + 1).padStart(2, '0');
    changeSelectedMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newY = nextDate.getFullYear();
    const newM = String(nextDate.getMonth() + 1).padStart(2, '0');
    changeSelectedMonth(`${newY}-${newM}`);
  };

  const formattedMonthTitle = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  // Total days in selected month
  const daysInSelectedMonth = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }, [selectedMonth]);

  // List of all unique available companies (combining props, staff members, and attendance records)
  const allAvailableCompanies = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code?: string; location?: string }>();
    
    (attendanceCompanies || []).forEach(c => {
      if (c.name) map.set(c.name.trim().toLowerCase(), { id: c.id, name: c.name, code: c.code, location: c.location });
    });

    staffMembers.forEach(s => {
      if (s.companyName && !map.has(s.companyName.trim().toLowerCase())) {
        map.set(s.companyName.trim().toLowerCase(), { id: `comp-${Date.now()}-${Math.random()}`, name: s.companyName });
      }
    });

    attendanceRecords.forEach(r => {
      if (r.companyName && !map.has(r.companyName.trim().toLowerCase())) {
        map.set(r.companyName.trim().toLowerCase(), { id: `comp-${Date.now()}-${Math.random()}`, name: r.companyName });
      }
    });

    return Array.from(map.values());
  }, [attendanceCompanies, staffMembers, attendanceRecords]);

  // Next Auto Employee ID generator
  const getNextEmployeeId = () => {
    const existingIds = staffMembers.map(s => s.employeeId).filter(Boolean) as string[];
    let maxNum = 0;
    existingIds.forEach(id => {
      const match = id.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `EMP-${String(maxNum + 1).padStart(3, '0')}`;
  };

  // Current month's records
  const monthRecords = useMemo(() => {
    return attendanceRecords.filter((rec) => rec.month === selectedMonth);
  }, [attendanceRecords, selectedMonth]);

  // Month records filtered by selected company or typed company search name
  const companyFilteredMonthRecords = useMemo(() => {
    return monthRecords.filter((rec) => {
      const staffObj = staffMembers.find((s) => s.id === rec.staffId);
      const effectiveCompany = (rec.companyName || staffObj?.companyName || '').trim();

      // If user typed in company search input
      if (companySearchInput.trim()) {
        const q = companySearchInput.trim().toLowerCase();
        return effectiveCompany.toLowerCase().includes(q);
      }

      // If user picked a company from dropdown or quick tabs
      if (selectedCompany !== 'ALL') {
        return effectiveCompany.toLowerCase() === selectedCompany.trim().toLowerCase();
      }

      return true;
    });
  }, [monthRecords, staffMembers, selectedCompany, companySearchInput]);

  // Filtered records for table view
  const filteredRecords = useMemo(() => {
    return companyFilteredMonthRecords.filter((rec) => {
      const staffObj = staffMembers.find((s) => s.id === rec.staffId);
      const empId = (rec.employeeId || staffObj?.employeeId || '').toLowerCase();
      const compName = (rec.companyName || staffObj?.companyName || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch = 
        rec.staffName.toLowerCase().includes(q) ||
        rec.role.toLowerCase().includes(q) ||
        empId.includes(q) ||
        compName.includes(q) ||
        (rec.accountNumber && rec.accountNumber.includes(q));

      const matchesStatus = statusFilter === 'ALL' || rec.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [companyFilteredMonthRecords, staffMembers, searchQuery, statusFilter]);

  // KPI calculations based on companyFilteredMonthRecords
  const totalDutyLogged = useMemo(() => {
    return companyFilteredMonthRecords.reduce((sum, r) => sum + (r.dutyDays || 0), 0);
  }, [companyFilteredMonthRecords]);

  const totalOvertimeHours = useMemo(() => {
    return companyFilteredMonthRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
  }, [companyFilteredMonthRecords]);

  const totalOvertimeAmount = useMemo(() => {
    return companyFilteredMonthRecords.reduce((sum, r) => sum + (r.overtimeAmount || 0), 0);
  }, [companyFilteredMonthRecords]);

  const totalGrossWages = useMemo(() => {
    return companyFilteredMonthRecords.reduce((sum, r) => sum + (r.totalSalary || 0) + (r.overtimeAmount || 0), 0);
  }, [companyFilteredMonthRecords]);

  const totalAdvanceDeducted = useMemo(() => {
    return companyFilteredMonthRecords.reduce((sum, r) => sum + (r.advanceDeduction || 0), 0);
  }, [companyFilteredMonthRecords]);

  const totalNetPayable = useMemo(() => {
    return companyFilteredMonthRecords.reduce((sum, r) => sum + (r.netPayable || 0), 0);
  }, [companyFilteredMonthRecords]);

  const totalPaidOut = useMemo(() => {
    return companyFilteredMonthRecords.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
  }, [companyFilteredMonthRecords]);

  const totalBalanceDue = useMemo(() => {
    return Math.max(0, totalNetPayable - totalPaidOut);
  }, [totalNetPayable, totalPaidOut]);

  // Staff members specifically belonging to the selected month:
  // 1) Staff who have an attendance record in selectedMonth
  // 2) Staff created explicitly for selectedMonth
  const currentMonthStaff = useMemo(() => {
    const staffIdsWithRecord = new Set(monthRecords.map((r) => r.staffId));
    const staffNamesWithRecord = new Set(monthRecords.map((r) => (r.staffName || '').trim().toLowerCase()));

    return staffMembers.filter((s) => {
      if (staffIdsWithRecord.has(s.id)) return true;
      if (s.name && staffNamesWithRecord.has(s.name.trim().toLowerCase())) return true;
      if (s.createdMonth === selectedMonth || s.month === selectedMonth) return true;
      return false;
    });
  }, [staffMembers, monthRecords, selectedMonth]);

  // Other staff members (belonging to other months)
  const otherMonthsStaff = useMemo(() => {
    const currentIds = new Set(currentMonthStaff.map((s) => s.id));
    return staffMembers.filter((s) => !currentIds.has(s.id));
  }, [staffMembers, currentMonthStaff]);

  // Live Auto-Calculation for Quick Calculator
  const liveGrossSalary = Math.round(Number(calcSalaryRate || 0) * Number(calcDutyDays || 0));
  const liveOvertimeAmount = Math.round(Number(calcOvertimeHours || 0) * Number(calcOvertimeRate || 0));
  const liveNetPayable = Math.max(0, liveGrossSalary + liveOvertimeAmount + Number(calcBonus || 0) - Number(calcAdvance || 0));

  // Reset calculator selection when switching months if worker does not belong to this month
  useEffect(() => {
    if (calcStaffId !== 'custom') {
      const stillValid = currentMonthStaff.some((s) => s.id === calcStaffId);
      if (!stillValid) {
        if (currentMonthStaff.length > 0) {
          handleSelectStaffForCalc(currentMonthStaff[0].id);
        } else {
          setCalcStaffId('custom');
          setCalcStaffName('');
          setCalcEmployeeId(getNextEmployeeId());
          setCalcSalaryRate(600);
          setCalcDutyDays(26);
          setCalcOvertimeHours(0);
          setCalcAdvance(0);
          setCalcBonus(0);
        }
      }
    }
  }, [selectedMonth, currentMonthStaff]);

  // Handle staff selection in calculator
  const handleSelectStaffForCalc = (staffId: string) => {
    setCalcStaffId(staffId);
    if (staffId === 'custom') {
      setCalcStaffName('');
      setCalcEmployeeId(getNextEmployeeId());
      setCalcCompanyName(selectedCompany !== 'ALL' ? selectedCompany : (allAvailableCompanies[0]?.name || 'SR Group & Fabrication'));
      setCalcRole('General Worker');
      setCalcSalaryRate(600);
      setCalcDutyDays(26);
      setCalcOvertimeHours(0);
      setCalcOvertimeRate(75);
      setCalcAdvance(0);
      setCalcBonus(0);
      setCalcNotes('');
      return;
    }
    const found = staffMembers.find((s) => s.id === staffId);
    if (found) {
      setCalcStaffName(found.name);
      setCalcEmployeeId(found.employeeId || getNextEmployeeId());
      setCalcCompanyName(found.companyName || 'SR Group & Fabrication');
      setCalcRole(found.role);
      setCalcSalaryRate(found.defaultRate);

      // Check if existing record exists for this staff in the month
      const existing = monthRecords.find((r) => r.staffId === found.id);
      if (existing) {
        setCalcDutyDays(existing.dutyDays);
        setCalcSalaryRate(existing.salaryRate);
        if (existing.dutyDate) setCalcDutyDate(existing.dutyDate);
        setCalcAdvance(existing.advanceDeduction || 0);
        setCalcOvertimeHours(existing.overtimeHours || 0);
        setCalcOvertimeRate(existing.overtimeRate || Math.round((existing.salaryRate || found.defaultRate) / 8) || 80);
        setCalcBonus(existing.bonus || 0);
        setCalcNotes(existing.notes || '');
        if (existing.employeeId) setCalcEmployeeId(existing.employeeId);
        if (existing.companyName) setCalcCompanyName(existing.companyName);
      } else {
        setCalcDutyDays(26);
        setCalcAdvance(0);
        setCalcOvertimeHours(0);
        setCalcOvertimeRate(Math.round(found.defaultRate / 8) || 80);
        setCalcBonus(0);
        setCalcNotes('');
      }
    }
  };

  // Open Edit Worker Modal
  const handleOpenEditStaffModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditStaffName(staff.name);
    setEditStaffEmployeeId(staff.employeeId || '');
    setEditStaffCompanyName(staff.companyName || '');
    setEditStaffRole(staff.role);
    setEditStaffPhone(staff.phone || '');
    setEditStaffDefaultRate(staff.defaultRate || 650);
    setEditStaffJoiningDate(staff.joiningDate || new Date().toISOString().split('T')[0]);
    setEditStaffAccountHolderName(staff.accountHolderName || '');
    setEditStaffRelationName(staff.relationName || 'Self');
    setEditStaffAccountNumber(staff.accountNumber || '');
    setEditStaffBankName(staff.bankName || '');
    setEditStaffIfscCode(staff.ifscCode || '');
    setEditStaffUpiId(staff.upiId || '');
    setEditStaffDocuments(staff.documents || []);
  };

  // Save Edited Worker Profile
  const handleSaveEditStaff = () => {
    if (!editingStaff) return;
    if (!editStaffName.trim()) {
      alert('Please enter worker name');
      return;
    }

    const updatedStaff: StaffMember = {
      ...editingStaff,
      name: editStaffName.trim(),
      employeeId: editStaffEmployeeId.trim() || undefined,
      companyName: editStaffCompanyName.trim() || undefined,
      role: editStaffRole.trim() || 'Worker',
      phone: editStaffPhone.trim(),
      defaultRate: Number(editStaffDefaultRate) || 600,
      joiningDate: editStaffJoiningDate || new Date().toISOString().split('T')[0],
      accountHolderName: editStaffAccountHolderName.trim() || undefined,
      relationName: editStaffRelationName.trim() || undefined,
      accountNumber: editStaffAccountNumber.trim() || undefined,
      bankName: editStaffBankName.trim() || undefined,
      ifscCode: editStaffIfscCode.trim().toUpperCase() || undefined,
      upiId: editStaffUpiId.trim() || undefined,
      documents: editStaffDocuments.length > 0 ? editStaffDocuments : undefined,
    };

    onUpdateStaffMember(updatedStaff);

    // Also update any current month attendance records with these fresh details
    monthRecords.forEach((rec) => {
      if (rec.staffId === updatedStaff.id) {
        onSaveAttendanceRecord({
          ...rec,
          staffName: updatedStaff.name,
          employeeId: updatedStaff.employeeId,
          companyName: updatedStaff.companyName,
          role: updatedStaff.role,
          joiningDate: updatedStaff.joiningDate,
          accountHolderName: updatedStaff.accountHolderName,
          relationName: updatedStaff.relationName,
          accountNumber: updatedStaff.accountNumber,
          bankName: updatedStaff.bankName,
          ifscCode: updatedStaff.ifscCode,
          upiId: updatedStaff.upiId,
        });
      }
    });

    setEditingStaff(null);
    alert(`✅ ${updatedStaff.name}'s profile, KYC documents, and bank details updated successfully!`);
  };

  // Add / Create new company handler
  const handleCreateCompany = () => {
    if (!newCompanyName.trim()) {
      alert('Please enter company name');
      return;
    }
    const newComp: AttendanceCompany = {
      id: `comp-${Date.now()}`,
      name: newCompanyName.trim(),
      code: newCompanyCode.trim() || undefined,
      location: newCompanyLocation.trim() || undefined,
      contactPerson: newCompanyContactPerson.trim() || undefined,
      phone: newCompanyPhone.trim() || undefined,
      notes: newCompanyNotes.trim() || undefined,
    };
    if (onAddAttendanceCompany) {
      onAddAttendanceCompany(newComp);
    }
    setSelectedCompany(newComp.name);
    setCompanySearchInput('');
    setNewCompanyName('');
    setNewCompanyCode('');
    setNewCompanyLocation('');
    setNewCompanyContactPerson('');
    setNewCompanyPhone('');
    setNewCompanyNotes('');
    setIsCompanyModalOpen(false);
  };

  // Start editing a company
  const handleStartEditCompany = (comp: {
    id: string;
    name: string;
    code?: string;
    location?: string;
    contactPerson?: string;
    phone?: string;
    notes?: string;
  }) => {
    const fullComp: AttendanceCompany = {
      id: comp.id,
      name: comp.name,
      code: comp.code,
      location: comp.location,
      contactPerson: comp.contactPerson,
      phone: comp.phone,
      notes: comp.notes,
    };
    setEditingCompany(fullComp);
    setEditCompanyName(comp.name);
    setEditCompanyCode(comp.code || '');
    setEditCompanyLocation(comp.location || '');
    setEditCompanyContactPerson(comp.contactPerson || '');
    setEditCompanyPhone(comp.phone || '');
    setEditCompanyNotes(comp.notes || '');
    setIsCompanyModalOpen(true);
  };

  // Cancel company edit
  const handleCancelEditCompany = () => {
    setEditingCompany(null);
    setEditCompanyName('');
    setEditCompanyCode('');
    setEditCompanyLocation('');
    setEditCompanyContactPerson('');
    setEditCompanyPhone('');
    setEditCompanyNotes('');
  };

  // Save edited company
  const handleSaveEditCompany = () => {
    if (!editingCompany) return;
    if (!editCompanyName.trim()) {
      alert('Please enter company name');
      return;
    }

    const oldName = editingCompany.name;
    const newName = editCompanyName.trim();

    const updatedComp: AttendanceCompany = {
      ...editingCompany,
      name: newName,
      code: editCompanyCode.trim().toUpperCase() || undefined,
      location: editCompanyLocation.trim() || undefined,
      contactPerson: editCompanyContactPerson.trim() || undefined,
      phone: editCompanyPhone.trim() || undefined,
      notes: editCompanyNotes.trim() || undefined,
    };

    if (onUpdateAttendanceCompany) {
      onUpdateAttendanceCompany(updatedComp, oldName);
    }

    // If company name was modified, also update assigned staffMembers and records
    if (oldName.trim().toLowerCase() !== newName.trim().toLowerCase()) {
      staffMembers.forEach((s) => {
        if ((s.companyName || '').trim().toLowerCase() === oldName.trim().toLowerCase()) {
          onUpdateStaffMember({
            ...s,
            companyName: newName,
          });
        }
      });

      monthRecords.forEach((r) => {
        if ((r.companyName || '').trim().toLowerCase() === oldName.trim().toLowerCase()) {
          onSaveAttendanceRecord({
            ...r,
            companyName: newName,
          });
        }
      });

      if (selectedCompany.trim().toLowerCase() === oldName.trim().toLowerCase()) {
        setSelectedCompany(newName);
      }
    }

    handleCancelEditCompany();
  };

  // Prompt delete company
  const handlePromptDeleteCompany = (comp: { id: string; name: string }) => {
    const count = staffMembers.filter(
      (s) => (s.companyName || '').trim().toLowerCase() === comp.name.trim().toLowerCase()
    ).length;
    setCompanyToDelete({
      id: comp.id,
      name: comp.name,
      workerCount: count,
    });
  };

  // Confirm delete company
  const handleConfirmDeleteCompany = () => {
    if (!companyToDelete) return;
    const targetId = companyToDelete.id;
    const targetName = companyToDelete.name;

    if (onDeleteAttendanceCompany) {
      onDeleteAttendanceCompany(targetId, targetName);
    }

    // Unassign this company from any staff member
    staffMembers.forEach((s) => {
      if ((s.companyName || '').trim().toLowerCase() === targetName.trim().toLowerCase()) {
        onUpdateStaffMember({
          ...s,
          companyName: undefined,
        });
      }
    });

    monthRecords.forEach((r) => {
      if ((r.companyName || '').trim().toLowerCase() === targetName.trim().toLowerCase()) {
        onSaveAttendanceRecord({
          ...r,
          companyName: undefined,
        });
      }
    });

    if (selectedCompany.trim().toLowerCase() === targetName.trim().toLowerCase()) {
      setSelectedCompany('ALL');
    }

    if (editingCompany && (editingCompany.id === targetId || editingCompany.name.toLowerCase() === targetName.toLowerCase())) {
      handleCancelEditCompany();
    }

    setCompanyToDelete(null);
  };

  // Save quick calculator entry
  const handleSaveQuickRecord = () => {
    if (!calcStaffName.trim()) {
      alert('Please enter worker / staff name');
      return;
    }

    const existing = monthRecords.find((r) => r.staffId === calcStaffId && calcStaffId !== 'custom');
    const recordId = existing ? existing.id : `att-${Date.now()}`;
    const staffId = calcStaffId === 'custom' ? `staff-${Date.now()}` : calcStaffId;
    const selectedStaff = staffMembers.find((s) => s.id === staffId);
    const effectiveEmpId = calcEmployeeId.trim() || selectedStaff?.employeeId || existing?.employeeId || (calcStaffId === 'custom' ? getNextEmployeeId() : undefined);
    const effectiveCompany = calcCompanyName.trim() || selectedStaff?.companyName || existing?.companyName || (selectedCompany !== 'ALL' ? selectedCompany : undefined);

    // If new staff, add to staff members as well
    if (calcStaffId === 'custom') {
      onAddStaffMember({
        id: staffId,
        employeeId: effectiveEmpId,
        companyName: effectiveCompany,
        name: calcStaffName.trim(),
        role: calcRole || 'General Worker',
        phone: '',
        defaultRate: Number(calcSalaryRate) || 600,
        rateType: 'PER_DAY',
        joiningDate: new Date().toISOString().split('T')[0],
        month: selectedMonth,
        createdMonth: selectedMonth,
        status: 'ACTIVE',
      });
    }

    const gross = Math.round(Number(calcSalaryRate) * Number(calcDutyDays));
    const otAmount = Math.round(Number(calcOvertimeHours) * Number(calcOvertimeRate));
    const net = Math.max(0, gross + otAmount + Number(calcBonus) - Number(calcAdvance));

    const newRecord: AttendanceRecord = {
      id: recordId,
      staffId: staffId,
      staffName: calcStaffName.trim(),
      employeeId: effectiveEmpId,
      companyName: effectiveCompany,
      role: calcRole || 'General Worker',
      month: selectedMonth,
      dutyDate: calcDutyDate,
      joiningDate: selectedStaff?.joiningDate || existing?.joiningDate || new Date().toISOString().split('T')[0],
      accountNumber: selectedStaff?.accountNumber || existing?.accountNumber,
      bankName: selectedStaff?.bankName || existing?.bankName,
      ifscCode: selectedStaff?.ifscCode || existing?.ifscCode,
      upiId: selectedStaff?.upiId || existing?.upiId,
      salaryRate: Number(calcSalaryRate) || 0,
      dutyDays: Number(calcDutyDays) || 0,
      totalSalary: gross,
      overtimeHours: Number(calcOvertimeHours) || 0,
      overtimeRate: Number(calcOvertimeRate) || 0,
      overtimeAmount: otAmount,
      advanceDeduction: Number(calcAdvance) || 0,
      bonus: Number(calcBonus) || 0,
      netPayable: net,
      paymentStatus: existing ? existing.paymentStatus : 'UNPAID',
      paidAmount: existing ? existing.paidAmount : 0,
      notes: calcNotes,
      dailyAttendance: existing?.dailyAttendance || {},
    };

    onSaveAttendanceRecord(newRecord);
    alert(`✅ Attendance and total salary (₹${net.toLocaleString('en-IN')}) for ${calcStaffName} (${effectiveEmpId || 'Worker'}) saved successfully!`);
  };

  // Handle inline changes in table with immediate instant auto-total
  const handleInlineUpdate = (
    rec: AttendanceRecord, 
    field: 'salaryRate' | 'dutyDays' | 'advanceDeduction' | 'bonus' | 'overtimeHours' | 'overtimeRate', 
    val: number
  ) => {
    const updated = { ...rec, [field]: val };
    
    // Auto Recalculate Totals
    const rate = field === 'salaryRate' ? val : updated.salaryRate;
    const duty = field === 'dutyDays' ? val : updated.dutyDays;
    const gross = Math.round(Number(rate || 0) * Number(duty || 0));
    const otHours = field === 'overtimeHours' ? val : (updated.overtimeHours || 0);
    const otRate = field === 'overtimeRate' ? val : (updated.overtimeRate || 0);
    const otAmount = Math.round(Number(otHours) * Number(otRate));
    const advance = field === 'advanceDeduction' ? val : (updated.advanceDeduction || 0);
    const bonus = field === 'bonus' ? val : (updated.bonus || 0);
    const net = Math.max(0, gross + otAmount + bonus - advance);

    updated.salaryRate = rate;
    updated.dutyDays = duty;
    updated.totalSalary = gross;
    updated.overtimeHours = otHours;
    updated.overtimeRate = otRate;
    updated.overtimeAmount = otAmount;
    updated.advanceDeduction = advance;
    updated.bonus = bonus;
    updated.netPayable = net;

    onSaveAttendanceRecord(updated);
  };

  // Refresh current month view without duplicating or carrying forward workers
  const handleRefreshCurrentMonthView = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCompanySearchInput('');
    alert(`✅ ${formattedMonthTitle} attendance view refreshed. Is month ka data isolated aur safe hai.`);
  };

  // Import selected workers from other months into current month
  const handleImportStaffToCurrentMonth = (staffIds: string[]) => {
    if (!staffIds.length) {
      alert('Kripya import karne ke liye kam se kam 1 worker select karein.');
      return;
    }

    let count = 0;
    staffIds.forEach((staffId) => {
      const staff = staffMembers.find((s) => s.id === staffId);
      if (!staff) return;

      const alreadyHas = monthRecords.some((r) => r.staffId === staff.id || (r.staffName && r.staffName.toLowerCase() === staff.name.toLowerCase()));
      if (!alreadyHas) {
        const defaultDuty = 26;
        const gross = staff.defaultRate * defaultDuty;
        const newRec: AttendanceRecord = {
          id: `att-${staff.id}-${selectedMonth}`,
          staffId: staff.id,
          staffName: staff.name,
          employeeId: staff.employeeId,
          companyName: staff.companyName,
          role: staff.role,
          month: selectedMonth,
          dutyDate: `${selectedMonth}-01`,
          joiningDate: staff.joiningDate,
          accountHolderName: staff.accountHolderName,
          relationName: staff.relationName,
          accountNumber: staff.accountNumber,
          bankName: staff.bankName,
          ifscCode: staff.ifscCode,
          upiId: staff.upiId,
          salaryRate: staff.defaultRate,
          dutyDays: defaultDuty,
          totalSalary: gross,
          overtimeHours: 0,
          overtimeRate: Math.round(staff.defaultRate / 8) || 75,
          overtimeAmount: 0,
          advanceDeduction: 0,
          bonus: 0,
          netPayable: gross,
          paymentStatus: 'UNPAID',
          paidAmount: 0,
          dailyAttendance: {},
        };
        onSaveAttendanceRecord(newRec);
        count++;
      }
    });

    setIsImportStaffModalOpen(false);
    setSelectedStaffIdsToImport([]);
    alert(`✅ ${count} worker(s) successfully imported into ${formattedMonthTitle}. Ye records sirf ${formattedMonthTitle} me rahenge.`);
  };

  // Day marking toggle
  const handleToggleDayAttendance = (day: number, currentStatus?: 'P' | 'A' | 'HD' | 'OT' | 'W') => {
    if (!activeAttendanceModalRecord) return;

    const nextStatusMap: Record<string, 'P' | 'HD' | 'A' | 'OT' | 'W'> = {
      P: 'HD',
      HD: 'A',
      A: 'W',
      W: 'OT',
      OT: 'P',
    };

    const nextStatus = currentStatus ? nextStatusMap[currentStatus] || 'P' : 'P';
    const updatedDaily = { ...(activeAttendanceModalRecord.dailyAttendance || {}), [day]: nextStatus };

    // Calculate total duty from daily record
    let dutySum = 0;
    Object.values(updatedDaily).forEach((st) => {
      if (st === 'P' || st === 'W') dutySum += 1;
      else if (st === 'HD') dutySum += 0.5;
      else if (st === 'OT') dutySum += 1.5;
    });

    const gross = Math.round(activeAttendanceModalRecord.salaryRate * dutySum);
    const otAmount = activeAttendanceModalRecord.overtimeAmount || 0;
    const advance = activeAttendanceModalRecord.advanceDeduction || 0;
    const bonus = activeAttendanceModalRecord.bonus || 0;
    const net = Math.max(0, gross + otAmount + bonus - advance);

    const updatedRecord: AttendanceRecord = {
      ...activeAttendanceModalRecord,
      dutyDays: dutySum,
      totalSalary: gross,
      netPayable: net,
      dailyAttendance: updatedDaily,
    };

    setActiveAttendanceModalRecord(updatedRecord);
    onSaveAttendanceRecord(updatedRecord);
  };

  // Quick mark all days in month
  const handleMarkAllDays = (status: 'P' | 'A' | 'W') => {
    if (!activeAttendanceModalRecord) return;

    const newDaily: Record<number, 'P' | 'A' | 'HD' | 'OT' | 'W'> = {};
    const [y, m] = selectedMonth.split('-').map(Number);
    let dutySum = 0;

    for (let d = 1; d <= daysInSelectedMonth; d++) {
      const dayOfWeek = new Date(y, m - 1, d).getDay(); // 0 is Sunday
      if (dayOfWeek === 0) {
        newDaily[d] = 'W'; // Sunday weekly off
        dutySum += 1;
      } else {
        newDaily[d] = status;
        if (status === 'P') dutySum += 1;
      }
    }

    const gross = Math.round(activeAttendanceModalRecord.salaryRate * dutySum);
    const net = Math.max(0, gross + (activeAttendanceModalRecord.overtimeAmount || 0) + (activeAttendanceModalRecord.bonus || 0) - (activeAttendanceModalRecord.advanceDeduction || 0));

    const updatedRecord: AttendanceRecord = {
      ...activeAttendanceModalRecord,
      dutyDays: dutySum,
      totalSalary: gross,
      netPayable: net,
      dailyAttendance: newDaily,
    };

    setActiveAttendanceModalRecord(updatedRecord);
    onSaveAttendanceRecord(updatedRecord);
  };

  // Submit Salary Payment
  const handleSubmitPayment = () => {
    if (!payingRecord) return;
    if (payAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    onRecordSalaryPayment(payingRecord.id, payAmount, payMode);
    setPayingRecord(null);
    alert(`✅ Payment of ₹${payAmount.toLocaleString('en-IN')} recorded successfully for ${payingRecord.staffName}!`);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. TOP HEADER & MONTH CONTROLS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 font-heading flex items-center gap-2">
                <span>Staff Attendance &amp; Wages Register</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  ⚡ Live Auto-Total
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Live automatic calculation of salary and net payable upon entering rate and duty days.
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Month Switcher */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="relative px-3 text-xs font-bold text-slate-900 flex items-center gap-1.5 min-w-[130px] justify-center cursor-pointer hover:bg-white/80 rounded-lg py-1 transition-colors">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{formattedMonthTitle}</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    changeSelectedMonth(e.target.value);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Click to select month"
              />
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setNewStaffEmployeeId(getNextEmployeeId());
              setNewStaffCompanyName(selectedCompany !== 'ALL' ? selectedCompany : (allAvailableCompanies[0]?.name || 'SR Group & Fabrication'));
              setNewStaffJoiningDate(`${selectedMonth}-01`);
              setIsAddStaffModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New Join Worker
          </button>

          {onClearAllAttendanceAndStaff && (staffMembers.length > 0 || monthRecords.length > 0) && (
            <button
              type="button"
              onClick={() => setIsClearAllModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              title="Clear all staff members and attendance records"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Workers
            </button>
          )}

          <button
            onClick={() => {
              if (monthlySheetPrintRef.current) {
                printElementSafely(monthlySheetPrintRef.current, `Attendance_Register_${selectedMonth}`, {
                  orientation: 'landscape',
                  pageMargin: '4mm 5mm',
                  customStyles: `
                    @page { size: A4 landscape !important; margin: 4mm 5mm !important; }
                    html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
                    .print-monthly-sheet { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 2mm !important; font-size: 10px !important; }
                    table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
                    th, td { word-break: break-word !important; }
                  `
                });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            title="Print Full A4 Landscape Register"
          >
            <Printer className="w-3.5 h-3.5" /> Print Monthly Sheet
          </button>

          <button
            onClick={() => {
              if (monthlySheetPrintRef.current) {
                downloadElementAsPdf(monthlySheetPrintRef.current, `Attendance_Register_${selectedMonth}.pdf`, {
                  orientation: 'landscape',
                  scale: 2.5
                });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            title="Download PDF as Landscape Sheet"
          >
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>

          <button
            type="button"
            onClick={() => setIsBankAdviceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            title="Bank Salary Payment Advice on Letter Pad (बैंक भुगतान पत्र PDF / प्रिंट)"
          >
            <Landmark className="w-3.5 h-3.5" /> Bank Advice (Letter Pad PDF)
          </button>
        </div>
      </div>

      {/* 1B. COMPANY & SITE ATTENDANCE FILTER / MANAGEMENT SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 font-heading flex items-center gap-2">
                <span>Company Attendance &amp; Site Tracking</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {allAvailableCompanies.length} Companies
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Company add karein aur jis company ka name dalein/chunein uski attendance details aur totals dekhein
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCompanyModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" /> 🏢 Manage Companies (Add / Edit / Delete)
            </button>
          </div>
        </div>

        {/* Company Name Input & Quick Select Dropdown */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Company Search Input */}
          <div className="md:col-span-8 relative">
            <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Type company name here to view its attendance details (e.g. Tata Projects, Suhel, SR Group)..."
              value={companySearchInput}
              onChange={(e) => {
                setCompanySearchInput(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedCompany('ALL');
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-blue-600 focus:bg-white"
            />
            {companySearchInput && (
              <button
                type="button"
                onClick={() => setCompanySearchInput('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                title="Clear company name"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Select Dropdown */}
          <div className="md:col-span-4">
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setCompanySearchInput('');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-blue-600 cursor-pointer"
            >
              <option value="ALL">🏢 All Companies ({monthRecords.length} Workers)</option>
              {allAvailableCompanies.map(c => {
                const count = monthRecords.filter(r => (r.companyName || staffMembers.find(s => s.id === r.staffId)?.companyName || '').toLowerCase() === c.name.toLowerCase()).length;
                return (
                  <option key={c.id || c.name} value={c.name}>
                    🏢 {c.name} {c.code ? `(${c.code})` : ''} — {count} Workers
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Company Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Filter:</span>
          <button
            type="button"
            onClick={() => {
              setSelectedCompany('ALL');
              setCompanySearchInput('');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              selectedCompany === 'ALL' && !companySearchInput
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Companies ({monthRecords.length})
          </button>
          {allAvailableCompanies.map((c) => {
            const isSelected = selectedCompany.toLowerCase() === c.name.toLowerCase() || (companySearchInput && c.name.toLowerCase().includes(companySearchInput.toLowerCase()));
            const count = monthRecords.filter(r => (r.companyName || staffMembers.find(s => s.id === r.staffId)?.companyName || '').toLowerCase() === c.name.toLowerCase()).length;
            return (
              <button
                type="button"
                key={c.id || c.name}
                onClick={() => {
                  setSelectedCompany(c.name);
                  setCompanySearchInput('');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-3 h-3" />
                <span>{c.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Company Banner with Quick Edit & Delete Actions */}
        {(selectedCompany !== 'ALL' || companySearchInput.trim()) && (() => {
          const activeName = selectedCompany !== 'ALL' ? selectedCompany : companySearchInput;
          const activeCompObj = allAvailableCompanies.find(
            (c) => c.name.toLowerCase() === activeName.trim().toLowerCase()
          ) || { id: `comp-${Date.now()}`, name: activeName };

          return (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <div className="font-extrabold text-blue-950 flex items-center gap-2 flex-wrap">
                    <span>Showing Attendance for: &quot;{activeName}&quot;</span>
                    {activeCompObj.code && (
                      <span className="px-1.5 py-0.2 bg-blue-900 text-white font-mono text-[9px] font-black rounded uppercase">
                        {activeCompObj.code}
                      </span>
                    )}
                  </div>
                  <span className="text-blue-700 font-medium text-[11px] block sm:inline">
                    ({filteredRecords.length} worker records • {totalDutyLogged} Days duty • Net Payable: {formatIndianCurrency(totalNetPayable)})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleStartEditCompany(activeCompObj)}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  title={`Edit ${activeName} details`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Company</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePromptDeleteCompany(activeCompObj)}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  title={`Delete ${activeName}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompany('ALL');
                    setCompanySearchInput('');
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 font-bold border border-blue-300 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Clear Filter
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 2. SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Metric 1: Total Staff */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Staff</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{monthRecords.length} Workers</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{staffMembers.length} Registered</div>
        </div>

        {/* Metric 2: Total Duty */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Duty Logged</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-900">{totalDutyLogged} Days</div>
          <div className="text-[11px] text-slate-500 mt-0.5">In {formattedMonthTitle}</div>
        </div>

        {/* Metric 3: Gross Wages */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Wages</span>
            <Calculator className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-xl font-mono font-black text-slate-900">{formatIndianCurrency(totalGrossWages)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Rate × Duty Total</div>
        </div>

        {/* Metric 4: Advance Deducted */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Advance Deductions</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-mono font-black text-amber-700">-{formatIndianCurrency(totalAdvanceDeducted)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Deducted from salary</div>
        </div>

        {/* Metric 5: Net Payable */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-4 rounded-2xl text-white shadow-md col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-blue-200 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Net Payable</span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-2xl font-mono font-black text-white">{formatIndianCurrency(totalNetPayable)}</div>
          <div className="text-[11px] text-blue-200 mt-0.5">
            Balance Due: <strong>{formatIndianCurrency(totalBalanceDue)}</strong>
          </div>
        </div>

      </div>

      {/* 3. QUICK DUTY & SALARY CALCULATOR PANEL (AS REQUESTED) */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white rounded-2xl border-2 border-blue-200 p-5 shadow-xs relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              ⚡
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-blue-950 uppercase tracking-wide">
                Instant Duty &amp; Salary Calculator
              </h2>
              <p className="text-xs text-blue-800/80">
                Select a worker, enter salary rate and duty days — total calculates instantly!
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowQuickCalculator(!showQuickCalculator)}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-white px-3 py-1 rounded-lg border border-blue-200 transition-colors"
          >
            {showQuickCalculator ? 'Minimize' : 'Open Calculator'}
          </button>
        </div>

        {showQuickCalculator && (
          <div className="space-y-4">
            
            {/* Input Row: Worker, Rate, Duty, OT (Hours), OT Rate, Advance, Save */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              
              {/* Select Worker / Staff */}
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  1. Worker / Staff Name
                </label>
                <select
                  value={calcStaffId}
                  onChange={(e) => handleSelectStaffForCalc(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-blue-600"
                >
                  <option value="custom">+ New Join Worker for {formattedMonthTitle}</option>
                  {currentMonthStaff.length > 0 && (
                    <optgroup label={`Workers in ${formattedMonthTitle} (${currentMonthStaff.length})`}>
                      {currentMonthStaff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role}) - ₹{s.defaultRate}/duty
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherMonthsStaff.length > 0 && (
                    <optgroup label={`Workers from other months (${otherMonthsStaff.length})`}>
                      {otherMonthsStaff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role}) - ₹{s.defaultRate}/duty
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {calcStaffId === 'custom' && (
                  <input
                    type="text"
                    placeholder="Enter worker name"
                    value={calcStaffName}
                    onChange={(e) => setCalcStaffName(e.target.value)}
                    className="w-full mt-1.5 bg-white border border-blue-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-blue-600"
                  />
                )}
              </div>

              {/* Amount (Salary Rate) */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-blue-950 uppercase mb-1 flex items-center justify-between">
                  <span>2. Amount (Rate ₹)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    placeholder="650"
                    value={calcSalaryRate || ''}
                    onChange={(e) => setCalcSalaryRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border-2 border-blue-400 rounded-xl pl-7 pr-3 py-2 text-sm font-black text-blue-950 focus:outline-blue-600 shadow-inner"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">per day / shift</span>
              </div>

              {/* Duty (Days/Shifts) */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-blue-950 uppercase mb-1 flex items-center justify-between">
                  <span>3. Duty (Days)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="31"
                  step="0.5"
                  placeholder="26"
                  value={calcDutyDays || ''}
                  onChange={(e) => setCalcDutyDays(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border-2 border-indigo-400 rounded-xl px-3 py-2 text-sm font-black text-indigo-950 focus:outline-blue-600 shadow-inner"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">e.g. 26 or 24.5 days</span>
              </div>

              {/* Overtime (OT Hours) */}
              <div className="lg:col-span-1">
                <label className="block text-[11px] font-bold text-amber-950 uppercase mb-1 truncate" title="Overtime Hours (OT)">
                  4. OT (Hrs)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={calcOvertimeHours || ''}
                  onChange={(e) => setCalcOvertimeHours(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border-2 border-amber-400 rounded-xl px-2 py-2 text-xs font-black text-amber-950 focus:outline-amber-600 shadow-inner text-center"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">Hours</span>
              </div>

              {/* OT Rate (₹/hr) */}
              <div className="lg:col-span-1">
                <label className="block text-[11px] font-bold text-amber-950 uppercase mb-1 truncate" title="OT Rate per hour (₹)">
                  OT Rate (₹)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    placeholder="80"
                    value={calcOvertimeRate || ''}
                    onChange={(e) => setCalcOvertimeRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border-2 border-amber-400 rounded-xl px-2 py-2 text-xs font-black text-amber-950 focus:outline-amber-600 shadow-inner text-center"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">₹/hour</span>
              </div>

              {/* Advance Deductions Taken */}
              <div className="lg:col-span-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 truncate" title="Advance Deductions (₹)">
                  Advance (₹)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="0"
                    value={calcAdvance || ''}
                    onChange={(e) => setCalcAdvance(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs font-bold text-rose-800 focus:outline-blue-600 text-center"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">Deduction</span>
              </div>

              {/* Save Button */}
              <div className="lg:col-span-2">
                <button
                  type="button"
                  onClick={handleSaveQuickRecord}
                  className="w-full h-10 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Save Record
                </button>
              </div>

            </div>

            {/* Selected Worker Info & Bank Account Chip */}
            {calcStaffId !== 'custom' && (() => {
              const activeWorker = staffMembers.find((s) => s.id === calcStaffId);
              if (!activeWorker) return null;
              return (
                <div className="bg-white/80 backdrop-blur-xs border border-blue-200/80 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700">
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      {activeWorker.name} ({activeWorker.role})
                    </span>
                    <span className="text-slate-600 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Joined: <strong className="text-slate-800">{activeWorker.joiningDate || 'N/A'}</strong>
                    </span>
                    <span className="text-slate-600 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      A/C: <strong className="font-mono text-emerald-800">{activeWorker.accountNumber || 'Bank A/C not added'}</strong>
                      {activeWorker.bankName && <span className="text-slate-500">({activeWorker.bankName})</span>}
                    </span>
                    {activeWorker.ifscCode && (
                      <span className="text-slate-600 font-mono text-[11px]">
                        IFSC: <strong className="text-slate-800">{activeWorker.ifscCode}</strong>
                      </span>
                    )}
                    {activeWorker.upiId && (
                      <span className="text-purple-700 font-mono text-[11px]">
                        UPI: <strong>{activeWorker.upiId}</strong>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEditStaffModal(activeWorker)}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" /> Edit Worker Profile
                  </button>
                </div>
              );
            })()}

            {/* LIVE AUTO-CALCULATED TOTAL DISPLAY BANNER */}
            <div className="bg-white rounded-xl border border-blue-200 p-3.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-700">Calculation Formula:</span>
                <span className="bg-slate-100 text-slate-800 font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                  Rate ₹{calcSalaryRate} × {calcDutyDays} Duty = ₹{liveGrossSalary.toLocaleString('en-IN')}
                </span>
                {liveOvertimeAmount > 0 && (
                  <>
                    <span className="text-slate-400">+</span>
                    <span className="text-amber-900 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                      OT: {calcOvertimeHours}h × ₹{calcOvertimeRate} = ₹{liveOvertimeAmount.toLocaleString('en-IN')}
                    </span>
                  </>
                )}
                {calcAdvance > 0 && (
                  <>
                    <span className="text-slate-400">-</span>
                    <span className="text-rose-700 font-mono font-bold">
                      Advance ₹{calcAdvance.toLocaleString('en-IN')}
                    </span>
                  </>
                )}
                {calcBonus > 0 && (
                  <>
                    <span className="text-slate-400">+</span>
                    <span className="text-emerald-700 font-mono font-bold">
                      Bonus ₹{calcBonus.toLocaleString('en-IN')}
                    </span>
                  </>
                )}
              </div>

              {/* Big High-Contrast Total Box */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-4 py-2 rounded-xl shadow-xs shrink-0">
                <div className="text-right">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200">
                    Net Payable
                  </div>
                  <div className="text-lg font-mono font-black tracking-tight text-white">
                    {formatIndianCurrency(liveNetPayable)}
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold">
                  ✓
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 4. MAIN ATTENDANCE & SALARY REGISTER TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Top Controls & Search */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-slate-900 font-heading">
              {formattedMonthTitle} Wage Register
            </h3>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md">
              {filteredRecords.length} Workers Listed
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-blue-600 font-medium"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-blue-600"
            >
              <option value="ALL">All Status</option>
              <option value="UNPAID">Unpaid Only</option>
              <option value="PARTIAL">Partially Paid</option>
              <option value="PAID">Fully Paid</option>
            </select>

            <button
              type="button"
              onClick={handleRefreshCurrentMonthView}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              title="Refresh this month's register"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>

            <button
              type="button"
              onClick={() => setIsBankAdviceModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              title="Bank Salary Payment Advice on Letter Pad (बैंक भुगतान पत्र PDF)"
            >
              <Landmark className="w-3 h-3" /> Bank Advice PDF
            </button>

            {otherMonthsStaff.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStaffIdsToImport([]);
                  setIsImportStaffModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                title="Pichle month se worker import karein"
              >
                <Users className="w-3 h-3" /> Import Workers ({otherMonthsStaff.length})
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              {formattedMonthTitle} ke liye koi worker / attendance data nahi hai
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Jis month me worker add karenge wo sirf usi month me rahega, dusre month me automatically add nahi hoga.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setNewStaffEmployeeId(getNextEmployeeId());
                  setNewStaffCompanyName(selectedCompany !== 'ALL' ? selectedCompany : (allAvailableCompanies[0]?.name || 'SR Group & Fabrication'));
                  setNewStaffJoiningDate(`${selectedMonth}-01`);
                  setIsAddStaffModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> + New Join Worker for {formattedMonthTitle}
              </button>
              {otherMonthsStaff.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStaffIdsToImport([]);
                    setIsImportStaffModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-slate-500" /> Pichle Month se Import Karein ({otherMonthsStaff.length})
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-2 text-center">#</th>
                  <th className="py-3 px-2 text-center">Emp ID</th>
                  <th className="py-3 px-3 min-w-[220px]">Worker &amp; Company Profile</th>
                  <th className="py-3 px-2 text-center">OT (Hrs)</th>
                  <th className="py-3 px-2 text-center">OT Rate (₹)</th>
                  <th className="py-3 px-3 text-center">Amount (Rate ₹)</th>
                  <th className="py-3 px-3 text-center">Duty (Days)</th>
                  <th className="py-3 px-3 text-right">Total Salary (₹)</th>
                  <th className="py-3 px-3 text-center">Advance</th>
                  <th className="py-3 px-3 text-right">Net Payable</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec, idx) => {
                  const staffObj = staffMembers.find((s) => s.id === rec.staffId);
                  const effectiveEmpId = rec.employeeId || staffObj?.employeeId || `EMP-${String(idx + 1).padStart(3, '0')}`;
                  const effectiveCompany = rec.companyName || staffObj?.companyName || (selectedCompany !== 'ALL' ? selectedCompany : 'SR Group & Fabrication');
                  const effectiveJoiningDate = rec.joiningDate || staffObj?.joiningDate;
                  const effectiveAccount = rec.accountNumber || staffObj?.accountNumber;
                  const effectiveBankName = rec.bankName || staffObj?.bankName;
                  const effectiveIfsc = rec.ifscCode || staffObj?.ifscCode;
                  const effectiveUpi = rec.upiId || staffObj?.upiId;
                  const effectiveAccountHolder = rec.accountHolderName || staffObj?.accountHolderName;
                  const effectiveRelation = rec.relationName || staffObj?.relationName;
                  const effectiveDocs = staffObj?.documents || rec.documents || [];

                  return (
                    <tr key={rec.id} className="hover:bg-blue-50/40 transition-colors">
                      
                      {/* Index */}
                      <td className="py-3 px-2 text-slate-400 font-mono text-center font-bold">
                        {idx + 1}
                      </td>

                      {/* Employee ID */}
                      <td className="py-3 px-2 text-center">
                        <span className="inline-block px-2 py-0.5 bg-slate-900 text-white font-mono font-black text-[11px] rounded shadow-2xs">
                          {effectiveEmpId}
                        </span>
                      </td>

                      {/* Worker Name, Company, Role, Joining Date, Bank Account */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-sm">{rec.staffName}</span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[10px] font-bold">
                            <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                            {effectiveCompany}
                          </span>
                          {staffObj && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditStaffModal(staffObj)}
                              className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors cursor-pointer"
                              title="Edit worker profile and bank details"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-700 font-semibold">{rec.role}</span>
                          {effectiveJoiningDate && (
                            <span className="text-slate-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              Joined: <strong className="text-slate-800">{effectiveJoiningDate}</strong>
                            </span>
                          )}
                          {rec.notes && <span className="italic text-slate-400 truncate max-w-[120px]">• {rec.notes}</span>}
                        </div>
                        <div className="text-[10px] mt-1 flex flex-wrap items-center gap-1.5">
                          {effectiveAccount ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono font-medium text-[10px]">
                              <CreditCard className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>A/C: {effectiveAccount}</span>
                              {effectiveBankName && ` (${effectiveBankName})`}
                              {effectiveIfsc && ` • ${effectiveIfsc}`}
                              {effectiveAccountHolder && (
                                <span className="text-emerald-950 font-sans font-bold ml-1 pl-1 border-l border-emerald-300">
                                  Holder: {effectiveAccountHolder} {effectiveRelation ? `(${effectiveRelation})` : ''}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-amber-700 text-[10px] italic">
                              Bank A/C not added
                            </span>
                          )}
                          {effectiveUpi && (
                            <span className="text-purple-700 font-mono text-[10px] bg-purple-50 px-1 py-0.5 rounded border border-purple-200">
                              UPI: {effectiveUpi}
                            </span>
                          )}
                          {/* Uploaded Documents Badge / Button */}
                          {effectiveDocs.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                const targetStaff = staffObj || {
                                  id: rec.staffId,
                                  name: rec.staffName,
                                  role: rec.role,
                                  phone: '',
                                  defaultRate: rec.salaryRate,
                                  rateType: 'PER_DAY',
                                  accountHolderName: effectiveAccountHolder,
                                  relationName: effectiveRelation,
                                  accountNumber: effectiveAccount,
                                  bankName: effectiveBankName,
                                  ifscCode: effectiveIfsc,
                                  documents: effectiveDocs,
                                };
                                setViewingWorkerDocsStaff(targetStaff);
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                              title="Click to view KYC documents"
                            >
                              <FolderOpen className="w-3 h-3 text-indigo-600" />
                              <span>{effectiveDocs.length} KYC Doc{effectiveDocs.length > 1 ? 's' : ''}</span>
                            </button>
                          ) : staffObj ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEditStaffModal(staffObj)}
                              className="inline-flex items-center gap-1 text-[9.5px] text-slate-400 hover:text-blue-600 cursor-pointer"
                              title="Upload KYC documents for this worker"
                            >
                              <Upload className="w-2.5 h-2.5" /> +KYC Docs
                            </button>
                          ) : null}
                        </div>
                      </td>

                      {/* INLINE EDITABLE: Overtime (OT Hours) */}
                      <td className="py-3 px-2 text-center">
                        <div className="inline-flex items-center">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={rec.overtimeHours || 0}
                            onChange={(e) => handleInlineUpdate(rec, 'overtimeHours', parseFloat(e.target.value) || 0)}
                            className="w-16 px-1.5 py-1 text-center font-mono font-bold text-amber-950 border border-amber-300 rounded-lg bg-white focus:outline-amber-600 focus:border-amber-600 shadow-inner"
                            title="Overtime hours"
                          />
                        </div>
                      </td>

                      {/* INLINE EDITABLE: Overtime Rate (OT Rate ₹) */}
                      <td className="py-3 px-2 text-center">
                        <div className="inline-flex items-center relative">
                          <span className="absolute left-1.5 text-[9px] text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={rec.overtimeRate || 0}
                            onChange={(e) => handleInlineUpdate(rec, 'overtimeRate', parseFloat(e.target.value) || 0)}
                            className="w-18 pl-4 pr-1 py-1 text-center font-mono font-bold text-amber-950 border border-amber-300 rounded-lg bg-white focus:outline-amber-600 focus:border-amber-600 shadow-inner"
                            title="Overtime rate per hour (₹)"
                          />
                        </div>
                      </td>

                      {/* INLINE EDITABLE: Salary Rate (Amount) */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center relative">
                          <span className="absolute left-2 text-[10px] text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={rec.salaryRate}
                            onChange={(e) => handleInlineUpdate(rec, 'salaryRate', parseFloat(e.target.value) || 0)}
                            className="w-20 pl-5 pr-1.5 py-1 text-center font-mono font-bold text-slate-900 border border-slate-300 rounded-lg bg-white focus:outline-blue-600 focus:border-blue-600 shadow-inner"
                            title="Changing rate automatically recalculates total"
                          />
                        </div>
                      </td>

                      {/* INLINE EDITABLE: Duty (Days) */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="31"
                            step="0.5"
                            value={rec.dutyDays}
                            onChange={(e) => handleInlineUpdate(rec, 'dutyDays', parseFloat(e.target.value) || 0)}
                            className="w-16 px-1.5 py-1 text-center font-mono font-black text-indigo-900 border border-indigo-300 rounded-lg bg-white focus:outline-indigo-600 focus:border-indigo-600 shadow-inner"
                            title="Changing duty automatically recalculates total"
                          />
                          <button
                            onClick={() => setActiveAttendanceModalRecord(rec)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Open day-by-day (1-31) attendance register"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* TOTAL SALARY / WAGES (LIVE AUTO-CALCULATED: Rate x Duty + OT) */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-black text-slate-950 text-sm">
                          {formatIndianCurrency((rec.totalSalary || 0) + (rec.overtimeAmount || 0))}
                        </div>
                        <div className="text-[9.5px] text-slate-400 font-mono">
                          ₹{rec.salaryRate} × {rec.dutyDays}
                          {(rec.overtimeAmount || 0) > 0 && (
                            <span className="text-amber-700 font-bold block">
                              + OT ₹{rec.overtimeAmount} ({rec.overtimeHours}h @ ₹{rec.overtimeRate})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* INLINE EDITABLE: Advance Deducted */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center relative">
                          <span className="absolute left-2 text-[10px] text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={rec.advanceDeduction || 0}
                            onChange={(e) => handleInlineUpdate(rec, 'advanceDeduction', parseFloat(e.target.value) || 0)}
                            className="w-18 pl-5 pr-1.5 py-1 text-center font-mono font-bold text-rose-800 border border-slate-300 rounded-lg bg-white focus:outline-blue-600 shadow-inner"
                            title="Advance deduction"
                          />
                        </div>
                      </td>

                      {/* NET PAYABLE */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-black text-emerald-800 text-sm">
                          {formatIndianCurrency(rec.netPayable)}
                        </div>
                        {rec.paidAmount && rec.paidAmount > 0 ? (
                          <div className="text-[9.5px] text-slate-500 font-mono">
                            Paid: {formatIndianCurrency(rec.paidAmount)}
                          </div>
                        ) : null}
                      </td>

                      {/* PAYMENT STATUS */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wide ${
                          rec.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : rec.paymentStatus === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {rec.paymentStatus}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Pay Salary Button */}
                          <button
                            onClick={() => {
                              setPayingRecord(rec);
                              const remaining = Math.max(0, rec.netPayable - (rec.paidAmount || 0));
                              setPayAmount(remaining > 0 ? remaining : rec.netPayable);
                            }}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors"
                            title="Record salary payment"
                          >
                            Pay ₹
                          </button>

                          {/* Worker KYC Documents */}
                          {(effectiveDocs.length > 0 || staffObj) && (
                            <button
                              type="button"
                              onClick={() => {
                                const targetStaff = staffObj || {
                                  id: rec.staffId,
                                  name: rec.staffName,
                                  role: rec.role,
                                  phone: '',
                                  defaultRate: rec.salaryRate,
                                  rateType: 'PER_DAY',
                                  accountHolderName: effectiveAccountHolder,
                                  relationName: effectiveRelation,
                                  accountNumber: effectiveAccount,
                                  bankName: effectiveBankName,
                                  ifscCode: effectiveIfsc,
                                  documents: effectiveDocs,
                                };
                                setViewingWorkerDocsStaff(targetStaff);
                              }}
                              className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title={`View KYC documents (${effectiveDocs.length} uploaded)`}
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit Staff Profile & Bank A/C */}
                          {staffObj && (
                            <button
                              onClick={() => handleOpenEditStaffModal(staffObj)}
                              className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit worker details and bank account"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Print Salary Slip */}
                          <button
                            onClick={() => setViewingSalarySlip(rec)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Print salary slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Row */}
                          <button
                            type="button"
                            onClick={() => {
                              setRecordToDelete(rec);
                              setDeleteWorkerToo(false);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* 5. MODAL: DAY-BY-DAY (1 TO 31) ATTENDANCE REGISTER */}
      {activeAttendanceModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 my-8">
            
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 font-heading">
                  Daily Attendance: {activeAttendanceModalRecord.staffName}
                </h3>
                <p className="text-xs text-slate-500">
                  {formattedMonthTitle} • {activeAttendanceModalRecord.role} • Rate: ₹{activeAttendanceModalRecord.salaryRate}/duty
                </p>
              </div>
              <button
                onClick={() => setActiveAttendanceModalRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Quick Mark:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleMarkAllDays('P')}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Mark All Present (P)
                </button>
                <button
                  onClick={() => handleMarkAllDays('W')}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Mark Weekly Off (W)
                </button>
              </div>
            </div>

            {/* 31-Day Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="font-extrabold text-[11px] text-slate-400 uppercase py-1">
                  {d}
                </div>
              ))}

              {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((day) => {
                const [y, m] = selectedMonth.split('-').map(Number);
                const dayDate = new Date(y, m - 1, day);
                const isSunday = dayDate.getDay() === 0;
                const status = activeAttendanceModalRecord.dailyAttendance?.[day] || (isSunday ? 'W' : 'P');

                let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                if (status === 'P') badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black';
                if (status === 'HD') badgeColor = 'bg-amber-100 text-amber-900 border-amber-300 font-black';
                if (status === 'A') badgeColor = 'bg-rose-100 text-rose-900 border-rose-300 font-black';
                if (status === 'W') badgeColor = 'bg-blue-100 text-blue-900 border-blue-300 font-bold';
                if (status === 'OT') badgeColor = 'bg-purple-100 text-purple-900 border-purple-300 font-black';

                return (
                  <button
                    key={day}
                    onClick={() => handleToggleDayAttendance(day, status)}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all hover:scale-105 ${badgeColor}`}
                    title={`Day ${day}: Click to cycle (P -> HD -> A -> W -> OT)`}
                  >
                    <span className="text-[10px] text-slate-500 font-mono leading-none">{day}</span>
                    <span className="text-xs mt-0.5">{status}</span>
                  </button>
                );
              })}
            </div>

            {/* Legend & Real-time Sum */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold">
                <span className="text-emerald-700 font-black">P: 1</span>
                <span>•</span>
                <span className="text-amber-700 font-black">HD: 0.5</span>
                <span>•</span>
                <span className="text-rose-700 font-black">A: 0</span>
                <span>•</span>
                <span className="text-blue-700 font-black">W: 1</span>
                <span>•</span>
                <span className="text-purple-700 font-black">OT: 1.5</span>
              </div>

              <div className="bg-blue-900 text-white px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
                <span>Total Duty: <strong>{activeAttendanceModalRecord.dutyDays}</strong></span>
                <span>•</span>
                <span>Total: <strong>₹{activeAttendanceModalRecord.totalSalary.toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveAttendanceModalRecord(null)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all"
              >
                Done (Save &amp; Close)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. MODAL: RECORD SALARY PAYMENT */}
      {payingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 font-heading">
                  Record Salary Payment
                </h3>
                <p className="text-xs text-slate-500">
                  {payingRecord.staffName} ({payingRecord.role}) • {formattedMonthTitle}
                </p>
              </div>
              <button
                onClick={() => setPayingRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Net Salary:</span>
                <strong className="font-mono text-slate-900">{formatIndianCurrency(payingRecord.netPayable)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Already Paid:</span>
                <strong className="font-mono text-emerald-700">{formatIndianCurrency(payingRecord.paidAmount || 0)}</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-blue-950">
                <span>Remaining Due:</span>
                <span className="font-mono">
                  {formatIndianCurrency(Math.max(0, payingRecord.netPayable - (payingRecord.paidAmount || 0)))}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Amount Being Paid (₹)
              </label>
              <input
                type="number"
                min="1"
                value={payAmount || ''}
                onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border-2 border-emerald-400 rounded-xl px-3 py-2 font-mono font-black text-slate-900 text-sm focus:outline-emerald-600"
              />
            </div>

            {/* Bank / UPI Transfer Details for Staff */}
            {(() => {
              const payWorker = staffMembers.find((s) => s.id === payingRecord.staffId);
              const payAccount = payingRecord.accountNumber || payWorker?.accountNumber;
              const payBankName = payingRecord.bankName || payWorker?.bankName;
              const payIfsc = payingRecord.ifscCode || payWorker?.ifscCode;
              const payUpi = payingRecord.upiId || payWorker?.upiId;

              if (!payAccount && !payUpi) return null;

              return (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs space-y-2">
                  <div className="font-extrabold text-blue-950 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                      Worker Bank / Payment Details
                    </span>
                    <span className="text-[10px] text-blue-700 font-semibold">NEFT / RTGS / UPI</span>
                  </div>

                  {payAccount && (
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-blue-150">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">BANK A/C NO:</span>
                        <span className="font-mono font-black text-slate-900 text-xs">
                          {payAccount} {payBankName && `(${payBankName})`}
                        </span>
                        {payIfsc && <span className="text-[10px] text-slate-500 font-mono ml-2">IFSC: {payIfsc}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(payAccount);
                          alert(`A/C Number "${payAccount}" copied to clipboard!`);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-100 text-blue-800 font-bold text-[10px] rounded transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  )}

                  {payUpi && (
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-purple-150">
                      <div>
                        <span className="text-[10px] text-purple-700 font-bold block">UPI ID (PhonePe/GPay):</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">{payUpi}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(payUpi);
                          alert(`UPI ID "${payUpi}" copied to clipboard!`);
                        }}
                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-[10px] rounded transition-colors"
                      >
                        Copy UPI
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Payment Mode
              </label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-blue-600"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="NEFT_RTGS">Bank Transfer (NEFT / RTGS)</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayingRecord(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitPayment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
              >
                Confirm Payment
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. MODAL: ADD NEW STAFF MEMBER */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8">
            
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 font-heading flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  New Join Worker (नया कामगार जोड़ें)
                </h3>
                <p className="text-xs text-slate-500">
                  Target Month: <strong className="text-blue-700 font-bold">{formattedMonthTitle}</strong> (Ye worker sirf {formattedMonthTitle} me save hoga)
                </p>
              </div>
              <button
                onClick={() => setIsAddStaffModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              
              {/* Employee ID & Company Assignment Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-blue-600" />
                      Employee ID (Emp ID) *
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewStaffEmployeeId(getNextEmployeeId())}
                      className="text-[10px] text-blue-700 font-bold hover:underline cursor-pointer"
                    >
                      Auto-ID
                    </button>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EMP-001"
                    value={newStaffEmployeeId}
                    onChange={(e) => setNewStaffEmployeeId(e.target.value)}
                    className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-950 focus:outline-blue-600 shadow-2xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Unique ID for attendance, salary, & slips</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      Company / Site *
                    </span>
                    <span className="text-[10px] text-slate-500">Pick or type</span>
                  </label>
                  <select
                    value={allAvailableCompanies.some(c => c.name.toLowerCase() === newStaffCompanyName.toLowerCase()) ? newStaffCompanyName : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        setNewStaffCompanyName(e.target.value);
                      }
                    }}
                    className="w-full bg-white border border-blue-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-blue-600 mb-1"
                  >
                    {allAvailableCompanies.map((c) => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name} {c.code ? `(${c.code})` : ''}
                      </option>
                    ))}
                    <option value="custom">+ Enter Custom Company Name...</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Company or Site name"
                    value={newStaffCompanyName}
                    onChange={(e) => setNewStaffCompanyName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Worker / Staff Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mohd. Aslam"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Role / Designation
                  </label>
                  <input
                    type="text"
                    placeholder="Fabricator, Welder, Helper, Operator..."
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Default Salary Rate (₹ per Duty) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="700"
                    value={newStaffDefaultRate || ''}
                    onChange={(e) => setNewStaffDefaultRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border-2 border-blue-400 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={newStaffJoiningDate}
                    onChange={(e) => setNewStaffJoiningDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:outline-blue-600"
                />
              </div>

              {/* Bank Account Details Section */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold text-blue-950 uppercase flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    Bank Account &amp; Account Holder Details (बैंक खाता एवं खाता धारक)
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium">For Direct Wage Transfer</span>
                </div>

                <div className="space-y-2.5">
                  {/* Account Holder Name & Relation Name Row */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>Account Holder Name (खाता धारक का नाम)</span>
                          {newStaffName.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewStaffAccountHolderName(newStaffName.trim());
                                if (!newStaffRelationName) setNewStaffRelationName('Self');
                              }}
                              className="text-[10px] text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
                              title="Use worker full name as account holder"
                            >
                              Same as Worker
                            </button>
                          )}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Ramesh Kumar / Relative Name"
                          value={newStaffAccountHolderName}
                          onChange={(e) => setNewStaffAccountHolderName(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-blue-600"
                        />
                        <p className="text-[9.5px] text-slate-500 mt-0.5">Person name whose bank account is given</p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Relation Name (संबंध / रिश्तेदार का नाम)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={['Self', 'Father', 'Mother', 'Spouse / Wife', 'Brother', 'Son', 'Guardian'].includes(newStaffRelationName) ? newStaffRelationName : (newStaffRelationName ? 'Other' : 'Self')}
                            onChange={(e) => {
                              if (e.target.value !== 'Other') {
                                setNewStaffRelationName(e.target.value);
                              } else {
                                setNewStaffRelationName('');
                              }
                            }}
                            className="bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-blue-600"
                          >
                            <option value="Self">Self (खुद का)</option>
                            <option value="Father">Father (पिता)</option>
                            <option value="Mother">Mother (माता)</option>
                            <option value="Spouse / Wife">Spouse / Wife (पत्नी/पति)</option>
                            <option value="Brother">Brother (भाई)</option>
                            <option value="Son">Son (पुत्र)</option>
                            <option value="Guardian">Guardian (अभिभावक)</option>
                            <option value="Other">Other (अन्य)</option>
                          </select>
                          <input
                            type="text"
                            placeholder="e.g. Self, Father: Ram..."
                            value={newStaffRelationName}
                            onChange={(e) => setNewStaffRelationName(e.target.value)}
                            className="flex-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-blue-600"
                          />
                        </div>
                        <p className="text-[9.5px] text-slate-500 mt-0.5">Relation with worker if account belongs to family</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 50100421892341"
                        value={newStaffAccountNumber}
                        onChange={(e) => setNewStaffAccountNumber(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs font-bold text-emerald-950 focus:outline-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="State Bank of India, HDFC, PNB..."
                        value={newStaffBankName}
                        onChange={(e) => setNewStaffBankName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        placeholder="SBIN0001234"
                        value={newStaffIfscCode}
                        onChange={(e) => setNewStaffIfscCode(e.target.value.toUpperCase())}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs font-bold uppercase text-slate-900 focus:outline-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        UPI ID (PhonePe / GPay)
                      </label>
                      <input
                        type="text"
                        placeholder="workername@okaxis / 9876543210@paytm"
                        value={newStaffUpiId}
                        onChange={(e) => setNewStaffUpiId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs text-purple-900 focus:outline-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* KYC Document Upload Section */}
              <WorkerDocumentUploadSection
                documents={newStaffDocuments}
                onChange={setNewStaffDocuments}
                onPreview={setPreviewingDoc}
              />

            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddStaffModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newStaffName.trim()) {
                    alert('Please enter worker name');
                    return;
                  }
                  const staffId = `staff-${Date.now()}`;
                  const empId = newStaffEmployeeId.trim() || getNextEmployeeId();
                  const compName = newStaffCompanyName.trim() || (selectedCompany !== 'ALL' ? selectedCompany : undefined);
                  const joining = newStaffJoiningDate || `${selectedMonth}-01`;
                  const rate = Number(newStaffDefaultRate) || 600;

                  onAddStaffMember({
                    id: staffId,
                    employeeId: empId,
                    companyName: compName,
                    name: newStaffName.trim(),
                    role: newStaffRole.trim() || 'Worker',
                    phone: newStaffPhone.trim(),
                    defaultRate: rate,
                    rateType: 'PER_DAY',
                    joiningDate: joining,
                    accountHolderName: newStaffAccountHolderName.trim() || undefined,
                    relationName: newStaffRelationName.trim() || undefined,
                    accountNumber: newStaffAccountNumber.trim() || undefined,
                    bankName: newStaffBankName.trim() || undefined,
                    ifscCode: newStaffIfscCode.trim().toUpperCase() || undefined,
                    upiId: newStaffUpiId.trim() || undefined,
                    documents: newStaffDocuments.length > 0 ? newStaffDocuments : undefined,
                    month: selectedMonth,
                    createdMonth: selectedMonth,
                    status: 'ACTIVE',
                  });

                  // Add attendance record for this month so worker appears right away in this month only
                  const defaultDuty = 26;
                  const gross = rate * defaultDuty;
                  const newRec: AttendanceRecord = {
                    id: `att-${staffId}-${selectedMonth}`,
                    staffId: staffId,
                    staffName: newStaffName.trim(),
                    employeeId: empId,
                    companyName: compName,
                    role: newStaffRole.trim() || 'Worker',
                    month: selectedMonth,
                    dutyDate: `${selectedMonth}-01`,
                    joiningDate: joining,
                    accountHolderName: newStaffAccountHolderName.trim() || undefined,
                    relationName: newStaffRelationName.trim() || undefined,
                    accountNumber: newStaffAccountNumber.trim() || undefined,
                    bankName: newStaffBankName.trim() || undefined,
                    ifscCode: newStaffIfscCode.trim().toUpperCase() || undefined,
                    upiId: newStaffUpiId.trim() || undefined,
                    salaryRate: rate,
                    dutyDays: defaultDuty,
                    totalSalary: gross,
                    overtimeHours: 0,
                    overtimeRate: Math.round(rate / 8) || 75,
                    overtimeAmount: 0,
                    advanceDeduction: 0,
                    bonus: 0,
                    netPayable: gross,
                    paymentStatus: 'UNPAID',
                    paidAmount: 0,
                    dailyAttendance: {},
                  };
                  onSaveAttendanceRecord(newRec);

                  setNewStaffEmployeeId('');
                  setNewStaffCompanyName('');
                  setNewStaffName('');
                  setNewStaffRole('Fabricator');
                  setNewStaffPhone('');
                  setNewStaffDefaultRate(600);
                  setNewStaffJoiningDate(new Date().toISOString().split('T')[0]);
                  setNewStaffAccountHolderName('');
                  setNewStaffRelationName('Self');
                  setNewStaffAccountNumber('');
                  setNewStaffBankName('');
                  setNewStaffIfscCode('');
                  setNewStaffUpiId('');
                  setNewStaffDocuments([]);
                  setIsAddStaffModalOpen(false);
                  alert(`✅ Worker "${newStaffName.trim()}" successfully added to ${formattedMonthTitle}! Ye worker sirf ${formattedMonthTitle} me rahega.`);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
              >
                Save Worker
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7B. MODAL: EDIT STAFF MEMBER PROFILE & BANK DETAILS */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8">
            
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 font-heading flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  Edit Worker Profile &amp; KYC (प्रोफ़ाइल और दस्तावेज बदलें)
                </h3>
                <p className="text-xs text-slate-500">
                  Update profile, KYC documents, account holder name, relation, and bank details for {editingStaff.name}
                </p>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[72vh] overflow-y-auto pr-1">
              
              {/* Employee ID & Company Assignment Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-blue-600" />
                      Employee ID (Emp ID)
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditStaffEmployeeId(getNextEmployeeId())}
                      className="text-[10px] text-blue-700 font-bold hover:underline cursor-pointer"
                    >
                      Regenerate
                    </button>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EMP-001"
                    value={editStaffEmployeeId}
                    onChange={(e) => setEditStaffEmployeeId(e.target.value)}
                    className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-950 focus:outline-blue-600 shadow-2xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Worker's permanent identifier</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      Company / Site
                    </span>
                    <span className="text-[10px] text-slate-500">Pick or type</span>
                  </label>
                  <select
                    value={allAvailableCompanies.some(c => c.name.toLowerCase() === editStaffCompanyName.toLowerCase()) ? editStaffCompanyName : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        setEditStaffCompanyName(e.target.value);
                      }
                    }}
                    className="w-full bg-white border border-blue-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-blue-600 mb-1"
                  >
                    {allAvailableCompanies.map((c) => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name} {c.code ? `(${c.code})` : ''}
                      </option>
                    ))}
                    <option value="custom">+ Enter Custom Company Name...</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Company or Site name"
                    value={editStaffCompanyName}
                    onChange={(e) => setEditStaffCompanyName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Worker / Staff Name *
                  </label>
                  <input
                    type="text"
                    value={editStaffName}
                    onChange={(e) => setEditStaffName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Role / Designation
                  </label>
                  <input
                    type="text"
                    value={editStaffRole}
                    onChange={(e) => setEditStaffRole(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Default Salary Rate (₹ per Duty) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={editStaffDefaultRate || ''}
                    onChange={(e) => setEditStaffDefaultRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border-2 border-blue-400 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={editStaffJoiningDate}
                    onChange={(e) => setEditStaffJoiningDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={editStaffPhone}
                  onChange={(e) => setEditStaffPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:outline-blue-600"
                />
              </div>

              {/* Bank Account Details Section */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold text-blue-950 uppercase flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    Bank Account &amp; Account Holder Details (बैंक खाता एवं खाता धारक)
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium">For Direct Wage Transfer</span>
                </div>

                <div className="space-y-2.5">
                  {/* Account Holder Name & Relation Name Row */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>Account Holder Name (खाता धारक का नाम)</span>
                          {editStaffName.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditStaffAccountHolderName(editStaffName.trim());
                                if (!editStaffRelationName) setEditStaffRelationName('Self');
                              }}
                              className="text-[10px] text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
                              title="Use worker full name as account holder"
                            >
                              Same as Worker
                            </button>
                          )}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Ramesh Kumar / Relative Name"
                          value={editStaffAccountHolderName}
                          onChange={(e) => setEditStaffAccountHolderName(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-blue-600"
                        />
                        <p className="text-[9.5px] text-slate-500 mt-0.5">Person name whose bank account is given</p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Relation Name (संबंध / रिश्तेदार का नाम)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={['Self', 'Father', 'Mother', 'Spouse / Wife', 'Brother', 'Son', 'Guardian'].includes(editStaffRelationName) ? editStaffRelationName : (editStaffRelationName ? 'Other' : 'Self')}
                            onChange={(e) => {
                              if (e.target.value !== 'Other') {
                                setEditStaffRelationName(e.target.value);
                              } else {
                                setEditStaffRelationName('');
                              }
                            }}
                            className="bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-blue-600"
                          >
                            <option value="Self">Self (खुद का)</option>
                            <option value="Father">Father (पिता)</option>
                            <option value="Mother">Mother (माता)</option>
                            <option value="Spouse / Wife">Spouse / Wife (पत्नी/पति)</option>
                            <option value="Brother">Brother (भाई)</option>
                            <option value="Son">Son (पुत्र)</option>
                            <option value="Guardian">Guardian (अभिभावक)</option>
                            <option value="Other">Other (अन्य)</option>
                          </select>
                          <input
                            type="text"
                            placeholder="e.g. Self, Father: Ram..."
                            value={editStaffRelationName}
                            onChange={(e) => setEditStaffRelationName(e.target.value)}
                            className="flex-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-blue-600"
                          />
                        </div>
                        <p className="text-[9.5px] text-slate-500 mt-0.5">Relation with worker if account belongs to family</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 50100421892341"
                        value={editStaffAccountNumber}
                        onChange={(e) => setEditStaffAccountNumber(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs font-bold text-emerald-950 focus:outline-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="State Bank of India, HDFC..."
                        value={editStaffBankName}
                        onChange={(e) => setEditStaffBankName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        placeholder="SBIN0001234"
                        value={editStaffIfscCode}
                        onChange={(e) => setEditStaffIfscCode(e.target.value.toUpperCase())}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs font-bold uppercase text-slate-900 focus:outline-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        UPI ID (PhonePe / GPay)
                      </label>
                      <input
                        type="text"
                        placeholder="workername@okaxis"
                        value={editStaffUpiId}
                        onChange={(e) => setEditStaffUpiId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs text-purple-900 focus:outline-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* KYC Document Upload Section */}
              <WorkerDocumentUploadSection
                documents={editStaffDocuments}
                onChange={setEditStaffDocuments}
                onPreview={setPreviewingDoc}
              />

            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setStaffToDelete(editingStaff);
                  setEditingStaff(null);
                }}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Permanently remove worker from staff list"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Worker
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditStaff}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
                >
                  Update Worker
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 8. MODAL: SALARY SLIP PRINT & DOWNLOAD */}
      {viewingSalarySlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-900 font-heading">
                  Worker Salary Slip
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (salarySlipPrintRef.current) {
                      printElementSafely(salarySlipPrintRef.current, `Salary_Slip_${viewingSalarySlip.staffName}_${selectedMonth}`);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={async () => {
                    if (salarySlipPrintRef.current) {
                      await downloadElementAsPdf(salarySlipPrintRef.current, `Salary_Slip_${viewingSalarySlip.staffName}_${selectedMonth}.pdf`);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  onClick={() => setViewingSalarySlip(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Slip Container */}
            <div 
              ref={salarySlipPrintRef}
              className="p-6 bg-white border-2 border-slate-800 text-slate-900 text-xs font-sans space-y-4 rounded-xl"
            >
              {/* Slip Header */}
              <div className="text-center border-b-2 border-slate-800 pb-3">
                <h2 className="text-base font-black uppercase tracking-wider text-slate-950">
                  {businessProfile.name || 'SR GROUP'}
                </h2>
                <div className="text-[10px] text-slate-600">
                  {businessProfile.address}, {businessProfile.city} {businessProfile.pincode}
                </div>
                {businessProfile.gstin && (
                  <div className="text-[10px] font-mono font-bold text-slate-800 mt-0.5">
                    GSTIN: {businessProfile.gstin}
                  </div>
                )}
                <div className="inline-block mt-2 px-3 py-0.5 bg-slate-900 text-white font-extrabold text-[10px] uppercase tracking-widest rounded">
                  SALARY SLIP / WAGE VOUCHER ({formattedMonthTitle.toUpperCase()})
                </div>
              </div>

              {/* Worker & Meta Details Grid */}
              {(() => {
                const slipStaff = staffMembers.find((s) => s.id === viewingSalarySlip.staffId);
                const slipEmpId = viewingSalarySlip.employeeId || slipStaff?.employeeId || 'EMP-001';
                const slipCompany = viewingSalarySlip.companyName || slipStaff?.companyName || (selectedCompany !== 'ALL' ? selectedCompany : 'SR Group & Fabrication');
                const slipJoining = viewingSalarySlip.joiningDate || slipStaff?.joiningDate;
                const slipDutyDate = viewingSalarySlip.dutyDate || `${selectedMonth}-01`;
                const slipAccount = viewingSalarySlip.accountNumber || slipStaff?.accountNumber;
                const slipBankName = viewingSalarySlip.bankName || slipStaff?.bankName;
                const slipIfsc = viewingSalarySlip.ifscCode || slipStaff?.ifscCode;
                const slipUpi = viewingSalarySlip.upiId || slipStaff?.upiId;
                const slipAccountHolder = viewingSalarySlip.accountHolderName || slipStaff?.accountHolderName;
                const slipRelation = viewingSalarySlip.relationName || slipStaff?.relationName;
                const slipDocs = slipStaff?.documents || viewingSalarySlip.documents || [];

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs border border-slate-300 p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="text-slate-500 font-bold block text-[10px]">EMPLOYEE ID:</span>
                      <span className="font-mono font-black text-blue-900 text-xs bg-blue-100 px-1.5 py-0.5 rounded inline-block border border-blue-200">
                        {slipEmpId}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-[10px]">COMPANY / SITE:</span>
                      <span className="font-extrabold text-slate-900 text-xs truncate block" title={slipCompany}>
                        {slipCompany}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-[10px]">EMPLOYEE NAME:</span>
                      <span className="font-extrabold text-slate-950 text-sm">{viewingSalarySlip.staffName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-[10px]">DESIGNATION / ROLE:</span>
                      <span className="font-bold text-slate-900">{viewingSalarySlip.role}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-[10px]">DATE OF JOINING:</span>
                      <span className="font-mono font-bold text-slate-900">{slipJoining || 'Not recorded'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-[10px]">OVERTIME (OT):</span>
                      <span className="font-mono font-bold text-amber-900">
                        {viewingSalarySlip.overtimeHours ? `${viewingSalarySlip.overtimeHours} hrs (@ ₹${viewingSalarySlip.overtimeRate || 0}/hr)` : '0 hrs'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-[10px]">BANK A/C NUMBER:</span>
                      <span className="font-mono font-black text-emerald-900">{slipAccount || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-[10px]">BANK &amp; IFSC:</span>
                      <span className="font-mono text-slate-900">
                        {slipBankName || 'Bank'} {slipIfsc ? `(${slipIfsc})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-[10px]">A/C HOLDER &amp; RELATION:</span>
                      <span className="font-bold text-slate-900">
                        {slipAccountHolder || viewingSalarySlip.staffName} {slipRelation ? `(${slipRelation})` : '(Self)'}
                      </span>
                    </div>
                    {slipUpi && (
                      <div>
                        <span className="text-slate-500 font-bold block text-[10px]">UPI ID:</span>
                        <span className="font-mono font-bold text-purple-900">{slipUpi}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500 font-bold block text-[10px]">WAGE MONTH:</span>
                      <span className="font-bold text-slate-900">{formattedMonthTitle}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-[10px]">KYC STATUS:</span>
                      <span className="font-bold text-slate-900">
                        {slipDocs.length > 0 ? `✓ ${slipDocs.length} Docs Uploaded` : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Calculations Table */}
              <table className="w-full border border-slate-800 border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-800 font-bold text-[10px] uppercase">
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-center">Rate / Units</th>
                    <th className="p-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr>
                    <td className="p-2 font-bold text-slate-900">Basic Wage / Duty Salary</td>
                    <td className="p-2 text-center font-mono">₹{viewingSalarySlip.salaryRate} × {viewingSalarySlip.dutyDays} Days</td>
                    <td className="p-2 text-right font-mono font-bold">{formatIndianCurrency(viewingSalarySlip.totalSalary)}</td>
                  </tr>
                  {viewingSalarySlip.overtimeAmount ? (
                    <tr>
                      <td className="p-2 text-slate-800">Overtime Pay</td>
                      <td className="p-2 text-center font-mono">{viewingSalarySlip.overtimeHours} hrs @ ₹{viewingSalarySlip.overtimeRate}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatIndianCurrency(viewingSalarySlip.overtimeAmount)}</td>
                    </tr>
                  ) : null}
                  {viewingSalarySlip.bonus ? (
                    <tr>
                      <td className="p-2 text-slate-800">Incentive / Bonus</td>
                      <td className="p-2 text-center font-mono">-</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-800">+{formatIndianCurrency(viewingSalarySlip.bonus)}</td>
                    </tr>
                  ) : null}
                  {viewingSalarySlip.advanceDeduction ? (
                    <tr className="bg-rose-50/50">
                      <td className="p-2 text-rose-900 font-bold">Less: Advance Deductions</td>
                      <td className="p-2 text-center font-mono text-rose-800">Deduction</td>
                      <td className="p-2 text-right font-mono font-bold text-rose-800">-{formatIndianCurrency(viewingSalarySlip.advanceDeduction)}</td>
                    </tr>
                  ) : null}
                  <tr className="bg-slate-100 font-black text-sm border-t-2 border-slate-800">
                    <td colSpan={2} className="p-2.5 uppercase tracking-wide">Net Salary Payable</td>
                    <td className="p-2.5 text-right font-mono">{formatIndianCurrency(viewingSalarySlip.netPayable)}</td>
                  </tr>
                </tbody>
              </table>

              {/* In Words */}
              <div className="text-[10.5px] p-2 bg-slate-50 border border-slate-200 rounded italic text-slate-700">
                <strong>Amount in Words: </strong>
                {numberToIndianWords(viewingSalarySlip.netPayable)}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 pt-8 gap-6 text-center text-xs">
                <div>
                  <div className="border-t border-slate-700 pt-1 font-bold text-slate-800">
                    Employee / Worker Signature
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-700 pt-1 font-bold text-slate-800">
                    Authorized Signatory ({businessProfile.name || 'Employer'})
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 9. MODAL: DELETE ATTENDANCE RECORD CONFIRMATION (IN-APP) */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-lg text-slate-900 font-heading">
                  Delete Record?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Remove this record from attendance &amp; wages register
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRecordToDelete(null);
                  setDeleteWorkerToo(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Record Summary Card */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Worker Name:</span>
                <span className="font-black text-slate-900 text-sm">{recordToDelete.staffName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Role:</span>
                <span className="font-semibold text-slate-800">{recordToDelete.role || 'Worker'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Overtime (OT):</span>
                <span className="font-mono font-bold text-amber-900">
                  {recordToDelete.overtimeHours ? `${recordToDelete.overtimeHours} hrs (@ ₹${recordToDelete.overtimeRate || 0}/hr)` : '0 hrs'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Duty Logged:</span>
                <span className="font-mono font-bold text-slate-900">{recordToDelete.dutyDays} Days (Rate: ₹{recordToDelete.salaryRate})</span>
              </div>
              <div className="flex items-center justify-between border-t border-rose-200/80 pt-1.5">
                <span className="text-slate-700 font-bold">Net Payable:</span>
                <span className="font-mono font-black text-rose-700 text-sm">
                  {formatIndianCurrency(recordToDelete.netPayable)}
                </span>
              </div>
            </div>

            {/* Checkbox option to delete worker permanently from staff list as well */}
            {recordToDelete.staffId && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors select-none">
                <input
                  type="checkbox"
                  checked={deleteWorkerToo}
                  onChange={(e) => setDeleteWorkerToo(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">
                    Also delete worker ({recordToDelete.staffName}) from Staff List
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Checking this will permanently remove the worker from the staff list and dropdowns.
                  </span>
                </div>
              </label>
            )}

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRecordToDelete(null);
                  setDeleteWorkerToo(false);
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteAttendanceRecord(recordToDelete.id, false, recordToDelete.staffId, recordToDelete.staffName);
                  setRecordToDelete(null);
                  setDeleteWorkerToo(false);
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer text-center"
                title="Only remove from this month's register"
              >
                Delete This Month Only
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteAttendanceRecord(recordToDelete.id, true, recordToDelete.staffId, recordToDelete.staffName);
                  setRecordToDelete(null);
                  setDeleteWorkerToo(false);
                }}
                className="px-5 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer text-center"
                title="Permanently remove worker from staff directory and all attendance registers"
              >
                <Trash2 className="w-4 h-4" />
                Delete Worker Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9B. MODAL: CLEAR / RESET ALL WORKERS & ATTENDANCE */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-lg text-slate-900 font-heading">
                  Clear Attendance &amp; Staff Data?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose how much data you want to delete and reset
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options */}
            <div className="space-y-2.5 pt-1">
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  clearStaffToo 
                    ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-500' 
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="clearOption"
                  checked={clearStaffToo}
                  onChange={() => setClearStaffToo(true)}
                  className="w-4 h-4 mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <span className="font-extrabold text-slate-900 block">
                    Permanently Delete All Workers &amp; All Records
                  </span>
                  <span className="text-[11px] text-slate-600 block mt-0.5">
                    Completely resets staff directory and all monthly registers to a 100% clean, fresh slate.
                  </span>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  !clearStaffToo 
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' 
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="clearOption"
                  checked={!clearStaffToo}
                  onChange={() => setClearStaffToo(false)}
                  className="w-4 h-4 mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-extrabold text-slate-900 block">
                    Clear Attendance Records Only (Keep Workers)
                  </span>
                  <span className="text-[11px] text-slate-600 block mt-0.5">
                    Clears attendance log entries but keeps worker profiles in the staff directory.
                  </span>
                </div>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllAttendanceAndStaff) {
                    onClearAllAttendanceAndStaff(clearStaffToo);
                  }
                  setIsClearAllModalOpen(false);
                }}
                className="px-5 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Confirm &amp; Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT WORKERS FROM OTHER MONTHS */}
      {isImportStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 font-heading">
                    Import Workers to {formattedMonthTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chune huye workers sirf <strong>{formattedMonthTitle}</strong> ke register me add honge
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportStaffModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Select All controls */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search workers by name or role..."
                  value={importSearchQuery}
                  onChange={(e) => setImportSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-blue-600"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const filtered = otherMonthsStaff.filter(s => 
                    s.name.toLowerCase().includes(importSearchQuery.toLowerCase()) || 
                    s.role.toLowerCase().includes(importSearchQuery.toLowerCase())
                  );
                  if (selectedStaffIdsToImport.length === filtered.length) {
                    setSelectedStaffIdsToImport([]);
                  } else {
                    setSelectedStaffIdsToImport(filtered.map(s => s.id));
                  }
                }}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
              >
                {selectedStaffIdsToImport.length > 0 && selectedStaffIdsToImport.length === otherMonthsStaff.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Workers List */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {(() => {
                const filtered = otherMonthsStaff.filter(s => 
                  s.name.toLowerCase().includes(importSearchQuery.toLowerCase()) || 
                  s.role.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
                  (s.employeeId && s.employeeId.toLowerCase().includes(importSearchQuery.toLowerCase()))
                );

                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-slate-500">
                      Koi worker nahi mila jise import kiya ja sake.
                    </div>
                  );
                }

                return filtered.map((s) => {
                  const isChecked = selectedStaffIdsToImport.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer pt-2 ${
                        isChecked ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStaffIdsToImport([...selectedStaffIdsToImport, s.id]);
                            } else {
                              setSelectedStaffIdsToImport(selectedStaffIdsToImport.filter(id => id !== s.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                            <span>{s.name}</span>
                            {s.employeeId && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200">
                                {s.employeeId}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{s.role}</span>
                            <span>•</span>
                            <span>₹{s.defaultRate}/duty</span>
                            {s.companyName && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[150px]">{s.companyName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 font-mono">
                          {s.createdMonth || s.month || 'Other month'}
                        </span>
                      </div>
                    </label>
                  );
                });
              })()}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500">
                {selectedStaffIdsToImport.length} worker(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportStaffModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedStaffIdsToImport.length === 0}
                  onClick={() => handleImportStaffToCurrentMonth(selectedStaffIdsToImport)}
                  className={`px-5 py-2 text-xs font-black text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                    selectedStaffIdsToImport.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Import ({selectedStaffIdsToImport.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-lg text-slate-900 font-heading">
                  Delete Worker?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanently remove worker from staff list
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 text-xs space-y-1.5">
              <p className="font-bold text-slate-900">
                Are you sure you want to permanently delete worker <span className="text-rose-700 font-extrabold text-sm">{staffToDelete.name}</span> ({staffToDelete.role || 'Staff'})?
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Their profile, bank details, and all attendance records will be permanently deleted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteStaffMember(staffToDelete.id);
                  setStaffToDelete(null);
                }}
                className="px-5 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete Worker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7C. MODAL: COMPANY & SITE MANAGEMENT (ADD COMPANY / FILTER BY COMPANY) */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 my-8 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 font-heading">
                    Company &amp; Site Register
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add companies or client sites to track &amp; filter attendance separately
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCompanyModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form: Add New Company or Edit Selected Company */}
            {editingCompany ? (
              <div className="bg-amber-50/80 rounded-2xl p-4 border-2 border-amber-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-amber-600" />
                    <span>Edit Company Details: {editingCompany.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEditCompany}
                    className="text-[11px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                  >
                    Cancel Edit / Add New
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tata Projects, Suhel Engg..."
                      value={editCompanyName}
                      onChange={(e) => setEditCompanyName(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-amber-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Short Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TATA, SE, R-INFRA"
                      value={editCompanyCode}
                      onChange={(e) => setEditCompanyCode(e.target.value.toUpperCase())}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 focus:outline-amber-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Site / Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Noida Plant, Site B"
                      value={editCompanyLocation}
                      onChange={(e) => setEditCompanyLocation(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-amber-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      In-charge / Contact
                    </label>
                    <input
                      type="text"
                      placeholder="Supervisor Name"
                      value={editCompanyContactPerson}
                      onChange={(e) => setEditCompanyContactPerson(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-amber-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Phone / Mobile
                    </label>
                    <input
                      type="tel"
                      placeholder="Contact Number"
                      value={editCompanyPhone}
                      onChange={(e) => setEditCompanyPhone(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-amber-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Notes / Site Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fabrication contract details, supervisor contact..."
                    value={editCompanyNotes}
                    onChange={(e) => setEditCompanyNotes(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-amber-600 shadow-2xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelEditCompany}
                    className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditCompany}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="text-xs font-black uppercase text-blue-900 tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Company or Client Site</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tata Projects, Suhel Engg..."
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-blue-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Short Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TATA, SE, R-INFRA"
                      value={newCompanyCode}
                      onChange={(e) => setNewCompanyCode(e.target.value.toUpperCase())}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 focus:outline-blue-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Site / Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Noida Plant, Site B"
                      value={newCompanyLocation}
                      onChange={(e) => setNewCompanyLocation(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-blue-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      In-charge / Contact
                    </label>
                    <input
                      type="text"
                      placeholder="Supervisor Name"
                      value={newCompanyContactPerson}
                      onChange={(e) => setNewCompanyContactPerson(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-blue-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Phone / Mobile
                    </label>
                    <input
                      type="tel"
                      placeholder="Contact Number"
                      value={newCompanyPhone}
                      onChange={(e) => setNewCompanyPhone(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-blue-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fabrication contract details, site contact..."
                    value={newCompanyNotes}
                    onChange={(e) => setNewCompanyNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-blue-600 shadow-2xs"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleCreateCompany}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Save Company
                  </button>
                </div>
              </div>
            )}

            {/* List of Existing Companies */}
            <div className="space-y-2">
              <div className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center justify-between">
                <span>Registered Companies ({allAvailableCompanies.length})</span>
                <span className="text-[10px] text-slate-500 font-normal">Manage, edit, or delete companies</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                {allAvailableCompanies.map((comp) => {
                  const workerCount = staffMembers.filter(
                    (s) => (s.companyName || '').toLowerCase() === comp.name.toLowerCase()
                  ).length;
                  const isSelected = selectedCompany.toLowerCase() === comp.name.toLowerCase();
                  const isCurrentlyEditing = editingCompany?.id === comp.id || (editingCompany?.name.toLowerCase() === comp.name.toLowerCase());

                  return (
                    <div 
                      key={comp.id || comp.name}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isCurrentlyEditing
                          ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-300/50'
                          : isSelected 
                            ? 'bg-blue-50 border-blue-300' 
                            : 'bg-white border-slate-200 hover:border-blue-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-950 truncate">
                            {comp.name}
                          </span>
                          {comp.code && (
                            <span className="px-1.5 py-0.2 bg-slate-900 text-white font-mono text-[9px] font-black rounded uppercase">
                              {comp.code}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-[10px] font-bold rounded-full">
                            {workerCount} Worker{workerCount !== 1 ? 's' : ''}
                          </span>
                          {isCurrentlyEditing && (
                            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-black rounded-full animate-pulse">
                              Editing Now
                            </span>
                          )}
                        </div>
                        {(comp.location || comp.contactPerson) && (
                          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                            {comp.location && <span>📍 {comp.location}</span>}
                            {comp.contactPerson && <span>👤 {comp.contactPerson}</span>}
                            {comp.phone && <span>📞 {comp.phone}</span>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompany(comp.name);
                            setCompanySearchInput('');
                            setIsCompanyModalOpen(false);
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-800'
                          }`}
                        >
                          {isSelected ? '✓ Active Filter' : 'View Attendance'}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleStartEditCompany(comp)}
                          className="px-2.5 py-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title={`Edit ${comp.name} details`}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePromptDeleteCompany(comp)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={`Delete ${comp.name}`}
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedCompany('ALL');
                  setCompanySearchInput('');
                  setIsCompanyModalOpen(false);
                }}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Reset Filter to All Companies
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCompanyModalOpen(false);
                  handleCancelEditCompany();
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: DELETE COMPANY CONFIRMATION */}
      {companyToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 min-w-0 flex-1">
                <h3 className="text-base font-black text-slate-900">
                  Delete Company &amp; Site
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete <span className="font-extrabold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">&quot;{companyToDelete.name}&quot;</span>?
                </p>
                {companyToDelete.workerCount > 0 ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-medium">
                    ⚠️ <strong>{companyToDelete.workerCount} worker{companyToDelete.workerCount !== 1 ? 's are' : ' is'}</strong> currently assigned to this company. If deleted, their company tag will be removed to &quot;Unassigned&quot;, while all their attendance logs and salary records remain completely safe.
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    This company will be removed from your company register.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompanyToDelete(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCompany}
                className="px-5 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Yes, Delete Company
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. MODAL: WORKER KYC DOCUMENTS VIEWER */}
      {viewingWorkerDocsStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 font-heading">
                    KYC Documents — {viewingWorkerDocsStaff.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Aadhaar, PAN, Bank Passbook, &amp; Verification Documents ({viewingWorkerDocsStaff.documents?.length || 0} Files)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingWorkerDocsStaff(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Holder & Relation Summary Card */}
            {(viewingWorkerDocsStaff.accountHolderName || viewingWorkerDocsStaff.relationName || viewingWorkerDocsStaff.accountNumber) && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">Bank &amp; Account Holder Details:</div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 text-[10.5px] block">Account Holder:</span>
                    <strong className="text-slate-900">{viewingWorkerDocsStaff.accountHolderName || viewingWorkerDocsStaff.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10.5px] block">Relation:</span>
                    <strong className="text-slate-900">{viewingWorkerDocsStaff.relationName || 'Self'}</strong>
                  </div>
                  {viewingWorkerDocsStaff.accountNumber && (
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[10.5px] block">Account No. &amp; Bank:</span>
                      <strong className="font-mono text-emerald-800">{viewingWorkerDocsStaff.accountNumber}</strong>
                      {viewingWorkerDocsStaff.bankName && <span className="text-slate-600"> ({viewingWorkerDocsStaff.bankName})</span>}
                      {viewingWorkerDocsStaff.ifscCode && <span className="text-slate-500 font-mono"> • {viewingWorkerDocsStaff.ifscCode}</span>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Document List */}
            {(!viewingWorkerDocsStaff.documents || viewingWorkerDocsStaff.documents.length === 0) ? (
              <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No KYC documents uploaded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click &apos;Edit Profile&apos; to upload Aadhaar card, PAN, or bank passbook.</p>
                <button
                  type="button"
                  onClick={() => {
                    const s = viewingWorkerDocsStaff;
                    setViewingWorkerDocsStaff(null);
                    handleOpenEditStaffModal(s);
                  }}
                  className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Documents Now
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {viewingWorkerDocsStaff.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
                        {doc.fileType.startsWith('image/') ? (
                          <ImageIcon className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900 truncate">
                            {doc.title || doc.name}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-bold text-[9px] uppercase rounded">
                            {doc.category.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{doc.name}</span>
                          <span>•</span>
                          <span>{(doc.size / 1024).toFixed(0)} KB</span>
                          <span>•</span>
                          <span>{doc.uploadedAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewingDoc(doc)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Preview document full screen"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                      <a
                        href={doc.dataUrl}
                        download={doc.name}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const s = viewingWorkerDocsStaff;
                  setViewingWorkerDocsStaff(null);
                  handleOpenEditStaffModal(s);
                }}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Documents &amp; Profile
              </button>
              <button
                type="button"
                onClick={() => setViewingWorkerDocsStaff(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. MODAL: FULL DOCUMENT PREVIEW (ZOOM / INSPECT) */}
      {previewingDoc && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={() => setPreviewingDoc(null)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-5 space-y-3 my-8 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm text-slate-900 font-heading truncate">
                      {previewingDoc.title || previewingDoc.name}
                    </h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded-full">
                      {previewingDoc.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 truncate">
                    {previewingDoc.name} • {(previewingDoc.size / 1024).toFixed(0)} KB • Uploaded {previewingDoc.uploadedAt}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewingDoc.dataUrl}
                  download={previewingDoc.name}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewingDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Viewer Body */}
            <div className="flex-1 overflow-y-auto bg-slate-950/5 rounded-2xl p-3 flex items-center justify-center min-h-[300px]">
              {previewingDoc.fileType.startsWith('image/') ? (
                <img
                  src={previewingDoc.dataUrl}
                  alt={previewingDoc.title || previewingDoc.name}
                  className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                />
              ) : previewingDoc.fileType === 'application/pdf' ? (
                <iframe
                  src={previewingDoc.dataUrl}
                  title={previewingDoc.name}
                  className="w-full h-[60vh] rounded-xl border border-slate-300 bg-white"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 max-w-md">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-bold text-sm text-slate-800">{previewingDoc.name}</p>
                  <p className="text-xs text-slate-500 mt-1">Preview not directly supported in browser frame.</p>
                  <a
                    href={previewingDoc.dataUrl}
                    download={previewingDoc.name}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                  >
                    <Download className="w-3.5 h-3.5" /> Download File
                  </a>
                </div>
              )}
            </div>

            {/* Footer info */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 shrink-0">
              <span>Category: <strong>{previewingDoc.category}</strong></span>
              <button
                type="button"
                onClick={() => setPreviewingDoc(null)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. HIDDEN CONTAINER FOR MONTHLY ATTENDANCE REGISTER PRINT */}
      <div className="hidden">
        <div 
          ref={monthlySheetPrintRef}
          data-orientation="landscape"
          className="print-monthly-sheet landscape-print p-4 bg-white text-slate-900 text-xs font-sans space-y-3"
          style={{ width: '100%', maxWidth: '287mm', margin: '0 auto', boxSizing: 'border-box' }}
        >
          <div className="text-center border-b-2 border-slate-800 pb-2">
            <h1 className="text-base font-black uppercase text-slate-950 tracking-wide">{businessProfile.name}</h1>
            <p className="text-[10px] text-slate-600">{businessProfile.address}, {businessProfile.city}</p>
            <h2 className="text-xs font-extrabold uppercase mt-0.5 text-slate-900">
              Monthly Attendance &amp; Wage Register Sheet — {formattedMonthTitle.toUpperCase()}
            </h2>
            {selectedCompany !== 'ALL' && (
              <div className="inline-block mt-1 px-2.5 py-0.5 bg-blue-100 text-blue-950 font-black text-[10px] uppercase tracking-wider rounded border border-blue-300">
                COMPANY / SITE: {selectedCompany}
              </div>
            )}
          </div>

          <table 
            className="w-full border border-slate-800 border-collapse text-[9px] leading-tight"
            style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}
          >
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '7%' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-200 border-b border-slate-800 font-bold text-[8.5px] uppercase text-slate-900">
                <th className="p-1 text-center border border-slate-700">#</th>
                <th className="p-1 text-center border border-slate-700">Emp ID</th>
                <th className="p-1 text-left border border-slate-700">Worker &amp; Role</th>
                <th className="p-1 text-left border border-slate-700">Company / Site</th>
                <th className="p-1 text-left border border-slate-700">Bank Details</th>
                <th className="p-1 text-center border border-slate-700">OT (H)</th>
                <th className="p-1 text-center border border-slate-700">OT Rate</th>
                <th className="p-1 text-center border border-slate-700">Daily Rate</th>
                <th className="p-1 text-center border border-slate-700">Duty</th>
                <th className="p-1 text-right border border-slate-700">Gross (₹)</th>
                <th className="p-1 text-right border border-slate-700">Advance</th>
                <th className="p-1 text-right border border-slate-700">Net Pay (₹)</th>
                <th className="p-1 text-center border border-slate-700">Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {companyFilteredMonthRecords.map((r, i) => {
                const sObj = staffMembers.find((s) => s.id === r.staffId);
                const empId = r.employeeId || sObj?.employeeId || `EMP-${String(i + 1).padStart(3, '0')}`;
                const comp = r.companyName || sObj?.companyName || (selectedCompany !== 'ALL' ? selectedCompany : '-');
                const aNo = r.accountNumber || sObj?.accountNumber || '-';
                const bName = r.bankName || sObj?.bankName;

                return (
                  <tr key={r.id} className="border-b border-slate-300">
                    <td className="p-1 text-center font-mono font-bold border border-slate-300">{i + 1}</td>
                    <td className="p-1 text-center font-mono font-bold border border-slate-300">{empId}</td>
                    <td className="p-1 border border-slate-300 overflow-hidden text-ellipsis">
                      <strong className="text-slate-900 block truncate">{r.staffName}</strong>
                      <div className="text-[8px] text-slate-500 truncate">{r.role}</div>
                    </td>
                    <td className="p-1 text-slate-800 font-medium border border-slate-300 overflow-hidden text-ellipsis truncate">{comp}</td>
                    <td className="p-1 font-mono text-[8.5px] border border-slate-300 overflow-hidden text-ellipsis">
                      <div className="truncate">{aNo}</div>
                      {bName && <div className="text-[7.5px] text-slate-500 truncate">{bName}</div>}
                    </td>
                    <td className="p-1 text-center font-mono font-bold text-amber-950 border border-slate-300">{r.overtimeHours || 0}</td>
                    <td className="p-1 text-center font-mono border border-slate-300">₹{r.overtimeRate || 0}</td>
                    <td className="p-1 text-center font-mono border border-slate-300">₹{r.salaryRate}</td>
                    <td className="p-1 text-center font-mono font-bold border border-slate-300">{r.dutyDays}</td>
                    <td className="p-1 text-right font-mono font-bold border border-slate-300">{formatIndianCurrency((r.totalSalary || 0) + (r.overtimeAmount || 0))}</td>
                    <td className="p-1 text-right font-mono text-rose-800 border border-slate-300">-{formatIndianCurrency(r.advanceDeduction || 0)}</td>
                    <td className="p-1 text-right font-mono font-black text-emerald-900 border border-slate-300">{formatIndianCurrency(r.netPayable)}</td>
                    <td className="p-1 text-center border border-slate-300"></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-800 text-[9.5px]">
                <td colSpan={5} className="p-1 uppercase border border-slate-700">Total ({companyFilteredMonthRecords.length} Workers)</td>
                <td className="p-1 text-center font-mono font-bold text-amber-950 border border-slate-700">{totalOvertimeHours}</td>
                <td className="p-1 text-center font-mono border border-slate-700">-</td>
                <td className="p-1 text-center font-mono border border-slate-700">-</td>
                <td className="p-1 text-center font-mono font-black border border-slate-700">{totalDutyLogged}</td>
                <td className="p-1 text-right font-mono font-black border border-slate-700">{formatIndianCurrency(totalGrossWages)}</td>
                <td className="p-1 text-right font-mono text-rose-800 border border-slate-700">-{formatIndianCurrency(totalAdvanceDeducted)}</td>
                <td className="p-1 text-right font-mono font-black text-emerald-900 border border-slate-700">{formatIndianCurrency(totalNetPayable)}</td>
                <td className="border border-slate-700"></td>
              </tr>
            </tfoot>
          </table>

          <div className="grid grid-cols-2 pt-8 gap-8 text-center text-[10px]">
            <div className="border-t border-slate-500 pt-1 font-bold">Checked By (Manager / Accountant)</div>
            <div className="border-t border-slate-500 pt-1 font-bold">Employer / Authorized Signatory</div>
          </div>
        </div>
      </div>

      {/* 10. BANK SALARY PAYMENT ADVICE MODAL (LETTER PAD FORMAT) */}
      <BankPaymentAdviceModal
        isOpen={isBankAdviceModalOpen}
        onClose={() => setIsBankAdviceModalOpen(false)}
        selectedMonth={selectedMonth}
        formattedMonthTitle={formattedMonthTitle}
        businessProfile={businessProfile}
        monthRecords={monthRecords}
        staffMembers={staffMembers}
        initialSelectedCompany={selectedCompany}
        availableCompanies={attendanceCompanies}
      />

    </div>
  );
};
