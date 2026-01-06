
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchFuelLogs, calculateLastEfficiency, calculateAverageEfficiency } from '../services/fuelService.ts';
import { formatCurrency, formatDate } from '../shared/utils.ts';
import FuelEntryTerminal from './FuelEntryTerminal.tsx';

const FuelIntelligenceCenter: React.FC = () => {
  const { vehicles, fuelLogs, setFuelLogs, setCurrentView } = useAutoPalStore();
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(vehicles[0]?.id || null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  useEffect(() => {
    if (activeVehicleId) {
      setIsLoading(true);
      fetchFuelLogs(activeVehicleId)
        .then(setFuelLogs)
        .finally(() => setIsLoading(false));
    }
  }, [activeVehicleId, setFuelLogs]);

  const lastEfficiency = calculateLastEfficiency(fuelLogs);
  const avgEfficiency = calculateAverageEfficiency(fuelLogs);

  return (
    <div className="space-y-12 animate-slide-up">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 px-2">
        <div className="space-y-2">
          <h2 className="text-4xl sm:text-7xl font-black text-slate-900 tracking-tighter leading-none">Fuel Logic</h2>
          <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] ml-2">Efficiency Analysis Engine</p>
        </div>
        <button 
          onClick={() => setShowTerminal(true)}
          className="bg-slate-900 text-white px-10 py-6 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-3xl hover:bg-blue-600 transition-all active:scale-95"
        >
          + Log Refill
        </button>
      </header>

      {/* Asset Switcher */}
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4">
        {vehicles.map(v => (
          <button 
            key={v.id}
            onClick={() => setActiveVehicleId(v.id)}
            className={`flex-shrink-0 px-8 py-4 rounded-2xl border-2 font-black uppercase tracking-widest text-[9px] transition-all ${activeVehicleId === v.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
          >
            {v.make} {v.model}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Analytics Wing */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white card-radius border border-slate-100 p-10 flex flex-col justify-between h-64 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 text-slate-50/50 font-black text-8xl pointer-events-none group-hover:text-blue-50/50 transition-colors">KM</div>
            <div className="relative z-10">
              <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Last Measured Efficiency</h3>
              <div className="text-6xl font-black text-slate-900 tracking-tighter">
                {lastEfficiency ? lastEfficiency.toFixed(1) : '--.-'}
                <span className="text-xl text-slate-300 ml-2">KM/L</span>
              </div>
            </div>
            <div className="flex items-center gap-3 relative z-10">
               <div className={`w-2 h-2 rounded-full ${lastEfficiency && lastEfficiency > 10 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                 {lastEfficiency ? (lastEfficiency > 10 ? 'OPTIMAL' : 'BELOW BASELINE') : 'AWAITING DATA'}
               </span>
            </div>
          </div>

          <div className="bg-slate-900 card-radius p-10 h-64 text-white flex flex-col justify-between">
            <div>
              <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Network Average</h3>
              <div className="text-5xl font-black tracking-tighter">
                {avgEfficiency ? avgEfficiency.toFixed(1) : '--.-'}
                <span className="text-lg text-slate-600 ml-2">KM/L</span>
              </div>
            </div>
            <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
              Based on historical telemetry across {fuelLogs.length} verified logs for this asset.
            </p>
          </div>
        </aside>

        {/* History Wing */}
        <main className="lg:col-span-8 bg-white card-radius border border-slate-100 overflow-hidden">
          <header className="px-10 py-8 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black uppercase tracking-widest text-xs">Immutable Record Stream</h3>
            <span className="text-[9px] font-black text-slate-400">{fuelLogs.length} Records Detected</span>
          </header>

          <div className="divide-y divide-slate-50">
            {fuelLogs.length > 0 ? fuelLogs.map((log, idx) => (
              <div key={log.id} className="p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-xl">
                    {fuelLogs.length - idx}
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{formatDate(log.createdAt)}</div>
                    <div className="text-xl font-black text-slate-900 tracking-tight">{log.liters.toFixed(2)} Liters</div>
                    <div className="text-[10px] font-bold text-slate-400">{log.vendor || 'Independent Station'}</div>
                  </div>
                </div>

                <div className="flex gap-10 items-center justify-between sm:justify-end">
                  <div className="text-right">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Odometer</div>
                    <div className="font-mono font-black text-slate-900">{log.odometerKm.toLocaleString()} KM</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Investment</div>
                    <div className="font-black text-slate-900">{formatCurrency(log.totalCost)}</div>
                  </div>
                  {log.isFullTank && (
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black border border-blue-100">F</div>
                  )}
                </div>
              </div>
            )) : (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200 text-3xl">📭</div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">No telemetry recorded yet.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {showTerminal && activeVehicle && (
        <FuelEntryTerminal 
          vehicleId={activeVehicle.id} 
          currentOdo={activeVehicle.mileage} 
          onClose={() => setShowTerminal(false)} 
        />
      )}
    </div>
  );
};

export default FuelIntelligenceCenter;
