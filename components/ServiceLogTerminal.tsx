
import React, { useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { createServiceLogEntry } from '../services/vehicleService.ts';
import { MaintenanceTask, ServiceCategory } from '../shared/types.ts';
import { formatCurrency } from '../shared/utils.ts';

interface Props {
  vehicleId: string;
  currentMileage: number;
  preselectedTask?: MaintenanceTask;
  onClose: () => void;
}

export const ServiceLogTerminal: React.FC<Props> = ({ vehicleId, currentMileage, preselectedTask, onClose }) => {
  const { addServiceLog, completeTask, updateMileage } = useAutoPalStore();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  const [form, setForm] = useState({
    type: preselectedTask?.title || '',
    category: preselectedTask?.category || 'other' as ServiceCategory,
    mileage: currentMileage,
    date: new Date().toISOString().split('T')[0],
    cost: preselectedTask?.estimatedCost?.toString() || '',
    provider: ''
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const log = await createServiceLogEntry({
        vehicleId,
        serviceType: form.type,
        serviceDate: form.date,
        mileageAtService: form.mileage,
        cost: parseFloat(form.cost) || 0,
        provider: form.provider,
        category: form.category,
        // Fix: status is now a known optional property in ServiceLog
        status: 'completed'
      });
      
      addServiceLog(log);
      if (preselectedTask) completeTask(preselectedTask.id, log.cost, form.mileage);
      if (form.mileage > currentMileage) updateMileage(vehicleId, form.mileage);
      onClose();
    } catch (e) {
      alert("Terminal Sync Error");
    } finally {
      setIsSaving(false);
    }
  };

  const categories: ServiceCategory[] = ['engine', 'brakes', 'fluids', 'tires', 'suspension', 'other'];

  return (
    <div className="fixed inset-0 z-[1001] bg-slate-950/95 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-lg space-y-10">
        <header className="flex justify-between items-center text-white">
          <div className="space-y-1">
             <h3 className="text-xl font-black uppercase tracking-tighter">Log Verification</h3>
             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Step {step} of 3 • Hardware Interaction</p>
          </div>
          <button onClick={onClose} className="text-3xl font-light">×</button>
        </header>

        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center">Tap Service Category</h4>
            <div className="grid grid-cols-2 gap-4">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => { setForm({...form, category: cat}); setStep(2); }}
                  className={`py-8 rounded-[2rem] border-2 font-black uppercase tracking-widest text-[10px] transition-all ${form.category === cat ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-slide-up text-center">
            <div className="space-y-4">
               <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Confirm Telemetry (KM)</label>
               <input 
                type="number" 
                className="w-full bg-transparent border-b-4 border-blue-600 text-6xl font-mono font-black text-white text-center py-4 outline-none tracking-tighter"
                value={form.mileage}
                onChange={e => setForm({...form, mileage: parseInt(e.target.value)})}
               />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <input 
                type="text" 
                placeholder="Service Title (e.g. Oil Change)" 
                className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 font-bold text-center outline-none"
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
              />
              <button onClick={() => setStep(3)} className="bg-white text-slate-900 py-6 rounded-2xl font-black uppercase tracking-widest text-xs">Continue to Financials →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-slide-up text-center">
            <div className="space-y-4">
               <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Service Expenditure</label>
               <input 
                type="number" 
                placeholder="0"
                className="w-full bg-transparent border-b-4 border-emerald-500 text-6xl font-mono font-black text-white text-center py-4 outline-none tracking-tighter"
                value={form.cost}
                onChange={e => setForm({...form, cost: e.target.value})}
               />
            </div>
            <div className="space-y-4">
               <input 
                type="text" 
                placeholder="Vendor Name" 
                className="w-full bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 font-bold text-center outline-none"
                value={form.provider}
                onChange={e => setForm({...form, provider: e.target.value})}
              />
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full bg-emerald-600 text-white py-8 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs shadow-3xl shadow-emerald-500/20"
              >
                {isSaving ? "Synchronizing..." : "Finalize Digital Record"}
              </button>
              <button onClick={() => setStep(2)} className="text-slate-500 text-[10px] font-black uppercase tracking-widest">← Back to Hardware</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};