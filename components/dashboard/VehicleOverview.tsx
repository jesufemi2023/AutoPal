
import React from 'react';
import { Vehicle } from '../../shared/types.ts';
import { VehicleBlueprint } from '../VehicleBlueprint.tsx';
import { getHealthColor, getHealthStatusText } from '../../services/maintenanceService.ts';

interface Props {
  vehicle: Vehicle;
  onUpdateOdometer: () => void;
}

export const VehicleOverview: React.FC<Props> = ({ vehicle, onUpdateOdometer }) => (
  <section className="bg-white rounded-[3.5rem] p-8 md:p-14 border border-slate-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-xl">
    <div className="absolute top-0 right-0 p-12 opacity-[0.03] font-black text-9xl pointer-events-none select-none uppercase tracking-tighter transition-opacity group-hover:opacity-[0.05]">
      {vehicle.make}
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
      <VehicleBlueprint type={vehicle.bodyType} />
      <div className="space-y-8">
        <div className="space-y-2">
          <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Active Profile</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter leading-none">
            {vehicle.year} {vehicle.model}
          </h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onUpdateOdometer}
            className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100 text-left hover:bg-white hover:border-blue-200 transition-all active:scale-95 group/btn"
          >
            <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex justify-between">
              Odometer
              <span className="text-blue-500 transition-transform group-hover/btn:translate-x-1">→</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{vehicle.mileage.toLocaleString()} <span className="text-xs uppercase opacity-30">km</span></div>
          </button>
          
          <div className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100">
            <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Health</div>
            <div className={`text-3xl font-black ${getHealthColor(vehicle.healthScore)}`}>{vehicle.healthScore}%</div>
            <div className="text-[10px] font-black uppercase text-slate-400 mt-1">{getHealthStatusText(vehicle.healthScore)}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
