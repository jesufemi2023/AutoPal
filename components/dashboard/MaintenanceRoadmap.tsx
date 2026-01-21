
import React, { useState, useMemo } from 'react';
import { Vehicle, MaintenanceTask, ServiceCategory, TaskStatus, ServiceLog } from '../../shared/types.ts';
import { getTaskMaintenanceStatus, predictServiceDate } from '../../services/maintenanceLogic.ts';
import { useAutoPalStore } from '../../shared/store.ts';
import { formatDate, formatCurrency } from '../../shared/utils.ts';
import { EntitlementEngine } from '../../services/entitlementService.ts';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  logs?: ServiceLog[];
  onLog: (task: MaintenanceTask) => void;
  isLoading?: boolean;
}

export const MaintenanceRoadmap: React.FC<Props> = ({ vehicle, tasks, logs = [], onLog, isLoading }) => {
  const { user, getUsageStats, setCurrentView } = useAutoPalStore();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('pending');
  const velocity = vehicle.avgDailyKm || 35;
  
  const stats = getUsageStats();
  const tier = user?.tier || 'free';
  const canAddLog = EntitlementEngine.canAddServiceLog(tier, stats.monthlyServiceCount);
  const maxLogs = EntitlementEngine.getLimit(tier, 'monthlyServiceLogs');

  const displayItems = useMemo(() => {
    if (statusFilter === 'completed') {
      return logs.map(l => ({
        id: l.id,
        title: l.serviceType,
        description: l.notes || `Service performed at ${l.provider || 'Independent Facility'}.`,
        dueMileage: l.mileageAtService,
        status: 'completed' as TaskStatus,
        category: l.category,
        estimatedCost: l.cost,
        date: l.serviceDate
      }));
    }
    const filteredTasks = tasks.filter(t => statusFilter === 'all' || t.status === statusFilter);
    return filteredTasks.sort((a, b) => a.dueMileage - b.dueMileage);
  }, [tasks, logs, statusFilter]);

  const nextMilestone = useMemo(() => {
    const pending = tasks.filter(t => t.status === 'pending').sort((a, b) => a.dueMileage - b.dueMileage);
    return pending.length > 0 ? pending[0] : null;
  }, [tasks]);

  const kmToNext = nextMilestone ? Math.max(0, nextMilestone.dueMileage - vehicle.mileage) : null;

  const handleLogClick = (task: any) => {
    if (!canAddLog) {
      if (confirm(`Monthly Limit Reached (${stats.monthlyServiceCount}/${maxLogs}): You have exhausted your free maintenance logs for this month. Upgrade to continue building your asset history?`)) {
        setCurrentView('profile');
      }
      return;
    }
    onLog(task);
  };

  return (
    <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-100 shadow-sm relative overflow-hidden transition-all duration-500 hover:shadow-lg w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12 relative z-10">
        <div className="space-y-3">
          <h3 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Vehicle <span className="text-blue-600">Roadmap</span></h3>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
               {kmToNext !== null ? `Next critical check in ${kmToNext.toLocaleString()} KM` : 'No upcoming tasks found'}
             </p>
          </div>
        </div>
        
        <div className="flex bg-slate-50 p-1 rounded-2xl">
          {(['pending', 'completed', 'all'] as const).map(s => (
            <button 
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {s === 'pending' ? 'Upcoming' : s === 'completed' ? 'History' : 'Full List'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-[4px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading Schedule...</p>
          </div>
        ) : displayItems.length > 0 ? displayItems.map((item: any, i: number) => {
          const isTask = 'priority' in item;
          const derivedStatus = item.status === 'pending' ? getTaskMaintenanceStatus(vehicle, item as MaintenanceTask) : 'optimal';
          const isOverdue = derivedStatus === 'overdue';
          const predictedDate = isTask ? predictServiceDate(vehicle, item as MaintenanceTask, velocity) : item.date;
          
          const interval = (item as MaintenanceTask).intervalKm || 5000;
          const startMileage = item.dueMileage - interval;
          const progress = item.status === 'completed' ? 100 : Math.min(100, Math.max(0, ((vehicle.mileage - startMileage) / interval) * 100));

          return (
            <div 
              key={item.id} 
              className={`group relative border-2 rounded-[2rem] p-6 sm:p-8 transition-all duration-500 hover:shadow-xl animate-slide-up ${isOverdue ? 'border-rose-100 bg-rose-50/20' : 'border-slate-50 bg-white hover:border-blue-50'}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex flex-col lg:flex-row gap-10 items-start justify-between">
                <div className="flex-grow space-y-6 w-full">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${isOverdue ? 'bg-rose-500 text-white' : item.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
                      {item.category === 'fluids' ? '💧' : item.category === 'engine' ? '⚙️' : item.category === 'brakes' ? '🛑' : '🛠️'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${isOverdue ? 'bg-rose-600 text-white' : item.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                          {item.status === 'pending' ? (isOverdue ? 'Overdue' : 'Scheduled') : 'Completed'}
                        </span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.category} system</span>
                      </div>
                      <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-blue-600 transition-colors">{item.title}</h4>
                    </div>
                  </div>

                  {item.status === 'pending' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Maintenance Progress</div>
                        <div className="text-[10px] font-mono font-black text-slate-900">{Math.round(progress)}% reached</div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${progress > 90 ? 'bg-rose-500' : progress > 70 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <p className="text-xs font-bold text-slate-500 leading-relaxed max-w-2xl opacity-80">
                    {item.description}
                  </p>
                </div>

                <div className="w-full lg:w-auto grid grid-cols-2 lg:flex lg:flex-col gap-6 lg:items-end shrink-0 border-t lg:border-t-0 lg:border-l lg:border-slate-100 pt-6 lg:pt-0 lg:pl-10">
                   <div className="space-y-1 lg:text-right">
                      <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{item.status === 'completed' ? 'Done At' : 'Due At'}</div>
                      <div className={`text-2xl font-mono font-black ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                        {item.dueMileage.toLocaleString()} <span className="text-xs font-sans text-slate-300">KM</span>
                      </div>
                   </div>
                   
                   <div className="space-y-1 lg:text-right">
                      <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Cost</div>
                      <div className="text-xl font-black text-slate-900">
                        {formatCurrency(item.estimatedCost || 0)}
                      </div>
                   </div>

                   <div className="col-span-2 w-full space-y-3">
                      {item.status === 'pending' && (
                        <button 
                          onClick={() => handleLogClick(item)}
                          className={`w-full px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                            canAddLog 
                              ? 'bg-slate-900 text-white shadow-xl hover:bg-blue-600 active:scale-95' 
                              : 'bg-slate-100 text-slate-400 border-2 border-slate-200 cursor-pointer shadow-inner'
                          }`}
                        >
                          {canAddLog ? 'Log Maintenance' : '🔒 Upgrade to Log'}
                        </button>
                      )}
                      {predictedDate && (
                        <div className="text-center" title="Estimated based on your average driving behavior.">
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 cursor-help">
                             {item.status === 'completed' ? 'Date:' : 'Est. Date:'} {formatDate(predictedDate)}
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
             <h4 className="text-xl font-black text-slate-900 uppercase">Roadmap Clear</h4>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">All tasks are completed or up to date</p>
          </div>
        )}
      </div>
    </section>
  );
};
