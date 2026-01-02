
import { Tier } from '../shared/types.ts';
import { ENV } from './envService.ts';

/**
 * AutoPal Configuration Registry
 * Orchestrates tiered limits and system constants driven by Environment Variables.
 */

interface TierConfig {
  maxVehicles: number;
  maxImagesPerVehicle: number;
  canUsePremiumAI: boolean;
  syncFrequencyDays: number;
  mileageSyncDelta: number;
}

const TIER_MAP: Record<Tier, TierConfig> = {
  free: {
    maxVehicles: ENV.MAX_VEHICLES_FREE,
    maxImagesPerVehicle: 2,
    canUsePremiumAI: false,
    syncFrequencyDays: 7,
    mileageSyncDelta: 500
  },
  standard: {
    maxVehicles: ENV.MAX_VEHICLES_STANDARD,
    maxImagesPerVehicle: 3,
    canUsePremiumAI: false,
    syncFrequencyDays: 3,
    mileageSyncDelta: 200
  },
  premium: {
    maxVehicles: ENV.MAX_VEHICLES_PREMIUM,
    maxImagesPerVehicle: 5,
    canUsePremiumAI: ENV.ENABLE_PREMIUM_AI,
    syncFrequencyDays: 1,
    mileageSyncDelta: 50
  }
};

export const getConfig = (tier: Tier = 'free'): TierConfig => {
  return TIER_MAP[tier] || TIER_MAP.free;
};

export const APP_LIMITS = {
  IMAGE_MAX_WIDTH: 1024,
  IMAGE_QUALITY: 0.6,
  MAX_STORAGE_PER_USER_MB: 50,
  AI_MODEL_FLASH: 'gemini-3-flash-preview',
  AI_MODEL_PRO: 'gemini-3-pro-preview'
};
