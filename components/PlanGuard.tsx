import React from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { Capability, TIER_REGISTRY } from '../services/entitlementService.ts';

interface PlanGuardProps {
  feature?: Capability;
  requirement?: (tier: any) => boolean;
  children: React.ReactNode;
  fallbackMode?: 'blur' | 'hide' | 'lock';
  label?: string;
}

export const PlanGuard: React.FC<PlanGuardProps> = ({ 
  feature, 
  requirement, 
  children, 
  fallbackMode = 'lock',
  label = "Premium Feature"
}) => {
  const { user } = useAutoPalStore();
  const tier = user?.tier || 'free';

  let hasAccess = true;
  
  if (feature) {
    const capability = TIER_REGISTRY[tier][feature];
    if (typeof capability === 'boolean') hasAccess = capability;
  }

  if (requirement) {
    hasAccess = requirement(tier);
  }

  if (hasAccess) return <>{children}</>;

  if (fallbackMode === 'hide') return null;

  if (fallbackMode === 'blur') {
    return (
      <div className="relative group">
        <div className="filter blur-md pointer-events-none select-none opacity-40">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 shadow-2xl text-center max-w-[200px] animate-in zoom-in-95 duration-300">
             <div className="text-xl mb-2">🔒</div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-4">{label}</p>
             <button className="w-full py-2 bg-blue-600 text-white text-[8px] font-black uppercase rounded-lg">Upgrade Plan</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-center space-y-4">
      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-sm">🔒</div>
      <div className="space-y-1">
        <h4 className="text-sm font-black uppercase tracking-tighter text-slate-900">{label} Locked</h4>
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Available on Standard & Premium Plans</p>
      </div>
      <button className="px-8 py-3 bg-slate-900 text-white text-[9px] font-black uppercase rounded-xl hover:bg-blue-600 transition-all">View Pricing</button>
    </div>
  );
};
