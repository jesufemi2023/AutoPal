
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from './shared/store.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, updateMileage, updateVehicle
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
    updateMileage: updateStoreMileage, updateVehicleStore
  } = useAutoPalStore();

  const [showOdometerModal, setShowOdometerModal] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);
  const vehicleTasks = tasks.filter(t => t.vehicleId === activeVehicleId);
  const activeServiceLogs = serviceLogs.filter(l => l.vehicleId === activeVehicleId);
  const activeFuelLogs = fuelLogs.filter(l => l.vehicleId === activeVehicleId);

  useEffect(() => {
    if (vehicles.length > 0 && !activeVehicleId) setActiveVehicleId(vehicles[0].id);
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
      .finally(() => setIsLoadingDetails(false));
    }
  }, [activeVehicleId, setTasks, setServiceLogs, setFuelLogs]);

  useEffect(() => {
    if (activeVehicle && tasks.length > 0) {
      const newScore = calculateVitalityScore(activeVehicle, tasks, activeFuelLogs, activeServiceLogs);
      if (newScore !== activeVehicle.healthScore) {
        updateVehicle(activeVehicle.id, { healthScore: newScore });
        updateVehicleStore({ ...activeVehicle, healthScore: newScore });
      }
    }
  }, [tasks, activeVehicle?.mileage, activeFuelLogs, activeServiceLogs]);

  return (
    <div className="space-y-6 sm:space-y-10 lg:space-y-14 w-full max-w-full overflow-x-hidden pb-10 px-1">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 px-1">
        <div className="shrink-0">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter mb-1.5 leading-none uppercase">My <span className="text-blue-600">Garage</span></h1>
          <p className="text-slate-400 font-black uppercase tracking-widest text-[7px] sm:text-[8px]">System Status: Monitoring Active</p>
        </div>
        
        {/* Slidable Vehicle Selection Bar */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1.5 px-0.5 -mx-0.5 flex-nowrap snap-x snap-mandatory">
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
          {/* Add visual cue for scroll if many vehicles */}
          {vehicles.length > 2 && (
            <div className="flex-shrink-0 w-8 flex items-center justify-center text-slate-200 pointer-events-none">
              <span className="animate-pulse">→</span>
            </div>
          )}
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

          <div className="bg-slate-50 rounded-[1.5rem] p-6 border border-slate-200 shadow-sm w-full">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Quick Insights</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-500">Service Coverage</span>
                  <span className="text-slate-900 font-mono">{vehicleTasks.filter(t => t.status === 'completed').length} / {vehicleTasks.length}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${(vehicleTasks.filter(t => t.status === 'completed').length / (vehicleTasks.length || 1)) * 100}%` }}></div>
                </div>
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed flex items-center">Health and efficiency scores are calculated in real-time based on your vehicle's maintenance history and fuel usage.</p>
            </div>
          </div>
        </div>
      ) : (
        !isLoadingDetails && (
          <div className="py-20 sm:py-24 text-center bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-14 shadow-sm mx-auto max-w-2xl w-full">
             <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-3xl mx-auto mb-6 sm:mb-8 shadow-inner">🚙</div>
             <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5">No Vehicles Found</h3>
             <p className="text-slate-400 mb-8 text-[8px] sm:text-[9px] font-black uppercase tracking-widest max-w-xs mx-auto">Get started by adding your vehicle to the system.</p>
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
