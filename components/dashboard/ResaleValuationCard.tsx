
import React, { useMemo, useState } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog, AIValuationReport } from '../../shared/types.ts';
import { calculateResaleValue } from '../../services/valuationService.ts';
import { generateAIValuation } from '../../services/geminiService.ts';
import { useAutoPalStore } from '../../shared/store.ts';
import { formatCurrency } from '../../shared/utils.ts';

export const ResaleValuationCard: React.FC<{
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  serviceLogs: ServiceLog[];
  fuelLogs: FuelLog[];
}> = ({ vehicle, tasks, serviceLogs, fuelLogs }) => {
  const { aiValuationReports, setAIValuationReport } = useAutoPalStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const cachedReport = aiValuationReports[vehicle.id];

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
      setAIValuationReport(vehicle.id, report);
    } catch (e) {
      alert("AI Analysis failed. Falling back to market average model.");
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
    <section className="bg-slate-950 rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl group border border-white/10 transition-all duration-700 hover:shadow-blue-900/20 w-full h-full flex flex-col justify-center">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      
      {isAnalyzing && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 border-[4px] border-blue-500 border-t-transparent rounded-full animate-spin mb-8 shadow-[0_0_30px_#3b82f6]"></div>
          <h4 className="text-xl font-black tracking-tight mb-2 uppercase">Neural Market Scan</h4>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Benchmarking verified history & metabolic vitality</p>
        </div>
      )}

      <div className="relative z-10 flex flex-col gap-8 lg:gap-10 w-full">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_#3b82f6] animate-pulse"></div>
              <h3 className="text-[10px] lg:text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Resale Intelligence</h3>
            </div>
            <div className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-white transition-all duration-500 group-hover:scale-[1.01] origin-left leading-none flex flex-wrap items-baseline">
              <span className="text-2xl lg:text-3xl text-slate-500 mr-3 font-mono font-bold">₦</span>
              {displayValuation.toLocaleString()}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-blue-500/80 text-[10px] font-black uppercase tracking-[0.3em] font-mono font-bold">
                {cachedReport ? 'AI High-Confidence' : 'Market Algorithmic Avg'}
              </p>
              {cachedReport && (
                <div className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[8px] font-black uppercase rounded">Stabilized</div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`text-4xl lg:text-6xl font-black ${gradeColors[displayGrade as keyof typeof gradeColors]}`}>{displayGrade}</div>
            <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Resale Grade</div>
          </div>
        </div>

        {cachedReport && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Price Range</span>
              <span className="text-xs font-mono font-bold text-slate-300">
                ₦{(cachedReport.priceRange.min / 1000000).toFixed(1)}M - ₦{(cachedReport.priceRange.max / 1000000).toFixed(1)}M
              </span>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Vitality Score</span>
              <span className={`text-xs font-mono font-bold ${cachedReport.insights.mechanicalVitality.score > 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {cachedReport.insights.mechanicalVitality.score}/100
              </span>
            </div>
          </div>
        )}

        {!cachedReport ? (
          <button 
            onClick={handleAiAnalysis}
            className="w-full bg-blue-600 text-white py-6 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-xl shadow-blue-600/20 group/btn hover:bg-blue-500"
          >
            <span className="text-xl group-hover/btn:scale-125 transition-transform animate-pulse">✧</span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Request AI Financial Dossier</span>
          </button>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
               <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs shrink-0">📜</div>
                  <div className="space-y-1">
                    <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Documentation Premium</div>
                    <div className="text-[11px] text-slate-300 leading-relaxed"><span className="text-blue-400 font-black">+{formatCurrency(cachedReport.insights.trustPremium.value)}</span> {cachedReport.insights.trustPremium.description}</div>
                  </div>
               </div>
               
               <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center text-xs shrink-0">📉</div>
                  <div className="space-y-1">
                    <div className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Maintenance Debt</div>
                    <div className="text-[11px] text-slate-300 leading-relaxed"><span className="text-rose-400 font-black">-{formatCurrency(cachedReport.insights.maintenanceDebt.value)}</span> {cachedReport.insights.maintenanceDebt.description}</div>
                  </div>
               </div>

               <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-xs shrink-0">↗</div>
                  <div className="space-y-1">
                    <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Smart Exit Strategy</div>
                    <div className="text-[11px] text-slate-300 leading-relaxed">{cachedReport.insights.exitStrategy}</div>
                  </div>
               </div>
            </div>
            
            <div className="flex justify-between items-center px-2">
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Last Dossier: {new Date(cachedReport.timestamp).toLocaleDateString()}</span>
              <button 
                onClick={handleAiAnalysis}
                className="text-[8px] font-black text-blue-500 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2"
              >
                <span>↻ Refresh Insight</span>
              </button>
            </div>
          </div>
        )}

        {!cachedReport && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div>
              <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Base Market</div>
              <div className="text-lg font-bold text-slate-400">₦{deterministicValuation.baseValue.toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Maint. Debt</div>
              <div className="text-lg font-bold text-rose-500">-{deterministicValuation.maintenanceDebt.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
