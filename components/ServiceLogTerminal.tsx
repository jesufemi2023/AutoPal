
import React, { useState, useEffect, useMemo } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { finalizeMaintenanceCompletion, createManualServiceLog, syncVehicleVitals } from '../services/vehicleService.ts';
import { updateServiceLog } from '../services/logService.ts';
import { MaintenanceTask, ServiceCategory, VerificationLevel, Vehicle, ServiceLog } from '../shared/types.ts';

interface Props {
  vehicle: Vehicle;
  preselectedTask?: MaintenanceTask;
  initialLog?: ServiceLog;
  onClose: () => void;
}

export const ServiceLogTerminal: React.FC<Props> = ({ vehicle, preselectedTask, initialLog, onClose }) => {
  const { addServiceLog, updateServiceLogStore, tasks, setTasks, updateMileage, updateVehicleStore } = useAutoPalStore();
  const [step, setStep] = useState(initialLog ? 2 : (preselectedTask ? 2 : 1));
  const [isSaving, setIsSaving] = useState(false);
  
  const [form, setForm] = useState({
    type: initialLog?.serviceType || preselectedTask?.title || '',
    category: initialLog?.category || preselectedTask?.category || 'other' as ServiceCategory,
    mileage: initialLog?.mileageAtService || vehicle.mileage,
    date: initialLog?.serviceDate || new Date().toISOString().split('T')[0],
    cost: initialLog?.cost.toString() || preselectedTask?.estimatedCost?.toString() || '',
    provider: initialLog?.provider || '',
    notes: initialLog?.notes || '',
    verificationLevel: initialLog?.verificationLevel || 'self_declared' as VerificationLevel,
    intervalKm: preselectedTask?.intervalKm || 5000,
    intervalMonths: preselectedTask?.intervalMonths || 6,
    linkToTaskId: initialLog?.taskId || preselectedTask?.id || null as string | null
  });

  const availableTasks = useMemo(() => 
    tasks.filter(t => t.vehicleId === vehicle.id && t.status === 'pending'),
    [tasks, vehicle.id]
  );

  // Auto-Link Logic: Suggestions as user types
  const suggestion = useMemo(() => {
    if (form.linkToTaskId || form.type.length < 3) return null;
    return availableTasks.find(t => 
      t.title.toLowerCase().includes(form.type.toLowerCase()) ||
      form.type.toLowerCase().includes(t.title.toLowerCase())
    );
  }, [form.type, form.linkToTaskId, availableTasks]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const activeTask = form.linkToTaskId ? tasks.find(t => t.id === form.linkToTaskId) : preselectedTask;

      if (initialLog) {
        const updated = await updateServiceLog(initialLog.id, {
          serviceType: form.type,
          serviceDate: form.date,
          mileageAtService: form.mileage,
          cost: parseFloat(form.cost) || 0,
          provider: form.provider,
          notes: form.notes,
          category: form.category,
          verificationLevel: form.verificationLevel
        });
        updateServiceLogStore(updated);
        const syncedVehicle = await syncVehicleVitals(vehicle.id);
        updateVehicleStore(syncedVehicle);
      } else if (activeTask) {
        const { log, updatedTask, updatedVehicle } = await finalizeMaintenanceCompletion(vehicle, activeTask, {
          mileageAtService: form.mileage,
          serviceDate: form.date,
          cost: parseFloat(form.cost) || 0,
          provider: form.provider,
          notes: form.notes,
          verificationLevel: form.verificationLevel,
          intervalKm: form.intervalKm,
          intervalMonths: form.intervalMonths
        });
        
        addServiceLog(log);
        setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        updateVehicleStore(updatedVehicle);
      } else {
        const log = await createManualServiceLog(vehicle, {
          vehicleId: vehicle.id,
          taskId: form.linkToTaskId || undefined,
          serviceType: form.type || "Unscheduled Maintenance",
          serviceDate: form.date,
          mileageAtService: form.mileage,
          cost: parseFloat(form.cost) || 0,
          provider: form.provider,
          notes: form.notes,
          category: form.category,
          verificationLevel: form.verificationLevel,
          status: 'completed'
        });
        addServiceLog(log);
        const syncedVehicle = await syncVehicleVitals(vehicle.id);
        updateVehicleStore(syncedVehicle);
      }
      
      if (form.mileage > vehicle.mileage) {
        updateMileage(vehicle.id, form.mileage);
      }
      onClose();
    } catch (e) {
      alert("Neural Link Error: Sync failure.");
    } finally {
      setIsSaving(false);
    }
  };

  const categories: ServiceCategory[] = ['engine', 'brakes', 'fluids', 'tires', 'suspension', 'other'];

  return (
    <div className="fixed inset-0 z-[1001] bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-xl space-y-10">
        <header className="flex justify-between items-center text-white border-b border-slate-800 pb-10">
          <div className="flex items-center gap-6">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl hover:bg-blue-600 transition-all">←</button>
            )}
            <div>
              <h3 className="text-3xl font-black uppercase tracking-tighter">
                {initialLog ? 'Recalibration' : 'Neural Link'}
              </h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Digital Twin Service Entry</p>
            </div>
          </div>
          <button onClick={onClose} className="text-4xl text-slate-600">×</button>
        </header>

        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest text-center">Select Pillar</h4>
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
               <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest block text-center">Describe Task</label>
               <input 
                type="text" 
                placeholder="What did you do?" 
                className="w-full bg-slate-900 text-white p-8 rounded-3xl border-2 border-slate-800 font-black text-center text-xl outline-none focus:border-blue-600"
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
               />
               
               {/* Neural Suggestion Bridge */}
               {suggestion && (
                 <button 
                  onClick={() => setForm({...form, linkToTaskId: suggestion.id, type: suggestion.title, category: suggestion.category})}
                  className="w-full bg-blue-600/10 border border-blue-500/20 text-blue-500 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 animate-pulse"
                 >
                   <span>✦ Did you mean: {suggestion.title}?</span>
                   <span className="bg-blue-600 text-white px-2 py-0.5 rounded">LINK NOW</span>
                 </button>
               )}
            </div>

            <div className="space-y-4">
               <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest block text-center">Service Odometer (KM)</label>
               <input 
                type="number" 
                className="w-full bg-transparent border-b-4 border-blue-600 text-6xl font-mono font-black text-white text-center py-4 outline-none tracking-tighter"
                value={form.mileage}
                onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})}
               />
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(3)} className="flex-1 bg-white text-slate-950 py-6 rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-3xl">Next Step →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-slide-up">
             <div className="space-y-4">
                <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest block text-center">Cost (₦)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-900 text-white p-8 rounded-3xl border-2 border-slate-800 font-black text-center text-3xl outline-none"
                  value={form.cost}
                  onChange={e => setForm({...form, cost: e.target.value})}
                />
             </div>
             
             <div className="space-y-4">
                <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest block text-center">Bond to Roadmap (Optional)</label>
                <select 
                  className="w-full bg-slate-900 text-white p-6 rounded-2xl border-2 border-slate-800 font-bold outline-none"
                  value={form.linkToTaskId || ''}
                  onChange={e => setForm({...form, linkToTaskId: e.target.value || null})}
                >
                  <option value="">-- No Link (Unscheduled Service) --</option>
                  {availableTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.dueMileage}km)</option>
                  ))}
                </select>
             </div>

             <button 
               onClick={handleSave} 
               disabled={isSaving}
               className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[12px] shadow-4xl"
             >
               {isSaving ? 'Processing Protocol...' : 'Finalize & Sync'}
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceLogTerminal;
