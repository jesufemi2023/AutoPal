
import { getEnv } from '../shared/utils.ts';

/**
 * Environment Service
 * Strictly handles environment variable extraction and mapping.
 */
export const ENV = {
  // Supabase Config
  SUPABASE_URL: getEnv('SUPABASE_URL') || '',
  SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY') || '',
  
  // AI Config
  API_KEY: process.env.API_KEY || getEnv('API_KEY') || '',
  ENABLE_PREMIUM_AI: getEnv('ENABLE_PREMIUM_AI') === 'true',
  
  // App Limits (Customizable via ENV)
  MAX_VEHICLES_FREE: parseInt(getEnv('MAX_VEHICLES_FREE') || '1'),
  MAX_VEHICLES_STANDARD: parseInt(getEnv('MAX_VEHICLES_STANDARD') || '3'),
  MAX_VEHICLES_PREMIUM: parseInt(getEnv('MAX_VEHICLES_PREMIUM') || '99'),
  
  // Mode Toggles
  OFFLINE_FIRST: getEnv('OFFLINE_FIRST') !== 'false',
  DEBUG_MODE: getEnv('DEBUG_MODE') === 'true',
};

export const validateEnv = () => {
  const missing = [];
  if (!ENV.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!ENV.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
  if (!ENV.API_KEY) missing.push('API_KEY');
  
  if (missing.length > 0) {
    console.warn(`[AutoPal NG] Missing critical env variables: ${missing.join(', ')}`);
  }
};
