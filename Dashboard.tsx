
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from './shared/store.ts';
import { getAdvancedDiagnostic } from './services/geminiService.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, archiveVehicle, updateMileage, updateVehicle
} from './services/vehicleService.ts';
import { fetchFuelLogs } from './services/fuelService.ts';
import { OdometerInput } from './components/OdometerInput.tsx';
import { MaintenanceTask } from './shared/types.ts';

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
    removeVehicleStore, updateMileage: updateStoreMileage, updateVehicleStore,
    setEditingVehicle
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

  const startTuning = () => {
    if (!activeVehicleId) return;
    setEditingVehicle(activeVehicleId);
    setCurrentView('edit');
  };

  return (
    <div className="space-y-12 lg:space-y-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter mb-2">Garage Report</h1>
          <p className="text-slate-400 font-black uppercase tracking-widest text-[9px]">Strategic Asset Intelligence Active</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setCurrentView('onboarding')}
            className="flex-1 sm:flex-none bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            + Deploy Asset
          </button>
          {activeVehicle && (
            <button 
              onClick={startTuning}
              className="bg-white border-2 border-slate-100 text-slate-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all"
            >
              ⚙ Tuning
            </button>
          )}
        </div>
      </header>

      {vehicles.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {vehicles.map(v => (
            <button 
              key={v.id}
              onClick={() => setActiveVehicleId(v.id)}
              className={`flex-shrink-0 px-8 py-6 rounded-[2rem] border-2 transition-all min-w-[200px] text-left relative ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-300'}`}
            >
              <div className="text-[8px] font-black uppercase opacity-50 mb-1">{v.make}</div>
              <div className="text-xl font-black tracking-tight truncate">{v.model}</div>
              <div className={`w-2.5 h-2.5 rounded-full mt-4 ${activeVehicleId === v.id ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
            </button>
          ))}
        </div>
      )}

      {activeVehicle ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-8 space-y-16 lg:space-y-24">
            <VehicleOverview vehicle={activeVehicle} onUpdateOdometer={() => setShowOdometerModal(true)} />
            
            <ResaleValuationCard 
              vehicle={activeVehicle} 
              tasks={tasks} 
              serviceLogs={activeServiceLogs} 
              fuelLogs={activeFuelLogs} 
            />

            <VitalityDashboard vehicle={activeVehicle} tasks={tasks} logs={activeServiceLogs} fuelLogs={activeFuelLogs} />

            <MaintenanceRoadmap 
              vehicle={activeVehicle} 
              tasks={vehicleTasks} 
              isLoading={isLoadingDetails}
              onLog={() => setCurrentView('service')} 
            />
          </div>

          <aside className="lg:col-span-4 lg:sticky lg:top-10 space-y-10">
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
          </aside>
        </div>
      ) : (
        !isLoadingDetails && (
          <div className="py-32 text-center bg-white rounded-[3rem] border border-slate-100 p-20 shadow-sm">
             <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-10">🛰️</div>
             <h3 className="text-3xl font-black text-slate-900 mb-2">No Assets Deployed</h3>
             <p className="text-slate-400 mb-12 text-[10px] font-black uppercase tracking-widest">Connect your first vehicle to begin analysis</p>
             <button onClick={() => setCurrentView('onboarding')} className="bg-slate-900 text-white px-12 py-6 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl">Initialize Digital Twin</button>
          </div>
        )
      )}

      {showOdometerModal && activeVehicle && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
          <div className="w-full max-w-md">
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
