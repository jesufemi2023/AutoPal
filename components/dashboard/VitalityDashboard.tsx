
import React, { useMemo } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog, ServiceCategory } from '../../shared/types.ts';
import { 
  calculateIntelligentHealth,
  getTaskMaintenanceStatus,
  calculateMetabolicStatus
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
  const metabolism = useMemo(() => calculateMetabolicStatus(vehicle, fuelLogs), [vehicle, fuelLogs]);

  const pillars: ServiceCategory[] = ['fluids', 'engine', 'brakes', 'suspension', 'tires', 'electrical', 'cooling', 'other'];

  const getPillarStatus = (cat: ServiceCategory) => {
    const pillarTasks = tasks.filter(t => t.category === cat);
    if (pillarTasks.length === 0) return 100;
    const overdue = pillarTasks.filter(t => t.status === 'pending' && getTaskMaintenanceStatus(vehicle, t) === 'overdue');
    return Math.max(0, 100 - (overdue.length / pillarTasks.length) * 100);
  };

  const metabolicInfo = {
    optimal: { color: 'text-emerald-500', bg: 'bg-emerald-500', title: 'Stable Metabolism', text: 'Combustion nodes within tolerance.' },
    warning: { color: 'text-amber-500', bg: 'bg-amber-500', title: 'Telemetry Drift', text: 'Air/Fuel calibration recommended.' },
    critical: { color: 'text-rose-500', bg: 'bg-rose-500', title: 'Systemic Leak', text: 'Immediate mechanical audit required.' }
  };

  const status = metabolicInfo[health.breakdown.metabolicStatus];

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        
        {/* Metabolic Diagnostic */}
        <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group border border-white/10 transition-all duration-500">
          <div className="absolute top-0 right-0 p-10 opacity-5 text-9xl transition-transform duration-1000 group-hover:scale-125">⛽</div>
          
          <div className="space-y-6 relative z-10">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Node: Fuel Conversion</h4>
            <div className="space-y-2">
              <div className={`text-3xl font-black tracking-tighter ${status.color}`}>
                {health.breakdown.isCalibrating ? 'Calibrating Baseline' : status.title}
              </div>
              <p className="text-[12px] text-slate-400 font-medium leading-relaxed">
                {health.breakdown.isCalibrating ? 'Accumulating telemetry to establish metabolic index.' : status.text}
              </p>
            </div>
          </div>
          
          <div className="mt-10 pt-8 border-t border-white/5 space-y-6 relative z-10">
            {!health.breakdown.isCalibrating && health.breakdown.wasteMonthly > 0 && (
              <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex justify-between items-center group-hover:bg-white/10 transition-colors">
                <div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Monthly Leakage</div>
                  <div className="text-2xl font-mono font-black text-rose-500">{formatCurrency(health.breakdown.wasteMonthly)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Variance</div>
                  <div className="text-sm font-mono font-black text-rose-400">+{metabolism.variance}%</div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Stability Matrix</span>
                <span className={status.color}>{health.breakdown.metabolic}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${status.bg}`} style={{ width: `${health.breakdown.metabolic}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* 8 Pillar Engineering Map */}
        <div className="bg-white p-10 sm:p-14 rounded-[3rem] border border-slate-100 shadow-sm md:col-span-2 relative group flex flex-col transition-all duration-500 hover:shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
            <div className="space-y-1">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Engineering Integrity Map</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Asset System Analysis</p>
            </div>
            <div className="bg-slate-50 text-slate-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 shadow-sm transition-all group-hover:bg-slate-900 group-hover:text-white">
              Discipline Score: <span className="font-mono">{Math.round(health.breakdown.provenance)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 flex-grow">
            {pillars.map(pillar => {
              const score = getPillarStatus(pillar);
              return (
                <div key={pillar} className="space-y-4 group/pillar">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest items-center">
                    <span className="text-slate-400 transition-colors group-hover/pillar:text-blue-600">{pillar}</span>
                    <span className={`font-mono ${score > 80 ? 'text-emerald-500' : 'text-rose-500'}`}>{score}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${score > 80 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${score}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-14 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-blue-600 font-black text-sm shadow-sm">i</div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                Integrated Asset Integrity Passport v2.1 <br/>
                <span className="text-slate-300 font-black">Dynamic Equity Evaluation Engine</span>
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              Sync Passport →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
