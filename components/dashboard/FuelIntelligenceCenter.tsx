import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAutoPalStore } from '../../shared/store.ts';
import { fetchFuelLogs, calculateAverageEfficiency, deleteFuelLog } from '../../services/fuelService.ts';
import { formatCurrency, formatDate, kmlToMpg, exportToCSV, triggerProfessionalPrint } from '../../shared/utils.ts';
import FuelEntryTerminal from '../FuelEntryTerminal.tsx';
import { FuelLog } from '../../shared/types.ts';
import { ENV } from '../../services/envService.ts';
import { VehicleOverview } from './VehicleOverview.tsx';

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
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  useEffect(() => {
    const loadHistoryLogs = async () => {
      if (!activeVehicleId) return;
      setIsLoading(true);
      setFetchError(null);
      try {
        const logs = await fetchFuelLogs(activeVehicleId);
        setFuelLogs(logs);
      } catch (err: any) {
        setFetchError(err.message || "Connection failure.");
      } finally {
        setIsLoading(false);
      }
    };

    loadHistoryLogs();
  }, [activeVehicleId, setFuelLogs]);

  const logsWithAnalytics = useMemo(() => {
    const sorted = [...fuelLogs].sort((a, b) => (b.odometerKm || 0) - (a.odometerKm || 0));
    return sorted.map((log, index) => {
      let tripKml: number | null = null;
      let tripDistance: number | null = null;
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
            if (totalLitersInBlock > 0) tripKml = dist / totalLitersInBlock;
          }
        }
      }
      return { ...log, tripKml, tripDistance };
    });
  }, [fuelLogs]);

  const currentEff = useMemo(() => {
    const sorted = [...logsWithAnalytics].filter(l => l.tripKml !== null);
    const val = sorted[0]?.tripKml || null;
    if (val === null) return null;
    return metric === 'KML' ? val : kmlToMpg(val);
  }, [logsWithAnalytics, metric]);

  const avgEfficiency = useMemo(() => {
    const val = calculateAverageEfficiency(fuelLogs);
    if (val === null) return null;
    return metric === 'KML' ? val : kmlToMpg(val);
  }, [fuelLogs, metric]);
  
  const totalFuelSpend = useMemo(() => fuelLogs.reduce((acc, l) => acc + (l.totalCost || 0), 0), [fuelLogs]);

  const handleExportCSV = () => {
    const data = logsWithAnalytics.map(l => ({
      Date: formatDate(l.createdAt),
      Liters: l.liters,
      Cost: l.totalCost,
      Odometer: l.odometerKm,
      Vendor: l.vendor,
      Efficiency: l.tripKml ? l.tripKml.toFixed(2) : 'N/A'
    }));
    exportToCSV(data, `Fuel_History_${activeVehicle?.model}`);
  };

  const handleExportPDF = () => {
    triggerProfessionalPrint('fuel-report-content');
  };

  const handleDeleteRecord = async (logId: string) => {
    if (!window.confirm("CAUTION: Deleting this record will update your average efficiency. Proceed?")) return;
    try {
      await deleteFuelLog(logId);
      removeFuelLogStore(logId);
    } catch (err: any) { alert("Failed to remove record."); }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-8 sm:space-y-16 animate-slide-up pb-24 sm:pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2 no-print">
        <div className="space-y-3">
          <h2 className="text-5xl sm:text-8xl font-black text-slate-900 tracking-tighter leading-[0.8]">Fuel <br/><span className="text-blue-600">Tracker</span></h2>
          
          <div className="relative group/scroll flex-grow max-w-sm mt-6">
            {vehicles.length > 1 && (
              <>
                <button 
                  onClick={() => handleScroll('left')}
                  className="flex absolute -left-2 top-1/2 -translate-y-1/2 z-[100] w-8 h-8 bg-white border border-slate-200 rounded-full items-center justify-center shadow-xl text-slate-900 transition-all hover:bg-blue-600 hover:text-white"
                >
                  ←
                </button>
                <button 
                  onClick={() => handleScroll('right')}
                  className="flex absolute -right-2 top-1/2 -translate-y-1/2 z-[100] w-8 h-8 bg-white border border-slate-200 rounded-full items-center justify-center shadow-xl text-slate-900 transition-all hover:bg-blue-600 hover:text-white"
                >
                  →
                </button>
              </>
            )}
            <div 
              ref={scrollContainerRef}
              className="flex gap-2 overflow-x-auto scrollbar-hide scrollbar-desktop-show py-1 px-4 -mx-1 flex-nowrap snap-x snap-mandatory scroll-smooth"
            >
              {vehicles.map(v => (
                <button 
                  key={v.id} 
                  onClick={() => setActiveVehicleId(v.id)} 
                  className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all whitespace-nowrap snap-center ${activeVehicleId === v.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
                >
                  {v.year} {v.make} {v.model}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex bg-white border-2 border-slate-100 p-1 rounded-2xl shadow-sm">
            {['KML', 'MPG'].map(m => (
              <button key={m} onClick={() => setMetric(m as any)} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${metric === m ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}>{m === 'KML' ? 'KM/L' : m}</button>
            ))}
          </div>
          <button disabled={!activeVehicle} onClick={() => { setEditingLog(null); setShowTerminal(true); }} className="bg-slate-900 text-white px-8 sm:px-12 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-3xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
            <span className="text-xl">⛽</span> Add Log
          </button>
        </div>
      </header>

      {!activeVehicle ? (
        <div className="py-24 text-center bg-white card-radius border-2 border-slate-50 p-12 no-print">
           <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Vehicle Selected</h3>
        </div>
      ) : (
        <>
          <VehicleOverview 
            vehicle={activeVehicle} 
            onUpdateOdometer={() => setShowTerminal(true)} 
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2 no-print">
            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Recent Performance</h3>
                <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-baseline">
                  {currentEff ? currentEff.toFixed(1) : '--.-'}
                  <span className="text-xs text-slate-300 ml-2 font-bold">{metric}</span>
                </div>
              </div>
            </div>

            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Avg Efficiency</h3>
                <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-baseline">
                  {avgEfficiency ? avgEfficiency.toFixed(1) : '--.-'}
                  <span className="text-xs text-slate-300 ml-2 font-bold">{metric}</span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-600 card-radius p-8 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
               <div className="space-y-4 relative z-10">
                <h3 className="text-emerald-200 text-[8px] font-black uppercase tracking-[0.4em]">Total Spent</h3>
                <div className="text-3xl font-black tracking-tighter">{formatCurrency(totalFuelSpend)}</div>
              </div>
            </div>

            <div className="bg-slate-900 card-radius p-8 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="space-y-4 relative z-10">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Logs Count</h3>
                <div className="text-4xl font-black text-white tracking-tighter">{fuelLogs.length}</div>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-2 no-print">
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-[4px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing...</p>
              </div>
            ) : logsWithAnalytics.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {logsWithAnalytics.map((log, idx) => (
                  <div key={log.id} className="bg-white border border-slate-100 p-6 sm:p-10 rounded-[2.5rem] hover:shadow-xl transition-all group flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-8 relative z-10">
                      <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 ${log.isFullTank ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-300 border border-slate-100'}`}>
                        <span className="text-xl">{fuelLogs.length - idx}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                           <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">{formatDate(log.createdAt)}</div>
                           {log.isFullTank && <div className="text-[7px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md">Full Refill</div>}
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{log.liters.toFixed(2)} <span className="text-sm text-slate-300">Liters</span></h4>
                        <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                           <span className="flex items-center gap-1.5"><span className="text-slate-300">At</span> {log.vendor || 'Fuel Station'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-12 w-full lg:w-auto relative z-10 border-t lg:border-t-0 pt-6 lg:pt-0">
                       <div className="space-y-1">
                          <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Spent</div>
                          <div className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(log.totalCost)}</div>
                       </div>
                       <div className="space-y-1">
                          <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Trip Efficiency</div>
                          <div className={`text-xl font-mono font-black ${log.tripKml && log.tripKml > 10 ? 'text-emerald-500' : 'text-slate-400'}`}>
                             {log.tripKml ? `${log.tripKml.toFixed(1)} ${metric}` : '---'}
                          </div>
                       </div>
                    </div>

                    <div className="flex gap-2 w-full lg:w-auto pt-4 lg:pt-0">
                      <button onClick={() => { setEditingLog(log); setShowTerminal(true); }} className="px-6 py-3 rounded-xl bg-slate-50 text-[9px] font-black uppercase text-blue-600 hover:bg-blue-600 hover:text-white transition-all">Edit</button>
                      <button onClick={() => handleDeleteRecord(log.id)} className="px-6 py-3 rounded-xl bg-rose-50 text-[9px] font-black uppercase text-rose-500 hover:bg-rose-500 hover:text-white transition-all">Delete</button>
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
        <FuelEntryTerminal vehicleId={activeVehicle.id} currentOdo={activeVehicle.mileage} initialLog={editingLog || undefined} onClose={() => { setShowTerminal(false); setEditingLog(null); }} />
      )}
    </div>
  );
};

export default FuelIntelligenceCenter;