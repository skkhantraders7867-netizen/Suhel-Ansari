import React, { useState, useEffect, useRef } from 'react';
import { 
  Invoice, Party, Item, BusinessProfile, ViewMode, DocumentType, PaymentMode,
  Expense, BankAccount, CashTransaction, EWayBillRecord, AuthUser,
  StaffMember, AttendanceRecord, AttendanceCompany
} from './types';
import { 
  INITIAL_BUSINESS_PROFILE, 
  INITIAL_PARTIES, 
  INITIAL_ITEMS, 
  INITIAL_INVOICES,
  INITIAL_EXPENSES,
  INITIAL_BANK_ACCOUNTS,
  INITIAL_CASH_TRANSACTIONS,
  INITIAL_EWAY_BILLS
} from './data/mockData';
import {
  INITIAL_STAFF_MEMBERS,
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_ATTENDANCE_COMPANIES
} from './data/initialAttendanceData';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AuthModal, getStoredUser, saveStoredUser } from './components/AuthModal';
import { ConfirmModal } from './components/ConfirmModal';
import { loadUserAccountData, saveUserAccountData, createFreshUserData, UserAccountData } from './utils/userDataStorage';
import { pushUserAccountDataToSupabase, pushUserAccountDataToSupabaseNow, fetchUserAccountDataFromSupabase } from './utils/supabaseSync';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';
import { DashboardView } from './components/DashboardView';
import { InvoiceListView } from './components/InvoiceListView';
import { QuotationsView } from './components/QuotationsView';
import { ServiceOrdersView } from './components/ServiceOrdersView';
import { PurchaseEstimatesView } from './components/PurchaseEstimatesView';
import { InvoiceBuilder } from './components/InvoiceBuilder';
import { PosBillingView } from './components/PosBillingView';
import { ExpenseTrackerView } from './components/ExpenseTrackerView';
import { EwayBillsView } from './components/EwayBillsView';
import { CashBankView } from './components/CashBankView';
import { BarcodeStudioView } from './components/BarcodeStudioView';
import { PartiesView } from './components/PartiesView';
import { InventoryView } from './components/InventoryView';
import { GstReportsView } from './components/GstReportsView';
import { LetterheadDocumentView } from './components/LetterheadDocumentView';
import { AttendanceView } from './components/AttendanceView';
import { InvoicePreviewModal } from './components/InvoicePreviewModal';
import { HsnFinderModal } from './components/HsnFinderModal';
import { BusinessSettingsModal } from './components/BusinessSettingsModal';
import { RecordPaymentModal } from './components/RecordPaymentModal';

