import React from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { Capability, TIER_REGISTRY, EntitlementEngine } from '../services/entitlementService.ts';

interface PlanGuardProps {
  feature?: Capability;
  requirement?: (tier: any) => boolean | 'blurred';
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
  const { user, setCurrentView } = useAutoPalStore();
  const tier = user?.tier || 'free';

  let accessStatus: boolean | 'blurred' = true;
  
  if (feature) {
    const capability = TIER_REGISTRY[tier][feature];
    if (typeof capability === 'boolean') accessStatus = capability;
  }

  if (requirement) {
    const reqResult = requirement(tier);
    accessStatus = reqResult;
  }

  if (accessStatus === true) return <>{children}</>;

  if (fallbackMode === 'hide') return null;

  if (fallbackMode === 'blur' || accessStatus === 'blurred') {
    return (
      <div className="relative group w-full h-full min-h-[400px]">
        <div className="filter blur-2xl pointer-events-none select-none opacity-40 h-full">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center z-[50] p-6">
          <div className="bg-white/90 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-slate-200 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] text-center max-w-[360px] animate-in zoom-in-95 duration-500">
             <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-8 text-white shadow-2xl shadow-blue-500/30">🔒</div>
             <h4 className="text-lg font-black uppercase tracking-tighter text-slate-900 mb-2">{label}</h4>
             <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-10 leading-relaxed">
               Upgrade to <span className="text-blue-600">PREMIUM</span> to activate full ownership intelligence and deep fleet analytics.
             </p>
             <button 
              onClick={() => setCurrentView('profile')}
              className="w-full py-5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-blue-600 transition-all active:scale-95"
             >
               Unlock Access Now
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] text-center space-y-6">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-sm">🔒</div>
      <div className="space-y-2">
        <h4 className="text-base font-black uppercase tracking-tighter text-slate-900">{label} Locked</h4>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Available on Standard & Premium Plans</p>
      </div>
      <button 
        onClick={() => setCurrentView('profile')}
        className="px-10 py-4 bg-slate-900 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-blue-600 transition-all shadow-lg"
      >
        View Pricing
      </button>
    </div>
  );
};
