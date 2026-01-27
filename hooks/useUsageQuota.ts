import { useMemo, useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { CapabilityKey, UsageQuota } from '../shared/types.ts';
import { getTierCapability } from '../services/capabilityService.ts';
import { getMonthlyUsageCount } from '../services/usageService.ts';

/**
 * useUsageQuota Hook
 * Performance: Uses lastBillingResetAt to define the usage cycle.
 */
export const useUsageQuota = (capability: CapabilityKey) => {
  const { user, vehicles, fuelLogs, serviceLogs, activeVehicleId } = useAutoPalStore();
  const [asyncUsage, setAsyncUsage] = useState(0);

  const tier = user?.tier || 'free';
  const limit = getTierCapability(tier, capability);
  const anchor = user?.lastBillingResetAt;

  // License Validity Check
  const isLicenseExpired = useMemo(() => {
    if (!user?.licenseExpiresAt) return false;
    return new Date(user.licenseExpiresAt) < new Date();
  }, [user?.licenseExpiresAt]);

  useEffect(() => {
    if (user?.id && (capability === 'AI_MECHANIC_MONTHLY' || capability === 'AI_SCAN_MONTHLY')) {
      getMonthlyUsageCount(user.id, capability.toLowerCase(), anchor).then(setAsyncUsage);
    }
  }, [user?.id, capability, anchor]);

  const currentUsage = useMemo(() => {
    // If no anchor exists, fallback to 30 days
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() - 30);
    const resetDate = anchor ? new Date(anchor) : fallbackDate;

    switch (capability) {
      case 'MAX_VEHICLES':
        return vehicles.filter(v => v.status === 'active').length;
      
      case 'FUEL_LOGS_MONTHLY':
        if (!activeVehicleId) return 0;
        // Cycle-based: Count only logs created AFTER the reset anchor
        return fuelLogs.filter(l => 
          l.vehicleId === activeVehicleId && 
          new Date(l.createdAt) >= resetDate
        ).length;
      
      case 'SERVICE_LOGS_MONTHLY':
        if (!activeVehicleId) return 0;
        // Cycle-based: Resets on upgrade/renewal anchor
        return serviceLogs.filter(l => 
          l.vehicleId === activeVehicleId && 
          (l.createdAt ? new Date(l.createdAt) >= resetDate : true)
        ).length;
      
      case 'AI_MECHANIC_MONTHLY':
      case 'AI_SCAN_MONTHLY':
        return asyncUsage;
      
      default:
        return 0;
    }
  }, [capability, vehicles, fuelLogs, serviceLogs, asyncUsage, activeVehicleId, anchor]);

  const quota: UsageQuota = {
    feature: capability,
    current: currentUsage,
    limit: typeof limit === 'number' ? limit : 0,
    isExhausted: isLicenseExpired || (typeof limit === 'number' ? currentUsage >= limit : !limit)
  };

  return quota;
};