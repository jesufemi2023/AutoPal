
import React, { useMemo } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog, ServiceCategory } from '../../shared/types.ts';
import { 
  calculateIntelligentHealth,
  getTaskMaintenanceStatus
} from '../../services/maintenanceLogic.ts';
import { Info } from 'lucide-react';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  logs: ServiceLog[];
  fuelLogs: FuelLog[];
}

export const VitalityDashboard: React.FC<Props> = ({ vehicle, tasks, logs, fuelLogs }) => {
  const localEvidence = useMemo(() => calculateIntelligentHealth(vehicle, tasks, fuelLogs, logs), [vehicle, tasks, fuelLogs, logs]);
  
  const cachedAudit = vehicle.latestAiAudit;
  const displayVitality = cachedAudit ? cachedAudit.auditedScores.vitality : localEvidence.total;
  const displayDiscipline = cachedAudit ? cachedAudit.auditedScores.discipline : localEvidence.breakdown.provenance;

  const pillars: ServiceCategory[] = ['fluids', 'engine', 'brakes', 'suspension', 'tires', 'electrical', 'cooling', 'other'];

  const getPillarStatus = (cat: ServiceCategory) => {
    const pillarTasks = tasks.filter(t => t.category === cat);
    if (pillarTasks.length === 0) return { score: 100, label: 'Optimal', count: 0, overdue: 0 };
    
    const overdue = pillarTasks.filter(t => t.status === 'pending' && getTaskMaintenanceStatus(vehicle, t) === 'overdue');
    const upcoming = pillarTasks.filter(t => t.status === 'pending' && getTaskMaintenanceStatus(vehicle, t) === 'upcoming');
    const score = Math.max(0, 100 - (overdue.length / pillarTasks.length) * 100);
    
    let label = 'Healthy';
    if (overdue.length > 0) label = 'Fix Needed';
    else if (upcoming.length > 0) label = 'Check Soon';

    return { score, label, count: pillarTasks.length, overdue: overdue.length };
  };

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl border border-white/5 group">
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
            Car Health Score <Info size={10} />
          </div>
          <div className="flex items-baseline gap-3">
            <div className={`text-6xl font-black tracking-tighter transition-all text-blue-500 group-hover:scale-105`}>
              {displayVitality}%
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Overall Condition</div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl border border-white/5 group">
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
            Record Integrity <Info size={10} />
          </div>
          <div className="flex items-baseline gap-3">
            <div className={`text-6xl font-black tracking-tighter transition-all text-emerald-500 group-hover:scale-105`}>
              {Math.round(displayDiscipline)}%
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">History Trust</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 sm:p-12 rounded-[3rem] border border-slate-100 shadow-sm w-full flex-grow">
        <div className="space-y-1.5 mb-12">
          <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">
            System Breakdown
          </h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Individual Car Systems Health</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12">
          {pillars.map(pillar => {
            const status = getPillarStatus(pillar);
            return (
              <div key={pillar} className="space-y-5 group/pillar relative">
                <div className="flex justify-between items-end mb-2">
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{pillar}</h5>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${status.overdue > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                      <span className={`text-[8px] font-black uppercase tracking-widest ${status.overdue > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{status.label}</span>
                    </div>
                  </div>
                  <span className={`font-mono font-bold text-lg ${status.score > 80 ? 'text-emerald-500' : 'text-rose-500'}`}>{Math.round(status.score)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden p-0.5">
                  <div className={`h-full rounded-full transition-all duration-1000 ${status.score > 80 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${status.score}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
