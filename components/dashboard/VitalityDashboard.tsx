
import React, { useMemo } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog, ServiceCategory } from '../../shared/types.ts';
import { 
  calculateIntelligentHealth,
  getTaskMaintenanceStatus,
  calculateMetabolicStatus,
  getLatestTelemetryTimestamp
} from '../../services/maintenanceLogic.ts';
import { formatCurrency } from '../../shared/utils.ts';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  logs: ServiceLog[];
  fuelLogs: FuelLog[];
}

export const VitalityDashboard: React.FC<Props> = ({ vehicle, tasks, logs, fuelLogs }) => {
  const localHealthEvidence = useMemo(() => calculateIntelligentHealth(vehicle, tasks, fuelLogs, logs), [vehicle, tasks, fuelLogs, logs]);
  const metabolismEvidence = useMemo(() => calculateMetabolicStatus(vehicle, fuelLogs), [vehicle, fuelLogs]);

  // STRICT AUDIT POLICY: Use AI audited scores from persistence only
  const cachedAudit = vehicle.latestAiAudit;
  const displayVitality = cachedAudit ? cachedAudit.auditedScores.vitality : null;
  const displayDiscipline = cachedAudit ? cachedAudit.auditedScores.discipline : null;

  // Drift Detection: Check if evidence has changed since the Judge's last verdict
  const hasDrift = useMemo(() => {
    if (!cachedAudit) return false;
    const auditTime = new Date(cachedAudit.timestamp).getTime();
    const latestLogTime = getLatestTelemetryTimestamp(logs, fuelLogs);
    return latestLogTime > auditTime;
  }, [cachedAudit, logs, fuelLogs]);

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

  const status = metabolicInfo[localHealthEvidence.breakdown.metabolicStatus];

  return (
    <div className="w-full h-full">
      <div className="flex flex-col gap-6 w-full h-full">
        
        {/* Top-Level Audited Scores (THE JUDGE) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl border border-white/5 group">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Neural Vitality Score</div>
            <div className="flex items-baseline gap-2">
              <div className={`text-6xl font-black tracking-tighter ${displayVitality !== null ? 'text-blue-500' : 'text-slate-700'}`}>
                {displayVitality !== null ? `${displayVitality}%` : '--'}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Audited</div>
            </div>
            {hasDrift && <div className="mt-4 text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse">Telemetry Drift Detected</div>}
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl border border-white/5 group">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Neural Discipline Score</div>
            <div className="flex items-baseline gap-2">
              <div className={`text-6xl font-black tracking-tighter ${displayDiscipline !== null ? 'text-emerald-500' : 'text-slate-700'}`}>
                {displayDiscipline !== null ? `${displayDiscipline}%` : '--'}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Audited</div>
            </div>
             {displayDiscipline === null && <div className="mt-4 text-[8px] font-black text-slate-600 uppercase tracking-widest italic">Awaiting AI Verification</div>}
          </div>
        </div>

        {/* Telemetric Evidence (THE RAW DATA) */}
        <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-100 shadow-sm relative group flex flex-col transition-all duration-500 hover:shadow-lg w-full flex-grow">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">System Health Telemetry</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-80">Deterministic Data Points (Unaudited)</p>
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

          <div className={`mt-12 p-6 rounded-[2rem] border flex flex-col lg:flex-row items-center justify-between gap-6 transition-colors ${hasDrift ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-sm shadow-sm shrink-0 ${hasDrift ? 'text-amber-500' : 'text-blue-600'}`}>
                {hasDrift ? '!' : 'i'}
              </div>
              <div className="space-y-0.5">
                <p className={`text-[10px] font-black uppercase tracking-widest leading-relaxed ${hasDrift ? 'text-amber-700' : 'text-slate-500'}`}>
                  {hasDrift ? 'Neural Snapshot Drift' : 'Status: Evidence Baseline'}
                </p>
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em]">
                  {hasDrift ? 'Fresh logs added since last audit. Scores may not reflect current state.' : `Deterministic Health: ${localHealthEvidence.total}%`}
                </p>
              </div>
            </div>
            {displayVitality === null && (
               <button className="text-[8px] font-black text-blue-600 uppercase tracking-widest border border-blue-100 px-4 py-2 rounded-lg hover:bg-blue-600 hover:text-white transition-all">Request Initial Audit</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
