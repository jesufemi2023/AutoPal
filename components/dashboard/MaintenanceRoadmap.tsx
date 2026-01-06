
import React from 'react';
import { Vehicle, MaintenanceTask } from '../../shared/types.ts';
import { calculateProjectedServiceDate } from '../../services/maintenanceService.ts';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  onComplete: (task: MaintenanceTask) => void;
  isLoading?: boolean;
}

export const MaintenanceRoadmap: React.FC<Props> = ({ vehicle, tasks, onComplete, isLoading }) => (
  <section className="bg-white card-radius p-6 sm:p-10 md:p-14 border border-slate-100 shadow-sm">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 mb-10 sm:mb-16">
      <div>
        <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter">Roadmap</h3>
        <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-1 sm:mt-2">Neural Projected Service Logs</p>
      </div>
      {isLoading && (
        <div className="flex items-center gap-3 sm:gap-4 bg-blue-50 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-blue-100">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full animate-spin"></div>
          <span className="text-[8px] sm:text-[9px] font-black text-blue-600 tracking-[0.2em] uppercase">Syncing...</span>
        </div>
      )}
    </div>

    <div className="space-y-8 sm:space-y-10 relative before:absolute before:left-5 sm:before:left-9 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-50">
      {tasks.length > 0 ? tasks.map((task, i) => {
        const projectedDate = calculateProjectedServiceDate(vehicle, task);
        const isHigh = task.priority === 'high';
        return (
          <div key={task.id} className="relative pl-12 sm:pl-24 animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className={`absolute left-0 top-0 w-10 h-10 sm:w-18 sm:h-18 rounded-xl sm:rounded-[1.75rem] flex items-center justify-center font-black text-sm sm:text-lg border-4 sm:border-8 border-white shadow-xl z-10 ${isHigh ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-slate-900 text-white shadow-slate-900/20'}`}>
              {i + 1}
            </div>

            <div className="group bg-[#f8fafc]/50 rounded-2xl sm:rounded-[3rem] p-6 sm:p-10 border border-slate-100 hover:bg-white hover:shadow-2xl transition-all duration-500">
              <div className="flex flex-col xl:flex-row justify-between items-start gap-6 sm:gap-10">
                <div className="space-y-3 sm:space-y-5 flex-1">
                  <div className="flex gap-2 sm:gap-3">
                    <span className={`px-3 sm:px-4 py-1 rounded-lg sm:rounded-xl text-[7px] sm:text-[8px] font-black uppercase tracking-widest ${isHigh ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                      {task.priority}
                    </span>
                    <span className="bg-slate-100 text-slate-500 px-3 sm:px-4 py-1 rounded-lg sm:rounded-xl text-[7px] sm:text-[8px] font-black uppercase tracking-widest">
                      {task.category}
                    </span>
                  </div>
                  <h4 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors">{task.title}</h4>
                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-lg font-medium">{task.description}</p>
                </div>

                <div className="flex flex-col sm:flex-row xl:flex-col items-stretch sm:items-center xl:items-end gap-5 w-full xl:w-auto">
                  <div className="flex gap-6 sm:gap-10 justify-between sm:justify-end w-full">
                    <div className="text-left sm:text-right">
                      <div className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Odo Target</div>
                      <div className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tighter">{task.dueMileage?.toLocaleString()}<span className="text-[9px] ml-0.5 opacity-40">KM</span></div>
                    </div>
                    {projectedDate && (
                      <div className="text-right">
                        <div className="text-[7px] sm:text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1">ETA</div>
                        <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter">{projectedDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</div>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => onComplete(task)}
                    className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                  >
                    Complete Log
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }) : (
        <div className="text-center py-16 sm:py-24 bg-slate-50 rounded-2xl sm:rounded-[4rem] border-2 border-dashed border-slate-200/50 px-4">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white text-emerald-500 rounded-full flex items-center justify-center text-3xl sm:text-4xl mx-auto mb-6 sm:mb-8 shadow-xl">✧</div>
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">System Optimized</h4>
          <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mt-2 sm:mt-4">All parameters within normal range</p>
        </div>
      )}
    </div>
  </section>
);
