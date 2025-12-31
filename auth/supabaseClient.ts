
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { getEnv } from '../shared/utils.ts';

/**
 * Supabase Client Initialization
 * Credentials are pulled from the window.process.env shim or actual process.env.
 */
const url = getEnv('SUPABASE_URL');
const key = getEnv('SUPABASE_ANON_KEY');

export const isSupabaseConfigured = !!(url && key);

export const supabase = isSupabaseConfigured 
  ? createClient(url as string, key as string) 
  : null;
