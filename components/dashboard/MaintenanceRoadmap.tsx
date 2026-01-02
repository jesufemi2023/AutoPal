
import React from 'react';
import { Vehicle, MaintenanceTask } from '../../shared/types.ts';
import { calculateProjectedServiceDate } from '../../services/maintenanceService.ts';
import { formatCurrency } from '../../shared/utils.ts';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  onComplete: (task: MaintenanceTask) => void;
  isLoading?: boolean;
}

export const MaintenanceRoadmap: React.FC<Props> = ({ vehicle, tasks, onComplete, isLoading }) => (
  <section className="bg-white card-radius p-8 md:p-14 border border-slate-100 shadow-sm relative overflow-hidden">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-16">
      <div>
        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Maintenance Roadmap</h3>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Predictive Service Timeline</p>
      </div>
      {isLoading && (
        <div className="flex items-center gap-3 bg-blue-50 px-5 py-2 rounded-full border border-blue-100">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-blue-600 tracking-widest uppercase">AI Syncing...</span>
        </div>
      )}
    </div>

    <div className="space-y-12 relative before:absolute before:left-7 md:before:left-9 before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
      {tasks.length > 0 ? tasks.map((task, i) => {
        const projectedDate = calculateProjectedServiceDate(vehicle, task);
        const isHigh = task.priority === 'high';
        return (
          <div key={task.id} className="relative pl-20 md:pl-24 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
            {/* Timeline Marker */}
            <div className={`absolute left-0 top-0 w-14 h-14 md:w-18 md:h-18 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center font-black text-lg border-4 border-white shadow-xl transition-all z-10 ${isHigh ? 'bg-rose-500 text-white' : 'bg-slate-900 text-white'}`}>
              {i + 1}
            </div>

            <div className="group bg-slate-50/50 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all">
              <div className="flex flex-col xl:flex-row justify-between items-start gap-8">
                <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] ${isHigh ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                      {task.priority} Priority
                    </span>
                    <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em]">
                      {task.category}
                    </span>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">{task.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-xl">{task.description}</p>
                </div>

                <div className="flex flex-col sm:flex-row xl:flex-col items-stretch sm:items-center xl:items-end gap-4 w-full xl:w-auto">
                  <div className="text-right">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected Odo</div>
                    <div className="text-xl font-black text-slate-900">{task.dueMileage?.toLocaleString()} <span className="text-[10px] opacity-30">KM</span></div>
                  </div>
                  {projectedDate && (
                    <div className="text-right">
                      <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Projected Date</div>
                      <div className="text-lg font-bold text-slate-900 leading-none">{projectedDate.toLocaleDateString()}</div>
                    </div>
                  )}
                  <button 
                    onClick={() => onComplete(task)}
                    className="mt-2 bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                  >
                    Mark Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }) : (
        <div className="text-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">✓</div>
          <h4 className="text-xl font-black text-slate-900">Vehicle Optimized</h4>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">No pending service alerts</p>
        </div>
      )}
    </div>
  </section>
);
