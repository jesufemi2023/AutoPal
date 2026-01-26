
import React, { useState, useMemo } from 'react';
import { Vehicle, MaintenanceTask, ServiceCategory, TaskStatus } from '../../shared/types.ts';
import { getTaskMaintenanceStatus, predictServiceDate } from '../../services/maintenanceLogic.ts';
import { useAutoPalStore } from '../../shared/store.ts';
import { formatDate, formatCurrency } from '../../shared/utils.ts';
// FIX: Removed 'Tooltip' from lucide-react imports as it does not exist in the library
import { Clock, AlertTriangle, CheckCircle2, Calendar, Gauge, Info, ChevronRight } from 'lucide-react';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  onLog: (task: MaintenanceTask) => void;
  isLoading?: boolean;
}

export const MaintenanceRoadmap: React.FC<Props> = ({ vehicle, tasks, onLog, isLoading }) => {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('pending');
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const velocity = vehicle.avgDailyKm || 35;
  
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

  const roadmapSummary = useMemo(() => {
    const pending = tasks.filter(t => t.status === 'pending');
    const overdue = pending.filter(t => getTaskMaintenanceStatus(vehicle, t) === 'overdue');
    const upcoming = pending.filter(t => getTaskMaintenanceStatus(vehicle, t) === 'upcoming');
    return { overdue: overdue.length, upcoming: upcoming.length, total: pending.length };
  }, [tasks, vehicle]);

  return (
    <section className="bg-white rounded-[3rem] p-6 sm:p-12 border border-slate-100 shadow-sm relative overflow-hidden transition-all duration-500 hover:shadow-xl w-full">
      {/* Visual Header & Smart Summary */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12 relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
               <Calendar size={24} />
             </div>
             <div>
               <h3 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Vehicle <span className="text-blue-600">Roadmap</span></h3>
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Active Service Protocol v4.0</p>
             </div>
          </div>
          
          <div className="flex flex-wrap gap-3 pt-2">
            <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 transition-all ${roadmapSummary.overdue > 0 ? 'bg-rose-50 border-rose-100 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle size={12} /> {roadmapSummary.overdue} Critical Items
            </div>
            <div className="px-4 py-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
              <Clock size={12} /> {roadmapSummary.upcoming} Near-term
            </div>
          </div>
        </div>
        
        <div className="flex bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-inner w-full lg:w-auto">
          {(['pending', 'completed', 'all'] as const).map(s => (
            <button 
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-1 lg:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-white text-slate-900 shadow-xl border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {s === 'pending' ? 'Schedule' : s === 'completed' ? 'Archive' : 'All Tasks'}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Explainer (Conditional) */}
      {activeInfo && (
        <div className="mb-10 p-6 bg-slate-900 text-white rounded-[2rem] animate-in slide-in-from-top-4 duration-300 relative group">
           <button onClick={() => setActiveInfo(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white">×</button>
           <div className="flex gap-4 items-start">
             <div className="p-2 bg-blue-600 rounded-lg"><Info size={16} /></div>
             <div className="space-y-1">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">{activeInfo} Module</h4>
               <p className="text-xs font-medium text-slate-300 leading-relaxed max-w-xl">
                 {activeInfo === 'Progress' && "Based on your current mileage vs the manufacturer's suggested interval. Red zones indicate high component wear."}
                 {activeInfo === 'Predicted Date' && "Our 'Velocity Engine' analyzes your average daily driving patterns to estimate exactly when you will reach your next service milestone."}
                 {activeInfo === 'Due At' && "The specific odometer reading when this part reaches the end of its reliable service life."}
               </p>
             </div>
           </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-32 flex flex-col items-center justify-center space-y-6">
            <div className="w-16 h-16 border-[5px] border-blue-600 border-t-transparent rounded-full animate-spin shadow-2xl"></div>
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">Synchronizing Roadmap...</p>
              <p className="text-[8px] font-bold uppercase text-slate-300 tracking-widest mt-2">Connecting to Engineering Cloud</p>
            </div>
          </div>
        ) : sortedTasks.length > 0 ? sortedTasks.map((task, i) => {
          const derivedStatus = task.status === 'pending' ? getTaskMaintenanceStatus(vehicle, task) : 'optimal';
          const isOverdue = derivedStatus === 'overdue';
          const isUpcoming = derivedStatus === 'upcoming';
          const predictedDate = predictServiceDate(vehicle, task, velocity);
          
          const interval = task.intervalKm || 5000;
          const startMileage = task.dueMileage - interval;
          const progress = task.status === 'completed' ? 100 : Math.min(100, Math.max(0, ((vehicle.mileage - startMileage) / interval) * 100));
          const kmRemaining = Math.max(0, task.dueMileage - vehicle.mileage);

          return (
            <div 
              key={task.id} 
              className={`group relative border-2 rounded-[2.5rem] p-8 sm:p-10 transition-all duration-500 hover:shadow-2xl animate-slide-up ${
                isOverdue 
                  ? 'border-rose-100 bg-rose-50/20' 
                  : isUpcoming 
                    ? 'border-amber-100 bg-amber-50/20' 
                    : task.status === 'completed' 
                      ? 'border-emerald-50 bg-emerald-50/5' 
                      : 'border-slate-50 bg-white hover:border-blue-100'
              }`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex flex-col xl:flex-row gap-10 items-stretch justify-between">
                
                {/* Section 1: Identity & Engineering Log */}
                <div className="flex-grow space-y-8 w-full">
                  <div className="flex items-start gap-6">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-inner transition-transform group-hover:scale-110 duration-500 ${
                      isOverdue ? 'bg-rose-500 text-white' : task.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'
                    }`}>
                      {task.category === 'fluids' ? '💧' : task.category === 'engine' ? '⚙️' : task.category === 'brakes' ? '🛑' : task.category === 'tires' ? '🛞' : '🛠️'}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg ${
                          isOverdue ? 'bg-rose-600 text-white' : isUpcoming ? 'bg-amber-500 text-white' : task.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                        }`}>
                          {task.status === 'pending' ? (isOverdue ? 'CRITICAL: OVERDUE' : isUpcoming ? 'UPCOMING' : 'STATUS: OPTIMAL') : 'COMPLETE'}
                        </span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 px-2 py-1 rounded-lg">{task.category} system</span>
                        {task.priority === 'high' && <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={10} /> Priority High</span>}
                      </div>
                      <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-blue-600 transition-colors uppercase">{task.title}</h4>
                      <p className="text-xs font-bold text-slate-500 leading-relaxed max-w-xl opacity-90 italic">"{task.description}"</p>
                    </div>
                  </div>

                  {/* Section 2: Component Lifespan Gauge */}
                  {task.status === 'pending' && (
                    <div className="space-y-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lifespan Exhausted</div>
                          <button onClick={() => setActiveInfo('Progress')} className="text-slate-300 hover:text-blue-500"><Info size={10}/></button>
                        </div>
                        <div className="text-[10px] font-mono font-black text-slate-900">{Math.round(progress)}% of interval reached</div>
                      </div>
                      <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-slate-200 p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            progress > 90 ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 
                            progress > 75 ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 
                            'bg-blue-600 shadow-[0_0_8px_#2563eb]'
                          }`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                         <span>Start ({startMileage.toLocaleString()} KM)</span>
                         <span className={isOverdue ? 'text-rose-500 animate-pulse' : 'text-blue-600'}>
                           {kmRemaining === 0 ? 'Exhausted' : `${kmRemaining.toLocaleString()} KM Remaining`}
                         </span>
                         <span>Due ({task.dueMileage.toLocaleString()} KM)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Telemetry & Actions Dashboard */}
                <div className="w-full xl:w-80 grid grid-cols-2 xl:flex xl:flex-col gap-6 xl:items-end shrink-0 border-t xl:border-t-0 xl:border-l xl:border-slate-100 pt-8 xl:pt-2 xl:pl-10">
                   <div className="space-y-1.5 xl:text-right">
                      <div className="flex items-center xl:justify-end gap-2">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Odometer Due</div>
                        <button onClick={() => setActiveInfo('Due At')} className="text-slate-200 hover:text-blue-500"><Info size={10}/></button>
                      </div>
                      <div className={`text-3xl font-mono font-black tracking-tighter ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                        {task.dueMileage.toLocaleString()} <span className="text-xs font-sans text-slate-300">KM</span>
                      </div>
                   </div>
                   
                   <div className="space-y-1.5 xl:text-right">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Market Est. Cost</div>
                      <div className="text-2xl font-black text-slate-900 tracking-tighter">
                        {formatCurrency(task.estimatedCost || 0)}
                      </div>
                   </div>

                   <div className="col-span-2 w-full space-y-4 pt-4">
                      {task.status === 'pending' && (
                        <button 
                          onClick={() => onLog(task)}
                          className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${
                            isOverdue ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-slate-900 hover:bg-blue-600 text-white'
                          }`}
                        >
                          <CheckCircle2 size={16} /> Log Completion
                        </button>
                      )}
                      
                      {predictedDate && task.status === 'pending' && (
                        <div className="relative group/pred" title="Based on average daily KM velocity.">
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col items-center gap-1 cursor-help hover:bg-blue-50 hover:border-blue-200 transition-all">
                             <div className="flex items-center gap-2 text-[7px] font-black text-slate-400 uppercase tracking-widest">
                               <Clock size={10} /> Predicted Deadline
                               <button onClick={(e) => { e.stopPropagation(); setActiveInfo('Predicted Date'); }} className="text-slate-300 hover:text-blue-500"><Info size={10}/></button>
                             </div>
                             <div className="text-[11px] font-black text-blue-600 uppercase tracking-widest">
                               ~ {formatDate(predictedDate)}
                             </div>
                          </div>
                        </div>
                      )}

                      {task.status === 'completed' && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-center gap-3 text-emerald-600">
                          <CheckCircle2 size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Verified Record</span>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-32 bg-slate-50/50 rounded-[4rem] border-2 border-dashed border-slate-100">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl shadow-xl border border-slate-50 mx-auto mb-8 animate-bounce duration-2000">🏁</div>
             <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Mission Operations Clear</h4>
             <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] mt-3">All systems performing within optimal thresholds</p>
             <button onClick={() => window.location.reload()} className="mt-10 px-8 py-3 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all">Manual Recalibration</button>
          </div>
        )}
      </div>
    </section>
  );
};
