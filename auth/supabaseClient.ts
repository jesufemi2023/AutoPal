
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.39.7';

/**
 * Supabase Client Initialization
 * Credentials are pulled from the window.process.env shim or actual process.env.
 */
const getSupabaseConfig = () => {
  // Check window shim first (for preview/local), then standard process.env (for Vercel/Node)
  const url = (window as any).process?.env?.SUPABASE_URL || process.env.SUPABASE_URL;
  const key = (window as any).process?.env?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  return { url, key };
};

const config = getSupabaseConfig();

export const isSupabaseConfigured = !!(config.url && config.key);

export const supabase = isSupabaseConfigured 
  ? createClient(config.url as string, config.key as string) 
  : null;
