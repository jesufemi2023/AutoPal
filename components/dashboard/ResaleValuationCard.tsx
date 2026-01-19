import React, { useMemo, useState } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog, AIValuationReport } from '../../shared/types.ts';
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

  // Audit Expiry Check (30 days)
  const isAuditExpired = useMemo(() => {
    if (!cachedReport) return false;
    const auditDate = new Date(cachedReport.timestamp);
    const diffDays = (new Date().getTime() - auditDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 30;
  }, [cachedReport]);

  const deterministicValuation = useMemo(() => 
    calculateResaleValue(vehicle, tasks, serviceLogs, fuelLogs), 
    [vehicle, tasks, serviceLogs, fuelLogs]
  );
  
  const displayValuation = (cachedReport && !isAuditExpired) ? cachedReport.valuationNGN : deterministicValuation.finalValue;
  const displayGrade = (cachedReport && !isAuditExpired) ? cachedReport.marketGrade : deterministicValuation.marketGrade;
  
  const handleAiAnalysis = async () => {
    if (!user) return;
    
    const permission = canRunAiAudit(user);
    if (!permission.allowed) {
      alert(permission.reason);
      if (user.tier === 'free') setShowUpgrade(true);
      return;
    }

    setIsAnalyzing(true);
    try {
      const report = await generateAIValuation(vehicle, tasks, serviceLogs, fuelLogs);
      
      // Save AI Audit to Cloud for 10k User Persistency
      const updatedVehicle = await updateVehicle(vehicle.id, { 
        latestAiAudit: report,
        healthScore: report.auditedScores.vitality 
      });
      
      // Update usage tracking
      updateUsageLedger({
        aiAuditsCount: (user.usageLedger.aiAuditsCount || 0) + 1,
        lastAiAuditAt: new Date().toISOString()
      });
      
      updateVehicleStore(updatedVehicle);
    } catch (e) {
      console.error(e);
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

      {isAuditExpired && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-6 text-center group-hover:backdrop-blur-none transition-all">
           <div className="bg-rose-600 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest mb-4">Audit Expired (30d)</div>
           <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest max-w-[180px]">Telemetry data has shifted. Refresh audit for accuracy.</p>
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
                { (cachedReport && !isAuditExpired) ? 'AI High-Confidence' : 'Market Algorithmic Avg'}
              </p>
              {cachedReport && !isAuditExpired && (
                <div className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[8px] font-black uppercase rounded">Stabilized</div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`text-4xl lg:text-6xl font-black ${gradeColors[displayGrade as keyof typeof gradeColors]}`}>{displayGrade}</div>
            <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Resale Grade</div>
          </div>
        </div>

        {cachedReport && !isAuditExpired && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Price Range</span>
              <span className="text-xs font-mono font-bold text-slate-300">
                ₦{(cachedReport.priceRange.min / 1000000).toFixed(1)}M - ₦{(cachedReport.priceRange.max / 1000000).toFixed(1)}M
              </span>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Vitality Score</span>
              <span className={`text-xs font-mono font-bold ${cachedReport.auditedScores.vitality > 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {cachedReport.auditedScores.vitality}/100
              </span>
            </div>
          </div>
        )}

        <button 
          onClick={handleAiAnalysis}
          className={`w-full ${(cachedReport && !isAuditExpired) ? 'bg-white/10 border border-white/20' : 'bg-blue-600'} text-white py-6 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-xl shadow-blue-600/20 group/btn hover:bg-blue-500 z-50`}
        >
          <span className="text-xl group-hover/btn:scale-125 transition-transform animate-pulse">✧</span>
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">
            {(cachedReport && !isAuditExpired) ? 'Refresh Neural Audit' : 'Request AI Financial Dossier'}
          </span>
        </button>

        {cachedReport && !isAuditExpired && (
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
              <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                Neural Scan Verified ✓
              </span>
            </div>
          </div>
        )}

        {(!cachedReport || isAuditExpired) && (
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
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </section>
  );
};