import React, { useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { initializePayment } from '../services/paystackService.ts';
import { Tier } from '../shared/types.ts';

interface UpgradeModalProps {
  onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose }) => {
  const { user, setUser } = useAutoPalStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelect = (tier: Tier) => {
    if (!user || tier === 'free') return;
    setIsProcessing(true);
    initializePayment(user.email, tier, () => {
      // Callback after verification
      setUser({ ...user, tier });
      setIsProcessing(false);
      onClose();
    });
  };

  const PlanCard = ({ tier, price, title, benefits, color }: any) => (
    <div className={`bg-white rounded-[2.5rem] p-8 border-4 transition-all relative overflow-hidden flex flex-col h-full ${user?.tier === tier ? 'border-blue-600 shadow-2xl' : 'border-slate-100 hover:border-blue-100 shadow-sm'}`}>
      <div className="mb-8">
        <h4 className={`text-2xl font-black uppercase tracking-tighter ${color}`}>{title}</h4>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-4xl font-black text-slate-900 tracking-tighter">{price}</span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">/ Month</span>
        </div>
      </div>
      
      <ul className="space-y-4 mb-10 flex-grow">
        {benefits.map((b: string, i: number) => (
          <li key={i} className="flex items-start gap-3 text-[11px] font-bold text-slate-600 leading-relaxed">
            <span className={`${color} font-black shrink-0`}>✓</span>
            {b}
          </li>
        ))}
      </ul>

      <button 
        onClick={() => handleSelect(tier)}
        disabled={user?.tier === tier || isProcessing}
        className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl active:scale-95 ${user?.tier === tier ? 'bg-slate-50 text-slate-300' : `bg-slate-900 text-white hover:${color.replace('text', 'bg')}`}`}
      >
        {user?.tier === tier ? 'Active Plan' : isProcessing ? 'Initializing...' : `Select ${title}`}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto pt-safe">
      <div className="w-full max-w-6xl animate-slide-up bg-white/5 rounded-[3rem] p-1 border border-white/10">
        <div className="bg-[#fcfcfd] rounded-[2.8rem] p-8 sm:p-12 relative overflow-hidden">
          <button onClick={onClose} className="absolute top-8 right-8 text-slate-400 text-4xl hover:text-slate-900 transition-colors">×</button>
          
          <header className="text-center mb-16 space-y-4">
             <div className="flex items-center justify-center gap-3">
               <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
               <span className="text-slate-400 font-black uppercase tracking-[0.4em] text-[9px]">Neural System Upgrade</span>
             </div>
             <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter leading-none uppercase">Choose Your <br/><span className="text-blue-600">Operational Level</span></h2>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-md mx-auto">Scale your garage management with AI-driven diagnostics and professional auditing.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <PlanCard 
              tier="free" 
              price="₦0" 
              title="Individual"
              color="text-slate-400"
              benefits={[
                "1 Active Vehicle Profile",
                "Regional Roadmap Access",
                "4 Service Logs / Month (1/wk)",
                "2 Fuel Logs / Month",
                "1 AI Audit / Month (30d Life)",
                "Local Device Storage Only"
              ]}
            />
            <PlanCard 
              tier="standard" 
              price="₦70,000" 
              title="Enthusiast"
              color="text-blue-600"
              benefits={[
                "3 Active Vehicle Profiles",
                "AI-Generated Smart Roadmap",
                "12 Service Logs / Month",
                "8 Fuel Logs / Month",
                "4 AI Audits / Month (1/wk)",
                "AI Diagnosis (1/mo, 17/yr)",
                "Professional PDF Exports",
                "Cloud Synchronization"
              ]}
            />
            <PlanCard 
              tier="premium" 
              price="₦40,000" 
              title="Fleet Pro"
              color="text-emerald-500"
              benefits={[
                "Unlimited Vehicle Profiles",
                "Neural Predictive Roadmap",
                "Unlimited Service Logs",
                "8 Fuel Logs / Month",
                "4 AI Audits / Month",
                "AI Diagnosis (4/mo, 65/yr)",
                "Full Executive Dossiers",
                "Global Garage Audit Sync"
              ]}
            />
          </div>

          <footer className="mt-16 text-center">
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-4">
               <span>Secured by Paystack</span>
               <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
               <span>PCI-DSS Compliant</span>
               <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
               <span>Instant Provisioning</span>
             </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;