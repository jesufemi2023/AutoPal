
import React, { useMemo } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog, ServiceCategory } from '../../shared/types.ts';
import { 
  calculateIntelligentHealth,
  getTaskMaintenanceStatus,
  calculateMetabolicStatus
} from '../../services/maintenanceLogic.ts';
import { formatCurrency } from '../../shared/utils.ts';
import { useAutoPalStore } from '../../shared/store.ts';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  logs: ServiceLog[];
  fuelLogs: FuelLog[];
}

export const VitalityDashboard: React.FC<Props> = ({ vehicle, tasks, logs, fuelLogs }) => {
  const { aiValuationReports } = useAutoPalStore();
  const cachedReport = aiValuationReports[vehicle.id];

  const localHealth = useMemo(() => calculateIntelligentHealth(vehicle, tasks, fuelLogs, logs), [vehicle, tasks, fuelLogs, logs]);
  const metabolism = useMemo(() => calculateMetabolicStatus(vehicle, fuelLogs), [vehicle, fuelLogs]);

  // Use AI audited scores if recent, otherwise fallback to local formulas
  const displayVitality = cachedReport ? cachedReport.auditedScores.vitality : localHealth.total;
  const isAiAudited = !!cachedReport;

  const pillars: ServiceCategory[] = ['fluids', 'engine', 'brakes', 'suspension', 'tires', 'electrical', 'cooling', 'other'];

  const getPillarStatus = (cat: ServiceCategory) => {
    const pillarTasks = tasks.filter(t => t.category === cat);
    if (pillarTasks.length === 0) return 100;
    const overdue = pillarTasks.filter(t => t.status === 'pending' && getTaskMaintenanceStatus(vehicle, t) === 'overdue');
    return Math.max(0, 100 - (overdue.length / pillarTasks.length) * 100);
  };

  const metabolicInfo = {
    optimal: { color: 'text-emerald-500', bg: 'bg-emerald-500', title: 'Optimal Performance', text: 'Vehicle is running efficiently within expected fuel usage targets.' },
    warning: { color: 'text-amber-500', bg: 'bg-amber-500', title: 'Efficiency Drift', text: 'Minor drop in efficiency detected. Check air filters or tire pressure.' },
    critical: { color: 'text-rose-500', bg: 'bg-rose-500', title: 'High Consumption', text: 'Significant efficiency loss. Immediate engine inspection recommended.' }
  };

  const status = metabolicInfo[localHealth.breakdown.metabolicStatus];

  return (
    <div className="w-full h-full">
      <div className="flex flex-col gap-6 w-full h-full">
        
        {/* Fuel Efficiency Diagnostic */}
        <div className="bg-slate-900 p-8 sm:p-10 rounded-[2rem] text-white flex flex-col justify-between shadow-xl relative overflow-hidden group border border-white/10 transition-all duration-500 w-full shrink-0">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-[8rem] transition-transform duration-1000 group-hover:scale-110 leading-none select-none pointer-events-none">⛽</div>
          
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3">
               <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Fuel Efficiency</h4>
               {isAiAudited && <span className="text-[7px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded font-black uppercase tracking-widest">AI Audited</span>}
            </div>
            <div className="space-y-2.5">
              <div className={`text-3xl font-black tracking-tighter leading-none ${status.color}`}>
                {localHealth.breakdown.isCalibrating ? 'Calibrating Data' : status.title}
              </div>
              <p className="text-[12px] text-slate-400 font-medium leading-relaxed opacity-90">
                {localHealth.breakdown.isCalibrating ? 'Accumulating logs to establish your unique efficiency baseline.' : status.text}
              </p>
            </div>
          </div>
          
          <div className="mt-10 pt-8 border-t border-white/5 space-y-6 relative z-10">
            {!localHealth.breakdown.isCalibrating && localHealth.breakdown.wasteMonthly > 0 && (
              <div className="bg-white/5 border border-white/10 p-5 rounded-[1.5rem] flex justify-between items-center group-hover:bg-white/10 transition-colors">
                <div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Est. Monthly Waste</div>
                  <div className="text-2xl font-mono font-black text-rose-500 leading-none">{formatCurrency(localHealth.breakdown.wasteMonthly)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Variance</div>
                  <div className="text-xs font-mono font-black text-rose-400">+{metabolism.variance}%</div>
                </div>
              </div>
            )}

            <div className="space-y-3.5">
              <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Efficiency Score</span>
                <span className={status.color}>{localHealth.breakdown.metabolic}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${status.bg}`} style={{ width: `${localHealth.breakdown.metabolic}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Systems Health */}
        <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-100 shadow-sm relative group flex flex-col transition-all duration-500 hover:shadow-lg w-full flex-grow">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Neural Health Audit</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-80">Component Health Status</p>
            </div>
            <div className="bg-slate-900 text-white px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.15em] shadow-xl shrink-0">
              Vitality: <span className="font-mono font-bold">{displayVitality}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 lg:gap-10 flex-grow">
            {pillars.map(pillar => {
              const score = getPillarStatus(pillar);
              return (
                <div key={pillar} className="space-y-4 group/pillar">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest items-center">
                    <span className="text-slate-400 transition-colors group-hover/pillar:text-blue-600 whitespace-nowrap">{pillar}</span>
                    <span className={`font-mono font-bold text-[11px] ${score > 80 ? 'text-emerald-500' : 'text-rose-500'}`}>{score}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${score > 80 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${score}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 font-black text-sm shadow-sm shrink-0">i</div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                  Real-time Component Analysis
                </p>
                <p className="text-[8px] text-slate-300 font-black uppercase tracking-[0.2em]">{isAiAudited ? 'Verified by Global Audit Engine' : 'Calculating Local Probabilities'}</p>
              </div>
            </div>
            {!isAiAudited && (
               <p className="text-[8px] font-bold text-blue-600 uppercase tracking-widest text-center">Request valuation to enable AI Audit</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
