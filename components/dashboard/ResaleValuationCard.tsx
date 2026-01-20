
import React, { useState } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../../shared/types.ts';
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
  const { updateVehicleStore } = useAutoPalStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const cachedReport = vehicle.latestAiAudit;

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const report = await generateAIValuation(vehicle, tasks, serviceLogs, fuelLogs);
      const updatedVehicle = await updateVehicle(vehicle.id, { 
        latestAiAudit: report,
        healthScore: report.auditedScores.vitality 
      });
      updateVehicleStore(updatedVehicle);
    } catch (e) {
      console.error(e);
      alert("Neural Audit Link Failure. Please retry.");
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
    <section className="bg-slate-950 rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl group border border-white/10 transition-all duration-700 hover:shadow-blue-900/20 w-full h-full flex flex-col min-h-[500px]">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      {isAnalyzing && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 border-[4px] border-blue-500 border-t-transparent rounded-full animate-spin mb-8 shadow-[0_0_30px_#3b82f6]"></div>
          <h4 className="text-xl font-black tracking-tight mb-2 uppercase">Neural Audit In Progress...</h4>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Cross-examining metabolic telemetry</p>
        </div>
      )}

      {cachedReport ? (
        <div className="relative z-10 flex flex-col justify-between h-full w-full animate-in fade-in duration-700">
          <div className="space-y-10">
            {/* Value & Grade Header */}
            <div className="flex justify-between items-start">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_#3b82f6] animate-pulse"></div>
                  <h3 className="text-[10px] lg:text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Resale Valuation</h3>
                </div>
                <div className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-none flex items-baseline">
                  <span className="text-2xl text-slate-500 mr-2 font-mono font-bold">₦</span>
                  {cachedReport.valuationNGN.toLocaleString()}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className={`text-4xl lg:text-6xl font-black ${gradeColors[cachedReport.marketGrade as keyof typeof gradeColors]}`}>
                  {cachedReport.marketGrade}
                </div>
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Grade</div>
              </div>
            </div>

            {/* METABOLIC PERFORMANCE AUDIT - ENHANCED SECTION */}
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 sm:p-8 space-y-8">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Metabolic Scan Results</h4>
                <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${cachedReport.metabolicAudit.consumptionGap < 12 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {cachedReport.metabolicAudit.efficiencyRating}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Efficiency Performance</div>
                  <div className="text-3xl font-black font-mono tracking-tighter text-white">
                    {cachedReport.metabolicAudit.trueKml.toFixed(1)} 
                    <span className="text-[10px] font-sans opacity-40 ml-1">KM/L</span>
                  </div>
                </div>
                
                <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-white/5 pt-6 sm:pt-0 sm:pl-8">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Consumption Gap</div>
                  <div className={`text-3xl font-black font-mono tracking-tighter ${cachedReport.metabolicAudit.consumptionGap > 15 ? 'text-rose-500' : 'text-emerald-400'}`}>
                    {cachedReport.metabolicAudit.consumptionGap > 0 ? '+' : ''}{cachedReport.metabolicAudit.consumptionGap}%
                  </div>
                </div>

                <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-white/5 pt-6 sm:pt-0 sm:pl-8">
                  <div className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Estimated Waste / Mo</div>
                  <div className="text-2xl font-black text-rose-400 tracking-tighter leading-none pt-1">
                    {formatCurrency(cachedReport.metabolicAudit.monthlyWaste)}
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostic Narrative */}
            <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-2xl space-y-3">
               <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${cachedReport.diagnostics.severity === 'critical' ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'}`}></div>
                  <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Audit Hypothesis</div>
               </div>
               <div className="text-sm font-black text-white leading-tight">{cachedReport.diagnostics.primaryHypothesis}</div>
               <p className="text-[11px] text-slate-400 italic leading-relaxed">"{cachedReport.diagnostics.reasoning}"</p>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/5 pt-8">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Report ID: AP-{cachedReport.timestamp.slice(-6).toUpperCase()}</span>
              <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Scan Date: {new Date(cachedReport.timestamp).toLocaleDateString()}</span>
            </div>
            <button 
              onClick={handleAiAnalysis}
              className="w-full sm:w-auto bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-blue-600 active:scale-95 group/btn"
            >
              <span className="text-lg group-hover/btn:rotate-90 transition-transform duration-500">✧</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Relaunch Scan</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full space-y-10 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-inner border border-blue-600/20">
            <span className="animate-pulse">💎</span>
          </div>
          <div className="space-y-4 max-w-sm">
            <h4 className="text-3xl font-black tracking-tighter uppercase leading-none text-white">Neural Dashboard</h4>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.25em] leading-relaxed px-6">
              Perform an AI-driven metabolic audit to unlock fuel performance metrics and certified resale estimates.
            </p>
          </div>
          
          <div className="w-full space-y-4">
            <button 
              onClick={handleAiAnalysis}
              className="w-full bg-blue-600 text-white py-7 rounded-[2rem] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-blue-600/30 hover:bg-blue-500 active:scale-95"
            >
              <span className="text-2xl">✧</span>
              <span className="text-[11px] font-black uppercase tracking-[0.3em]">Perform Neural Audit</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
