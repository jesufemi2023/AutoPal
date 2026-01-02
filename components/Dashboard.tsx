
import React, { useState, useEffect, useRef } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { getAdvancedDiagnostic, decodeVIN, generateMaintenanceSchedule, getVehicleAppraisal } from '../services/geminiService.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, createVehicle, updateVehicleData, 
  updateTaskStatus, createServiceLogEntry, createMaintenanceTasksBatch, uploadVehicleImage 
} from '../services/vehicleService.ts';
import { calculateProjectedServiceDate, getHealthColor, getHealthStatusText } from '../services/maintenanceService.ts';
import { AIResponse, Vehicle, MaintenanceTask, BodyType, AppraisalResult } from '../shared/types.ts';
import { formatCurrency, isValidVIN, compressImage } from '../shared/utils.ts';
import { VehicleBlueprint } from './VehicleBlueprint.tsx';
import { OdometerInput } from './OdometerInput.tsx';

const SAMPLE_VIN = "1HGCM82633A004352"; // Reliable sample for testing

const Dashboard: React.FC = () => {
  const { 
    vehicles, tasks, user, setSuggestedParts, addNotification,
    addVehicle, updateMileage, completeTask, setTasks, addServiceLog 
  } = useAutoPalStore();

  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [diagImage, setDiagImage] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<AIResponse | null>(null);
  const [showOdometerModal, setShowOdometerModal] = useState(false);
  
  const [isAppraising, setIsAppraising] = useState(false);
  const [appraisal, setAppraisal] = useState<AppraisalResult | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [regStep, setRegStep] = useState<'choice' | 'vin' | 'preview' | 'manual'>('choice');
  const [newVin, setNewVin] = useState('');
  const [decodedData, setDecodedData] = useState<any>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [manualData, setManualData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    bodyType: 'sedan' as BodyType,
    mileage: 0
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const diagImageRef = useRef<HTMLInputElement>(null);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);
  const pendingTasks = tasks.filter(t => t.vehicleId === activeVehicleId && t.status === 'pending');

  useEffect(() => {
    if (vehicles.length > 0 && !activeVehicleId) {
      setActiveVehicleId(vehicles[0].id);
    }
  }, [vehicles, activeVehicleId]);

  useEffect(() => {
    if (activeVehicleId) {
      setAppraisal(null);
      setAiAdvice(null);
      const loadDetails = async () => {
        setIsLoadingDetails(true);
        try {
          const [tList, sLogs] = await Promise.all([
            fetchVehicleTasks(activeVehicleId),
            fetchVehicleServiceLogs(activeVehicleId)
          ]);
          setTasks(tList);
          sLogs.forEach(log => addServiceLog(log));
        } catch (e) {
          console.error("Dashboard: Data load error", e);
        } finally {
          setIsLoadingDetails(false);
        }
      };
      loadDetails();
    }
  }, [activeVehicleId, setTasks, addServiceLog]);

  const handleMileageUpdate = async (newVal: number) => {
    if (!activeVehicle) return;
    try {
      await updateMileage(activeVehicle.id, newVal);
      await updateVehicleData(activeVehicle.id, { mileage: newVal });
      setShowOdometerModal(false);
      addNotification("Odometer synced successfully.", "success");
    } catch (err) {
      addNotification("Sync failed. Using local state.", "error");
    }
  };

  const handleTaskComplete = async (task: MaintenanceTask) => {
    if (!activeVehicle) return;
    try {
      await updateTaskStatus(task.id, 'completed');
      await createServiceLogEntry({
        vehicleId: activeVehicle.id,
        taskId: task.id,
        date: new Date().toISOString(),
        description: task.title,
        cost: task.estimatedCost || 0,
        mileage: activeVehicle.mileage,
        isDirty: false
      });
      completeTask(task.id, task.estimatedCost || 0, activeVehicle.mileage);
      addNotification(`Task "${task.title}" completed!`, "success");
    } catch (e) {
      console.error("Task completion error", e);
    }
  };

  const finalizeRegistration = async (make: string, model: string, year: number, bodyType: BodyType, vin: string, mileage: number) => {
    setIsProcessing(true);
    try {
      const payload: Omit<Vehicle, 'id'> = {
        ownerId: user?.id || 'unknown',
        make,
        model,
        year,
        vin,
        mileage,
        healthScore: 100,
        bodyType,
        status: 'active',
        imageUrls: uploadedImages,
        isDirty: false
      };

      const saved = await createVehicle(payload);
      addVehicle(saved);
      addNotification(`${make} ${model} registered!`, "success");

      try {
        const roadmap = await generateMaintenanceSchedule(make, model, year, mileage);
        await createMaintenanceTasksBatch(roadmap.tasks.map(t => ({
          ...t,
          vehicleId: saved.id,
          status: 'pending' as const,
          isDirty: false
        })));
      } catch (e) { console.error("Roadmap generation skipped", e); }

      setActiveVehicleId(saved.id);
      closeModal();
    } catch (err) {
      addNotification("Failed to save profile.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setRegStep('choice');
    setNewVin('');
    setDecodedData(null);
    setUploadedImages([]);
    setManualData({ make: '', model: '', year: new Date().getFullYear(), bodyType: 'sedan', mileage: 0 });
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-slide-in p-4 md:p-0">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Garage</h1>
          <p className="text-slate-500 font-semibold mt-1">Smart ownership hub for your assets</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full md:w-auto bg-blue-600 text-white px-8 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
        >
          + Add Vehicle
        </button>
      </header>

      {/* Asset Switcher */}
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4">
        {vehicles.map(v => (
          <button 
            key={v.id}
            onClick={() => setActiveVehicleId(v.id)}
            className={`flex-shrink-0 px-8 py-6 rounded-[2.5rem] border-2 transition-all text-left min-w-[200px] ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl translate-y-[-4px]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
          >
            <div className="flex items-center gap-3">
              {v.imageUrls && v.imageUrls.length > 0 ? (
                <img src={v.imageUrls[0]} className="w-8 h-8 rounded-full object-cover border border-white/20" alt="" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400">?</div>
              )}
              <div>
                <div className="text-[10px] font-black uppercase opacity-60 tracking-widest leading-none">{v.make}</div>
                <div className="text-lg font-black leading-tight">{v.model}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {activeVehicle ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <section className="bg-white rounded-[3rem] md:rounded-[4rem] p-8 md:p-14 border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative">
                <div className="relative group">
                   {activeVehicle.imageUrls && activeVehicle.imageUrls.length > 0 ? (
                     <div className="aspect-[16/9] w-full rounded-3xl overflow-hidden bg-slate-100 shadow-inner relative">
                        {isAppraising && <div className="absolute inset-0 bg-blue-600/10 z-10"><div className="scan-line"></div></div>}
                        <img src={activeVehicle.imageUrls[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={activeVehicle.model} />
                        {activeVehicle.imageUrls.length > 1 && (
                          <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-white">
                            + {activeVehicle.imageUrls.length - 1} More
                          </div>
                        )}
                     </div>
                   ) : (
                     <div className="relative">
                       {isAppraising && <div className="absolute inset-0 bg-blue-600/10 z-10 rounded-3xl overflow-hidden"><div className="scan-line"></div></div>}
                       <VehicleBlueprint type={activeVehicle.bodyType} />
                     </div>
                   )}
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Active Profile</span>
                      <button 
                        onClick={async () => {
                           setIsAppraising(true);
                           try {
                             const result = await getVehicleAppraisal(activeVehicle);
                             setAppraisal(result);
                           } catch (e) { addNotification("Appraisal failed", "error"); } finally { setIsAppraising(false); }
                        }}
                        disabled={isAppraising}
                        className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50"
                      >
                        {isAppraising ? 'Appraising...' : 'Get Market Value'}
                      </button>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">
                      {activeVehicle.year} {activeVehicle.model}
                    </h2>
                    <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">{activeVehicle.vin}</p>
                  </div>
                  
                  {appraisal && (
                    <div className="bg-blue-600 text-white rounded-3xl p-6 animate-slide-in">
                      <div className="text-[10px] font-black uppercase opacity-60 mb-1 tracking-widest">Est. Market Value</div>
                      <div className="text-3xl font-black mb-2">{formatCurrency(appraisal.estimatedValue)}</div>
                      <p className="text-[10px] leading-tight opacity-80">{appraisal.marketInsight}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setShowOdometerModal(true)}
                      className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 text-left transition-all hover:bg-white hover:border-blue-200 active:scale-95"
                    >
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex justify-between">
                        Odometer
                        {activeVehicle.avgDailyKm && activeVehicle.avgDailyKm > 0 && (
                          <span className="text-blue-500 lowercase">≈ {Math.round(activeVehicle.avgDailyKm)} km/day</span>
                        )}
                      </div>
                      <div className="text-3xl font-black text-slate-900">{activeVehicle.mileage.toLocaleString()} <span className="text-xs uppercase opacity-30">km</span></div>
                    </button>
                    <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Status</div>
                      <div className={`text-3xl font-black ${getHealthColor(activeVehicle.healthScore)}`}>{activeVehicle.healthScore}%</div>
                      <div className="text-[10px] font-black uppercase text-slate-400 mt-1">{getHealthStatusText(activeVehicle.healthScore)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 shadow-sm">
              <h3 className="text-2xl font-black text-slate-900 mb-10 tracking-tight flex items-center gap-4">
                <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                Roadmap
              </h3>
              {pendingTasks.length > 0 ? (
                <div className="space-y-6">
                  {pendingTasks.map((task, i) => {
                    const projectedDate = calculateProjectedServiceDate(activeVehicle, task);
                    return (
                      <div key={task.id} className="group relative flex gap-6 md:gap-8 items-start border-b border-slate-50 pb-8 last:border-0 last:pb-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 ${task.priority === 'high' ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-2">
                            <h4 className="font-black text-slate-900 text-xl tracking-tight">{task.title}</h4>
                            <button onClick={() => handleTaskComplete(task)} className="bg-slate-900 text-white text-[10px] font-black px-6 py-3 rounded-xl hover:bg-emerald-600 transition-all uppercase tracking-widest active:scale-90">Done</button>
                          </div>
                          <p className="text-slate-500 text-sm leading-relaxed mb-3">{task.description}</p>
                          <div className="flex flex-wrap gap-4">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">@ {task.dueMileage?.toLocaleString()} km</span>
                            {projectedDate && (
                              <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider bg-blue-50 px-2 py-0.5 rounded-lg">
                                Projected: {projectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                            {task.estimatedCost && <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Est. {formatCurrency(task.estimatedCost)}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No pending tasks. You're clear!</p>
                </div>
              )}
            </section>
          </div>

          <aside className="lg:col-span-4 space-y-8">
            <div className="bg-[#0f172a] text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
              {isAskingAI && <div className="absolute inset-0 bg-blue-600/10 z-10"><div className="scan-line"></div></div>}
              <h3 className="text-xl font-black mb-8 flex items-center gap-4">
                <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-xs">✧</span> 
                Diagnostics
              </h3>
              <div className="space-y-4 mb-6">
                <textarea 
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                  placeholder="Describe car symptoms..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-[2rem] p-6 text-sm focus:ring-2 focus:ring-blue-600 outline-none h-40 transition-all text-slate-200 resize-none"
                />
                
                <div className="relative group">
                  <input type="file" hidden ref={diagImageRef} accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setDiagImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} />
                  {diagImage ? (
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-800">
                      <img src={diagImage} className="w-full h-full object-cover" alt="Symptom" />
                      <button onClick={() => setDiagImage(null)} className="absolute top-2 right-2 bg-black/60 w-6 h-6 rounded-full text-xs">×</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => diagImageRef.current?.click()}
                      className="w-full py-4 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 text-[10px] font-black uppercase tracking-widest hover:border-blue-600 transition-colors"
                    >
                      + Attach Photo (Dash/Engine)
                    </button>
                  )}
                </div>
              </div>

              <button 
                disabled={isAskingAI || !symptom}
                onClick={async () => {
                   setIsAskingAI(true);
                   try {
                     const advice = await getAdvancedDiagnostic(activeVehicle, symptom, user?.tier === 'premium', diagImage || undefined);
                     setAiAdvice(advice);
                     if (advice.partsIdentified && advice.partsIdentified.length > 0) {
                        setSuggestedParts(advice.partsIdentified);
                     }
                   } catch (e) { addNotification("AI analysis failed", "error"); } finally { setIsAskingAI(false); }
                }}
                className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] disabled:opacity-30 active:scale-95 transition-all"
              >
                {isAskingAI ? 'Analyzing...' : 'Analyze Symptoms'}
              </button>

              {aiAdvice && (
                <div className={`mt-8 p-6 rounded-[2rem] animate-slide-in ${aiAdvice.severity === 'critical' ? 'bg-rose-600/20 border border-rose-500/30' : 'bg-white/5 border border-white/10'}`}>
                  <div className={`text-[10px] font-black uppercase mb-2 tracking-widest ${aiAdvice.severity === 'critical' ? 'text-rose-400' : 'text-blue-400'}`}>
                    {aiAdvice.severity} alert
                  </div>
                  <p className="text-sm font-bold text-slate-200 leading-snug mb-4">{aiAdvice.advice}</p>
                  <ul className="space-y-2">
                    {aiAdvice.recommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                        <span className="text-blue-500">→</span> {rec}
                      </li>
                    ))}
                  </ul>
                  {aiAdvice.partsIdentified && aiAdvice.partsIdentified.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Recommended Spares:</p>
                      <div className="flex flex-wrap gap-2">
                        {aiAdvice.partsIdentified.map(part => (
                          <span key={part} className="text-[9px] bg-blue-600 px-2 py-0.5 rounded-full font-black text-white">{part}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <div className="py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 shadow-sm">
           <h3 className="text-3xl font-black text-slate-900 mb-10 tracking-tighter">Your Garage is Empty</h3>
           <button onClick={() => setShowAddModal(true)} className="bg-slate-900 text-white px-12 py-6 rounded-3xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all text-xs">Add Your First Car</button>
        </div>
      )}

      {/* ODOMETER UPDATE MODAL */}
      {showOdometerModal && activeVehicle && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-sm">
            <OdometerInput 
              value={activeVehicle.mileage} 
              onSave={handleMileageUpdate} 
              onCancel={() => setShowOdometerModal(false)} 
            />
          </div>
        </div>
      )}

      {/* REGISTRATION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 md:p-16 shadow-2xl relative overflow-y-auto max-h-[90vh] scrollbar-hide">
             {isProcessing && <div className="absolute inset-0 bg-white/60 z-50 flex flex-col items-center justify-center"><div className="scan-line top-1/2"></div><p className="font-black text-blue-600 animate-pulse text-xs tracking-widest uppercase">Satellite Logic Active</p></div>}
            <button onClick={closeModal} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl font-black transition-colors">×</button>
            
            <div className="text-center mb-10">
              <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tighter">Registration</h2>
              <p className="text-slate-500 font-medium">Step: {regStep === 'choice' ? 'Method' : regStep === 'vin' ? 'Identify' : regStep === 'preview' ? 'Confirm' : 'Details'}</p>
            </div>

            {regStep === 'choice' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => setRegStep('vin')} className="p-8 border-2 border-slate-100 rounded-[2.5rem] hover:border-blue-600 transition-all text-left group">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">⚡</div>
                  <h3 className="text-xl font-black text-slate-900">VIN Quick-Add</h3>
                  <p className="text-slate-400 text-xs mt-2">AI decodes specs instantly from chassis number.</p>
                </button>
                <button onClick={() => setRegStep('manual')} className="p-8 border-2 border-slate-100 rounded-[2.5rem] hover:border-slate-900 transition-all text-left group">
                  <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-slate-900 group-hover:text-white transition-colors">📝</div>
                  <h3 className="text-xl font-black text-slate-900">Manual Entry</h3>
                  <p className="text-slate-400 text-xs mt-2">Perfect for vintage cars or non-standard models.</p>
                </button>
              </div>
            )}

            {regStep === 'vin' && (
              <div className="animate-slide-in">
                <div className="mb-8">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Vehicle ID (VIN)</label>
                  <input 
                    type="text" maxLength={17} placeholder="1HGCM8..." 
                    className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-3xl font-mono text-2xl uppercase tracking-[0.2em] focus:ring-4 focus:ring-blue-600/10 outline-none transition text-center mb-4" 
                    value={newVin} onChange={(e) => setNewVin(e.target.value.toUpperCase())} 
                  />
                  <div className="flex justify-center">
                    <button 
                      onClick={() => setNewVin(SAMPLE_VIN)}
                      className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                    >
                      Use Sample VIN (Honda)
                    </button>
                  </div>
                </div>
                <button 
                  disabled={isProcessing || newVin.length < 17} 
                  onClick={async () => {
                    setIsProcessing(true);
                    try {
                      const details = await decodeVIN(newVin);
                      setDecodedData(details);
                      setRegStep('preview');
                    } catch (err) { setRegStep('manual'); } finally { setIsProcessing(false); }
                  }}
                  className="w-full bg-slate-900 text-white py-8 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all disabled:opacity-30 text-xs shadow-xl"
                >
                  Decode Satellite Data
                </button>
              </div>
            )}

            {regStep === 'preview' && decodedData && (
              <div className="animate-slide-in space-y-8">
                <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                   <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Identity Found</h3>
                   <div className="text-4xl font-black leading-none mb-2">{decodedData.year} {decodedData.make}</div>
                   <div className="text-6xl font-black text-blue-500 tracking-tighter leading-none mb-6">{decodedData.model}</div>
                   <div className="flex gap-4">
                      <div className="px-3 py-1.5 rounded-lg bg-white/10 text-[10px] font-black uppercase">{decodedData.bodyType}</div>
                      <div className="px-3 py-1.5 rounded-lg bg-white/10 text-[10px] font-black uppercase">Verified ID</div>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setRegStep('vin')} className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Back</button>
                  <button 
                    onClick={() => finalizeRegistration(decodedData.make, decodedData.model, decodedData.year, decodedData.bodyType, newVin, 0)}
                    className="bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all"
                  >
                    Confirm & Add
                  </button>
                </div>
              </div>
            )}

            {regStep === 'manual' && (
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                finalizeRegistration(manualData.make, manualData.model, manualData.year, manualData.bodyType, newVin || 'MANUAL-REG', manualData.mileage); 
              }} className="space-y-6 animate-slide-in">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" placeholder="Make" value={manualData.make} onChange={(e) => setManualData({...manualData, make: e.target.value})} />
                  <input type="text" required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" placeholder="Model" value={manualData.model} onChange={(e) => setManualData({...manualData, model: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" placeholder="Year" value={manualData.year} onChange={(e) => setManualData({...manualData, year: parseInt(e.target.value)})} />
                  <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" value={manualData.bodyType} onChange={(e) => setManualData({...manualData, bodyType: e.target.value as BodyType})}>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="truck">Truck</option>
                  </select>
                </div>
                <input type="number" required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" placeholder="Current Odometer" value={manualData.mileage} onChange={(e) => setManualData({...manualData, mileage: parseInt(e.target.value)})} />
                <button disabled={isProcessing} className="w-full bg-slate-900 text-white py-8 rounded-[2rem] font-black uppercase tracking-widest text-xs">Register Asset</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
