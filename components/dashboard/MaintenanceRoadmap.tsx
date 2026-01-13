
import React, { useState, useMemo } from 'react';
import { Vehicle, MaintenanceTask, ServiceCategory, TaskStatus } from '../../shared/types.ts';
import { getTaskMaintenanceStatus, predictServiceDate } from '../../services/maintenanceLogic.ts';
import { useAutoPalStore } from '../../shared/store.ts';
import { formatDate } from '../../shared/utils.ts';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  onLog: (task: MaintenanceTask) => void;
  isLoading?: boolean;
}

export const MaintenanceRoadmap: React.FC<Props> = ({ vehicle, tasks, onLog, isLoading }) => {
  const { setCurrentView, setMarketplaceFilter } = useAutoPalStore();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('pending');
  
  const velocity = vehicle.avgDailyKm || 30;
  const statuses: (TaskStatus | 'all')[] = ['all', 'pending', 'completed', 'skipped'];

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchesStatus;
    });
  }, [tasks, statusFilter]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return a.dueMileage - b.dueMileage;
    });
  }, [filteredTasks]);

  return (
    <section className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 border border-slate-100 shadow-sm relative overflow-hidden transition-all duration-500 hover:shadow-lg w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 relative z-10 w-full">
        <div className="space-y-1.5">
          <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Lifecycle Roadmap</h3>
          <div className="flex items-center gap-2.5">
             <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shadow-[0_0_6px_rgba(37,99,235,0.6)]"></div>
             <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Asset Velocity: <span className="text-slate-900 font-mono font-bold">{velocity} KM/Day</span></p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2.5 overflow-x-auto scrollbar-hide py-1">
          {statuses.map(s => (
            <button 
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === s ? 'bg-slate-900 text-white shadow-md scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 sm:space-y-8 relative z-10 w-full">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-5">
            <div className="w-12 h-12 border-[4px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Ledger...</p>
          </div>
        ) : sortedTasks.length > 0 ? sortedTasks.map((task, i) => {
          const derivedStatus = task.status === 'pending' ? getTaskMaintenanceStatus(vehicle, task) : 'optimal';
          const isOverdue = derivedStatus === 'overdue';
          const kmUntil = task.dueMileage - vehicle.mileage;
          const predictedDate = predictServiceDate(vehicle, task, velocity);

          return (
            <div 
              key={task.id} 
              className={`group relative border-l-[8px] rounded-[1.75rem] p-6 sm:p-10 transition-all duration-500 hover:shadow-xl animate-slide-up shadow-sm w-full ${isOverdue ? 'border-rose-500 bg-rose-50/10' : 'border-slate-100 bg-white hover:border-blue-50'}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex flex-col xl:flex-row justify-between gap-8 xl:items-center w-full">
                <div className="flex-grow space-y-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <span className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${isOverdue ? 'bg-rose-100 text-rose-600 shadow-sm shadow-rose-200' : 'bg-slate-100 text-slate-500'}`}>
                      {task.status === 'pending' ? (isOverdue ? 'OVERDUE_ALERT' : derivedStatus) : task.status}
                    </span>
                    <span className="text-slate-200 text-lg font-mono">/</span>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.15em]">{task.category} system</span>
                  </div>

                  <div className="space-y-1">
                    <h4 className={`text-xl sm:text-2xl font-black tracking-tighter leading-tight ${task.status === 'completed' ? 'text-slate-300 line-through' : 'text-slate-900'}`}>{task.title}</h4>
                    <p className="text-slate-500 text-[11px] sm:text-xs font-medium max-w-xl leading-relaxed opacity-90">{task.description}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row xl:flex-col gap-6 xl:items-end shrink-0 border-t sm:border-t-0 xl:border-l xl:border-slate-50 pt-8 sm:pt-0 xl:pt-0 xl:pl-12">
                  <div className="grid grid-cols-2 xl:grid-cols-1 gap-8 text-left xl:text-right flex-grow sm:flex-grow-0">
                    <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Target Telemetry</div>
                      <div className={`text-xl lg:text-2xl font-mono font-black tracking-tighter ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                        {task.dueMileage.toLocaleString()} <span className="text-[10px] opacity-40">KM</span>
                      </div>
                    </div>
                    {task.status === 'pending' && (
                      <div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Delta Correction</div>
                        <div className={`text-xl lg:text-2xl font-mono font-black tracking-tighter ${kmUntil <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {kmUntil <= 0 ? '-' : '+'}{Math.abs(kmUntil).toLocaleString()} <span className="text-[10px] opacity-40">KM</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full sm:w-auto min-w-[140px]">
                    {task.status === 'pending' && (
                      <button 
                        onClick={() => onLog(task)}
                        className="w-full bg-slate-900 text-white px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-600 active:scale-95 transition-all"
                      >
                        Log Action
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {predictedDate && task.status === 'pending' && (
                <div className={`mt-6 xl:mt-0 xl:absolute xl:-top-3 xl:right-12 px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl border-[3px] border-white transition-all group-hover:scale-105 inline-block z-20 ${isOverdue ? 'bg-rose-500 text-white' : 'bg-blue-600 text-white'}`}>
                  🔭 Predict: {formatDate(predictedDate)}
                </div>
              )}
            </div>
          );
        }) : (
          <div className="text-center py-24 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
             <div className="text-4xl mb-5 opacity-30">🛣️</div>
             <h4 className="text-xl font-black text-slate-900 tracking-tight uppercase">Roadmap Clear</h4>
             <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-2">Adjust filters to analyze previous history</p>
          </div>
        )}
      </div>
    </section>
  );
};
