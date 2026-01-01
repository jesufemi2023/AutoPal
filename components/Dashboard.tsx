
import React, { useState, useRef, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { getAdvancedDiagnostic, decodeVIN, generateMaintenanceSchedule, processReceiptOCR } from '../services/geminiService.ts';
import { fetchUserVehicles, createVehicle, updateVehicleData, deleteVehiclePermanently } from '../services/vehicleService.ts';
import { AIResponse, Vehicle, MaintenanceTask, ServiceLog, BodyType } from '../shared/types.ts';
import { formatCurrency, isValidVIN, compressImage, formatDate } from '../shared/utils.ts';
import { VehicleBlueprint } from './VehicleBlueprint.tsx';

const Dashboard: React.FC = () => {
  const { 
    vehicles, tasks, user, serviceLogs, 
    setVehicles, addVehicle, updateVehicle, removeVehicle, 
    addTask, updateMileage, completeTask, addServiceLog 
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
  
  // Edit State
  const [editForm, setEditForm] = useState<Partial<Vehicle>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId && v.status === 'active');
  const vehicleTasks = tasks.filter(t => t.vehicleId === activeVehicleId && t.status === 'pending');
  const vehicleHistory = serviceLogs.filter(s => s.vehicleId === activeVehicleId);

  /** READ: Fetch data on mount */
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

  /** CREATE: Vehicle via VIN Onboarding */
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidVIN(newVin)) {
      alert("Invalid 17-digit VIN structure.");
      return;
    }
    setIsDecoding(true);
    try {
      const decoded = await decodeVIN(newVin);
      // Fixed: engineSize and fuelType are top-level properties in the Vehicle interface.
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

      // Persist to DB
      const savedVehicle = await createVehicle(vehiclePayload);
      
      // Update local state
      const success = addVehicle(savedVehicle);
      if (!success) {
        alert(`Limit reached for your ${user?.tier} plan.`);
        return;
      }

      // Generate JIT schedule
      const schedule = await generateMaintenanceSchedule(savedVehicle.make, savedVehicle.model, savedVehicle.year, savedVehicle.mileage);
      schedule.tasks.forEach(task => {
        addTask({ ...task, id: Math.random().toString(36).substr(2, 9), vehicleId: savedVehicle.id, status: 'pending' } as MaintenanceTask);
      });

      setActiveVehicleId(savedVehicle.id);
      setShowAddModal(false);
      setNewVin('');
    } catch (err) {
      alert("Error adding vehicle. Check VIN.");
    } finally {
      setIsDecoding(false);
    }
  };

  /** UPDATE: Mileage or Basic Info */
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

  const handleEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVehicle) return;
    try {
      await updateVehicleData(activeVehicle.id, editForm);
      updateVehicle(activeVehicle.id, editForm);
      setShowEditModal(false);
    } catch (e) {
      alert("Save failed.");
    }
  };

  /** DELETE: Remove asset */
  const handleDeleteVehicle = async () => {
    if (!activeVehicle) return;
    if (confirm(`Are you sure you want to remove this ${activeVehicle.make} ${activeVehicle.model}? This action cannot be undone.`)) {
      try {
        await deleteVehiclePermanently(activeVehicle.id);
        removeVehicle(activeVehicle.id);
        setActiveVehicleId(vehicles.find(v => v.id !== activeVehicle.id)?.id || null);
      } catch (e) {
        alert("Deletion failed.");
      }
    }
  };

  const handleTaskComplete = (task: MaintenanceTask) => {
    const cost = prompt(`How much did this service cost? (Est: ${task.estimatedCost})`, task.estimatedCost?.toString() || "0");
    if (cost !== null) {
      completeTask(task.id, parseFloat(cost), activeVehicle?.mileage || 0);
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
          addServiceLog({
            id: Math.random().toString(36).substr(2, 9),
            vehicleId: activeVehicle.id,
            date: result.date || new Date().toISOString(),
            description: result.description,
            cost: result.totalCost,
            mileage: result.mileageFound || activeVehicle.mileage
          });
        }
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      alert("Receipt scanning failed.");
    } finally {
      setIsScanningReceipt(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeVehicle) return;
    
    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await updateVehicleData(activeVehicle.id, { imageUrl: base64 });
        updateVehicle(activeVehicle.id, { imageUrl: base64 });
        setIsUploading(false);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      alert("Image processing failed.");
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-slide-in">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">My Garage</h1>
          <p className="text-slate-500 font-medium tracking-tight">Managing {vehicles.length} intelligence profiles.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
          + Add Asset
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Vehicle Selection & Active Profile */}
        <div className="lg:col-span-8 space-y-10">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {vehicles.map(v => (
              <button key={v.id} onClick={() => setActiveVehicleId(v.id)} className={`flex-shrink-0 min-w-[200px] p-6 rounded-[2rem] border-2 transition-all text-left ${activeVehicleId === v.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-105 z-10' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                <div className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-60">Profile {v.vin.slice(-4)}</div>
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
                      <span className="text-white font-black uppercase tracking-widest text-xs">{isUploading ? 'Compressing...' : 'Change Photo'}</span>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase">Profile</span>
                        <span className="text-slate-400 text-xs font-mono">{activeVehicle.vin}</span>
                      </div>
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
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Mileage Log</div>
                          <div className="text-xl font-black">{activeVehicle.mileage.toLocaleString()} km</div>
                       </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm">
                  <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Active Maintenance</h3>
                  <div className="space-y-4">
                    {vehicleTasks.length > 0 ? vehicleTasks.map(task => (
                      <div key={task.id} className="group flex flex-col p-6 bg-slate-50/30 rounded-3xl border border-slate-50 hover:bg-white hover:border-blue-100 transition-all">
                        <div className="flex justify-between items-start mb-4">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${task.priority === 'high' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                              {task.category === 'engine' ? '⚙️' : '🛠️'}
                           </div>
                           <button onClick={() => handleTaskComplete(task)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all">Complete</button>
                        </div>
                        <h4 className="font-black text-slate-900 text-lg leading-tight mb-1">{task.title}</h4>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target: {task.dueMileage?.toLocaleString()} km</div>
                      </div>
                    )) : (
                      <div className="text-center py-10 opacity-40 italic text-sm">All clear! No pending tasks.</div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Service Vault</h3>
                    <button onClick={() => receiptInputRef.current?.click()} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all">
                      {isScanningReceipt ? 'Scanning...' : 'Scan Receipt'}
                    </button>
                    <input type="file" ref={receiptInputRef} className="hidden" accept="image/*" onChange={handleReceiptScan} />
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                    {vehicleHistory.length > 0 ? vehicleHistory.map(log => (
                      <div key={log.id} className="p-5 border border-slate-100 rounded-3xl">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black text-slate-300 uppercase">{formatDate(log.date)}</span>
                          <span className="text-sm font-black text-slate-900">{formatCurrency(log.cost)}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 leading-tight">{log.description}</p>
                        <div className="mt-2 text-[10px] font-black text-blue-400 uppercase">{log.mileage.toLocaleString()} KM MARK</div>
                      </div>
                    )) : (
                      <div className="text-center py-10 opacity-40 italic text-sm">No service logs found yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
              <h3 className="text-2xl font-black text-slate-900 mb-2">Garage is empty</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">Add your first vehicle using its VIN for automated intelligence tracking.</p>
              <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20">Onboard First Asset</button>
            </div>
          )}
        </div>

        {/* Right Column: AI Diagnostics */}
        <div className="lg:col-span-4 space-y-10">
          <div className="bg-[#0f172a] text-white rounded-[3rem] p-10 shadow-2xl sticky top-28">
            <h3 className="text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
               <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xs">✧</span> AI Diagnostic
            </h3>
            <p className="text-slate-400 text-xs mb-6 font-medium leading-relaxed">Describe a sound, smell, or vibration. Gemini will run a JIT analysis.</p>
            <textarea value={symptom} onChange={(e) => setSymptom(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-sm mb-4 h-32 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600" placeholder="e.g. 'Squeaky brakes when reversing in the morning'"/>
            <button disabled={isAskingAI || !symptom || !activeVehicle} onClick={async () => {
              setIsAskingAI(true);
              try {
                const advice = await getAdvancedDiagnostic(activeVehicle, symptom, user?.tier === 'premium');
                setAiAdvice(advice);
              } catch (e) {
                alert("AI query failed. Check your API key.");
              }
              setIsAskingAI(false);
            }} className="w-full py-5 rounded-2xl font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 disabled:opacity-30 transition-all">
              {isAskingAI ? 'Running JIT Analysis...' : 'Consult Intelligence'}
            </button>
            {aiAdvice && (
              <div className="mt-6 space-y-4 animate-slide-in">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-sm">
                  <div className={`text-[10px] font-black uppercase mb-2 ${aiAdvice.severity === 'critical' ? 'text-rose-500' : 'text-blue-400'}`}>Severity: {aiAdvice.severity}</div>
                  <p className="font-medium text-slate-300">{aiAdvice.advice}</p>
                </div>
                {aiAdvice.recommendations.length > 0 && (
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="text-[10px] font-black text-slate-500 uppercase mb-2">Next Steps</div>
                    <ul className="space-y-2">
                      {aiAdvice.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-slate-400 flex gap-2"><span>•</span> {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xl">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-12 animate-slide-in relative border border-white/20">
            <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 font-black text-2xl">×</button>
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter text-center">New Asset Onboarding</h2>
            <p className="text-slate-500 text-center mb-8">Enter the 17-digit VIN found on your dash or door frame.</p>
            <form onSubmit={handleAddVehicle} className="space-y-6">
              <input type="text" required maxLength={17} placeholder="Enter VIN" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xl uppercase tracking-widest focus:ring-2 focus:ring-blue-600 outline-none" value={newVin} onChange={(e) => setNewVin(e.target.value.toUpperCase())} />
              <button disabled={isDecoding || newVin.length !== 17} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 disabled:opacity-30 transition-all shadow-xl shadow-slate-900/20">
                {isDecoding ? 'Decrypting Vehicle...' : 'Authorize Registration'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xl">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-12 animate-slide-in relative">
            <button onClick={() => setShowEditModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 font-black text-2xl">×</button>
            <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter text-center">Manage Asset</h2>
            <form onSubmit={handleEditVehicle} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Make</label>
                  <input type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={editForm.make} onChange={e => setEditForm({...editForm, make: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Model</label>
                  <input type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={editForm.model} onChange={e => setEditForm({...editForm, model: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Year</label>
                  <input type="number" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={editForm.year} onChange={e => setEditForm({...editForm, year: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Body Type</label>
                  <select className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={editForm.bodyType} onChange={e => setEditForm({...editForm, bodyType: e.target.value as BodyType})}>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="truck">Truck</option>
                    <option value="coupe">Coupe</option>
                    <option value="van">Van</option>
                  </select>
                </div>
              </div>
              <button className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Save Profile Updates</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
