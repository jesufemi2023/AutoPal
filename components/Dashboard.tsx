
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
    make: '', 
    model: '', 
    year: new Date().getFullYear(),
    bodyType: 'sedan' as BodyType, 
    mileage: 0,
    fuelType: 'petrol',
    engineSize: '',
    specs: {
      tireSize: '',
      oilGrade: '',
      batteryType: ''
    }
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
      setVinError("Chassis ID must be 17 characters.");
      return;
    }

    if (!isValidVIN(newVin)) {
      setVinError("Invalid VIN format. (Avoid I, O, Q)");
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
        bodyType: (decoded.bodyType as BodyType) || 'sedan' 
      });
      setRegStep('manual');
    } catch (err) {
      setRegStep('manual');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const vehicle = await registerNewVehicle(user?.id || 'guest', newVin, {
        ...manualData
      });
      
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

  const closeModal = () => {
    setShowAddModal(false);
    setRegStep('vin');
    setNewVin('');
    setVinError(null);
    setSelectedImage(null);
    setImagePreview(null);
    setManualData({ 
      make: '', model: '', year: new Date().getFullYear(), bodyType: 'sedan', 
      mileage: 0, fuelType: 'petrol', engineSize: '',
      specs: { tireSize: '', oilGrade: '', batteryType: '' }
    });
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
            <MaintenanceRoadmap vehicle={activeVehicle} tasks={pendingTasks} onComplete={t => {
              updateTaskStatus(t.id, 'completed')
                .then(() => {
                  completeTask(t.id, t.estimatedCost || 0, activeVehicle.mileage);
                  createServiceLogEntry({
                    vehicleId: activeVehicle.id, taskId: t.id, date: new Date().toISOString(),
                    description: t.title, cost: t.estimatedCost || 0, mileage: activeVehicle.mileage, isDirty: false
                  });
                });
            }} isLoading={isLoadingDetails} />
          </div>
          <aside className="lg:col-span-4">
            <div className="sticky top-32">
              <DiagnosticsPanel 
                vehicle={activeVehicle} symptom={symptom} setSymptom={setSymptom} 
                diagImage={diagImage} setDiagImage={setDiagImage} isAskingAI={isAskingAI} 
                onAnalyze={async () => {
                  setIsAskingAI(true);
                  try {
                    const advice = await getAdvancedDiagnostic(activeVehicle, symptom, user?.tier === 'premium', diagImage || undefined);
                    setAiAdvice(advice);
                    if (advice.partsIdentified) setSuggestedParts(advice.partsIdentified);
                  } catch (e) { alert("AI Service Error"); } finally { setIsAskingAI(false); }
                }} aiAdvice={aiAdvice} 
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

      {/* MODAL: REGISTER ASSET */}
      {showAddModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-3xl relative flex flex-col max-h-[90vh] overflow-hidden border border-white/20">
            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-md z-[110] flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-8 font-black text-slate-900 uppercase tracking-[0.3em] text-[10px]">Syncing Digital Twin...</p>
              </div>
            )}

            {/* Modal Header */}
            <div className="p-8 md:p-12 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Add Asset</h2>
                <div className="flex items-center gap-3 mt-2">
                  <div className={`w-2 h-2 rounded-full ${regStep === 'vin' ? 'bg-blue-600 animate-pulse' : 'bg-emerald-500'}`}></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {regStep === 'vin' ? 'Stage 01: Identification' : 'Stage 02: Verification'}
                  </span>
                </div>
              </div>
              <button onClick={closeModal} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-900 text-3xl font-light">×</button>
            </div>

            {/* Modal Body */}
            <div className="flex-grow overflow-y-auto scrollbar-hide p-8 md:p-12 bg-slate-50/30">
              {regStep === 'vin' ? (
                <form onSubmit={handleIdentifyAsset} className="space-y-12 max-w-md mx-auto py-12">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-8">🔍</div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Extract Fleet Data</h3>
                    <p className="text-slate-400 text-sm font-medium">Input your 17-digit Chassis ID for instant technical decoding.</p>
                  </div>
                  <div className="space-y-4">
                    <input 
                      type="text" required maxLength={17} placeholder="ABC1234567890XYZ"
                      className={`w-full px-8 py-7 bg-white border-2 ${vinError ? 'border-rose-400' : 'border-slate-200'} rounded-[2rem] font-mono text-2xl uppercase tracking-[0.1em] focus:border-blue-600 outline-none text-center shadow-sm transition-all`}
                      value={newVin} onChange={e => { setNewVin(e.target.value.toUpperCase()); setVinError(null); }}
                    />
                    {vinError && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest text-center">{vinError}</p>}
                  </div>
                  <div className="space-y-4 pt-4">
                    <button disabled={newVin.length < 17} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-blue-600 transition-all disabled:opacity-20">Analyze Vehicle ID</button>
                    <button type="button" onClick={() => setRegStep('manual')} className="w-full text-[10px] font-black text-blue-600 uppercase tracking-widest">Manual Setup (Skip Decoding)</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleFinalizeRegistration} className="space-y-12 pb-24">
                  {/* Photo Hero Section */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
                    <div className="relative group">
                      <input type="file" hidden ref={imageInputRef} accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setSelectedImage(f); const r = new FileReader(); r.onloadend = () => setImagePreview(r.result as string); r.readAsDataURL(f); } }} />
                      <div onClick={() => imageInputRef.current?.click()} className="w-32 h-32 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer group-hover:border-blue-500 transition-all">
                        {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="V" /> : <span className="text-slate-300 text-4xl">📷</span>}
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Chassis ID</div>
                      <div className="text-2xl font-mono font-bold text-slate-900 tracking-tight">{newVin || 'MANUAL-ASSET-01'}</div>
                    </div>
                  </div>

                  {/* Bento Grid Form Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Identity Card */}
                    <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">01</div>
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Asset Origin</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Make / OEM</label>
                          <input type="text" required placeholder="e.g. Toyota" className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-blue-500 focus:bg-white outline-none" value={manualData.make} onChange={e => setManualData({...manualData, make: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Model Range</label>
                          <input type="text" required placeholder="e.g. Land Cruiser" className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-blue-500 focus:bg-white outline-none" value={manualData.model} onChange={e => setManualData({...manualData, model: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    {/* Performance Card */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-xs">02</div>
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Mechanical Specs</h3>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Build Year</label>
                          <input type="number" required className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-blue-500 focus:bg-white outline-none" value={manualData.year} onChange={e => setManualData({...manualData, year: parseInt(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Fuel Source</label>
                          <select className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-blue-500 focus:bg-white outline-none appearance-none" value={manualData.fuelType} onChange={e => setManualData({...manualData, fuelType: e.target.value})}>
                            <option value="petrol">Premium Petrol</option><option value="diesel">Diesel</option><option value="hybrid">Hybrid</option><option value="electric">Electric (EV)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Engine Capacity</label>
                          <input type="text" placeholder="e.g. V6 / 2.5L" className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-blue-500 focus:bg-white outline-none" value={manualData.engineSize} onChange={e => setManualData({...manualData, engineSize: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Body Configuration</label>
                          <select className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-blue-500 focus:bg-white outline-none appearance-none" value={manualData.bodyType} onChange={e => setManualData({...manualData, bodyType: e.target.value as BodyType})}>
                            <option value="sedan">Saloon / Sedan</option><option value="suv">SUV / 4x4</option><option value="truck">Truck / Pickup</option><option value="van">Commercial Van</option><option value="coupe">Sport Coupe</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Consumables/Blueprint Card */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">03</div>
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Maintenance Refs</h3>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Odometer (Kilometers)</label>
                          <input type="number" required placeholder="0" className="w-full px-6 py-6 bg-blue-50 border-2 border-blue-200 rounded-[1.5rem] text-2xl font-mono font-black text-blue-600 focus:bg-white outline-none" value={manualData.mileage} onChange={e => setManualData({...manualData, mileage: parseInt(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Tire Dimensions</label>
                          <input type="text" placeholder="e.g. 265/60 R18" className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-blue-500 focus:bg-white outline-none" value={manualData.specs.tireSize} onChange={e => setManualData({...manualData, specs: {...manualData.specs, tireSize: e.target.value}})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Required Oil Grade</label>
                          <input type="text" placeholder="e.g. 5W-30 Full Synth" className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-blue-500 focus:bg-white outline-none" value={manualData.specs.oilGrade} onChange={e => setManualData({...manualData, specs: {...manualData.specs, oilGrade: e.target.value}})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Battery Spec</label>
                          <input type="text" placeholder="e.g. 75Ah / 12V" className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-blue-500 focus:bg-white outline-none" value={manualData.specs.batteryType} onChange={e => setManualData({...manualData, specs: {...manualData.specs, batteryType: e.target.value}})} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Sticky Footer */}
                  <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex gap-6 shrink-0 z-50">
                    <button type="button" onClick={() => setRegStep('vin')} className="flex-1 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Back</button>
                    <button disabled={isProcessing} className="flex-[3] bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-blue-600/30 active:scale-95 transition-all">Finalize Digital Twin</button>
                  </div>
                </form>
              )}
            </div>
          </div>
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
