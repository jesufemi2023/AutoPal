
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { getAdvancedDiagnostic } from '../services/geminiService.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, archiveVehicle, updateVehicle, updateMileage
} from '../services/vehicleService.ts';
import { OdometerInput } from './OdometerInput.tsx';
import { ServiceLogTerminal } from './ServiceLogTerminal.tsx';
import { MaintenanceTask } from '../shared/types.ts';

import { VehicleOverview } from './dashboard/VehicleOverview.tsx';
import { MaintenanceRoadmap } from './dashboard/MaintenanceRoadmap.tsx';
import { DiagnosticsPanel } from './dashboard/DiagnosticsPanel.tsx';
import { VitalityDashboard } from './dashboard/VitalityDashboard.tsx';

const Dashboard: React.FC = () => {
  const { 
    vehicles, tasks, serviceLogs, user, setSuggestedParts,
    completeTask, setTasks, addServiceLog, setCurrentView,
    removeVehicleStore, updateMileage: updateStoreMileage
  } = useAutoPalStore();

  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [diagImage, setDiagImage] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  
  const [showOdometerModal, setShowOdometerModal] = useState(false);
  const [showLogTerminal, setShowLogTerminal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | undefined>();
  
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);
  const pendingTasks = tasks.filter(t => t.vehicleId === activeVehicleId && t.status === 'pending');
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
        // Ensure store matches DB
        logList.forEach(log => {
           if (!serviceLogs.find(sl => sl.id === log.id)) addServiceLog(log);
        });
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

  return (
    <div className="space-y-12 md:space-y-24">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-10 px-2">
        <div className="space-y-2">
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.85]">Garage</h1>
          <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] ml-2">Digital Twin Control v4.5.0</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setCurrentView('onboarding')}
            className="flex-1 sm:flex-none bg-blue-600 text-white px-10 py-6 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            + Deploy Asset
          </button>
        </div>
      </header>

      {vehicles.length > 0 ? (
        <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide -mx-4 px-4">
          {vehicles.map(v => (
            <button 
              key={v.id}
              onClick={() => setActiveVehicleId(v.id)}
              className={`flex-shrink-0 px-10 py-8 rounded-[3rem] border-2 transition-all min-w-[240px] text-left relative overflow-hidden group ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-3xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
            >
              <div className="text-[9px] font-black uppercase opacity-40 mb-1 tracking-widest truncate">{v.make}</div>
              <div className="text-2xl font-black tracking-tighter truncate">{v.model}</div>
              <div className={`w-3 h-3 rounded-full mt-6 ${activeVehicleId === v.id ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
            </button>
          ))}
        </div>
      ) : null}

      {activeVehicle ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="md:col-span-2 lg:col-span-8 space-y-12 lg:space-y-20">
            <VehicleOverview vehicle={activeVehicle} onUpdateOdometer={() => setShowOdometerModal(true)} />
            
            <VitalityDashboard vehicle={activeVehicle} tasks={tasks.filter(t => t.vehicleId === activeVehicle.id)} logs={activeLogs} />

            <MaintenanceRoadmap 
              vehicle={activeVehicle} 
              tasks={pendingTasks} 
              logs={activeLogs}
              isLoading={isLoadingDetails}
              onLog={t => {
                setSelectedTask(t);
                setShowLogTerminal(true);
              }} 
            />

            <div className="pt-16 border-t border-slate-100 flex justify-center">
               <button onClick={handleArchive} className="text-slate-300 text-[9px] font-black uppercase tracking-[0.4em] hover:text-rose-500 transition-all">
                 Decommission Digital Twin
               </button>
            </div>
          </div>

          <aside className="md:col-span-2 lg:col-span-4 lg:sticky lg:top-32">
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
          <div className="py-48 text-center bg-white card-radius border-4 border-dashed border-slate-100 p-16">
             <div className="w-32 h-32 bg-slate-50 rounded-[4rem] flex items-center justify-center text-5xl mx-auto mb-12 shadow-inner">🛰️</div>
             <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Command Center Offline</h3>
             <p className="text-slate-400 mb-16 text-[10px] font-black uppercase tracking-[0.3em]">No Active Assets Detected in Neural Link</p>
             <button onClick={() => setCurrentView('onboarding')} className="bg-slate-900 text-white px-16 py-8 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-3xl hover:bg-blue-600 transition-all">Deploy Digital Twin</button>
          </div>
        )
      )}

      {showOdometerModal && activeVehicle && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-2xl animate-in fade-in duration-500">
          <div className="w-full max-w-md">
            <OdometerInput value={activeVehicle.mileage} onSave={async (v) => { 
              await updateMileage(activeVehicle.id, v); 
              updateStoreMileage(activeVehicle.id, v); 
              setShowOdometerModal(false); 
            }} onCancel={() => setShowOdometerModal(false)} />
          </div>
        </div>
      )}

      {showLogTerminal && activeVehicle && (
        <ServiceLogTerminal 
          vehicleId={activeVehicle.id} 
          currentMileage={activeVehicle.mileage} 
          preselectedTask={selectedTask}
          onClose={() => {
            setShowLogTerminal(false);
            setSelectedTask(undefined);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
