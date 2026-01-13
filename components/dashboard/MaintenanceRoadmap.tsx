
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
    <section className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 lg:p-14 border border-slate-100 shadow-sm relative overflow-hidden transition-all duration-500 hover:shadow-xl w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
        <div className="space-y-2">
          <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter uppercase">Lifecycle Roadmap</h3>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
             <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Asset Velocity: <span className="text-slate-900 font-mono">{velocity} KM/Day</span></p>
          </div>
        </div>
      </div>

      <div className="mb-10 flex flex-wrap gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
        {statuses.map(s => (
          <button 
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-6 sm:space-y-8 relative z-10 w-full">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Syncing Ledger...</p>
          </div>
        ) : sortedTasks.length > 0 ? sortedTasks.map((task, i) => {
          const derivedStatus = task.status === 'pending' ? getTaskMaintenanceStatus(vehicle, task) : 'optimal';
          const isOverdue = derivedStatus === 'overdue';
          const kmUntil = task.dueMileage - vehicle.mileage;
          const predictedDate = predictServiceDate(vehicle, task, velocity);

          return (
            <div 
              key={task.id} 
              className={`group relative border-l-4 sm:border-l-8 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-10 lg:p-12 transition-all duration-500 hover:shadow-xl animate-slide-up shadow-sm w-full ${isOverdue ? 'border-rose-500 bg-rose-50/20' : 'border-slate-100 bg-white'}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex flex-col lg:flex-row justify-between gap-8 lg:items-center">
                <div className="flex-1 space-y-3 sm:space-y-4">
                  <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                    <span className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg sm:rounded-xl text-[7px] sm:text-[8px] font-black uppercase tracking-widest ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                      {task.status === 'pending' ? derivedStatus : task.status}
                    </span>
                    <span className="text-slate-200 text-xs font-mono">/</span>
                    <span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400">{task.category} system</span>
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <h4 className={`text-lg sm:text-2xl font-black tracking-tighter ${task.status === 'completed' ? 'text-slate-300 line-through' : 'text-slate-900'}`}>{task.title}</h4>
                    <p className="text-slate-500 text-[11px] sm:text-xs font-medium max-w-xl leading-relaxed opacity-80">{task.description}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-6 lg:items-end shrink-0 border-t lg:border-t-0 pt-6 lg:pt-0 lg:pl-10 lg:border-l lg:border-slate-50">
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-6 text-left lg:text-right">
                    <div>
                      <div className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Target</div>
                      <div className={`text-lg sm:text-xl font-mono font-black tracking-tighter ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                        {task.dueMileage.toLocaleString()} <span className="text-[8px] sm:text-[10px] opacity-40">KM</span>
                      </div>
                    </div>
                    {task.status === 'pending' && (
                      <div>
                        <div className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Delta</div>
                        <div className={`text-lg sm:text-xl font-mono font-black tracking-tighter ${kmUntil <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {kmUntil <= 0 ? '-' : '+'}{Math.abs(kmUntil).toLocaleString()} <span className="text-[8px] sm:text-[10px] opacity-40">KM</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full sm:w-auto">
                    {task.status === 'pending' && (
                      <button 
                        onClick={() => onLog(task)}
                        className="w-full lg:w-40 bg-slate-900 text-white px-6 py-3.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 active:scale-95 transition-all"
                      >
                        Log Action
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {predictedDate && task.status === 'pending' && (
                <div className={`mt-4 lg:mt-0 lg:absolute lg:-top-3 lg:right-10 px-4 py-1.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-lg border-2 lg:border-4 border-white transition-all group-hover:scale-105 inline-block ${isOverdue ? 'bg-rose-500 text-white' : 'bg-blue-600 text-white'}`}>
                  🔭 Predict: {formatDate(predictedDate)}
                </div>
              )}
            </div>
          );
        }) : (
          <div className="text-center py-20 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
             <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase">Roadmap Clear</h4>
             <p className="text-slate-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest mt-2">Adjust filters to see asset history</p>
          </div>
        )}
      </div>
    </section>
  );
};
