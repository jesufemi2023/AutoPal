
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
  const [vinInfo, setVinInfo] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Fix: Initialized with null instead of 0 to match type File | null
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

  const handleIdentifyAsset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setVinError(null);
    setVinInfo(null);
    if (newVin.length !== 17) { setVinError("17 characters required."); return; }
    if (!isValidVIN(newVin)) { setVinError("Invalid VIN. Ensure no I, O, or Q characters."); return; }

    setIsProcessing(true);
    try {
      const decoded = await decodeVIN(newVin);
      setManualData({ 
        ...manualData, 
        make: decoded.make || '', 
        model: decoded.model || '', 
        year: decoded.year || new Date().getFullYear(), 
        bodyType: (decoded.bodyType as BodyType) || 'sedan' 
      });
      setRegStep('manual');
    } catch (err: any) {
      setVinInfo("AI decode limit reached. Proceeding to Manual Calibration...");
      setTimeout(() => {
        setRegStep('manual');
        setVinInfo(null);
      }, 1200);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizeRegistration = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!manualData.make || !manualData.model) {
      alert("Make and Model are required for service roadmap generation.");
      return;
    }
    setIsProcessing(true);
    try {
      const vehicle = await registerNewVehicle(user?.id || 'guest', newVin, { ...manualData });
      if (selectedImage instanceof File && user?.id) {
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
    } catch (err) { alert("Registration failed. Please check network."); } finally { setIsProcessing(false); }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setRegStep('vin');
    setNewVin('');
    setVinError(null);
    setVinInfo(null);
    setImagePreview(null);
    setSelectedImage(null);
    setManualData({ 
      make: '', model: '', year: new Date().getFullYear(), bodyType: 'sedan', 
      mileage: 0, fuelType: 'petrol', engineSize: '',
      specs: { tireSize: '', oilGrade: '', batteryType: '' }
    });
  };

  return (
    <div className="space-y-6 md:space-y-10 lg:space-y-16">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 px-2">
        <div>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter leading-none">Garage</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-4">Intelligence Platform v3.5</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
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
                    createServiceLogEntry({
                      vehicleId: activeVehicle.id, taskId: t.id, date: new Date().toISOString(),
                      description: t.title, cost: t.estimatedCost || 0, mileage: activeVehicle.mileage, isDirty: false
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
           <button onClick={() => setShowAddModal(true)} className="bg-slate-900 text-white px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl hover:bg-blue-600 transition-all">Start Onboarding</button>
        </div>
      )}

      {/* REGISTRATION MODAL: RE-ENGINEERED FOR VISIBILITY */}
      {showAddModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/95 backdrop-blur-3xl p-0 sm:p-6 md:p-12 overflow-hidden animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-full md:h-auto md:max-h-[92vh] md:rounded-[3rem] shadow-4xl flex flex-col relative overflow-hidden border border-white/20">
            
            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xl z-[150] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-6 font-black text-slate-900 uppercase tracking-[0.2em] text-[10px]">Processing Chassis Data...</p>
              </div>
            )}

            {/* HEADER (FIXED) */}
            <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg">A</div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-none">Vehicle Onboarding</h2>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {regStep === 'vin' ? 'Stage 1: Asset Scanning' : 'Stage 2: Technical Calibration'}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-slate-900 transition-colors text-3xl font-light">×</button>
            </div>

            {/* BODY (SCROLLABLE) */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 md:px-10 py-8 bg-slate-50/40">
              {regStep === 'vin' ? (
                <div className="max-w-xl mx-auto py-10 md:py-20 space-y-12">
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-2xl border border-slate-50">🔍</div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Technical Extraction</h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                        Provide the 17-digit Chassis ID (VIN) to map factory roadmaps.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <input 
                      type="text" autoFocus required maxLength={17} placeholder="ABC1234567890XYZ"
                      className={`w-full px-4 md:px-8 py-8 md:py-10 bg-white border-2 ${vinError ? 'border-rose-400 ring-8 ring-rose-50' : 'border-slate-100 shadow-xl'} rounded-[2rem] font-mono text-xl md:text-4xl uppercase tracking-[0.2em] focus:border-blue-600 outline-none text-center transition-all`}
                      value={newVin} onChange={e => { setNewVin(e.target.value.toUpperCase()); setVinError(null); setVinInfo(null); }}
                    />
                    {vinError && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest text-center">{vinError}</p>}
                    {vinInfo && <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest text-center animate-pulse">{vinInfo}</p>}
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-10 pb-12">
                  {/* Photo Section */}
                  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
                    <div className="relative shrink-0">
                      <input type="file" hidden ref={imageInputRef} accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setSelectedImage(f); const r = new FileReader(); r.onloadend = () => setImagePreview(r.result as string); r.readAsDataURL(f); } }} />
                      <div onClick={() => imageInputRef.current?.click()} className="w-28 h-28 md:w-36 md:h-36 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition-all">
                        {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="V" /> : <span className="text-slate-300 text-4xl">📷</span>}
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Asset Reference</div>
                      <div className="text-xl md:text-2xl font-mono font-bold text-slate-900 tracking-tighter break-all">{newVin || 'MANUAL_CALIBRATION'}</div>
                    </div>
                  </div>

                  {/* Manual Data Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    
                    {/* ORIGIN */}
                    <div className="md:col-span-2 bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                       <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-3">
                         <span className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">01</span> Origin Credentials
                       </h4>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                         <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Manufacturer (Make)</label>
                           <input type="text" placeholder="e.g. Toyota" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" value={manualData.make} onChange={e => setManualData({...manualData, make: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Model Range</label>
                           <input type="text" placeholder="e.g. Corolla" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" value={manualData.model} onChange={e => setManualData({...manualData, model: e.target.value})} />
                         </div>
                       </div>
                    </div>

                    {/* ENGINEERING */}
                    <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                       <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-3">
                         <span className="w-6 h-6 bg-emerald-50 rounded-lg flex items-center justify-center">02</span> Engineering
                       </h4>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Year</label>
                           <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none" value={manualData.year} onChange={e => setManualData({...manualData, year: parseInt(e.target.value)})} />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Engine</label>
                           <input type="text" placeholder="e.g. 1.8L" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none" value={manualData.engineSize} onChange={e => setManualData({...manualData, engineSize: e.target.value})} />
                         </div>
                       </div>
                       <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Fuel Configuration</label>
                         <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none appearance-none" value={manualData.fuelType} onChange={e => setManualData({...manualData, fuelType: e.target.value})}>
                            <option value="petrol">Petrol (PMS)</option>
                            <option value="diesel">Diesel (AGO)</option>
                            <option value="hybrid">Hybrid (HEV)</option>
                            <option value="electric">Electric (EV)</option>
                         </select>
                       </div>
                    </div>

                    {/* LIFECYCLE */}
                    <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                       <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-3">
                         <span className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">03</span> Lifecycle
                       </h4>
                       <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Current Mileage (KM)</label>
                         <input type="number" placeholder="0" className="w-full px-6 py-5 bg-blue-50 border-2 border-blue-100 rounded-2xl text-3xl font-mono font-black text-blue-600 outline-none text-center" value={manualData.mileage} onChange={e => setManualData({...manualData, mileage: parseInt(e.target.value)})} />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Body Classification</label>
                         <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none appearance-none" value={manualData.bodyType} onChange={e => setManualData({...manualData, bodyType: e.target.value as BodyType})}>
                            <option value="sedan">Saloon / Sedan</option>
                            <option value="suv">SUV / 4x4 / Jeep</option>
                            <option value="truck">Truck / Pickup</option>
                            <option value="van">Van / MPV</option>
                            <option value="coupe">Coupe / GT</option>
                         </select>
                       </div>
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* FOOTER (FIXED) */}
            <div className="p-6 md:p-10 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-4 shrink-0 z-50">
              {regStep === 'vin' ? (
                <>
                  <button type="button" onClick={() => setRegStep('manual')} className="order-2 sm:order-1 flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Skip to Manual</button>
                  <button disabled={newVin.length < 17} onClick={() => handleIdentifyAsset()} className="order-1 sm:order-2 flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl disabled:opacity-20 hover:bg-blue-600 transition-all">Analyze Matrix</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setRegStep('vin')} className="order-2 sm:order-1 flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Prev Phase</button>
                  <button onClick={() => handleFinalizeRegistration()} className="order-1 sm:order-2 flex-[2] bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-blue-700 transition-all">Initialize Digital Twin</button>
                </>
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
