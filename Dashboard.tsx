import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAutoPalStore } from './shared/store.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, updateMileage, updateVehicle, fetchUserVehicles
} from './services/vehicleService.ts';
import { fetchFuelLogs } from './services/fuelService.ts';
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
    updateMileage: updateStoreMileage,
    loadLocalData, setVehicles, isInitialized
  } = useAutoPalStore();

  const [showOdometerModal, setShowOdometerModal] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeVehicle = useMemo(() => 
    vehicles.find(v => v.id === activeVehicleId), 
    [vehicles, activeVehicleId]
  );
  
  const vehicleTasks = useMemo(() => 
    tasks.filter(t => t.vehicleId === activeVehicleId), 
    [tasks, activeVehicleId]
  );
  
  const activeServiceLogs = useMemo(() => 
    serviceLogs.filter(l => l.vehicleId === activeVehicleId), 
    [serviceLogs, activeVehicleId]
  );
  
  const activeFuelLogs = useMemo(() => 
    fuelLogs.filter(l => l.vehicleId === activeVehicleId), 
    [fuelLogs, activeVehicleId]
  );

  const displayHealthScore = useMemo(() => {
    if (!activeVehicle) return 100;
    return calculateVitalityScore(activeVehicle, tasks, activeFuelLogs, activeServiceLogs);
  }, [activeVehicle, tasks, activeFuelLogs, activeServiceLogs]);

  useEffect(() => {
    if (!isInitialized) loadLocalData();
  }, [isInitialized, loadLocalData]);

  useEffect(() => {
    const syncVehicles = async () => {
      setIsSyncing(true);
      try {
        const cloudVehicles = await fetchUserVehicles();
        if (cloudVehicles.length > 0) {
          setVehicles(cloudVehicles);
        }
      } catch (err) {
        console.warn("Sync deferred.");
      } finally {
        setIsSyncing(false);
      }
    };
    syncVehicles();
  }, [setVehicles]);

  useEffect(() => {
    if (vehicles.length > 0 && !activeVehicleId) {
      setActiveVehicleId(vehicles[0].id);
    } else if (activeVehicleId && !vehicles.some(v => v.id === activeVehicleId) && vehicles.length > 0) {
      setActiveVehicleId(vehicles[0].id);
    }
  }, [vehicles, activeVehicleId, setActiveVehicleId]);

  useEffect(() => {
    if (activeVehicleId) {
      setIsLoadingDetails(true);
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
      .catch((err) => {
        console.error("Dashboard Intelligence Sync Fault:", err);
      })
      .finally(() => setIsLoadingDetails(false));
    }
  }, [activeVehicleId, setTasks, setServiceLogs, setFuelLogs]);

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
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter leading-none uppercase">Vehicle <span className="text-blue-600">Hub</span></h1>
            {(isSyncing || isLoadingDetails) && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse ml-2"></div>}
          </div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-[7px] sm:text-[8px]">Active Fleet Monitoring</p>
        </div>
        
        <div className="relative group/scroll flex-grow lg:max-w-xl xl:max-w-3xl">
          {vehicles.length > 1 && (
            <>
              <button 
                onClick={() => handleScroll('left')}
                className="lg:flex absolute -left-4 top-1/2 -translate-y-1/2 z-[100] w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center shadow-xl text-slate-900 hover:bg-blue-600 hover:text-white transition-all active:scale-90"
              >
                ←
              </button>
              <button 
                onClick={() => handleScroll('right')}
                className="lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-[100] w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center shadow-xl text-slate-900 hover:bg-blue-600 hover:text-white transition-all active:scale-90"
              >
                →
              </button>
            </>
          )}
          
          <div 
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide scrollbar-desktop-show py-2 px-4 -mx-0.5 flex-nowrap snap-x snap-mandatory scroll-smooth"
          >
            {vehicles.map(v => (
              <button 
                key={v.id}
                onClick={() => setActiveVehicleId(v.id)}
                className={`flex-shrink-0 px-6 py-5 rounded-[1.75rem] border-2 transition-all min-w-[180px] sm:min-w-[200px] text-left relative overflow-hidden flex flex-col justify-center snap-center ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200 hover:bg-slate-50'}`}
              >
                <div className="text-[7px] font-black uppercase opacity-50 mb-1 tracking-widest">{v.make}</div>
                <div className="text-base font-black tracking-tight truncate w-full">{v.model}</div>
                <div className="flex items-center gap-2 mt-3">
                   <div className={`w-2 h-2 rounded-full ${activeVehicleId === v.id ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-slate-200'}`}></div>
                   <div className="text-[8px] font-black uppercase tracking-tighter opacity-40">{v.year} Model</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </header>

      {activeVehicle ? (
        <div className="w-full flex flex-col gap-6 lg:gap-10">
          <VehicleOverview 
            vehicle={{...activeVehicle, healthScore: displayHealthScore}} 
            onUpdateOdometer={() => setShowOdometerModal(true)} 
          />
          
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-10 items-stretch">
            <div className="xl:col-span-12 flex flex-col h-full">
              <ResaleValuationCard vehicle={activeVehicle} tasks={tasks} serviceLogs={activeServiceLogs} fuelLogs={activeFuelLogs} />
            </div>
            <div className="xl:col-span-12 flex flex-col h-full">
               <VitalityDashboard vehicle={activeVehicle} tasks={tasks} logs={activeServiceLogs} fuelLogs={activeFuelLogs} />
            </div>
          </div>

          <MaintenanceRoadmap 
            vehicle={activeVehicle} 
            tasks={vehicleTasks} 
            logs={activeServiceLogs} 
            isLoading={isLoadingDetails} 
            onLog={() => setCurrentView('service')} 
          />
        </div>
      ) : (
        !isLoadingDetails && (
          <div className="py-20 sm:py-24 text-center bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-14 shadow-sm mx-auto max-w-2xl w-full">
             <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-3xl mx-auto mb-6 sm:mb-8 shadow-inner">🚙</div>
             <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5">No Vehicles in Garage</h3>
             <p className="text-slate-400 mb-8 text-[8px] sm:text-[9px] font-black uppercase tracking-widest max-w-xs mx-auto">Click below to add your first car and start tracking.</p>
             <button onClick={() => setCurrentView('onboarding')} className="w-full sm:w-auto bg-slate-900 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-[9px] shadow-lg hover:bg-blue-600 transition-all">Add New Car →</button>
          </div>
        )
      )}

      {showOdometerModal && activeVehicle && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="w-full max-sm animate-slide-up">
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