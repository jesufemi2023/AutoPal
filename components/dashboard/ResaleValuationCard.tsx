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
  const { updateVehicleStore, setMarketplaceFilter, setCurrentView, user, getUsageStats } = useAutoPalStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const tier = user?.tier || 'free';
  const stats = getUsageStats();
  const cachedReport = vehicle.latestAiAudit;
  const canScan = EntitlementEngine.canRunAiScan(tier, stats.monthlyAiScanCount);

  const handleAiAnalysis = async () => {
    if (!canScan) {
      alert("Monthly AI quota reached (1/1). Scans reset on the 1st of the month.");
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
    } catch (e) {
      alert("Neural Link Interrupted. Please check your network.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ... (UI logic remains similar, but scan button updated below)
  
  if (isAnalyzing) return (/* Analysis Spinner */ <div className="p-20 text-white text-center">Neural Link Active...</div>);

  return (
    <section className="bg-slate-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl group border border-white/5">
       {/* ... other parts of component ... */}
       <button 
         onClick={handleAiAnalysis} 
         disabled={!canScan}
         className={`w-full py-10 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-[13px] transition-all border-2 ${canScan ? 'bg-blue-600 shadow-2xl hover:bg-blue-500 border-blue-400/30' : 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'}`}
       >
         {canScan ? `Initialize AI Scan (${stats.monthlyAiScanCount}/${EntitlementEngine.getLimit(tier, 'monthlyAiScans')})` : 'Monthly Limit Reached'}
       </button>
    </section>
  );
};
