import { Tier, CapabilityKey } from '../shared/types.ts';

/**
 * AutoPal NG Capability Registry
 * Centralized mapping of features to their tiered constraints.
 * Aligned with the PostgreSQL 'fn_auto_pal_governor' trigger logic.
 */

type CapabilityValue = number | boolean;

export const CAPABILITIES: Record<Tier, Record<CapabilityKey, CapabilityValue>> = {
  free: {
    MAX_VEHICLES: 1,
    FUEL_LOGS_MONTHLY: 2,
    AI_MECHANIC_MONTHLY: 1,
    AI_SCAN_MONTHLY: 1,
    SERVICE_LOGS_TOTAL: 4,
    EXPORT_PDF: false,
    EXPORT_EXCEL: false,
    OWNERSHIP_REPORT: false,
    RENEWABLE_LICENSE: false,
  },
  standard: {
    MAX_VEHICLES: 3,
    FUEL_LOGS_MONTHLY: 7,
    AI_MECHANIC_MONTHLY: 4,
    AI_SCAN_MONTHLY: 4,
    SERVICE_LOGS_TOTAL: 8,
    EXPORT_PDF: true,
    EXPORT_EXCEL: true,
    OWNERSHIP_REPORT: false,
    RENEWABLE_LICENSE: true,
  },
  premium: {
    MAX_VEHICLES: 10,
    FUEL_LOGS_MONTHLY: 999, // Unrestricted in Governor
    AI_MECHANIC_MONTHLY: 8,
    AI_SCAN_MONTHLY: 999,   // Unrestricted in Governor
    SERVICE_LOGS_TOTAL: 100, // Aligned with SQL limit
    EXPORT_PDF: true,
    EXPORT_EXCEL: true,
    OWNERSHIP_REPORT: true,
    RENEWABLE_LICENSE: true,
  }
};

export const getTierCapability = (tier: Tier, key: CapabilityKey): CapabilityValue => {
  return CAPABILITIES[tier]?.[key] ?? CAPABILITIES.free[key];
};