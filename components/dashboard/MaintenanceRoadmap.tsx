
import React from 'react';
import { Vehicle, MaintenanceTask } from '../../shared/types.ts';
import { getTaskMaintenanceStatus, predictServiceDate } from '../../services/maintenanceLogic.ts';
import { useAutoPalStore } from '../../shared/store.ts';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  onLog: (task: MaintenanceTask) => void;
  isLoading?: boolean;
}

export const MaintenanceRoadmap: React.FC<Props> = ({ vehicle, tasks, onLog, isLoading }) => {
  const { setCurrentView, setMarketplaceFilter, fuelLogs, serviceLogs } = useAutoPalStore();
  
  // Calculate current velocity for precise predictions
  const velocity = vehicle.avgDailyKm || 30;

  const sortedTasks = [...tasks].sort((a,b) => {
    const statusA = getTaskMaintenanceStatus(vehicle, a);
    const statusB = getTaskMaintenanceStatus(vehicle, b);
    const weight = { overdue: 0, upcoming: 1, optimal: 2 };
    if (weight[statusA] !== weight[statusB]) return weight[statusA] - weight[statusB];
    return a.dueMileage - b.dueMileage;
  });

  const handleMatchParts = (task: MaintenanceTask) => {
    setMarketplaceFilter(task.title);
    setCurrentView('marketplace');
  };

  return (
    <section className="bg-white card-radius p-8 sm:p-14 border border-slate-100 shadow-sm relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16 relative z-10">
        <div className="space-y-2">
          <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Roadmap</h3>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">Engineering Lifecycle Engine Active</p>
          </div>
        </div>
      </div>

      <div className="space-y-12 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-50 z-10">
        {sortedTasks.length > 0 ? sortedTasks.map((task, i) => {
          const status = getTaskMaintenanceStatus(vehicle, task);
          const isOverdue = status === 'overdue';
          const isUpcoming = status === 'upcoming';
          const kmUntil = task.dueMileage - vehicle.mileage;
          
          // Velocity-Based Date Prediction
          const projectedDate = predictServiceDate(vehicle, task, velocity);
          const daysLeft = projectedDate ? Math.ceil((new Date(projectedDate).getTime() - Date.now()) / (1000*3600*24)) : null;

          return (
            <div key={task.id} className="relative pl-16 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={`absolute left-4 top-1 w-4 h-4 rounded-full border-[4px] border-white z-20 shadow-xl ${isOverdue ? 'bg-rose-500 animate-pulse' : isUpcoming ? 'bg-amber-500' : 'bg-slate-200'}`}></div>
              
              <div className="group bg-slate-50/40 rounded-[3rem] p-8 sm:p-12 border border-slate-100 hover:bg-white hover:shadow-3xl transition-all duration-700">
                <div className="flex flex-col xl:flex-row justify-between items-start gap-10">
                  <div className="space-y-6 flex-1">
                    <div className="flex flex-wrap gap-4 items-center">
                      <span className={`px-5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${isOverdue ? 'bg-rose-100 text-rose-600' : isUpcoming ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                        {status.toUpperCase()}
                      </span>
                      {daysLeft !== null && (
                         <span className="flex items-center gap-2 bg-blue-50 text-blue-600 px-5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border border-blue-100">
                           <span className="animate-pulse">✧</span> Precision Badge: {daysLeft} Days
                         </span>
                      )}
                      {isUpcoming && (
                        <button 
                          onClick={() => handleMatchParts(task)}
                          className="bg-slate-900 text-white px-5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all"
                        >
                          Find Components 🛒
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-3xl font-black text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">{task.title}</h4>
                      <p className="text-slate-500 text-[13px] font-medium max-w-xl leading-relaxed opacity-80">{task.description}</p>
                    </div>
                    
                    {projectedDate && (
                      <div className="flex items-center gap-3">
                         <div className="px-3 py-1 bg-slate-100 rounded-lg text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            Estimated: {new Date(projectedDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                         </div>
                      </div>
                    )}
                  </div>

                  <div className="w-full xl:w-auto flex flex-col sm:flex-row xl:flex-col gap-8 items-stretch sm:items-center xl:items-end border-t xl:border-t-0 pt-8 xl:pt-0 border-slate-100">
                    <div className="flex gap-12">
                       <div className="text-right space-y-1">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Odometer</div>
                          <div className={`text-2xl font-black font-mono tracking-tighter ${isOverdue ? 'text-rose-500' : 'text-slate-900'}`}>{task.dueMileage.toLocaleString()} <span className="text-[10px] opacity-40">KM</span></div>
                       </div>
                       <div className="text-right space-y-1">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Distance Gap</div>
                          <div className={`text-2xl font-black font-mono tracking-tighter ${isOverdue ? 'text-rose-600' : isUpcoming ? 'text-amber-600' : 'text-emerald-500'}`}>
                            {kmUntil <= 0 ? `-${Math.abs(kmUntil).toLocaleString()}` : `+${kmUntil.toLocaleString()}`}
                          </div>
                       </div>
                    </div>
                    <button 
                      onClick={() => onLog(task)}
                      className="w-full sm:w-auto bg-slate-900 text-white px-14 py-6 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-4xl hover:bg-blue-600 active:scale-95 transition-all"
                    >
                      Log Resolution
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-32 bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-100 p-16">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl mx-auto mb-8 shadow-2xl text-emerald-500 border border-emerald-50">✓</div>
             <h4 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Engineering Optimal</h4>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">No maintenance debt detected in current matrix</p>
          </div>
        )}
      </div>
    </section>
  );
};
