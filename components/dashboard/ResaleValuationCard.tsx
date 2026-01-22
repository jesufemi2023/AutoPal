import React, { useState } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../../shared/types.ts';
import { generateAIValuation } from '../../services/geminiService.ts';
import { updateVehicle } from '../../services/vehicleService.ts';
import { useAutoPalStore } from '../../shared/store.ts';
import { logFeatureUsage } from '../../services/usageService.ts';
import { TierGuard } from '../TierGuard.tsx';

export const ResaleValuationCard: React.FC<{
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  serviceLogs: ServiceLog[];
  fuelLogs: FuelLog[];
}> = ({ vehicle, tasks, serviceLogs, fuelLogs }) => {
  const { updateVehicleStore, setMarketplaceFilter, setCurrentView, user } = useAutoPalStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const cachedReport = vehicle.latestAiAudit;

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const report = await generateAIValuation(vehicle, tasks, serviceLogs, fuelLogs);
      
      // Attempt to Log Usage - This is the "Governor" check
      if (user?.id) {
        try {
          await logFeatureUsage(user.id, 'ai_scan_monthly');
        } catch (quotaErr: any) {
          if (quotaErr.message === 'QUOTA_EXHAUSTED') {
            throw new Error("QUOTA: You have reached the monthly AI Scan limit for your current Pilot License.");
          }
          throw quotaErr;
        }
      }

      const updatedVehicle = await updateVehicle(vehicle.id, { 
        latestAiAudit: report,
        healthScore: report.auditedScores.vitality 
      });
      
      updateVehicleStore(updatedVehicle);
    } catch (e: any) {
      console.error("AI Audit Logic Fault:", e);
      if (e.message.startsWith("QUOTA")) {
        alert(e.message);
      } else {
        alert("Neural Link Interrupted. Please check your network and try again.");
      }
    } finally {
      // Ensure "Rolling" state is ALWAYS cleared
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

  const severityColors = {
    'normal': 'bg-blue-500',
    'advisory': 'bg-amber-500',
    'critical': 'bg-rose-500'
  };

  const isLegacyReport = !!(cachedReport && (
    !cachedReport.metabolicAudit || 
    !cachedReport.diagnostics || 
    !cachedReport.suggestedParts || 
    !cachedReport.strategicInsights
  ));

  if (isAnalyzing) {
    return (
      <div className="bg-slate-950 rounded-[2.5rem] p-12 text-white relative overflow-hidden shadow-3xl border border-blue-500/20 w-full h-full flex flex-col items-center justify-center min-h-[500px]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent animate-pulse"></div>
        </div>
        <div className="relative z-10 text-center space-y-8 max-w-sm">
          <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_40px_rgba(59,130,246,0.5)]"></div>
          <div className="space-y-4">
            <h4 className="text-2xl font-black tracking-tighter uppercase">AI Condition Scan</h4>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">
              Auditing metabolic fuel patterns and service integrity...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!cachedReport || isLegacyReport) {
    return (
      <section className="bg-slate-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl group border border-white/5 w-full h-full flex flex-col min-h-[400px] items-center justify-center text-center">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/5 blur-[120px] rounded-full"></div>
        <div className="space-y-8 max-w-sm relative z-10">
          <div className="w-20 h-20 bg-blue-600/10 rounded-[2rem] flex items-center justify-center text-3xl mx-auto border border-blue-500/20">✧</div>
          <div className="space-y-3">
            <h4 className="text-2xl font-black tracking-tighter uppercase">
              {isLegacyReport ? 'Audit Refresh Required' : 'Condition Scan Inactive'}
            </h4>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
              {isLegacyReport 
                ? 'Your audit profile is legacy. Re-scan to unlock advanced financial and mechanical projections.' 
                : 'Perform a deep mechanical audit to certify your car\'s market value and detect hidden inefficiency.'}
            </p>
          </div>
          
          <TierGuard capability="AI_SCAN_MONTHLY">
            <button onClick={handleAiAnalysis} className="w-full bg-blue-600 text-white py-10 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-[13px] shadow-[0_20px_50px_rgba(59,130,246,0.4)] hover:bg-blue-500 active:scale-95 transition-all mt-6 border-2 border-blue-400/30 group">
              <span className="flex items-center justify-center gap-4">
                <span className="text-2xl group-hover:scale-125 transition-transform">✧</span>
                {isLegacyReport ? 'Run Full System Update' : 'Initialize AI Condition Scan'}
              </span>
            </button>
          </TierGuard>
        </div>
      </section>
    );
  }

  return (
    <div className="w-full h-full space-y-6 flex flex-col">
      {/* Top Value Card */}
      <section 
        className="bg-slate-950 rounded-[2.5rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl border border-white/10 shrink-0"
        title="Current resale value based on regional market trends, your history confidence, and vehicle condition."
      >
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] font-black text-9xl pointer-events-none uppercase">{cachedReport.marketGrade}</div>
        <div className="flex justify-between items-start relative z-10">
          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse"></div>
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">Market Resale Estimate</h3>
             </div>
             <div className="space-y-1">
                <div className="text-5xl sm:text-7xl font-black tracking-tighter leading-none flex items-baseline">
                  <span className="text-2xl text-slate-600 mr-2 font-mono">₦</span>
                  {cachedReport.valuationNGN?.toLocaleString() ?? '0'}
                </div>
                <p className="text-[10px] text-blue-500/60 font-black uppercase tracking-widest">Accuracy Level: {Math.round(cachedReport.auditedScores?.discipline ?? 0)}%</p>
             </div>
          </div>
          <div className="text-right">
             <div className={`text-6xl font-black leading-none ${gradeColors[cachedReport.marketGrade as keyof typeof gradeColors]}`}>{cachedReport.marketGrade}</div>
             <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2">Market Grade</div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/5 grid grid-cols-2 gap-8 relative z-10">
           <div className="space-y-1">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Car Health</div>
              <div className={`text-2xl font-black ${(cachedReport.auditedScores?.vitality ?? 0) > 75 ? 'text-emerald-400' : 'text-rose-500'}`}>{cachedReport.auditedScores?.vitality ?? 0}%</div>
           </div>
           <div className="space-y-1">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Price Range</div>
              <div className="text-sm font-mono font-bold text-slate-300">
                ₦{((cachedReport.priceRange?.min ?? 0)/1e6).toFixed(1)}M - ₦{((cachedReport.priceRange?.max ?? 0)/1e6).toFixed(1)}M
              </div>
           </div>
        </div>
      </section>

      {/* Deep Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow">
        
        {/* CARD 1: FUEL ANALYSIS */}
        <div 
          className="bg-white rounded-[2rem] p-8 border border-slate-100 space-y-6 shadow-sm"
          title="Comparison of your real-world fuel consumption against factory benchmarks."
        >
           <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Fuel Usage Report</h4>
              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${cachedReport.metabolicAudit?.efficiencyTrend === 'improving' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {cachedReport.metabolicAudit?.efficiencyTrend ?? 'stable'}
              </span>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-6 rounded-2xl">
                 <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-2">Measured KM/L</div>
                 <div className="text-2xl font-black text-slate-900">{cachedReport.metabolicAudit?.trueKml?.toFixed(1) ?? '0.0'}</div>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl">
                 <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-2">Efficiency Gap</div>
                 <div className={`text-2xl font-black ${(cachedReport.metabolicAudit?.consumptionGap ?? 0) > 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
                   +{cachedReport.metabolicAudit?.consumptionGap ?? 0}%
                 </div>
              </div>
           </div>
           <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">System Rating</span>
              <span className="text-sm font-black text-blue-700 uppercase">{(cachedReport.metabolicAudit?.consumptionGap ?? 0) < 12 ? 'OPTIMAL' : 'WATCHING'}</span>
           </div>
        </div>

        {/* CARD 2: AI CONDITION DIAGNOSTICS */}
        <div 
          className="bg-white rounded-[2rem] p-8 border border-slate-100 space-y-6 shadow-sm relative overflow-hidden"
          title="Hidden mechanical issues detected by correlating fuel usage with maintenance intervals."
        >
           <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Diagnostic Summary</h4>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${severityColors[cachedReport.diagnostics?.severity as keyof typeof severityColors] || 'bg-slate-300'} animate-pulse`}></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{cachedReport.diagnostics?.severity ?? 'Clear'}</span>
              </div>
           </div>
           <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Top Hypothesis</div>
                <div className="text-lg font-black text-slate-900 leading-tight">{cachedReport.diagnostics?.faultHypothesis ?? 'All Systems Nominal'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Neural Reasoning</div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">"{cachedReport.diagnostics?.reasoning ?? 'No abnormal patterns detected in current logs.'}"</p>
              </div>
           </div>
        </div>

        {/* CARD 3: RECOMMENDED PARTS */}
        <div 
          className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 shadow-xl"
          title="Specific spare parts identified by AI to restore vehicle health and fuel economy."
        >
           <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Critical Components</h4>
           </div>
           <div className="space-y-3">
              {cachedReport.suggestedParts?.slice(0, 3).map((part, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center group hover:bg-white/10 transition-all cursor-pointer" 
                     onClick={() => { setMarketplaceFilter(part.name); setCurrentView('marketplace'); }}>
                   <div className="space-y-1">
                      <div className="text-[10px] font-black text-white uppercase">{part.name}</div>
                      <div className="text-[8px] text-slate-50 font-bold uppercase tracking-widest">{part.reason}</div>
                   </div>
                   <span className="text-xs group-hover:scale-125 transition-transform">🛒</span>
                </div>
              )) || (
                <div className="py-6 text-center opacity-40 text-[9px] font-black uppercase">No Parts Recommended</div>
              )}
           </div>
        </div>

        {/* CARD 4: OWNERSHIP STRATEGY */}
        <div 
          className="bg-blue-600 rounded-[2rem] p-8 text-white space-y-6 shadow-xl shadow-blue-600/20"
          title="Actionable steps to maximize your car's resale value and minimize maintenance debt."
        >
           <h4 className="text-[10px] font-black text-blue-100 uppercase tracking-[0.3em]">Owner Strategy</h4>
           <div className="space-y-4">
              {cachedReport.strategicInsights?.slice(0, 3).map((insight, i) => (
                <div key={i} className="flex gap-4 items-start">
                   <span className="text-[10px] font-black opacity-40 mt-0.5">0{i+1}</span>
                   <p className="text-[11px] font-bold leading-relaxed">{insight}</p>
                </div>
              )) || (
                <div className="py-6 text-center opacity-60 text-[9px] font-black uppercase">Building Strategy...</div>
              )}
           </div>
        </div>

        {/* HIGH-IMPACT RE-SCAN BUTTON */}
        <div className="lg:col-span-2 pt-6">
           <TierGuard capability="AI_SCAN_MONTHLY">
             <button 
               onClick={handleAiAnalysis} 
               className="w-full bg-slate-900 border-2 border-blue-500/30 text-white py-12 rounded-[2.5rem] font-black uppercase tracking-[0.5em] text-[13px] shadow-[0_30px_60px_rgba(59,130,246,0.25)] hover:bg-blue-600 hover:border-blue-400 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-4 group overflow-hidden relative"
             >
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
               <span className="text-4xl group-hover:rotate-[360deg] transition-transform duration-1000">✧</span>
               <span className="relative z-10">Recalibrate System & Run New Scan</span>
               <div className="flex items-center gap-2 mt-2 opacity-50 text-[8px] font-bold tracking-[0.2em]">
                 <span>Last Audit: {new Date(cachedReport.timestamp).toLocaleDateString()}</span>
                 <span>•</span>
                 <span>Neural Link Ready</span>
               </div>
             </button>
           </TierGuard>
        </div>
      </div>
    </div>
  );
};