
import React, { useState, useEffect, useRef } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { getAdvancedDiagnostic, decodeVIN } from '../services/geminiService.ts';
import { registerNewVehicle } from '../services/vehicleRegistrationService.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, updateVehicleData, 
  updateTaskStatus, createServiceLogEntry, uploadVehicleImage
} from '../services/vehicleService.ts';
import { MaintenanceTask, BodyType } from '../shared/types.ts';
import { isValidVIN, compressImage } from '../shared/utils.ts';
import { OdometerInput } from './OdometerInput.tsx';

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
  const [vinError, setVinError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleIdentifyAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setVinError(null);

    if (newVin.length !== 17) {
      setVinError("Chassis number must be exactly 17 characters.");
      return;
    }

    if (!isValidVIN(newVin)) {
      setVinError("Invalid format. VINs do not contain letters I, O, or Q.");
      return;
    }

    setIsProcessing(true);
    try {
      const decoded = await decodeVIN(newVin);
      setManualData({ ...manualData, make: decoded.make, model: decoded.model, year: decoded.year, bodyType: decoded.bodyType as BodyType });
      setRegStep('manual');
    } catch (err) {
      // Fallback to manual entry if AI decoding fails but let user know
      setRegStep('manual');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const vehicle = await registerNewVehicle(user?.id || 'guest', newVin, manualData);
      if (selectedImage && user?.id) {
        try {
          const compressed = await compressImage(selectedImage, 800, 0.7);
          const finalImageUrl = await uploadVehicleImage(user.id, vehicle.id, compressed);
          await updateVehicleData(vehicle.id, { imageUrls: [finalImageUrl] });
          vehicle.imageUrls = [finalImageUrl];
        } catch (imgErr) { console.error(imgErr); }
      }
      addVehicle(vehicle);
      setActiveVehicleId(vehicle.id);
      closeModal();
    } catch (err) { alert("Registration failed."); } finally { setIsProcessing(false); }
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
    } catch (e) { alert("AI unavailable."); } finally { setIsAskingAI(false); }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setRegStep('vin');
    setNewVin('');
    setVinError(null);
    setSelectedImage(null);
    setImagePreview(null);
    setManualData({ make: '', model: '', year: new Date().getFullYear(), bodyType: 'sedan', mileage: 0 });
  };

  const onVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setNewVin(val);
    if (vinError) setVinError(null);
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-slide-up">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">Garage</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-4">Fleet Intel v3.0</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full md:w-auto bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all"
        >
          + Add New Asset
        </button>
      </header>

      {/* Asset Switcher */}
      {vehicles.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
          {vehicles.map(v => (
            <button 
              key={v.id}
              onClick={() => setActiveVehicleId(v.id)}
              className={`flex-shrink-0 px-8 py-6 rounded-[2.5rem] border-2 transition-all min-w-[200px] text-left ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
            >
              <div className="text-[9px] font-black uppercase opacity-40 mb-1 tracking-widest">{v.make}</div>
              <div className="text-xl font-black tracking-tight">{v.model}</div>
              <div className="mt-4 flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${activeVehicleId === v.id ? 'bg-blue-400' : 'bg-slate-200'}`}></div>
                <span className="text-[10px] font-mono opacity-50">{v.vin.slice(-6)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {activeVehicle ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          <div className="lg:col-span-8 space-y-8 md:space-y-12">
            <VehicleOverview vehicle={activeVehicle} onUpdateOdometer={() => setShowOdometerModal(true)} />
            <MaintenanceRoadmap vehicle={activeVehicle} tasks={pendingTasks} onComplete={handleTaskCompletion} isLoading={isLoadingDetails} />
          </div>
          <aside className="lg:col-span-4">
            <div className="sticky top-32">
              <DiagnosticsPanel 
                vehicle={activeVehicle} symptom={symptom} setSymptom={setSymptom} 
                diagImage={diagImage} setDiagImage={setDiagImage} isAskingAI={isAskingAI} 
                onAnalyze={handleDiagnosticAnalysis} aiAdvice={aiAdvice} 
              />
            </div>
          </aside>
        </div>
      ) : (
        <div className="py-32 md:py-48 text-center bg-white card-radius border-2 border-dashed border-slate-100 shadow-sm">
           <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 animate-bounce">🏎️</div>
           <h3 className="text-3xl font-black text-slate-900 mb-2">No Assets Detected</h3>
           <p className="text-slate-400 mb-10 max-w-xs mx-auto text-sm font-medium">Register your first vehicle to unlock real-time intelligence and maintenance roadmaps.</p>
           <button onClick={() => setShowAddModal(true)} className="bg-slate-900 text-white px-12 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-blue-600 transition-colors">Start Onboarding</button>
        </div>
      )}

      {/* Modals - Uniform Design */}
      {showOdometerModal && activeVehicle && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-sm">
            <OdometerInput value={activeVehicle.mileage} onSave={async (v) => { await updateMileage(activeVehicle.id, v); await updateVehicleData(activeVehicle.id, { mileage: v }); setShowOdometerModal(false); }} onCancel={() => setShowOdometerModal(false)} />
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl card-radius p-8 md:p-14 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto scrollbar-hide">
             {isProcessing && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div><p className="mt-6 font-black text-slate-900 uppercase tracking-widest text-[10px]">Processing...</p></div>}
            
            <button onClick={closeModal} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 text-3xl font-light">×</button>
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">Register Asset</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">
              {regStep === 'vin' ? 'Enter Chassis Number' : 'Confirm Vehicle Data'}
            </p>

            {regStep === 'vin' ? (
              <form onSubmit={handleIdentifyAsset} className="space-y-8">
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-4 mr-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">17-Digit VIN</label>
                    <span className={`text-[10px] font-bold ${newVin.length === 17 ? 'text-emerald-500' : 'text-slate-300'}`}>
                      {newVin.length}/17
                    </span>
                  </div>
                  <input 
                    type="text" 
                    required 
                    maxLength={17} 
                    placeholder="ABC1234567890XYZ" 
                    className={`w-full px-8 py-6 bg-slate-50 border ${vinError ? 'border-rose-300 ring-2 ring-rose-50' : 'border-slate-100'} rounded-[1.5rem] font-mono text-xl uppercase tracking-[0.1em] focus:ring-4 focus:ring-blue-600/5 outline-none text-center transition-all`} 
                    value={newVin} 
                    onChange={onVinChange} 
                  />
                  {vinError && (
                    <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-1">
                      {vinError}
                    </p>
                  )}
                </div>
                <div className="space-y-4 pt-4">
                  <button 
                    disabled={isProcessing || newVin.length < 17} 
                    className="w-full bg-slate-900 text-white py-6 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-slate-900/20 disabled:opacity-20 transition-all hover:bg-blue-600"
                  >
                    Identify Vehicle
                  </button>
                  <button type="button" onClick={() => { setVinError(null); setRegStep('manual'); }} className="w-full text-[10px] font-black text-blue-600 uppercase tracking-widest">Skip to Manual Form</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleFinalizeRegistration} className="space-y-6">
                <div className="flex flex-col items-center mb-8">
                  <input type="file" hidden ref={imageInputRef} accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setSelectedImage(file); const r = new FileReader(); r.onloadend = () => setImagePreview(r.result as string); r.readAsDataURL(file); } }} />
                  <div onClick={() => imageInputRef.current?.click()} className="w-32 h-32 bg-slate-50 rounded-[2rem] border-2 border-slate-100 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 transition-all group relative ring-8 ring-slate-50">
                    {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="V" /> : <span className="text-slate-300 text-2xl">📷</span>}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[8px] font-black uppercase tracking-widest">Edit</span>
                    </div>
                  </div>
                  <p className="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Upload Asset Photo</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Make</label>
                    <input type="text" required placeholder="Make" className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-sm font-bold border border-slate-100 outline-none" value={manualData.make} onChange={e => setManualData({...manualData, make: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Model</label>
                    <input type="text" required placeholder="Model" className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-sm font-bold border border-slate-100 outline-none" value={manualData.model} onChange={e => setManualData({...manualData, model: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Year</label>
                    <input type="number" required placeholder="Year" className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-sm font-bold border border-slate-100 outline-none" value={manualData.year} onChange={e => setManualData({...manualData, year: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Body Style</label>
                    <select className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-sm font-bold border border-slate-100 outline-none appearance-none" value={manualData.bodyType} onChange={e => setManualData({...manualData, bodyType: e.target.value as BodyType})}>
                      <option value="sedan">Sedan</option><option value="suv">SUV</option><option value="truck">Truck</option><option value="van">Van</option><option value="coupe">Coupe</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Current Mileage (KM)</label>
                  <input type="number" required placeholder="Mileage (km)" className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-sm font-bold border border-slate-100 outline-none" value={manualData.mileage} onChange={e => setManualData({...manualData, mileage: parseInt(e.target.value)})} />
                </div>
                <div className="pt-6 flex gap-4">
                   <button type="button" onClick={() => setRegStep('vin')} className="flex-1 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-400">Back</button>
                   <button disabled={isProcessing} className="flex-[2] bg-blue-600 text-white py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20">Finalize Asset</button>
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
