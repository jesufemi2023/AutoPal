
import React, { useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { finalizeMaintenanceCompletion, createManualServiceLog } from '../services/vehicleService.ts';
import { MaintenanceTask, ServiceCategory, VerificationLevel, Vehicle } from '../shared/types.ts';

interface Props {
  vehicle: Vehicle;
  preselectedTask?: MaintenanceTask;
  onClose: () => void;
}

export const ServiceLogTerminal: React.FC<Props> = ({ vehicle, preselectedTask, onClose }) => {
  const { addServiceLog, tasks, setTasks, updateMileage } = useAutoPalStore();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  const [form, setForm] = useState({
    type: preselectedTask?.title || '',
    category: preselectedTask?.category || 'other' as ServiceCategory,
    mileage: vehicle.mileage,
    date: new Date().toISOString().split('T')[0],
    cost: preselectedTask?.estimatedCost?.toString() || '',
    provider: '',
    notes: '',
    verificationLevel: 'self_declared' as VerificationLevel,
    intervalKm: preselectedTask?.intervalKm || 5000,
    intervalMonths: preselectedTask?.intervalMonths || 6
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (preselectedTask) {
        // Recursive Task flow: Updates the rule, adds a log, and syncs telemetry
        const { log, updatedTask } = await finalizeMaintenanceCompletion(vehicle, preselectedTask, {
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
        const updatedTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        setTasks(updatedTasks);
      } else {
        // Ad-hoc History flow: Just adds a record to the ledger
        const log = await createManualServiceLog(vehicle, {
          vehicleId: vehicle.id,
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
      }
      
      if (form.mileage > vehicle.mileage) {
        updateMileage(vehicle.id, form.mileage);
      }
      
      onClose();
    } catch (e) {
      console.error(e);
      alert("Terminal Sync Error: Protocol failed to synchronize with cloud.");
    } finally {
      setIsSaving(false);
    }
  };

  const categories: ServiceCategory[] = ['engine', 'brakes', 'fluids', 'tires', 'suspension', 'other'];
  const verificationLevels: {id: VerificationLevel, label: string, icon: string}[] = [
    { id: 'self_declared', label: 'Self Declared', icon: '👤' },
    { id: 'receipt_verified', label: 'Physical Receipt', icon: '📄' },
    { id: 'mechanic_verified', label: 'Mechanic Verified', icon: '🛠️' }
  ];

  return (
    <div className="fixed inset-0 z-[1001] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-xl space-y-8">
        <header className="flex justify-between items-center text-white border-b border-slate-800 pb-8">
          <div className="space-y-1">
             <h3 className="text-2xl font-black uppercase tracking-tighter">
               {preselectedTask ? 'Finalize Protocol' : 'Ad-hoc Log Node'}
             </h3>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
               Step {step} • Manual Data Entry Entry
             </p>
          </div>
          <button onClick={onClose} className="text-3xl font-light text-slate-500 hover:text-white transition-colors">×</button>
        </header>

        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center">Service Category Selection</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => { setForm({...form, category: cat}); setStep(2); }}
                  className={`py-8 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] transition-all flex flex-col items-center gap-3 ${form.category === cat ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                >
                  <span className="text-2xl">
                    {cat === 'engine' ? '⚙️' : cat === 'brakes' ? '🛑' : cat === 'fluids' ? '🧪' : cat === 'tires' ? '🛞' : cat === 'suspension' ? '⛓️' : '🛠️'}
                  </span>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-12 animate-slide-up text-center">
            <div className="space-y-4">
               <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Current Telemetry (KM)</label>
               <input 
                type="number" 
                autoFocus
                className="w-full bg-transparent border-b-4 border-blue-600 text-6xl font-mono font-black text-white text-center py-4 outline-none tracking-tighter"
                value={form.mileage}
                onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})}
               />
            </div>
            <div className="space-y-6">
              <input 
                type="text" 
                placeholder="Service Descriptor (e.g. Synthetic Oil Refill)" 
                className="w-full bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 font-bold text-center outline-none focus:border-blue-600 transition-all"
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
              />
              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="w-1/2 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-500">Back</button>
                <button onClick={() => setStep(3)} className="w-1/2 bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl">Continue</button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-slide-up">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center">Credential Verification</h4>
            <div className="space-y-4">
              {verificationLevels.map(level => (
                <button 
                  key={level.id}
                  onClick={() => { setForm({...form, verificationLevel: level.id}); setStep(4); }}
                  className={`w-full p-6 rounded-2xl border-2 flex items-center justify-between transition-all ${form.verificationLevel === level.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                >
                  <div className="flex items-center gap-6">
                    <span className="text-2xl">{level.icon}</span>
                    <div className="font-black uppercase tracking-widest text-[11px]">{level.label}</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-4 ${form.verificationLevel === level.id ? 'border-white bg-blue-400' : 'border-slate-800'}`}></div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="w-full py-4 text-slate-600 font-black uppercase text-[10px] tracking-widest">Previous Step</button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-12 animate-slide-up text-center">
            <div className="space-y-4">
               <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Financial Cost (₦)</label>
               <input 
                type="number" 
                autoFocus
                className="w-full bg-transparent border-b-4 border-emerald-500 text-6xl font-mono font-black text-white text-center py-4 outline-none tracking-tighter"
                value={form.cost}
                onChange={e => setForm({...form, cost: e.target.value})}
               />
            </div>
            <div className="space-y-6">
               <input 
                type="text" 
                placeholder="Vendor / Workshop Brand" 
                className="w-full bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 font-bold text-center outline-none focus:border-blue-600 mb-2"
                value={form.provider}
                onChange={e => setForm({...form, provider: e.target.value})}
              />
              <div className="flex gap-4">
                <button onClick={() => setStep(3)} className="w-1/2 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-500">Back</button>
                <button 
                  onClick={() => {
                    if (preselectedTask) setStep(5);
                    else handleSave();
                  }} 
                  disabled={isSaving}
                  className={`w-1/2 ${preselectedTask ? 'bg-slate-800 text-slate-300' : 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20'} py-4 rounded-xl font-black uppercase tracking-widest text-[10px] border border-slate-700 transition-all`}
                >
                  {isSaving ? 'Syncing...' : (preselectedTask ? 'Recurrence Tuning' : 'Complete Entry')}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 5 && preselectedTask && (
          <div className="space-y-8 animate-slide-up">
             <div className="text-center space-y-4">
                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Recursive Maintenance Optimization</h4>
                <p className="text-[10px] text-slate-600 font-medium leading-relaxed">Adjust the future due-date parameters for this specific rule.</p>
             </div>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-slate-500 text-[9px] font-black uppercase tracking-widest ml-2">Interval (KM)</label>
                   <input 
                    type="number" 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 text-2xl font-mono font-black text-blue-500 outline-none text-center focus:border-blue-600 transition-all"
                    value={form.intervalKm}
                    onChange={e => setForm({...form, intervalKm: parseInt(e.target.value) || 0})}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-slate-500 text-[9px] font-black uppercase tracking-widest ml-2">Interval (Months)</label>
                   <input 
                    type="number" 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 text-2xl font-mono font-black text-blue-500 outline-none text-center focus:border-blue-600 transition-all"
                    value={form.intervalMonths}
                    onChange={e => setForm({...form, intervalMonths: parseInt(e.target.value) || 0})}
                   />
                </div>
             </div>
             <div className="flex gap-4">
                <button onClick={() => setStep(4)} className="w-1/2 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-500">Back</button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-1/2 bg-white text-slate-950 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all"
                >
                  {isSaving ? 'Updating Intelligence...' : 'Commit Protocol'}
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
