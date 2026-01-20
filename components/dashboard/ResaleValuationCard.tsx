
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
            <h4 className="text-2xl font-black tracking-tighter uppercase">Cross-Examining Telemetry</h4>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">
              Correlating fuel logs with service history to identify metabolic drift...
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3].map(i => <div key={i} className="h-1 bg-blue-500/20 rounded-full overflow-hidden"><div className="h-full bg-blue-500 animate-[shimmer_2s_infinite]" style={{animationDelay: `${i*0.5}s`}}></div></div>)}
          </div>
        </div>
      </div>
    );
  }

  if (!cachedReport) {
    return (
      <section className="bg-slate-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl group border border-white/5 w-full h-full flex flex-col min-h-[400px] items-center justify-center text-center">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/5 blur-[120px] rounded-full"></div>
        <div className="space-y-8 max-w-sm relative z-10">
          <div className="w-20 h-20 bg-blue-600/10 rounded-[2rem] flex items-center justify-center text-3xl mx-auto border border-blue-500/20">✧</div>
          <div className="space-y-3">
            <h4 className="text-2xl font-black tracking-tighter uppercase">Perform Neural Audit</h4>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
              Analyze your vehicle's mechanical & financial health to unlock accurate valuation and fault detection.
            </p>
          </div>
          <button onClick={handleAiAnalysis} className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-xl hover:bg-blue-500 active:scale-95 transition-all">
            Start AI Scan
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
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">Neural Resale Estimate</h3>
             </div>
             <div className="space-y-1">
                <div className="text-5xl sm:text-7xl font-black tracking-tighter leading-none flex items-baseline">
                  <span className="text-2xl text-slate-600 mr-2 font-mono">₦</span>
                  {cachedReport.valuationNGN.toLocaleString()}
                </div>
                <p className="text-[10px] text-blue-500/60 font-black uppercase tracking-widest">Confidence: {cachedReport.auditedScores.discipline}% based on verified logs</p>
             </div>
          </div>
          <div className="text-right">
             <div className={`text-6xl font-black leading-none ${gradeColors[cachedReport.marketGrade as keyof typeof gradeColors]}`}>{cachedReport.marketGrade}</div>
             <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2">Market Grade</div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/5 grid grid-cols-2 gap-8 relative z-10">
           <div className="space-y-1">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Vitality Score</div>
              <div className={`text-2xl font-black ${cachedReport.auditedScores.vitality > 75 ? 'text-emerald-400' : 'text-rose-500'}`}>{cachedReport.auditedScores.vitality}%</div>
           </div>
           <div className="space-y-1">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Price Span</div>
              <div className="text-sm font-mono font-bold text-slate-300">₦{(cachedReport.priceRange.min/1e6).toFixed(1)}M - ₦{(cachedReport.priceRange.max/1e6).toFixed(1)}M</div>
           </div>
        </div>
      </section>

      {/* 4-Quadrant Deep Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow">
        {/* Q1: Metabolic Audit */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 space-y-6">
           <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Metabolic Audit</h4>
              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${cachedReport.metabolicAudit.efficiencyTrend === 'improving' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                Trend: {cachedReport.metabolicAudit.efficiencyTrend}
              </span>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl">
                 <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">True KM/L</div>
                 <div className="text-xl font-black text-slate-900">{cachedReport.metabolicAudit.trueKml.toFixed(1)}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                 <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Gap</div>
                 <div className={`text-xl font-black ${cachedReport.metabolicAudit.consumptionGap > 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
                   +{cachedReport.metabolicAudit.consumptionGap}%
                 </div>
              </div>
           </div>
           <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between">
              <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Monthly Neglect Tax</span>
              <span className="text-lg font-black text-rose-700">{formatCurrency(cachedReport.metabolicAudit.monthlyNeglectTax)}</span>
           </div>
        </div>

        {/* Q2: Diagnostics */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 space-y-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4">
              <div className={`w-3 h-3 rounded-full ${cachedReport.diagnostics.severity === 'critical' ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`}></div>
           </div>
           <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">System Diagnostic</h4>
           <div className="space-y-4">
              <div className="text-lg font-black text-slate-900 leading-tight">{cachedReport.diagnostics.faultHypothesis}</div>
              <p className="text-[11px] text-slate-500 leading-relaxed italic border-l-2 border-blue-500 pl-4">"{cachedReport.diagnostics.reasoning}"</p>
           </div>
        </div>

        {/* Q3: Recovery Parts */}
        <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 lg:col-span-2">
           <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Recovery Strategy: Recommended Parts</h4>
              <button onClick={handleAiAnalysis} className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Rescan Engine</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cachedReport.suggestedParts.map((part, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-all cursor-pointer" 
                     onClick={() => { setMarketplaceFilter(part.name); setCurrentView('marketplace'); }}>
                   <div className="space-y-1">
                      <div className="text-[10px] font-black text-white uppercase tracking-tight">{part.name}</div>
                      <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{part.reason}</div>
                   </div>
                   <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs group-hover:scale-110 transition-transform">🛒</div>
                </div>
              ))}
           </div>
        </div>

        {/* Q4: 5 Strategic Insights */}
        <div className="bg-blue-600 rounded-[2rem] p-8 text-white space-y-6 lg:col-span-2 shadow-xl shadow-blue-600/20">
           <h4 className="text-[10px] font-black text-blue-100 uppercase tracking-[0.3em]">Neural Insights Dossier</h4>
           <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              {cachedReport.strategicInsights.map((insight, i) => (
                <div key={i} className="flex gap-4 items-start p-2 border-b border-blue-500/30 last:border-0">
                   <span className="text-lg opacity-40 shrink-0">0{i+1}</span>
                   <p className="text-[11px] font-bold leading-relaxed">{insight}</p>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="text-center pt-4">
         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Dossier Timestamp: {new Date(cachedReport.timestamp).toLocaleString()} // Secure Audit ID: {cachedReport.timestamp.slice(-6)}</p>
      </div>
    </div>
  );
};
