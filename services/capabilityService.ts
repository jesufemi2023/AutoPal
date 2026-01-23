import { Tier, CapabilityKey } from '../shared/types.ts';
import { ENV } from './envService.ts';

/**
 * AutoPal NG Capability Registry
 * Centralized mapping of features to their tiered constraints.
 * REFACTORED: Driven by ENV variables for high customizability and zero hardcoding.
 */

type CapabilityValue = number | boolean;

export const CAPABILITIES: Record<Tier, Record<CapabilityKey, CapabilityValue>> = {
  free: {
    MAX_VEHICLES: ENV.MAX_VEHICLES_FREE,
    FUEL_LOGS_MONTHLY: ENV.MAX_FUEL_FREE,
    AI_MECHANIC_MONTHLY: ENV.MAX_AI_SCAN_FREE,
    AI_SCAN_MONTHLY: ENV.MAX_AI_SCAN_FREE,
    SERVICE_LOGS_MONTHLY: ENV.MAX_LOGS_FREE,
    EXPORT_PDF: false,
    EXPORT_EXCEL: false,
    OWNERSHIP_REPORT: false,
    RENEWABLE_LICENSE: ENV.RENEWABLE_FREE,
  },
  standard: {
    MAX_VEHICLES: ENV.MAX_VEHICLES_STANDARD,
    FUEL_LOGS_MONTHLY: ENV.MAX_FUEL_STANDARD,
    AI_MECHANIC_MONTHLY: ENV.MAX_AI_SCAN_STANDARD,
    AI_SCAN_MONTHLY: ENV.MAX_AI_SCAN_STANDARD,
    SERVICE_LOGS_MONTHLY: ENV.MAX_LOGS_STANDARD,
    EXPORT_PDF: true,
    EXPORT_EXCEL: true,
    OWNERSHIP_REPORT: false,
    RENEWABLE_LICENSE: ENV.RENEWABLE_STANDARD,
  },
  premium: {
    MAX_VEHICLES: ENV.MAX_VEHICLES_PREMIUM,
    FUEL_LOGS_MONTHLY: 999,
    AI_MECHANIC_MONTHLY: 8,
    AI_SCAN_MONTHLY: 999,
    SERVICE_LOGS_MONTHLY: 999,
    EXPORT_PDF: true,
    EXPORT_EXCEL: true,
    OWNERSHIP_REPORT: true,
    RENEWABLE_LICENSE: ENV.RENEWABLE_PREMIUM,
  }
};

export const getTierCapability = (tier: Tier, key: CapabilityKey): CapabilityValue => {
  return CAPABILITIES[tier]?.[key] ?? CAPABILITIES.free[key];
};