
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
    <div className="w-full h-full">
      <div className="flex flex-col xl:flex-row gap-5 w-full h-full items-stretch">
        
        {/* Metabolic Diagnostic - Adapts horizontally */}
        <div className="bg-slate-900 p-6 rounded-3xl text-white flex flex-col justify-between shadow-xl relative overflow-hidden group border border-white/5 transition-all duration-500 w-full xl:w-5/12 shrink-0">
          <div className="absolute top-0 right-0 p-6 opacity-5 text-7xl transition-transform duration-700 group-hover:scale-110 leading-none select-none pointer-events-none">⛽</div>
          
          <div className="space-y-4 relative z-10">
            <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] leading-none">Fuel Conversion Node</h4>
            <div className="space-y-1.5">
              <div className={`text-2xl font-black tracking-tighter leading-none ${status.color}`}>
                {health.breakdown.isCalibrating ? 'Calibrating...' : status.title}
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed opacity-90 max-w-[200px]">
                {health.breakdown.isCalibrating ? 'Syncing telemetry sensors.' : status.text}
              </p>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/5 space-y-5 relative z-10">
            {!health.breakdown.isCalibrating && health.breakdown.wasteMonthly > 0 && (
              <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center group-hover:bg-white/10 transition-colors">
                <div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Monthly Leakage</div>
                  <div className="text-xl font-mono font-black text-rose-500 leading-none">{formatCurrency(health.breakdown.wasteMonthly)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Variance</div>
                  <div className="text-[10px] font-mono font-black text-rose-400">+{metabolism.variance}%</div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest leading-none">
                <span className="text-slate-500">Stability Matrix</span>
                <span className={status.color}>{health.breakdown.metabolic}%</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${status.bg}`} style={{ width: `${health.breakdown.metabolic}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* 8 Pillar Engineering Map - Fluid layout */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group flex flex-col transition-all duration-500 hover:shadow-lg w-full flex-grow">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-8">
            <div className="space-y-1">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Engineering Map</h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider opacity-80 leading-none">Global Logic Analysis</p>
            </div>
            <div className="bg-slate-50 text-slate-600 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-100 shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all shrink-0">
              Integrity: <span className="font-mono font-bold">{Math.round(health.breakdown.provenance)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-6 flex-grow">
            {pillars.map(pillar => {
              const score = getPillarStatus(pillar);
              return (
                <div key={pillar} className="space-y-3 group/pillar">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-wider items-center leading-none">
                    <span className="text-slate-400 transition-colors group-hover/pillar:text-blue-600 truncate mr-1">{pillar}</span>
                    <span className={`font-mono font-bold text-[10px] ${score > 80 ? 'text-emerald-500' : 'text-rose-500'}`}>{score}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${score > 80 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${score}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-600 font-black text-xs shadow-sm shrink-0">i</div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Integrity Passport v2.1</p>
                <p className="text-[7px] text-slate-300 font-black uppercase tracking-wider leading-none">Evaluation Engine Active</p>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all hover:bg-blue-600"
            >
              Force Sync →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
