import { 
  Invoice, Party, Item, BusinessProfile, Expense, 
  BankAccount, CashTransaction, EWayBillRecord, AuthUser,
  StaffMember, AttendanceRecord, AttendanceCompany, PaymentVoucher,
  GstFilingRecord, PurchaseBillReturnRecord
} from '../types';
import { 
  INITIAL_BUSINESS_PROFILE, 
  INITIAL_INVOICES, 
  INITIAL_ITEMS, 
  INITIAL_PARTIES, 
  INITIAL_EXPENSES, 
  INITIAL_BANK_ACCOUNTS, 
  INITIAL_CASH_TRANSACTIONS, 
  INITIAL_EWAY_BILLS 
} from '../data/mockData';
import {
  INITIAL_STAFF_MEMBERS,
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_ATTENDANCE_COMPANIES
} from '../data/initialAttendanceData';

export interface UserAccountData {
  businessProfile: BusinessProfile;
  invoices: Invoice[];
  parties: Party[];
  items: Item[];
  expenses: Expense[];
  bankAccounts: BankAccount[];
  cashTransactions: CashTransaction[];
  ewayBills: EWayBillRecord[];
  paymentVouchers?: PaymentVoucher[];
  staffMembers?: StaffMember[];
  attendanceRecords?: AttendanceRecord[];
  attendanceCompanies?: AttendanceCompany[];
  gstFilingRecords?: GstFilingRecord[];
  purchaseBillReturns?: PurchaseBillReturnRecord[];
}

const STORAGE_PREFIX = 'vyapar_user_data_';

/**
 * Gets a clean safe key for the user account based on their email or ID
 */
export function getUserStorageKey(userIdOrEmail: string): string {
  if (!userIdOrEmail) return `${STORAGE_PREFIX}guest`;
  const sanitized = String(userIdOrEmail).trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${STORAGE_PREFIX}${sanitized}`;
}

/**
 * Creates completely blank, fresh data for a newly registered user
 */
export function createFreshUserData(user: AuthUser): UserAccountData {
  const newProfile: BusinessProfile = {
    ...INITIAL_BUSINESS_PROFILE,
    name: user.businessName || 'SR Group',
    email: user.email || 'skkhantraders7867@gmail.com',
    phone: user.phone || '',
    address: '',
    city: '',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '',
    gstin: '',
    pan: '',
  };

  return {
    businessProfile: newProfile,
    invoices: [],
    parties: [],
    items: [],
    expenses: [],
    bankAccounts: [],
    cashTransactions: [],
    ewayBills: [],
    paymentVouchers: [],
    staffMembers: [],
    attendanceRecords: [],
    attendanceCompanies: [],
    gstFilingRecords: [],
    purchaseBillReturns: [],
  };
}

/**
 * Clears all transaction data and creates a 100% clean fresh slate
 */
export function clearAllUserData(user: AuthUser): UserAccountData {
  const fresh = createFreshUserData(user);
  saveUserAccountData(user, fresh);
  return fresh;
}

/**
 * Loads isolated data for a specific user.
 * Automatically cleans any legacy mock records (e.g. Apex Digital, demo invoices).
 */
export function loadUserAccountData(user: AuthUser | null): UserAccountData {
  const emailOrGuest = user?.email || 'guest';
  const key = getUserStorageKey(emailOrGuest);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const profile = parsed.businessProfile || { 
        ...INITIAL_BUSINESS_PROFILE, 
        name: user?.businessName || 'SR Group', 
        email: user?.email || 'skkhantraders7867@gmail.com' 
      };
      if (!profile.logoUrl) {
        profile.logoUrl = 'https://lh3.googleusercontent.com/d/16BUJ9mO_ZLvGvhuxxLRwnvlWxeiemQX8';
      }
      if (!profile.billPadUrl) {
        profile.billPadUrl = 'https://lh3.googleusercontent.com/d/1XMbVyXZXJ4DsVd_wfJViJ1sooBv3brJ2';
        profile.useCustomBillPad = true;
        profile.billPadHeaderOffset = profile.billPadHeaderOffset || 148;
        profile.billPadFooterOffset = profile.billPadFooterOffset || 125;
      }

      // Filter out legacy demo mock entries if any existed
      const invoices = (Array.isArray(parsed.invoices) ? parsed.invoices : []).filter(
        (inv: any) => !inv.id?.startsWith('inv-demo') && inv.partyName !== 'Apex Digital Solutions LLP'
      );
      const parties = (Array.isArray(parsed.parties) ? parsed.parties : []).filter(
        (p: any) => !['pty-1', 'pty-2', 'pty-3', 'pty-4', 'pty-5'].includes(p.id) && p.name !== 'Apex Digital Solutions LLP'
      );
      const items = (Array.isArray(parsed.items) ? parsed.items : []).filter(
        (it: any) => !['itm-1', 'itm-2', 'itm-3', 'itm-4', 'itm-5', 'itm-6'].includes(it.id) && it.name !== 'Ultratech Cement (PPC 50kg)'
      );
      const expenses = (Array.isArray(parsed.expenses) ? parsed.expenses : []).filter(
        (ex: any) => !['exp-1', 'exp-2', 'exp-3'].includes(ex.id)
      );
      const staffMembers = (Array.isArray(parsed.staffMembers) ? parsed.staffMembers : []).filter(
        (s: any) => !['staff-1', 'staff-2', 'staff-3', 'staff-4', 'staff-5', 'staff-6'].includes(s.id)
      );
      const attendanceRecords = (Array.isArray(parsed.attendanceRecords) ? parsed.attendanceRecords : []).filter(
        (r: any) => !['att-1', 'att-2', 'att-3', 'att-4', 'att-5', 'att-6', 'att-7', 'att-8'].includes(r.id)
      );

      return {
        businessProfile: profile,
        invoices,
        parties,
        items,
        expenses,
        bankAccounts: Array.isArray(parsed.bankAccounts) ? parsed.bankAccounts : [],
        cashTransactions: Array.isArray(parsed.cashTransactions) ? parsed.cashTransactions : [],
        ewayBills: Array.isArray(parsed.ewayBills) ? parsed.ewayBills : [],
        paymentVouchers: Array.isArray(parsed.paymentVouchers) ? parsed.paymentVouchers : [],
        staffMembers,
        attendanceRecords,
        attendanceCompanies: Array.isArray(parsed.attendanceCompanies) ? parsed.attendanceCompanies : [],
        gstFilingRecords: Array.isArray(parsed.gstFilingRecords) ? parsed.gstFilingRecords : [],
        purchaseBillReturns: Array.isArray(parsed.purchaseBillReturns) ? parsed.purchaseBillReturns : [],
      };
    }
  } catch (e) {
    console.error('Error reading user storage:', e);
  }

  // If no stored data, return clean slate
  if (user) {
    const fresh = createFreshUserData(user);
    saveUserAccountData(user, fresh);
    return fresh;
  }

  return {
    businessProfile: INITIAL_BUSINESS_PROFILE,
    invoices: [],
    parties: [],
    items: [],
    expenses: [],
    bankAccounts: [],
    cashTransactions: [],
    ewayBills: [],
    staffMembers: [],
    attendanceRecords: [],
    attendanceCompanies: [],
    paymentVouchers: [],
    gstFilingRecords: [],
    purchaseBillReturns: [],
  };
}

/**
 * Saves isolated data for a specific user or guest
 */
export function saveUserAccountData(user: AuthUser | null, data: UserAccountData): void {
  const emailOrGuest = user?.email || 'guest';
  const key = getUserStorageKey(emailOrGuest);
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving user data for', emailOrGuest, e);
  }
}
