
import React, { useState, useEffect, useRef } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
// Fix: Removed non-existent import getVehicleAppraisal
import { getAdvancedDiagnostic, decodeVIN, generateMaintenanceSchedule } from '../services/geminiService.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, createVehicle, updateVehicleData, 
  updateTaskStatus, createServiceLogEntry, createMaintenanceTasksBatch, uploadVehicleImage 
} from '../services/vehicleService.ts';
import { calculateProjectedServiceDate, getHealthColor, getHealthStatusText } from '../services/maintenanceService.ts';
import { AIResponse, Vehicle, MaintenanceTask, BodyType, AppraisalResult } from '../shared/types.ts';
import { formatCurrency, isValidVIN, compressImage } from '../shared/utils.ts';
import { VehicleBlueprint } from './VehicleBlueprint.tsx';
import { OdometerInput } from './OdometerInput.tsx';

const Dashboard: React.FC = () => {
  const { 
    vehicles, tasks, user, setSuggestedParts,
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
  
  // Registration States
  const [showAddModal, setShowAddModal] = useState(false);
  const [regStep, setRegStep] = useState<'vin' | 'manual'>('vin');
  const [newVin, setNewVin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const [manualData, setManualData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    bodyType: 'sedan' as BodyType,
    mileage: 0
  });

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
          console.error("Dashboard Sync Error:", e);
        } finally {
          setIsLoadingDetails(false);
        }
      };
      loadDetails();
    }
  }, [activeVehicleId, setTasks, addServiceLog]);

  const handleVINRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidVIN(newVin)) {
      alert("Please enter a valid 17-digit VIN.");
      return;
    }

    setIsProcessing(true);
    try {
      const details = await decodeVIN(newVin);
      await finalizeRegistration(details.make, details.model, details.year, details.bodyType, newVin, 0);
    } catch (err) {
      console.warn("AI Decoding failed. Switching to manual mode.");
      setRegStep('manual');
    } finally {
      setIsProcessing(false);
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
        imageUrls: [],
        isDirty: false
      };

      const saved = await createVehicle(payload);
      addVehicle(saved);

      // Generate Roadmap (One-time AI operation)
      try {
        const roadmap = await generateMaintenanceSchedule(make, model, year, mileage);
        await createMaintenanceTasksBatch(roadmap.tasks.map(t => ({
          ...t,
          vehicleId: saved.id,
          status: 'pending' as const,
          isDirty: false
        })));
      } catch (e) { console.error("Roadmap skipped", e); }

      setActiveVehicleId(saved.id);
      closeModal();
    } catch (err) {
      alert("Could not register vehicle. Check connection.");
    } finally {
      setIsProcessing(false);
    }
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
          className="w-full md:w-auto bg-blue-600 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/20 active:scale-95 transition-all"
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
            className={`flex-shrink-0 px-8 py-6 rounded-[2.5rem] border-2 transition-all text-left min-w-[220px] ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl translate-y-[-4px]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 shadow-sm'}`}
          >
            <div className="text-[10px] font-black uppercase opacity-50 mb-1 tracking-widest">{v.make}</div>
            <div className="text-xl font-black leading-tight">{v.model}</div>
            <div className="text-[10px] mt-3 opacity-40 font-mono font-bold tracking-tighter">{v.vin}</div>
          </button>
        ))}
      </div>

      {activeVehicle ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {/* Visual Vehicle Card */}
            <section className="bg-white rounded-[3.5rem] md:rounded-[4.5rem] p-8 md:p-14 border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] font-black text-9xl pointer-events-none select-none uppercase tracking-tighter transition-opacity group-hover:opacity-[0.06]">
                {activeVehicle.make}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
                <VehicleBlueprint type={activeVehicle.bodyType} />
                <div className="space-y-8">
                  <div className="space-y-2">
                    <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Active Profile</span>
                    <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">
                      {activeVehicle.year} {activeVehicle.model}
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setShowOdometerModal(true)}
                      className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100 text-left hover:bg-white hover:border-blue-200 transition-all active:scale-95"
                    >
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex justify-between">
                        Odometer
                        <span className="text-blue-500">→</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900">{activeVehicle.mileage.toLocaleString()} <span className="text-xs uppercase opacity-30">km</span></div>
                    </button>
                    <div className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100">
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Health</div>
                      <div className={`text-3xl font-black ${getHealthColor(activeVehicle.healthScore)}`}>{activeVehicle.healthScore}%</div>
                      <div className="text-[10px] font-black uppercase text-slate-400 mt-1">{getHealthStatusText(activeVehicle.healthScore)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Maintenance Roadmap */}
            <section className="bg-white rounded-[3.5rem] p-8 md:p-14 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-12">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                  <span className="w-2 h-10 bg-blue-600 rounded-full"></span>
                  Roadmap Intel
                </h3>
                {isLoadingDetails && <span className="text-[10px] font-black text-blue-600 animate-pulse tracking-widest uppercase">Syncing...</span>}
              </div>

              <div className="space-y-8">
                {pendingTasks.length > 0 ? pendingTasks.map((task, i) => {
                  const projectedDate = calculateProjectedServiceDate(activeVehicle, task);
                  return (
                    <div key={task.id} className="group relative flex gap-6 md:gap-10 items-start border-b border-slate-50 pb-10 last:border-0 last:pb-0">
                      <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center font-black text-lg border-2 transition-transform group-hover:scale-110 ${task.priority === 'high' ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-3">
                          <h4 className="font-black text-slate-900 text-xl md:text-2xl tracking-tight leading-none">{task.title}</h4>
                          <button 
                            onClick={async () => {
                              try {
                                await updateTaskStatus(task.id, 'completed');
                                completeTask(task.id, task.estimatedCost || 0, activeVehicle.mileage);
                                // Fix: Added isDirty property required by Omit<ServiceLog, "id">
                                await createServiceLogEntry({
                                  vehicleId: activeVehicle.id, taskId: task.id, date: new Date().toISOString(),
                                  description: task.title, cost: task.estimatedCost || 0, mileage: activeVehicle.mileage,
                                  isDirty: false
                                });
                              } catch (e) { alert("Update failed"); }
                            }}
                            className="bg-slate-900 text-white text-[10px] font-black px-8 py-4 rounded-2xl hover:bg-emerald-600 transition-all uppercase tracking-widest active:scale-90"
                          >
                            Mark Done
                          </button>
                        </div>
                        <p className="text-slate-500 text-sm md:text-base leading-relaxed mb-4 max-w-2xl">{task.description}</p>
                        <div className="flex flex-wrap gap-4">
                          <span className="text-[10px] font-black uppercase text-slate-400 border border-slate-100 px-3 py-1 rounded-lg">Due @ {task.dueMileage?.toLocaleString()} km</span>
                          {projectedDate && (
                            <span className="text-[10px] font-black uppercase text-blue-500 bg-blue-50 px-3 py-1 rounded-lg">
                              Est: {projectedDate.toLocaleDateString()}
                            </span>
                          )}
                          {task.estimatedCost && <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Est. {formatCurrency(task.estimatedCost)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="text-5xl mb-6">✨</div>
                    <p className="text-slate-900 font-black text-xl mb-1 tracking-tight">Your Vehicle is Optimized</p>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No pending maintenance identified</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="lg:col-span-4 space-y-8">
            {/* AI Diagnostics Side Panel */}
            <div className="bg-[#0f172a] text-white rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/10 blur-[80px] rounded-full"></div>
              {isAskingAI && <div className="absolute inset-0 bg-blue-600/10 z-20"><div className="scan-line"></div></div>}
              
              <h3 className="text-xl font-black mb-8 flex items-center gap-4 relative z-10">
                <span className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-xs shadow-lg shadow-blue-500/20 animate-pulse">✧</span> 
                Diagnostics
              </h3>
              
              <div className="space-y-4 mb-8 relative z-10">
                <textarea 
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                  placeholder="Describe abnormal sounds or behaviors..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-[2rem] p-8 text-sm focus:ring-2 focus:ring-blue-600 outline-none h-48 transition-all text-slate-200 resize-none font-medium placeholder-slate-700"
                />
                
                <div className="relative">
                  <input type="file" hidden ref={diagImageRef} accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setDiagImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} />
                  {diagImage ? (
                    <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-800 border border-slate-700">
                      <img src={diagImage} className="w-full h-full object-cover" alt="Symptom" />
                      <button onClick={() => setDiagImage(null)} className="absolute top-4 right-4 bg-black/60 backdrop-blur-md w-8 h-8 rounded-full flex items-center justify-center font-bold">×</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => diagImageRef.current?.click()}
                      className="w-full py-5 border-2 border-dashed border-slate-800 rounded-[2rem] text-slate-600 text-[10px] font-black uppercase tracking-widest hover:border-blue-600 hover:text-blue-500 transition-all active:scale-[0.98]"
                    >
                      + Attachment (Optional)
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
                     if (advice.partsIdentified) setSuggestedParts(advice.partsIdentified);
                   } catch (e) { alert("AI currently at capacity"); } finally { setIsAskingAI(false); }
                }}
                className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-blue-500/20 disabled:opacity-30 active:scale-95 transition-all relative z-10"
              >
                {isAskingAI ? 'Consulting Neural Grid...' : 'Submit Diagnostic Query'}
              </button>

              {aiAdvice && (
                <div className={`mt-10 p-8 rounded-[2.5rem] animate-slide-in relative z-10 ${aiAdvice.severity === 'critical' ? 'bg-rose-500/10 border border-rose-500/30' : 'bg-white/5 border border-white/10'}`}>
                  <div className={`text-[10px] font-black uppercase mb-3 tracking-[0.2em] ${aiAdvice.severity === 'critical' ? 'text-rose-400' : 'text-blue-400'}`}>
                    System Status: {aiAdvice.severity}
                  </div>
                  <p className="text-base font-bold text-slate-200 leading-snug mb-6">{aiAdvice.advice}</p>
                  <ul className="space-y-3">
                    {aiAdvice.recommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-3">
                        <span className="text-blue-500 mt-0.5">•</span> {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <div className="py-48 text-center bg-white rounded-[4.5rem] border-2 border-dashed border-slate-100 shadow-sm">
           <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-10 animate-bounce">🏎️</div>
           <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Your Garage is Empty</h3>
           <p className="text-slate-500 mb-12 max-w-sm mx-auto font-medium leading-relaxed">Join 10,000+ Nigerian owners tracking their vehicle health in real-time.</p>
           <button onClick={() => setShowAddModal(true)} className="bg-slate-900 text-white px-14 py-6 rounded-[2.5rem] font-black uppercase tracking-widest hover:bg-blue-600 transition-all text-xs shadow-2xl">Register Your First Car</button>
        </div>
      )}

      {/* ODOMETER MODAL */}
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

      {/* REGISTRATION MODAL WITH FALLBACK */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 md:p-16 shadow-2xl relative overflow-hidden">
             {isProcessing && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center"><div className="scan-line top-1/2"></div><p className="font-black text-blue-600 animate-pulse text-[10px] tracking-widest uppercase mt-4">Analyzing Identity...</p></div>}
            
            <button onClick={closeModal} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 text-4xl font-black transition-colors">×</button>
            
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tighter">Register Asset</h2>
              <p className="text-slate-500 font-medium">
                {regStep === 'vin' ? 'Enter Chassis Number for Auto-Decode' : 'Enter Details Manually (AI Unavailable)'}
              </p>
            </div>

            {regStep === 'vin' ? (
              <form onSubmit={handleVINRegistration} className="space-y-10">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">17-Digit VIN</label>
                  <input 
                    type="text" required maxLength={17} placeholder="1HGCM8..." 
                    className="w-full px-8 py-8 bg-slate-50 border border-slate-100 rounded-[2rem] font-mono text-2xl uppercase tracking-[0.2em] focus:ring-4 focus:ring-blue-600/10 outline-none transition text-center shadow-inner" 
                    value={newVin} onChange={(e) => setNewVin(e.target.value.toUpperCase())} 
                  />
                </div>
                <div className="space-y-4">
                  <button disabled={isProcessing || newVin.length < 17} className="w-full bg-slate-900 text-white py-8 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all disabled:opacity-30 text-xs shadow-2xl">
                    {isProcessing ? 'Decoding Satellite Data...' : 'Authorize Registration'}
                  </button>
                  <button type="button" onClick={() => setRegStep('manual')} className="w-full text-[10px] font-black text-blue-600 uppercase tracking-widest py-2">Skip to Manual Entry</button>
                </div>
              </form>
            ) : (
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                finalizeRegistration(manualData.make, manualData.model, manualData.year, manualData.bodyType, newVin || 'MANUAL-REG', manualData.mileage); 
              }} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Make</label>
                    <input type="text" required className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="e.g. Toyota" value={manualData.make} onChange={(e) => setManualData({...manualData, make: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Model</label>
                    <input type="text" required className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="e.g. Camry" value={manualData.model} onChange={(e) => setManualData({...manualData, model: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
                    <input type="number" required className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" value={manualData.year} onChange={(e) => setManualData({...manualData, year: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Body Type</label>
                    <select className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold appearance-none" value={manualData.bodyType} onChange={(e) => setManualData({...manualData, bodyType: e.target.value as BodyType})}>
                      <option value="sedan">Sedan</option>
                      <option value="suv">SUV</option>
                      <option value="truck">Truck</option>
                      <option value="van">Van</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Odometer (km)</label>
                  <input type="number" required className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" value={manualData.mileage} onChange={(e) => setManualData({...manualData, mileage: parseInt(e.target.value)})} />
                </div>
                <button disabled={isProcessing} className="w-full bg-slate-900 text-white py-8 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all text-xs mt-4">
                  {isProcessing ? 'Saving Profile...' : 'Complete Registration'}
                </button>
                <button type="button" onClick={() => setRegStep('vin')} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">Back to VIN Lookup</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
