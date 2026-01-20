
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
  const { updateVehicleStore, setMarketplaceFilter, setCurrentView } = useAutoPalStore();
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
      alert("Neural Analysis Failure. Please check connection.");
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

  // DEFENSIVE GUARD: Check for structure completeness to prevent legacy record crashes
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
          <div className="h-full w-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        </div>
        <div className="relative z-10 text-center space-y-8 max-w-sm">
          <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_40px_rgba(59,130,246,0.5)]"></div>
          <div className="space-y-4">
            <h4 className="text-2xl font-black tracking-tighter uppercase">Analyzing Telemetry</h4>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">
              Synthesizing fuel efficiency with service latency...
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
              {isLegacyReport ? 'Update Required' : 'Perform Neural Audit'}
            </h4>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
              {isLegacyReport 
                ? 'Your previous audit is out of date. Upgrade to unlock the advanced diagnostics engine and fuel analysis.' 
                : 'Initiate a deep scan to generate your certified resale value and diagnostic fault hypothesis.'}
            </p>
          </div>
          <button onClick={handleAiAnalysis} className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-xl hover:bg-blue-500 active:scale-95 transition-all">
            {isLegacyReport ? 'Upgrade Scan Link' : 'Start Neural Audit'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="w-full h-full space-y-6 flex flex-col">
      {/* Top Value Card */}
      <section className="bg-slate-950 rounded-[2.5rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl border border-white/10 shrink-0">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] font-black text-9xl pointer-events-none uppercase">{cachedReport.marketGrade}</div>
        <div className="flex justify-between items-start relative z-10">
          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse"></div>
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">Certified Resale Valuation</h3>
             </div>
             <div className="space-y-1">
                <div className="text-5xl sm:text-7xl font-black tracking-tighter leading-none flex items-baseline">
                  <span className="text-2xl text-slate-600 mr-2 font-mono">₦</span>
                  {cachedReport.valuationNGN?.toLocaleString() ?? '0'}
                </div>
                <p className="text-[10px] text-blue-500/60 font-black uppercase tracking-widest">Trust Confidence: {cachedReport.auditedScores?.discipline ?? 0}%</p>
             </div>
          </div>
          <div className="text-right">
             <div className={`text-6xl font-black leading-none ${gradeColors[cachedReport.marketGrade as keyof typeof gradeColors]}`}>{cachedReport.marketGrade}</div>
             <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2">Market Grade</div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/5 grid grid-cols-2 gap-8 relative z-10">
           <div className="space-y-1">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Vitality Check</div>
              <div className={`text-2xl font-black ${(cachedReport.auditedScores?.vitality ?? 0) > 75 ? 'text-emerald-400' : 'text-rose-500'}`}>{cachedReport.auditedScores?.vitality ?? 0}%</div>
           </div>
           <div className="space-y-1">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Fair Market Range</div>
              <div className="text-sm font-mono font-bold text-slate-300">
                ₦{((cachedReport.priceRange?.min ?? 0)/1e6).toFixed(1)}M - ₦{((cachedReport.priceRange?.max ?? 0)/1e6).toFixed(1)}M
              </div>
           </div>
        </div>
      </section>

      {/* Deep Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow">
        
        {/* CARD 1: FUEL CONSUMPTION ANALYSIS */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 space-y-6 shadow-sm">
           <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Fuel Consumption Analysis</h4>
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
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Metabolic Rating</span>
              <span className="text-[10px] font-black text-blue-700 uppercase">{(cachedReport.metabolicAudit?.consumptionGap ?? 0) < 12 ? 'OPTIMAL' : 'BELOW TARGET'}</span>
           </div>
        </div>

        {/* CARD 2: AI DIAGNOSTICS ENGINE */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 space-y-6 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">AI Diagnostics</h4>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${severityColors[cachedReport.diagnostics?.severity as keyof typeof severityColors] || 'bg-slate-300'} animate-pulse`}></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{cachedReport.diagnostics?.severity ?? 'Normal'}</span>
              </div>
           </div>
           <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Fault Hypothesis</div>
                <div className="text-lg font-black text-slate-900 leading-tight">{cachedReport.diagnostics?.faultHypothesis ?? 'Stable Telemetry'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Diagnostic Reasoning</div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">"{cachedReport.diagnostics?.reasoning ?? 'Vehicle logs match factory standard patterns.'}"</p>
              </div>
           </div>
        </div>

        {/* CARD 3: RECOVERY PARTS */}
        <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 lg:col-span-1 shadow-xl">
           <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Recommended Hardware</h4>
              <button onClick={handleAiAnalysis} className="text-[8px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400">Force Rescan</button>
           </div>
           <div className="space-y-3">
              {cachedReport.suggestedParts?.slice(0, 3).map((part, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center group hover:bg-white/10 transition-all cursor-pointer" 
                     onClick={() => { setMarketplaceFilter(part.name); setCurrentView('marketplace'); }}>
                   <div className="space-y-1">
                      <div className="text-[10px] font-black text-white uppercase">{part.name}</div>
                      <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{part.reason}</div>
                   </div>
                   <span className="text-xs group-hover:scale-125 transition-transform">🛒</span>
                </div>
              )) || (
                <div className="py-6 text-center opacity-40 text-[9px] font-black uppercase">No Parts Recommended</div>
              )}
           </div>
        </div>

        {/* CARD 4: STRATEGIC INSIGHTS */}
        <div className="bg-blue-600 rounded-[2rem] p-8 text-white space-y-6 lg:col-span-1 shadow-xl shadow-blue-600/20">
           <h4 className="text-[10px] font-black text-blue-100 uppercase tracking-[0.3em]">Ownership Strategy</h4>
           <div className="space-y-4">
              {cachedReport.strategicInsights?.slice(0, 3).map((insight, i) => (
                <div key={i} className="flex gap-4 items-start">
                   <span className="text-[10px] font-black opacity-40 mt-0.5">0{i+1}</span>
                   <p className="text-[11px] font-bold leading-relaxed">{insight}</p>
                </div>
              )) || (
                <div className="py-6 text-center opacity-60 text-[9px] font-black uppercase">Analyzing Strategy...</div>
              )}
           </div>
        </div>
      </div>

      <div className="text-center pt-6 pb-4">
         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Audit Dossier ID: {cachedReport.timestamp?.slice(-6).toUpperCase() ?? 'N/A'} // Generated: {new Date(cachedReport.timestamp).toLocaleDateString()}</p>
      </div>
    </div>
  );
};
