import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { AuthUser } from '../types';

/**
 * Converts a Supabase Auth User object into the application's AuthUser structure.
 */
export function mapSupabaseUserToAuthUser(user: User): AuthUser {
  const metadata = user.user_metadata || {};
  const name = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'User';
  const businessName = metadata.business_name || '';
  const phone = metadata.phone || user.phone || '';
  const avatarUrl = metadata.avatar_url || metadata.picture || '';
  const provider = (user.app_metadata?.provider as any) || (user.identities && user.identities[0]?.provider) || 'email';

  return {
    id: user.id,
    name,
    email: user.email || '',
    role: metadata.role || 'admin',
    businessName,
    phone,
    avatarUrl,
    provider: provider === 'google' ? 'google' : 'email',
    createdAt: user.created_at || new Date().toISOString(),
  };
}

/**
 * Signs up a new user with Email and Password using Supabase Auth.
 * Additional details like Full Name, Business Name, and Phone are stored in Supabase user_metadata.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  extraData?: { fullName?: string; businessName?: string; phone?: string }
): Promise<{ user: AuthUser | null; session: Session | null; error: Error | null; requiresEmailConfirmation?: boolean }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          full_name: extraData?.fullName?.trim() || '',
          business_name: extraData?.businessName?.trim() || '',
          phone: extraData?.phone?.trim() || '',
        },
      },
    });

    if (error) {
      return { user: null, session: null, error };
    }

    const authUser = data.user ? mapSupabaseUserToAuthUser(data.user) : null;
    const requiresEmailConfirmation = !data.session && Boolean(data.user);

    return {
      user: authUser,
      session: data.session,
      error: null,
      requiresEmailConfirmation,
    };
  } catch (err: any) {
    return { user: null, session: null, error: err };
  }
}

/**
 * Signs in an existing user with Email and Password using Supabase Auth.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; session: Session | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      return { user: null, session: null, error };
    }

    const authUser = data.user ? mapSupabaseUserToAuthUser(data.user) : null;
    return { user: authUser, session: data.session, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: err };
  }
}

/**
 * Signs in with Google OAuth using Supabase Auth.
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Signs out the current logged-in user from Supabase.
 */
export async function signOutUser(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Sends a Password Reset Link to the specified email using Supabase Auth.
 */
export async function sendPasswordResetEmail(email: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}?reset_password=true`,
    });
    return { error };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Updates the password for the current user (used after following recovery link).
 */
export async function updatePassword(newPassword: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Retrieves current Supabase session.
 */
export async function getSupabaseSession(): Promise<Session | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch (e) {
    console.error('Error fetching session:', e);
    return null;
  }
}

/**
 * Subscribes to real-time Supabase Auth state changes (login, logout, token refresh, password recovery).
 */
export function subscribeToAuthState(
  callback: (event: AuthChangeEvent, session: Session | null, user: AuthUser | null) => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    const authUser = session?.user ? mapSupabaseUserToAuthUser(session.user) : null;
    callback(event, session, authUser);
  });

  return subscription;
}
