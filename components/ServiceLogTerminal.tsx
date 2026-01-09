
import React, { useState, useMemo } from 'react';
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
    intervalMonths: preselectedTask?.intervalMonths || 6,
    linkToTaskId: preselectedTask?.id || null as string | null
  });

  // Precision Refinement: Ad-hoc Matcher
  const matchedTask = useMemo(() => {
    if (preselectedTask || step !== 2) return null;
    const input = form.type.toLowerCase();
    return tasks.find(t => 
      t.status === 'pending' && 
      t.vehicleId === vehicle.id &&
      (input.includes(t.title.toLowerCase()) || t.title.toLowerCase().includes(input))
    );
  }, [form.type, tasks, preselectedTask, step, vehicle.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Use the matched task if one was found during ad-hoc entry
      const activeTask = preselectedTask || (form.linkToTaskId ? tasks.find(t => t.id === form.linkToTaskId) : null);

      if (activeTask) {
        // Recursive Task flow: Updates the rule, adds a log, and syncs telemetry
        const { log, updatedTask } = await finalizeMaintenanceCompletion(vehicle, activeTask, {
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
      alert("Terminal Sync Error: Node synchronization failure.");
    } finally {
      setIsSaving(false);
    }
  };

  const categories: ServiceCategory[] = ['engine', 'brakes', 'fluids', 'tires', 'suspension', 'other'];
  const verificationLevels: {id: VerificationLevel, label: string, icon: string}[] = [
    { id: 'self_declared', label: 'Self Declared', icon: '👤' },
    { id: 'receipt_verified', label: 'Receipt Upload', icon: '📄' },
    { id: 'mechanic_verified', label: 'Mechanic Authenticated', icon: '🛠️' }
  ];

  return (
    <div className="fixed inset-0 z-[1001] bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-xl space-y-10">
        <header className="flex justify-between items-center text-white border-b border-slate-800 pb-10">
          <div className="space-y-1">
             <h3 className="text-3xl font-black uppercase tracking-tighter">
               {preselectedTask ? 'Finalize Protocol' : 'Intelligence Log'}
             </h3>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
               Operational Step {step} / 5
             </p>
          </div>
          <button onClick={onClose} className="text-4xl font-light text-slate-600 hover:text-white transition-colors">×</button>
        </header>

        {step === 1 && (
          <div className="space-y-8 animate-slide-up">
            <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] text-center">System Category Mapping</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => { setForm({...form, category: cat}); setStep(2); }}
                  className={`py-10 rounded-3xl border-2 font-black uppercase tracking-widest text-[9px] transition-all flex flex-col items-center gap-4 ${form.category === cat ? 'bg-blue-600 border-blue-600 text-white shadow-3xl shadow-blue-500/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                >
                  <span className="text-3xl">
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
               <label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Current Telemetry (KM)</label>
               <input 
                type="number" 
                autoFocus
                className="w-full bg-transparent border-b-4 border-blue-600 text-6xl font-mono font-black text-white text-center py-6 outline-none tracking-tighter"
                value={form.mileage}
                onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})}
               />
            </div>
            <div className="space-y-6">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Service Description..." 
                  className="w-full bg-slate-900 text-white p-8 rounded-3xl border-2 border-slate-800 font-bold text-center outline-none focus:border-blue-600 transition-all text-lg"
                  value={form.type}
                  onChange={e => setForm({...form, type: e.target.value})}
                />
                {matchedTask && (
                   <div className="absolute -bottom-10 left-0 right-0 animate-in slide-in-from-top-4 duration-500">
                      <button 
                        onClick={() => setForm({...form, linkToTaskId: matchedTask.id, category: matchedTask.category, type: matchedTask.title})}
                        className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full border ${form.linkToTaskId === matchedTask.id ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-blue-600/10 border-blue-600 text-blue-500'}`}
                      >
                        {form.linkToTaskId === matchedTask.id ? '✓ Match Linked' : `Match found: ${matchedTask.title} (Link?)`}
                      </button>
                   </div>
                )}
              </div>
              <div className="flex gap-4 pt-8">
                <button onClick={() => setStep(1)} className="w-1/3 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-500">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-3xl active:scale-95 transition-all">Continue Execution</button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-slide-up">
            <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] text-center">Identity Verification</h4>
            <div className="space-y-5">
              {verificationLevels.map(level => (
                <button 
                  key={level.id}
                  onClick={() => { setForm({...form, verificationLevel: level.id}); setStep(4); }}
                  className={`w-full p-8 rounded-3xl border-2 flex items-center justify-between transition-all ${form.verificationLevel === level.id ? 'bg-blue-600 border-blue-600 text-white shadow-2xl' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                >
                  <div className="flex items-center gap-6">
                    <span className="text-3xl">{level.icon}</span>
                    <div className="text-left">
                       <div className="font-black uppercase tracking-widest text-[11px]">{level.label}</div>
                       <div className="text-[8px] font-bold opacity-40 uppercase tracking-widest mt-1">Impacts Vitality Multiplier</div>
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-full border-4 ${form.verificationLevel === level.id ? 'border-white bg-blue-400' : 'border-slate-800'}`}></div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="w-full py-5 text-slate-600 font-black uppercase text-[10px] tracking-[0.4em]">Reverse Protocol</button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-12 animate-slide-up text-center">
            <div className="space-y-4">
               <label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Financial Transaction (₦)</label>
               <input 
                type="number" 
                autoFocus
                className="w-full bg-transparent border-b-4 border-emerald-500 text-7xl font-mono font-black text-white text-center py-6 outline-none tracking-tighter"
                value={form.cost}
                onChange={e => setForm({...form, cost: e.target.value})}
               />
            </div>
            <div className="space-y-8">
               <input 
                type="text" 
                placeholder="Service Provider / Facility Name" 
                className="w-full bg-slate-900 text-white p-8 rounded-3xl border-2 border-slate-800 font-bold text-center outline-none focus:border-blue-600 transition-all"
                value={form.provider}
                onChange={e => setForm({...form, provider: e.target.value})}
              />
              <div className="flex gap-4">
                <button onClick={() => setStep(3)} className="w-1/3 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-500">Back</button>
                <button 
                  onClick={() => {
                    if (preselectedTask || form.linkToTaskId) setStep(5);
                    else handleSave();
                  }} 
                  disabled={isSaving}
                  className={`flex-1 ${(preselectedTask || form.linkToTaskId) ? 'bg-slate-800 text-slate-300' : 'bg-emerald-600 text-white shadow-3xl shadow-emerald-500/20'} py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] border-2 border-slate-700 transition-all active:scale-95`}
                >
                  {isSaving ? 'Synchronizing...' : ( (preselectedTask || form.linkToTaskId) ? 'Recurrence Tuning →' : 'Finalize Ledger Entry')}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (preselectedTask || form.linkToTaskId) && (
          <div className="space-y-10 animate-slide-up">
             <div className="text-center space-y-4">
                <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Recursive Optimization</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Adjust future milestones for this asset</p>
             </div>
             <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                   <label className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] ml-2">Interval (KM)</label>
                   <input 
                    type="number" 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl p-8 text-3xl font-mono font-black text-blue-500 outline-none text-center focus:border-blue-600 transition-all"
                    value={form.intervalKm}
                    onChange={e => setForm({...form, intervalKm: parseInt(e.target.value) || 0})}
                   />
                </div>
                <div className="space-y-3">
                   <label className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] ml-2">Interval (Months)</label>
                   <input 
                    type="number" 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl p-8 text-3xl font-mono font-black text-blue-500 outline-none text-center focus:border-blue-600 transition-all"
                    value={form.intervalMonths}
                    onChange={e => setForm({...form, intervalMonths: parseInt(e.target.value) || 0})}
                   />
                </div>
             </div>
             <div className="flex gap-4 pt-4">
                <button onClick={() => setStep(4)} className="w-1/3 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-500">Back</button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-white text-slate-950 py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-[12px] shadow-4xl active:scale-95 transition-all"
                >
                  {isSaving ? 'Processing Protocol...' : 'Launch Sync Protocol'}
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceLogTerminal;
