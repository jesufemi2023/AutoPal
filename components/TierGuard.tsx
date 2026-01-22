import React from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { CapabilityKey } from '../shared/types.ts';
import { getTierCapability } from '../services/capabilityService.ts';
import { useUsageQuota } from '../hooks/useUsageQuota.ts';
import { Lock } from 'lucide-react';

interface TierGuardProps {
  capability: CapabilityKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * TierGuard Component
 * Enforcement: Renders features in a "Deactivated" state if locked by Tier/Quota.
 * Interaction: Clicking a deactivated feature prompts a Pilot License upgrade.
 */
export const TierGuard: React.FC<TierGuardProps> = ({ 
  capability, 
  children, 
  fallback = null
}) => {
  const { user, setCurrentView } = useAutoPalStore();
  const quota = useUsageQuota(capability);
  
  const tier = user?.tier || 'free';
  const capabilityValue = getTierCapability(tier, capability);
  
  // Logic: Is this feature basically allowed on this tier?
  const hasBaseAccess = typeof capabilityValue === 'boolean' ? capabilityValue : true;

  // Logic: Is the user blocked by tier or has their quota been filled?
  const isLockedByTier = !hasBaseAccess;
  const isLockedByQuota = quota.isExhausted && typeof capabilityValue === 'number';
  
  const isRestricted = isLockedByTier || isLockedByQuota;

  const handleUpgradePrompt = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const message = isLockedByQuota 
      ? `Monthly quota for ${capability.replace(/_/g, ' ')} fulfilled. Upgrade Pilot License to increase capacity?`
      : `This high-performance module requires a ${tier === 'free' ? 'Standard' : 'Premium'} license. View upgrade options?`;

    if (window.confirm(message)) {
      setCurrentView('profile');
    }
  };

  if (isRestricted) {
    // If a specific fallback UI was provided, use it
    if (fallback) return <>{fallback}</>;

    // Default "Visibly Deactivated" Wrapper
    return (
      <div className="relative group/lock cursor-pointer">
        {/* Visual Deactivation Filter */}
        <div className="grayscale opacity-40 blur-[0.5px] pointer-events-none select-none transition-all duration-500">
          {children}
        </div>

        {/* Click Interceptor Overlay */}
        <button 
          onClick={handleUpgradePrompt}
          className="absolute inset-0 z-10 w-full h-full bg-transparent flex flex-col items-center justify-center gap-2 outline-none"
          title="Click to unlock this feature"
        >
          {/* Tooltip-style Lock Badge (Visible on Hover) */}
          <div className="opacity-0 group-hover/lock:opacity-100 transition-all duration-300 transform translate-y-2 group-hover/lock:translate-y-0 flex flex-col items-center">
             <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl border border-white/10">
               <Lock size={10} className="text-blue-400" />
               <span>Upgrade Required</span>
             </div>
             <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 shadow-2xl"></div>
          </div>
        </button>
      </div>
    );
  }

  return <>{children}</>;
};