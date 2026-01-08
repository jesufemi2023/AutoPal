
import React, { useMemo } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog } from '../../shared/types.ts';
import { calculateVitalityScore, calculateDisciplineScore, getSpendByCategory, detectAnomalies } from '../../services/maintenanceLogic.ts';
import { formatCurrency } from '../../shared/utils.ts';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  logs: ServiceLog[];
}

export const VitalityDashboard: React.FC<Props> = ({ vehicle, tasks, logs }) => {
  const vitality = useMemo(() => calculateVitalityScore(vehicle, tasks), [vehicle, tasks]);
  const discipline = useMemo(() => calculateDisciplineScore(logs, tasks), [logs, tasks]);
  const categorySpend = useMemo(() => getSpendByCategory(logs), [logs]);
  const totalSpend = useMemo(() => logs.reduce((acc, l) => acc + l.cost, 0), [logs]);
  const anomalies = useMemo(() => detectAnomalies(logs), [logs]);

  const getStatusColor = (score: number) => {
    if (score > 85) return 'text-emerald-500 bg-emerald-500/10';
    if (score > 60) return 'text-amber-500 bg-amber-500/10';
    return 'text-rose-500 bg-rose-500/10';
  };

  return (
    <div className="space-y-6">
      {/* Primary Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vitality Ring Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-50" />
              <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                strokeDasharray={364.4}
                strokeDashoffset={364.4 - (364.4 * vitality) / 100}
                className={`transition-all duration-1000 ${vitality > 80 ? 'text-emerald-500' : vitality > 50 ? 'text-amber-500' : 'text-rose-500'}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-900 leading-none">{vitality}%</span>
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Health</span>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Asset Vitality</h4>
            <p className="text-[10px] text-slate-400 font-medium">Weighted Engineering Score</p>
          </div>
        </div>

        {/* Financial Pulse */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-between shadow-xl">
          <div className="space-y-1">
            <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Total Expenditure</h4>
            <div className="text-3xl font-black tracking-tighter">{formatCurrency(totalSpend)}</div>
          </div>
          <div className="space-y-3 mt-8">
            {Object.entries(categorySpend).length > 0 ? Object.entries(categorySpend).slice(0, 3).map(([cat, amount]) => (
               <div key={cat} className="flex justify-between items-center text-[10px] font-bold">
                 <span className="text-slate-500 uppercase tracking-widest">{cat}</span>
                 {/* Fixed: Cast amount to number to ensure compatibility with formatCurrency signature */}
                 <span className="text-blue-400">{formatCurrency(amount as number)}</span>
               </div>
            )) : <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">No service data recorded</div>}
          </div>
        </div>

        {/* Discipline & Pattern Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Discipline Score</h4>
               <span className={`px-3 py-1 rounded-full text-[8px] font-black ${getStatusColor(discipline)}`}>{discipline}%</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
              Owner maintenance consistency reflects a <span className="text-slate-900 font-bold">{discipline > 70 ? 'High' : 'Low'} Credibility Rating</span> for future resale.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-50">
             <div className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-2">Resale Insight</div>
             <div className="text-[9px] font-bold text-slate-900">
               {logs.some(l => l.verificationLevel && l.verificationLevel !== 'self_declared') 
                 ? 'Digital Passport Verified ✓' 
                 : 'Self-Declared History (Unverified)'}
             </div>
          </div>
        </div>
      </div>

      {/* Anomaly Alerts Section */}
      {anomalies.length > 0 && (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-2">
            <span className="text-rose-500 text-lg">⚠️</span>
            <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Maintenance Pattern Alerts</h5>
          </div>
          <div className="space-y-3">
            {anomalies.map((anomaly, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-white/50 p-4 rounded-xl border border-rose-100">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${anomaly.severity === 'high' ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'}`}></div>
                <p className="text-[11px] font-bold text-slate-900 leading-relaxed">{anomaly.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
