
import React, { useMemo, useState } from 'react';
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
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const localEvidence = useMemo(() => calculateIntelligentHealth(vehicle, tasks, fuelLogs, logs), [vehicle, tasks, fuelLogs, logs]);
  
  const cachedAudit = vehicle.latestAiAudit;
  const displayVitality = cachedAudit ? cachedAudit.auditedScores.vitality : null;
  const displayDiscipline = cachedAudit ? cachedAudit.auditedScores.discipline : null;

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

  const InfoIcon = ({ id, text }: { id: string, text: string }) => (
    <div className="relative inline-block ml-1">
      <button 
        onClick={() => setActiveTooltip(activeTooltip === id ? null : id)}
        className="text-slate-400 hover:text-blue-500 transition-colors"
      >
        ℹ️
      </button>
      {activeTooltip === id && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-900 text-white text-[9px] font-bold rounded-xl shadow-2xl z-[100] animate-in fade-in zoom-in duration-200 uppercase tracking-widest leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col gap-6" onClick={() => activeTooltip && setActiveTooltip(null)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl border border-white/5 group">
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center">
            Condition Score
            <InfoIcon id="condition" text="Overall mechanical health based on your car's age, mileage, and service records." />
          </div>
          <div className="flex items-baseline gap-3">
            <div className={`text-6xl font-black tracking-tighter transition-all ${displayVitality !== null ? 'text-blue-500 group-hover:scale-105' : 'text-slate-700'}`}>
              {displayVitality !== null ? `${displayVitality}%` : '--'}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Vehicle Health Verdict</div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl border border-white/5 group">
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center">
            History Trust Score
            <InfoIcon id="trust" text="How reliable your records are. Higher if you upload receipts or use certified mechanics." />
          </div>
          <div className="flex items-baseline gap-3">
            <div className={`text-6xl font-black tracking-tighter transition-all ${displayDiscipline !== null ? 'text-emerald-500 group-hover:scale-105' : 'text-slate-700'}`}>
              {displayDiscipline !== null ? `${displayDiscipline}%` : '--'}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Record Reliability</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
           <div className="space-y-1">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center">
                Fuel Efficiency Performance
                <InfoIcon id="fuel" text="Measures how well your car uses fuel compared to factory standards." />
              </h4>
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
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-6 border border-slate-100">
             {metab.isCalibrating ? (
               <div className="h-full flex flex-col items-center justify-center text-center py-6 opacity-40">
                  <div className="text-2xl animate-spin mb-2">⚙️</div>
                  <p className="text-[9px] font-black uppercase tracking-widest">Calibrating analysis...</p>
               </div>
             ) : (
               <>
                 <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Consumption Gap</span>
                   <span className={`text-xs font-mono font-black ${metab.variance > 10 ? 'text-rose-500' : 'text-emerald-500'}`}>
                     {metab.variance > 0 ? `+${metab.variance}%` : `${metab.variance}%`}
                   </span>
                 </div>
                 <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estimated Waste/Month</span>
                   <span className="text-xs font-mono font-black text-rose-500">{formatCurrency(metab.wasteMonthly)}</span>
                 </div>
               </>
             )}
          </div>
        </div>
      </div>

      <div className="bg-white p-8 sm:p-12 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group w-full flex-grow">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-12">
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center">
              System Health Status
              <InfoIcon id="systems" text="Health of individual car systems based on how recently they were serviced." />
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Maintenance Verification by Category</p>
          </div>
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
