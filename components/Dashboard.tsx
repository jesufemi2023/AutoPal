
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { getAdvancedDiagnostic, decodeVIN } from '../services/geminiService.ts';
import { registerNewVehicle } from '../services/vehicleRegistrationService.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, updateVehicleData, 
  updateTaskStatus, createServiceLogEntry 
} from '../services/vehicleService.ts';
import { MaintenanceTask, BodyType } from '../shared/types.ts';
import { isValidVIN } from '../shared/utils.ts';
import { OdometerInput } from './OdometerInput.tsx';

// Refactored Sub-components
import { VehicleOverview } from './dashboard/VehicleOverview.tsx';
import { MaintenanceRoadmap } from './dashboard/MaintenanceRoadmap.tsx';
import { DiagnosticsPanel } from './dashboard/DiagnosticsPanel.tsx';

const Dashboard: React.FC = () => {
  const { 
    vehicles, tasks, user, setSuggestedParts,
    addVehicle, updateMileage, completeTask, setTasks, addServiceLog 
  } = useAutoPalStore();

  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [diagImage, setDiagImage] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  const [showOdometerModal, setShowOdometerModal] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [regStep, setRegStep] = useState<'vin' | 'manual'>('vin');
  const [newVin, setNewVin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [manualData, setManualData] = useState({
    make: '', model: '', year: new Date().getFullYear(),
    bodyType: 'sedan' as BodyType, mileage: 0
  });

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

  /**
   * Stage 1: Decode VIN using AI and pre-fill form
   */
  const handleIdentifyAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidVIN(newVin)) {
      alert("Please enter a valid 17-digit VIN.");
      return;
    }

    setIsProcessing(true);
    try {
      const decoded = await decodeVIN(newVin);
      setManualData({
        ...manualData,
        make: decoded.make,
        model: decoded.model,
        year: decoded.year,
        bodyType: decoded.bodyType as BodyType
      });
      setRegStep('manual');
    } catch (err) {
      console.error("VIN Decode Failed:", err);
      // Fallback to manual entry on error, but notify user
      setRegStep('manual');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Stage 2: Finalize registration with confirmed data
   */
  const handleFinalizeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const vehicle = await registerNewVehicle(user?.id || 'guest', newVin, manualData);
      addVehicle(vehicle);
      setActiveVehicleId(vehicle.id);
      closeModal();
    } catch (err) {
      alert("Registration failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTaskCompletion = async (task: MaintenanceTask) => {
    if (!activeVehicle) return;
    try {
      await updateTaskStatus(task.id, 'completed');
      completeTask(task.id, task.estimatedCost || 0, activeVehicle.mileage);
      await createServiceLogEntry({
        vehicleId: activeVehicle.id, taskId: task.id, date: new Date().toISOString(),
        description: task.title, cost: task.estimatedCost || 0, mileage: activeVehicle.mileage, isDirty: false
      });
    } catch (e) { alert("Failed to mark task as done."); }
  };

  const handleDiagnosticAnalysis = async () => {
    if (!activeVehicle) return;
    setIsAskingAI(true);
    try {
      const advice = await getAdvancedDiagnostic(activeVehicle, symptom, user?.tier === 'premium', diagImage || undefined);
      setAiAdvice(advice);
      if (advice.partsIdentified) setSuggestedParts(advice.partsIdentified);
    } catch (e) { alert("AI currently unavailable. Check your connection."); } finally { setIsAskingAI(false); }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setRegStep('vin');
    setNewVin('');
    setManualData({ make: '', model: '', year: new Date().getFullYear(), bodyType: 'sedan', mileage: 0 });
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-slide-in p-4 md:p-0">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">Garage</h1>
          <p className="text-slate-500 font-semibold mt-2">Managing {vehicles.length} assets</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full md:w-auto bg-blue-600 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all shadow-blue-500/20"
        >
          + Register Asset
        </button>
      </header>

      {/* Asset Switcher */}
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4">
        {vehicles.map(v => (
          <button 
            key={v.id}
            onClick={() => setActiveVehicleId(v.id)}
            className={`flex-shrink-0 px-8 py-6 rounded-[2.5rem] border-2 transition-all text-left min-w-[220px] ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl translate-y-[-4px]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
          >
            <div className="text-[10px] font-black uppercase opacity-50 mb-1 tracking-widest">{v.make}</div>
            <div className="text-xl font-black">{v.model}</div>
            <div className="text-[10px] mt-3 opacity-40 font-mono font-bold tracking-tighter">{v.vin}</div>
          </button>
        ))}
      </div>

      {activeVehicle ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <VehicleOverview 
              vehicle={activeVehicle} 
              onUpdateOdometer={() => setShowOdometerModal(true)} 
            />
            
            <MaintenanceRoadmap 
              vehicle={activeVehicle}
              tasks={pendingTasks}
              onComplete={handleTaskCompletion}
              isLoading={isLoadingDetails}
            />
          </div>

          <aside className="lg:col-span-4 space-y-8">
            <DiagnosticsPanel 
              vehicle={activeVehicle}
              symptom={symptom}
              setSymptom={setSymptom}
              diagImage={diagImage}
              setDiagImage={setDiagImage}
              isAskingAI={isAskingAI}
              onAnalyze={handleDiagnosticAnalysis}
              aiAdvice={aiAdvice}
            />
          </aside>
        </div>
      ) : (
        <div className="py-48 text-center bg-white rounded-[4.5rem] border-2 border-dashed border-slate-100 shadow-sm">
           <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-10 animate-bounce">🏎️</div>
           <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Your Garage is Empty</h3>
           <p className="text-slate-500 mb-12 max-w-sm mx-auto font-medium leading-relaxed">Register your vehicle to start receiving JIT intelligence.</p>
           <button onClick={() => setShowAddModal(true)} className="bg-slate-900 text-white px-14 py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-2xl">Register Your First Car</button>
        </div>
      )}

      {/* MODALS */}
      {showOdometerModal && activeVehicle && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-sm">
            <OdometerInput 
              value={activeVehicle.mileage} 
              onSave={async (v) => {
                await updateMileage(activeVehicle.id, v);
                await updateVehicleData(activeVehicle.id, { mileage: v });
                setShowOdometerModal(false);
              }} 
              onCancel={() => setShowOdometerModal(false)} 
            />
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 md:p-16 shadow-2xl relative overflow-hidden">
             {isProcessing && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center"><div className="scan-line top-1/2"></div><p className="font-black text-blue-600 animate-pulse text-[10px] tracking-widest uppercase mt-4">{regStep === 'vin' ? 'Decoding Chassis...' : 'Finalizing Digital Twin...'}</p></div>}
            
            <button onClick={closeModal} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl font-black">×</button>
            <h2 className="text-4xl font-black text-slate-900 mb-6 text-center tracking-tighter">Register Asset</h2>
            <p className="text-slate-400 text-center text-xs font-bold uppercase tracking-widest mb-10">
              {regStep === 'vin' ? 'Provide Chassis Number for AI Identification' : 'Verify Detected Details & Add Mileage'}
            </p>

            {regStep === 'vin' ? (
              <form onSubmit={handleIdentifyAsset} className="space-y-10">
                <input 
                  type="text" required maxLength={17} placeholder="17-Digit Chassis (VIN)" 
                  className="w-full px-8 py-8 bg-slate-50 border border-slate-100 rounded-[2rem] font-mono text-2xl uppercase tracking-[0.2em] focus:ring-4 focus:ring-blue-600/10 outline-none text-center shadow-inner" 
                  value={newVin} onChange={(e) => setNewVin(e.target.value.toUpperCase())} 
                />
                <div className="space-y-4">
                  <button disabled={isProcessing || newVin.length < 17} className="w-full bg-slate-900 text-white py-8 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all text-xs shadow-2xl disabled:opacity-30">
                    Identify Asset
                  </button>
                  <button type="button" onClick={() => setRegStep('manual')} className="w-full text-[10px] font-black text-blue-600 uppercase tracking-widest">Skip to Manual Entry</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleFinalizeRegistration} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Make</label>
                    <input type="text" required placeholder="Make" className="w-full px-6 py-5 bg-slate-50 rounded-2xl text-sm font-bold border border-slate-100 outline-none focus:border-blue-500" value={manualData.make} onChange={e => setManualData({...manualData, make: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Model</label>
                    <input type="text" required placeholder="Model" className="w-full px-6 py-5 bg-slate-50 rounded-2xl text-sm font-bold border border-slate-100 outline-none focus:border-blue-500" value={manualData.model} onChange={e => setManualData({...manualData, model: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Year</label>
                    <input type="number" required placeholder="Year" className="w-full px-6 py-5 bg-slate-50 rounded-2xl text-sm font-bold border border-slate-100 outline-none focus:border-blue-500" value={manualData.year} onChange={e => setManualData({...manualData, year: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Body Style</label>
                    <select className="w-full px-6 py-5 bg-slate-50 rounded-2xl text-sm font-bold appearance-none border border-slate-100 outline-none focus:border-blue-500" value={manualData.bodyType} onChange={e => setManualData({...manualData, bodyType: e.target.value as BodyType})}>
                      <option value="sedan">Sedan</option>
                      <option value="suv">SUV</option>
                      <option value="truck">Truck</option>
                      <option value="van">Van</option>
                      <option value="coupe">Coupe</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Current Odometer (KM)</label>
                  <input type="number" required placeholder="Current Mileage (km)" className="w-full px-6 py-5 bg-slate-50 rounded-2xl text-sm font-bold border border-slate-100 outline-none focus:border-blue-500" value={manualData.mileage} onChange={e => setManualData({...manualData, mileage: parseInt(e.target.value)})} />
                </div>
                <div className="pt-4 flex gap-4">
                   <button type="button" onClick={() => setRegStep('vin')} className="flex-1 py-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400">Back</button>
                   <button disabled={isProcessing} className="flex-[2] bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-blue-600 transition-all shadow-2xl disabled:opacity-30">
                     Complete Registration
                   </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
