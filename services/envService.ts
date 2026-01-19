
import { getEnv } from '../shared/utils.ts';

/**
 * AutoPal Environment Registry
 * This is the single source of truth for all infrastructure and feature flags.
 */
export const ENV = {
  // Infrastructure
  SUPABASE_URL: getEnv('SUPABASE_URL') || '',
  SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY') || '',
  
  // AI Keys (Always use process.env.API_KEY directly for GoogleGenAI)
  MOCK_AI: getEnv('MOCK_AI') === 'true',

  // Feature Configuration
  MAINTENANCE_STEPS: parseInt(getEnv('MAINTENANCE_STEPS') || '5'),
  
  // Logic Parameters
  REGIONAL_CONTEXT: getEnv('REGIONAL_CONTEXT') || 'Nigeria',
  CURRENCY: getEnv('CURRENCY') || 'NGN',

  /** Fix: Added missing tiered limits used by configService */
  MAX_VEHICLES_FREE: parseInt(getEnv('MAX_VEHICLES_FREE') || '1'),
  MAX_VEHICLES_STANDARD: parseInt(getEnv('MAX_VE_STANDARD') || '3'),
  MAX_VEHICLES_PREMIUM: parseInt(getEnv('MAX_VE_PREMIUM') || '10'),
  ENABLE_PREMIUM_AI: getEnv('ENABLE_PREMIUM_AI') === 'true',
};

/**
 * Validates essential infrastructure keys.
 */
export const validateEnv = (): { isValid: boolean; missing: string[] } => {
  const critical = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = critical.filter(key => !(ENV as any)[key]);
  
  if (missing.length > 0) {
    console.error(`[AutoPal NG] CRITICAL CONFIG MISSING: ${missing.join(', ')}`);
  }
  
  return {
    isValid: missing.length === 0,
    missing
  };
};
