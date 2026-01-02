
import { getEnv } from '../shared/utils.ts';

/**
 * AutoPal Environment & Configuration Service
 * Single source of truth for all app settings. 
 * Customize these via process.env or the index.html shim.
 */
export const ENV = {
  // Supabase Infrastructure
  SUPABASE_URL: getEnv('SUPABASE_URL') || '',
  SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY') || '',
  
  // AI Config
  API_KEY: process.env.API_KEY || '',
  // Added missing ENABLE_PREMIUM_AI property to resolve "Property does not exist on type" errors
  ENABLE_PREMIUM_AI: getEnv('ENABLE_PREMIUM_AI') === 'true',
  MODEL_FLASH: getEnv('AI_MODEL_FLASH') || 'gemini-3-flash-preview',
  MODEL_PRO: getEnv('AI_MODEL_PRO') || 'gemini-3-pro-preview',
  MOCK_AI: getEnv('MOCK_AI') === 'true', // Set to true locally to save API costs
  
  // Business Tier Limits
  MAX_VEHICLES_FREE: parseInt(getEnv('MAX_VEHICLES_FREE') || '1'),
  MAX_VEHICLES_STANDARD: parseInt(getEnv('MAX_VEHICLES_STANDARD') || '3'),
  MAX_VEHICLES_PREMIUM: parseInt(getEnv('MAX_VEHICLES_PREMIUM') || '10'),
  
  // UI Constants
  HEALTH_CRITICAL_THRESHOLD: 50,
  HEALTH_GOOD_THRESHOLD: 80,
  DEFAULT_CURRENCY: 'NGN',
  LOCALE: 'en-NG',
  
  // Intelligence Context
  REGIONAL_CONTEXT: getEnv('REGIONAL_CONTEXT') || 'Nigeria (Extreme heat, high dust, stop-and-go urban traffic)',
  MAINTENANCE_STEPS: 5,
};

export const validateEnv = () => {
  const critical = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'API_KEY'];
  const missing = critical.filter(key => !(ENV as any)[key]);
  if (missing.length > 0 && !ENV.MOCK_AI) {
    console.warn(`[AutoPal NG] Missing critical config: ${missing.join(', ')}`);
  }
};
