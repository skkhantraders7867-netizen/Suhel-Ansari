export type DocumentType = 
  | 'TAX_INVOICE'
  | 'SERVICE_ORDER'
  | 'PROFORMA_INVOICE'
  | 'QUOTATION'
  | 'PURCHASE_ESTIMATE'
  | 'DELIVERY_CHALLAN'
  | 'PURCHASE_BILL'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'PAYMENT_RECEIPT';

export type QuotationStatus = 
  | 'DRAFT' 
  | 'SENT' 
  | 'ACCEPTED' 
  | 'REJECTED' 
  | 'EXPIRED' 
  | 'CONVERTED';

export type ViewMode = 
  | 'DASHBOARD' 
  | 'INVOICES' 
  | 'QUOTATIONS'
  | 'SERVICE_ORDERS'
  | 'PURCHASE_ESTIMATES'
  | 'CREATE_INVOICE' 
  | 'POS' 
  | 'PARTIES' 
  | 'OPENING_BALANCES'
  | 'PAYMENT_VOUCHERS'
  | 'INVENTORY' 
  | 'EXPENSES'
  | 'EWAY_BILLS'
  | 'BARCODE_STUDIO'
  | 'CASH_BANK'
  | 'REPORTS'
  | 'LETTERHEAD_STUDIO'
  | 'ATTENDANCE';

export type UserRole = 'ADMIN' | 'BILLING_OPERATOR' | 'ACCOUNTANT';

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';

export type PaymentMode = 'CASH' | 'UPI' | 'NEFT_RTGS' | 'CHEQUE' | 'CARD' | 'NET_BANKING';

export type UnitType = 
  | 'MTR'
  | 'MTR SQUARE'
  | 'SQMTR'
  | 'INCH'
  | 'IDM'
  | 'MT'
  | 'TON'
  | 'PCS' 
  | 'NOS' 
  | 'KGS' 
  | 'SQFT'
  | 'SFT'
  | 'SQM'
  | 'SET' 
  | 'BOX' 
  | 'BAG' 
  | 'LTR' 
  | 'EACH'
  | 'LUMP SUM' 
  | 'LUMP SUMP'
  | 'HOURS' 
  | 'PAC'
  | 'DOZ' 
  | 'GM' 
  | 'FEET'
  | 'R.MTR'
  | 'CMS'
  | 'MM'
  | string;

export interface BusinessProfile {
  name: string;
  tradeName?: string;
  tagline?: string;
  gstin: string;
  pan: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  accountHolderName?: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId: string;
  upiName: string;
  logoUrl?: string;
  signatureUrl?: string;
  termsAndConditions: string;
  quotationTermsAndConditions?: string;
  purchaseTermsAndConditions?: string;
  invoiceNotes: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  billPadUrl?: string;
  billPadHeaderOffset?: number;
  billPadFooterOffset?: number;
  useCustomBillPad?: boolean;
}

export interface Party {
  id: string;
  type: 'CUSTOMER' | 'SUPPLIER';
  name: string;
  tradeName?: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  billingAddress: string;
  shippingAddress?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  openingBalance: number; // positive = receivable, negative = payable
  openingBalanceDate?: string;
  openingBalanceType?: 'DR' | 'CR';
  currentBalance: number;
  creditLimit?: number;
  paymentTermsDays?: number;
  createdAt: string;
}

export interface PaymentVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  partyId: string;
  partyName: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber: string; // UTS No, Cheque No, UTR, Bank Ref
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceAmount?: number;
  remarks?: string;
  bankAccountId?: string;
  bankAccountName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Item {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  hsnCode: string;
  unit: UnitType;
  purchasePrice: number;
  sellingPrice: number;
  isTaxInclusive: boolean;
  taxRate: number; // e.g. 18 for 18%
  cessRate?: number; // e.g. 0 or 12
  minStockLevel: number;
  currentStock: number;
  category: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  itemId?: string;
  name: string;
  description?: string;
  hsnCode: string;
  unit: UnitType;
  quantity: number;
  rate: number;
  discountPercent: number;
  taxableAmount: number;
  taxRate: number;
  cgstAmount: number;
  sgstAmount: number;
  ugstAmount?: number;
  igstAmount: number;
  cessAmount: number;
  totalAmount: number;
  remarks?: string;
}

