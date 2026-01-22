import { useMemo, useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { CapabilityKey, UsageQuota } from '../shared/types.ts';
import { getTierCapability } from '../services/capabilityService.ts';
import { getMonthlyUsageCount } from '../services/usageService.ts';

export const useUsageQuota = (capability: CapabilityKey) => {
  const { user, vehicles, fuelLogs, serviceLogs, activeVehicleId } = useAutoPalStore();
  const [asyncUsage, setAsyncUsage] = useState(0);

  const tier = user?.tier || 'free';
  const limit = getTierCapability(tier, capability);

  useEffect(() => {
    if (user?.id && (capability === 'AI_MECHANIC_MONTHLY' || capability === 'AI_SCAN_MONTHLY')) {
      getMonthlyUsageCount(user.id, capability.toLowerCase()).then(setAsyncUsage);
    }
  }, [user?.id, capability]);

  const currentUsage = useMemo(() => {
    switch (capability) {
      case 'MAX_VEHICLES':
        return vehicles.filter(v => v.status === 'active').length;
      case 'FUEL_LOGS_MONTHLY':
        if (!activeVehicleId) return 0;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return fuelLogs.filter(l => l.vehicleId === activeVehicleId && new Date(l.createdAt) > thirtyDaysAgo).length;
      case 'SERVICE_LOGS_TOTAL':
        if (!activeVehicleId) return 0;
        return serviceLogs.filter(l => l.vehicleId === activeVehicleId).length;
      case 'AI_MECHANIC_MONTHLY':
      case 'AI_SCAN_MONTHLY':
        return asyncUsage;
      default:
        return 0;
    }
  }, [capability, vehicles, fuelLogs, serviceLogs, asyncUsage, activeVehicleId]);

  const quota: UsageQuota = {
    feature: capability,
    current: currentUsage,
    limit: typeof limit === 'number' ? limit : 0,
    isExhausted: typeof limit === 'number' ? currentUsage >= limit : !limit
  };

  return quota;
};