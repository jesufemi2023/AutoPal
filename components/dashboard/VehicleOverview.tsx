
import React from 'react';
import { Vehicle } from '../../shared/types.ts';
import { VehicleBlueprint } from '../VehicleBlueprint.tsx';
import { getHealthColor, getHealthStatusText } from '../../services/maintenanceService.ts';

interface Props {
  vehicle: Vehicle;
  onUpdateOdometer: () => void;
}

export const VehicleOverview: React.FC<Props> = ({ vehicle, onUpdateOdometer }) => (
  <section className="bg-white card-radius p-6 md:p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-12 opacity-[0.02] font-black text-9xl pointer-events-none select-none uppercase tracking-tighter leading-none transition-opacity group-hover:opacity-[0.04]">
      {vehicle.make}
    </div>
    
    <div className="flex flex-col lg:flex-row gap-10 md:gap-16 items-center relative z-10">
      <div className="w-full lg:w-1/2">
        {vehicle.imageUrls && vehicle.imageUrls.length > 0 ? (
          <div className="aspect-[16/10] w-full rounded-[2.5rem] overflow-hidden border-4 border-slate-50 shadow-2xl relative">
            <img 
              src={vehicle.imageUrls[0]} 
              alt={vehicle.model}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent"></div>
          </div>
        ) : (
          <VehicleBlueprint type={vehicle.bodyType} className="shadow-2xl shadow-slate-200/50" />
        )}
      </div>

      <div className="w-full lg:w-1/2 space-y-10">
        <div>
          <span className="bg-blue-600 text-white px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20">Operational Digital Twin</span>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none mt-6">
            {vehicle.year} {vehicle.model}
          </h2>
          <p className="text-slate-400 font-mono text-[10px] mt-2 uppercase tracking-widest">Chassis ID: {vehicle.vin}</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={onUpdateOdometer}
            className="glass-card rounded-[2rem] p-6 text-left hover:border-blue-400 transition-all active:scale-[0.98] border-slate-100 flex flex-col justify-between h-40"
          >
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Distance</div>
              <div className="text-3xl font-black text-slate-900 leading-none">{vehicle.mileage.toLocaleString()}</div>
              <div className="text-[9px] font-black text-blue-600 uppercase mt-1">Kilometers</div>
            </div>
            <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-auto group-hover:translate-x-1 transition-transform">Update Odometer →</div>
          </button>
          
          <div className="glass-card rounded-[2rem] p-6 text-left border-slate-100 flex flex-col justify-between h-40">
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">System Health</div>
              <div className={`text-4xl font-black ${getHealthColor(vehicle.healthScore)} leading-none`}>{vehicle.healthScore}%</div>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 mt-auto">
              <div className="text-[9px] font-black uppercase text-slate-400 leading-none mb-1">Risk Assessment</div>
              <div className="text-[11px] font-black uppercase text-slate-900">{getHealthStatusText(vehicle.healthScore)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
