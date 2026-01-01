
import React, { useState, useRef, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { getAdvancedDiagnostic, decodeVIN, generateMaintenanceSchedule, processReceiptOCR } from '../services/geminiService.ts';
import { 
  fetchVehicleTasks, fetchVehicleServiceLogs, createVehicle, updateVehicleData, 
  updateTaskStatus, createServiceLogEntry, createMaintenanceTasksBatch 
} from '../services/vehicleService.ts';
import { AIResponse, Vehicle, MaintenanceTask } from '../shared/types.ts';
import { formatCurrency, isValidVIN, compressImage, formatDate } from '../shared/utils.ts';
import { VehicleBlueprint } from './VehicleBlueprint.tsx';

const Dashboard: React.FC = () => {
  const { 
    vehicles, tasks, user, serviceLogs, 
    setVehicles, addVehicle, updateVehicle, 
    setTasks, addTask, updateMileage, completeTask, addServiceLog 
  } = useAutoPalStore();

  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<AIResponse | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVin, setNewVin] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId && v.status === 'active');
  const vehicleTasks = tasks.filter(t => t.vehicleId === activeVehicleId && t.status === 'pending');
  const vehicleHistory = serviceLogs.filter(s => s.vehicleId === activeVehicleId);

  // Auto-select first vehicle
  useEffect(() => {
    if (vehicles.length > 0 && !activeVehicleId) {
      setActiveVehicleId(vehicles[0].id);
    }
  }, [vehicles, activeVehicleId]);

  // JIT: Load details when active vehicle changes
  useEffect(() => {
    if (activeVehicleId) {
      const loadDetails = async () => {
        setIsLoadingDetails(true);
        try {
          const [tList, sList] = await Promise.all([
            fetchVehicleTasks(activeVehicleId),
            fetchVehicleServiceLogs(activeVehicleId)
          ]);
          setTasks(tList);
          // Sync service logs to store
          sList.forEach(log => addServiceLog(log));
        } catch (e) {
          console.error("Dashboard: Error fetching vehicle details:", e);
        } finally {
          setIsLoadingDetails(false);
        }
      };
      loadDetails();
    }
  }, [activeVehicleId, setTasks, addServiceLog]);

  const handleUpdateMileage = async (newVal: number) => {
    if (!activeVehicleId) return;
    updateMileage(activeVehicleId, newVal);
    try {
      await updateVehicleData(activeVehicleId, { mileage: newVal });
    } catch (e) {
      console.error("Dashboard: Error updating mileage in DB:", e);
    }
  };

  const handleCompleteTask = async (task: MaintenanceTask) => {
    if (!activeVehicle) return;
    const cost = task.estimatedCost || 0;
    
    try {
      // 1. Backend Sync
      await updateTaskStatus(task.id, 'completed');
      await createServiceLogEntry({
        vehicleId: activeVehicle.id,
        taskId: task.id,
        date: new Date().toISOString(),
        description: task.title,
        cost,
        mileage: activeVehicle.mileage
      });

      // 2. State Sync
      completeTask(task.id, cost, activeVehicle.mileage);
      
      // 3. Health Update Persistence
      const newHealth = Math.min(100, activeVehicle.healthScore + (task.priority === 'high' ? 15 : 5));
      await updateVehicleData(activeVehicle.id, { healthScore: newHealth });
    } catch (e) {
      console.error("Dashboard: Error completing task:", e);
      alert("Task completion could not be saved to the database.");
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidVIN(newVin)) { alert("Invalid 17-digit VIN."); return; }

    setIsDecoding(true);
    try {
      // Step 1: Decode VIN using Gemini
      console.log("Dashboard: Decrypting VIN...");
      const decoded = await decodeVIN(newVin);
      
      const vehiclePayload: Omit<Vehicle, 'id'> = {
        ownerId: user?.id || 'unknown',
        make: decoded.make || 'Generic',
        model: decoded.model || 'Vehicle',
        year: decoded.year || 2024,
        vin: newVin,
        mileage: 0,
        healthScore: 100,
        bodyType: decoded.bodyType || 'sedan',
        status: 'active',
        engineSize: decoded.specs?.engineSize,
        fuelType: decoded.specs?.fuelType
      };

      // Step 2: Save to Supabase
      const savedVehicle = await createVehicle(vehiclePayload);
      addVehicle(savedVehicle);

      // Step 3: Generate Roadmap
      console.log("Dashboard: Generating roadmap...");
      const roadmap = await generateMaintenanceSchedule(savedVehicle.make, savedVehicle.model, savedVehicle.year, 0);
      const tasksToSave = roadmap.tasks.map(t => ({
        ...t,
        vehicleId: savedVehicle.id,
        status: 'pending' as const
      }));
      
      await createMaintenanceTasksBatch(tasksToSave);
      
      setActiveVehicleId(savedVehicle.id);
      setShowAddModal(false);
      setNewVin('');
    } catch (err: any) {
      console.error("Dashboard: Onboarding Error Details:", err);
      const msg = err.message || "Unknown error";
      alert(`Registration failed. Details: ${msg}. Check console for full trace and verify API_KEY in Vercel.`);
    } finally {
      setIsDecoding(false);
    }
  };

  const triggerDiagnostic = async () => {
    if (!activeVehicle || !symptom) return;
    setIsAskingAI(true);
    try {
      const advice = await getAdvancedDiagnostic(activeVehicle, symptom, user?.tier === 'premium');
      setAiAdvice(advice);
    } catch (e: any) {
      console.error("Dashboard: Diagnostic AI Error:", e);
      alert("AI unreachable. Ensure API_KEY is set in your environment variables.");
    } finally {
      setIsAskingAI(false);
    }
  };

  return (
    <div className="animate-slide-in space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">My Garage</h1>
          <p className="text-slate-500 font-medium">Managing {vehicles.length} assets</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 active:scale-95"
        >
          + Register Asset
        </button>
      </header>

      {/* Vehicle Selector Tabs */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {vehicles.map(v => (
          <button 
            key={v.id}
            onClick={() => setActiveVehicleId(v.id)}
            className={`flex-shrink-0 px-8 py-5 rounded-3xl border-2 transition-all text-left min-w-[200px] ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl translate-y-[-2px]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
          >
            <div className="text-[10px] font-black uppercase opacity-60 mb-1 tracking-widest">{v.make}</div>
            <div className="text-xl font-black leading-tight">{v.model}</div>
            <div className="text-[10px] mt-2 opacity-50 font-bold">{v.vin}</div>
          </button>
        ))}
      </div>

      {activeVehicle ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <VehicleBlueprint type={activeVehicle.bodyType} />
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Verified Profile</span>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{activeVehicle.year} VIN ID</span>
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">{activeVehicle.make} {activeVehicle.model}</h2>
                  
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Asset Health</div>
                        <div className="text-2xl font-black text-slate-900">{activeVehicle.healthScore}%</div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${activeVehicle.healthScore}%` }}></div>
                        </div>
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Total Odometer</div>
                        <div className="text-2xl font-black text-slate-900">{activeVehicle.mileage.toLocaleString()} <span className="text-sm">km</span></div>
                        <input 
                          type="range" 
                          min={activeVehicle.mileage} 
                          max={activeVehicle.mileage + 5000} 
                          step={10}
                          className="w-full mt-3 accent-blue-600"
                          onChange={(e) => handleUpdateMileage(parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] p-12 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                  <span className="w-2 h-10 bg-blue-600 rounded-full"></span>
                  Active Roadmap
                </h3>
                {isLoadingDetails && <span className="text-xs font-black text-blue-600 animate-pulse uppercase tracking-widest">Hydrating...</span>}
              </div>
              <div className="space-y-8">
                {vehicleTasks.length > 0 ? vehicleTasks.map((task, idx) => (
                  <div key={task.id} className="relative flex gap-8 group">
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm border transition-all ${task.priority === 'high' ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-blue-50 border-blue-100 text-blue-500'}`}>
                        {idx + 1}
                      </div>
                      {idx !== vehicleTasks.length - 1 && <div className="w-px flex-1 bg-slate-100 my-4"></div>}
                    </div>
                    <div className="flex-1 pb-10 border-b border-slate-50 last:border-0 last:pb-0">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
                        <div>
                          <h4 className="font-black text-slate-900 text-xl tracking-tight leading-tight">{task.title}</h4>
                          <div className="flex gap-3 mt-1">
                            <span className="text-slate-400 text-xs font-black uppercase tracking-widest">Due @ {task.dueMileage?.toLocaleString()} km</span>
                            <span className="text-blue-400 text-xs font-black uppercase tracking-widest">• {task.category}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleCompleteTask(task)}
                          className="bg-slate-900 text-white text-[10px] font-black px-6 py-3 rounded-xl hover:bg-blue-600 transition-all uppercase tracking-[0.2em]"
                        >
                          Resolve Task
                        </button>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">{task.description}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-24 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                    <div className="text-4xl mb-4">✨</div>
                    <p className="text-slate-900 font-black text-lg">Roadmap Clear</p>
                    <p className="text-slate-400 text-sm">Your asset is operating within nominal parameters.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-[#0f172a] text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/20 blur-[80px] rounded-full group-hover:bg-blue-600/30 transition-all"></div>
              <h3 className="text-2xl font-black mb-8 flex items-center gap-4 relative">
                <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-sm">✧</span> 
                Neural Diagnostic
              </h3>
              <div className="space-y-5 relative">
                <textarea 
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                  placeholder="Describe unusual behavior (e.g. 'Blue smoke on startup')"
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-[1.5rem] p-6 text-sm focus:ring-2 focus:ring-blue-600 outline-none h-40 transition-all placeholder-slate-700 resize-none font-medium"
                />
                <button 
                  disabled={isAskingAI || !symptom}
                  onClick={triggerDiagnostic}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] disabled:opacity-30 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                >
                  {isAskingAI ? 'Consulting Intelligence...' : 'Initiate Analysis'}
                </button>
              </div>

              {aiAdvice && (
                <div className="mt-10 p-8 bg-white/5 border border-white/10 rounded-[2rem] animate-slide-in">
                  <div className={`text-[10px] font-black uppercase mb-3 tracking-widest ${aiAdvice.severity === 'critical' ? 'text-rose-500' : 'text-blue-400'}`}>
                    {aiAdvice.severity} Priority Alert
                  </div>
                  <p className="text-sm font-bold text-slate-200 leading-relaxed mb-6">{aiAdvice.advice}</p>
                  <div className="space-y-3">
                    {aiAdvice.recommendations.map((rec, i) => (
                      <div key={i} className="text-xs text-slate-400 flex gap-3 items-start">
                        <span className="text-blue-500 mt-0.5">●</span> {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Technical Vault</h3>
                <button 
                  onClick={() => receiptInputRef.current?.click()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 text-[9px] font-black px-4 py-2 rounded-lg uppercase tracking-widest transition"
                >
                  Sync Receipt
                </button>
                <input type="file" min="1" max="1" ref={receiptInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const compressed = await compressImage(file);
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                      const result = await processReceiptOCR(reader.result as string);
                      if (confirm(`AI Analysis: ${result.description} for ${formatCurrency(result.totalCost)}`)) {
                        const log = { id: Math.random().toString(36).substr(2, 9), vehicleId: activeVehicle?.id || '', date: new Date().toISOString(), description: result.description, cost: result.totalCost, mileage: activeVehicle?.mileage || 0 };
                        addServiceLog(log);
                        await createServiceLogEntry(log);
                      }
                    };
                    reader.readAsDataURL(compressed);
                  } catch (err) {
                    console.error("Dashboard: Receipt Scan Error:", err);
                    alert("Could not process receipt image.");
                  }
                }} />
              </div>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {vehicleHistory.length > 0 ? vehicleHistory.map(log => (
                  <div key={log.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(log.date)}</span>
                      <span className="text-sm font-black text-slate-900">{formatCurrency(log.cost)}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 leading-tight">{log.description}</p>
                    <div className="text-[9px] font-black text-slate-300 uppercase mt-2">{log.mileage} KM Logged</div>
                  </div>
                )) : (
                  <div className="py-20 text-center opacity-20 font-black uppercase text-[10px] tracking-widest">No Documents Found</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200 shadow-inner">
           <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-5xl mx-auto mb-8 shadow-sm">🏎️</div>
           <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter">Garage Initialization Required</h3>
           <p className="text-slate-500 mb-10 max-w-md mx-auto font-medium">AutoPal uses JIT Intelligence to decode specs from your VIN and generate a lifecycle maintenance plan.</p>
           <button onClick={() => setShowAddModal(true)} className="bg-slate-900 text-white px-12 py-6 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all text-sm">Onboard First Vehicle</button>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-2xl">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-16 shadow-2xl animate-slide-in relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-12 right-12 text-slate-300 hover:text-slate-900 transition text-3xl font-black">×</button>
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter text-center">Onboard Asset</h2>
            <p className="text-slate-500 text-center mb-12 font-medium">Verify your vehicle using the 17-digit Chassis Number (VIN).</p>
            
            <form onSubmit={handleAddVehicle} className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 ml-2">Vehicle Identification Number</label>
                <input type="text" required maxLength={17} placeholder="1HGCM82533A..." className="w-full px-10 py-6 bg-slate-50 border border-slate-100 rounded-3xl font-mono text-2xl uppercase tracking-[0.2em] focus:ring-4 focus:ring-blue-600/10 outline-none transition text-center" value={newVin} onChange={(e) => setNewVin(e.target.value.toUpperCase())} />
              </div>
              <button disabled={isDecoding || newVin.length < 17} className="w-full bg-slate-900 text-white py-8 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all disabled:opacity-30 shadow-2xl shadow-slate-900/20 text-xs">
                {isDecoding ? 'Decrypting VIN Data...' : 'Authorize Registration'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
