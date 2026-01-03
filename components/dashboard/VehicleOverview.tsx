
import React from 'react';
import { Vehicle } from '../../shared/types.ts';
import { VehicleBlueprint } from '../VehicleBlueprint.tsx';
import { getHealthColor, getHealthStatusText } from '../../services/maintenanceService.ts';

interface Props {
  vehicle: Vehicle;
  onUpdateOdometer: () => void;
}

const HealthRing: React.FC<{ score: number }> = ({ score }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="relative w-full aspect-square max-w-[120px] lg:max-w-[140px] flex items-center justify-center">
      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r={radius}
          className="fill-none stroke-slate-100"
          strokeWidth="8"
        />
        <circle
          cx="50" cy="50" r={radius}
          className={`fill-none transition-all duration-1000 ease-out stroke-current ${getHealthColor(score)}`}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl lg:text-3xl font-black tracking-tighter leading-none">{score}%</span>
        <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-1">Health</span>
      </div>
    </div>
  );
};

export const VehicleOverview: React.FC<Props> = ({ vehicle, onUpdateOdometer }) => (
  <section className="bg-white card-radius p-6 lg:p-12 border border-slate-100 shadow-sm overflow-hidden animate-slide-up">
    <div className="flex flex-col md:grid md:grid-cols-12 gap-8 lg:gap-16 items-center">
      
      {/* Visual Asset Area */}
      <div className="w-full md:col-span-5 lg:col-span-6 order-2 md:order-1">
        {vehicle.imageUrls && vehicle.imageUrls.length > 0 ? (
          <div className="aspect-[16/10] w-full rounded-[2rem] lg:rounded-[3rem] overflow-hidden border border-slate-100 shadow-lg bg-slate-50">
            <img 
              src={vehicle.imageUrls[0]} 
              alt={vehicle.model}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <VehicleBlueprint type={vehicle.bodyType} className="shadow-lg" />
        )}
      </div>

      {/* Content Area */}
      <div className="w-full md:col-span-7 lg:col-span-6 order-1 md:order-2 space-y-8">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Digital Twin Active</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">
              {vehicle.year} {vehicle.model}
            </h2>
            <p className="text-slate-400 font-mono text-[9px] uppercase tracking-widest">VIN: {vehicle.vin.slice(-8)}</p>
          </div>
          <HealthRing score={vehicle.healthScore} />
        </div>
        
        <div className="grid grid-cols-2 gap-3 lg:gap-6">
          <button 
            onClick={onUpdateOdometer}
            className="bg-slate-50 rounded-2xl lg:rounded-3xl p-5 lg:p-8 text-left hover:bg-white hover:ring-2 hover:ring-blue-100 transition-all border border-slate-100"
          >
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Odometer</div>
            <div className="text-xl lg:text-2xl font-black text-slate-900 leading-none">{vehicle.mileage.toLocaleString()}</div>
            <div className="text-[8px] font-black text-blue-600 uppercase mt-2 tracking-widest">Update →</div>
          </button>
          
          <div className="bg-slate-900 text-white rounded-2xl lg:rounded-3xl p-5 lg:p-8">
            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</div>
            <div className="text-lg lg:text-xl font-black tracking-tight leading-none truncate">{getHealthStatusText(vehicle.healthScore)}</div>
            <div className="flex items-center gap-1.5 mt-2">
               <div className={`w-1.5 h-1.5 rounded-full ${vehicle.healthScore > 80 ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
               <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Real-time Intel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
