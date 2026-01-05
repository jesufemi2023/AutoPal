import { getEnv } from '../shared/utils.ts';

/**
 * AutoPal Environment Registry
 * This is the single source of truth for all infrastructure and feature flags.
 * It uses the utility getEnv to pull from process.env or window shims.
 */
export const ENV = {
  // Infrastructure
  SUPABASE_URL: getEnv('SUPABASE_URL') || '',
  SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY') || '',
  
  // AI Keys (Always use process.env.API_KEY directly for GoogleGenAI)
  MOCK_AI: getEnv('MOCK_AI') === 'true',

  // Feature Limits
  ENABLE_PREMIUM_AI: getEnv('ENABLE_PREMIUM_AI') === 'true',
  // Fix: Added MAINTENANCE_STEPS required for prompt generation logic
  MAINTENANCE_STEPS: parseInt(getEnv('MAINTENANCE_STEPS') || '5'),
  MAX_VEHICLES_FREE: parseInt(getEnv('MAX_VEHICLES_FREE') || '1'),
  MAX_VEHICLES_STANDARD: parseInt(getEnv('MAX_VEHICLES_STANDARD') || '3'),
  MAX_VEHICLES_PREMIUM: parseInt(getEnv('MAX_VEHICLES_PREMIUM') || '10'),
  
  // Logic Parameters
  REGIONAL_CONTEXT: getEnv('REGIONAL_CONTEXT') || 'Nigeria',
  CURRENCY: getEnv('CURRENCY') || 'NGN',
};

/**
 * Validates that essential infrastructure keys are present.
 * Fails gracefully to prevent app-wide crashes.
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
