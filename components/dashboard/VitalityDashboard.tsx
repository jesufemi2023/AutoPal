
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
  const localEvidence = useMemo(() => calculateIntelligentHealth(vehicle, tasks, fuelLogs, logs), [vehicle, tasks, fuelLogs, logs]);
  
  const cachedAudit = vehicle.latestAiAudit;
  const displayVitality = cachedAudit ? cachedAudit.auditedScores.vitality : null;
  const displayDiscipline = cachedAudit ? cachedAudit.auditedScores.discipline : null;

  // Drift Detection
  const hasDrift = useMemo(() => {
    if (!cachedAudit) return false;
    const auditTime = new Date(cachedAudit.timestamp).getTime();
    const latestLogTime = Math.max(
      ...logs.map(l => new Date(l.createdAt || l.serviceDate).getTime()),
      ...fuelLogs.map(l => new Date(l.createdAt).getTime()),
      0
    );
    return latestLogTime > auditTime;
  }, [cachedAudit, logs, fuelLogs]);

  const pillars: ServiceCategory[] = ['fluids', 'engine', 'brakes', 'suspension', 'tires', 'electrical', 'cooling', 'other'];

  const getPillarStatus = (cat: ServiceCategory) => {
    const pillarTasks = tasks.filter(t => t.category === cat);
    if (pillarTasks.length === 0) return { score: 100, label: 'Verified', count: 0, overdue: 0 };
    
    const overdue = pillarTasks.filter(t => t.status === 'pending' && getTaskMaintenanceStatus(vehicle, t) === 'overdue');
    const upcoming = pillarTasks.filter(t => t.status === 'pending' && getTaskMaintenanceStatus(vehicle, t) === 'upcoming');
    const score = Math.max(0, 100 - (overdue.length / pillarTasks.length) * 100);
    
    let label = 'Good';
    if (overdue.length > 0) label = 'Action Needed';
    else if (upcoming.length > 0) label = 'Watch Soon';

    return { score, label, count: pillarTasks.length, overdue: overdue.length };
  };

  const metab = localEvidence.breakdown;
  const metabolicColor = metab.metabolicStatus === 'optimal' ? 'text-emerald-500' : metab.metabolicStatus === 'warning' ? 'text-amber-500' : 'text-rose-500';
  const metabolicBg = metab.metabolicStatus === 'optimal' ? 'bg-emerald-500/10' : metab.metabolicStatus === 'warning' ? 'bg-amber-500/10' : 'bg-rose-500/10';

  return (
    <div className="w-full h-full flex flex-col gap-6">
      {/* Top-Level Audited Scores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Audited Vitality */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl border border-white/5 group">
          <div className="absolute top-0 right-0 p-6 opacity-[0.05] pointer-events-none transition-transform group-hover:scale-110">
             <div className="text-8xl font-black">C</div>
          </div>
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6">Condition Score</div>
          <div className="flex items-baseline gap-3">
            <div className={`text-6xl font-black tracking-tighter transition-all ${displayVitality !== null ? 'text-blue-500 group-hover:scale-105' : 'text-slate-700'}`}>
              {displayVitality !== null ? `${displayVitality}%` : '--'}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Vehicle Health Verdict</div>
          </div>
          {hasDrift && (
            <div className="mt-6 inline-flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
               <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
               <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">New Records Pending Audit</span>
            </div>
          )}
        </div>

        {/* Audited Discipline */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl border border-white/5 group">
          <div className="absolute top-0 right-0 p-6 opacity-[0.05] pointer-events-none transition-transform group-hover:scale-110">
             <div className="text-8xl font-black">H</div>
          </div>
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6">History Trust Score</div>
          <div className="flex items-baseline gap-3">
            <div className={`text-6xl font-black tracking-tighter transition-all ${displayDiscipline !== null ? 'text-emerald-500 group-hover:scale-105' : 'text-slate-700'}`}>
              {displayDiscipline !== null ? `${displayDiscipline}%` : '--'}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Record Reliability</div>
          </div>
        </div>
      </div>

      {/* Metabolic Insight (Elaborate & Informative) */}
      <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
           <div className="space-y-1">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Fuel Efficiency Performance</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Consumption Analysis</p>
           </div>
           {!metab.isCalibrating && (
             <div className={`px-4 py-2 rounded-2xl ${metabolicBg} ${metabolicColor} text-[10px] font-black uppercase tracking-widest border border-current/10`}>
                {metab.metabolicStatus === 'optimal' ? 'Running Efficiently' : 'High Consumption'}
             </div>
           )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="flex flex-col justify-center gap-6">
            <div className="flex items-baseline gap-4">
              <div className={`text-7xl font-black tracking-tighter ${metab.isCalibrating ? 'text-slate-200' : metabolicColor}`}>
                 {metab.isCalibrating ? '--' : `${metab.metabolic}%`}
              </div>
              <div className="space-y-1">
                 <div className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Efficiency Rating</div>
                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Variance from Normal</div>
              </div>
            </div>

            {!metab.isCalibrating && (
              <div className="space-y-4">
                <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100">
                   <div className={`h-full rounded-full transition-all duration-1000 ${metabolicColor.replace('text', 'bg')}`} style={{ width: `${metab.metabolic}%` }}></div>
                </div>
                <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                   <span>Poor</span>
                   <span>Average</span>
                   <span>Optimal</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-6 border border-slate-100">
             {metab.isCalibrating ? (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40 py-6">
                  <div className="text-2xl animate-spin">⚙️</div>
                  <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">Collecting more fuel records to calibrate analysis...</p>
               </div>
             ) : (
               <>
                 <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Consumption Drift</span>
                   <span className={`text-xs font-mono font-black ${metab.variance > 10 ? 'text-rose-500' : 'text-emerald-500'}`}>
                     {metab.variance > 0 ? `+${metab.variance}%` : `${metab.variance}%`}
                   </span>
                 </div>
                 <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estimated Monthly Waste</span>
                   <span className="text-xs font-mono font-black text-rose-500">{formatCurrency(metab.wasteMonthly)}</span>
                 </div>
                 <div className="pt-2">
                   <p className="text-[8px] text-slate-400 font-bold uppercase leading-relaxed tracking-widest">
                     {metab.metabolicStatus === 'optimal' 
                       ? "Your car is burning fuel at normal levels. Engine compression and systems appear healthy."
                       : "Your consumption is higher than expected. This could indicate old filters, bad spark plugs, or driving habits."}
                   </p>
                 </div>
               </>
             )}
          </div>
        </div>
      </div>

      {/* Telemetry Pillar Scan (Elaborate & Informative) */}
      <div className="bg-white p-8 sm:p-12 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group w-full flex-grow">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-12">
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">System Health Status</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Maintenance Verification by Category</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-lg">8 Systems Active</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12">
          {pillars.map(pillar => {
            const status = getPillarStatus(pillar);
            const isAtRisk = status.overdue > 0;
            const isWarning = !isAtRisk && status.label === 'Watch Soon';

            return (
              <div key={pillar} className="space-y-5 group/pillar relative">
                <div className="flex justify-between items-end mb-2">
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest transition-colors group-hover/pillar:text-blue-600">
                      {pillar}
                    </h5>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${isAtRisk ? 'bg-rose-500 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                      <span className={`text-[8px] font-black uppercase tracking-widest ${isAtRisk ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-slate-400'}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                  <span className={`font-mono font-bold text-lg ${status.score > 80 ? 'text-emerald-500' : status.score > 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {Math.round(status.score)}%
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${status.score > 80 ? 'bg-emerald-500' : status.score > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                    style={{ width: `${status.score}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-[7px] font-black text-slate-400 uppercase tracking-widest">
                   <span>{status.count} Logs Linked</span>
                   {status.overdue > 0 && <span className="text-rose-500">{status.overdue} Task(s) Overdue</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 pt-8 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-xs font-black shadow-lg">i</div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest max-w-sm leading-relaxed">
                Category health is calculated from your maintenance history. Frequent, verified service logs increase the reliability score for each car system.
              </p>
           </div>
           {displayVitality === null && (
             <div className="bg-blue-600/10 text-blue-600 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest animate-pulse border border-blue-600/20">
               Awaiting First AI Audit
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
