
import React from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { Tier } from '../shared/types.ts';

interface TierGuardProps {
  requiredTier: Tier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const TIER_LEVELS: Record<Tier, number> = {
  'free': 1,
  'standard': 2,
  'premium': 3
};

export const TierGuard: React.FC<TierGuardProps> = ({ requiredTier, children, fallback }) => {
  const { user } = useAutoPalStore();
  
  const userLevel = TIER_LEVELS[user?.tier || 'free'];
  const requiredLevel = TIER_LEVELS[requiredTier];

  if (userLevel < requiredLevel) {
    if (fallback) return <>{fallback}</>;
    
    return (
      <div className="p-8 bg-slate-900 border border-white/5 rounded-[2rem] text-center space-y-4">
        <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-xl flex items-center justify-center text-xl mx-auto">🔒</div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Clearance Required</h4>
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
          Upgrade to {requiredTier.toUpperCase()} Operational License for access.
        </p>
        <button className="bg-blue-600 text-white text-[8px] font-black px-6 py-2.5 rounded-lg uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform">
          Upgrade Hub
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
