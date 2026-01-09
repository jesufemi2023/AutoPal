
import React, { useState, useMemo } from 'react';
import { Vehicle, MaintenanceTask, Priority, ServiceCategory, TaskStatus } from '../../shared/types.ts';
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
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'all'>('all');
  
  const velocity = vehicle.avgDailyKm || 30;

  const categories: (ServiceCategory | 'all')[] = ['all', 'engine', 'brakes', 'fluids', 'tires', 'suspension', 'other'];
  const statuses: (TaskStatus | 'all')[] = ['all', 'pending', 'completed', 'skipped'];

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      return matchesStatus && matchesCategory;
    });
  }, [tasks, statusFilter, categoryFilter]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // Primary sort: Status (Pending first)
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      
      // Secondary sort: Derived Status for pending tasks
      if (a.status === 'pending' && b.status === 'pending') {
        const statusA = getTaskMaintenanceStatus(vehicle, a);
        const statusB = getTaskMaintenanceStatus(vehicle, b);
        const weight = { overdue: 0, upcoming: 1, optimal: 2 };
        if (weight[statusA] !== weight[statusB]) return weight[statusA] - weight[statusB];
      }
      
      // Tertiary sort: Mileage
      return a.dueMileage - b.dueMileage;
    });
  }, [filteredTasks, vehicle]);

  const handleMatchParts = (task: MaintenanceTask) => {
    setMarketplaceFilter(task.title);
    setCurrentView('marketplace');
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'engine': return '⚙️';
      case 'brakes': return '🛑';
      case 'fluids': return '🧪';
      case 'tires': return '🛞';
      case 'suspension': return '⛓️';
      default: return '🛠️';
    }
  };

  return (
    <section className="bg-white card-radius p-6 sm:p-12 border border-slate-100 shadow-sm relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
        <div className="space-y-1">
          <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter">Maintenance Roadmap</h3>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
             <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.3em]">Lifecycle Vector: {velocity} KM/Day</p>
          </div>
        </div>
      </div>

      {/* Filter Tray */}
      <div className="mb-10 space-y-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-shrink-0 text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 sm:w-20">Status</div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {statuses.map(s => (
              <button 
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${statusFilter === s ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-shrink-0 text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 sm:w-20">Category</div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(c => (
              <button 
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${categoryFilter === c ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'}`}
              >
                {c === 'all' ? 'All Units' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Telemetry...</p>
          </div>
        ) : sortedTasks.length > 0 ? sortedTasks.map((task, i) => {
          const isPending = task.status === 'pending';
          const isCompleted = task.status === 'completed';
          const isSkipped = task.status === 'skipped';
          
          const derivedStatus = isPending ? getTaskMaintenanceStatus(vehicle, task) : 'optimal';
          const isOverdue = isPending && derivedStatus === 'overdue';
          const isUpcoming = isPending && derivedStatus === 'upcoming';
          const kmUntil = task.dueMileage - vehicle.mileage;
          
          const predictedDate = predictServiceDate(vehicle, task, velocity);
          const effectiveDate = task.dueDate || predictedDate;
          const daysLeft = effectiveDate ? Math.ceil((new Date(effectiveDate).getTime() - Date.now()) / (1000*3600*24)) : null;

          const statusColors = {
            overdue: 'border-rose-500 bg-rose-500/5',
            upcoming: 'border-amber-500 bg-amber-500/5',
            optimal: isCompleted ? 'border-emerald-200 bg-emerald-50/20 opacity-75' : isSkipped ? 'border-slate-200 bg-slate-50/50 opacity-60' : 'border-slate-200 bg-white'
          };

          return (
            <div 
              key={task.id} 
              className={`group relative border-l-[6px] rounded-r-[2.5rem] p-6 sm:p-10 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 animate-slide-up ${statusColors[derivedStatus] || statusColors.optimal}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex flex-col lg:flex-row justify-between gap-8 lg:items-center">
                <div className="flex-1 space-y-6">
                  {/* Status & Priority Badges */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className={`px-3 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest ${
                      isOverdue ? 'bg-rose-100 text-rose-600' : 
                      isUpcoming ? 'bg-amber-100 text-amber-600' : 
                      isCompleted ? 'bg-emerald-100 text-emerald-600' :
                      isSkipped ? 'bg-slate-200 text-slate-500' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {isPending ? derivedStatus : task.status}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest bg-slate-900/5 text-slate-500`}>
                      {task.priority} Priority
                    </span>
                    {task.priority === Priority.HIGH && isPending && (
                       <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform ${isCompleted ? 'text-emerald-500' : ''}`}>
                      {isCompleted ? '✓' : getCategoryIcon(task.category)}
                    </div>
                    <div className="space-y-1">
                      <h4 className={`text-xl sm:text-2xl font-black tracking-tight leading-none ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</h4>
                      <p className="text-slate-500 text-[11px] sm:text-[12px] font-medium max-w-lg leading-relaxed">{task.description}</p>
                    </div>
                  </div>
                </div>

                {/* Telemetry Block */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-6 lg:items-end shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8">
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-6 text-right">
                    <div>
                      <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Mileage</div>
                      <div className={`text-xl font-mono font-black tracking-tighter ${isOverdue ? 'text-rose-600' : isCompleted ? 'text-slate-400' : 'text-slate-900'}`}>
                        {task.dueMileage.toLocaleString()} <span className="text-[8px] opacity-40">KM</span>
                      </div>
                    </div>
                    {task.dueDate && (
                      <div>
                        <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Scheduled Date</div>
                        <div className={`text-lg font-mono font-black tracking-tighter ${isOverdue ? 'text-rose-600' : isCompleted ? 'text-slate-400' : 'text-slate-900'}`}>
                          {formatDate(task.dueDate)}
                        </div>
                      </div>
                    )}
                    {isPending && (
                      <div>
                        <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining Gap</div>
                        <div className={`text-xl font-mono font-black tracking-tighter ${kmUntil <= 0 ? 'text-rose-600' : 'text-emerald-500'}`}>
                          {kmUntil <= 0 ? `-${Math.abs(kmUntil).toLocaleString()}` : `+${kmUntil.toLocaleString()}`}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full sm:w-auto">
                    {isPending && (
                      <button 
                        onClick={() => onLog(task)}
                        className="w-full bg-slate-900 text-white px-8 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 active:scale-95 transition-all"
                      >
                        Log Protocol
                      </button>
                    )}
                    {isUpcoming && (
                      <button 
                        onClick={() => handleMatchParts(task)}
                        className="w-full bg-white border border-slate-200 text-slate-900 px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                      >
                        Parts 🛒
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Floating Date Prediction Badge */}
              {effectiveDate && isPending && (
                <div className={`absolute -top-3 right-6 px-4 py-1.5 rounded-full text-[7px] font-black uppercase tracking-[0.2em] shadow-lg border-2 border-white ${task.dueDate ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'}`}>
                  {task.dueDate ? '📅 Scheduled: ' : '🔭 Est: '}
                  {daysLeft !== null && daysLeft <= 30 && daysLeft > 0 ? `${daysLeft} Days Left` : (daysLeft !== null && daysLeft <= 0 ? 'DUE NOW' : formatDate(effectiveDate))}
                </div>
              )}
            </div>
          );
        }) : (
          <div className="text-center py-20 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
             <div className="text-4xl mb-4 opacity-50">🛡️</div>
             <h4 className="text-xl font-black text-slate-900 tracking-tight">Zero Matches Found</h4>
             <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Adjust filters to scan different neural nodes.</p>
          </div>
        )}
      </div>
    </section>
  );
};
