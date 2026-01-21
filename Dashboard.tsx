import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAutoPalStore } from './shared/store.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, updateMileage, fetchUserVehicles
} from './services/vehicleService.ts';
import { fetchFuelLogs } from './services/fuelService.ts';
import { OdometerInput } from './components/OdometerInput.tsx';
import { VehicleOverview } from './components/dashboard/VehicleOverview.tsx';
import { MaintenanceRoadmap } from './components/dashboard/MaintenanceRoadmap.tsx';
import { VitalityDashboard } from './components/dashboard/VitalityDashboard.tsx';
import { ResaleValuationCard } from './components/dashboard/ResaleValuationCard.tsx';

const Dashboard: React.FC = () => {
  const { 
    vehicles, tasks, serviceLogs, fuelLogs,
    activeVehicleId, setActiveVehicleId,
    setTasks, setServiceLogs, setFuelLogs, setCurrentView,
    updateMileage: updateStoreMileage, loadLocalData, setVehicles
  } = useAutoPalStore();

  const [showOdometerModal, setShowOdometerModal] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeVehicle = useMemo(() => vehicles.find(v => v.id === activeVehicleId), [vehicles, activeVehicleId]);
  const vehicleTasks = useMemo(() => tasks.filter(t => t.vehicleId === activeVehicleId), [tasks, activeVehicleId]);
  const activeServiceLogs = useMemo(() => serviceLogs.filter(l => l.vehicleId === activeVehicleId), [serviceLogs, activeVehicleId]);
  const activeFuelLogs = useMemo(() => fuelLogs.filter(l => l.vehicleId === activeVehicleId), [fuelLogs, activeVehicleId]);

  useEffect(() => {
    if (activeVehicleId) {
      setIsLoadingDetails(true);
      Promise.all([
        fetchVehicleTasks(activeVehicleId),
        fetchVehicleServiceLogs(activeVehicleId),
        fetchFuelLogs(activeVehicleId)
      ]).then(([taskList, logList, fuelList]) => {
        setTasks(taskList);
        setServiceLogs(logList);
        setFuelLogs(fuelList);
      }).finally(() => setIsLoadingDetails(false));
    }
  }, [activeVehicleId]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const amount = 300;
      scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-12 w-full">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 px-1">
        <div className="shrink-0">
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Vehicle <span className="text-blue-600">Hub</span></h1>
          <p className="text-slate-400 font-black uppercase tracking-widest text-[7px] mt-2">Active Fleet Monitoring</p>
        </div>
        
        <div className="relative group/scroll flex-grow lg:max-w-3xl">
          {vehicles.length > 1 && (
            <>
              <button onClick={() => handleScroll('left')} className="absolute -left-2 top-1/2 -translate-y-1/2 z-[10] w-10 h-10 bg-white border border-slate-200 rounded-full shadow-xl hover:bg-blue-600 hover:text-white transition-all">←</button>
              <button onClick={() => handleScroll('right')} className="absolute -right-2 top-1/2 -translate-y-1/2 z-[10] w-10 h-10 bg-white border border-slate-200 rounded-full shadow-xl hover:bg-blue-600 hover:text-white transition-all">→</button>
            </>
          )}
          <div ref={scrollContainerRef} className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-4 flex-nowrap snap-x scroll-smooth">
            {vehicles.map(v => (
              <button 
                key={v.id} onClick={() => setActiveVehicleId(v.id)}
                className={`flex-shrink-0 px-6 py-5 rounded-[1.75rem] border-2 transition-all min-w-[180px] text-left snap-center ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
              >
                <div className="text-[7px] font-black uppercase opacity-50 mb-1">{v.make}</div>
                <div className="text-base font-black truncate">{v.model}</div>
                <div className={`w-2 h-2 rounded-full mt-3 ${activeVehicleId === v.id ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-slate-200'}`}></div>
              </button>
            ))}
          </div>
        </div>
      </header>

      {activeVehicle ? (
        <div className="space-y-6 lg:space-y-10">
          <VehicleOverview vehicle={activeVehicle} onUpdateOdometer={() => setShowOdometerModal(true)} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
            <ResaleValuationCard vehicle={activeVehicle} tasks={tasks} serviceLogs={activeServiceLogs} fuelLogs={activeFuelLogs} />
            <VitalityDashboard vehicle={activeVehicle} tasks={tasks} logs={activeServiceLogs} fuelLogs={activeFuelLogs} />
          </div>
          <MaintenanceRoadmap vehicle={activeVehicle} tasks={vehicleTasks} logs={activeServiceLogs} isLoading={isLoadingDetails} onLog={() => setCurrentView('service')} />
        </div>
      ) : (
        <div className="py-24 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 p-12 mx-auto max-w-2xl">
           <div className="text-4xl mb-6">🚙</div>
           <h3 className="text-xl font-black text-slate-900 mb-2">No Vehicles Found</h3>
           <button onClick={() => setCurrentView('onboarding')} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg">Add First Car</button>
        </div>
      )}

      {showOdometerModal && activeVehicle && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="w-full max-w-md animate-slide-up">
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