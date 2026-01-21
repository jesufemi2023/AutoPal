
import { Tier, ServiceLog, FuelLog } from '../shared/types.ts';

/**
 * AutoPal NG Capability Matrix
 * Isolated configuration for all plan limits.
 */
export const TIER_REGISTRY = {
  free: {
    maxVehicles: 1,
    monthlyServiceLogs: 4,
    monthlyFuelLogs: 2,
    monthlyAiScans: 1,        // Resale Valuation
    monthlyAiDiagnostics: 1,  // AI Mechanic / Symptom Analysis
    fuelHistoryRetentionDays: 30,
    canExportReports: false,
    marketplaceAccess: 'basic' as const,
  },
  standard: {
    maxVehicles: 3,
    monthlyServiceLogs: 20,
    monthlyFuelLogs: 15,
    monthlyAiScans: 10,
    monthlyAiDiagnostics: 10,
    fuelHistoryRetentionDays: 365,
    canExportReports: true,
    marketplaceAccess: 'full' as const,
  },
  premium: {
    maxVehicles: 99,
    monthlyServiceLogs: 999,
    monthlyFuelLogs: 999,
    monthlyAiScans: 999,
    monthlyAiDiagnostics: 999,
    fuelHistoryRetentionDays: 9999,
    canExportReports: true,
    marketplaceAccess: 'full' as const,
  }
};

export type Capability = keyof typeof TIER_REGISTRY.free;

/**
 * Entitlement Engine
 * Pure logic class to check permissions.
 */
export class EntitlementEngine {
  static getLimit(tier: Tier, cap: Capability) {
    return TIER_REGISTRY[tier][cap];
  }

  static canAddVehicle(tier: Tier, currentCount: number): boolean {
    return currentCount < (this.getLimit(tier, 'maxVehicles') as number);
  }

  static canAddServiceLog(tier: Tier, logsThisMonth: number): boolean {
    return logsThisMonth < (this.getLimit(tier, 'monthlyServiceLogs') as number);
  }

  static canAddFuelLog(tier: Tier, logsThisMonth: number): boolean {
    return logsThisMonth < (this.getLimit(tier, 'monthlyFuelLogs') as number);
  }

  static canRunAiScan(tier: Tier, scansThisMonth: number): boolean {
    return scansThisMonth < (this.getLimit(tier, 'monthlyAiScans') as number);
  }

  static canRunAiDiagnostic(tier: Tier, diagsThisMonth: number): boolean {
    return diagsThisMonth < (this.getLimit(tier, 'monthlyAiDiagnostics') as number);
  }

  static filterHistoryData<T extends { createdAt: string }>(tier: Tier, data: T[]): T[] {
    const days = this.getLimit(tier, 'fuelHistoryRetentionDays') as number;
    if (days >= 999) return data;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return data.filter(item => {
      const date = item.createdAt ? new Date(item.createdAt) : new Date();
      return date >= cutoff;
    });
  }
}
