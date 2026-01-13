
import React from 'react';
import { Vehicle } from '../../shared/types.ts';
import { VehicleBlueprint } from '../VehicleBlueprint.tsx';
import { getHealthColor, getHealthStatusText } from '../../services/maintenanceService.ts';

interface Props {
  vehicle: Vehicle;
  onUpdateOdometer: () => void;
}

export const VehicleOverview: React.FC<Props> = ({ vehicle, onUpdateOdometer }) => (
  <section className="bg-white rounded-[3rem] p-6 sm:p-10 md:p-14 border border-slate-100 shadow-sm relative overflow-hidden group transition-all duration-700 hover:shadow-2xl hover:border-blue-100">
    <div className="absolute top-0 right-0 p-10 opacity-[0.03] font-black text-[8rem] sm:text-[12rem] pointer-events-none select-none uppercase tracking-tighter leading-none transition-all duration-1000 group-hover:opacity-[0.05] group-hover:scale-110">
      {vehicle.make}
    </div>
    
    <div className="flex flex-col xl:flex-row gap-8 sm:gap-12 xl:gap-20 items-center relative z-10">
      <div className="w-full xl:w-5/12">
        {vehicle.imageUrl ? (
          <div className="aspect-[16/10] w-full rounded-[2.5rem] overflow-hidden border-[6px] sm:border-[10px] border-slate-50 shadow-2xl relative">
            <img 
              src={vehicle.imageUrl} 
              alt={vehicle.model}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent opacity-60"></div>
          </div>
        ) : (
          <VehicleBlueprint type={vehicle.bodyType} className="bg-slate-50 border-slate-100 text-slate-300 py-10 sm:py-16" />
        )}
      </div>

      <div className="w-full xl:w-7/12 space-y-6 sm:space-y-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[8px] sm:text-[9px]">Neural Telemetry Link Active</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9] sm:leading-[0.85] transition-colors duration-500 group-hover:text-blue-600">
            {vehicle.year} {vehicle.model}
          </h2>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 sm:pt-3">
             <div className="px-3 sm:px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl font-mono text-[9px] sm:text-[10px] font-bold tracking-widest uppercase border border-slate-200">{vehicle.vin || 'TELEMETRY_PENDING'}</div>
             <div className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">{vehicle.bodyType} Class Core</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <button 
            onClick={onUpdateOdometer}
            className="bg-slate-50 rounded-[2rem] p-6 sm:p-8 text-left border border-slate-100 hover:border-blue-400 hover:bg-white transition-all duration-300 active:scale-[0.98] group/btn shadow-sm"
          >
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 group-hover/btn:text-blue-600 transition-colors">Instrument Cluster</div>
            <div className="text-3xl sm:text-4xl font-bold font-mono text-slate-900 tracking-tighter mb-1 sm:mb-1.5">
              {vehicle.mileage.toLocaleString()}
              <span className="text-xs sm:text-sm text-slate-300 ml-2 font-sans font-bold">KM</span>
            </div>
            <div className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] opacity-0 group-hover/btn:opacity-100 translate-x-[-10px] group-hover/btn:translate-x-0 transition-all duration-500">Update Telemetry →</div>
          </button>
          
          <div className="bg-white border-2 border-slate-50 rounded-[2rem] p-6 sm:p-8 text-left shadow-sm flex flex-col justify-between group/vibe">
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Asset Vitality</div>
              <div className={`text-3xl sm:text-4xl font-black ${getHealthColor(vehicle.healthScore)} tracking-tighter transition-all duration-500 group-hover/vibe:scale-105 origin-left`}>
                {vehicle.healthScore}%
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
               <div className={`w-2 h-2 rounded-full ${getHealthColor(vehicle.healthScore).replace('text', 'bg')} shadow-lg`}></div>
               <div className="text-[9px] sm:text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] leading-none">{getHealthStatusText(vehicle.healthScore)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
