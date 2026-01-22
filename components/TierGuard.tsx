import React from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { CapabilityKey } from '../shared/types.ts';
import { getTierCapability } from '../services/capabilityService.ts';
import { useUsageQuota } from '../hooks/useUsageQuota.ts';

interface TierGuardProps {
  capability: CapabilityKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * TierGuard Component
 * Enforcement: Returns null (hides children) if the feature is not 
 * permitted by the user's current tier or if the monthly quota is exhausted.
 */
export const TierGuard: React.FC<TierGuardProps> = ({ 
  capability, 
  children, 
  fallback = null
}) => {
  const { user } = useAutoPalStore();
  const quota = useUsageQuota(capability);
  
  const tier = user?.tier || 'free';
  const capabilityValue = getTierCapability(tier, capability);
  
  // Logic: Is this feature basically allowed on this tier?
  const hasBaseAccess = typeof capabilityValue === 'boolean' ? capabilityValue : true;

  // Logic: Is the user blocked by tier or has their quota been filled?
  const isLockedByTier = !hasBaseAccess;
  const isLockedByQuota = quota.isExhausted && typeof capabilityValue === 'number';

  // Hiding deactivated features entirely as requested
  if (isLockedByTier || isLockedByQuota) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};