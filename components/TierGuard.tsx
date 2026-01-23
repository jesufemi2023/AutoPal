import React from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { CapabilityKey } from '../shared/types.ts';
import { getTierCapability } from '../services/capabilityService.ts';
import { useUsageQuota } from '../hooks/useUsageQuota.ts';
import { Lock, Clock } from 'lucide-react';

interface TierGuardProps {
  capability: CapabilityKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * TierGuard Component
 * Enforcement: Renders features in a "Deactivated" state if locked by Tier/Quota/Expiry.
 * Interaction: Clicking a deactivated feature prompts a Pilot License upgrade or renewal.
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
  
  // License Validity Check
  const isLicenseExpired = user?.licenseExpiresAt ? new Date(user.licenseExpiresAt) < new Date() : false;

  const isRestricted = isLockedByTier || isLockedByQuota || isLicenseExpired;

  const handleUpgradePrompt = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    let message = `This module requires a ${tier === 'free' ? 'Standard' : 'Premium'} license. View upgrade options?`;
    
    if (isLicenseExpired) {
      message = "Your pilot license has expired. Renew your protocol to continue logging data.";
    } else if (isLockedByQuota) {
      message = `Monthly capacity for ${capability.replace(/_/g, ' ')} reached. Upgrade your license to increase limits?`;
    }

    if (window.confirm(message)) {
      setCurrentView('profile');
    }
  };

  if (isRestricted) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="relative group/lock cursor-pointer">
        <div className="grayscale opacity-30 blur-[0.4px] pointer-events-none select-none transition-all duration-700">
          {children}
        </div>

        <button 
          onClick={handleUpgradePrompt}
          className="absolute inset-0 z-10 w-full h-full bg-transparent flex flex-col items-center justify-center gap-2 outline-none"
        >
          <div className="opacity-0 group-hover/lock:opacity-100 transition-all duration-300 transform translate-y-2 group-hover/lock:translate-y-0 flex flex-col items-center">
             <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl border border-white/10">
               {isLicenseExpired ? <Clock size={10} className="text-rose-400" /> : <Lock size={10} className="text-blue-400" />}
               <span>{isLicenseExpired ? 'Expired' : 'Locked'}</span>
             </div>
             <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 shadow-2xl"></div>
          </div>
        </button>
      </div>
    );
  }

  return <>{children}</>;
};