export default function App() {
  // --- AUTHENTICATION STATE ---
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    return getStoredUser() || {
      id: 'usr-skk-default',
      name: 'S K Khan',
      email: 'skkhantraders7867@gmail.com',
      businessName: 'SR Group',
      provider: 'google',
    };
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isSwitchingAccountRef = useRef(false);

  // Initial user dataset loaded strictly for the currently active user
  const initialUserData = loadUserAccountData(currentUser);

  // --- USER ISOLATED STATE ---
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => ({
    ...initialUserData.businessProfile,
    logoUrl: initialUserData.businessProfile?.logoUrl || 'https://lh3.googleusercontent.com/d/16BUJ9mO_ZLvGvhuxxLRwnvlWxeiemQX8',
  }));
  const [parties, setParties] = useState<Party[]>(initialUserData.parties);
  const [items, setItems] = useState<Item[]>(initialUserData.items);
  const [invoices, setInvoices] = useState<Invoice[]>(initialUserData.invoices);
  const [expenses, setExpenses] = useState<Expense[]>(initialUserData.expenses);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(initialUserData.bankAccounts);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(initialUserData.cashTransactions);
  const [ewayBills, setEwayBills] = useState<EWayBillRecord[]>(initialUserData.ewayBills);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => {
    return Array.isArray(initialUserData.staffMembers)
      ? initialUserData.staffMembers
      : [];
  });
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    return Array.isArray(initialUserData.attendanceRecords)
      ? initialUserData.attendanceRecords
      : [];
  });
  const [attendanceCompanies, setAttendanceCompanies] = useState<AttendanceCompany[]>(() => {
    return Array.isArray(initialUserData.attendanceCompanies)
      ? initialUserData.attendanceCompanies
      : [];
  });

  // Auto-save changes to local storage & Supabase Cloud Backend
  useEffect(() => {
    if (isSwitchingAccountRef.current) return;
    if (currentUser) {
      const fullData: UserAccountData = {
        businessProfile,
        invoices,
        parties,
        items,
        expenses,
        bankAccounts,
        cashTransactions,
        ewayBills,
        staffMembers,
        attendanceRecords,
        attendanceCompanies,
      };
      // Save locally & debounced push to Supabase table
      pushUserAccountDataToSupabase(currentUser, fullData);
    }
  }, [currentUser, businessProfile, invoices, parties, items, expenses, bankAccounts, cashTransactions, ewayBills, staffMembers, attendanceRecords, attendanceCompanies]);

  // Asynchronously sync from Supabase when user logs in or switches
  useEffect(() => {
    if (!currentUser || isSwitchingAccountRef.current) return;
    let isCancelled = false;

    fetchUserAccountDataFromSupabase(currentUser).then(cloudData => {
      if (isCancelled || !cloudData) return;
      if (cloudData.businessProfile && cloudData.businessProfile.name) {
        setBusinessProfile(prev => ({ ...prev, ...cloudData.businessProfile }));
      }
      if (Array.isArray(cloudData.parties) && cloudData.parties.length > 0) {
        setParties(cloudData.parties);
      }
      if (Array.isArray(cloudData.items) && cloudData.items.length > 0) {
        setItems(cloudData.items);
      }
      if (Array.isArray(cloudData.invoices) && cloudData.invoices.length > 0) {
        setInvoices(cloudData.invoices);
      }
      if (Array.isArray(cloudData.expenses) && cloudData.expenses.length > 0) {
        setExpenses(cloudData.expenses);
      }
      if (Array.isArray(cloudData.bankAccounts) && cloudData.bankAccounts.length > 0) {
        setBankAccounts(cloudData.bankAccounts);
      }
      if (Array.isArray(cloudData.cashTransactions) && cloudData.cashTransactions.length > 0) {
        setCashTransactions(cloudData.cashTransactions);
      }
      if (Array.isArray(cloudData.ewayBills) && cloudData.ewayBills.length > 0) {
        setEwayBills(cloudData.ewayBills);
      }
      if (Array.isArray(cloudData.staffMembers) && cloudData.staffMembers.length > 0) {
        setStaffMembers(cloudData.staffMembers);
      }
      if (Array.isArray(cloudData.attendanceRecords) && cloudData.attendanceRecords.length > 0) {
        setAttendanceRecords(cloudData.attendanceRecords);
      }
      if (Array.isArray(cloudData.attendanceCompanies) && cloudData.attendanceCompanies.length > 0) {
        setAttendanceCompanies(cloudData.attendanceCompanies);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.email]);

  // Handler to switch account and cleanly swap data
  const switchUserAccount = (newUser: AuthUser) => {
    isSwitchingAccountRef.current = true;
    saveStoredUser(newUser);
    setCurrentUser(newUser);

    const freshOrSavedData = loadUserAccountData(newUser);
    setBusinessProfile({ ...freshOrSavedData.businessProfile });
    setParties([...freshOrSavedData.parties]);
    setItems([...freshOrSavedData.items]);
    setInvoices([...freshOrSavedData.invoices]);
    setExpenses([...freshOrSavedData.expenses]);
    setBankAccounts([...freshOrSavedData.bankAccounts]);
    setCashTransactions([...freshOrSavedData.cashTransactions]);
    setEwayBills([...freshOrSavedData.ewayBills]);
    setStaffMembers(Array.isArray(freshOrSavedData.staffMembers) ? [...freshOrSavedData.staffMembers] : []);
    setAttendanceRecords(Array.isArray(freshOrSavedData.attendanceRecords) ? [...freshOrSavedData.attendanceRecords] : []);
    setAttendanceCompanies(Array.isArray(freshOrSavedData.attendanceCompanies) ? [...freshOrSavedData.attendanceCompanies] : []);

    setTimeout(() => {
      isSwitchingAccountRef.current = false;
    }, 150);

    setCurrentView('DASHBOARD');
  };

  // --- NAVIGATION & VIEWS ---
  const [currentView, setCurrentView] = useState<ViewMode>('DASHBOARD');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [initialDocTypeForCreate, setInitialDocTypeForCreate] = useState<DocumentType>('TAX_INVOICE');
  const [preselectedPartyIdForCreate, setPreselectedPartyIdForCreate] = useState<string | undefined>(undefined);

  // --- MODALS ---
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [isHsnFinderOpen, setIsHsnFinderOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  
  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<Invoice | null>(null);
  const [paymentTargetParty, setPaymentTargetParty] = useState<Party | null>(null);

  // In-App Confirm Dialog (Replaces blocked window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Delete',
    onConfirm: () => {},
  });

  // Unpaid invoices count (excluding quotations)
  const unpaidCount = invoices.filter(i => i.documentType !== 'QUOTATION' && i.paymentStatus !== 'PAID' && i.balanceDue > 0).length;
  // Low stock count
  const lowStockCount = items.filter(i => i.currentStock <= i.minStockLevel).length;

  // --- INVOICE ACTIONS ---
  const handleOpenCreateInvoice = (docType: DocumentType = 'TAX_INVOICE', partyId?: string) => {
    setEditingInvoice(null);
    setInitialDocTypeForCreate(docType);
    setPreselectedPartyIdForCreate(partyId);
    setCurrentView('CREATE_INVOICE');
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setInitialDocTypeForCreate(inv.documentType);
    setPreselectedPartyIdForCreate(inv.partyId);
    setCurrentView('CREATE_INVOICE');
  };

  const handleSaveInvoice = (savedInv: Invoice, openPreview = true) => {
    setInvoices(prev => {
      const exists = prev.some(i => i.id === savedInv.id);
      if (exists) {
        return prev.map(i => i.id === savedInv.id ? savedInv : i);
      }
      return [savedInv, ...prev];
    });

    // If paid by cash, record in cash transactions
    if (savedInv.paymentMode === 'CASH' && savedInv.paidAmount > 0) {
      const newCashTx: CashTransaction = {
        id: `cash-${Date.now()}`,
        date: savedInv.date,
        type: 'INFLOW',
        category: 'SALE',
        amount: savedInv.paidAmount,
        description: `Cash received for Invoice #${savedInv.invoiceNumber}`,
        referenceNumber: savedInv.invoiceNumber,
        partyName: savedInv.partyName,
        createdAt: new Date().toISOString(),
      };
      setCashTransactions(prev => [newCashTx, ...prev]);
    }

    // Deduct stock for sold items
    setItems(prev => {
      return prev.map(item => {
        const line = (savedInv.items || []).find(li => li.itemId === item.id);
        if (line) {
          return {
            ...item,
            currentStock: Math.max(0, item.currentStock - (line.quantity || 0)),
          };
        }
        return item;
      });
    });

    // Increment business nextInvoiceNumber if it was a new invoice
    if (!editingInvoice) {
      setBusinessProfile(prev => ({
        ...prev,
        nextInvoiceNumber: prev.nextInvoiceNumber + 1,
      }));
    }

    if (openPreview) {
      setPreviewInvoice(savedInv);
    }
  };

  const handleDeleteInvoice = (id: string) => {
    const invToDelete = invoices.find(i => i.id === id);
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Document',
      message: `Are you sure you want to delete ${invToDelete ? `Invoice #${invToDelete.invoiceNumber}` : 'this invoice'}? This will remove the record.`,
      confirmLabel: 'Delete Now',
      onConfirm: () => {
        setInvoices(prev => prev.filter(i => i.id !== id));
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDuplicateInvoice = (invoice: Invoice) => {
    const duplicated: Invoice = {
      ...invoice,
      id: `inv-${Date.now()}`,
      invoiceNumber: `${businessProfile.invoicePrefix}${String(businessProfile.nextInvoiceNumber).padStart(4, '0')}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingInvoice(duplicated);
    setCurrentView('CREATE_INVOICE');
  };

  const handleConvertToTaxInvoice = (quotation: Invoice) => {
    const converted: Invoice = {
      ...quotation,
      id: `inv-${Date.now()}`,
      documentType: 'TAX_INVOICE',
      invoiceNumber: `${businessProfile.invoicePrefix}${String(businessProfile.nextInvoiceNumber).padStart(4, '0')}`,
      date: new Date().toISOString().split('T')[0],
      notes: `Converted from Quotation #${quotation.invoiceNumber}`,
      quotationStatus: 'CONVERTED',
    };
    // Also update the original quotation status to CONVERTED
    setInvoices(prev => prev.map(inv => inv.id === quotation.id ? { ...inv, quotationStatus: 'CONVERTED' } : inv));
    setEditingInvoice(converted);
    setCurrentView('CREATE_INVOICE');
  };

  const handleUpdateQuotationStatus = (id: string, status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED') => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        return {
          ...inv,
          quotationStatus: status,
          updatedAt: new Date().toISOString(),
        };
      }
      return inv;
    }));
  };

  // --- RECORD PAYMENT ---
  const handleOpenPaymentForInvoice = (inv: Invoice) => {
    setPaymentTargetInvoice(inv);
    setPaymentTargetParty(null);
    setIsPaymentModalOpen(true);
  };

  const handleOpenPaymentForParty = (party: Party) => {
    setPaymentTargetInvoice(null);
    setPaymentTargetParty(party);
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (data: {
    invoiceId?: string;
    partyId: string;
    partyName: string;
    amount: number;
    paymentMode: PaymentMode;
    referenceNumber: string;
    notes: string;
  }) => {
    // 1. Update invoice if specified
    if (data.invoiceId) {
      setInvoices(prev => prev.map(inv => {
        if (inv.id === data.invoiceId) {
          const newPaid = inv.paidAmount + data.amount;
          const newDue = Math.max(0, inv.grandTotal - newPaid);
          const newStatus = newDue === 0 ? 'PAID' : 'PARTIAL';
          return {
            ...inv,
            paidAmount: newPaid,
            balanceDue: newDue,
            paymentStatus: newStatus,
            paymentMode: data.paymentMode,
          };
        }
        return inv;
      }));
    }

    // 2. If paid by cash, record in cash transactions
    if (data.paymentMode === 'CASH') {
      const newCashTx: CashTransaction = {
        id: `cash-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: 'INFLOW',
        category: 'CUSTOMER_PAYMENT',
        amount: data.amount,
        description: `Customer payment received: ${data.notes || 'Payment against account'}`,
        partyName: data.partyName,
        referenceNumber: data.referenceNumber,
        createdAt: new Date().toISOString(),
      };
      setCashTransactions(prev => [newCashTx, ...prev]);
    }

    // 3. Update party balance
    setParties(prev => prev.map(p => {
      if (p.id === data.partyId) {
        return {
          ...p,
          currentBalance: Math.max(0, p.currentBalance - data.amount),
        };
      }
      return p;
    }));
  };

  // --- EXPENSES ACTIONS ---
  const handleAddExpense = (expData: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExp: Expense = {
      ...expData,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setExpenses(prev => [newExp, ...prev]);

    // If paid by cash, record in cash outflows
    if (expData.paymentMode === 'CASH') {
      const newCashTx: CashTransaction = {
        id: `cash-${Date.now()}`,
        date: expData.date,
        type: 'OUTFLOW',
        category: 'EXPENSE',
        amount: expData.amount,
        description: `Expense: ${expData.category} - ${expData.title || expData.description || ''}`,
        partyName: expData.partyName || expData.vendorName,
        createdAt: new Date().toISOString(),
      };
      setCashTransactions(prev => [newCashTx, ...prev]);
    }
  };

  const handleDeleteExpense = (id: string) => {
    const exp = expenses.find(e => e.id === id);
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Expense',
      message: `Are you sure you want to delete ${exp?.category || 'this expense'} of ₹${exp?.amount || ''}?`,
      confirmLabel: 'Delete Now',
      onConfirm: () => {
        setExpenses(prev => prev.filter(e => e.id !== id));
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // --- E-WAY BILL ACTIONS ---
  const handleAddEwayBill = (ewbData: Omit<EWayBillRecord, 'id' | 'generatedAt'>) => {
    const newEwb: EWayBillRecord = {
      ...ewbData,
      id: `ewb-${Date.now()}`,
      generatedAt: new Date().toISOString(),
    };
    setEwayBills(prev => [newEwb, ...prev]);

    // Update invoice with E-Way Bill Number if matched
    setInvoices(prev => prev.map(inv => {
      if (inv.id === ewbData.invoiceId) {
        return {
          ...inv,
          transport: {
            ...inv.transport,
            ewayBillNumber: ewbData.ewayBillNumber,
            vehicleNumber: ewbData.vehicleNumber,
            transporterName: ewbData.transporterName,
            transporterId: ewbData.transporterId,
          }
        };
      }
      return inv;
    }));
  };

  const handleUpdateEwayStatus = (id: string, status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED') => {
    setEwayBills(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  // --- CASH & BANK ACTIONS ---
  const handleAddCashTransaction = (txData: Omit<CashTransaction, 'id' | 'createdAt'>) => {
    const newTx: CashTransaction = {
      ...txData,
      id: `cash-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCashTransactions(prev => [newTx, ...prev]);
  };

  const handleAddBankTransaction = (accountId: string, amount: number, type: 'DEPOSIT' | 'WITHDRAW') => {
    setBankAccounts(prev => prev.map(acc => {
      if (acc.id === accountId) {
        const newBal = type === 'DEPOSIT' ? acc.balance + amount : acc.balance - amount;
        return { ...acc, balance: Math.max(0, newBal) };
      }
      return acc;
    }));

    // Record corresponding cash transaction
    const targetBank = bankAccounts.find(b => b.id === accountId);
    const newCashTx: CashTransaction = {
      id: `cash-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: type === 'DEPOSIT' ? 'OUTFLOW' : 'INFLOW',
      category: type === 'DEPOSIT' ? 'CASH_DEPOSIT_BANK' : 'CASH_WITHDRAWAL_BANK',
      amount: amount,
      description: type === 'DEPOSIT' 
        ? `Cash deposited into ${targetBank?.bankName || 'Bank'}` 
        : `Cash withdrawn from ${targetBank?.bankName || 'Bank'}`,
      createdAt: new Date().toISOString(),
    };
    setCashTransactions(prev => [newCashTx, ...prev]);
  };

  const handleTransferBankFunds = (fromAccountId: string, toAccountId: string, amount: number, notes: string) => {
    setBankAccounts(prev => prev.map(acc => {
      if (acc.id === fromAccountId) {
        return { ...acc, balance: Math.max(0, acc.balance - amount) };
      }
      if (acc.id === toAccountId) {
        return { ...acc, balance: acc.balance + amount };
      }
      return acc;
    }));
  };

  const handleAddNewBankAccount = (accountData: Omit<BankAccount, 'id'>) => {
    const newAcc: BankAccount = {
      ...accountData,
      id: `bank-${Date.now()}`,
    };
    setBankAccounts(prev => [...prev, newAcc]);
  };

  // --- PARTIES ACTIONS ---
  const handleAddNewParty = (newPartyData: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>): Party => {
    const created: Party = {
      ...newPartyData,
      id: `party-${Date.now()}`,
      currentBalance: newPartyData.openingBalance || 0,
      createdAt: new Date().toISOString(),
    };
    setParties(prev => [created, ...prev]);
    return created;
  };

  const handleUpdateParty = (updatedParty: Party) => {
    setParties(prev => prev.map(p => p.id === updatedParty.id ? updatedParty : p));
  };

  const handleDeleteParty = (id: string) => {
    const p = parties.find(party => party.id === id);
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Party / Customer',
      message: `Are you sure you want to delete "${p?.name || 'this party'}"?`,
      confirmLabel: 'Delete Now',
      onConfirm: () => {
        setParties(prev => prev.filter(p => p.id !== id));
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // --- INVENTORY ACTIONS ---
  const handleAddNewItem = (newItemData: Omit<Item, 'id' | 'createdAt'>): Item => {
    const created: Item = {
      ...newItemData,
      id: `item-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setItems(prev => [created, ...prev]);
    return created;
  };

  const handleUpdateItem = (updatedItem: Item) => {
    setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
  };

  const handleAdjustStock = (itemId: string, newStock: number) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, currentStock: newStock } : i));
  };

  const handleDeleteItem = (id: string) => {
    const it = items.find(item => item.id === id);
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Product / Item',
      message: `Are you sure you want to delete "${it?.name || 'this product'}"?`,
      confirmLabel: 'Delete Now',
      onConfirm: () => {
        setItems(prev => prev.filter(i => i.id !== id));
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // --- ATTENDANCE & STAFF ACTIONS ---
  const handleAddStaffMember = (staff: StaffMember) => {
    setStaffMembers(prev => [staff, ...prev]);
  };

  const handleUpdateStaffMember = (staff: StaffMember) => {
    setStaffMembers(prev => prev.map(s => s.id === staff.id ? staff : s));
  };

  const handleDeleteStaffMember = (staffId: string) => {
    const targetStaff = staffMembers.find(s => s.id === staffId);
    const targetName = targetStaff?.name?.trim()?.toLowerCase();

    const updatedStaff = staffMembers.filter(s => s.id !== staffId && (!targetName || s.name.trim().toLowerCase() !== targetName));
    const updatedRecords = attendanceRecords.filter(r => {
      if (r.staffId === staffId) return false;
      if (targetName && r.staffName?.trim()?.toLowerCase() === targetName) return false;
      return true;
    });

    setStaffMembers(updatedStaff);
    setAttendanceRecords(updatedRecords);

    if (currentUser) {
      const fullData: UserAccountData = {
        businessProfile,
        invoices,
        parties,
        items,
        expenses,
        bankAccounts,
        cashTransactions,
        ewayBills,
        staffMembers: updatedStaff,
        attendanceRecords: updatedRecords,
        attendanceCompanies,
      };
      saveUserAccountData(currentUser, fullData);
      pushUserAccountDataToSupabaseNow(currentUser, fullData);
    }
  };

  const handleSaveAttendanceRecord = (record: AttendanceRecord) => {
    setAttendanceRecords(prev => {
      const idx = prev.findIndex(r => r.id === record.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = record;
        return next;
      }
      return [record, ...prev];
    });
  };

  const handleDeleteAttendanceRecord = (
    recordId: string,
    deleteStaffToo: boolean = false,
    staffId?: string,
    staffName?: string
  ) => {
    const targetRecord = attendanceRecords.find(r => r.id === recordId);
    const effectiveStaffId = staffId || targetRecord?.staffId;
    const effectiveStaffName = staffName || targetRecord?.staffName;
    const normalizedName = effectiveStaffName?.trim()?.toLowerCase();

    let updatedRecords: AttendanceRecord[];
    let updatedStaff = staffMembers;

    if (deleteStaffToo) {
      // Permanently remove worker from staff members list AND all attendance records
      updatedRecords = attendanceRecords.filter(r => {
        if (r.id === recordId) return false;
        if (effectiveStaffId && r.staffId === effectiveStaffId) return false;
        if (normalizedName && r.staffName?.trim()?.toLowerCase() === normalizedName) return false;
        return true;
      });
      updatedStaff = staffMembers.filter(s => {
        if (effectiveStaffId && s.id === effectiveStaffId) return false;
        if (normalizedName && s.name?.trim()?.toLowerCase() === normalizedName) return false;
        return true;
      });
      setStaffMembers(updatedStaff);
    } else {
      // Remove only this single attendance record for this month
      updatedRecords = attendanceRecords.filter(r => r.id !== recordId);
    }

    setAttendanceRecords(updatedRecords);

    if (currentUser) {
      const fullData: UserAccountData = {
        businessProfile,
        invoices,
        parties,
        items,
        expenses,
        bankAccounts,
        cashTransactions,
        ewayBills,
        staffMembers: updatedStaff,
        attendanceRecords: updatedRecords,
        attendanceCompanies,
      };
      saveUserAccountData(currentUser, fullData);
      pushUserAccountDataToSupabaseNow(currentUser, fullData);
    }
  };

  const handleClearAllAttendanceAndStaff = (clearStaffToo: boolean = false) => {
    const updatedStaff = clearStaffToo ? [] : staffMembers;
    const updatedRecords: AttendanceRecord[] = [];

    if (clearStaffToo) {
      setStaffMembers([]);
    }
    setAttendanceRecords([]);

    if (currentUser) {
      const fullData: UserAccountData = {
        businessProfile,
        invoices,
        parties,
        items,
        expenses,
        bankAccounts,
        cashTransactions,
        ewayBills,
        staffMembers: updatedStaff,
        attendanceRecords: updatedRecords,
        attendanceCompanies,
      };
      saveUserAccountData(currentUser, fullData);
      pushUserAccountDataToSupabaseNow(currentUser, fullData);
    }
  };

  const handleRecordSalaryPayment = (recordId: string, paidAmount: number, paymentMode: PaymentMode) => {
    setAttendanceRecords(prev => prev.map(r => {
      if (r.id === recordId) {
        const newPaid = (r.paidAmount || 0) + paidAmount;
        const newStatus = newPaid >= r.netPayable ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'UNPAID');
        return {
          ...r,
          paidAmount: newPaid,
          paymentStatus: newStatus,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMode: paymentMode,
        };
      }
      return r;
    }));

    // Record corresponding expense in Accounts
    const targetRec = attendanceRecords.find(r => r.id === recordId);
    if (targetRec) {
      const newExpense: Expense = {
        id: `exp-sal-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        category: 'Salary',
        title: `Salary Payment: ${targetRec.staffName} (${targetRec.month})`,
        amount: paidAmount,
        paymentMode: paymentMode,
        isGstExpense: false,
        notes: `Duty: ${targetRec.dutyDays} days, Rate: ₹${targetRec.salaryRate}/day`,
        createdAt: new Date().toISOString(),
      };
      setExpenses(prev => [newExpense, ...prev]);

      if (paymentMode === 'CASH') {
        const cashTx: CashTransaction = {
          id: `cash-sal-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'OUTFLOW',
          category: 'EXPENSE',
          amount: paidAmount,
          description: `Salary: ${targetRec.staffName}`,
          createdAt: new Date().toISOString(),
        };
        setCashTransactions(prev => [cashTx, ...prev]);
      }
    }
  };

  const handleAddAttendanceCompany = (company: AttendanceCompany) => {
    setAttendanceCompanies(prev => {
      const exists = prev.some(c => c.id === company.id || c.name.toLowerCase() === company.name.toLowerCase());
      if (exists) return prev;
      return [...prev, company];
    });
  };

  const handleUpdateAttendanceCompany = (company: AttendanceCompany, oldName?: string) => {
    setAttendanceCompanies(prev => {
      const idx = prev.findIndex(c => c.id === company.id || (oldName && c.name.toLowerCase() === oldName.toLowerCase()));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = company;
        return next;
      }
      return [...prev, company];
    });

    if (oldName && oldName.trim().toLowerCase() !== company.name.trim().toLowerCase()) {
      setStaffMembers(prev => prev.map(s => {
        if ((s.companyName || '').trim().toLowerCase() === oldName.trim().toLowerCase()) {
          return { ...s, companyName: company.name };
        }
        return s;
      }));
      setAttendanceRecords(prev => prev.map(r => {
        if ((r.companyName || '').trim().toLowerCase() === oldName.trim().toLowerCase()) {
          return { ...r, companyName: company.name };
        }
        return r;
      }));
    }
  };

  const handleDeleteAttendanceCompany = (companyId: string, companyName?: string) => {
    const updatedCompanies = attendanceCompanies.filter(c => {
      if (c.id === companyId) return false;
      if (companyName && c.name.trim().toLowerCase() === companyName.trim().toLowerCase()) return false;
      return true;
    });
    setAttendanceCompanies(updatedCompanies);

    let updatedStaff = staffMembers;
    let updatedRecords = attendanceRecords;

    if (companyName) {
      updatedStaff = staffMembers.map(s => {
        if ((s.companyName || '').trim().toLowerCase() === companyName.trim().toLowerCase()) {
          return { ...s, companyName: undefined };
        }
        return s;
      });
      updatedRecords = attendanceRecords.map(r => {
        if ((r.companyName || '').trim().toLowerCase() === companyName.trim().toLowerCase()) {
          return { ...r, companyName: undefined };
        }
        return r;
      });
      setStaffMembers(updatedStaff);
      setAttendanceRecords(updatedRecords);
    }

    if (currentUser) {
      const fullData: UserAccountData = {
        businessProfile,
        invoices,
        parties,
        items,
        expenses,
        bankAccounts,
        cashTransactions,
        ewayBills,
        staffMembers: updatedStaff,
        attendanceRecords: updatedRecords,
        attendanceCompanies: updatedCompanies,
      };
      saveUserAccountData(currentUser, fullData);
      pushUserAccountDataToSupabaseNow(currentUser, fullData);
    }
  };

  // --- DATA BACKUP & RESET ---
  const handleExportAllData = () => {
    const fullBackup = {
      businessProfile,
      parties,
      items,
      invoices,
      expenses,
      bankAccounts,
      cashTransactions,
      ewayBills,
      staffMembers,
      attendanceRecords,
      exportDate: new Date().toISOString(),
      app: 'SR Group GST Billing Pro India',
    };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SRGroup_Backup_${businessProfile.gstin}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    if (!currentUser) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Wipe All Data & Start Fresh',
      message: 'Are you sure you want to delete all invoices, parties, items, and expenses? This will leave your account with a 100% clean blank slate for new data entry.',
      confirmLabel: 'Clear All Data',
      onConfirm: () => {
        const fresh = createFreshUserData(currentUser);

        setBusinessProfile(fresh.businessProfile);
        setParties([]);
        setItems([]);
        setInvoices([]);
        setExpenses([]);
        setBankAccounts([]);
        setCashTransactions([]);
        setEwayBills([]);
        setStaffMembers([]);
        setAttendanceRecords([]);
        setAttendanceCompanies([]);

        saveUserAccountData(currentUser, fresh);
        pushUserAccountDataToSupabaseNow(currentUser, fresh);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar 
        businessProfile={businessProfile}
        currentView={currentView}
        onSelectView={setCurrentView}
        onCreateInvoice={() => handleOpenCreateInvoice('TAX_INVOICE')}
        onOpenPos={() => setCurrentView('POS')}
        onOpenHsnFinder={() => setIsHsnFinderOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          saveStoredUser(null);
          setCurrentUser(null);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Full-width views (Invoice Builder, POS) */}
        {currentView === 'CREATE_INVOICE' ? (
          <InvoiceBuilder 
            businessProfile={businessProfile}
            parties={parties}
            items={items}
            invoices={invoices}
            initialDocType={initialDocTypeForCreate}
            defaultDocType={initialDocTypeForCreate}
            initialPartyId={preselectedPartyIdForCreate}
            existingInvoice={editingInvoice}
            editingInvoice={editingInvoice}
            onSave={handleSaveInvoice}
            onSaveInvoice={handleSaveInvoice}
            onAddNewParty={handleAddNewParty}
            onAddNewItem={handleAddNewItem}
            onCancel={() => {
              setEditingInvoice(null);
              setCurrentView('INVOICES');
            }}
          />
        ) : currentView === 'POS' ? (
          <PosBillingView 
            items={items}
            parties={parties}
            businessProfile={businessProfile}
            onSaveInvoice={handleSaveInvoice}
            onBack={() => setCurrentView('DASHBOARD')}
          />
        ) : (
          /* Standard Layout: Sidebar + Active Tab View */
          <div className="flex flex-col md:flex-row gap-6">
            
            {/* Sidebar */}
            <Sidebar 
              currentView={currentView}
              onSelectView={setCurrentView}
              unpaidCount={unpaidCount}
              lowStockCount={lowStockCount}
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />

            {/* View Viewports */}
            <div className="flex-1 min-w-0 space-y-4">
              
              {/* Page Section Indicator & Quick Sub-tabs */}
              <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {['DASHBOARD', 'INVOICES', 'QUOTATIONS', 'SERVICE_ORDERS', 'PURCHASE_ESTIMATES', 'POS', 'LETTERHEAD_STUDIO'].includes(currentView) ? '1' :
                     currentView === 'PARTIES' ? '2' :
                     ['INVENTORY', 'BARCODE_STUDIO'].includes(currentView) ? '3' :
                     ['EXPENSES', 'CASH_BANK', 'EWAY_BILLS', 'REPORTS'].includes(currentView) ? '4' : '5'}
                  </span>
                  <div>
                    <h2 className="font-extrabold text-sm text-slate-900 font-heading">
                      {['DASHBOARD', 'INVOICES', 'QUOTATIONS', 'SERVICE_ORDERS', 'PURCHASE_ESTIMATES', 'POS', 'LETTERHEAD_STUDIO'].includes(currentView) && 'Page 1: Billing & Sales Center'}
                      {currentView === 'PARTIES' && 'Page 2: Parties, Customers & Khata Ledger'}
                      {['INVENTORY', 'BARCODE_STUDIO'].includes(currentView) && 'Page 3: Stock Catalog & Barcodes'}
                      {['EXPENSES', 'CASH_BANK', 'EWAY_BILLS', 'REPORTS'].includes(currentView) && 'Page 4: Accounts, Banking & Tax Compliance'}
                      {currentView === 'ATTENDANCE' && 'Page 5: Staff Attendance & Auto-Salary Register'}
                    </h2>
                  </div>
                </div>

                {/* Sub-view Quick Tabs for active page */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                  {/* Page 1 Sub-tabs */}
                  {['DASHBOARD', 'INVOICES', 'QUOTATIONS', 'SERVICE_ORDERS', 'PURCHASE_ESTIMATES', 'POS', 'LETTERHEAD_STUDIO'].includes(currentView) && (
                    <>
                      <button
                        onClick={() => setCurrentView('DASHBOARD')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          currentView === 'DASHBOARD' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={() => setCurrentView('INVOICES')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          currentView === 'INVOICES' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>Invoices</span>
                        {unpaidCount > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${currentView === 'INVOICES' ? 'bg-blue-800 text-white' : 'bg-amber-100 text-amber-900'}`}>
                            {unpaidCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setCurrentView('QUOTATIONS')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          currentView === 'QUOTATIONS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>Quotations &amp; Estimates (कोटेशन)</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          currentView === 'QUOTATIONS' ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {invoices.filter(i => i.documentType === 'QUOTATION').length}
                        </span>
                      </button>
                      <button
                        onClick={() => setCurrentView('SERVICE_ORDERS')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          currentView === 'SERVICE_ORDERS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>Service Order &amp; Estimate (सर्विस ऑर्डर)</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          currentView === 'SERVICE_ORDERS' ? 'bg-blue-800 text-white' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {invoices.filter(i => i.documentType === 'SERVICE_ORDER').length}
                        </span>
                      </button>
                      <button
                        onClick={() => setCurrentView('PURCHASE_ESTIMATES')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          currentView === 'PURCHASE_ESTIMATES' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>Purchase Estimate (खरीद एस्टीमेट)</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          currentView === 'PURCHASE_ESTIMATES' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {invoices.filter(i => i.documentType === 'PURCHASE_ESTIMATE').length}
                        </span>
                      </button>
                      <button
                        onClick={() => setCurrentView('POS')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          currentView === 'POS' ? 'bg-amber-500 text-slate-950' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                        }`}
                      >
                        POS Counter
                      </button>
                      <button
                        onClick={() => setCurrentView('LETTERHEAD_STUDIO')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          currentView === 'LETTERHEAD_STUDIO' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Letterhead
                      </button>
                    </>
                  )}

                  {/* Page 5 Sub-tabs */}
                  {currentView === 'ATTENDANCE' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                        {staffMembers.length} Workers Enrolled
                      </span>
                    </div>
                  )}

                  {/* Page 2 Sub-tabs */}
                  {currentView === 'PARTIES' && (
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                      {parties.length} Total Parties (Customers & Suppliers)
                    </span>
                  )}

                  {/* Page 3 Sub-tabs */}
                  {['INVENTORY', 'BARCODE_STUDIO'].includes(currentView) && (
                    <>
                      <button
                        onClick={() => setCurrentView('INVENTORY')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          currentView === 'INVENTORY' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>Products & Stock</span>
                        {lowStockCount > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${currentView === 'INVENTORY' ? 'bg-blue-800 text-white' : 'bg-rose-100 text-rose-800'}`}>
                            {lowStockCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setCurrentView('BARCODE_STUDIO')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          currentView === 'BARCODE_STUDIO' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Barcode Studio
                      </button>
                    </>
                  )}

                  {/* Page 4 Sub-tabs */}
                  {['EXPENSES', 'CASH_BANK', 'EWAY_BILLS', 'REPORTS'].includes(currentView) && (
                    <>
                      <button
                        onClick={() => setCurrentView('EXPENSES')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          currentView === 'EXPENSES' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Expenses & P&L
                      </button>
                      <button
                        onClick={() => setCurrentView('CASH_BANK')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          currentView === 'CASH_BANK' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Cash Galla & Banks
                      </button>
                      <button
                        onClick={() => setCurrentView('EWAY_BILLS')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          currentView === 'EWAY_BILLS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        E-Way Bills
                      </button>
                      <button
                        onClick={() => setCurrentView('REPORTS')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          currentView === 'REPORTS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        GST Returns
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {currentView === 'DASHBOARD' && (
                <DashboardView 
                  invoices={invoices}
                  parties={parties}
                  items={items}
                  businessProfile={businessProfile}
                  onCreateInvoice={handleOpenCreateInvoice}
                  onViewInvoice={(inv) => setPreviewInvoice(inv)}
                  onDeleteInvoice={handleDeleteInvoice}
                  onOpenPos={() => setCurrentView('POS')}
                  onOpenHsnFinder={() => setIsHsnFinderOpen(true)}
                  onNavigateTab={(view) => setCurrentView(view)}
                />
              )}

              {currentView === 'INVOICES' && (
                <InvoiceListView 
                  invoices={invoices}
                  onCreateInvoice={handleOpenCreateInvoice}
                  onViewInvoice={(inv) => setPreviewInvoice(inv)}
                  onEditInvoice={handleEditInvoice}
                  onDeleteInvoice={handleDeleteInvoice}
                  onDuplicateInvoice={handleDuplicateInvoice}
                  onConvertToTaxInvoice={handleConvertToTaxInvoice}
                  onRecordPayment={handleOpenPaymentForInvoice}
                />
              )}

              {currentView === 'QUOTATIONS' && (
                <QuotationsView
                  invoices={invoices}
                  parties={parties}
                  businessProfile={businessProfile}
                  onCreateQuotation={() => handleOpenCreateInvoice('QUOTATION')}
                  onViewQuotation={(inv) => setPreviewInvoice(inv)}
                  onEditQuotation={handleEditInvoice}
                  onDeleteQuotation={handleDeleteInvoice}
                  onDuplicateQuotation={handleDuplicateInvoice}
                  onConvertToTaxInvoice={handleConvertToTaxInvoice}
                  onUpdateQuotationStatus={handleUpdateQuotationStatus}
                />
              )}

              {currentView === 'SERVICE_ORDERS' && (
                <ServiceOrdersView
                  invoices={invoices}
                  parties={parties}
                  businessProfile={businessProfile}
                  onCreateServiceOrder={() => handleOpenCreateInvoice('SERVICE_ORDER')}
                  onViewServiceOrder={(inv) => setPreviewInvoice(inv)}
                  onEditServiceOrder={handleEditInvoice}
                  onDeleteServiceOrder={handleDeleteInvoice}
                  onDuplicateServiceOrder={handleDuplicateInvoice}
                  onConvertToTaxInvoice={handleConvertToTaxInvoice}
                  onUpdateStatus={handleUpdateQuotationStatus}
                />
              )}

              {currentView === 'PURCHASE_ESTIMATES' && (
                <PurchaseEstimatesView
                  invoices={invoices}
                  parties={parties}
                  businessProfile={businessProfile}
                  onCreatePurchaseEstimate={() => handleOpenCreateInvoice('PURCHASE_ESTIMATE')}
                  onViewPurchaseEstimate={(inv) => setPreviewInvoice(inv)}
                  onEditPurchaseEstimate={handleEditInvoice}
                  onDeletePurchaseEstimate={handleDeleteInvoice}
                  onDuplicatePurchaseEstimate={handleDuplicateInvoice}
                  onConvertToPurchaseBill={(est) => {
                    const newPurchaseBill: Invoice = {
                      ...est,
                      id: `inv-${Date.now()}`,
                      documentType: 'PURCHASE_BILL',
                      invoiceNumber: `PB-${new Date().getFullYear()}-${String(invoices.filter(i => i.documentType === 'PURCHASE_BILL').length + 1).padStart(3, '0')}`,
                      date: new Date().toISOString().split('T')[0],
                      notes: `Converted from Purchase Estimate ${est.invoiceNumber}. ${est.notes || ''}`.trim(),
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    setInvoices(prev => [
                      newPurchaseBill,
                      ...prev.map(i => i.id === est.id ? { ...i, quotationStatus: 'CONVERTED' as const, notes: `Converted to Purchase Bill ${newPurchaseBill.invoiceNumber}` } : i)
                    ]);
                    setPreviewInvoice(newPurchaseBill);
                  }}
                  onUpdateStatus={handleUpdateQuotationStatus}
                />
              )}

              {currentView === 'EXPENSES' && (
                <ExpenseTrackerView 
                  expenses={expenses}
                  invoices={invoices}
                  items={items}
                  onAddExpense={handleAddExpense}
                  onDeleteExpense={handleDeleteExpense}
                />
              )}

              {currentView === 'EWAY_BILLS' && (
                <EwayBillsView 
                  ewayBills={ewayBills}
                  invoices={invoices}
                  businessProfile={businessProfile}
                  onAddEwayBill={handleAddEwayBill}
                  onUpdateEwayStatus={handleUpdateEwayStatus}
                />
              )}

              {currentView === 'CASH_BANK' && (
                <CashBankView 
                  bankAccounts={bankAccounts}
                  cashTransactions={cashTransactions}
                  invoices={invoices}
                  expenses={expenses}
                  onAddBankTransaction={handleAddBankTransaction}
                  onTransferBankFunds={handleTransferBankFunds}
                  onAddCashTransaction={handleAddCashTransaction}
                  onAddNewBankAccount={handleAddNewBankAccount}
                />
              )}

              {currentView === 'BARCODE_STUDIO' && (
                <BarcodeStudioView 
                  items={items}
                  businessProfile={businessProfile}
                />
              )}

              {currentView === 'PARTIES' && (
                <PartiesView 
                  parties={parties}
                  invoices={invoices}
                  businessProfile={businessProfile}
                  onAddNewParty={handleAddNewParty}
                  onUpdateParty={handleUpdateParty}
                  onDeleteParty={handleDeleteParty}
                  onCreateInvoiceForParty={(partyId) => handleOpenCreateInvoice('TAX_INVOICE', partyId)}
                  onRecordPayment={handleOpenPaymentForParty}
                />
              )}

              {currentView === 'INVENTORY' && (
                <InventoryView 
                  items={items}
                  onAddNewItem={handleAddNewItem}
                  onUpdateItem={handleUpdateItem}
                  onAdjustStock={handleAdjustStock}
                  onDeleteItem={handleDeleteItem}
                />
              )}

              {currentView === 'REPORTS' && (
                <GstReportsView 
                  invoices={invoices}
                  businessProfile={businessProfile}
                />
              )}

              {currentView === 'LETTERHEAD_STUDIO' && (
                <LetterheadDocumentView 
                  businessProfile={businessProfile}
                />
              )}

              {currentView === 'ATTENDANCE' && (
                <AttendanceView 
                  businessProfile={businessProfile}
                  staffMembers={staffMembers}
                  attendanceRecords={attendanceRecords}
                  attendanceCompanies={attendanceCompanies}
                  onAddStaffMember={handleAddStaffMember}
                  onUpdateStaffMember={handleUpdateStaffMember}
                  onDeleteStaffMember={handleDeleteStaffMember}
                  onSaveAttendanceRecord={handleSaveAttendanceRecord}
                  onDeleteAttendanceRecord={handleDeleteAttendanceRecord}
                  onRecordSalaryPayment={handleRecordSalaryPayment}
                  onAddAttendanceCompany={handleAddAttendanceCompany}
                  onUpdateAttendanceCompany={handleUpdateAttendanceCompany}
                  onDeleteAttendanceCompany={handleDeleteAttendanceCompany}
                  onClearAllAttendanceAndStaff={handleClearAllAttendanceAndStaff}
                />
              )}

            </div>

          </div>
        )}

      </main>

      {/* --- GLOBAL MODALS --- */}
      
      {/* 1. Invoice Print & Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal 
          invoice={previewInvoice}
          businessProfile={businessProfile}
          onClose={() => setPreviewInvoice(null)}
          onEdit={(inv) => {
            setPreviewInvoice(null);
            handleEditInvoice(inv);
          }}
        />
      )}

      {/* 2. HSN & SAC Code Lookup Directory */}
      <HsnFinderModal 
        isOpen={isHsnFinderOpen}
        onClose={() => setIsHsnFinderOpen(false)}
      />

      {/* 3. Business Profile & GST Settings Modal */}
      <BusinessSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        businessProfile={businessProfile}
        onSaveProfile={setBusinessProfile}
        onExportAllData={handleExportAllData}
        onResetData={handleResetData}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
      />

      {/* 3b. Supabase Cloud Sync & Database Status Modal */}
      <SupabaseSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        currentUser={currentUser}
        currentData={{
          businessProfile,
          invoices,
          parties,
          items,
          expenses,
          bankAccounts,
          cashTransactions,
          ewayBills,
          staffMembers,
          attendanceRecords,
          attendanceCompanies,
        }}
        onDataRestored={(restored) => {
          setBusinessProfile(restored.businessProfile);
          setParties(restored.parties || []);
          setItems(restored.items || []);
          setInvoices(restored.invoices || []);
          setExpenses(restored.expenses || []);
          setBankAccounts(restored.bankAccounts || []);
          setCashTransactions(restored.cashTransactions || []);
          setEwayBills(restored.ewayBills || []);
          if (restored.staffMembers) setStaffMembers(restored.staffMembers);
          if (restored.attendanceRecords) setAttendanceRecords(restored.attendanceRecords);
          if (restored.attendanceCompanies) setAttendanceCompanies(restored.attendanceCompanies);
          setIsCloudSyncOpen(false);
        }}
        onClearAllData={handleResetData}
      />

      {/* 4. Record Payment Modal */}
      <RecordPaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        targetInvoice={paymentTargetInvoice}
        targetParty={paymentTargetParty}
        onSavePayment={handleSavePayment}
      />

      {/* 5. Email Login & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen || !currentUser}
        currentUser={currentUser}
        allowClose={Boolean(currentUser)}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          switchUserAccount(user);
          setIsAuthModalOpen(false);
        }}
      />

      {/* 6. Custom In-App Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
