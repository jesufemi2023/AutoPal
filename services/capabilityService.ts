import { Tier, CapabilityKey } from '../shared/types.ts';

/**
 * AutoPal NG Capability Registry
 * Centralized mapping of features to their tiered constraints.
 * CALIBRATED: Match exact user specifications for Service Logs and Renewal.
 */

type CapabilityValue = number | boolean;

export const CAPABILITIES: Record<Tier, Record<CapabilityKey, CapabilityValue>> = {
  free: {
    MAX_VEHICLES: 1,
    FUEL_LOGS_MONTHLY: 2,
    AI_MECHANIC_MONTHLY: 1,
    AI_SCAN_MONTHLY: 1,
    SERVICE_LOGS_MONTHLY: 3, // Changed from 4 Total to 3 Monthly
    EXPORT_PDF: false,
    EXPORT_EXCEL: false,
    OWNERSHIP_REPORT: false,
    RENEWABLE_LICENSE: false, // Free tier cannot be renewed
  },
  standard: {
    MAX_VEHICLES: 3,
    FUEL_LOGS_MONTHLY: 7,
    AI_MECHANIC_MONTHLY: 4,
    AI_SCAN_MONTHLY: 4,
    SERVICE_LOGS_MONTHLY: 8, // Changed to 8 Monthly
    EXPORT_PDF: true,
    EXPORT_EXCEL: true,
    OWNERSHIP_REPORT: false,
    RENEWABLE_LICENSE: true, // Standard can be renewed
  },
  premium: {
    MAX_VEHICLES: 10,
    FUEL_LOGS_MONTHLY: 999,
    AI_MECHANIC_MONTHLY: 8,
    AI_SCAN_MONTHLY: 999,
    SERVICE_LOGS_MONTHLY: 999, // Changed from 12 Total to Unlimited
    EXPORT_PDF: true,
    EXPORT_EXCEL: true,
    OWNERSHIP_REPORT: true,
    RENEWABLE_LICENSE: true, // Premium can be renewed
  }
};

export const getTierCapability = (tier: Tier, key: CapabilityKey): CapabilityValue => {
  return CAPABILITIES[tier]?.[key] ?? CAPABILITIES.free[key];
};