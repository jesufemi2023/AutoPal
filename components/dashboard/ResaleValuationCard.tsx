
import React, { useMemo, useState } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../../shared/types.ts';
import { calculateResaleValue } from '../../services/valuationService.ts';
import { generateAIValuation } from '../../services/geminiService.ts';
import { updateVehicle } from '../../services/vehicleService.ts';
import { useAutoPalStore } from '../../shared/store.ts';
import { formatCurrency } from '../../shared/utils.ts';

export const ResaleValuationCard: React.FC<{
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  serviceLogs: ServiceLog[];
  fuelLogs: FuelLog[];
}> = ({ vehicle, tasks, serviceLogs, fuelLogs }) => {
  const { updateVehicleStore, user } = useAutoPalStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const cachedReport = vehicle.latestAiAudit;
  const deterministicValuation = useMemo(() => calculateResaleValue(vehicle, tasks, serviceLogs, fuelLogs), [vehicle, tasks, serviceLogs, fuelLogs]);
  const displayValuation = cachedReport ? cachedReport.valuationNGN : deterministicValuation.finalValue;
  const displayGrade = cachedReport ? cachedReport.marketGrade : deterministicValuation.marketGrade;
  
  const handleAiAnalysis = async () => {
    if (!user) return;
    setIsAnalyzing(true);
    try {
      const report = await generateAIValuation(vehicle, tasks, serviceLogs, fuelLogs);
      const updatedVehicle = await updateVehicle(vehicle.id, { 
        latestAiAudit: report,
        healthScore: report.auditedScores.vitality 
      });
      updateVehicleStore(updatedVehicle);
    } catch (e) {
      console.error("[AutoPal AI] Analysis Failure:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const gradeColors = {
    'A+': 'text-emerald-400', 'A': 'text-emerald-500', 'B': 'text-blue-400', 'C': 'text-amber-500', 'D': 'text-rose-500'
  };

  return (
    <section className="bg-slate-950 rounded-[2.5rem] p-8 sm:p-10 text-white relative shadow-2xl border border-white/5 h-full flex flex-col justify-between overflow-hidden">
      {isAnalyzing && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h4 className="text-sm font-black uppercase">Neural Market Audit</h4>
        </div>
      )}
      <div className="relative z-10 space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Resale Intelligence</h3>
            <div className="text-5xl sm:text-7xl font-black tracking-tighter text-white leading-none">
              <span className="text-xl sm:text-2xl text-slate-600 mr-2 font-mono">₦</span>
              {displayValuation.toLocaleString()}
            </div>
            {cachedReport && <span className="bg-blue-600/10 text-blue-400 text-[7px] font-black px-2 py-0.5 rounded uppercase border border-blue-500/20">Verified</span>}
          </div>
          <div className={`text-5xl sm:text-7xl font-black leading-none ${gradeColors[displayGrade as keyof typeof gradeColors]}`}>{displayGrade}</div>
        </div>
      </div>
      <div className="relative z-10 pt-10">
        <button onClick={handleAiAnalysis} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-2xl font-black uppercase text-[10px] shadow-xl">Generate Neural Dossier</button>
      </div>
    </section>
  );
};
