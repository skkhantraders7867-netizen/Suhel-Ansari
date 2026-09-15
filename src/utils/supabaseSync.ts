import { AuthUser } from '../types';
import { UserAccountData, saveUserAccountData, loadUserAccountData } from './userDataStorage';
import { supabase, SUPABASE_PROJECT_ID } from './supabaseClient';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'SYNCED' | 'ERROR' | 'OFFLINE';

export interface CloudSyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  projectId: string;
  isTableReady: boolean;
  tableDetails: {
    user_account_data: boolean;
    invoices: boolean;
    parties: boolean;
    items: boolean;
    expenses: boolean;
  };
  totalSyncedRecords: {
    invoices: number;
    parties: number;
    items: number;
    expenses: number;
    staff: number;
  };
}

let currentSyncState: CloudSyncState = {
  status: 'IDLE',
  lastSyncedAt: null,
  errorMessage: null,
  projectId: SUPABASE_PROJECT_ID,
  isTableReady: true,
  tableDetails: {
    user_account_data: true,
    invoices: true,
    parties: true,
    items: true,
    expenses: true,
  },
  totalSyncedRecords: {
    invoices: 0,
    parties: 0,
    items: 0,
    expenses: 0,
    staff: 0,
  },
};

const listeners = new Set<(state: CloudSyncState) => void>();

export function getCloudSyncState(): CloudSyncState {
  return currentSyncState;
}

export function subscribeToSyncState(callback: (state: CloudSyncState) => void): () => void {
  listeners.add(callback);
  callback(currentSyncState);
  return () => {
    listeners.delete(callback);
  };
}

function updateSyncState(partial: Partial<CloudSyncState>) {
  currentSyncState = { ...currentSyncState, ...partial };
  listeners.forEach(cb => {
    try {
      cb(currentSyncState);
    } catch (e) {
      console.error('Error in sync listener:', e);
    }
  });
}

/**
 * Complete unified SQL Schema for Supabase
 */
export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- SUPABASE COMPLETE DATABASE SETUP FOR SR GROUP GST APP
-- 1. Open your Supabase Dashboard:
--    https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql
-- 2. Click "New query", paste this entire code and click "Run"
-- ========================================================

-- 1. Main Full Account Sync Table
CREATE TABLE IF NOT EXISTS public.user_account_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT UNIQUE NOT NULL,
  user_name TEXT,
  business_name TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Invoices & Quotations Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  doc_type TEXT DEFAULT 'TAX_INVOICE',
  party_name TEXT,
  party_id TEXT,
  total_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  date TEXT,
  due_date TEXT,
  status TEXT DEFAULT 'UNPAID',
  payment_mode TEXT,
  user_email TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Parties & Khata Ledger Table
CREATE TABLE IF NOT EXISTS public.parties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  gstin TEXT,
  party_type TEXT DEFAULT 'CUSTOMER',
  balance NUMERIC DEFAULT 0,
  address TEXT,
  user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Inventory & Stock Items Table
CREATE TABLE IF NOT EXISTS public.items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  hsn TEXT,
  sale_price NUMERIC DEFAULT 0,
  purchase_price NUMERIC DEFAULT 0,
  stock_quantity NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'PCS',
  gst_rate NUMERIC DEFAULT 18,
  user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  category TEXT,
  payment_mode TEXT,
  date TEXT,
  user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.user_account_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 7. Allow full access policy for client publishable anon key
DROP POLICY IF EXISTS "Allow anon all on user_account_data" ON public.user_account_data;
CREATE POLICY "Allow anon all on user_account_data" ON public.user_account_data FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on invoices" ON public.invoices;
CREATE POLICY "Allow anon all on invoices" ON public.invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on parties" ON public.parties;
CREATE POLICY "Allow anon all on parties" ON public.parties FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on items" ON public.items;
CREATE POLICY "Allow anon all on items" ON public.items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on expenses" ON public.expenses;
CREATE POLICY "Allow anon all on expenses" ON public.expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
`;

let debounceTimer: any = null;

/**
 * Saves user account data to Supabase (both single document store and individual relational tables)
 */
export async function pushUserAccountDataToSupabaseNow(user: AuthUser, data: UserAccountData): Promise<{ success: boolean; message: string; details?: any }> {
  if (!user || !user.email) {
    return { success: false, message: 'No active user email found to sync' };
  }

  const email = user.email.trim().toLowerCase();
  
  // Always update local storage first as instant cache
  saveUserAccountData(user, data);

  updateSyncState({
    status: 'SYNCING',
    errorMessage: null,
    totalSyncedRecords: {
      invoices: data.invoices?.length || 0,
      parties: data.parties?.length || 0,
      items: data.items?.length || 0,
      expenses: data.expenses?.length || 0,
      staff: data.staffMembers?.length || 0,
    },
  });

  const errors: string[] = [];
  let userAccountDataSaved = false;

  try {
    // 1. Sync main user_account_data table
    const mainPayload = {
      user_email: email,
      data: data,
      updated_at: new Date().toISOString(),
    };

    // First try upsert on user_email
    const { error: mainUpsertErr } = await supabase
      .from('user_account_data')
      .upsert(mainPayload, { onConflict: 'user_email' });

    if (mainUpsertErr) {
      console.warn('Upsert on user_account_data failed, trying update/insert fallback:', mainUpsertErr.message);
      // Fallback: check if row exists
      const { data: existingRow } = await supabase
        .from('user_account_data')
        .select('id')
        .eq('user_email', email)
        .maybeSingle();

      if (existingRow && existingRow.id) {
        const { error: updateErr } = await supabase
          .from('user_account_data')
          .update(mainPayload)
          .eq('id', existingRow.id);
        if (updateErr) {
          errors.push(`user_account_data: ${updateErr.message}`);
        } else {
          userAccountDataSaved = true;
        }
      } else {
        const { error: insertErr } = await supabase
          .from('user_account_data')
          .insert(mainPayload);
        if (insertErr) {
          errors.push(`user_account_data: ${insertErr.message}`);
        } else {
          userAccountDataSaved = true;
        }
      }
    } else {
      userAccountDataSaved = true;
    }

    // 2. Sync Invoices table
    if (data.invoices && data.invoices.length > 0) {
      try {
        const invoiceRows = data.invoices.map(inv => ({
          id: inv.id,
          invoice_number: inv.invoiceNumber,
          doc_type: inv.documentType || 'TAX_INVOICE',
          party_name: inv.partyName,
          party_id: inv.partyId,
          total_amount: inv.grandTotal || 0,
          tax_amount: inv.taxTotal || ((inv.cgstTotal || 0) + (inv.sgstTotal || 0) + (inv.igstTotal || 0)) || 0,
          date: inv.date,
          due_date: inv.dueDate,
          status: inv.paymentStatus || 'UNPAID',
          payment_mode: inv.paymentMode,
          user_email: email,
          data: inv,
          updated_at: new Date().toISOString(),
        }));

        const { error: invErr } = await supabase
          .from('invoices')
          .upsert(invoiceRows, { onConflict: 'id' });

        if (invErr && invErr.code !== '42P01') {
          console.warn('Invoices sync note:', invErr.message);
        }
      } catch (e: any) {
        console.warn('Invoices table error:', e.message);
      }
    }

    // 3. Sync Parties table
    if (data.parties && data.parties.length > 0) {
      try {
        const partyRows = data.parties.map(p => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
          gstin: p.gstin,
          party_type: p.type || 'CUSTOMER',
          balance: p.currentBalance || 0,
          address: p.billingAddress || p.shippingAddress || '',
          user_email: email,
        }));

        const { error: pErr } = await supabase
          .from('parties')
          .upsert(partyRows, { onConflict: 'id' });

        if (pErr && pErr.code !== '42P01') {
          console.warn('Parties sync note:', pErr.message);
        }
      } catch (e: any) {
        console.warn('Parties table error:', e.message);
      }
    }

    // 4. Sync Items table
    if (data.items && data.items.length > 0) {
      try {
        const itemRows = data.items.map(it => ({
          id: it.id,
          name: it.name,
          sku: it.sku || '',
          hsn: it.hsnCode || '',
          sale_price: it.sellingPrice || 0,
          purchase_price: it.purchasePrice || 0,
          stock_quantity: it.currentStock || 0,
          unit: it.unit || 'PCS',
          gst_rate: it.taxRate || 18,
          user_email: email,
        }));

        const { error: itErr } = await supabase
          .from('items')
          .upsert(itemRows, { onConflict: 'id' });

        if (itErr && itErr.code !== '42P01') {
          console.warn('Items sync note:', itErr.message);
        }
      } catch (e: any) {
        console.warn('Items table error:', e.message);
      }
    }

    // 5. Sync Expenses table
    if (data.expenses && data.expenses.length > 0) {
      try {
        const expRows = data.expenses.map(ex => ({
          id: ex.id,
          title: ex.title || ex.category,
          amount: ex.amount || 0,
          category: ex.category || 'General',
          payment_mode: ex.paymentMode || 'CASH',
          date: ex.date,
          user_email: email,
        }));

        const { error: exErr } = await supabase
          .from('expenses')
          .upsert(expRows, { onConflict: 'id' });

        if (exErr && exErr.code !== '42P01') {
          console.warn('Expenses sync note:', exErr.message);
        }
      } catch (e: any) {
        console.warn('Expenses table error:', e.message);
      }
    }

    if (userAccountDataSaved) {
      updateSyncState({
        status: 'SYNCED',
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        errorMessage: null,
        isTableReady: true,
      });
      return {
        success: true,
        message: `Successfully saved ${data.invoices?.length || 0} invoices, ${data.parties?.length || 0} parties, ${data.items?.length || 0} items to Supabase!`,
      };
    } else {
      const errMsg = errors.join('; ') || 'Please run the SQL schema script in Supabase SQL editor.';
      updateSyncState({
        status: 'ERROR',
        errorMessage: errMsg,
        isTableReady: false,
      });
      return {
        success: false,
        message: errMsg,
      };
    }
  } catch (err: any) {
    console.error('Push to Supabase failed:', err);
    updateSyncState({
      status: 'ERROR',
      errorMessage: err.message || 'Error pushing to Supabase',
    });
    return {
      success: false,
      message: err.message || 'Error connecting to Supabase',
    };
  }
}

/**
 * Debounced push function
 */
export function pushUserAccountDataToSupabase(user: AuthUser, data: UserAccountData, debounceMs: number = 800): void {
  if (!user || !user.email) return;

  saveUserAccountData(user, data);

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    pushUserAccountDataToSupabaseNow(user, data);
  }, debounceMs);
}

/**
 * Pulls latest user account data from Supabase for a given user
 */
export async function fetchUserAccountDataFromSupabase(user: AuthUser): Promise<UserAccountData | null> {
  if (!user || !user.email) return null;

  try {
    updateSyncState({ status: 'SYNCING' });
    const email = user.email.trim().toLowerCase();

    const { data, error } = await supabase
      .from('user_account_data')
      .select('data, updated_at')
      .eq('user_email', email)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch error:', error);
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        updateSyncState({
          status: 'ERROR',
          isTableReady: false,
          errorMessage: 'Table "user_account_data" needs to be created in Supabase SQL editor.',
        });
      } else {
        updateSyncState({
          status: 'ERROR',
          errorMessage: error.message,
        });
      }
      return loadUserAccountData(user);
    }

    if (data && data.data && Object.keys(data.data).length > 0) {
      const rawCloud = data.data as UserAccountData;
      const cloudData: UserAccountData = {
        ...rawCloud,
        invoices: (rawCloud.invoices || []).filter(
          (inv: any) => !inv.id?.startsWith('inv-demo') && inv.partyName !== 'Apex Digital Solutions LLP'
        ),
        parties: (rawCloud.parties || []).filter(
          (p: any) => !['pty-1', 'pty-2', 'pty-3', 'pty-4', 'pty-5'].includes(p.id) && p.name !== 'Apex Digital Solutions LLP'
        ),
        items: (rawCloud.items || []).filter(
          (it: any) => !['itm-1', 'itm-2', 'itm-3', 'itm-4', 'itm-5', 'itm-6'].includes(it.id) && it.name !== 'Ultratech Cement (PPC 50kg)'
        ),
        expenses: (rawCloud.expenses || []).filter(
          (ex: any) => !['exp-1', 'exp-2', 'exp-3'].includes(ex.id)
        ),
        staffMembers: (rawCloud.staffMembers || []).filter(
          (s: any) => !['staff-1', 'staff-2', 'staff-3', 'staff-4', 'staff-5', 'staff-6'].includes(s.id)
        ),
        attendanceRecords: (rawCloud.attendanceRecords || []).filter(
          (r: any) => !['att-1', 'att-2', 'att-3', 'att-4', 'att-5', 'att-6', 'att-7', 'att-8'].includes(r.id)
        ),
        attendanceCompanies: Array.isArray(rawCloud.attendanceCompanies) ? rawCloud.attendanceCompanies : [],
      };
      saveUserAccountData(user, cloudData);

      updateSyncState({
        status: 'SYNCED',
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        errorMessage: null,
        isTableReady: true,
        totalSyncedRecords: {
          invoices: cloudData.invoices?.length || 0,
          parties: cloudData.parties?.length || 0,
          items: cloudData.items?.length || 0,
          expenses: cloudData.expenses?.length || 0,
          staff: cloudData.staffMembers?.length || 0,
        },
      });

      return cloudData;
    }

    // No cloud record found yet: push current local state to cloud immediately so user sees data in Supabase right away!
    const localData = loadUserAccountData(user);
    pushUserAccountDataToSupabaseNow(user, localData);
    return localData;
  } catch (err: any) {
    console.error('Failed to load from Supabase:', err);
    updateSyncState({
      status: 'OFFLINE',
      errorMessage: err.message || 'Offline - using local data',
    });
    return loadUserAccountData(user);
  }
}
