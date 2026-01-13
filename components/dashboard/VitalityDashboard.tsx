
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
    optimal: { color: 'text-emerald-500', bg: 'bg-emerald-500', title: 'Healthy Metabolism', text: 'Engine functioning within design parameters.' },
    warning: { color: 'text-amber-500', bg: 'bg-amber-500', title: 'Efficiency Leak', text: 'Sub-optimal fuel conversion detected. Inspect filtration.' },
    critical: { color: 'text-rose-500', bg: 'bg-rose-500', title: 'Systemic Friction', text: 'Critical fuel loss. Immediate engine diagnostic required.' }
  };

  const status = metabolicInfo[health.breakdown.metabolicStatus];
  const isTrafficNormalizerActive = (vehicle.avgDailyKm || 35) < 20;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Metabolic Diagnostic Card */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group border border-white/5">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl group-hover:scale-110 transition-transform">⛽</div>
          
          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-center">
              <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Vital Sign: Engine Metabolism</h4>
              {health.breakdown.isCalibrating ? (
                <span className="bg-amber-500/20 text-amber-400 text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-amber-500/30">
                  Calibrating...
                </span>
              ) : isTrafficNormalizerActive && (
                <span className="bg-blue-500/20 text-blue-400 text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-blue-500/30">
                  Traffic Adjusted
                </span>
              )}
            </div>
            
            <div className="space-y-1">
              <div className={`text-3xl font-black tracking-tighter ${status.color}`}>
                {health.breakdown.isCalibrating ? 'Calibrating Baseline' : status.title}
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                {health.breakdown.isCalibrating ? 'Collect 3+ fuel logs to establish operational metabolism.' : status.text}
              </p>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/5 space-y-5 relative z-10">
            {!health.breakdown.isCalibrating && health.breakdown.wasteMonthly > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <div className="text-[7px] font-black text-rose-400 uppercase tracking-widest mb-1">Estimated Monthly Waste</div>
                  <div className="text-xl font-black text-rose-500">{formatCurrency(health.breakdown.wasteMonthly)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Variance</div>
                  <div className="text-sm font-black text-rose-500">+{metabolism.variance}%</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Stability Index</span>
                <span className={status.color}>{health.breakdown.metabolic}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${status.bg}`} style={{ width: `${health.breakdown.metabolic}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* 8 Pillar Engineering Map */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl md:col-span-2 relative group flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div className="space-y-1">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Engineering Integrity Map</h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Synergistic Fault Analysis Active</p>
            </div>
            <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-blue-100 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
              Provenance: {Math.round(health.breakdown.provenance)}% Verified
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 flex-grow">
            {pillars.map(pillar => {
              const score = getPillarStatus(pillar);
              return (
                <div key={pillar} className="space-y-3">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest items-center">
                    <span className="text-slate-400">{pillar}</span>
                    <span className={score > 80 ? 'text-emerald-500' : 'text-rose-500'}>{score}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${score > 80 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${score}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">i</div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                Deterministic Integrity Passport v1.0 <br/>
                <span className="text-slate-300 font-black">Zero-Knowledge Proof Calculation</span>
              </p>
            </div>
            <button className="w-full sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg">
              View Resale Passport →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
