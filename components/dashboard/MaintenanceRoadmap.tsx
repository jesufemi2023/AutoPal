
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
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  const velocity = vehicle.avgDailyKm || 30;
  const statuses: (TaskStatus | 'all')[] = ['all', 'pending', 'completed', 'skipped'];

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

  const InfoIcon = ({ id, text }: { id: string, text: string }) => (
    <div className="relative inline-block">
      <button 
        onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === id ? null : id); }}
        className="text-slate-300 hover:text-blue-500 transition-colors"
      >
        ℹ️
      </button>
      {activeTooltip === id && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveTooltip(null)}
        >
          <div 
            className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-3xl max-w-sm w-full border border-white/10 animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 text-2xl mx-auto mb-6">ℹ️</div>
            <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Engineering Insight</h4>
            <p className="text-xs font-bold uppercase tracking-widest leading-relaxed text-slate-200 mb-8">
              {text}
            </p>
            <button 
              onClick={() => setActiveTooltip(null)}
              className="w-full py-4 bg-white/5 hover:bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
            >
              Acknowledged
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-100 shadow-sm relative overflow-hidden transition-all duration-500 hover:shadow-lg w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12 relative z-10 w-full">
        <div className="space-y-2">
          <h3 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Vehicle <span className="text-blue-600">Roadmap</span></h3>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
               Personalized maintenance strategy for {vehicle.make} {vehicle.model}
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
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8 relative z-10 w-full">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-[4px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing Schedule...</p>
          </div>
        ) : sortedTasks.length > 0 ? sortedTasks.map((task, i) => {
          const derivedStatus = task.status === 'pending' ? getTaskMaintenanceStatus(vehicle, task) : 'optimal';
          const isOverdue = derivedStatus === 'overdue';
          const predictedDate = predictServiceDate(vehicle, task, velocity);

          return (
            <div 
              key={task.id} 
              className={`group relative border-2 rounded-[2.5rem] p-8 transition-all duration-500 hover:shadow-2xl animate-slide-up ${isOverdue ? 'border-rose-100 bg-rose-50/20' : 'border-slate-50 bg-white hover:border-blue-100'}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
                <div className="space-y-6 flex-grow">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${isOverdue ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-slate-900 text-white'}`}>
                      {task.category === 'fluids' ? '💧' : task.category === 'engine' ? '⚙️' : task.category === 'brakes' ? '🛑' : '🛠️'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${isOverdue ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'}`}>
                          {task.status === 'pending' ? (isOverdue ? 'Overdue' : derivedStatus) : task.status}
                        </span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{task.category} System</span>
                        <InfoIcon id={`info-${task.id}`} text={`Regular maintenance of the ${task.category} system prevents catastrophic failure in extreme climates and high-traffic conditions.`} />
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{task.title}</h4>
                    </div>
                  </div>

                  <div className="space-y-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-100/50">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Technical Analysis</div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed italic border-l-2 border-blue-500/30 pl-4">
                      "{task.description}"
                    </p>
                  </div>
                </div>

                <div className="w-full lg:w-auto grid grid-cols-2 lg:flex lg:flex-col gap-6 lg:items-end shrink-0 border-t lg:border-t-0 lg:border-l lg:border-slate-100 pt-8 lg:pt-0 lg:pl-10">
                   <div className="space-y-1 lg:text-right">
                      <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Target Odometer</div>
                      <div className={`text-2xl font-mono font-black ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                        {task.dueMileage.toLocaleString()} <span className="text-xs font-sans text-slate-300">KM</span>
                      </div>
                   </div>
                   
                   <div className="space-y-1 lg:text-right">
                      <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Estimated Cost</div>
                      <div className="text-2xl font-black text-slate-900">
                        {formatCurrency(task.estimatedCost || 0)}
                      </div>
                   </div>

                   <div className="col-span-2 w-full space-y-3">
                      {task.status === 'pending' && (
                        <button 
                          onClick={() => onLog(task)}
                          className="w-full bg-slate-900 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                          <span className="text-lg">✓</span> Complete Task
                        </button>
                      )}
                      {predictedDate && task.status === 'pending' && (
                        <div className="text-center">
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                             Expected: {formatDate(predictedDate)}
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
             <h4 className="text-xl font-black text-slate-900 uppercase">Clear Schedule</h4>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">All maintenance protocols are currently optimized</p>
          </div>
        )}
      </div>
    </section>
  );
};
