
import { supabase } from './supabaseClient.ts';

/**
 * Auth Service
 * High-level wrappers for Supabase Auth operations.
 */

const ensureClient = () => {
  if (!supabase) throw new Error("Supabase is not configured. Please check your environment variables.");
  return supabase;
};

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

export const signIn = async (email: string, password: string) => {
  const client = ensureClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const sendPasswordResetEmail = async (email: string) => {
  const client = ensureClient();
  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}`,
  });
  if (error) throw error;
  return data;
};

export const updatePassword = async (newPassword: string) => {
  const client = ensureClient();
  const { data, error } = await client.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
};

export const signInWithGoogle = async () => {
  const client = ensureClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const client = ensureClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
};

export const getSession = async () => {
  if (!supabase) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};
