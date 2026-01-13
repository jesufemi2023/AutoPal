
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
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      if (a.status === 'pending' && b.status === 'pending') {
        const statusA = getTaskMaintenanceStatus(vehicle, a);
        const statusB = getTaskMaintenanceStatus(vehicle, b);
        const weight = { overdue: 0, upcoming: 1, optimal: 2 };
        if (weight[statusA] !== weight[statusB]) return weight[statusA] - weight[statusB];
      }
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
    <section className="bg-white rounded-[3rem] p-10 sm:p-14 border border-slate-100 shadow-sm relative overflow-hidden transition-all duration-500 hover:shadow-xl">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16 relative z-10">
        <div className="space-y-2">
          <h3 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter uppercase">Lifecycle Strategy</h3>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Asset Velocity: <span className="text-slate-900 font-mono">{velocity} KM/Day</span></p>
          </div>
        </div>
      </div>

      {/* Modern Filter Trays */}
      <div className="mb-14 space-y-6 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-shrink-0 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 sm:w-24">Status</div>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 sm:-mx-0 sm:px-0">
            {statuses.map(s => (
              <button 
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all duration-300 ${statusFilter === s ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-105' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-shrink-0 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 sm:w-24">Category</div>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 sm:-mx-0 sm:px-0">
            {categories.map(c => (
              <button 
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all duration-300 ${categoryFilter === c ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200'}`}
              >
                {c === 'all' ? 'Unified View' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-8 relative z-10">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-6">
            <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">Synchronizing Local Nodes...</p>
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
            overdue: 'border-rose-500 bg-rose-50/50',
            upcoming: 'border-amber-500 bg-amber-50/50',
            optimal: isCompleted ? 'border-emerald-100 bg-emerald-50/20 opacity-80' : isSkipped ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-slate-100 bg-white'
          };

          return (
            <div 
              key={task.id} 
              className={`group relative border-l-[8px] rounded-[2.5rem] p-8 sm:p-14 transition-all duration-700 hover:shadow-2xl hover:-translate-y-1 animate-slide-up shadow-sm ${statusColors[derivedStatus] || statusColors.optimal}`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex flex-col lg:flex-row justify-between gap-10 lg:items-center">
                <div className="flex-1 space-y-6">
                  <div className="flex flex-wrap gap-3 items-center">
                    <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] shadow-sm ${
                      isOverdue ? 'bg-rose-100 text-rose-600' : 
                      isUpcoming ? 'bg-amber-100 text-amber-600' : 
                      isCompleted ? 'bg-emerald-100 text-emerald-600' :
                      isSkipped ? 'bg-slate-200 text-slate-500' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {isPending ? derivedStatus : task.status}
                    </span>
                    <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] bg-slate-900/5 text-slate-400 border border-slate-100`}>
                      {task.priority} Priority
                    </span>
                    {task.priority === Priority.HIGH && isPending && (
                       <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shadow-[0_0_10px_rgba(244,63,94,0.6)]"></div>
                    )}
                  </div>

                  <div className="flex items-start gap-6">
                    <div className={`w-14 h-14 bg-white rounded-[1.25rem] border border-slate-100 flex items-center justify-center text-3xl shadow-md group-hover:rotate-6 transition-all duration-500 shrink-0 ${isCompleted ? 'text-emerald-500' : 'text-slate-800'}`}>
                      {isCompleted ? '✓' : getCategoryIcon(task.category)}
                    </div>
                    <div className="space-y-1.5">
                      <h4 className={`text-xl sm:text-2xl font-black tracking-tighter leading-none ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</h4>
                      <p className="text-slate-500 text-[13px] font-medium max-w-xl leading-relaxed opacity-80 line-clamp-2 sm:line-clamp-none">{task.description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-6 lg:items-end shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-8 lg:pt-0 lg:pl-10">
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-6 text-right">
                    <div className="group/tele">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 group-hover/tele:text-blue-600 transition-colors">Target Telemetry</div>
                      <div className={`text-xl font-mono font-black tracking-tighter ${isOverdue ? 'text-rose-600' : isCompleted ? 'text-slate-400' : 'text-slate-900'}`}>
                        {task.dueMileage.toLocaleString()} <span className="text-[10px] opacity-40">KM</span>
                      </div>
                    </div>
                    {isPending && (
                      <div className="group/tele">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 group-hover/tele:text-emerald-600 transition-colors">Distance Delta</div>
                        <div className={`text-xl font-mono font-black tracking-tighter ${kmUntil <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {kmUntil <= 0 ? `-` : `+`}{Math.abs(kmUntil).toLocaleString()} <span className="text-[10px] opacity-40">KM</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full sm:w-auto">
                    {isPending && (
                      <button 
                        onClick={() => onLog(task)}
                        className="w-full bg-slate-900 text-white px-8 py-4 rounded-[1rem] text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl hover:bg-blue-600 active:scale-95 transition-all duration-300"
                      >
                        Execute Task
                      </button>
                    )}
                    {isUpcoming && (
                      <button 
                        onClick={() => handleMatchParts(task)}
                        className="w-full bg-white border-2 border-slate-100 text-slate-900 px-8 py-3.5 rounded-[1rem] text-[10px] font-black uppercase tracking-[0.2em] hover:border-blue-300 transition-all duration-300"
                      >
                        Source Parts 🛒
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {effectiveDate && isPending && (
                <div className={`absolute -top-3 right-10 px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.25em] shadow-2xl border-[3px] border-white transition-all duration-500 group-hover:scale-110 group-hover:translate-y-[-2px] ${task.dueDate ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'}`}>
                  {task.dueDate ? '📅 Fixed: ' : '🔭 Prediction: '}
                  {daysLeft !== null && daysLeft <= 30 && daysLeft > 0 ? `${daysLeft}d Left` : (daysLeft !== null && daysLeft <= 0 ? 'OVERDUE' : formatDate(effectiveDate))}
                </div>
              )}
            </div>
          );
        }) : (
          <div className="text-center py-24 bg-slate-50/30 rounded-[3rem] border-2 border-dashed border-slate-100">
             <div className="text-6xl mb-6 grayscale opacity-30">🛡️</div>
             <h4 className="text-xl font-black text-slate-900 tracking-tight uppercase">Operational Roadmap Clear</h4>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Adjust filters to reveal hidden asset history.</p>
          </div>
        )}
      </div>
    </section>
  );
};
