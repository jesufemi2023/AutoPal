
import React from 'react';
import { Vehicle } from '../../shared/types.ts';
import { VehicleBlueprint } from '../VehicleBlueprint.tsx';
import { getHealthColor, getHealthStatusText } from '../../services/maintenanceService.ts';

interface Props {
  vehicle: Vehicle;
  onUpdateOdometer: () => void;
}

export const VehicleOverview: React.FC<Props> = ({ vehicle, onUpdateOdometer }) => (
  <section className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 lg:p-14 border border-slate-100 shadow-sm relative overflow-hidden group transition-all duration-700 hover:shadow-xl w-full">
    <div className="absolute top-0 right-0 p-10 opacity-[0.02] sm:opacity-[0.03] font-black text-[6rem] sm:text-[10rem] lg:text-[14rem] pointer-events-none select-none uppercase tracking-tighter leading-none transition-all duration-1000 group-hover:opacity-[0.05] group-hover:scale-110 overflow-hidden max-w-full">
      {vehicle.make}
    </div>
    
    <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 xl:gap-24 items-center relative z-10 w-full">
      <div className="w-full lg:w-5/12 shrink-0">
        {vehicle.imageUrl ? (
          <div className="aspect-[16/10] w-full rounded-[2.5rem] overflow-hidden border-[8px] sm:border-[12px] border-slate-50 shadow-lg relative group/img">
            <img 
              src={vehicle.imageUrl} 
              alt={vehicle.model}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
          </div>
        ) : (
          <VehicleBlueprint type={vehicle.bodyType} className="bg-slate-50 border-slate-100 text-slate-300 py-16 sm:py-20 lg:py-24" />
        )}
      </div>

      <div className="w-full lg:w-7/12 flex flex-col justify-center space-y-8 sm:space-y-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></span>
            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[9px] sm:text-[10px]">Neural Telemetry Link Active</span>
          </div>
          <h2 className="text-4xl sm:text-6xl xl:text-8xl font-black text-slate-900 tracking-tighter leading-[0.85] transition-colors duration-500 group-hover:text-blue-600">
            {vehicle.year} <span className="block sm:inline">{vehicle.model}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-4 pt-2">
             <div className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-2xl font-mono text-[10px] sm:text-[12px] font-bold tracking-widest uppercase border border-slate-200">{vehicle.vin || 'TELEMETRY_PENDING'}</div>
             <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{vehicle.bodyType} Core Class</div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-6 w-full">
          <button 
            onClick={onUpdateOdometer}
            className="flex-1 bg-slate-50 rounded-[2rem] p-8 text-left border border-slate-100 hover:border-blue-400 hover:bg-white transition-all duration-300 group/btn shadow-sm"
          >
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 group-hover/btn:text-blue-600 transition-colors">Instrument Cluster</div>
            <div className="text-4xl lg:text-5xl font-bold font-mono text-slate-900 tracking-tighter mb-2">
              {vehicle.mileage.toLocaleString()}
              <span className="text-sm lg:text-base text-slate-300 ml-3 font-sans font-bold">KM</span>
            </div>
            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest opacity-40 group-hover/btn:opacity-100 translate-x-[-10px] group-hover/btn:translate-x-0 transition-all duration-500">Update Telemetry →</div>
          </button>
          
          <div className="flex-1 bg-white border-2 border-slate-50 rounded-[2rem] p-8 text-left shadow-sm flex flex-col justify-between group/vibe transition-all duration-500 hover:border-blue-50">
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Asset Vitality</div>
              <div className={`text-4xl lg:text-5xl font-black ${getHealthColor(vehicle.healthScore)} tracking-tighter transition-all duration-500 group-hover/vibe:scale-105 origin-left`}>
                {vehicle.healthScore}%
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
               <div className={`w-3 h-3 rounded-full ${getHealthColor(vehicle.healthScore).replace('text', 'bg')} shadow-lg shadow-current/20`}></div>
               <div className="text-[10px] lg:text-[12px] font-black uppercase text-slate-900 tracking-[0.2em] leading-none">{getHealthStatusText(vehicle.healthScore)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
