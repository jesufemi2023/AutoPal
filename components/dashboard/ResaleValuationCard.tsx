import React, { useMemo, useState } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog, AIValuationReport } from '../../shared/types.ts';
import { calculateResaleValue } from '../../services/valuationService.ts';
import { generateAIValuation } from '../../services/geminiService.ts';
import { updateVehicle } from '../../services/vehicleService.ts';
import { localDb } from '../../services/localDb.ts';
import { useAutoPalStore } from '../../shared/store.ts';
import { formatCurrency } from '../../shared/utils.ts';

export const ResaleValuationCard: React.FC<{
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  serviceLogs: ServiceLog[];
  fuelLogs: FuelLog[];
}> = ({ vehicle, tasks, serviceLogs, fuelLogs }) => {
  const { updateVehicleStore } = useAutoPalStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // SOURCE OF TRUTH: PERSISTED AUDIT
  const cachedReport = vehicle.latestAiAudit;

  const deterministicValuation = useMemo(() => 
    calculateResaleValue(vehicle, tasks, serviceLogs, fuelLogs), 
    [vehicle, tasks, serviceLogs, fuelLogs]
  );
  
  const displayValuation = cachedReport ? cachedReport.valuationNGN : deterministicValuation.finalValue;
  const displayGrade = cachedReport ? cachedReport.marketGrade : deterministicValuation.marketGrade;
  
  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const report = await generateAIValuation(vehicle, tasks, serviceLogs, fuelLogs);
      
      // Save to Cloud Master
      const updatedVehicle = await updateVehicle(vehicle.id, { 
        latestAiAudit: report,
        healthScore: report.auditedScores.vitality 
      });
      
      // Immediate overwrite of Local Browser Mirror
      await localDb.saveVehicle(updatedVehicle);
      updateVehicleStore(updatedVehicle);
    } catch (e) {
      console.error(e);
      alert("Neural market scan interrupted. Fallback active.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const gradeColors = {
    'A+': 'text-emerald-400',
    'A': 'text-emerald-500',
    'B': 'text-blue-400',
    'C': 'text-amber-500',
    'D': 'text-rose-500'
  };

  return (
    <section className="bg-slate-950 rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl border border-white/10 transition-all duration-700 w-full h-full flex flex-col justify-center">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      
      {isAnalyzing && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-12 h-12 border-[4px] border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h4 className="text-xl font-black tracking-tight mb-2 uppercase">Neural Audit Active</h4>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Evaluating telemetry & metadata history</p>
        </div>
      )}

      <div className="relative z-10 flex flex-col gap-8 w-full">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Resale Intelligence</h3>
            <div className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-none flex items-baseline">
              <span className="text-xl text-slate-500 mr-2 font-mono">₦</span>
              {displayValuation.toLocaleString()}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-blue-500/80 text-[10px] font-black uppercase tracking-[0.3em] font-mono">
                {cachedReport ? 'High-Confidence Audit' : 'Market Algorithmic Avg'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className={`text-4xl sm:text-6xl font-black ${gradeColors[displayGrade as keyof typeof gradeColors]}`}>{displayGrade}</div>
            <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Resale Grade</div>
          </div>
        </div>

        <button 
          onClick={handleAiAnalysis}
          className={`w-full ${cachedReport ? 'bg-white/10 border border-white/20' : 'bg-blue-600'} text-white py-6 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-xl hover:bg-blue-500`}
        >
          <span className="text-xl">✧</span>
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">
            {cachedReport ? 'Recalibrate Neural Audit' : 'Request AI Financial Audit'}
          </span>
        </button>

        {cachedReport && (
          <div className="space-y-4 pt-4 border-t border-white/5 animate-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 gap-3">
               <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl">
                  <div className="text-lg">📜</div>
                  <div className="space-y-1">
                    <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Trust Premium</div>
                    <div className="text-[11px] text-slate-300 leading-relaxed"><span className="text-blue-400 font-black">+{formatCurrency(cachedReport.insights.trustPremium.value)}</span> {cachedReport.insights.trustPremium.description}</div>
                  </div>
               </div>
               
               <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl">
                  <div className="text-lg">📉</div>
                  <div className="space-y-1">
                    <div className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Maintenance Debt</div>
                    <div className="text-[11px] text-slate-300 leading-relaxed"><span className="text-rose-400 font-black">-{formatCurrency(cachedReport.insights.maintenanceDebt.value)}</span> {cachedReport.insights.maintenanceDebt.description}</div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};