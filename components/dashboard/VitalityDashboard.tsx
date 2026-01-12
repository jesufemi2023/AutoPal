
import React, { useMemo } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog, ServiceCategory } from '../../shared/types.ts';
import { 
  calculateVitalityScore, 
  calculateDisciplineScore, 
  getSpendByCategory, 
  calculateTotalExpenditure,
  getExpenditureRatio,
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
  const vitality = useMemo(() => calculateVitalityScore(vehicle, tasks), [vehicle, tasks]);
  const discipline = useMemo(() => calculateDisciplineScore(logs, tasks), [logs, tasks]);
  const totalSpend = useMemo(() => calculateTotalExpenditure(logs, fuelLogs), [logs, fuelLogs]);
  const ratio = useMemo(() => getExpenditureRatio(logs, fuelLogs), [logs, fuelLogs]);

  const pillars: ServiceCategory[] = ['fluids', 'engine', 'brakes', 'suspension', 'tires', 'other'];

  const getPillarStatus = (cat: ServiceCategory) => {
    const pillarTasks = tasks.filter(t => t.category === cat);
    if (pillarTasks.length === 0) return 100;
    const overdue = pillarTasks.filter(t => t.status === 'pending' && getTaskMaintenanceStatus(vehicle, t) === 'overdue');
    return Math.max(0, 100 - (overdue.length / pillarTasks.length) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Main Stats */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-between shadow-xl">
          <div className="space-y-1">
            <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Total Investment</h4>
            <div className="text-3xl font-black tracking-tighter">{formatCurrency(totalSpend)}</div>
          </div>
          <div className="mt-8 space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-slate-500">Asset Vitality</span>
              <span className="text-emerald-500">{vitality}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${vitality}%` }}></div>
            </div>
          </div>
        </div>

        {/* 8 Pillar Health Matrix */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm md:col-span-2">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Engineering Pillars Health</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
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
        </div>
      </div>
    </div>
  );
};
