
import React from 'react';
import { Vehicle, MaintenanceTask, ServiceLog } from '../../shared/types.ts';
import { calculateProjectedServiceDate } from '../../services/maintenanceService.ts';
import { formatCurrency } from '../../shared/utils.ts';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  logs: ServiceLog[];
  onLog: (task: MaintenanceTask) => void;
  isLoading?: boolean;
}

export const MaintenanceRoadmap: React.FC<Props> = ({ vehicle, tasks, logs, onLog, isLoading }) => {
  const sortedTasks = [...tasks].sort((a,b) => a.dueMileage - b.dueMileage);

  // Helper to find historical cost delta
  const getCostDelta = (task: MaintenanceTask) => {
    const historicalLogs = logs.filter(l => l.category === task.category);
    if (historicalLogs.length === 0 || !task.estimatedCost) return null;
    const avgCost = historicalLogs.reduce((acc, l) => acc + l.cost, 0) / historicalLogs.length;
    const delta = ((task.estimatedCost - avgCost) / avgCost) * 100;
    return { delta, avg: avgCost };
  };

  return (
    <section className="bg-white card-radius p-6 sm:p-14 border border-slate-100 shadow-sm relative overflow-hidden">
      {/* Grid background for technical aesthetic */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16 relative z-10">
        <div>
          <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Roadmap</h3>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Engineering Lifecycle Tracker</p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-3 bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-spin"></div>
            <span className="text-[9px] font-black text-blue-600 tracking-widest uppercase">Querying Nodes...</span>
          </div>
        )}
      </div>

      <div className="space-y-12 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-100 z-10">
        {sortedTasks.length > 0 ? sortedTasks.map((task, i) => {
          const kmUntil = task.dueMileage - vehicle.mileage;
          const isOverdue = kmUntil <= 0;
          const isWarning = kmUntil > 0 && kmUntil < 500;
          const costStats = getCostDelta(task);

          return (
            <div key={task.id} className="relative pl-16 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              {/* Circuit Trace Node */}
              <div className="absolute left-[21px] top-10 w-[6px] h-[6px] rounded-full bg-slate-200 z-10"></div>
              
              {/* Indicator Dot */}
              <div className={`absolute left-4 top-1 w-4 h-4 rounded-full border-[3px] border-white z-20 shadow-lg ${isOverdue ? 'bg-rose-500 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-slate-200'}`}></div>
              
              <div className="group bg-[#f8fafc]/40 rounded-[2.5rem] p-8 sm:p-10 border border-slate-100 hover:bg-white hover:shadow-2xl transition-all duration-500">
                <div className="flex flex-col xl:flex-row justify-between items-start gap-8">
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap gap-3">
                      <span className={`px-4 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                        {isOverdue ? 'Critical' : task.priority}
                      </span>
                      <span className="bg-blue-50 text-blue-600 px-4 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest">
                        {task.category}
                      </span>
                      {costStats && Math.abs(costStats.delta) > 10 && (
                        <span className={`px-4 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest ${costStats.delta > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          Price Shift: {costStats.delta > 0 ? '+' : ''}{costStats.delta.toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">{task.title}</h4>
                    <p className="text-slate-500 text-sm font-medium max-w-lg leading-relaxed">{task.description}</p>
                  </div>

                  <div className="w-full xl:w-auto flex flex-col sm:flex-row xl:flex-col gap-6 items-stretch sm:items-center xl:items-end">
                    <div className="flex gap-10">
                       <div className="text-right">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Target</div>
                          <div className={`text-xl font-black font-mono tracking-tighter ${isOverdue ? 'text-rose-500' : 'text-slate-900'}`}>{task.dueMileage.toLocaleString()} <span className="text-[10px] opacity-40">KM</span></div>
                       </div>
                       <div className="text-right">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Delta</div>
                          <div className={`text-xl font-black font-mono tracking-tighter ${isOverdue ? 'text-rose-600' : 'text-emerald-500'}`}>
                            {isOverdue ? `-${Math.abs(kmUntil).toLocaleString()}` : `+${kmUntil.toLocaleString()}`}
                          </div>
                       </div>
                    </div>
                    <button 
                      onClick={() => onLog(task)}
                      className="w-full sm:w-auto bg-slate-900 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                    >
                      Complete Log
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl text-emerald-500">✓</div>
             <h4 className="text-2xl font-black text-slate-900">Zero Maintenance Debt</h4>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">All vehicle parameters optimized</p>
          </div>
        )}
      </div>
    </section>
  );
};
