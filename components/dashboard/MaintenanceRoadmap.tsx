
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
    <section className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 lg:p-14 xl:p-20 border border-slate-100 shadow-sm relative overflow-hidden transition-all duration-500 hover:shadow-xl w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16 relative z-10 w-full">
        <div className="space-y-3">
          <h3 className="text-3xl sm:text-5xl xl:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">Lifecycle Roadmap</h3>
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
             <p className="text-slate-400 text-[10px] sm:text-[12px] font-black uppercase tracking-widest">Asset Velocity: <span className="text-slate-900 font-mono font-bold">{velocity} KM/Day</span></p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 overflow-x-auto scrollbar-hide py-1">
          {statuses.map(s => (
            <button 
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === s ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8 sm:space-y-10 relative z-10 w-full">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-6">
            <div className="w-14 h-14 border-[6px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Syncing Ledger...</p>
          </div>
        ) : sortedTasks.length > 0 ? sortedTasks.map((task, i) => {
          const derivedStatus = task.status === 'pending' ? getTaskMaintenanceStatus(vehicle, task) : 'optimal';
          const isOverdue = derivedStatus === 'overdue';
          const kmUntil = task.dueMileage - vehicle.mileage;
          const predictedDate = predictServiceDate(vehicle, task, velocity);

          return (
            <div 
              key={task.id} 
              className={`group relative border-l-[12px] rounded-[2.5rem] p-8 sm:p-12 lg:p-14 transition-all duration-500 hover:shadow-2xl animate-slide-up shadow-sm w-full ${isOverdue ? 'border-rose-500 bg-rose-50/10' : 'border-slate-100 bg-white hover:border-blue-100'}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex flex-col xl:flex-row justify-between gap-10 xl:items-center w-full">
                <div className="flex-grow space-y-5">
                  <div className="flex flex-wrap gap-4 items-center">
                    <span className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${isOverdue ? 'bg-rose-100 text-rose-600 shadow-sm shadow-rose-200' : 'bg-slate-100 text-slate-500'}`}>
                      {task.status === 'pending' ? (isOverdue ? 'OVERDUE_ALERT' : derivedStatus) : task.status}
                    </span>
                    <span className="text-slate-200 text-xl font-mono">/</span>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{task.category} system node</span>
                  </div>

                  <div className="space-y-2">
                    <h4 className={`text-2xl sm:text-3xl xl:text-4xl font-black tracking-tighter leading-tight ${task.status === 'completed' ? 'text-slate-300 line-through' : 'text-slate-900'}`}>{task.title}</h4>
                    <p className="text-slate-500 text-sm xl:text-base font-medium max-w-2xl leading-relaxed opacity-90">{task.description}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row xl:flex-col gap-8 xl:items-end shrink-0 border-t sm:border-t-0 xl:border-l xl:border-slate-50 pt-10 sm:pt-0 xl:pt-0 xl:pl-16">
                  <div className="grid grid-cols-2 xl:grid-cols-1 gap-10 text-left xl:text-right flex-grow sm:flex-grow-0">
                    <div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Telemetry</div>
                      <div className={`text-2xl lg:text-3xl font-mono font-black tracking-tighter ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                        {task.dueMileage.toLocaleString()} <span className="text-xs opacity-40">KM</span>
                      </div>
                    </div>
                    {task.status === 'pending' && (
                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Delta Correction</div>
                        <div className={`text-2xl lg:text-3xl font-mono font-black tracking-tighter ${kmUntil <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {kmUntil <= 0 ? '-' : '+'}{Math.abs(kmUntil).toLocaleString()} <span className="text-xs opacity-40">KM</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-4 w-full sm:w-auto min-w-[160px]">
                    {task.status === 'pending' && (
                      <button 
                        onClick={() => onLog(task)}
                        className="w-full bg-slate-900 text-white px-8 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-600 active:scale-95 transition-all group-hover:scale-[1.05]"
                      >
                        Log Protocol Action
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {predictedDate && task.status === 'pending' && (
                <div className={`mt-8 xl:mt-0 xl:absolute xl:-top-4 xl:right-16 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl border-4 border-white transition-all group-hover:scale-110 inline-block z-20 ${isOverdue ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-blue-600 text-white shadow-blue-200'}`}>
                  🔭 Predict: {formatDate(predictedDate)}
                </div>
              )}
            </div>
          );
        }) : (
          <div className="text-center py-32 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
             <div className="text-5xl mb-6 opacity-30">🛣️</div>
             <h4 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Roadmap Clear</h4>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-3">Adjust filters to analyze previous asset history</p>
          </div>
        )}
      </div>
    </section>
  );
};
