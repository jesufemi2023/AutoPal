import React, { useState, useEffect, useRef } from 'react';
import { useAutoPalStore } from './shared/store.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, updateMileage, updateVehicle
} from './services/vehicleService.ts';
import { fetchFuelLogs } from './services/fuelService.ts';
import { localDb } from './services/localDb.ts';
import { OdometerInput } from './components/OdometerInput.tsx';

import { VehicleOverview } from './components/dashboard/VehicleOverview.tsx';
import { MaintenanceRoadmap } from './components/dashboard/MaintenanceRoadmap.tsx';
import { VitalityDashboard } from './components/dashboard/VitalityDashboard.tsx';
import { calculateVitalityScore } from './services/maintenanceLogic.ts';
import { ResaleValuationCard } from './components/dashboard/ResaleValuationCard.tsx';

const Dashboard: React.FC = () => {
  const { 
    vehicles, tasks, serviceLogs, fuelLogs,
    activeVehicleId, setActiveVehicleId,
    setTasks, setServiceLogs, setFuelLogs, setCurrentView,
    updateMileage: updateStoreMileage, updateVehicleStore, setVehicles
  } = useAutoPalStore();

  const [showOdometerModal, setShowOdometerModal] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);
  const vehicleTasks = tasks.filter(t => t.vehicleId === activeVehicleId);
  const activeServiceLogs = serviceLogs.filter(l => l.vehicleId === activeVehicleId);
  const activeFuelLogs = fuelLogs.filter(l => l.vehicleId === activeVehicleId);

  // Phase 1: Local-First Load
  useEffect(() => {
    const loadFromCache = async () => {
      const cachedVehicles = await localDb.getVehicles();
      if (cachedVehicles.length > 0) {
        setVehicles(cachedVehicles);
        if (!activeVehicleId) setActiveVehicleId(cachedVehicles[0].id);
      }
    };
    loadFromCache();
  }, []);

  // Phase 2: Background Cloud Sync
  useEffect(() => {
    if (activeVehicleId) {
      setIsLoadingDetails(true);
      
      // Pull local telemetry first for 0ms UI pop
      Promise.all([
        localDb.getTasks(activeVehicleId),
        localDb.getLogs(activeVehicleId),
        localDb.getFuelLogs(activeVehicleId)
      ]).then(([t, l, f]) => {
        if (t.length > 0) setTasks(t);
        if (l.length > 0) setServiceLogs(l);
        if (f.length > 0) setFuelLogs(f);
      });

      // Background Fetch from Cloud (Master Copy)
      Promise.all([
        fetchVehicleTasks(activeVehicleId),
        fetchVehicleServiceLogs(activeVehicleId),
        fetchFuelLogs(activeVehicleId)
      ])
      .then(([taskList, logList, fuelList]) => {
        setTasks(taskList);
        setServiceLogs(logList);
        setFuelLogs(fuelList);
        
        // Persist Master Copy to Browser Cache
        localDb.saveTasksBatch(taskList);
        logList.forEach(log => localDb.saveLog(log));
        fuelList.forEach(fuel => localDb.saveFuelLog(fuel));
      })
      .finally(() => setIsLoadingDetails(false));
    }
  }, [activeVehicleId]);

  // Phase 3: Update local score if not AI audited (Fallback only)
  useEffect(() => {
    if (activeVehicle && tasks.length > 0 && !activeVehicle.latestAiAudit) {
      const newScore = calculateVitalityScore(activeVehicle, tasks, activeFuelLogs, activeServiceLogs);
      if (newScore !== activeVehicle.healthScore) {
        updateVehicle(activeVehicle.id, { healthScore: newScore });
        updateVehicleStore({ ...activeVehicle, healthScore: newScore });
        localDb.saveVehicle({ ...activeVehicle, healthScore: newScore });
      }
    }
  }, [tasks, activeVehicle?.mileage, activeFuelLogs, activeServiceLogs]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-10 lg:space-y-14 w-full max-w-full overflow-x-hidden pb-10 px-1">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 px-1">
        <div className="shrink-0">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter mb-1.5 leading-none uppercase">My <span className="text-blue-600">Garage</span></h1>
          <p className="text-slate-400 font-black uppercase tracking-widest text-[7px] sm:text-[8px]">Status: Monitoring Node {activeVehicleId?.split('-')[0]}</p>
        </div>
        
        <div className="relative group/scroll flex-grow lg:max-w-xl xl:max-w-3xl">
          <div 
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide py-1.5 px-0.5 -mx-0.5 flex-nowrap snap-x snap-mandatory scroll-smooth"
          >
            {vehicles.length > 0 && vehicles.map(v => (
              <button 
                key={v.id}
                onClick={() => setActiveVehicleId(v.id)}
                className={`flex-shrink-0 px-6 py-5 rounded-[1.75rem] border-2 transition-all min-w-[180px] sm:min-w-[200px] text-left relative overflow-hidden flex flex-col justify-center snap-center ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200 hover:bg-slate-50'}`}
              >
                <div className="text-[7px] font-black uppercase opacity-50 mb-1 tracking-widest">{v.make}</div>
                <div className="text-base font-black tracking-tight truncate w-full">{v.model}</div>
                <div className="flex items-center gap-2 mt-3">
                   <div className={`w-2 h-2 rounded-full ${activeVehicleId === v.id ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-slate-200'}`}></div>
                   <div className="text-[8px] font-black uppercase tracking-tighter opacity-40">{v.year} model</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </header>

      {activeVehicle ? (
        <div className="w-full flex flex-col gap-6 lg:gap-10">
          <div className="w-full">
            <VehicleOverview vehicle={activeVehicle} onUpdateOdometer={() => setShowOdometerModal(true)} />
          </div>
          
          <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-10 items-start">
            <div className="w-full h-full">
              <ResaleValuationCard 
                vehicle={activeVehicle} 
                tasks={tasks} 
                serviceLogs={activeServiceLogs} 
                fuelLogs={activeFuelLogs} 
              />
            </div>
            <div className="w-full h-full">
               <VitalityDashboard vehicle={activeVehicle} tasks={tasks} logs={activeServiceLogs} fuelLogs={activeFuelLogs} />
            </div>
          </div>

          <div className="w-full">
            <MaintenanceRoadmap 
              vehicle={activeVehicle} 
              tasks={vehicleTasks} 
              isLoading={isLoadingDetails}
              onLog={() => setCurrentView('service')} 
            />
          </div>
        </div>
      ) : (
        !isLoadingDetails && (
          <div className="py-20 sm:py-24 text-center bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-14 shadow-sm mx-auto max-w-2xl w-full">
             <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-3xl mx-auto mb-6 sm:mb-8 shadow-inner">🚙</div>
             <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5">No Vehicles Linked</h3>
             <p className="text-slate-400 mb-8 text-[8px] sm:text-[9px] font-black uppercase tracking-widest max-w-xs mx-auto">Deploy a digital twin to start monitoring.</p>
             <button onClick={() => setCurrentView('onboarding')} className="w-full sm:w-auto bg-slate-900 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-[9px] shadow-lg hover:bg-blue-600 transition-all">Add Your Vehicle →</button>
          </div>
        )
      )}

      {showOdometerModal && activeVehicle && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="w-full max-w-sm animate-slide-up">
            <OdometerInput value={activeVehicle.mileage} onSave={async (v) => { 
              await updateMileage(activeVehicle.id, v); 
              updateStoreMileage(activeVehicle.id, v); 
              setShowOdometerModal(false); 
            }} onCancel={() => setShowOdometerModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;