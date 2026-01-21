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
    activeVehicleId, setActiveVehicleId, user, setCurrentView
  } = useAutoPalStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null);
  const [metric, setMetric] = useState<'KML' | 'MPG'>('KML');
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

  const totalFuelSpend = useMemo(() => fuelLogs.filter(l => l.vehicleId === activeVehicleId).reduce((acc, l) => acc + (l.totalCost || 0), 0), [fuelLogs, activeVehicleId]);

  const handleAddLog = () => {
    setEditingLog(null);
    setShowTerminal(true);
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
          
          <div className="flex gap-3 pt-6">
            <button onClick={() => exportToCSV(fuelLogs.filter(l => l.vehicleId === activeVehicleId), `Fuel_History_${activeVehicle?.model}`)} className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-emerald-600 hover:text-white transition-all">📊 Excel</button>
            <button onClick={() => triggerProfessionalPrint('fuel-report-content')} className="bg-blue-50 text-blue-600 border border-blue-100 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-blue-600 hover:text-white transition-all">📄 PDF</button>
          </div>

          <div className="relative group/scroll flex-grow max-w-sm mt-6">
            {vehicles.length > 1 && (
              <>
                <button onClick={() => handleScroll('left')} className="flex absolute -left-2 top-1/2 -translate-y-1/2 z-[100] w-8 h-8 bg-white border border-slate-200 rounded-full items-center justify-center shadow-xl text-slate-900 transition-all hover:bg-blue-600 hover:text-white">←</button>
                <button onClick={() => handleScroll('right')} className="flex absolute -right-2 top-1/2 -translate-y-1/2 z-[100] w-8 h-8 bg-white border border-slate-200 rounded-full items-center justify-center shadow-xl text-slate-900 transition-all hover:bg-blue-600 hover:text-white">→</button>
              </>
            )}
            <div ref={scrollContainerRef} className="flex gap-2 overflow-x-auto scrollbar-hide scrollbar-desktop-show py-1 px-4 -mx-1 flex-nowrap snap-x snap-mandatory scroll-smooth">
              {vehicles.map(v => (
                <button key={v.id} onClick={() => setActiveVehicleId(v.id)} className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all whitespace-nowrap snap-center ${activeVehicleId === v.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}>
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
          <button disabled={!activeVehicle} onClick={handleAddLog} className={`px-8 sm:px-12 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-3xl transition-all flex items-center justify-center gap-3 bg-slate-900 text-white hover:bg-blue-600`}>
            <span className="text-xl">⛽</span> Add Log
          </button>
        </div>
      </header>

      {activeVehicle && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2 no-print">
            <div className="bg-emerald-600 card-radius p-8 text-white flex flex-col justify-between shadow-xl">
               <div className="space-y-4">
                <h3 className="text-emerald-200 text-[8px] font-black uppercase tracking-[0.4em]">Total Fuel Spent</h3>
                <div className="text-3xl font-black tracking-tighter">{formatCurrency(totalFuelSpend)}</div>
              </div>
            </div>
        </div>
      )}
      
      {showTerminal && activeVehicle && (
        <FuelEntryTerminal vehicleId={activeVehicle.id} currentOdo={activeVehicle.mileage} initialLog={editingLog || undefined} onClose={() => { setShowTerminal(false); setEditingLog(null); }} />
      )}
    </div>
  );
};

export default FuelIntelligenceCenter;