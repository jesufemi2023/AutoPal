import React, { useState, useMemo } from 'react';
import { Vehicle, MaintenanceTask, ServiceCategory, TaskStatus } from '../../shared/types.ts';
import { getTaskMaintenanceStatus, predictServiceDate } from '../../services/maintenanceLogic.ts';
import { useAutoPalStore } from '../../shared/store.ts';
import { formatDate, formatCurrency } from '../../shared/utils.ts';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  onLog: (task: MaintenanceTask) => void;
  isLoading?: boolean;
}

export const MaintenanceRoadmap: React.FC<Props> = ({ vehicle, tasks, onLog, isLoading }) => {
  const { setCurrentView } = useAutoPalStore();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('pending');
  
  const velocity = vehicle.avgDailyKm || 30;
  const statuses: (TaskStatus | 'all')[] = ['all', 'pending', 'completed'];

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => statusFilter === 'all' || t.status === statusFilter);
  }, [tasks, statusFilter]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return a.dueMileage - b.dueMileage;
    });
  }, [filteredTasks]);

  const nextTask = useMemo(() => {
    const pending = tasks.filter(t => t.status === 'pending').sort((a, b) => a.dueMileage - b.dueMileage);
    return pending.length > 0 ? pending[0] : null;
  }, [tasks]);

  const kmUntilNext = nextTask ? Math.max(0, nextTask.dueMileage - vehicle.mileage) : null;

  return (
    <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-100 shadow-sm relative overflow-hidden transition-all duration-500 hover:shadow-lg w-full">
      {/* Dynamic Roadmap Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12 relative z-10 w-full">
        <div className="space-y-3">
          <h3 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Vehicle <span className="text-blue-600">Roadmap</span></h3>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
               {kmUntilNext !== null ? `Next service due in ${kmUntilNext.toLocaleString()} KM` : 'All maintenance current'}
             </p>
          </div>
        </div>
        
        <div className="flex bg-slate-50 p-1 rounded-2xl">
          {statuses.map(s => (
            <button 
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {s === 'pending' ? 'Upcoming' : s === 'completed' ? 'History' : 'All Tasks'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 relative z-10 w-full">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-[4px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading Schedule...</p>
          </div>
        ) : sortedTasks.length > 0 ? sortedTasks.map((task, i) => {
          const derivedStatus = task.status === 'pending' ? getTaskMaintenanceStatus(vehicle, task) : 'optimal';
          const isOverdue = derivedStatus === 'overdue';
          const predictedDate = predictServiceDate(vehicle, task, velocity);
          
          // Progress toward this service
          const interval = task.intervalKm || 5000;
          const startMileage = task.dueMileage - interval;
          const progress = task.status === 'completed' ? 100 : Math.min(100, Math.max(0, ((vehicle.mileage - startMileage) / interval) * 100));

          return (
            <div 
              key={task.id} 
              className={`group relative border-2 rounded-[2rem] p-6 sm:p-8 transition-all duration-500 hover:shadow-xl animate-slide-up ${isOverdue ? 'border-rose-100 bg-rose-50/20' : 'border-slate-50 bg-white hover:border-blue-50'}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
                <div className="space-y-6 flex-grow w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${isOverdue ? 'bg-rose-500 text-white shadow-rose-200' : task.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
                        {task.category === 'fluids' ? '💧' : task.category === 'engine' ? '⚙️' : task.category === 'brakes' ? '🛑' : '🛠️'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${isOverdue ? 'bg-rose-600 text-white' : task.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                            {task.status === 'pending' ? (isOverdue ? 'Critical Attention' : 'Scheduled') : 'Verified Done'}
                          </span>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{task.category} system</span>
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter leading-none">{task.title}</h4>
                      </div>
                    </div>
                  </div>

                  {/* Progressive Roadmap Visual */}
                  {task.status === 'pending' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Maintenance Window</div>
                        <div className="text-[10px] font-black text-slate-900">{Math.round(progress)}% of interval reached</div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${progress > 90 ? 'bg-rose-500' : progress > 70 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <p className="text-xs font-bold text-slate-500 leading-relaxed max-w-2xl opacity-70 group-hover:opacity-100 transition-opacity">
                    {task.description}
                  </p>
                </div>

                <div className="w-full lg:w-auto grid grid-cols-2 lg:flex lg:flex-col gap-6 lg:items-end shrink-0 border-t lg:border-t-0 lg:border-l lg:border-slate-100 pt-6 lg:pt-0 lg:pl-10">
                   <div className="space-y-1 lg:text-right">
                      <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Next Due At</div>
                      <div className={`text-2xl font-mono font-black ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                        {task.dueMileage.toLocaleString()} <span className="text-xs font-sans text-slate-300">KM</span>
                      </div>
                   </div>
                   
                   <div className="space-y-1 lg:text-right">
                      <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Approx. Cost</div>
                      <div className="text-xl font-black text-slate-900">
                        {formatCurrency(task.estimatedCost || 0)}
                      </div>
                   </div>

                   <div className="col-span-2 w-full space-y-3">
                      {task.status === 'pending' && (
                        <button 
                          onClick={() => onLog(task)}
                          className="w-full bg-slate-900 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                          Mark as Done
                        </button>
                      )}
                      {predictedDate && task.status === 'pending' && (
                        <div className="text-center" title="Projected date based on your average daily driving patterns.">
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 cursor-help">
                             Estimated: {formatDate(predictedDate)}
                          </span>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-24 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
             <div className="text-5xl mb-6 grayscale">🏁</div>
             <h4 className="text-xl font-black text-slate-900 uppercase">Clear Horizon</h4>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">All mechanical maintenance is currently up to date</p>
          </div>
        )}
      </div>
    </section>
  );
};