import React from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { CapabilityKey } from '../shared/types.ts';
import { getTierCapability } from '../services/capabilityService.ts';
import { useUsageQuota } from '../hooks/useUsageQuota.ts';

interface TierGuardProps {
  capability: CapabilityKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  mode?: 'lock' | 'quota' | 'stealth';
}

/**
 * TierGuard Component
 * Implements "Visibly Deactivated" pattern.
 * Uses high-end backdrop blurs and grayscale to signal premium exclusivity.
 */
export const TierGuard: React.FC<TierGuardProps> = ({ 
  capability, 
  children, 
  fallback,
  mode = 'lock'
}) => {
  const { user } = useAutoPalStore();
  const quota = useUsageQuota(capability);
  
  const tier = user?.tier || 'free';
  const capabilityValue = getTierCapability(tier, capability);
  const hasBaseAccess = typeof capabilityValue === 'boolean' ? capabilityValue : true;

  const isLockedByTier = !hasBaseAccess;
  const isLockedByQuota = quota.isExhausted && typeof capabilityValue === 'number';

  if (mode === 'stealth' && (isLockedByTier || isLockedByQuota)) return null;
  if (fallback && (isLockedByTier || isLockedByQuota)) return <>{fallback}</>;

  return (
    <div className="relative group/gate h-full w-full">
      {/* Visual State: Deactivated but visible */}
      <div className={`transition-all duration-700 h-full w-full ${isLockedByTier ? 'grayscale opacity-25 blur-[1px] pointer-events-none' : (isLockedByQuota ? 'opacity-40 pointer-events-none' : '')}`}>
        {children}
      </div>

      {/* Locked Overlay for Exclusivity */}
      {isLockedByTier && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[inherit] z-20 pointer-events-auto">
          <div className="bg-slate-950 text-white px-5 py-2.5 rounded-2xl shadow-3xl border border-white/10 flex flex-col items-center gap-1 group-hover/gate:scale-110 transition-transform duration-500">
            <span className="text-[7px] font-black uppercase tracking-[0.5em] text-blue-500">Exclusivity</span>
            <span className="text-[9px] font-black uppercase tracking-widest">
              {tier === 'free' ? 'Standard Tier' : 'Premium Tier'}
            </span>
          </div>
          <button className="mt-4 text-[8px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-400 transition-colors">Upgrade Pilot License →</button>
        </div>
      )}

      {/* Quota Exhausted Overlay */}
      {isLockedByQuota && !isLockedByTier && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/5 backdrop-blur-[1px] rounded-[inherit] z-20 pointer-events-auto">
          <div className="bg-rose-600 text-white px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-2xl border border-white/20">
             Monthly Quota Fulfilled
          </div>
          <p className="mt-2 text-[7px] font-black text-slate-400 uppercase tracking-widest">Refreshes in 30 days or Upgrade</p>
        </div>
      )}
    </div>
  );
};