export interface TransportDetails {
  transporterName?: string;
  transporterId?: string; // Transporter GSTIN
  vehicleNumber?: string;
  ewayBillNumber?: string;
  ewayBillDate?: string;
  lrNumber?: string;
  lrDate?: string;
  distanceKm?: number;
  supplyDate?: string;
}

export interface BuyerAccountDetails {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  branchName?: string;
}

export interface Invoice {
  id: string;
  documentType: DocumentType;
  isWithoutGst?: boolean;
  buyerAccountDetails?: BuyerAccountDetails;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  partyId: string;
  partyName: string;
  partyGstin?: string;
  partyPhone: string;
  partyAddress: string;
  partyCity?: string;
  partyState: string;
  partyStateCode: string;
  partyPincode?: string;
  placeOfSupply: string;
  isInterState: boolean;
  isUtgst?: boolean;
  isReverseCharge: boolean;
  items: InvoiceItem[];
  subTotal: number;
  itemDiscountTotal: number;
  extraDiscount: number;
  shippingCharges: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  ugstTotal?: number;
  igstTotal: number;
  cessTotal: number;
  taxTotal?: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  paymentReference?: string;
  serviceNumber?: string;
  serviceDate?: string;
  runningBill?: string;
  // Service Order / Work Order Specific Fields
  serviceOrderNumber?: string;
  serviceOrderDate?: string;
  workOrderRef?: string;
  poNumber?: string;
  servicePeriod?: string;
  siteLocation?: string;
  contractorEngineer?: string;
  scopeOfWork?: string;
  transport?: TransportDetails;
  notes?: string;
  terms?: string;
  // TDS Deduction
  isTdsApplicable?: boolean;
  tdsRate?: number; // e.g. 1 for 1%, 2 for 2%, 10 for 10%
  tdsSection?: string; // e.g. "Sec 194C / 194Q", "Sec 194J", "GST TDS"
  tdsBase?: 'TAXABLE' | 'TOTAL'; // Calculate on Taxable Amount (default) or Gross Total
  tdsAmount?: number;
  netPayableAfterTds?: number;
  // Note References
  originalInvoiceNumber?: string;
  originalInvoiceDate?: string;
  reasonForNote?: string;
  // Quotation Specific Fields
  quotationStatus?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  validUntil?: string;
  validityDays?: number;
  rfqNumber?: string;
  quotationSubject?: string;
  quotationIntroText?: string;
  quotationTermsPageBreak?: boolean;
  quotationTermsHorizontal?: boolean;
  deliveryPeriod?: string;
  paymentTermsNote?: string;
  convertedInvoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId?: string;
  invoiceNumber?: string;
  partyId: string;
  partyName: string;
  amount: number;
  date: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  category: string;
  amount: number;
  date: string;
  partyName?: string;
  vendorName?: string;
  paymentMode: PaymentMode;
  isGstExpense: boolean;
  gstin?: string;
  taxRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  invoiceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: 'CURRENT' | 'SAVINGS' | 'OD_CC';
  balance: number;
  isDefault: boolean;
  upiId?: string;
}

export interface CashTransaction {
  id: string;
  date: string;
  type: 'INFLOW' | 'OUTFLOW';
  category: 'SALE' | 'CUSTOMER_PAYMENT' | 'EXPENSE' | 'SUPPLIER_PAYMENT' | 'CASH_DEPOSIT_BANK' | 'CASH_WITHDRAWAL_BANK' | 'MANUAL_ADJUSTMENT';
  amount: number;
  description: string;
  referenceNumber?: string;
  partyName?: string;
  createdAt: string;
}

export interface EWayBillRecord {
  id: string;
  ewayBillNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  docType: DocumentType;
  partyName: string;
  partyGstin?: string;
  fromPincode: string;
  toPincode: string;
  distanceKm: number;
  transporterName: string;
  transporterId: string; // GSTIN
  vehicleNumber: string;
  transportMode: 'ROAD' | 'RAIL' | 'AIR' | 'SHIP';
  supplyType: 'OUTWARD' | 'INWARD';
  subSupplyType: 'SUPPLY' | 'EXPORT' | 'JOB_WORK' | 'SKD_CKD' | 'RECIPIENT_NOT_KNOWN' | 'FOR_OWN_USE' | 'OTHERS';
  taxableAmount: number;
  totalInvoiceAmount: number;
  validUpto: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  generatedAt: string;
}

