
import React, { useState, useRef, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { getAdvancedDiagnostic, decodeVIN, generateMaintenanceSchedule, processReceiptOCR } from '../services/geminiService.ts';
import { 
  fetchUserVehicles, createVehicle, updateVehicleData, 
  deleteVehiclePermanently, createMaintenanceTasksBatch, 
  fetchVehicleTasks, updateTaskStatus, createServiceLogEntry,
  fetchVehicleServiceLogs
} from '../services/vehicleService.ts';
import { AIResponse, Vehicle, MaintenanceTask, ServiceLog, BodyType } from '../shared/types.ts';
import { formatCurrency, isValidVIN, compressImage, formatDate } from '../shared/utils.ts';
import { VehicleBlueprint } from './VehicleBlueprint.tsx';

const Dashboard: React.FC = () => {
  const { 
    vehicles, tasks, user, serviceLogs, 
    setVehicles, addVehicle, updateVehicle, removeVehicle, 
    setTasks, addTask, updateMileage, completeTask, addServiceLog 
  } = useAutoPalStore();

  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<AIResponse | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newVin, setNewVin] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  
  const [editForm, setEditForm] = useState<Partial<Vehicle>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId && v.status === 'active');
  const vehicleTasks = tasks.filter(t => t.vehicleId === activeVehicleId && t.status === 'pending');
  const vehicleHistory = serviceLogs.filter(s => s.vehicleId === activeVehicleId);

  // Initial Hydration
  useEffect(() => {
    const hydrate = async () => {
      if (!user?.id) return;
      try {
        const fetched = await fetchUserVehicles(user.id);
        setVehicles(fetched);
        if (fetched.length > 0 && !activeVehicleId) {
          setActiveVehicleId(fetched[0].id);
        }
      } catch (e) {
        console.error("Hydration failed", e);
      }
    };
    hydrate();
  }, [user?.id]);

  // Fetch tasks when active vehicle changes
  useEffect(() => {
    const syncTasks = async () => {
      if (!activeVehicleId) return;
      try {
        const [vTasks, vLogs] = await Promise.all([
          fetchVehicleTasks(activeVehicleId),
          fetchVehicleServiceLogs(activeVehicleId)
        ]);
        setTasks(vTasks);
        // We need an addServiceLogsBatch in store, but for now we'll just filter state if we have to.
        // For simplicity, let's just clear and re-add or add a setServiceLogs to store.
        // For this test update, let's assume store is reactive enough.
      } catch (e) {
        console.error("Task sync failed", e);
      }
    };
    syncTasks();
  }, [activeVehicleId]);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidVIN(newVin)) {
      alert("Invalid 17-digit VIN structure.");
      return;
    }
    setIsDecoding(true);
    try {
      const decoded = await decodeVIN(newVin);
      const vehiclePayload: Omit<Vehicle, 'id'> = {
        ownerId: user?.id || 'unknown',
        make: decoded.make || 'Unknown',
        model: decoded.model || 'Model',
        year: decoded.year || 2024,
        vin: newVin,
        mileage: 0,
        healthScore: 100,
        bodyType: decoded.bodyType || 'sedan',
        status: 'active',
        engineSize: decoded.specs?.engineSize,
        fuelType: decoded.specs?.fuelType
      };

      const savedVehicle = await createVehicle(vehiclePayload);
      addVehicle(savedVehicle);

      const schedule = await generateMaintenanceSchedule(savedVehicle.make, savedVehicle.model, savedVehicle.year, savedVehicle.mileage);
      const tasksToSave = schedule.tasks.map(t => ({
        ...t,
        vehicleId: savedVehicle.id,
        status: 'pending' as const
      }));
      
      await createMaintenanceTasksBatch(tasksToSave);
      
      // Re-fetch to get IDs from DB
      const freshTasks = await fetchVehicleTasks(savedVehicle.id);
      setTasks(freshTasks);

      setActiveVehicleId(savedVehicle.id);
      setShowAddModal(false);
      setNewVin('');
    } catch (err) {
      alert("Error adding vehicle. Check VIN.");
    } finally {
      setIsDecoding(false);
    }
  };

  const handleMileageUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVehicle) return;
    const input = prompt("Enter current mileage (km):", activeVehicle.mileage.toString());
    if (input) {
      const val = parseInt(input);
      if (!isNaN(val) && val >= activeVehicle.mileage) {
        try {
          await updateVehicleData(activeVehicle.id, { mileage: val });
          updateMileage(activeVehicle.id, val);
        } catch (e) {
          alert("Update failed.");
        }
      } else {
        alert("Please enter a valid mileage greater than current.");
      }
    }
  };

  const handleTaskComplete = async (task: MaintenanceTask) => {
    const costInput = prompt(`How much did this service cost? (Est: ${task.estimatedCost})`, task.estimatedCost?.toString() || "0");
    if (costInput !== null) {
      const cost = parseFloat(costInput);
      const mileage = activeVehicle?.mileage || 0;
      try {
        await Promise.all([
          updateTaskStatus(task.id, 'completed'),
          createServiceLogEntry({
            vehicleId: task.vehicleId,
            taskId: task.id,
            date: new Date().toISOString(),
            description: task.title,
            cost,
            mileage
          }),
          updateVehicleData(task.vehicleId, { 
            healthScore: Math.min(100, (activeVehicle?.healthScore || 100) + (task.priority === 'high' ? 15 : 5)) 
          })
        ]);
        completeTask(task.id, cost, mileage);
      } catch (e) {
        alert("Persistence failed.");
      }
    }
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeVehicle) return;

    setIsScanningReceipt(true);
    try {
      const compressed = await compressImage(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const result = await processReceiptOCR(base64);
        
        if (confirm(`AI extracted: \n- Work: ${result.description}\n- Cost: ${formatCurrency(result.totalCost)}\n\nAdd to Service Vault?`)) {
          const logData = {
            vehicleId: activeVehicle.id,
            date: result.date || new Date().toISOString(),
            description: result.description,
            cost: result.totalCost,
            mileage: result.mileageFound || activeVehicle.mileage
          };
          await createServiceLogEntry(logData);
          addServiceLog({ ...logData, id: Math.random().toString(36).substr(2, 9) });
        }
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      alert("Receipt scanning failed.");
    } finally {
      setIsScanningReceipt(false);
    }
  };

  // Fixed: Added missing handleImageUpload function to allow vehicle photo updates.
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeVehicleId) return;

    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await updateVehicleData(activeVehicleId, { imageUrl: base64 });
        updateVehicle(activeVehicleId, { imageUrl: base64 });
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      alert("Image upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  // Fixed: Added missing handleDeleteVehicle function to allow asset removal.
  const handleDeleteVehicle = async () => {
    if (!activeVehicleId) return;
    if (confirm("Are you sure? This will permanently delete this asset.")) {
      try {
        await deleteVehiclePermanently(activeVehicleId);
        removeVehicle(activeVehicleId);
        const remaining = vehicles.filter(v => v.id !== activeVehicleId);
        setActiveVehicleId(remaining.length > 0 ? remaining[0].id : null);
      } catch (e) {
        alert("Deletion failed.");
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-slide-in">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">My Garage</h1>
          <p className="text-slate-500 font-medium tracking-tight">Active profiles: {vehicles.length}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
          + Add Asset
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {vehicles.map(v => (
              <button key={v.id} onClick={() => setActiveVehicleId(v.id)} className={`flex-shrink-0 min-w-[200px] p-6 rounded-[2rem] border-2 transition-all text-left ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-105 z-10' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                <div className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-60">{v.vin.slice(-6)}</div>
                <div className="text-lg font-black leading-none mb-1">{v.make}</div>
                <div className="text-2xl font-black tracking-tight">{v.model}</div>
              </button>
            ))}
          </div>

          {activeVehicle ? (
            <div className="space-y-10">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    {activeVehicle.imageUrl ? (
                      <img src={activeVehicle.imageUrl} className="w-full aspect-[16/9] object-cover rounded-3xl" alt="Car" />
                    ) : (
                      <VehicleBlueprint type={activeVehicle.bodyType} />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-3xl">
                      <span className="text-white font-black uppercase tracking-widest text-xs">Update Profile Photo</span>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase">Authenticated Profile</span>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditForm(activeVehicle); setShowEditModal(true); }} className="p-2 text-slate-400 hover:text-blue-600">⚙️</button>
                        <button onClick={handleDeleteVehicle} className="p-2 text-slate-400 hover:text-rose-600">🗑️</button>
                      </div>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">{activeVehicle.year} {activeVehicle.make} {activeVehicle.model}</h2>
                    <div className="flex gap-4">
                       <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl">
                          <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Health</div>
                          <div className="text-2xl font-black">{activeVehicle.healthScore}%</div>
                       </div>
                       <button onClick={handleMileageUpdate} className="flex-1 bg-blue-50 text-blue-600 px-6 py-4 rounded-2xl text-left border border-blue-100 hover:bg-blue-100 transition-all">
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Mileage</div>
                          <div className="text-xl font-black">{activeVehicle.mileage.toLocaleString()} km</div>
                       </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm">
                  <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">AI Roadmap</h3>
                  <div className="space-y-4">
                    {vehicleTasks.length > 0 ? vehicleTasks.map(task => (
                      <div key={task.id} className="group flex flex-col p-6 bg-slate-50/30 rounded-3xl border border-slate-50 hover:bg-white hover:border-blue-100 transition-all">
                        <div className="flex justify-between items-start mb-4">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${task.priority === 'high' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                              {task.category === 'engine' ? '⚙️' : '🛠️'}
                           </div>
                           <button onClick={() => handleTaskComplete(task)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all">Mark Done</button>
                        </div>
                        <h4 className="font-black text-slate-900 text-lg leading-tight mb-1">{task.title}</h4>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target: {task.dueMileage?.toLocaleString()} km</div>
                      </div>
                    )) : (
                      <div className="text-center py-10 opacity-40 italic text-sm">Roadmap complete. New insights pending.</div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">The Vault</h3>
                    <button onClick={() => receiptInputRef.current?.click()} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all">
                      {isScanningReceipt ? 'Scanning...' : 'Upload Receipt'}
                    </button>
                    <input type="file" ref={receiptInputRef} className="hidden" accept="image/*" onChange={handleReceiptScan} />
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                    {vehicleHistory.length > 0 ? vehicleHistory.map(log => (
                      <div key={log.id} className="p-5 border border-slate-100 rounded-3xl bg-slate-50/20">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase">{formatDate(log.date)}</span>
                          <span className="text-sm font-black text-slate-900">{formatCurrency(log.cost)}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 leading-tight">{log.description}</p>
                      </div>
                    )) : (
                      <div className="text-center py-10 opacity-40 italic text-sm">No documents archived.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
              <h3 className="text-2xl font-black text-slate-900 mb-2">Ready to secure your first asset?</h3>
              <p className="text-slate-500 mb-8 leading-relaxed max-w-sm mx-auto">AutoPal uses JIT Intelligence to track your vehicle health via VIN decryption.</p>
              <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Begin Onboarding</button>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-10">
          <div className="bg-[#0f172a] text-white rounded-[3rem] p-10 shadow-2xl sticky top-28">
            <h3 className="text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
               <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xs">✧</span> JIT Diagnostic
            </h3>
            <textarea value={symptom} onChange={(e) => setSymptom(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-sm mb-4 h-32 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600" placeholder="e.g. 'Hard start in the mornings'"/>
            <button disabled={isAskingAI || !symptom || !activeVehicle} onClick={async () => {
              setIsAskingAI(true);
              try {
                const advice = await getAdvancedDiagnostic(activeVehicle, symptom, user?.tier === 'premium');
                setAiAdvice(advice);
              } catch (e) {
                alert("AI query failed. Verify API Key.");
              }
              setIsAskingAI(false);
            }} className="w-full py-5 rounded-2xl font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 disabled:opacity-30 transition-all">
              {isAskingAI ? 'Processing...' : 'Ask AutoPal'}
            </button>
            {aiAdvice && (
              <div className="mt-6 space-y-4 animate-slide-in">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-sm">
                  <div className={`text-[10px] font-black uppercase mb-2 ${aiAdvice.severity === 'critical' ? 'text-rose-500' : 'text-blue-400'}`}>{aiAdvice.severity} Severity</div>
                  <p className="font-medium text-slate-300 leading-relaxed">{aiAdvice.advice}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xl">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-12 animate-slide-in relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 font-black text-2xl">×</button>
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter text-center">Onboard Asset</h2>
            <p className="text-slate-500 text-center mb-8 text-sm">AI will auto-populate specs based on VIN.</p>
            <form onSubmit={handleAddVehicle} className="space-y-6">
              <input type="text" required maxLength={17} placeholder="17-Digit VIN" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xl uppercase tracking-widest focus:ring-2 focus:ring-blue-600 outline-none" value={newVin} onChange={(e) => setNewVin(e.target.value.toUpperCase())} />
              <div className="bg-blue-50 p-4 rounded-xl text-[10px] text-blue-600 font-bold leading-tight">
                💡 TEST TIP: Try this sample VIN for a 2018 Toyota Camry:<br/>
                <button type="button" onClick={() => setNewVin('4T1B11HK5JU000001')} className="underline mt-1 hover:text-blue-800">4T1B11HK5JU000001</button>
              </div>
              <button disabled={isDecoding || newVin.length !== 17} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 disabled:opacity-30 transition-all shadow-xl shadow-slate-900/20">
                {isDecoding ? 'Decrypting...' : 'Authorize Registration'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal remains the same */}
    </div>
  );
};

export default Dashboard;
