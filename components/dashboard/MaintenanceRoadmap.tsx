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
  <section className="bg-white card-radius p-8 md:p-14 border border-slate-100 shadow-sm">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
      <div>
        <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Roadmap</h3>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Neural Projected Service Logs</p>
      </div>
      {isLoading && (
        <div className="flex items-center gap-4 bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-spin"></div>
          <span className="text-[9px] font-black text-blue-600 tracking-[0.2em] uppercase">Recalculating Intervals...</span>
        </div>
      )}
    </div>

    <div className="space-y-10 relative before:absolute before:left-9 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-50">
      {tasks.length > 0 ? tasks.map((task, i) => {
        const projectedDate = calculateProjectedServiceDate(vehicle, task);
        const isHigh = task.priority === 'high';
        return (
          <div key={task.id} className="relative pl-24 animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className={`absolute left-0 top-0 w-18 h-18 rounded-[1.75rem] flex items-center justify-center font-black text-lg border-8 border-white shadow-xl z-10 transition-transform hover:scale-110 ${isHigh ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-slate-900 text-white shadow-slate-900/20'}`}>
              {i + 1}
            </div>

            <div className="group bg-[#f8fafc]/50 rounded-[3rem] p-10 border border-slate-100 hover:bg-white hover:shadow-3xl hover:shadow-slate-200/40 transition-all duration-500">
              <div className="flex flex-col xl:flex-row justify-between items-start gap-10">
                <div className="space-y-5 flex-1">
                  <div className="flex gap-3">
                    <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${isHigh ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                      {task.priority} Priority
                    </span>
                    <span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest">
                      {task.category}
                    </span>
                  </div>
                  <h4 className="text-3xl font-black text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">{task.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-lg font-medium">{task.description}</p>
                </div>

                <div className="flex flex-col sm:flex-row xl:flex-col items-stretch sm:items-center xl:items-end gap-6 w-full xl:w-auto">
                  <div className="flex gap-10">
                    <div className="text-right">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Odo</div>
                      <div className="text-xl font-black text-slate-900 font-mono tracking-tighter">{task.dueMileage?.toLocaleString()}<span className="text-[10px] ml-1 opacity-40">KM</span></div>
                    </div>
                    {projectedDate && (
                      <div className="text-right">
                        <div className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1">ETA Window</div>
                        <div className="text-xl font-black text-slate-900 tracking-tighter">{projectedDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</div>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => onComplete(task)}
                    className="bg-slate-900 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl active:scale-95"
                  >
                    Mark Log Complete
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }) : (
        <div className="text-center py-24 bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200/50">
          <div className="w-24 h-24 bg-white text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 shadow-xl">✧</div>
          <h4 className="text-2xl font-black text-slate-900 tracking-tight">System Optimized</h4>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-4">All Maintenance Parameters Met</p>
        </div>
      )}
    </div>
  </section>
);