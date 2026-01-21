import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAutoPalStore } from '../../shared/store.ts';
import { fetchVehicleTasks, fetchVehicleServiceLogs } from '../../services/vehicleService.ts';
import { fetchFuelLogs } from '../../services/fuelService.ts';
import { deleteServiceLog } from '../../services/logService.ts';
import { formatCurrency, formatDate, exportToCSV, triggerProfessionalPrint } from '../../shared/utils.ts';
import { MaintenanceTask, ServiceLog } from '../../shared/types.ts';
import { calculateFinancialLedger } from '../../services/maintenanceLogic.ts';
import { MaintenanceRoadmap } from './MaintenanceRoadmap.tsx';
import { ServiceLogTerminal } from '../ServiceLogTerminal.tsx';

const ServiceIntelligenceCenter: React.FC = () => {
  const { 
    vehicles, tasks, serviceLogs, fuelLogs, setTasks, setServiceLogs, setFuelLogs,
    activeVehicleId, setActiveVehicleId, user, setCurrentView
  } = useAutoPalStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'ledger'>('roadmap');
  const [showLogTerminal, setShowLogTerminal] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  useEffect(() => {
    if (activeVehicleId) {
      setIsLoading(true);
      Promise.all([
        fetchVehicleTasks(activeVehicleId),
        fetchVehicleServiceLogs(activeVehicleId),
        fetchFuelLogs(activeVehicleId)
      ])
      .then(([taskList, logList, fuelList]) => {
        setTasks(taskList);
        setServiceLogs(logList);
        setFuelLogs(fuelList);
      })
      .finally(() => setIsLoading(false));
    }
  }, [activeVehicleId, setTasks, setServiceLogs, setFuelLogs]);

  const handleAddLog = () => {
    setShowLogTerminal(true);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const totalMaintenanceSpend = useMemo(() => {
    const logs = serviceLogs.filter(l => l.vehicleId === activeVehicleId);
    return logs.reduce((acc, l) => acc + (l.cost || 0), 0);
  }, [serviceLogs, activeVehicleId]);

  return (
    <div className="space-y-12 sm:space-y-16 animate-slide-up pb-24 sm:pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2 no-print">
        <div className="space-y-3">
          <h2 className="text-5xl sm:text-8xl font-black text-slate-900 tracking-tighter leading-[0.8]">Service <br/><span className="text-blue-600">Records</span></h2>
          
          <div className="flex gap-3 pt-6">
            <button onClick={() => exportToCSV(serviceLogs.filter(l => l.vehicleId === activeVehicleId), `Service_History_${activeVehicle?.model}`)} className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-emerald-600 hover:text-white transition-all">📊 Excel</button>
            <button onClick={() => triggerProfessionalPrint('service-report-content')} className="bg-blue-50 text-blue-600 border border-blue-100 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-blue-600 hover:text-white transition-all">📄 PDF</button>
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
        <button disabled={!activeVehicle} onClick={handleAddLog} className={`px-8 sm:px-12 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-3xl transition-all flex items-center justify-center gap-3 bg-slate-900 text-white hover:bg-blue-600`}>
          <span className="text-xl">🛠️</span> Record Service
        </button>
      </header>

      {activeVehicle && (
        <div className="space-y-12 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2">
            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Total Investment</h3>
                <div className={`text-4xl font-black text-slate-900 tracking-tighter`}>{formatCurrency(totalMaintenanceSpend)}</div>
              </div>
            </div>
          </div>
          <div className="flex bg-slate-100/50 p-2 rounded-2xl w-full sm:w-max">
            <button onClick={() => setActiveTab('roadmap')} className={`flex-1 sm:flex-none px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'roadmap' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Roadmap</button>
            <button onClick={() => setActiveTab('ledger')} className={`flex-1 sm:flex-none px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Full History</button>
          </div>
          {activeTab === 'roadmap' && <MaintenanceRoadmap vehicle={activeVehicle} tasks={tasks.filter(t => t.vehicleId === activeVehicleId)} onLog={handleAddLog} />}
        </div>
      )}
      
      {showLogTerminal && activeVehicle && (
        <ServiceLogTerminal vehicle={activeVehicle} onClose={() => setShowLogTerminal(false)} />
      )}
    </div>
  );
};

export default ServiceIntelligenceCenter;