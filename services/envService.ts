
import { getEnv } from '../shared/utils.ts';

/**
 * AutoPal Environment & Configuration Service
 * Single source of truth for all system constants.
 */
export const ENV = {
  // Infrastructure
  SUPABASE_URL: getEnv('SUPABASE_URL') || '',
  SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY') || '',
  
  // Intelligence Config
  // This will check VITE_API_KEY then API_KEY
  API_KEY: getEnv('API_KEY'), 
  MODEL_FLASH: getEnv('AI_MODEL_FLASH') || 'gemini-3-flash-preview',
  MODEL_PRO: getEnv('AI_MODEL_PRO') || 'gemini-3-pro-preview',
  MOCK_AI: getEnv('MOCK_AI') === 'true', // Allows for local testing without API credits
  ENABLE_PREMIUM_AI: getEnv('ENABLE_PREMIUM_AI') === 'true',
  
  // Business Rules
  MAX_VEHICLES_FREE: parseInt(getEnv('MAX_VEHICLES_FREE') || '1'),
  MAX_VEHICLES_STANDARD: parseInt(getEnv('MAX_VEHICLES_STANDARD') || '3'),
  MAX_VEHICLES_PREMIUM: parseInt(getEnv('MAX_VEHICLES_PREMIUM') || '10'),
  
  // Regional Localization (Crucial for maintenance roadmaps)
  REGIONAL_CONTEXT: getEnv('REGIONAL_CONTEXT') || 'Nigeria (Extreme heat, high dust, stop-and-go urban traffic)',
  CURRENCY: getEnv('CURRENCY') || 'NGN',
  LOCALE: getEnv('LOCALE') || 'en-NG',
  
  // Thresholds
  HEALTH_CRITICAL: 50,
  HEALTH_GOOD: 80,
  MAINTENANCE_STEPS: 5,
};

export const validateEnv = () => {
  const critical = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = critical.filter(key => !(ENV as any)[key]);
  
  if (missing.length > 0) {
    console.error(`[AutoPal NG] CRITICAL CONFIG MISSING: ${missing.join(', ')}`);
  }
  
  if (!ENV.API_KEY && !ENV.MOCK_AI) {
    console.warn("[AutoPal NG] API_KEY is missing. Ensure VITE_API_KEY is set in Vercel and you have redeployed.");
  }
};
