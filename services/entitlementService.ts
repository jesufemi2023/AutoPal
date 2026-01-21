
import { Tier, MarketplaceAccess } from '../shared/types.ts';

/**
 * AutoPal NG Capability Matrix
 * Isolated configuration for all plan limits as per Product Spec v4.0.
 */
export const TIER_REGISTRY = {
  free: {
    maxVehicles: 1,
    monthlyServiceLogs: 4,
    monthlyFuelLogs: 2,
    monthlyAiScans: 1,        
    monthlyAiDiagnostics: 1,  
    canExportReports: false,
    marketplaceAccess: 'basic' as MarketplaceAccess,
    ownershipReportMode: 'locked' as 'locked' | 'blur' | 'full',
  },
  standard: {
    maxVehicles: 3,
    monthlyServiceLogs: 12,
    monthlyFuelLogs: 8,
    monthlyAiScans: 4,
    monthlyAiDiagnostics: 4,
    canExportReports: true,
    marketplaceAccess: 'standard' as MarketplaceAccess,
    ownershipReportMode: 'blur' as 'locked' | 'blur' | 'full',
  },
  premium: {
    maxVehicles: 999, // Unlimited effectively
    monthlyServiceLogs: 9999, 
    monthlyFuelLogs: 9999,
    monthlyAiScans: 7,
    monthlyAiDiagnostics: 8,
    canExportReports: true,
    marketplaceAccess: 'premium' as MarketplaceAccess,
    ownershipReportMode: 'full' as 'locked' | 'blur' | 'full',
  }
};

export type Capability = keyof typeof TIER_REGISTRY.free;

export class EntitlementEngine {
  static getLimit(tier: Tier, cap: Capability) {
    return TIER_REGISTRY[tier][cap];
  }

  static canAddVehicle(tier: Tier, currentCount: number): boolean {
    const limit = this.getLimit(tier, 'maxVehicles') as number;
    return currentCount < limit;
  }

  static canAddServiceLog(tier: Tier, logsThisMonth: number): boolean {
    const limit = this.getLimit(tier, 'monthlyServiceLogs') as number;
    return logsThisMonth < limit;
  }

  static canAddFuelLog(tier: Tier, logsThisMonth: number): boolean {
    const limit = this.getLimit(tier, 'monthlyFuelLogs') as number;
    return logsThisMonth < limit;
  }

  static canRunAiScan(tier: Tier, scansThisMonth: number): boolean {
    const limit = this.getLimit(tier, 'monthlyAiScans') as number;
    return scansThisMonth < limit;
  }

  static canRunAiDiagnostic(tier: Tier, diagsThisMonth: number): boolean {
    const limit = this.getLimit(tier, 'monthlyAiDiagnostics') as number;
    return diagsThisMonth < limit;
  }

  static getMarketplaceAccess(tier: Tier): MarketplaceAccess {
    return this.getLimit(tier, 'marketplaceAccess') as MarketplaceAccess;
  }
}
