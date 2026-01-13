
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
    <div className="space-y-6 sm:space-y-8 lg:space-y-10 w-full max-w-full overflow-x-hidden pb-10">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 px-1">
        <div className="shrink-0">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter mb-1 leading-none">Garage Report</h1>
          <p className="text-slate-400 font-black uppercase tracking-widest text-[7px] sm:text-[8px]">Strategic Asset Intelligence Active</p>
        </div>
        
        <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1.5 px-0.5 -mx-0.5">
          {vehicles.length > 0 && vehicles.map(v => (
            <button 
              key={v.id}
              onClick={() => setActiveVehicleId(v.id)}
              className={`flex-shrink-0 px-5 py-3 rounded-xl border transition-all min-w-[140px] text-left relative overflow-hidden flex flex-col justify-center ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
            >
              <div className="text-[7px] font-black uppercase opacity-60 mb-0.5 tracking-wider">{v.make}</div>
              <div className="text-sm font-black tracking-tight truncate w-full">{v.model}</div>
              <div className={`w-1.5 h-1.5 rounded-full mt-2 ${activeVehicleId === v.id ? 'bg-blue-500 shadow-[0_0_4px_#3b82f6]' : 'bg-slate-200'}`}></div>
            </button>
          ))}
        </div>
      </header>

      {activeVehicle ? (
        <div className="w-full flex flex-col gap-6 lg:gap-8">
          {/* Main Grid: Adapts horizontally first */}
          <div className="w-full">
            <VehicleOverview vehicle={activeVehicle} onUpdateOdometer={() => setShowOdometerModal(true)} />
          </div>
          
          <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            <div className="w-full flex">
              <ResaleValuationCard 
                vehicle={activeVehicle} 
                tasks={tasks} 
                serviceLogs={activeServiceLogs} 
                fuelLogs={activeFuelLogs} 
              />
            </div>
            <div className="w-full flex">
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

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fleet Quick Metrics</h4>
                <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight max-w-md">Engineering metrics calculated from real-time asset telemetry data across 8 distinct maintenance pillars.</p>
              </div>
              <div className="space-y-3 w-full sm:w-64">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                  <span className="text-slate-500">Service Coverage</span>
                  <span className="text-slate-900 font-mono">{vehicleTasks.filter(t => t.status === 'completed').length} / {vehicleTasks.length}</span>
                </div>
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${(vehicleTasks.filter(t => t.status === 'completed').length / (vehicleTasks.length || 1)) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        !isLoadingDetails && (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-100 p-8 shadow-sm mx-auto max-w-2xl w-full">
             <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner">🛰️</div>
             <h3 className="text-xl font-black text-slate-900 mb-1">Fleet Management Offline</h3>
             <p className="text-slate-400 mb-8 text-[8px] font-black uppercase tracking-widest max-w-xs mx-auto leading-relaxed">Initialize a digital twin using the Deploy Asset feature in your sidebar</p>
             <button onClick={() => setCurrentView('onboarding')} className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg hover:bg-blue-600 transition-all">Start Onboarding →</button>
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
