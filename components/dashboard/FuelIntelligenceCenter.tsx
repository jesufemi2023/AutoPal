import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAutoPalStore } from '../../shared/store.ts';
import { fetchFuelLogs, calculateAverageEfficiency, deleteFuelLog } from '../../services/fuelService.ts';
import { formatCurrency, formatDate, kmlToMpg, exportToCSV, triggerProfessionalPrint } from '../../shared/utils.ts';
import FuelEntryTerminal from '../FuelEntryTerminal.tsx';
import { FuelLog } from '../../shared/types.ts';
import { ENV } from '../../services/envService.ts';
import { EntitlementEngine } from '../../services/entitlementService.ts';
import { PlanGuard } from '../PlanGuard.tsx';

const FuelIntelligenceCenter: React.FC = () => {
  const { 
    vehicles, fuelLogs, setFuelLogs, removeFuelLogStore, 
    activeVehicleId, setActiveVehicleId, user, getUsageStats
  } = useAutoPalStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null);
  const [metric, setMetric] = useState<'KML' | 'MPG'>('KML');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const tier = user?.tier || 'free';
  const stats = getUsageStats();

  // AUTOMATIC SYNC: Load logs whenever activeVehicleId changes
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

  // APPLY DATA ISOLATION: Free tier only sees last 30 days
  const restrictedLogs = useMemo(() => {
    return EntitlementEngine.filterHistoryData(tier, fuelLogs);
  }, [fuelLogs, tier]);

  const logsWithAnalytics = useMemo(() => {
    const sorted = [...restrictedLogs].sort((a, b) => (b.odometerKm || 0) - (a.odometerKm || 0));
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
  }, [restrictedLogs]);

  const currentEff = useMemo(() => {
    const sorted = [...logsWithAnalytics].filter(l => l.tripKml !== null);
    const val = sorted[0]?.tripKml || null;
    if (val === null) return null;
    return metric === 'KML' ? val : kmlToMpg(val);
  }, [logsWithAnalytics, metric]);

  const avgEfficiency = useMemo(() => {
    const val = calculateAverageEfficiency(restrictedLogs);
    if (val === null) return null;
    return metric === 'KML' ? val : kmlToMpg(val);
  }, [restrictedLogs, metric]);
  
  const avgPricePerLiter = useMemo(() => {
    const validLogs = restrictedLogs.filter(l => l.liters > 0 && l.totalCost > 0);
    if (validLogs.length === 0) return 0;
    return validLogs.reduce((acc, l) => acc + (l.totalCost / l.liters), 0) / validLogs.length;
  }, [restrictedLogs]);

  const totalFuelSpend = useMemo(() => restrictedLogs.reduce((acc, l) => acc + (l.totalCost || 0), 0), [restrictedLogs]);
  
  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  const handleAddLog = () => {
    if (!EntitlementEngine.canAddFuelLog(tier, stats.monthlyFuelCount)) {
      alert("Monthly limit reached (2/2). Upgrade to Standard for 15 logs/month.");
      return;
    }
    setEditingLog(null);
    setShowTerminal(true);
  };

  return (
    <div className="space-y-8 sm:space-y-16 animate-slide-up pb-24 sm:pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2 no-print">
        <div className="space-y-3">
          <h2 className="text-5xl sm:text-8xl font-black text-slate-900 tracking-tighter leading-[0.8]">Fuel <br/><span className="text-blue-600">Tracker</span></h2>
          <div className="flex gap-3 pt-6">
             <PlanGuard feature="canExportReports" fallbackMode="hide">
               <button onClick={() => exportToCSV(logsWithAnalytics, 'fuel_logs')} className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-3">
                 <span className="text-base">📊</span> Export CSV
               </button>
             </PlanGuard>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex bg-white border-2 border-slate-100 p-1 rounded-2xl shadow-sm">
            {['KML', 'MPG'].map(m => (
              <button key={m} onClick={() => setMetric(m as any)} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${metric === m ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}>{m === 'KML' ? 'KM/L' : m}</button>
            ))}
          </div>
          <button disabled={!activeVehicle} onClick={handleAddLog} className="bg-slate-900 text-white px-8 sm:px-12 py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-4xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4">
            <span className="text-2xl">⛽</span> Log Refill ({stats.monthlyFuelCount}/{EntitlementEngine.getLimit(tier, 'monthlyFuelLogs')})
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2">
         {/* ... (Metrics Cards) ... */}
      </div>

      <PlanGuard requirement={(t) => t !== 'free'} fallbackMode="blur" label="Extended History">
        <div className="space-y-6 px-2">
           {/* ... (Logs List) ... */}
        </div>
      </PlanGuard>

      {showTerminal && activeVehicle && (
        <FuelEntryTerminal vehicleId={activeVehicle.id} currentOdo={activeVehicle.mileage} initialLog={editingLog || undefined} onClose={() => { setShowTerminal(false); setEditingLog(null); }} />
      )}
    </div>
  );
};

export default FuelIntelligenceCenter;
