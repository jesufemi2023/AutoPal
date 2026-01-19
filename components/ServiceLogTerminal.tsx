import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { finalizeMaintenanceCompletion, createManualServiceLog, syncVehicleVitals, uploadVehicleImage } from '../services/vehicleService.ts';
import { updateServiceLog } from '../services/logService.ts';
import { MaintenanceTask, ServiceCategory, VerificationLevel, Vehicle, ServiceLog } from '../shared/types.ts';
import { compressImage } from '../shared/utils.ts';
import { canLogService } from '../services/permissionService.ts';

interface Props {
  vehicle: Vehicle;
  preselectedTask?: MaintenanceTask;
  initialLog?: ServiceLog;
  onClose: () => void;
}

export const ServiceLogTerminal: React.FC<Props> = ({ vehicle, preselectedTask, initialLog, onClose }) => {
  const { user, addServiceLog, updateServiceLogStore, tasks, setTasks, updateMileage, updateVehicleStore, updateUsageLedger } = useAutoPalStore();
  const [step, setStep] = useState(initialLog ? 2 : (preselectedTask ? 2 : 1));
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    type: initialLog?.serviceType || preselectedTask?.title || '',
    category: initialLog?.category || preselectedTask?.category || 'other' as ServiceCategory,
    mileage: initialLog?.mileageAtService || vehicle.mileage,
    date: initialLog?.serviceDate || new Date().toISOString().split('T')[0],
    cost: initialLog?.cost.toString() || preselectedTask?.estimatedCost?.toString() || '',
    notes: initialLog?.notes || '',
    provider: initialLog?.provider || '',
    verificationLevel: (initialLog?.verificationLevel || preselectedTask?.lastVerificationLevel || 'self_declared') as VerificationLevel,
    intervalKm: preselectedTask?.intervalKm || 5000,
    intervalMonths: preselectedTask?.intervalMonths || 6,
    linkToTaskId: initialLog?.taskId || preselectedTask?.id || null as string | null
  });

  const availableTasks = useMemo(() => 
    tasks.filter(t => t.vehicleId === vehicle.id && t.status === 'pending'),
    [tasks, vehicle.id]
  );

  const suggestion = useMemo(() => {
    if (form.linkToTaskId || form.type.length < 3) return null;
    return availableTasks.find(t => 
      t.title.toLowerCase().includes(form.type.toLowerCase()) ||
      form.type.toLowerCase().includes(t.title.toLowerCase())
    );
  }, [form.type, form.linkToTaskId, availableTasks]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Check Permissions for NEW logs
    if (!initialLog) {
      const permission = canLogService(user);
      if (!permission.allowed) {
        alert(permission.reason);
        return;
      }
    }

    setIsSaving(true);
    try {
      let finalReceiptUrl = initialLog?.receiptUrl || '';

      // Upload proof if selected
      if (selectedFile && user?.id) {
        try {
          const compressed = await compressImage(selectedFile, 1200, 0.7);
          finalReceiptUrl = await uploadVehicleImage(user.id, vehicle.id, compressed);
        } catch (e) {
          console.error("Proof sync failure", e);
        }
      }

      const activeTask = form.linkToTaskId ? tasks.find(t => t.id === form.linkToTaskId) : preselectedTask;

      if (initialLog) {
        const updated = await updateServiceLog(initialLog.id, {
          serviceType: form.type,
          serviceDate: form.date,
          mileageAtService: form.mileage,
          cost: parseFloat(form.cost) || 0,
          notes: form.notes,
          provider: form.provider,
          category: form.category,
          verificationLevel: form.verificationLevel,
          receiptUrl: finalReceiptUrl
        }, user);
        updateServiceLogStore(updated);
        const syncedVehicle = await syncVehicleVitals(vehicle.id);
        updateVehicleStore(syncedVehicle);
      } else if (activeTask) {
        const { log, updatedTask, updatedVehicle } = await finalizeMaintenanceCompletion(vehicle, activeTask, {
          mileageAtService: form.mileage,
          serviceDate: form.date,
          cost: parseFloat(form.cost) || 0,
          notes: form.notes,
          provider: form.provider,
          verificationLevel: form.verificationLevel,
          receiptUrl: finalReceiptUrl,
          intervalKm: form.intervalKm,
          intervalMonths: form.intervalMonths
        });
        
        addServiceLog(log);
        setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        updateVehicleStore(updatedVehicle);
        
        // Track Usage
        updateUsageLedger({
          serviceLogsCount: (user.usageLedger.serviceLogsCount || 0) + 1,
          lastServiceLogAt: new Date().toISOString()
        });
      } else {
        const log = await createManualServiceLog(vehicle, {
          vehicleId: vehicle.id,
          taskId: form.linkToTaskId || undefined,
          serviceType: form.type || "Unscheduled Maintenance",
          serviceDate: form.date,
          mileageAtService: form.mileage,
          cost: parseFloat(form.cost) || 0,
          notes: form.notes,
          provider: form.provider,
          category: form.category,
          verificationLevel: form.verificationLevel,
          receiptUrl: finalReceiptUrl,
          status: 'completed'
        });
        addServiceLog(log);
        const syncedVehicle = await syncVehicleVitals(vehicle.id);
        updateVehicleStore(syncedVehicle);

        // Track Usage
        updateUsageLedger({
          serviceLogsCount: (user.usageLedger.serviceLogsCount || 0) + 1,
          lastServiceLogAt: new Date().toISOString()
        });
      }
      
      if (form.mileage > vehicle.mileage) {
        updateMileage(vehicle.id, form.mileage);
      }
      onClose();
    } catch (e) {
      alert("Failed to save service log.");
    } finally {
      setIsSaving(false);
    }
  };

  const categories: ServiceCategory[] = ['engine', 'brakes', 'fluids', 'tires', 'suspension', 'other'];

  return (
    <div className="fixed inset-0 z-[1001] bg-slate-950/95 backdrop-blur-3xl overflow-y-auto scrollbar-hide flex flex-col p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-xl mx-auto space-y-10 pt-10 pb-20">
        <header className="flex justify-between items-center text-white border-b border-slate-800 pb-10">
          <div className="flex items-center gap-6">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl hover:bg-blue-600 transition-all">←</button>
            )}
            <div>
              <h3 className="text-3xl font-black uppercase tracking-tighter">
                {initialLog ? 'Update Entry' : 'Log Service'}
              </h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Maintenance Record</p>
            </div>
          </div>
          <button onClick={onClose} className="text-4xl text-slate-600">×</button>
        </header>

        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest text-center">Which part of the car was serviced?</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => { setForm({...form, category: cat}); setStep(2); }}
                  className={`py-8 rounded-3xl border-2 font-black uppercase tracking-widest text-[9px] transition-all ${form.category === cat ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-slide-up">
            <div className="space-y-4">
               <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest block text-center">Service Description</label>
               <input 
                type="text" 
                placeholder="e.g. Changed engine oil and filter" 
                className="w-full bg-slate-900 text-white p-8 rounded-3xl border-2 border-slate-800 font-black text-center text-xl outline-none focus:border-blue-600"
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
               />
               
               {suggestion && (
                 <button 
                  onClick={() => setForm({...form, linkToTaskId: suggestion.id, type: suggestion.title, category: suggestion.category})}
                  className="w-full bg-blue-600/10 border border-blue-500/20 text-blue-500 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 animate-pulse"
                 >
                   <span>✦ Matching Task Found: {suggestion.title}</span>
                   <span className="bg-blue-600 text-white px-2 py-0.5 rounded">LINK NOW</span>
                 </button>
               )}
            </div>

            <div className="space-y-4">
               <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest block text-center">Mileage at Service (KM)</label>
               <input 
                type="number" 
                className="w-full bg-transparent border-b-4 border-blue-600 text-6xl font-mono font-black text-white text-center py-4 outline-none tracking-tighter"
                value={form.mileage}
                onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})}
               />
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(3)} className="flex-1 bg-white text-slate-950 py-6 rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-3xl">Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-slide-up">
             <div className="space-y-4">
                <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest block text-center">Service Cost (₦)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  className="w-full bg-slate-900 text-white p-8 rounded-3xl border-2 border-slate-800 font-black text-center text-3xl outline-none"
                  value={form.cost}
                  onChange={e => setForm({...form, cost: e.target.value})}
                />
             </div>

             <div className="space-y-4">
                <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest block text-center">Service Center / Mechanic Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Total Service, Mechanic shop"
                  className="w-full bg-slate-900 text-white p-6 rounded-2xl border-2 border-slate-800 font-bold outline-none"
                  value={form.provider}
                  onChange={e => setForm({...form, provider: e.target.value})}
                />
             </div>
             
             <div className="space-y-4">
                <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest block text-center">Link to Maintenance Task (Optional)</label>
                <select 
                  className="w-full bg-slate-900 text-white p-6 rounded-2xl border-2 border-slate-800 font-bold outline-none"
                  value={form.linkToTaskId || ''}
                  onChange={e => setForm({...form, linkToTaskId: e.target.value || null})}
                >
                  <option value="">-- Manual Entry (Unscheduled) --</option>
                  {availableTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title} (Due at {t.dueMileage}km)</option>
                  ))}
                </select>
             </div>

             <button onClick={() => setStep(4)} className="w-full bg-white text-slate-950 py-6 rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-3xl">Final Step →</button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-10 animate-slide-up">
            <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest text-center">Proof of Service</h4>
            
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => setForm({...form, verificationLevel: 'self_declared'})}
                className={`p-6 rounded-[2rem] border-2 text-left transition-all ${form.verificationLevel === 'self_declared' ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-xs uppercase tracking-widest">Self-Declared</span>
                  {form.verificationLevel === 'self_declared' && <span>✓</span>}
                </div>
                <p className="text-[8px] font-bold uppercase opacity-60">I did this myself or have no receipt.</p>
              </button>

              <button 
                onClick={() => setForm({...form, verificationLevel: 'receipt_verified'})}
                className={`p-6 rounded-[2rem] border-2 text-left transition-all ${form.verificationLevel === 'receipt_verified' ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-xs uppercase tracking-widest">Receipt Scanned</span>
                  {form.verificationLevel === 'receipt_verified' && <span>✓</span>}
                </div>
                <p className="text-[8px] font-bold uppercase opacity-60">I have a photo of the receipt/invoice.</p>
              </button>

              <button 
                onClick={() => setForm({...form, verificationLevel: 'mechanic_verified'})}
                className={`p-6 rounded-[2rem] border-2 text-left transition-all ${form.verificationLevel === 'mechanic_verified' ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-xs uppercase tracking-widest">Mechanic Verified</span>
                  {form.verificationLevel === 'mechanic_verified' && <span>✓</span>}
                </div>
                <p className="text-[8px] font-bold uppercase opacity-60">Done at a registered workshop.</p>
              </button>
            </div>

            <div className="space-y-4">
              <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileSelect} />
              {filePreview ? (
                <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-slate-900 border-2 border-slate-800">
                  <img src={filePreview} className="w-full h-full object-cover" alt="Proof" />
                  <button onClick={() => { setSelectedFile(null); setFilePreview(null); }} className="absolute top-4 right-4 bg-rose-600 text-white p-2 rounded-full text-xs">×</button>
                </div>
              ) : (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-slate-800 rounded-[2rem] text-slate-500 text-[10px] font-black uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all"
                >
                  + Add Receipt Photo (Recommended)
                </button>
              )}
            </div>

            <button 
               onClick={handleSave} 
               disabled={isSaving}
               className="w-full bg-emerald-600 text-white py-8 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[12px] shadow-4xl hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-4"
             >
               {isSaving ? (
                 <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
               ) : 'Save Service Record'}
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceLogTerminal;