import { createClient } from '@supabase/supabase-js';

export const SUPABASE_PROJECT_ID = 'sruhxttpxijynxnhrlzx';
export const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_frnOJxnWNWkL9aAVtD9C6Q_cDD2nyt_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Tests connection to the Supabase backend
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    // Attempt a light ping or read from user_account_data or auth session
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('user_account_data')
      .select('id, user_email, updated_at')
      .limit(1);

    const latency = Date.now() - startTime;

    if (error) {
      // If table doesn't exist yet, but Supabase endpoint responded with a valid PostgreSQL error code like 42P01 (relation does not exist)
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return {
          success: true,
          message: `Connected to Supabase (Table user_account_data needs creation - latency ${latency}ms)`,
          details: { tableMissing: true, error: error.message },
        };
      }
      return {
        success: false,
        message: error.message || 'Supabase returned an error',
        details: error,
      };
    }

    return {
      success: true,
      message: `Successfully connected to Supabase (${latency}ms latency)`,
      details: { rowCount: data ? data.length : 0 },
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error connecting to Supabase',
      details: err,
    };
  }
}
