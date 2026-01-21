import React, { useState } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../../shared/types.ts';
import { generateAIValuation } from '../../services/geminiService.ts';
import { updateVehicle } from '../../services/vehicleService.ts';
import { useAutoPalStore } from '../../shared/store.ts';
import { EntitlementEngine } from '../../services/entitlementService.ts';

export const ResaleValuationCard: React.FC<{
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  serviceLogs: ServiceLog[];
  fuelLogs: FuelLog[];
}> = ({ vehicle, tasks, serviceLogs, fuelLogs }) => {
  const { updateVehicleStore, user, getUsageStats, setAIValuationReport, setCurrentView } = useAutoPalStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const tier = user?.tier || 'free';
  const stats = getUsageStats();
  const used = stats.monthlyAiScanCount;
  const limit = EntitlementEngine.getLimit(tier, 'monthlyAiScans') as number;
  const canScan = used < limit;

  const handleAiAnalysis = async () => {
    if (!canScan) {
      if (confirm(`Scan Limit Reached: Your current ${tier.toUpperCase()} plan allows ${limit} AI Resale Scans per month. Upgrade for up to 7 scans?`)) {
        setCurrentView('profile');
      }
      return;
    }
    setIsAnalyzing(true);
    try {
      const report = await generateAIValuation(vehicle, tasks, serviceLogs, fuelLogs);
      const updatedVehicle = await updateVehicle(vehicle.id, { 
        latestAiAudit: report,
        healthScore: report.auditedScores.vitality 
      });
      updateVehicleStore(updatedVehicle);
      setAIValuationReport(vehicle.id, report);
    } catch (e) {
      alert("Neural Link Interrupted. Check connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) return (
    <div className="bg-slate-950 rounded-[2.5rem] p-20 text-white text-center flex flex-col items-center justify-center border border-white/5 shadow-3xl">
       <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
       <h4 className="text-sm font-black uppercase tracking-widest">Performing Neural Audit...</h4>
    </div>
  );

  return (
    <section className="bg-slate-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl group border border-white/5 h-full flex flex-col">
       <div className="flex justify-between items-start mb-10">
          <div>
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Market Valuation</h3>
             <div className="flex items-center gap-3">
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${canScan ? 'bg-blue-600/20 text-blue-400' : 'bg-rose-600/20 text-rose-400'}`}>
                   Monthly Scans: {used}/{limit}
                </span>
             </div>
          </div>
          <div className="text-4xl">💰</div>
       </div>

       <div className="flex-grow space-y-10">
          {vehicle.latestAiAudit ? (
             <div className="space-y-6">
                <div className="text-6xl font-black tracking-tighter text-blue-500">
                   ₦{vehicle.latestAiAudit.valuationNGN.toLocaleString()}
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Market Grade</p>
                      <p className="text-xl font-black text-white">{vehicle.latestAiAudit.marketGrade}</p>
                   </div>
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Health Score</p>
                      <p className="text-xl font-black text-white">{vehicle.latestAiAudit.auditedScores.vitality}%</p>
                   </div>
                </div>
             </div>
          ) : (
             <div className="py-10 text-center opacity-40">
                <p className="text-[10px] font-black uppercase tracking-widest">No AI Valuation performed yet</p>
             </div>
          )}
       </div>

       <div className="pt-10">
         <button 
           onClick={handleAiAnalysis} 
           className={`w-full py-8 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] transition-all border-2 ${canScan ? 'bg-blue-600 shadow-xl hover:bg-blue-500 border-blue-400/30 text-white' : 'bg-slate-800 border-slate-700 opacity-50 text-slate-500'}`}
         >
           {canScan ? (vehicle.latestAiAudit ? 'Recalculate Audit' : 'Initialize Neural Scan') : 'Scan Limit Reached'}
         </button>
       </div>
    </section>
  );
};
