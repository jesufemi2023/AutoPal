import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        setFetchError(err.message || "Connection failure: Unable to retrieve fuel records from cloud.");
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

  const totalFuelSpend = useMemo(() => {
    return fuelLogs.reduce((acc, l) => acc + (l.totalCost || 0), 0);
  }, [fuelLogs]);
  
  const handleDeleteRecord = async (logId: string) => {
    if (!window.confirm("CAUTION: Deleting this record will update your average efficiency. Proceed?")) return;
    try {
      await deleteFuelLog(logId);
      removeFuelLogStore(logId);
    } catch (err: any) {
      alert("System Error: " + (err.message || "Failed to remove record."));
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="space-y-8 sm:space-y-16 animate-slide-up pb-24 sm:pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-500 animate-spin' : (fetchError ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse')}`}></div>
            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[8px] sm:text-[9px]">
              {isLoading ? 'Updating records...' : (fetchError ? 'Sync Error' : 'Fuel Monitor Active')}
            </span>
          </div>
          <h2 className="text-5xl sm:text-8xl font-black text-slate-900 tracking-tighter leading-[0.8] transition-all">
            Fuel <br/><span className="text-blue-600">Tracker</span>
          </h2>
          {vehicles.length > 1 && (
            <div className="relative group/scroll w-full max-w-sm mt-4">
              <button 
                onClick={() => handleScroll('left')}
                className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/80 backdrop-blur-md border border-slate-100 rounded-full items-center justify-center shadow-md text-slate-900 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover/scroll:opacity-100 -ml-4"
                aria-label="Scroll Left"
              >
                ←
              </button>

              <div 
                ref={scrollContainerRef}
                className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide scrollbar-desktop-show scroll-smooth px-1"
              >
                {vehicles.map(v => (
                  <button 
                    key={v.id}
                    onClick={() => setActiveVehicleId(v.id)}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${activeVehicleId === v.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
                  >
                    {v.year} {v.make} {v.model}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => handleScroll('right')}
                className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/80 backdrop-blur-md border border-slate-100 rounded-full items-center justify-center shadow-md text-slate-900 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover/scroll:opacity-100 -mr-4"
                aria-label="Scroll Right"
              >
                →
              </button>
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
            Add Fuel Log
          </button>
        </div>
      </header>

      {!activeVehicle ? (
        <div className="py-24 text-center bg-white card-radius border-2 border-slate-50 p-12">
           <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Vehicle Selected</h3>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2">
            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between min-h-[180px] shadow-sm">
              <div className="relative z-10 space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Current Efficiency</h3>
                <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-baseline">
                  {currentEff ? currentEff.toFixed(1) : '--.-'}
                  <span className="text-xs text-slate-300 ml-2 font-sans font-bold">{metric}</span>
                </div>
              </div>
            </div>

            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between min-h-[180px] shadow-sm">
              <div className="relative z-10 space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Avg. Fuel Price</h3>
                <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-baseline">
                  {formatCurrency(avgPricePerLiter)}
                </div>
              </div>
            </div>

            <div className="bg-emerald-600 card-radius p-8 text-white flex flex-col justify-between min-h-[180px] relative overflow-hidden shadow-xl">
               <div className="relative z-10 space-y-4">
                <h3 className="text-emerald-200 text-[8px] font-black uppercase tracking-[0.4em]">Total Fuel Expense</h3>
                <div className="text-3xl font-black tracking-tighter">
                  {formatCurrency(totalFuelSpend)}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 card-radius p-8 text-white flex flex-col justify-between min-h-[180px] relative overflow-hidden shadow-xl">
              <div className="relative z-10 space-y-4">
                <h3 className="text-slate-500 text-[8px] font-black uppercase tracking-[0.4em]">Average Efficiency</h3>
                <div className="text-4xl font-black tracking-tighter flex items-baseline">
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
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{log.vendor || 'Fuel Station'}</div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => { setEditingLog(log); setShowTerminal(true); }} className="px-4 py-2 rounded-xl bg-slate-50 text-[8px] font-black uppercase text-blue-600">Edit</button>
                      <button onClick={() => handleDeleteRecord(log.id)} className="px-4 py-2 rounded-xl bg-rose-50 text-[8px] font-black uppercase text-rose-500">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-white card-radius border-2 border-dashed border-slate-100 p-12">
                 <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tighter uppercase">No fuel records yet</h3>
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Start logging your refills to track performance</p>
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