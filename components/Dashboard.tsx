import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { getAdvancedDiagnostic } from '../services/geminiService.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, updateVehicleData, 
  updateTaskStatus, createServiceLogEntry
} from '../services/vehicleService.ts';
import { OdometerInput } from './OdometerInput.tsx';

import { VehicleOverview } from './dashboard/VehicleOverview.tsx';
import { MaintenanceRoadmap } from './dashboard/MaintenanceRoadmap.tsx';
import { DiagnosticsPanel } from './dashboard/DiagnosticsPanel.tsx';

const Dashboard: React.FC = () => {
  const { 
    vehicles, tasks, user, setSuggestedParts,
    updateMileage, completeTask, setTasks, addServiceLog, setCurrentView
  } = useAutoPalStore();

  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [diagImage, setDiagImage] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  const [showOdometerModal, setShowOdometerModal] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);
  const pendingTasks = tasks.filter(t => t.vehicleId === activeVehicleId && t.status === 'pending');

  useEffect(() => {
    if (vehicles.length > 0 && !activeVehicleId) setActiveVehicleId(vehicles[0].id);
  }, [vehicles, activeVehicleId]);

  useEffect(() => {
    if (activeVehicleId) {
      setIsLoadingDetails(true);
      Promise.all([
        fetchVehicleTasks(activeVehicleId),
        fetchVehicleServiceLogs(activeVehicleId)
      ]).then(([taskList, logList]) => {
        setTasks(taskList);
        logList.forEach(addServiceLog);
        setIsLoadingDetails(false);
      });
    }
  }, [activeVehicleId, setTasks, addServiceLog]);

  return (
    <div className="space-y-6 md:space-y-10 lg:space-y-16">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 px-2">
        <div>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter leading-none">Garage</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-4">Intelligence Platform v3.5</p>
        </div>
        <button 
          onClick={() => setCurrentView('onboarding')}
          className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 md:py-6 rounded-2xl lg:rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
        >
          + Add New Asset
        </button>
      </header>

      {vehicles.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4">
          {vehicles.map(v => (
            <button 
              key={v.id}
              onClick={() => setActiveVehicleId(v.id)}
              className={`flex-shrink-0 px-8 py-6 rounded-[2.5rem] border-2 transition-all min-w-[200px] lg:min-w-[240px] text-left ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
            >
              <div className="text-[9px] font-black uppercase opacity-40 mb-1 tracking-widest truncate">{v.make}</div>
              <div className="text-xl lg:text-2xl font-black tracking-tight truncate">{v.model}</div>
              <div className={`w-2 h-2 rounded-full mt-4 ${activeVehicleId === v.id ? 'bg-blue-400' : 'bg-slate-200'}`}></div>
            </button>
          ))}
        </div>
      ) : null}

      {activeVehicle ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="md:col-span-2 lg:col-span-8 space-y-8 lg:space-y-12">
            <VehicleOverview vehicle={activeVehicle} onUpdateOdometer={() => setShowOdometerModal(true)} />
            <MaintenanceRoadmap 
              vehicle={activeVehicle} 
              tasks={pendingTasks} 
              isLoading={isLoadingDetails}
              onComplete={t => {
                updateTaskStatus(t.id, 'completed')
                  .then(() => {
                    completeTask(t.id, t.estimatedCost || 0, activeVehicle.mileage);
                    // Fix: Ensure passed object matches ServiceLog interface property names
                    createServiceLogEntry({
                      vehicleId: activeVehicle.id, 
                      taskId: t.id, 
                      serviceDate: new Date().toISOString(),
                      serviceType: t.title, 
                      cost: t.estimatedCost || 0, 
                      mileageAtService: activeVehicle.mileage, 
                      status: 'completed',
                      isDirty: false
                    });
                  });
              }} 
            />
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
                } catch (e) { alert("AI Sync Error"); } finally { setIsAskingAI(false); }
              }} aiAdvice={aiAdvice} 
            />
          </aside>
        </div>
      ) : (
        <div className="py-32 text-center bg-white card-radius border-2 border-dashed border-slate-100 p-12">
           <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">🏎️</div>
           <h3 className="text-3xl font-black text-slate-900 mb-2">Garage Offline</h3>
           <p className="text-slate-400 mb-12 text-sm font-bold uppercase tracking-widest">Connect an asset to initialize digital twin</p>
           <button onClick={() => setCurrentView('onboarding')} className="bg-slate-900 text-white px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl hover:bg-blue-600 transition-all">Start Onboarding</button>
        </div>
      )}

      {showOdometerModal && activeVehicle && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-sm">
            <OdometerInput value={activeVehicle.mileage} onSave={async (v) => { await updateMileage(activeVehicle.id, v); await updateVehicleData(activeVehicle.id, { mileage: v }); setShowOdometerModal(false); }} onCancel={() => setShowOdometerModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;