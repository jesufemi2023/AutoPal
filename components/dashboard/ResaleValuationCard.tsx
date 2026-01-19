
import React, { useMemo, useState } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../../shared/types.ts';
import { calculateResaleValue } from '../../services/valuationService.ts';
import { generateAIValuation } from '../../services/geminiService.ts';
import { updateVehicle } from '../../services/vehicleService.ts';
import { useAutoPalStore } from '../../shared/store.ts';
import { formatCurrency } from '../../shared/utils.ts';
import { canRunAiAudit } from '../../services/permissionService.ts';
import UpgradeModal from '../UpgradeModal.tsx';

export const ResaleValuationCard: React.FC<{
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  serviceLogs: ServiceLog[];
  fuelLogs: FuelLog[];
}> = ({ vehicle, tasks, serviceLogs, fuelLogs }) => {
  const { updateVehicleStore, user, updateUsageLedger } = useAutoPalStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Use persisted audit from vehicle object
  const cachedReport = vehicle.latestAiAudit;

  const deterministicValuation = useMemo(() => 
    calculateResaleValue(vehicle, tasks, serviceLogs, fuelLogs), 
    [vehicle, tasks, serviceLogs, fuelLogs]
  );
  
  const displayValuation = cachedReport ? cachedReport.valuationNGN : deterministicValuation.finalValue;
  const displayGrade = cachedReport ? cachedReport.marketGrade : deterministicValuation.marketGrade;
  
  const handleAiAnalysis = async () => {
    if (!user) return;
    
    // 1. Quota & Tier Check
    const permission = canRunAiAudit(user);
    if (!permission.allowed) {
      if (user.tier === 'free') {
        setShowUpgrade(true);
      } else {
        alert(permission.reason);
      }
      return;
    }

    setIsAnalyzing(true);
    try {
      const report = await generateAIValuation(vehicle, tasks, serviceLogs, fuelLogs);
      
      // 2. Persist to Cloud
      const updatedVehicle = await updateVehicle(vehicle.id, { 
        latestAiAudit: report,
        healthScore: report.auditedScores.vitality 
      });
      
      // 3. Update Ledger
      await updateUsageLedger({
        aiAuditsCount: (user.usageLedger.aiAuditsCount || 0) + 1,
        lastAiAuditAt: new Date().toISOString()
      });
      
      updateVehicleStore(updatedVehicle);
    } catch (e) {
      console.error("[AutoPal AI] Analysis Failure:", e);
      alert("Neural Analysis Link Interrupted. Please retry.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const gradeColors = {
    'A+': 'text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]',
    'A': 'text-emerald-500',
    'B': 'text-blue-400',
    'C': 'text-amber-500',
    'D': 'text-rose-500'
  };

  return (
    <section className="bg-slate-950 rounded-[2.5rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl border border-white/5 h-full flex flex-col justify-between group transition-all duration-700 hover:shadow-blue-900/10">
      {/* Background Neural Ambience */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      
      {isAnalyzing && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h4 className="text-sm font-black tracking-tight mb-1 uppercase">Neural Market Audit</h4>
          <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.3em]">Benchmarking History...</p>
        </div>
      )}

      <div className="relative z-10 space-y-8 lg:space-y-12">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]"></div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Resale Intelligence</h3>
            </div>
            <div className="text-5xl sm:text-7xl font-black tracking-tighter text-white leading-none transition-all group-hover:scale-[1.02] origin-left">
              <span className="text-xl sm:text-2xl text-slate-600 mr-2 font-mono font-bold">₦</span>
              {displayValuation.toLocaleString()}
            </div>
            <div className="flex items-center gap-3">
               <p className="text-blue-500/60 text-[8px] font-black uppercase tracking-[0.3em] font-mono">
                 {cachedReport ? 'Neural Confirmed Dossier' : 'Algorithmic Estimate'}
               </p>
               {cachedReport && (
                 <span className="bg-blue-600/10 text-blue-400 text-[7px] font-black px-2 py-0.5 rounded uppercase border border-blue-500/20">Verified</span>
               )}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-5xl sm:text-7xl font-black leading-none ${gradeColors[displayGrade as keyof typeof gradeColors]}`}>
              {displayGrade}
            </div>
            <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2">Market Grade</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/5 border border-white/5 p-5 rounded-3xl flex flex-col justify-between">
              <div className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-1">Base Market</div>
              <div className="text-base font-bold text-slate-300">₦{deterministicValuation.baseValue.toLocaleString()}</div>
           </div>
           <div className="bg-white/5 border border-white/5 p-5 rounded-3xl flex flex-col justify-between">
              <div className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-1">Maintenance Debt</div>
              <div className="text-base font-bold text-rose-500">-{deterministicValuation.maintenanceDebt.toLocaleString()}</div>
           </div>
        </div>
      </div>

      <div className="relative z-10 pt-10 space-y-4">
        <button 
          onClick={handleAiAnalysis}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-xl shadow-blue-600/20 active:scale-95 group/btn"
        >
          <span className="text-xl group-hover/btn:rotate-12 transition-transform">✧</span>
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Generate Neural Dossier</span>
        </button>
        
        <div className="flex justify-between items-center px-1">
          <span className="text-[7px] font-black text-slate-700 uppercase tracking-widest italic">
            {cachedReport ? `Last Audit: ${new Date(cachedReport.timestamp).toLocaleDateString()}` : 'Audit Required for High-Confidence'}
          </span>
          {cachedReport && (
            <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 animate-in fade-in">
              System Synced ✓
            </span>
          )}
        </div>
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </section>
  );
};
