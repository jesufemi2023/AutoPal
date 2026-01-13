
import React, { useMemo } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog, ServiceCategory } from '../../shared/types.ts';
import { 
  calculateIntelligentHealth,
  getTaskMaintenanceStatus
} from '../../services/maintenanceLogic.ts';
import { formatCurrency } from '../../shared/utils.ts';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  logs: ServiceLog[];
  fuelLogs: FuelLog[];
}

export const VitalityDashboard: React.FC<Props> = ({ vehicle, tasks, logs, fuelLogs }) => {
  const health = useMemo(() => calculateIntelligentHealth(vehicle, tasks, fuelLogs, logs), [vehicle, tasks, fuelLogs, logs]);

  const pillars: ServiceCategory[] = ['fluids', 'engine', 'brakes', 'suspension', 'tires', 'electrical', 'cooling', 'other'];

  const getPillarStatus = (cat: ServiceCategory) => {
    const pillarTasks = tasks.filter(t => t.category === cat);
    if (pillarTasks.length === 0) return 100;
    const overdue = pillarTasks.filter(t => t.status === 'pending' && getTaskMaintenanceStatus(vehicle, t) === 'overdue');
    return Math.max(0, 100 - (overdue.length / pillarTasks.length) * 100);
  };

  const metabolicInfo = {
    optimal: { color: 'text-emerald-500', bg: 'bg-emerald-500', text: 'Healthy Metabolism', sub: 'Engine functioning within optimal parameters.' },
    warning: { color: 'text-amber-500', bg: 'bg-amber-500', text: 'Metabolic Friction', sub: 'Efficiency drop detected. Check air filtration.' },
    critical: { color: 'text-rose-500', bg: 'bg-rose-500', text: 'Systemic Inefficiency', sub: 'Critical fuel loss. Immediate diagnostic required.' }
  };

  const status = metabolicInfo[health.breakdown.metabolicStatus];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Metabolic Monitor (The Vital Value) */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-6xl group-hover:scale-110 transition-transform">⛽</div>
          <div className="space-y-1 relative z-10">
            <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Engine Metabolism</h4>
            <div className={`text-3xl font-black tracking-tighter ${status.color}`}>{status.text}</div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{status.sub}</p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/5 space-y-4 relative z-10">
            {health.breakdown.wasteMonthly > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl">
                <div className="text-[7px] font-black text-rose-400 uppercase tracking-widest mb-1">Estimated Monthly Waste</div>
                <div className="text-xl font-black text-rose-500">{formatCurrency(health.breakdown.wasteMonthly)}</div>
              </div>
            )}
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-slate-500">Efficiency Variance</span>
              <span className={status.color}>{health.breakdown.metabolic}% Stability</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${status.bg}`} style={{ width: `${health.breakdown.metabolic}%` }}></div>
            </div>
          </div>
        </div>

        {/* 8 Pillar Health Matrix */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm md:col-span-2 relative group">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Engineering Integrity Map</h4>
            <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
              Provenance Index: {Math.round(health.breakdown.provenance)}%
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {pillars.map(pillar => {
              const score = getPillarStatus(pillar);
              return (
                <div key={pillar} className="space-y-2">
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">{pillar}</span>
                    <span className={score > 80 ? 'text-emerald-500' : 'text-rose-500'}>{score}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                    <div className={`h-full ${score > 80 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${score}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Digital Integrity Certificate Generated</p>
            <button className="text-blue-600 text-[9px] font-black uppercase tracking-widest hover:underline">View Passport →</button>
          </div>
        </div>
      </div>
    </div>
  );
};
