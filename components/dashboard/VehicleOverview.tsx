
import React from 'react';
import { Vehicle } from '../../shared/types.ts';
import { VehicleBlueprint } from '../VehicleBlueprint.tsx';
import { getHealthColor, getHealthStatusText } from '../../services/maintenanceService.ts';

interface Props {
  vehicle: Vehicle;
  onUpdateOdometer: () => void;
}

export const VehicleOverview: React.FC<Props> = ({ vehicle, onUpdateOdometer }) => (
  <section className="bg-white rounded-[2.5rem] p-8 sm:p-12 border border-slate-100 shadow-sm relative overflow-hidden group transition-all duration-500 hover:shadow-lg hover:border-blue-100">
    <div className="absolute top-0 right-0 p-8 opacity-[0.02] font-black text-[10rem] pointer-events-none select-none uppercase tracking-tighter leading-none transition-all group-hover:opacity-[0.04]">
      {vehicle.make}
    </div>
    
    <div className="flex flex-col md:flex-row gap-10 md:gap-14 items-center relative z-10">
      <div className="w-full md:w-5/12">
        {vehicle.imageUrl ? (
          <div className="aspect-[16/10] w-full rounded-[2rem] overflow-hidden border-8 border-slate-50 shadow-lg relative">
            <img 
              src={vehicle.imageUrl} 
              alt={vehicle.model}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent"></div>
          </div>
        ) : (
          <VehicleBlueprint type={vehicle.bodyType} className="bg-slate-50 border-slate-100 text-slate-300" />
        )}
      </div>

      <div className="w-full md:w-7/12 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[8px]">Cloud Sync Active</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter leading-[0.9] transition-colors group-hover:text-blue-600">
            {vehicle.year} {vehicle.model}
          </h2>
          <div className="flex items-center gap-4 pt-2">
             <div className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg font-mono text-[9px] font-bold tracking-widest">{vehicle.vin || 'NO_CHASSIS_ID'}</div>
             <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{vehicle.bodyType} Class Asset</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={onUpdateOdometer}
            className="bg-slate-50 rounded-[1.5rem] p-6 text-left border border-slate-100 hover:border-blue-300 hover:bg-white transition-all active:scale-[0.98] group/btn"
          >
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/btn:text-blue-500">Live Odometer</div>
            <div className="text-3xl font-bold font-mono text-slate-900 tracking-tighter mb-1">
              {vehicle.mileage.toLocaleString()}
              <span className="text-xs text-slate-300 ml-1 font-sans">KM</span>
            </div>
            <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-all">Update Entry →</div>
          </button>
          
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-6 text-left shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Vitality Score</div>
              <div className={`text-3xl font-black ${getHealthColor(vehicle.healthScore)} tracking-tighter`}>
                {vehicle.healthScore}%
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
               <div className={`w-1.5 h-1.5 rounded-full ${getHealthColor(vehicle.healthScore).replace('text', 'bg')}`}></div>
               <div className="text-[9px] font-black uppercase text-slate-900 tracking-widest leading-none">{getHealthStatusText(vehicle.healthScore)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
