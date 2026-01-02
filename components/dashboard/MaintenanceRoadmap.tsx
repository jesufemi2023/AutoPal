
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
  <section className="bg-white rounded-[3.5rem] p-8 md:p-14 border border-slate-100 shadow-sm">
    <div className="flex justify-between items-center mb-12">
      <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4">
        <span className="w-2 h-10 bg-blue-600 rounded-full"></span>
        Roadmap Intel
      </h3>
      {isLoading && <span className="text-[10px] font-black text-blue-600 animate-pulse tracking-widest uppercase">Syncing...</span>}
    </div>

    <div className="space-y-8">
      {tasks.length > 0 ? tasks.map((task, i) => {
        const projectedDate = calculateProjectedServiceDate(vehicle, task);
        return (
          <div key={task.id} className="group relative flex gap-6 md:gap-10 items-start border-b border-slate-50 pb-10 last:border-0 last:pb-0">
            <div className={`w-14 h-14 rounded-[1.5rem] flex-shrink-0 flex items-center justify-center font-black text-lg border-2 transition-all group-hover:scale-110 ${task.priority === 'high' ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row justify-between gap-4 mb-3">
                <h4 className="font-black text-slate-900 text-xl md:text-2xl tracking-tight leading-none group-hover:text-blue-600 transition-colors">{task.title}</h4>
                <button 
                  onClick={() => onComplete(task)}
                  className="bg-slate-900 text-white text-[10px] font-black px-8 py-4 rounded-2xl hover:bg-emerald-600 transition-all uppercase tracking-widest active:scale-90"
                >
                  Mark Done
                </button>
              </div>
              <p className="text-slate-500 text-sm md:text-base leading-relaxed mb-4 max-w-2xl">{task.description}</p>
              <div className="flex flex-wrap gap-4">
                <span className="text-[10px] font-black uppercase text-slate-400 border border-slate-100 px-3 py-1 rounded-lg">Due @ {task.dueMileage?.toLocaleString()} km</span>
                {projectedDate && (
                  <span className="text-[10px] font-black uppercase text-blue-500 bg-blue-50 px-3 py-1 rounded-lg">
                    Est: {projectedDate.toLocaleDateString()}
                  </span>
                )}
                {task.estimatedCost && <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Est. {formatCurrency(task.estimatedCost)}</span>}
              </div>
            </div>
          </div>
        );
      }) : (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-6">✨</div>
          <p className="text-slate-900 font-black text-xl mb-1 tracking-tight">Your Vehicle is Optimized</p>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No pending maintenance identified</p>
        </div>
      )}
    </div>
  </section>
);