export interface GSTState {
  code: string;
  name: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'billing_operator' | 'accountant';
  businessName?: string;
  phone?: string;
  avatarUrl?: string;
  provider?: 'google' | 'email' | 'demo';
  createdAt: string;
}

export interface LetterTableColumn {
  title: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface BusinessLetter {
  id: string;
  refNo: string;
  date: string;
  recipientName: string;
  recipientDesignation?: string;
  recipientCompany: string;
  recipientAddress: string;
  subject: string;
  salutation: string;
  openingParagraph: string;
  bodyParagraphs: string[];
  tableData?: {
    columns: (string | LetterTableColumn)[];
    rows: string[][];
  };
  closingParagraph?: string;
  signatoryName: string;
  signatoryTitle: string;
  companyName: string;
  letterheadUrl?: string;
  headerOffset?: number;
  footerOffset?: number;
  contentFontSize?: number;
  lineSpacing?: 'compact' | 'normal' | 'spacious';
  cardOpacity?: 'clear' | 'tinted' | 'solid';
  showWatermark?: boolean;
  scale?: number;
}

export interface AttendanceCompany {
  id: string;
  name: string;
  code?: string;
  location?: string;
  contactPerson?: string;
  phone?: string;
  notes?: string;
}

export interface WorkerDocument {
  id: string;
  name: string; // e.g. "Aadhaar Card", "PAN Card", "Bank Passbook", "Profile Photo"
  category?: 'aadhaar' | 'pan' | 'bank_passbook' | 'photo' | 'other';
  fileData: string; // base64 Data URL or file URI
  fileName: string; // original filename
  fileType?: string; // MIME type e.g. image/jpeg, application/pdf
  fileSize?: number; // size in bytes
  uploadedAt: string; // ISO date string
}

export interface StaffMember {
  id: string;
  employeeId?: string; // e.g. 'EMP-001'
  name: string;
  role: string;
  companyName?: string; // Assigned company / site
  phone: string;
  defaultRate: number; // Salary rate per duty/day
  rateType: 'PER_DAY' | 'PER_MONTH' | 'PER_SHIFT';
  joiningDate: string; // Worker joining date
  month?: string; // Specific month worker was added ('YYYY-MM')
  createdMonth?: string; // Specific month worker was created ('YYYY-MM')
  accountHolderName?: string; // Account holder name (खाता धारक का नाम)
  relationName?: string; // Relationship / Guardian name (रिश्ता / अभिभावक का नाम)
  accountNumber?: string; // Bank account number
  bankName?: string; // Bank name (e.g. SBI, PNB, HDFC)
  ifscCode?: string; // IFSC code
  upiId?: string; // UPI ID (e.g. name@upi)
  documents?: WorkerDocument[]; // Uploaded KYC & ID documents
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  employeeId?: string; // e.g. 'EMP-001'
  staffName: string;
  role: string;
  companyName?: string; // Assigned company / site
  month: string; // 'YYYY-MM'
  dutyDate?: string; // Specific duty date or entry date (e.g. '2026-09-07')
  joiningDate?: string; // Worker joining date
  accountHolderName?: string; // Account holder name
  relationName?: string; // Relation with worker / Guardian
  accountNumber?: string; // Bank account number
  bankName?: string; // Bank name
  ifscCode?: string; // Bank IFSC code
  upiId?: string; // UPI ID
  salaryRate: number; // Salary rate per duty / day
  dutyDays: number; // Duty count (e.g. 26 or 24.5)
  totalSalary: number; // Auto: salaryRate * dutyDays
  overtimeHours?: number; // OT hours / extra duties
  overtimeRate?: number; // OT rate per hour / shift
  overtimeAmount?: number; // overtimeHours * overtimeRate
  advanceDeduction?: number; // Advance deduction
  bonus?: number; // Extra bonus / incentive
  netPayable: number; // totalSalary + overtimeAmount + bonus - advanceDeduction
  paymentStatus: 'UNPAID' | 'PAID' | 'PARTIAL';
  paidAmount?: number;
  paymentDate?: string;
  paymentMode?: PaymentMode;
  notes?: string;
  dailyAttendance?: Record<number, 'P' | 'A' | 'HD' | 'OT' | 'W'>; // Day 1..31
}

