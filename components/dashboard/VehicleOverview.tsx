
import React from 'react';
import { Vehicle } from '../../shared/types.ts';
import { VehicleBlueprint } from '../VehicleBlueprint.tsx';
import { getHealthColor, getHealthStatusText } from '../../services/maintenanceService.ts';

interface Props {
  vehicle: Vehicle;
  onUpdateOdometer: () => void;
}

export const VehicleOverview: React.FC<Props> = ({ vehicle, onUpdateOdometer }) => (
  <section className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 border border-slate-100 shadow-sm relative overflow-hidden group transition-all duration-700 hover:shadow-lg w-full">
    <div className="absolute top-0 right-0 p-8 opacity-[0.02] sm:opacity-[0.03] font-black text-[5rem] sm:text-[8rem] lg:text-[10rem] pointer-events-none select-none uppercase tracking-tighter leading-none transition-all duration-1000 group-hover:opacity-[0.05] group-hover:scale-105 overflow-hidden max-w-full">
      {vehicle.make}
    </div>
    
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 xl:gap-16 items-center relative z-10 w-full">
      <div className="w-full lg:w-5/12 shrink-0">
        {vehicle.imageUrl ? (
          <div className="aspect-[16/10] w-full rounded-[2rem] overflow-hidden border-[6px] sm:border-[10px] border-slate-50 shadow-md relative group/img">
            <img 
              src={vehicle.imageUrl} 
              alt={vehicle.model}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
          </div>
        ) : (
          <VehicleBlueprint type={vehicle.bodyType} className="bg-slate-50 border-slate-100 text-slate-300 py-12 sm:py-16 lg:py-20" />
        )}
      </div>

      <div className="w-full lg:w-7/12 flex flex-col justify-center space-y-6 sm:space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]"></span>
            <span className="text-slate-400 font-black uppercase tracking-[0.25em] text-[8px] sm:text-[9px]">Neural Telemetry Link Active</span>
          </div>
          <h2 className="text-3xl sm:text-5xl xl:text-6xl font-black text-slate-900 tracking-tighter leading-[0.9] transition-colors duration-500 group-hover:text-blue-600">
            {vehicle.year} <span className="block sm:inline">{vehicle.model}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-3 pt-1">
             <div className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl font-mono text-[9px] sm:text-[10px] font-bold tracking-widest uppercase border border-slate-200">{vehicle.vin || 'TELEMETRY_PENDING'}</div>
             <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{vehicle.bodyType} Core Class</div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-5 w-full">
          <button 
            onClick={onUpdateOdometer}
            className="flex-1 bg-slate-50 rounded-[1.5rem] p-6 text-left border border-slate-100 hover:border-blue-300 hover:bg-white transition-all duration-300 group/btn shadow-sm"
          >
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover/btn:text-blue-600 transition-colors">Instrument Cluster</div>
            <div className="text-3xl lg:text-4xl font-bold font-mono text-slate-900 tracking-tighter mb-1.5 leading-none">
              {vehicle.mileage.toLocaleString()}
              <span className="text-xs lg:text-sm text-slate-300 ml-2 font-sans font-bold">KM</span>
            </div>
            <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest opacity-40 group-hover/btn:opacity-100 translate-x-[-8px] group-hover/btn:translate-x-0 transition-all duration-500">Update Telemetry →</div>
          </button>
          
          <div className="flex-1 bg-white border-2 border-slate-50 rounded-[1.5rem] p-6 text-left shadow-sm flex flex-col justify-between group/vibe transition-all duration-500 hover:border-blue-50">
            <div>
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Asset Vitality</div>
              <div className={`text-3xl lg:text-4xl font-black ${getHealthColor(vehicle.healthScore)} tracking-tighter transition-all duration-500 group-hover/vibe:scale-105 origin-left leading-none`}>
                {vehicle.healthScore}%
              </div>
            </div>
            <div className="flex items-center gap-2.5 mt-4">
               <div className={`w-2.5 h-2.5 rounded-full ${getHealthColor(vehicle.healthScore).replace('text', 'bg')} shadow-md`}></div>
               <div className="text-[9px] lg:text-[10px] font-black uppercase text-slate-900 tracking-[0.15em] leading-none">{getHealthStatusText(vehicle.healthScore)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
