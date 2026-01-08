
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { getAdvancedDiagnostic } from '../services/geminiService.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, 
  updateTaskStatus, createServiceLogEntry, archiveVehicle, updateVehicle
} from '../services/vehicleService.ts';
import { OdometerInput } from './OdometerInput.tsx';
import { Vehicle } from '../shared/types.ts';

import { VehicleOverview } from './dashboard/VehicleOverview.tsx';
import { MaintenanceRoadmap } from './dashboard/MaintenanceRoadmap.tsx';
import { DiagnosticsPanel } from './dashboard/DiagnosticsPanel.tsx';

const Dashboard: React.FC = () => {
  const { 
    vehicles, tasks, user, setSuggestedParts,
    // Add serviceLogs to destructuring from the store
    updateMileage, completeTask, setTasks, addServiceLog, setCurrentView,
    updateVehicleStore, removeVehicleStore, setEditingVehicle, serviceLogs
  } = useAutoPalStore();

  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [diagImage, setDiagImage] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  
  const [showOdometerModal, setShowOdometerModal] = useState(false);
  
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);
  const pendingTasks = tasks.filter(t => t.vehicleId === activeVehicleId && t.status === 'pending');
  // Compute activeLogs for the selected vehicle to pass to sub-components
  const activeLogs = serviceLogs.filter(l => l.vehicleId === activeVehicleId);

  useEffect(() => {
    if (vehicles.length > 0 && !activeVehicleId) setActiveVehicleId(vehicles[0].id);
  }, [vehicles, activeVehicleId]);

  useEffect(() => {
    if (activeVehicleId) {
      setIsLoadingDetails(true);
      setGlobalError(null);
      Promise.all([
        fetchVehicleTasks(activeVehicleId),
        fetchVehicleServiceLogs(activeVehicleId)
      ])
      .then(([taskList, logList]) => {
        setTasks(taskList);
        logList.forEach(addServiceLog);
      })
      .catch((err) => {
        setGlobalError(err.message || "Intelligence synchronization failure.");
      })
      .finally(() => {
        setIsLoadingDetails(false);
      });
    }
  }, [activeVehicleId, setTasks, addServiceLog]);

  const handleArchive = async () => {
    if (!activeVehicleId || !confirm("Are you sure? This will archive the vehicle and its history.")) return;
    try {
      await archiveVehicle(activeVehicleId);
      removeVehicleStore(activeVehicleId);
      setActiveVehicleId(null);
    } catch (e: any) { alert(e.message); }
  };

  const startEdit = () => {
    if (!activeVehicleId) return;
    setEditingVehicle(activeVehicleId);
    setCurrentView('edit');
  };

  return (
    <div className="space-y-12 md:space-y-20 lg:space-y-24">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 md:gap-10 px-2">
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-[0.85]">Garage</h1>
          <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[8px] sm:text-[10px] ml-1 sm:ml-2">Intelligence Command v4.0.2</p>
        </div>
        <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
          <button 
            onClick={() => setCurrentView('fuel')}
            className="flex-1 sm:flex-none bg-emerald-600 text-white px-6 sm:px-10 py-4 sm:py-6 rounded-2xl sm:rounded-[2rem] font-black uppercase tracking-widest text-[10px] sm:text-[11px] shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all"
          >
            ⛽ Fuel Logic
          </button>
          <button 
            onClick={() => setCurrentView('onboarding')}
            className="flex-1 sm:flex-none bg-blue-600 text-white px-6 sm:px-10 py-4 sm:py-6 rounded-2xl sm:rounded-[2rem] font-black uppercase tracking-widest text-[10px] sm:text-[11px] shadow-2xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            + Deploy Asset
          </button>
          {activeVehicle && (
            <button 
              onClick={startEdit}
              className="flex-1 sm:flex-none bg-white border-2 border-slate-100 text-slate-900 px-6 sm:px-10 py-4 sm:py-6 rounded-2xl sm:rounded-[2rem] font-black uppercase tracking-widest text-[10px] sm:text-[11px] shadow-sm active:scale-95 transition-all"
            >
              ⚙ Tuning
            </button>
          )}
        </div>
      </header>

      {globalError && (
        <div className="bg-rose-50 border-2 border-rose-100 p-6 sm:p-8 rounded-2xl sm:rounded-[3rem] flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-rose-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-center sm:text-left">{globalError}</p>
          <button onClick={() => window.location.reload()} className="w-full sm:w-auto text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white px-8 py-4 rounded-xl sm:rounded-2xl shadow-xl shadow-rose-500/20">Restart Engine</button>
        </div>
      )}

      {vehicles.length > 0 ? (
        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 sm:-mx-0 sm:px-0">
          {vehicles.map(v => (
            <button 
              key={v.id}
              onClick={() => setActiveVehicleId(v.id)}
              className={`flex-shrink-0 px-8 sm:px-10 py-6 sm:py-8 rounded-2xl sm:rounded-[3rem] border-2 transition-all min-w-[180px] sm:min-w-[240px] text-left relative overflow-hidden group ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-3xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
            >
              <div className="text-[8px] sm:text-[9px] font-black uppercase opacity-40 mb-1 tracking-widest truncate">{v.make}</div>
              <div className="text-lg sm:text-2xl font-black tracking-tighter truncate">{v.model}</div>
              <div className={`w-2.5 h-2.5 rounded-full mt-4 sm:mt-6 ${activeVehicleId === v.id ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
            </button>
          ))}
        </div>
      ) : null}

      {activeVehicle ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-8 space-y-12 lg:space-y-20">
            <VehicleOverview vehicle={activeVehicle} onUpdateOdometer={() => setShowOdometerModal(true)} />
            
            {/* Fix: Removed non-existent 'logs' prop from MaintenanceRoadmap */}
            <MaintenanceRoadmap 
              vehicle={activeVehicle} 
              tasks={pendingTasks} 
              isLoading={isLoadingDetails}
              // Fixed: renamed onComplete to onLog to match MaintenanceRoadmap Props
              onLog={t => {
                updateTaskStatus(t.id, 'completed')
                  .then(() => {
                    completeTask(t.id, t.estimatedCost || 0, activeVehicle.mileage);
                    // Fixed: added category and ensured taskId/status are valid for ServiceLog
                    createServiceLogEntry({
                      vehicleId: activeVehicle.id, 
                      taskId: t.id, 
                      serviceDate: new Date().toISOString(),
                      serviceType: t.title, 
                      cost: t.estimatedCost || 0, 
                      mileageAtService: activeVehicle.mileage, 
                      status: 'completed',
                      category: t.category
                    });
                  });
              }} 
            />

            <div className="pt-10 sm:pt-16 border-t border-slate-100 flex justify-center pb-12 lg:pb-0">
               <button onClick={handleArchive} className="text-slate-300 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] hover:text-rose-500 transition-all">
                 Decommission Digital Twin
               </button>
            </div>
          </div>

          <aside className="lg:col-span-4 lg:sticky lg:top-32">
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
          <div className="py-24 sm:py-48 text-center bg-white card-radius border-4 border-dashed border-slate-100 px-6 sm:px-16">
             <div className="w-20 h-20 sm:w-32 sm:h-32 bg-slate-50 rounded-2xl sm:rounded-[4rem] flex items-center justify-center text-4xl sm:text-5xl mx-auto mb-8 sm:mb-12 shadow-inner">🛰️</div>
             <h3 className="text-2xl sm:text-4xl font-black text-slate-900 mb-2 sm:mb-4 tracking-tighter">Command Center Offline</h3>
             <p className="text-slate-400 mb-10 sm:mb-16 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">No Active Assets Detected in Neural Link</p>
             <button onClick={() => setCurrentView('onboarding')} className="w-full sm:w-auto bg-slate-900 text-white px-10 sm:px-16 py-6 sm:py-8 rounded-2xl sm:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] shadow-3xl hover:bg-blue-600 transition-all">Deploy Digital Twin</button>
          </div>
        )
      )}

      {showOdometerModal && activeVehicle && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="w-full max-w-md">
            <OdometerInput value={activeVehicle.mileage} onSave={async (v) => { 
              await updateMileage(activeVehicle.id, v); 
              await updateVehicle(activeVehicle.id, { mileage: v }); 
              setShowOdometerModal(false); 
            }} onCancel={() => setShowOdometerModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
