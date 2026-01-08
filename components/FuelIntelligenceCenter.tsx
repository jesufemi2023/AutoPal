import React, { useState, useEffect, useMemo } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchFuelLogs, calculateAverageEfficiency, deleteFuelLog } from '../services/fuelService.ts';
import { formatCurrency, formatDate, kmlToMpg } from '../shared/utils.ts';
import FuelEntryTerminal from './FuelEntryTerminal.tsx';
import { FuelLog } from '../shared/types.ts';

/**
 * Fuel Intelligence Center
 * Immersive dashboard for fuel efficiency tracking and cost analysis.
 */
const FuelIntelligenceCenter: React.FC = () => {
  const { vehicles, fuelLogs, setFuelLogs, removeFuelLogStore } = useAutoPalStore();
  
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null);
  const [metric, setMetric] = useState<'KML' | 'MPG'>('KML');

  useEffect(() => {
    if (vehicles.length > 0 && !activeVehicleId) {
      setActiveVehicleId(vehicles[0].id);
    }
  }, [vehicles, activeVehicleId]);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  const loadLogs = async () => {
    if (!activeVehicleId) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const logs = await fetchFuelLogs(activeVehicleId);
      setFuelLogs(logs);
    } catch (err: any) {
      console.error("Telemetry fetch failure", err);
      setFetchError(err.message || "Synchronization failure: Unable to retrieve fuel ledger from cloud.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [activeVehicleId, setFuelLogs]);

  const logsWithAnalytics = useMemo(() => {
    // Robust sorting: newest first by odometer
    const sorted = [...fuelLogs].sort((a, b) => (b.odometerKm || 0) - (a.odometerKm || 0));
    
    return sorted.map((log, index) => {
      let tripKml: number | null = null;
      let tripDistance: number | null = null;
      const liters = log.liters || 0;
      const totalCost = log.totalCost || 0;
      const costPerLiter = liters > 0 ? totalCost / liters : 0;
      
      if (log.isFullTank && log.odometerKm) {
        // Find the previous full tank log in the sorted list (which is chronologically earlier)
        const prevFullIndex = sorted.slice(index + 1).findIndex(l => l.isFullTank && l.odometerKm);
        if (prevFullIndex !== -1) {
          const actualPrevIndex = prevFullIndex + index + 1;
          const prevFull = sorted[actualPrevIndex];
          const dist = log.odometerKm - (prevFull.odometerKm || 0);
          
          // Only calculate if odometer reading makes sense (increased)
          if (dist > 0) {
            tripDistance = dist;
            // Sum all liters added between these two full tanks (inclusive of current fill)
            const blockLogs = sorted.slice(index, actualPrevIndex);
            const totalLitersInBlock = blockLogs.reduce((acc, l) => acc + (l.liters || 0), 0);
            
            if (totalLitersInBlock > 0) {
              tripKml = dist / totalLitersInBlock;
            }
          }
        }
      }
      return { ...log, tripKml, costPerLiter, tripDistance };
    });
  }, [fuelLogs]);

  const efficienciesKml = useMemo(() => 
    logsWithAnalytics
      .filter(l => l.tripKml !== null && !isNaN(l.tripKml) && isFinite(l.tripKml))
      .map(l => l.tripKml as number),
    [logsWithAnalytics]
  );

  const currentEff = useMemo(() => {
    const val = efficienciesKml[0] || null;
    if (val === null) return null;
    return metric === 'KML' ? val : kmlToMpg(val);
  }, [efficienciesKml, metric]);

  const previousEff = useMemo(() => {
    const val = efficienciesKml[1] || null;
    if (val === null) return null;
    return metric === 'KML' ? val : kmlToMpg(val);
  }, [efficienciesKml, metric]);

  const avgEfficiency = useMemo(() => {
    const val = calculateAverageEfficiency(fuelLogs);
    if (val === null) return null;
    return metric === 'KML' ? val : kmlToMpg(val);
  }, [fuelLogs, metric]);
  
  const avgPricePerLiter = useMemo(() => {
    const validLogs = fuelLogs.filter(l => l.liters > 0 && l.totalCost > 0);
    if (validLogs.length === 0) return 0;
    return validLogs.reduce((acc, l) => acc + (l.totalCost / l.liters), 0) / validLogs.length;
  }, [fuelLogs]);
  
  const efficiencyDelta = useMemo(() => {
    const cur = efficienciesKml[0] || null;
    const prev = efficienciesKml[1] || null;
    if (cur === null || prev === null || prev === 0) return null;
    return ((cur - prev) / prev) * 100;
  }, [efficienciesKml]);

  const handleDeleteRecord = async (logId: string) => {
    if (!window.confirm("CAUTION: Purging this record will permanently alter efficiency telemetry. Proceed?")) return;
    try {
      await deleteFuelLog(logId);
      removeFuelLogStore(logId);
    } catch (err: any) {
      alert("System Error: " + (err.message || "Failed to purge record."));
    }
  };

  return (
    <div className="space-y-8 sm:space-y-16 animate-slide-up pb-24 sm:pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-500 animate-spin' : (fetchError ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse')}`}></div>
            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[8px] sm:text-[9px]">
              {isLoading ? 'Synchronizing Sensors...' : (fetchError ? 'Telemetry Node Fault' : 'Neural Telemetry Active')}
            </span>
          </div>
          <h2 className="text-5xl sm:text-8xl font-black text-slate-900 tracking-tighter leading-[0.8] transition-all">
            Fuel <br/><span className="text-blue-600">Logic</span>
          </h2>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex bg-white border-2 border-slate-100 p-1 rounded-2xl shadow-sm">
            <button 
              onClick={() => setMetric('KML')} 
              className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${metric === 'KML' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
            >
              KM/L
            </button>
            <button 
              onClick={() => setMetric('MPG')} 
              className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${metric === 'MPG' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
            >
              MPG
            </button>
          </div>

          {vehicles.length > 1 && (
            <select 
              className="bg-white border-2 border-slate-100 px-6 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] outline-none focus:border-blue-600 transition-all shadow-sm"
              value={activeVehicleId || ''}
              onChange={(e) => setActiveVehicleId(e.target.value)}
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
              ))}
            </select>
          )}

          <button 
            onClick={() => { setEditingLog(null); setShowTerminal(true); }}
            className="bg-slate-900 text-white px-8 sm:px-12 py-5 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] shadow-3xl hover:bg-blue-600 transition-all active:scale-95 group flex items-center justify-center gap-3"
          >
            <span className="text-lg sm:text-xl group-hover:rotate-90 transition-transform">⛽</span>
            Log Refill
          </button>
        </div>
      </header>

      {fetchError && (
        <div className="bg-rose-50 border-2 border-rose-100 p-6 sm:p-10 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-6 mx-2 animate-slide-up">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-xl">⚠️</div>
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-black text-rose-600 uppercase tracking-widest">Logic Interface Offline</h4>
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-relaxed">{fetchError}</p>
            </div>
          </div>
          <button 
            onClick={loadLogs}
            className="w-full sm:w-auto bg-rose-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
          >
            Retry Synchronization
          </button>
        </div>
      )}

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between min-h-[180px] relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 text-blue-500/5 font-black text-6xl pointer-events-none select-none uppercase">Now</div>
          <div className="relative z-10 space-y-4">
            <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Last Efficiency</h3>
            <div className="space-y-2">
              <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-baseline">
                {currentEff ? currentEff.toFixed(1) : '--.-'}
                <span className="text-xs text-slate-300 ml-2 font-sans font-bold">{metric}</span>
              </div>
              {efficiencyDelta !== null && (
                <div className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${efficiencyDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {efficiencyDelta >= 0 ? '▲' : '▼'} {Math.abs(efficiencyDelta).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between min-h-[180px] relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 text-slate-200/40 font-black text-6xl pointer-events-none select-none uppercase">Prev</div>
          <div className="relative z-10 space-y-4">
            <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Previous Run</h3>
            <div className="text-4xl font-black text-slate-500 tracking-tighter flex items-baseline">
              {previousEff ? previousEff.toFixed(1) : '--.-'}
              <span className="text-xs text-slate-200 ml-2 font-sans font-bold">{metric}</span>
            </div>
            <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
              {previousEff ? "Calibrated" : "Waiting for Anchor"}
            </div>
          </div>
        </div>

        <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between min-h-[180px] relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 text-emerald-500/5 font-black text-6xl pointer-events-none select-none uppercase">Price</div>
          <div className="relative z-10 space-y-4">
            <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Avg. Price / L</h3>
            <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-baseline">
              {formatCurrency(avgPricePerLiter)}
            </div>
            <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Market Telemetry</div>
          </div>
        </div>

        <div className="bg-slate-900 card-radius p-8 text-white flex flex-col justify-between min-h-[180px] relative overflow-hidden group shadow-xl">
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 space-y-4">
            <h3 className="text-slate-500 text-[8px] font-black uppercase tracking-[0.4em]">Fleet Average</h3>
            <div className="text-4xl font-black tracking-tighter flex items-baseline">
              {avgEfficiency ? avgEfficiency.toFixed(1) : '--.-'}
              <span className="text-xs text-slate-600 ml-2 font-sans font-bold">{metric}</span>
            </div>
            <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Lifetime Precision</div>
          </div>
        </div>
      </div>

      {/* RECORD STREAM */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-900">Immutable Record Stream</h3>
          </div>
        </div>

        {logsWithAnalytics.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {logsWithAnalytics.map((log, idx) => (
              <div key={log.id} className="bg-white border border-slate-100 p-6 sm:p-8 rounded-[2rem] hover:shadow-xl transition-all group flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between relative shadow-sm overflow-hidden">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none select-none text-[8px] font-black uppercase tracking-[0.8em] rotate-90 origin-right whitespace-nowrap">
                  AUTOPAL_LEDGER_NODE_{log.id.slice(0, 8)}
                </div>

                <div className="flex items-center gap-6 w-full lg:w-auto relative z-10">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white font-black transition-colors duration-500 ${log.isFullTank ? 'bg-slate-900 group-hover:bg-blue-600' : 'bg-slate-100 group-hover:bg-slate-200 !text-slate-400'}`}>
                      <span className="text-[7px] opacity-40 uppercase tracking-widest mb-0.5 font-sans">Node</span>
                      <span className="text-lg leading-none">{fuelLogs.length - idx}</span>
                    </div>
                    {log.isFullTank && (
                      <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white border-2 border-white flex items-center justify-center text-[8px] font-black shadow-lg">F</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                      {formatDate(log.createdAt)}
                    </div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tighter leading-none">
                      {log.liters.toFixed(2)} <span className="text-[10px] text-slate-300 font-sans font-bold">Liters</span>
                    </h4>
                    {log.tripDistance && (
                      <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                        +{log.tripDistance.toLocaleString()} KM block
                      </div>
                    )}
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{log.vendor || 'Station Node'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-y-6 gap-x-8 w-full lg:w-auto pt-6 lg:pt-0 border-t lg:border-t-0 border-slate-50 relative z-10">
                  <div className="space-y-1">
                    <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Efficiency</div>
                    {log.tripKml ? (
                      <div className="text-lg font-black text-emerald-600 tracking-tighter leading-none">
                        {(metric === 'KML' ? log.tripKml : kmlToMpg(log.tripKml))?.toFixed(1)} <span className="text-[8px] opacity-60">{metric}</span>
                      </div>
                    ) : (
                      <div className={`text-[10px] font-black tracking-widest leading-none py-1.5 ${log.isFullTank ? 'text-slate-200 italic' : 'text-blue-400 animate-pulse'}`}>
                        {log.isFullTank ? 'ANCHOR' : 'ACCUMULATING...'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Price / L</div>
                    <div className="text-lg font-black text-slate-900 tracking-tighter leading-none">{formatCurrency(log.costPerLiter)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Investment</div>
                    <div className="text-lg font-black text-slate-900 tracking-tighter leading-none">{formatCurrency(log.totalCost)}</div>
                  </div>
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2 lg:gap-3">
                     <button onClick={() => { setEditingLog(log); setShowTerminal(true); }} className="flex-1 lg:flex-none px-4 py-2 rounded-xl bg-slate-50 text-[8px] font-black uppercase text-blue-600 hover:bg-blue-600 hover:text-white transition-all tracking-widest border border-slate-100 shadow-sm">Correct</button>
                     <button onClick={() => handleDeleteRecord(log.id)} className="flex-1 lg:flex-none px-4 py-2 rounded-xl bg-rose-50 text-[8px] font-black uppercase text-rose-500 hover:bg-rose-600 hover:text-white transition-all tracking-widest border border-rose-100 shadow-sm">Purge</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !isLoading && !fetchError && (
            <div className="py-24 text-center bg-white card-radius border-4 border-dashed border-slate-100 p-12">
               <div className="w-24 h-24 bg-slate-50 rounded-[3rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner grayscale">⛽</div>
               <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tighter uppercase">Fuel Ledger Empty</h3>
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">No fuel records detected for this vehicle.</p>
               <button 
                onClick={() => { setEditingLog(null); setShowTerminal(true); }}
                className="mt-10 bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-blue-600 transition-all"
               >
                 Initialize First Entry
               </button>
            </div>
          )
        )}
      </div>

      {showTerminal && activeVehicle && (
        <FuelEntryTerminal vehicleId={activeVehicle.id} currentOdo={activeVehicle.mileage} initialLog={editingLog || undefined} onClose={() => { setShowTerminal(false); setEditingLog(null); }} />
      )}
    </div>
  );
};

export default FuelIntelligenceCenter;