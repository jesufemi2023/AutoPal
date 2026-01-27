import React, { useState, useEffect } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../../shared/types.ts';
import { generateAIValuation } from '../../services/geminiService.ts';
import { updateVehicle } from '../../services/vehicleService.ts';
import { useAutoPalStore } from '../../shared/store.ts';
import { logFeatureUsage } from '../../services/usageService.ts';
import { TierGuard } from '../TierGuard.tsx';
import { useUsageQuota } from '../../hooks/useUsageQuota.ts';
import { AlertCircle, Zap, ShieldCheck, BarChart3, ShoppingCart } from 'lucide-react';

const LOADING_STAGES = [
  "Synchronizing Vehicle Telemetry...",
  "Auditing Metabolic Fuel Patterns...",
  "Cross-referencing Service Integrity...",
  "Calculating Regional Market Grade...",
  "Generating Strategic Exit Insights...",
  "Finalizing Neural Audit Report..."
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
  
  // Track Quota for the UI
  const quota = useUsageQuota('AI_SCAN_MONTHLY');

  const cachedReport = vehicle.latestAiAudit;

  // Cycle through loading messages to improve UX perceived speed
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
      setLocalError("Pilot License Capacity Reached. Please upgrade for more scans.");
      return;
    }

    setLocalError(null);
    
    // 1. PRE-FLIGHT CONNECTIVITY CHECK
    if (!navigator.onLine) {
      setLocalError("Device is offline. Cloud link required for Neural Audit (No quota deducted).");
      return;
    }

    setIsAnalyzing(true);
    setLoadingStage(0);

    try {
      // 2. Perform AI Analysis FIRST
      const report = await generateAIValuation(vehicle, tasks, serviceLogs, fuelLogs);
      
      // 3. Log Usage ONLY ON SUCCESS
      if (user?.id) {
        await logFeatureUsage(user.id, 'ai_scan_monthly');
      }

      // 4. Persist and Update Store
      const updatedVehicle = await updateVehicle(vehicle.id, { 
        latestAiAudit: report,
        healthScore: report.auditedScores.vitality 
      });
      
      updateVehicleStore(updatedVehicle);
    } catch (e: any) {
      console.error("Audit Fault:", e);
      if (e.message?.includes("QUOTA_EXHAUSTED")) {
        setLocalError("Monthly scan limit fulfilled. Your data is safe; upgrade your license for further audits.");
      } else if (e.message?.includes("OFFLINE_LINK_FAILURE")) {
        setLocalError("Connection lost mid-stream. Scan cancelled (No quota deducted).");
      } else {
        setLocalError("Neural Link Interrupted. Verification failed (No quota deducted). Please retry.");
      }
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
      <div className="bg-slate-950 rounded-[2.5rem] p-12 text-white relative overflow-hidden shadow-3xl border border-blue-500/20 w-full h-full flex flex-col items-center justify-center min-h-[500px] animate-in fade-in duration-500">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent animate-pulse"></div>
        </div>
        <div className="relative z-10 text-center space-y-10 max-w-sm">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto shadow-[0_0_60px_rgba(59,130,246,0.3)]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap size={24} className="text-blue-400 animate-pulse" />
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-2xl font-black tracking-tighter uppercase transition-all duration-500">AI Condition Audit</h4>
            <div className="flex flex-col items-center gap-2">
              <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] animate-bounce">
                {LOADING_STAGES[loadingStage]}
              </p>
              <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">Processing Secure Stream</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cachedReport || isLegacyReport || localError) {
    return (
      <section className="bg-slate-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl group border border-white/5 w-full h-full flex flex-col min-h-[400px] items-center justify-center text-center">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/5 blur-[120px] rounded-full"></div>
        <div className="space-y-8 max-w-sm relative z-10">
          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl mx-auto border ${localError ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-blue-600/10 border-blue-500/20 text-blue-400'}`}>
            {localError ? <AlertCircle size={32} /> : '✧'}
          </div>
          <div className="space-y-3">
            <h4 className={`text-2xl font-black tracking-tighter uppercase ${localError ? 'text-rose-400' : 'text-white'}`}>
              {localError ? 'System Block' : (isLegacyReport ? 'Audit Refresh Required' : 'Condition Scan Inactive')}
            </h4>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
              {localError || (isLegacyReport 
                ? 'Your audit profile is legacy. Re-scan to unlock advanced financial and mechanical projections.' 
                : 'Perform a deep mechanical audit to certify your car\'s market value and detect hidden inefficiency.')}
            </p>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={handleAiAnalysis} 
              disabled={!!(localError && !isLegacyReport)}
              className={`w-full py-10 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-[13px] shadow-2xl active:scale-95 transition-all mt-6 border-2 group flex flex-col items-center gap-3 ${localError && !isLegacyReport ? 'bg-slate-900 border-slate-800 text-slate-600 grayscale cursor-not-allowed' : 'bg-blue-600 text-white border-blue-400/30 hover:bg-blue-500 shadow-blue-600/20'}`}
            >
              <div className="flex items-center justify-center gap-4">
                <span className="text-2xl group-hover:scale-125 transition-transform">✧</span>
                {isLegacyReport ? 'Run Full System Update' : 'Initialize Deep Scan'}
              </div>
              {!localError && (
                <span className="text-[8px] font-black opacity-60 tracking-widest">
                  Capacity: {quota.limit - quota.current} Scans Available
                </span>
              )}
            </button>
            {localError && (
              <button 
                onClick={() => setCurrentView('profile')}
                className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline"
              >
                View Pilot Upgrade Options →
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="w-full h-full space-y-6 flex flex-col animate-in fade-in duration-700">
      {/* Top Value Card */}
      <section 
        className="bg-slate-950 rounded-[2.5rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl border border-white/10 shrink-0 group"
        title="Current resale value based on regional market trends, history confidence, and condition."
      >
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] font-black text-9xl pointer-events-none uppercase transition-transform group-hover:scale-110 duration-1000">{cachedReport.marketGrade}</div>
        <div className="flex justify-between items-start relative z-10">
          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse"></div>
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">Market Resale Estimate</h3>
             </div>
             <div className="space-y-1">
                <div className="text-5xl sm:text-7xl font-black tracking-tighter leading-none flex items-baseline group-hover:text-blue-400 transition-colors">
                  <span className="text-2xl text-slate-600 mr-2 font-mono">₦</span>
                  {cachedReport.valuationNGN?.toLocaleString() ?? '0'}
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-[10px] text-blue-500/60 font-black uppercase tracking-widest">Accuracy: {Math.round(cachedReport.auditedScores?.discipline ?? 0)}%</p>
                  <span className="text-slate-800">|</span>
                  <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Quota: {quota.limit - quota.current}/{quota.limit} Left</p>
                </div>
             </div>
          </div>
          <div className="text-right">
             <div className={`text-6xl font-black leading-none ${gradeColors[cachedReport.marketGrade as keyof typeof gradeColors]}`}>{cachedReport.marketGrade}</div>
             <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2">Market Grade</div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/5 grid grid-cols-2 gap-8 relative z-10">
           <div className="space-y-1">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={10} className="text-emerald-500" /> Car Health
              </div>
              <div className={`text-2xl font-black ${(cachedReport.auditedScores?.vitality ?? 0) > 75 ? 'text-emerald-400' : 'text-rose-500'}`}>{cachedReport.auditedScores?.vitality ?? 0}%</div>
           </div>
           <div className="space-y-1">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={10} className="text-blue-500" /> Price Range
              </div>
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
          className="bg-white rounded-[2rem] p-8 border border-slate-100 space-y-6 shadow-sm hover:shadow-md transition-shadow"
          title="Comparison of real-world consumption against benchmarks."
        >
           <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Fuel Usage Report</h4>
              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${cachedReport.metabolicAudit?.efficiencyTrend === 'improving' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {cachedReport.metabolicAudit?.efficiencyTrend ?? 'stable'}
              </span>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                 <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-2">Measured KM/L</div>
                 <div className="text-2xl font-black text-slate-900">{cachedReport.metabolicAudit?.trueKml?.toFixed(1) ?? '0.0'}</div>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
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
          className="bg-white rounded-[2rem] p-8 border border-slate-100 space-y-6 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow"
          title="Hidden mechanical issues detected by neural correlation."
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
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">"{cachedReport.diagnostics?.reasoning ?? 'No abnormal patterns detected.'}"</p>
              </div>
           </div>
        </div>

        {/* CARD 3: RECOMMENDED PARTS */}
        <div 
          className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 shadow-xl"
          title="AI-identified parts to restore health."
        >
           <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Critical Components</h4>
              <ShoppingCart size={14} className="text-slate-600" />
           </div>
           <div className="space-y-3">
              {cachedReport.suggestedParts?.slice(0, 3).map((part, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center group hover:bg-white/10 transition-all cursor-pointer" 
                     onClick={() => { setMarketplaceFilter(part.name); setCurrentView('marketplace'); }}>
                   <div className="space-y-1">
                      <div className="text-[10px] font-black text-white uppercase">{part.name}</div>
                      <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{part.reason}</div>
                   </div>
                   <span className="text-xs group-hover:scale-125 transition-transform opacity-0 group-hover:opacity-100">🛒</span>
                </div>
              )) || (
                <div className="py-6 text-center opacity-40 text-[9px] font-black uppercase">No Parts Recommended</div>
              )}
           </div>
        </div>

        {/* CARD 4: OWNERSHIP STRATEGY */}
        <div 
          className="bg-blue-600 rounded-[2rem] p-8 text-white space-y-6 shadow-xl shadow-blue-600/20"
          title="Actionable steps to maximize value."
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

        {/* RE-SCAN BUTTON */}
        <div className="lg:col-span-2 pt-6">
           <button 
             onClick={handleAiAnalysis} 
             disabled={isAnalyzing}
             className="w-full bg-slate-900 border-2 border-blue-500/30 text-white py-12 rounded-[2.5rem] font-black uppercase tracking-[0.5em] text-[13px] shadow-[0_30px_60px_rgba(59,130,246,0.25)] hover:bg-blue-600 hover:border-blue-400 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-4 group overflow-hidden relative"
           >
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
             <span className="text-4xl group-hover:rotate-[360deg] transition-transform duration-1000">✧</span>
             <span className="relative z-10">Recalibrate System & Run New Scan</span>
             <div className="flex items-center gap-2 mt-2 opacity-50 text-[8px] font-bold tracking-[0.2em]">
               <span>Last Audit: {new Date(cachedReport.timestamp).toLocaleDateString()}</span>
               <span>•</span>
               <span>{quota.limit - quota.current} Scans Available</span>
             </div>
           </button>
        </div>
      </div>
    </div>
  );
};