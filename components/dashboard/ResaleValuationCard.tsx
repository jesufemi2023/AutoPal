
import React, { useState, useEffect } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../../shared/types.ts';
import { generateAIValuation } from '../../services/geminiService.ts';
import { updateVehicle } from '../../services/vehicleService.ts';
import { useAutoPalStore } from '../../shared/store.ts';
import { logFeatureUsage } from '../../services/usageService.ts';
import { TierGuard } from '../TierGuard.tsx';
import { useUsageQuota } from '../../hooks/useUsageQuota.ts';
import { AlertCircle, Zap, ShieldCheck, BarChart3, ShoppingCart, Info } from 'lucide-react';

const LOADING_STAGES = [
  "Checking vehicle info...",
  "Analyzing fuel logs...",
  "Verifying service records...",
  "Checking local car market...",
  "Building final report..."
];

export const ResaleValuationCard: React.FC<{
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  serviceLogs: ServiceLog[];
  fuelLogs: FuelLog[];
}> = ({ vehicle, tasks, serviceLogs, fuelLogs }) => {
  const { updateVehicleStore, setMarketplaceFilter, setCurrentView, user } = useAutoPalStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const quota = useUsageQuota('AI_SCAN_MONTHLY');
  const cachedReport = vehicle.latestAiAudit;

  useEffect(() => {
    let interval: number;
    if (isAnalyzing) {
      interval = window.setInterval(() => {
        setLoadingStage(prev => (prev + 1) % LOADING_STAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleAiAnalysis = async () => {
    if (quota.isExhausted) {
      setLocalError("Monthly limit reached. Please upgrade your plan.");
      return;
    }
    setLocalError(null);
    if (!navigator.onLine) {
      setLocalError("You are offline. Autopal requires an internet connection.");
      return;
    }

    setIsAnalyzing(true);
    setLoadingStage(0);

    try {
      const report = await generateAIValuation(vehicle, tasks, serviceLogs, fuelLogs);
      if (user?.id) {
        await logFeatureUsage(user.id, 'ai_scan_monthly');
      }
      const updatedVehicle = await updateVehicle(vehicle.id, { 
        latestAiAudit: report,
        healthScore: report.auditedScores.vitality 
      });
      updateVehicleStore(updatedVehicle);
    } catch (e: any) {
      setLocalError("Could not connect to Autopal. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isLegacyReport = !!(cachedReport && (
    !cachedReport.metabolicAudit || 
    !cachedReport.diagnostics || 
    !cachedReport.suggestedParts
  ));

  if (isAnalyzing) {
    return (
      <div className="bg-slate-950 rounded-[2.5rem] p-12 text-white relative overflow-hidden shadow-3xl border border-blue-500/20 w-full h-full flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative z-10 text-center space-y-10">
          <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <div className="space-y-4">
            <h4 className="text-xl font-black uppercase">Autopal Value Check</h4>
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
              {LOADING_STAGES[loadingStage]}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!cachedReport || isLegacyReport || localError) {
    return (
      <section className="bg-slate-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl border border-white/5 w-full h-full flex flex-col min-h-[350px] items-center justify-center text-center">
        <div className="space-y-8 max-w-sm relative z-10">
          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl mx-auto border ${localError ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-blue-600/10 border-blue-600/20 text-blue-400'}`}>
            {localError ? <AlertCircle size={32} /> : '✧'}
          </div>
          <div className="space-y-3">
            <h4 className="text-2xl font-black uppercase">
              {localError ? 'Action Required' : 'Scan Car Value'}
            </h4>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
              {localError || 'Autopal will look at your car health and service history to estimate its current resale value in Nigeria.'}
            </p>
          </div>
          <button 
            onClick={handleAiAnalysis} 
            className="w-full py-8 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-[0.4em] text-[11px] shadow-2xl active:scale-95 transition-all hover:bg-blue-500"
          >
            Start Autopal Scan
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="w-full h-full space-y-6 flex flex-col animate-in fade-in duration-700">
      <section className="bg-slate-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl border border-white/10 shrink-0 group">
        <div className="flex justify-between items-start relative z-10">
          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse"></div>
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">Current Resale Estimate</h3>
             </div>
             <div className="space-y-1">
                <div className="text-5xl sm:text-6xl font-black tracking-tighter leading-none group-hover:text-blue-400 transition-colors">
                  <span className="textxl text-slate-600 mr-2">₦</span>
                  {cachedReport.valuationNGN?.toLocaleString() ?? '0'}
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-[10px] text-blue-500/60 font-black uppercase tracking-widest">Grade: {cachedReport.marketGrade}</p>
                  <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest flex items-center gap-2 group-hover:text-slate-400">
                    <Info size={10} /> Calculated from condition + history
                  </p>
                </div>
             </div>
          </div>
          <div className="text-right">
             <div className="text-6xl font-black leading-none text-blue-500">{cachedReport.marketGrade}</div>
             <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2">Value Grade</div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/5 grid grid-cols-2 gap-8 relative z-10">
           <div className="space-y-1">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Car Health</div>
              <div className={`text-2xl font-black text-emerald-400`}>{cachedReport.auditedScores?.vitality ?? 0}%</div>
           </div>
           <div className="space-y-1">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Record Trust</div>
              <div className="text-2xl font-black text-blue-400">{Math.round(cachedReport.auditedScores?.discipline ?? 0)}%</div>
           </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 space-y-6 shadow-sm">
           <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Fuel Health Check</h4>
              <span className="text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-1 rounded">Efficiency Check</span>
           </div>
           <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
             Compared to a new model, your car uses <span className="text-rose-500 font-bold">{cachedReport.metabolicAudit?.consumptionGap ?? 0}% more fuel</span>.
           </p>
           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Measured KM per Liter</div>
              <div className="text-2xl font-black text-slate-900">{cachedReport.metabolicAudit?.trueKml?.toFixed(1) ?? '0.0'} KM/L</div>
           </div>
        </div>

        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 space-y-6 shadow-sm">
           <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Autopal Summary</h4>
           <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Top Finding</div>
                <div className="text-lg font-black text-slate-900 leading-tight">{cachedReport.diagnostics?.faultHypothesis ?? 'Healthy'}</div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium italic">"{cachedReport.diagnostics?.reasoning?.substring(0, 100)}..."</p>
           </div>
        </div>
        
        <div className="lg:col-span-2">
           <button 
             onClick={handleAiAnalysis} 
             className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black uppercase tracking-[0.5em] text-[11px] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4"
           >
             <span>✧</span> Refresh Autopal Report
           </button>
        </div>
      </div>
    </div>
  );
};
