import { supabase } from './supabaseClient.ts';

/**
 * Authentication Service Wrapper
 * Abstracts Supabase Auth logic to allow for potential future migration
 * to other providers (Firebase, Auth0) without breaking components.
 */

const ensureClient = () => {
  if (!supabase) throw new Error("Supabase is not configured. Missing Environment Variables.");
  return supabase;
};

/** Standard Email/Password Sign Up */
export const signUp = async (email: string, password: string) => {
  const client = ensureClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        tier: 'free',
        role: 'user',
        onboarded: false,
      },
    },
  });
  if (error) throw error;
  return data;
};

/** Standard Email/Password Sign In */
export const signIn = async (email: string, password: string) => {
  const client = ensureClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

/** Password Recovery: Trigger secure email link */
export const sendPasswordResetEmail = async (email: string) => {
  const client = ensureClient();
  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}`,
  });
  if (error) throw error;
  return data;
};

/** Password Recovery: Set final password */
export const updatePassword = async (newPassword: string) => {
  const client = ensureClient();
  const { data, error } = await client.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
};

/**
 * Google OAuth Flow
 * Automatically redirects to Google's consent screen.
 * Callback handled by Supabase, then redirected back to App origin.
 */
export const signInWithGoogle = async () => {
  const client = ensureClient();
  const redirectTo = window.location.origin;
  
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });
  if (error) throw error;
  return data;
};

/** Clear user session */
export const signOut = async () => {
  const client = ensureClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
};

/** Fetch existing session on app boot */
export const getSession = async () => {
  if (!supabase) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};