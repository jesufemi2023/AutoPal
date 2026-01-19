
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

  // SOURCE OF TRUTH: Exclusively use the persisted AI audit from the vehicle object.
  const cachedReport = vehicle.latestAiAudit;

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const report = await generateAIValuation(vehicle, tasks, serviceLogs, fuelLogs);
      
      // Persist the scan results to the cloud
      const updatedVehicle = await updateVehicle(vehicle.id, { 
        latestAiAudit: report,
        healthScore: report.auditedScores.vitality 
      });
      
      updateVehicleStore(updatedVehicle);
    } catch (e) {
      console.error(e);
      alert("AI Intelligence Sync Error. Please check your connection and try again.");
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
    <section className="bg-slate-950 rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl group border border-white/10 transition-all duration-700 hover:shadow-blue-900/20 w-full h-full flex flex-col min-h-[400px]">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      {isAnalyzing && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 border-[4px] border-blue-500 border-t-transparent rounded-full animate-spin mb-8 shadow-[0_0_30px_#3b82f6]"></div>
          <h4 className="text-xl font-black tracking-tight mb-2 uppercase">Benchmarking...</h4>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Analyzing market trends and mechanical telemetry</p>
        </div>
      )}

      {cachedReport ? (
        <div className="relative z-10 flex flex-col justify-between h-full w-full animate-in fade-in duration-700">
          <div className="space-y-8 lg:space-y-10">
            <div className="flex justify-between items-start">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_#3b82f6] animate-pulse"></div>
                  <h3 className="text-[10px] lg:text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Audited Resale Value</h3>
                </div>
                <div className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-white leading-none flex flex-wrap items-baseline">
                  <span className="text-2xl lg:text-3xl text-slate-500 mr-3 font-mono font-bold">₦</span>
                  {cachedReport.valuationNGN.toLocaleString()}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-blue-500/80 text-[10px] font-black uppercase tracking-[0.3em] font-mono font-bold">
                    AI High-Confidence Dossier
                  </p>
                  <div className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[8px] font-black uppercase rounded">Verified</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className={`text-4xl lg:text-6xl font-black ${gradeColors[cachedReport.marketGrade as keyof typeof gradeColors]}`}>
                  {cachedReport.marketGrade}
                </div>
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Market Grade</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Valuation Span</span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  ₦{(cachedReport.priceRange.min / 1000000).toFixed(1)}M - ₦{(cachedReport.priceRange.max / 1000000).toFixed(1)}M
                </span>
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Mechanical Vitality</span>
                <span className={`text-xs font-mono font-bold ${cachedReport.auditedScores.vitality > 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {cachedReport.auditedScores.vitality}/100
                </span>
              </div>
            </div>

            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
               <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs shrink-0">📜</div>
                  <div className="space-y-1">
                    <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Integrity Premium</div>
                    <div className="text-[11px] text-slate-300 leading-relaxed"><span className="text-blue-400 font-black">+{formatCurrency(cachedReport.insights.trustPremium.value)}</span> {cachedReport.insights.trustPremium.description}</div>
                  </div>
               </div>
               <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-xs shrink-0">↗</div>
                  <div className="space-y-1">
                    <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Recommended Strategy</div>
                    <div className="text-[11px] text-slate-300 leading-relaxed">{cachedReport.insights.exitStrategy}</div>
                  </div>
               </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/5 pt-8">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest order-2 sm:order-1">Last Neural Scan: {new Date(cachedReport.timestamp).toLocaleDateString()}</span>
            <button 
              onClick={handleAiAnalysis}
              className="w-full sm:w-auto bg-white/10 border border-white/20 text-white px-8 py-3 rounded-xl flex items-center justify-center gap-3 transition-all hover:bg-white/20 order-1 sm:order-2"
            >
              <span className="text-lg">✧</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Refresh Audit</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full space-y-8 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-blue-600/10 rounded-[2rem] flex items-center justify-center text-3xl shadow-inner border border-blue-600/20 mb-2">
            <span className="animate-pulse">💰</span>
          </div>
          <div className="space-y-3 max-w-sm">
            <h4 className="text-2xl font-black tracking-tighter uppercase leading-none text-white">Financial Intelligence Locked</h4>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.25em] leading-relaxed">
              We need to perform a neural market audit to determine your vehicle's accurate resale value based on regional trends and your specific service integrity.
            </p>
          </div>
          
          <div className="w-full space-y-4">
            <button 
              onClick={handleAiAnalysis}
              className="w-full bg-blue-600 text-white py-6 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-xl shadow-blue-600/30 hover:bg-blue-500 active:scale-95"
            >
              <span className="text-xl">✧</span>
              <span className="text-[11px] font-black uppercase tracking-[0.3em]">Perform AI Valuation</span>
            </button>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
              Scan includes history trust analysis & metabolic health audit
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
