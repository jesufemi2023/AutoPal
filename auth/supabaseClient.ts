
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.39.7';

/**
 * Supabase Client Initialization
 * Credentials are pulled from the window.process.env shim.
 */
const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL || (window as any).process?.env?.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || (window as any).process?.env?.SUPABASE_ANON_KEY;
  return { url, key };
};

const config = getSupabaseConfig();

export const isSupabaseConfigured = !!(config.url && config.key);

export const supabase = isSupabaseConfigured 
  ? createClient(config.url as string, config.key as string) 
  : null;
