
import { getEnv } from '../shared/utils.ts';

/**
 * AutoPal Environment Registry
 * This is the single source of truth for all infrastructure and feature flags.
 */
export const ENV = {
  // Infrastructure
  SUPABASE_URL: getEnv('SUPABASE_URL') || '',
  SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY') || '',
  PAYSTACK_PUBLIC_KEY: getEnv('PAYSTACK_PUBLIC_KEY') || '',
  
  // AI Keys
  MOCK_AI: getEnv('MOCK_AI') === 'true',

  // Feature Limits (Configurable & Scalable)
  ENABLE_PREMIUM_AI: getEnv('ENABLE_PREMIUM_AI') === 'true',
  MAINTENANCE_STEPS: parseInt(getEnv('MAINTENANCE_STEPS') || '5'),
  
  // Vehicle Caps
  MAX_VEHICLES_FREE: parseInt(getEnv('MAX_VEHICLES_FREE') || '1'),
  MAX_VEHICLES_STANDARD: parseInt(getEnv('MAX_VEHICLES_STANDARD') || '3'),
  MAX_VEHICLES_PREMIUM: parseInt(getEnv('MAX_VEHICLES_PREMIUM') || '10'),
  
  // Service Log Caps (Monthly)
  MAX_LOGS_FREE: parseInt(getEnv('MAX_LOGS_FREE') || '4'),
  MAX_LOGS_STANDARD: parseInt(getEnv('MAX_LOGS_STANDARD') || '8'),
  
  // Fuel Log Caps (Monthly)
  MAX_FUEL_FREE: parseInt(getEnv('MAX_FUEL_FREE') || '2'),
  MAX_FUEL_STANDARD: parseInt(getEnv('MAX_FUEL_STANDARD') || '7'),
  
  // AI Scan Caps (Monthly) - Updated to requested 0/2/4 limits
  MAX_AI_SCAN_FREE: parseInt(getEnv('MAX_AI_SCAN_FREE') || '0'),
  MAX_AI_SCAN_STANDARD: parseInt(getEnv('MAX_AI_SCAN_STANDARD') || '2'),
  MAX_AI_SCAN_PREMIUM: 4,

  // Renewal Configuration
  RENEWABLE_FREE: getEnv('RENEWABLE_FREE') === 'true',
  RENEWABLE_STANDARD: getEnv('RENEWABLE_STANDARD') === 'true',
  RENEWABLE_PREMIUM: getEnv('RENEWABLE_PREMIUM') === 'true',
  
  // Logic Parameters
  REGIONAL_CONTEXT: getEnv('REGIONAL_CONTEXT') || 'Nigeria',
  CURRENCY: getEnv('CURRENCY') || 'NGN',
};

export const validateEnv = (): { isValid: boolean; missing: string[] } => {
  const critical = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'PAYSTACK_PUBLIC_KEY'];
  const missing = critical.filter(key => !(ENV as any)[key]);
  
  if (missing.length > 0) {
    console.warn(`[AutoPal NG] CONFIG ADVISORY: ${missing.join(', ')} is missing.`);
  }
  
  return {
    isValid: missing.length === 0,
    missing
  };
};
