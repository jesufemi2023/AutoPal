
import React, { useState, useEffect, useRef } from 'react';
import { useAutoPalStore } from './shared/store.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, updateMileage, updateVehicle, fetchUserVehicles
} from './services/vehicleService.ts';
import { OdometerInput } from './components/OdometerInput.tsx';
import { localDb } from './services/localDb.ts';
import { QUOTAS } from './services/permissionService.ts';

import { VehicleOverview } from './components/dashboard/VehicleOverview.tsx';
import { MaintenanceRoadmap } from './components/dashboard/MaintenanceRoadmap.tsx';
import { VitalityDashboard } from './components/dashboard/VitalityDashboard.tsx';
import { calculateVitalityScore } from './services/maintenanceLogic.ts';
import { ResaleValuationCard } from './components/dashboard/ResaleValuationCard.tsx';

const Dashboard: React.FC = () => {
  const { 
    vehicles, tasks, serviceLogs, fuelLogs, user,
    activeVehicleId, setActiveVehicleId,
    setTasks, setServiceLogs, setFuelLogs, setCurrentView,
    updateMileage: updateStoreMileage, updateVehicleStore,
    setVehicles
  } = useAutoPalStore();

  const [showOdometerModal, setShowOdometerModal] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);
  const vehicleTasks = tasks.filter(t => t.vehicleId === activeVehicleId);
  const activeServiceLogs = serviceLogs.filter(l => l.vehicleId === activeVehicleId);
  const activeFuelLogs = fuelLogs.filter(l => l.vehicleId === activeVehicleId);

  // Background Sync - Only for cloud-enabled tiers
  useEffect(() => {
    if (!user || !QUOTAS[user.tier].isCloudSynced) return;

    const syncVehicles = async () => {
      setIsSyncing(true);
      try {
        const cloudVehicles = await fetchUserVehicles();
        setVehicles(cloudVehicles);
      } catch (err) {
        console.warn("Sync deferred.");
      } finally {
        setIsSyncing(false);
      }
    };
    syncVehicles();
  }, [setVehicles, user?.tier, user?.id]);

  useEffect(() => {
    if (vehicles.length > 0 && !activeVehicleId) {
      setActiveVehicleId(vehicles[0].id);
    }
  }, [vehicles, activeVehicleId, setActiveVehicleId]);

  // Unified Hydration Logic
  useEffect(() => {
    if (activeVehicleId && user) {
      const isCloudEnabled = QUOTAS[user.tier].isCloudSynced;
      
      const hydrateData = async () => {
        setIsLoadingDetails(true);
        try {
          // 1. Always load from Local DB first (Source of Truth for Free tier)
          const [lTasks, lLogs, lFuel] = await Promise.all([
            localDb.getTasks(activeVehicleId),
            localDb.getLogs(activeVehicleId),
            localDb.getFuelLogs(activeVehicleId)
          ]);
          
          setTasks(lTasks);
          setServiceLogs(lLogs);
          setFuelLogs(lFuel);

          // 2. Fetch from Cloud only if permitted
          if (isCloudEnabled) {
            const [taskList, logList] = await Promise.all([
              fetchVehicleTasks(activeVehicleId),
              fetchVehicleServiceLogs(activeVehicleId)
            ]);
            setTasks(taskList);
            setServiceLogs(logList);
          }
        } catch (err) {
          console.error("Hydration fault:", err);
        } finally {
          setIsLoadingDetails(false);
        }
      };

      hydrateData();
    }
  }, [activeVehicleId, user?.id, setTasks, setServiceLogs, setFuelLogs]);

  // Real-time Health Recalculation
  useEffect(() => {
    if (activeVehicle && tasks.length > 0) {
      const newScore = calculateVitalityScore(activeVehicle, tasks, activeFuelLogs, activeServiceLogs);
      if (newScore !== activeVehicle.healthScore) {
        updateVehicle(activeVehicle.id, { healthScore: newScore }, user?.tier || 'free');
        updateVehicleStore({ ...activeVehicle, healthScore: newScore });
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
    <div className="space-y-10 sm:space-y-14 lg:space-y-16 w-full max-w-full overflow-x-hidden pb-10 px-1">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 px-1">
        <div className="shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tighter uppercase">My <span className="text-blue-600">Garage</span></h1>
            {isSyncing && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse ml-2" title="Syncing..."></div>}
          </div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-[8px] sm:text-[9px]">Neural Link: System Stable</p>
        </div>
        
        <div className="relative group/scroll flex-grow lg:max-w-xl xl:max-w-3xl">
          <button 
            onClick={() => handleScroll('left')}
            className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full items-center justify-center shadow-lg text-slate-900 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover/scroll:opacity-100 -ml-5"
          >
            ←
          </button>
          
          <div 
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide py-2 px-1 flex-nowrap snap-x snap-mandatory scroll-smooth"
          >
            {vehicles.map(v => (
              <button 
                key={v.id}
                onClick={() => setActiveVehicleId(v.id)}
                className={`flex-shrink-0 px-8 py-6 rounded-[2rem] border-2 transition-all min-w-[200px] text-left relative overflow-hidden flex flex-col justify-center snap-center ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200 hover:bg-slate-50'}`}
              >
                <div className="text-[8px] font-black uppercase opacity-50 mb-1 tracking-widest">{v.make}</div>
                <div className="text-xl font-black tracking-tight truncate w-full">{v.model}</div>
                <div className={`w-2 h-2 rounded-full mt-4 ${activeVehicleId === v.id ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-slate-200'}`}></div>
              </button>
            ))}
          </div>

          <button 
            onClick={() => handleScroll('right')}
            className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full items-center justify-center shadow-lg text-slate-900 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover/scroll:opacity-100 -mr-5"
          >
            →
          </button>
        </div>
      </header>

      {activeVehicle ? (
        <div className="w-full space-y-10 lg:space-y-14">
          <VehicleOverview vehicle={activeVehicle} onUpdateOdometer={() => setShowOdometerModal(true)} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch min-h-[500px]">
            <ResaleValuationCard vehicle={activeVehicle} tasks={tasks} serviceLogs={activeServiceLogs} fuelLogs={activeFuelLogs} />
            <VitalityDashboard vehicle={activeVehicle} tasks={tasks} logs={activeServiceLogs} fuelLogs={activeFuelLogs} />
          </div>

          <MaintenanceRoadmap vehicle={activeVehicle} tasks={vehicleTasks} isLoading={isLoadingDetails} onLog={() => setCurrentView('service')} />
        </div>
      ) : (
        !isLoadingDetails && (
          <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 p-12 shadow-sm max-w-2xl mx-auto">
             <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">🚙</div>
             <h3 className="text-2xl font-black text-slate-900 mb-2">Command Center Offline</h3>
             <p className="text-slate-400 mb-10 text-[10px] font-black uppercase tracking-widest">No Active Assets Detected</p>
             <button onClick={() => setCurrentView('onboarding')} className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-3xl hover:bg-blue-600 transition-all">Deploy Asset →</button>
          </div>
        )
      )}

      {showOdometerModal && activeVehicle && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="w-full max-w-sm">
            <OdometerInput value={activeVehicle.mileage} onSave={async (v) => { 
              await updateMileage(activeVehicle.id, v, user?.tier || 'free'); 
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
