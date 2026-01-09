
import React, { useState, useEffect, useMemo } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchFuelLogs, calculateAverageEfficiency, deleteFuelLog } from '../services/fuelService.ts';
import { formatCurrency, formatDate, kmlToMpg } from '../shared/utils.ts';
import FuelEntryTerminal from './FuelEntryTerminal.tsx';
import { FuelLog } from '../shared/types.ts';
import { ENV } from '../services/envService.ts';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';

const FuelIntelligenceCenter: React.FC = () => {
  const { 
    vehicles, fuelLogs, setFuelLogs, removeFuelLogStore, 
    activeVehicleId, setActiveVehicleId 
  } = useAutoPalStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null);
  const [metric, setMetric] = useState<'KML' | 'MPG'>('KML');

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  useEffect(() => {
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
    loadLogs();
  }, [activeVehicleId, setFuelLogs]);

  const logsWithAnalytics = useMemo(() => {
    const sorted = [...fuelLogs].sort((a, b) => (b.odometerKm || 0) - (a.odometerKm || 0));
    
    return sorted.map((log, index) => {
      let tripKml: number | null = null;
      let tripDistance: number | null = null;
      const liters = log.liters || 0;
      const totalCost = log.totalCost || 0;
      const costPerLiter = liters > 0 ? totalCost / liters : 0;
      
      if (log.isFullTank && log.odometerKm) {
        const prevFullIndex = sorted.slice(index + 1).findIndex(l => l.isFullTank && l.odometerKm);
        if (prevFullIndex !== -1) {
          const actualPrevIndex = prevFullIndex + index + 1;
          const prevFull = sorted[actualPrevIndex];
          const dist = log.odometerKm - (prevFull.odometerKm || 0);
          
          if (dist > 0) {
            tripDistance = dist;
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

  const chartData = useMemo(() => {
    return [...logsWithAnalytics]
      .reverse()
      .map(log => ({
        date: new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        efficiency: log.tripKml ? (metric === 'KML' ? log.tripKml : kmlToMpg(log.tripKml)) : null,
        price: log.costPerLiter,
        vendor: log.vendor
      }));
  }, [logsWithAnalytics, metric]);

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md p-4 border border-slate-700 rounded-2xl shadow-2xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <p className="text-sm font-black text-white">
                {entry.name}: {entry.value?.toFixed(2)} 
                <span className="text-[10px] opacity-50 ml-1 font-sans font-bold">
                  {entry.name === 'Efficiency' ? metric : '₦/L'}
                </span>
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
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
          {/* Global Vehicle Switcher Pill */}
          {vehicles.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {vehicles.map(v => (
                <button 
                  key={v.id}
                  onClick={() => setActiveVehicleId(v.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${activeVehicleId === v.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  {v.model}
                </button>
              ))}
            </div>
          )}
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

          <button 
            disabled={!activeVehicle}
            onClick={() => { setEditingLog(null); setShowTerminal(true); }}
            className="bg-slate-900 text-white px-8 sm:px-12 py-5 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] shadow-3xl hover:bg-blue-600 transition-all active:scale-95 group flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <span className="text-lg sm:text-xl group-hover:rotate-90 transition-transform">⛽</span>
            Log Refill
          </button>
        </div>
      </header>

      {!activeVehicle ? (
        <div className="py-24 text-center bg-white card-radius border-2 border-slate-50 p-12">
           <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Active Telemetry Node</h3>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2">
            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between min-h-[180px] shadow-sm">
              <div className="relative z-10 space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Last Efficiency</h3>
                <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-baseline">
                  {currentEff ? currentEff.toFixed(1) : '--.-'}
                  <span className="text-xs text-slate-300 ml-2 font-sans font-bold">{metric}</span>
                </div>
              </div>
            </div>

            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between min-h-[180px] shadow-sm">
              <div className="relative z-10 space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Avg. Price / L</h3>
                <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-baseline">
                  {formatCurrency(avgPricePerLiter)}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 card-radius p-8 text-white flex flex-col justify-between min-h-[180px] relative overflow-hidden shadow-xl col-span-1 sm:col-span-2">
              <div className="relative z-10 space-y-4">
                <h3 className="text-slate-500 text-[8px] font-black uppercase tracking-[0.4em]">Fleet Average</h3>
                <div className="text-5xl font-black tracking-tighter flex items-baseline">
                  {avgEfficiency ? avgEfficiency.toFixed(1) : '--.-'}
                  <span className="text-xs text-slate-600 ml-2 font-sans font-bold">{metric}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-2">
            {logsWithAnalytics.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {logsWithAnalytics.map((log, idx) => (
                  <div key={log.id} className="bg-white border border-slate-100 p-6 sm:p-8 rounded-[2rem] hover:shadow-xl transition-all group flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between shadow-sm">
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${log.isFullTank ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-300'}`}>
                        {fuelLogs.length - idx}
                      </div>
                      <div className="space-y-1">
                        <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{formatDate(log.createdAt)}</div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tighter">{log.liters.toFixed(2)} Liters</h4>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{log.vendor || 'Station Node'}</div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => { setEditingLog(log); setShowTerminal(true); }} className="px-4 py-2 rounded-xl bg-slate-50 text-[8px] font-black uppercase text-blue-600">Edit</button>
                      <button onClick={() => handleDeleteRecord(log.id)} className="px-4 py-2 rounded-xl bg-rose-50 text-[8px] font-black uppercase text-rose-500">Purge</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-white card-radius border-2 border-dashed border-slate-100 p-12">
                 <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tighter uppercase">Fuel Ledger Empty</h3>
              </div>
            )}
          </div>
        </>
      )}

      {showTerminal && activeVehicle && (
        <FuelEntryTerminal 
          vehicleId={activeVehicle.id} 
          currentOdo={activeVehicle.mileage} 
          initialLog={editingLog || undefined} 
          onClose={() => { setShowTerminal(false); setEditingLog(null); }} 
        />
      )}
    </div>
  );
};

export default FuelIntelligenceCenter;
