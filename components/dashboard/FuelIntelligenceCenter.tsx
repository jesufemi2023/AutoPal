import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAutoPalStore } from '../../shared/store.ts';
import { fetchFuelLogs, calculateAverageEfficiency, deleteFuelLog } from '../../services/fuelService.ts';
import { formatCurrency, formatDate, kmlToMpg, exportToCSV, triggerProfessionalPrint } from '../../shared/utils.ts';
import FuelEntryTerminal from '../FuelEntryTerminal.tsx';
import { FuelLog } from '../../shared/types.ts';
import { ENV } from '../../services/envService.ts';
import { TierGuard } from '../TierGuard.tsx';
import { QuotaIndicator } from '../QuotaIndicator.tsx';

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
  
  const avgPricePerLiter = useMemo(() => {
    const validLogs = fuelLogs.filter(l => l.liters > 0 && l.totalCost > 0);
    if (validLogs.length === 0) return 0;
    return validLogs.reduce((acc, l) => acc + (l.totalCost / l.liters), 0) / validLogs.length;
  }, [fuelLogs]);

  const totalFuelSpend = useMemo(() => fuelLogs.reduce((acc, l) => acc + (l.totalCost || 0), 0), [fuelLogs]);
  
  const handleExportCSV = () => {
    const exportData = logsWithAnalytics.map(l => ({
      Date: formatDate(l.createdAt),
      Liters: `${l.liters.toFixed(2)} L`,
      Cost: formatCurrency(l.totalCost),
      Odometer: `${l.odometerKm} KM`,
      Vendor: l.vendor || 'N/A',
      Efficiency: l.tripKml ? `${l.tripKml.toFixed(2)} KM/L` : '---'
    }));
    exportToCSV(exportData, `AutoPal_FuelHistory_${activeVehicle?.make}_${activeVehicle?.model}`);
  };

  const handleExportPDF = () => {
    triggerProfessionalPrint('fuel-report-content');
  };

  const handleDeleteRecord = async (logId: string) => {
    if (!window.confirm("Delete this refill log? History will update instantly.")) return;
    try {
      await deleteFuelLog(logId);
      removeFuelLogStore(logId);
    } catch (err: any) { alert("Action failed."); }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-8 sm:space-y-16 animate-slide-up pb-24 sm:pb-32">
      {/* Hidden PDF Template */}
      <div id="fuel-report-content" className="hidden" style={{ width: '100%' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            #fuel-report-content { display: block !important; }
            .no-print { display: none !important; }
            body { background: white !important; }
            table { -webkit-print-color-adjust: exact; }
          }
        `}} />
        <div className="p-12" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <div className="flex justify-between items-center border-b-4 border-emerald-600 pb-10 mb-10">
            <div className="space-y-1">
              <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">AutoPal NG</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Energy & metabolic Telemetry Audit</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black text-slate-900">{activeVehicle?.year} {activeVehicle?.make} {activeVehicle?.model}</h2>
              <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">VIN: {activeVehicle?.vin || 'UNAVAILABLE'}</p>
            </div>
          </div>
          
          <table className="w-full text-left border-collapse border-spacing-0 mb-12">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Date</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Vendor</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Liters</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Trip Eff.</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logsWithAnalytics.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="p-4 text-[10px] font-bold text-slate-500">{formatDate(log.createdAt)}</td>
                  <td className="p-4 text-[11px] font-black text-slate-900 uppercase tracking-tight">{log.vendor || 'Station'}</td>
                  <td className="p-4 text-[11px] font-mono text-slate-600 text-right">{log.liters.toFixed(2)} L</td>
                  <td className="p-4 text-[11px] font-mono font-black text-emerald-600 text-right">{log.tripKml ? `${log.tripKml.toFixed(1)} KML` : '---'}</td>
                  <td className="p-4 text-[11px] font-black text-slate-900 text-right">{formatCurrency(log.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-20 pt-10 border-t-2 border-slate-100 text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Lifetime Energy Investment</p>
              <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalFuelSpend)}</p>
          </div>
        </div>
      </div>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2 no-print">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-500 animate-spin' : (fetchError ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse')}`}></div>
            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[8px] sm:text-[9px]">{isLoading ? 'Syncing...' : (fetchError ? 'Sync Error' : 'Metabolic Link Active')}</span>
            <QuotaIndicator capability="FUEL_LOGS_MONTHLY" label="Refills This Month" />
          </div>
          <h2 className="text-5xl sm:text-8xl font-black text-slate-900 tracking-tighter leading-[0.8]">Fuel <br/><span className="text-blue-600">Tracker</span></h2>
          
          <div className="flex gap-3 pt-6">
             <TierGuard capability="EXPORT_EXCEL">
               <button onClick={handleExportCSV} className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-3">
                 <span className="text-base">📊</span> Export Excel
               </button>
             </TierGuard>
             <TierGuard capability="EXPORT_PDF">
               <button onClick={handleExportPDF} className="bg-blue-50 text-blue-600 border border-blue-100 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-blue-600 hover:text-white transition-all flex items-center gap-3">
                 <span className="text-base">📄</span> Performance PDF
               </button>
             </TierGuard>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex bg-white border-2 border-slate-100 p-1 rounded-2xl shadow-sm">
            {['KML', 'MPG'].map(m => (
              <button key={m} onClick={() => setMetric(m as any)} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${metric === m ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}>{m === 'KML' ? 'KM/L' : m}</button>
            ))}
          </div>
          <TierGuard capability="FUEL_LOGS_MONTHLY">
            <button disabled={!activeVehicle} onClick={() => { setEditingLog(null); setShowTerminal(true); }} className="bg-slate-900 text-white px-8 sm:px-12 py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-4xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4">
              <span className="text-2xl">⛽</span> Log Refill
            </button>
          </TierGuard>
        </div>
      </header>

      {!activeVehicle ? (
        <div className="py-24 text-center bg-white card-radius border-2 border-slate-50 p-12 no-print">
           <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Asset Linked</h3>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2 no-print">
            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Current Performance</h3>
                <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-baseline">{currentEff ? currentEff.toFixed(1) : '--.-'}<span className="text-xs text-slate-300 ml-2 font-bold">{metric}</span></div>
              </div>
            </div>
            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Market Price Avg</h3>
                <div className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(avgPricePerLiter)}</div>
              </div>
            </div>
            <div className="bg-emerald-600 card-radius p-8 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
                <h3 className="text-emerald-200 text-[8px] font-black uppercase tracking-[0.4em]">Total Spent</h3>
                <div className="text-3xl font-black tracking-tighter">{formatCurrency(totalFuelSpend)}</div>
            </div>
            <div className="bg-slate-900 card-radius p-8 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Life-to-Date Efficiency</h3>
                <div className="text-4xl font-black text-white tracking-tighter flex items-baseline">{avgEfficiency ? avgEfficiency.toFixed(1) : '--.-'}<span className="text-xs text-slate-500 ml-2 font-bold">{metric}</span></div>
            </div>
          </div>

          <div className="space-y-6 px-2 no-print">
            {isLoading ? (
               <div className="py-24 flex flex-col items-center justify-center space-y-4">
                 <div className="w-12 h-12 border-[4px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing Telemetry...</p>
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
                           {log.isFullTank && <div className="text-[7px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Full Tank</div>}
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{log.liters.toFixed(2)} <span className="text-sm text-slate-300">Liters</span></h4>
                        <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                           <span className="flex items-center gap-1.5"><span className="text-slate-300">At</span> {log.vendor || 'Fuel Station'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-12 w-full lg:w-auto relative z-10 border-t lg:border-t-0 pt-6 lg:pt-0">
                       <div className="space-y-1">
                          <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Total Spent</div>
                          <div className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(log.totalCost)}</div>
                       </div>
                       <div className="space-y-1">
                          <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Efficiency</div>
                          <div className={`text-xl font-mono font-black ${log.tripKml && log.tripKml > 10 ? 'text-emerald-500' : 'text-slate-400'}`}>{log.tripKml ? `${log.tripKml.toFixed(1)} ${metric}` : '---'}</div>
                       </div>
                       <div className="space-y-1">
                          <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Trip Distance</div>
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
                 <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tighter uppercase">No records detected</h3>
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Refill logs will appear here once entered</p>
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