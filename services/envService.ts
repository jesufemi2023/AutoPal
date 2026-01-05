
import { getEnv } from '../shared/utils.ts';

/**
 * AutoPal Environment Configuration
 * Centralizes all infrastructure and logic-driving variables.
 */
export const ENV = {
  // Infrastructure
  SUPABASE_URL: getEnv('SUPABASE_URL') || '',
  SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY') || '',
  
  // Core AI (Reserved for Auth/Chat but stripped of garage logic)
  API_KEY: getEnv('API_KEY'), 
  MOCK_AI: getEnv('MOCK_AI') === 'true',

  // Feature Flags & Limits
  ENABLE_PREMIUM_AI: getEnv('ENABLE_PREMIUM_AI') === 'true',
  MAX_VEHICLES_FREE: parseInt(getEnv('MAX_VEHICLES_FREE') || '1'),
  MAX_VEHICLES_STANDARD: parseInt(getEnv('MAX_VEHICLES_STANDARD') || '3'),
  MAX_VEHICLES_PREMIUM: parseInt(getEnv('MAX_VEHICLES_PREMIUM') || '10'),
  
  // Content Generation Context
  MAINTENANCE_STEPS: parseInt(getEnv('MAINTENANCE_STEPS') || '5'),
  REGIONAL_CONTEXT: getEnv('REGIONAL_CONTEXT') || 'Nigerian roads and tropical climate',
  CURRENCY: getEnv('CURRENCY') || 'NGN',
};

/**
 * Validates availability of core keys to prevent app-wide failures.
 */
export const validateEnv = () => {
  const critical = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = critical.filter(key => !(ENV as any)[key]);
  
  if (missing.length > 0) {
    console.error(`[AutoPal NG] CRITICAL CONFIG MISSING: ${missing.join(', ')}`);
  }
};
