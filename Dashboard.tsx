
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from './shared/store.ts';
import { getAdvancedDiagnostic } from './services/geminiService.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, updateMileage, updateVehicle
} from './services/vehicleService.ts';
import { fetchFuelLogs } from './services/fuelService.ts';
import { OdometerInput } from './components/OdometerInput.tsx';

import { VehicleOverview } from './components/dashboard/VehicleOverview.tsx';
import { MaintenanceRoadmap } from './components/dashboard/MaintenanceRoadmap.tsx';
import { DiagnosticsPanel } from './components/dashboard/DiagnosticsPanel.tsx';
import { VitalityDashboard } from './components/dashboard/VitalityDashboard.tsx';
import { calculateVitalityScore } from './services/maintenanceLogic.ts';
import { ResaleValuationCard } from './components/dashboard/ResaleValuationCard.tsx';

const Dashboard: React.FC = () => {
  const { 
    vehicles, tasks, serviceLogs, fuelLogs, user, setSuggestedParts,
    activeVehicleId, setActiveVehicleId,
    setTasks, setServiceLogs, setFuelLogs, setCurrentView,
    updateMileage: updateStoreMileage, updateVehicleStore
  } = useAutoPalStore();

  const [isAskingAI, setIsAskingAI] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [diagImage, setDiagImage] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<any>(null);
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
    <div className="space-y-10 sm:space-y-16 lg:space-y-24 w-full max-w-full overflow-x-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter mb-2">Garage Report</h1>
          <p className="text-slate-400 font-black uppercase tracking-widest text-[8px] sm:text-[9px]">Strategic Asset Intelligence Active</p>
        </div>
        
        <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1">
          {vehicles.length > 0 && vehicles.map(v => (
            <button 
              key={v.id}
              onClick={() => setActiveVehicleId(v.id)}
              className={`flex-shrink-0 px-6 sm:px-8 py-4 sm:py-6 rounded-2xl sm:rounded-[2rem] border-2 transition-all min-w-[160px] sm:min-w-[200px] text-left relative overflow-hidden ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-300'}`}
            >
              <div className="text-[7px] sm:text-[8px] font-black uppercase opacity-50 mb-1">{v.make}</div>
              <div className="text-lg sm:text-xl font-black tracking-tight truncate">{v.model}</div>
              <div className={`w-2 h-2 rounded-full mt-3 sm:mt-4 ${activeVehicleId === v.id ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-slate-200'}`}></div>
            </button>
          ))}
        </div>
      </header>

      {activeVehicle ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-start w-full">
          <div className="lg:col-span-8 space-y-12 sm:space-y-20 lg:space-y-28 w-full">
            <VehicleOverview vehicle={activeVehicle} onUpdateOdometer={() => setShowOdometerModal(true)} />
            
            <div className="px-1">
              <ResaleValuationCard 
                vehicle={activeVehicle} 
                tasks={tasks} 
                serviceLogs={activeServiceLogs} 
                fuelLogs={activeFuelLogs} 
              />
            </div>

            <div className="px-1">
              <VitalityDashboard vehicle={activeVehicle} tasks={tasks} logs={activeServiceLogs} fuelLogs={activeFuelLogs} />
            </div>

            <div className="px-1">
              <MaintenanceRoadmap 
                vehicle={activeVehicle} 
                tasks={vehicleTasks} 
                isLoading={isLoadingDetails}
                onLog={() => setCurrentView('service')} 
              />
            </div>
          </div>

          <aside className="lg:col-span-4 lg:sticky lg:top-10 space-y-10 w-full">
            <div className="px-1">
              <DiagnosticsPanel 
                vehicle={activeVehicle} symptom={symptom} setSymptom={setSymptom} 
                diagImage={diagImage} setDiagImage={setDiagImage} isAskingAI={isAskingAI} 
                onAnalyze={async () => {
                  setIsAskingAI(true);
                  try {
                    const advice = await getAdvancedDiagnostic(activeVehicle, symptom, user?.tier === 'premium', diagImage || undefined);
                    setAiAdvice(advice);
                    if (advice.partsIdentified) setSuggestedParts(advice.partsIdentified);
                  } catch (e) { alert("Neural Analysis Error"); } finally { setIsAskingAI(false); }
                }} aiAdvice={aiAdvice} 
              />
            </div>
            
            <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-200">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Quick Insights</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-slate-500">Service Coverage</span>
                  <span className="text-slate-900">{vehicleTasks.filter(t => t.status === 'completed').length} / {vehicleTasks.length}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(vehicleTasks.filter(t => t.status === 'completed').length / (vehicleTasks.length || 1)) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        !isLoadingDetails && (
          <div className="py-24 sm:py-32 lg:py-48 text-center bg-white rounded-[3rem] border border-slate-100 p-10 sm:p-20 shadow-sm mx-auto max-w-3xl">
             <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-8 sm:mb-10 shadow-inner">🛰️</div>
             <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Fleet Management Offline</h3>
             <p className="text-slate-400 mb-10 sm:mb-12 text-[9px] sm:text-[10px] font-black uppercase tracking-widest max-w-sm mx-auto">Initialize a digital twin using the Deploy Asset feature in your sidebar</p>
             <button onClick={() => setCurrentView('onboarding')} className="w-full sm:w-auto bg-slate-900 text-white px-10 sm:px-12 py-5 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase tracking-widest text-[10px] sm:text-[11px] shadow-3xl hover:bg-blue-600 transition-all">Start Onboarding →</button>
          </div>
        )
      )}

      {showOdometerModal && activeVehicle && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl">
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
