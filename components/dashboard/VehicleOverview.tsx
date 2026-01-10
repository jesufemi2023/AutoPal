
import React from 'react';
import { Vehicle } from '../../shared/types.ts';
import { VehicleBlueprint } from '../VehicleBlueprint.tsx';
import { getHealthColor, getHealthStatusText } from '../../services/maintenanceService.ts';

interface Props {
  vehicle: Vehicle;
  onUpdateOdometer: () => void;
}

export const VehicleOverview: React.FC<Props> = ({ vehicle, onUpdateOdometer }) => (
  <section className="bg-white card-radius p-6 sm:p-10 md:p-14 border border-slate-100 shadow-sm relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-8 sm:p-16 opacity-[0.01] font-black text-[6rem] sm:text-[12rem] pointer-events-none select-none uppercase tracking-tighter leading-none transition-opacity group-hover:opacity-[0.03]">
      {vehicle.make}
    </div>
    
    <div className="flex flex-col lg:flex-row gap-8 sm:gap-12 md:gap-20 items-center relative z-10">
      <div className="w-full lg:w-5/12">
        {vehicle.imageUrl ? (
          <div className="aspect-[16/10] w-full rounded-2xl sm:rounded-[3rem] overflow-hidden border-[6px] sm:border-[12px] border-slate-50 shadow-3xl relative">
            <img 
              src={vehicle.imageUrl} 
              alt={vehicle.model}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
          </div>
        ) : (
          <VehicleBlueprint type={vehicle.bodyType} className="shadow-2xl shadow-slate-200/50 bg-slate-50/50" />
        )}
      </div>

      <div className="w-full lg:w-7/12 space-y-8 sm:space-y-12">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[7px] sm:text-[8px]">Cloud Synchronized</span>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">
            {vehicle.year} {vehicle.model}
          </h2>
          <div className="flex items-center gap-3">
             <div className="px-2.5 py-1 bg-slate-900 text-white rounded-md sm:rounded-lg font-mono text-[8px] sm:text-[9px] font-black tracking-widest">{vehicle.vin || 'NO_VIN'}</div>
             <div className="h-4 w-px bg-slate-200"></div>
             <div className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">{vehicle.bodyType} Class</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <button 
            onClick={onUpdateOdometer}
            className="group/btn bg-white rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 text-left border-2 border-slate-100 hover:border-blue-500 transition-all active:scale-[0.98] flex flex-col justify-between h-40 sm:h-48"
          >
            <div>
              <div className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/btn:text-blue-600">Active Odometer</div>
              <div className="text-2xl sm:text-4xl font-black text-slate-900 leading-none tracking-tighter font-mono">
                {vehicle.mileage.toLocaleString()}
              </div>
              <div className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase mt-1 tracking-widest">KM Telemetry</div>
            </div>
            <div className="text-[8px] font-black text-blue-600 uppercase tracking-[0.2em] mt-auto opacity-0 group-hover/btn:opacity-100 transition-opacity">Update →</div>
          </button>
          
          <div className="bg-slate-50/50 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 text-left border-2 border-slate-100 flex flex-col justify-between h-40 sm:h-48">
            <div>
              <div className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vitality Score</div>
              <div className={`text-3xl sm:text-5xl font-black ${getHealthColor(vehicle.healthScore)} leading-none tracking-tighter`}>
                {vehicle.healthScore}<span className="text-xl sm:text-2xl opacity-40">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 mt-auto">
               <div className={`w-1.5 h-1.5 rounded-full ${getHealthColor(vehicle.healthScore).replace('text', 'bg')}`}></div>
               <div className="text-[9px] sm:text-[10px] font-black uppercase text-slate-900 tracking-widest">{getHealthStatusText(vehicle.healthScore)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
