import React, { useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { Tier } from '../shared/types.ts';
import UpgradeModal from './UpgradeModal.tsx';

interface TierGuardProps {
  requiredTier: Tier;
  children: React.ReactNode;
  fallbackLabel?: string;
  isFeatureAction?: boolean; // If true, allows "seeing" but guards the "click"
}

const TIER_LEVELS: Record<Tier, number> = {
  'free': 1,
  'standard': 2,
  'premium': 3
};

export const TierGuard: React.FC<TierGuardProps> = ({ requiredTier, children, fallbackLabel, isFeatureAction = false }) => {
  const { user } = useAutoPalStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  
  const userLevel = TIER_LEVELS[user?.tier || 'free'];
  const requiredLevel = TIER_LEVELS[requiredTier];

  const handleBlockedAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowUpgrade(true);
  };

  if (userLevel < requiredLevel) {
    if (isFeatureAction) {
      return (
        <div onClickCapture={handleBlockedAction} className="relative group cursor-pointer">
          <div className="filter grayscale opacity-60 pointer-events-none">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 backdrop-blur-[2px] rounded-[inherit] z-20">
             <div className="bg-white text-slate-900 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-2xl">
               Unlock {requiredTier.toUpperCase()}
             </div>
          </div>
          {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
        </div>
      );
    }
    
    return (
      <div className="p-8 bg-slate-900 border border-white/5 rounded-[2rem] text-center space-y-4">
        <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-xl flex items-center justify-center text-xl mx-auto">🔒</div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Clearance Required</h4>
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
          {fallbackLabel || `Upgrade to ${requiredTier.toUpperCase()} for full operational access.`}
        </p>
        <button 
          onClick={() => setShowUpgrade(true)}
          className="bg-blue-600 text-white text-[8px] font-black px-6 py-2.5 rounded-lg uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform"
        >
          View Upgrade Options
        </button>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </div>
    );
  }

  return <>{children}</>;
};

export default TierGuard;