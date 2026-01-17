import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAutoPalStore } from '../../shared/store.ts';
import { fetchFuelLogs, calculateAverageEfficiency, deleteFuelLog } from '../../services/fuelService.ts';
import { formatCurrency, formatDate, kmlToMpg, exportToCSV, triggerProfessionalPrint } from '../../shared/utils.ts';
import FuelEntryTerminal from '../FuelEntryTerminal.tsx';
import { FuelLog } from '../../shared/types.ts';
import { ENV } from '../../services/envService.ts';

const FuelIntelligenceCenter: React.FC = () => {
  const { 
    vehicles, fuelLogs, setFuelLogs, removeFuelLogStore, 
    activeVehicleId, setActiveVehicleId 
  } = useAutoPalStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasRequestedHistory, setHasRequestedHistory] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null);
  const [metric, setMetric] = useState<'KML' | 'MPG'>('KML');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  // Stats are always loaded for the dashboard counters
  useEffect(() => {
    const loadLogs = async () => {
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
            if (totalLitersInBlock > 0) tripKml = dist / totalLitersInBlock;
          }
        }
      }
      return { ...log, tripKml, costPerLiter, tripDistance };
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
  
  const avgPricePerLiter = useMemo(() => {
    const validLogs = fuelLogs.filter(l => l.liters > 0 && l.totalCost > 0);
    if (validLogs.length === 0) return 0;
    return validLogs.reduce((acc, l) => acc + (l.totalCost / l.liters), 0) / validLogs.length;
  }, [fuelLogs]);

  const totalFuelSpend = useMemo(() => fuelLogs.reduce((acc, l) => acc + (l.totalCost || 0), 0), [fuelLogs]);
  
  const handleExportCSV = () => {
    const exportData = logsWithAnalytics.map(l => ({
      Date: formatDate(l.createdAt),
      Liters: `${l.liters} L`,
      Cost: formatCurrency(l.totalCost),
      Odometer: `${l.odometerKm} KM`,
      Vendor: l.vendor || 'N/A',
      FullTank: l.isFullTank ? 'Yes' : 'No',
      Efficiency: l.tripKml ? `${l.tripKml.toFixed(2)} KM/L` : 'Calculating...'
    }));
    exportToCSV(exportData, `Fuel_Tracker_${activeVehicle?.make}_${activeVehicle?.model}`);
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
      scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  const InfoIcon = ({ id, text }: { id: string, text: string }) => (
    <div className="relative inline-block ml-1">
      <button 
        onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === id ? null : id); }}
        className="text-slate-400 hover:text-blue-500 transition-colors"
      >
        ℹ️
      </button>
      {activeTooltip === id && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveTooltip(null)}
        >
          <div 
            className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-3xl max-w-sm w-full border border-white/10 animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 text-2xl mx-auto mb-6">ℹ️</div>
            <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Refill Intelligence</h4>
            <p className="text-xs font-bold uppercase tracking-widest leading-relaxed text-slate-200 mb-8">
              {text}
            </p>
            <button 
              onClick={() => setActiveTooltip(null)}
              className="w-full py-4 bg-white/5 hover:bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
            >
              Acknowledged
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 sm:space-y-16 animate-slide-up pb-24 sm:pb-32">
       {/* Hidden Print Content */}
       <div id="fuel-report-content" className="hidden">
        <div className="flex justify-between items-center border-b-4 border-emerald-600 pb-8 mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">AutoPal NG</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Official Fuel Efficiency Report</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black">{activeVehicle?.make} {activeVehicle?.model}</h2>
            <p className="text-xs font-mono">{activeVehicle?.vin}</p>
            <p className="text-xs text-slate-400">Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-3 text-[10px] font-black uppercase border-b">Date</th>
              <th className="p-3 text-[10px] font-black uppercase border-b">Vendor</th>
              <th className="p-3 text-[10px] font-black uppercase border-b text-right">Liters</th>
              <th className="p-3 text-[10px] font-black uppercase border-b text-right">Cost</th>
              <th className="p-3 text-[10px] font-black uppercase border-b text-right">Trip Eff.</th>
            </tr>
          </thead>
          <tbody>
            {logsWithAnalytics.map((log, i) => (
              <tr key={log.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="p-3 text-xs border-b">{formatDate(log.createdAt)}</td>
                <td className="p-3 text-xs font-bold border-b">{log.vendor || 'N/A'}</td>
                <td className="p-3 text-xs border-b text-right">{log.liters.toFixed(2)} L</td>
                <td className="p-3 text-xs font-bold border-b text-right">{formatCurrency(log.totalCost)}</td>
                <td className="p-3 text-xs font-mono border-b text-right">{log.tripKml ? `${log.tripKml.toFixed(1)} KM/L` : '---'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center">
           <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Validated by AutoPal Energy Analytics</div>
           <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400">Total Fuel Expenditure</p>
              <p className="text-2xl font-black">{formatCurrency(totalFuelSpend)}</p>
           </div>
        </div>
      </div>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-500 animate-spin' : (fetchError ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse')}`}></div>
            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[8px] sm:text-[9px]">
              {isLoading ? 'Updating records...' : (fetchError ? 'Sync Error' : 'Fuel Monitor Active')}
            </span>
          </div>
          <h2 className="text-5xl sm:text-8xl font-black text-slate-900 tracking-tighter leading-[0.8]">
            Fuel <br/><span className="text-blue-600">Tracker</span>
          </h2>
          <div className="flex gap-2 mt-4">
             <button onClick={handleExportCSV} className="px-4 py-2 bg-white border border-slate-100 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
               <span>📊</span> Excel Export
             </button>
             <button onClick={handleExportPDF} className="px-4 py-2 bg-white border border-slate-100 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
               <span>📄</span> Professional PDF
             </button>
          </div>
          {vehicles.length > 1 && (
            <div className="relative group/scroll w-full max-w-sm mt-4">
              <button onClick={() => handleScroll('left')} className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/80 backdrop-blur-md border border-slate-100 rounded-full items-center justify-center shadow-md text-slate-900 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover/scroll:opacity-100 -ml-4">←</button>
              <div ref={scrollContainerRef} className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide scrollbar-desktop-show scroll-smooth px-1">
                {vehicles.map(v => (
                  <button key={v.id} onClick={() => setActiveVehicleId(v.id)} className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${activeVehicleId === v.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}>
                    {v.year} {v.make} {v.model}
                  </button>
                ))}
              </div>
              <button onClick={() => handleScroll('right')} className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/80 backdrop-blur-md border border-slate-100 rounded-full items-center justify-center shadow-md text-slate-900 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover/scroll:opacity-100 -mr-4">→</button>
            </div>
          )}
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
        <div className="py-24 text-center bg-white card-radius border-2 border-slate-50 p-12">
           <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Vehicle Selected</h3>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2">
            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em] flex items-center">
                  Recent Performance
                  <InfoIcon id="recEff" text="Calculated efficiency from your last full tank refill." />
                </h3>
                <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-baseline">
                  {currentEff ? currentEff.toFixed(1) : '--.-'}
                  <span className="text-xs text-slate-300 ml-2 font-bold">{metric}</span>
                </div>
              </div>
            </div>

            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em] flex items-center">
                  Avg Price/Liter
                  <InfoIcon id="avgPrice" text="Average amount spent per liter across all your fuel logs." />
                </h3>
                <div className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(avgPricePerLiter)}</div>
              </div>
            </div>

            <div className="bg-emerald-600 card-radius p-8 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
               <div className="space-y-4 relative z-10">
                <h3 className="text-emerald-200 text-[8px] font-black uppercase tracking-[0.4em] flex items-center">
                  Total Spent
                  <InfoIcon id="totalSpent" text="Cumulative investment in fuel for this vehicle." />
                </h3>
                <div className="text-3xl font-black tracking-tighter">{formatCurrency(totalFuelSpend)}</div>
              </div>
            </div>

            <div className="bg-slate-900 card-radius p-8 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="space-y-4 relative z-10">
                <h3 className="text-slate-500 text-[8px] font-black uppercase tracking-[0.4em] flex items-center">
                  Overall Efficiency
                  <InfoIcon id="avgEff" text="Historical average performance over the life of your logs." />
                </h3>
                <div className="text-4xl font-black tracking-tighter flex items-baseline">
                  {avgEfficiency ? avgEfficiency.toFixed(1) : '--.-'}
                  <span className="text-xs text-slate-600 ml-2 font-bold">{metric}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-2">
            {!hasRequestedHistory ? (
              <div className="py-24 text-center bg-white card-radius border-2 border-slate-50 p-12 flex flex-col items-center gap-6">
                 <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl">🗓️</div>
                 <div>
                   <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tighter uppercase">History Standby</h3>
                   <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest max-w-xs mx-auto">Historical records are not pre-loaded to optimize performance. Call history when needed.</p>
                 </div>
                 <button 
                  onClick={() => setHasRequestedHistory(true)}
                  className="bg-slate-900 text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-blue-600 transition-all"
                 >
                   Retrieve Historical Data
                 </button>
              </div>
            ) : logsWithAnalytics.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {logsWithAnalytics.map((log, idx) => (
                  <div key={log.id} className="bg-white border border-slate-100 p-6 sm:p-10 rounded-[2.5rem] hover:shadow-xl transition-all group flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-8 relative z-10">
                      <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 ${log.isFullTank ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-300 border border-slate-100'}`}>
                        <span className="text-[10px] opacity-60 mb-1">#</span>
                        <span className="text-xl">{fuelLogs.length - idx}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                           <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">{formatDate(log.createdAt)}</div>
                           {log.isFullTank && <div className="text-[7px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Full Refill</div>}
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{log.liters.toFixed(2)} <span className="text-sm text-slate-300">Liters</span></h4>
                        <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                           <span className="flex items-center gap-1.5"><span className="text-slate-300">At</span> {log.vendor || 'Fuel Station'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-12 w-full lg:w-auto relative z-10 border-t lg:border-t-0 pt-6 lg:pt-0">
                       <div className="space-y-1">
                          <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                            Spent
                            <InfoIcon id={`spent-${log.id}`} text="Total cost for this refill entry." />
                          </div>
                          <div className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(log.totalCost)}</div>
                       </div>
                       <div className="space-y-1">
                          <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                            Trip Efficiency
                            <InfoIcon id={`tripEff-${log.id}`} text="Efficiency calculated for this specific fuel interval." />
                          </div>
                          <div className={`text-xl font-mono font-black ${log.tripKml && log.tripKml > 10 ? 'text-emerald-500' : 'text-slate-400'}`}>
                             {log.tripKml ? `${log.tripKml.toFixed(1)} ${metric}` : '---'}
                          </div>
                       </div>
                       <div className="space-y-1">
                          <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                            Distance Covered
                            <InfoIcon id={`tripDist-${log.id}`} text="Distance driven since the previous refill." />
                          </div>
                          <div className="text-xl font-mono font-black text-blue-600">{log.tripDistance ? `${log.tripDistance} KM` : '---'}</div>
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