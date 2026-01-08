
import React, { useState, useRef } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { finalizeMaintenanceCompletion } from '../services/vehicleService.ts';
import { extractReceiptData } from '../services/geminiService.ts';
import { MaintenanceTask, ServiceCategory, VerificationLevel, Vehicle } from '../shared/types.ts';
import { compressImage } from '../shared/utils.ts';

interface Props {
  vehicle: Vehicle;
  preselectedTask?: MaintenanceTask;
  onClose: () => void;
}

export const ServiceLogTerminal: React.FC<Props> = ({ vehicle, preselectedTask, onClose }) => {
  const { user, addServiceLog, tasks, setTasks, updateMileage } = useAutoPalStore();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState({
    type: preselectedTask?.title || '',
    category: preselectedTask?.category || 'other' as ServiceCategory,
    mileage: vehicle.mileage,
    date: new Date().toISOString().split('T')[0],
    cost: preselectedTask?.estimatedCost?.toString() || '',
    provider: '',
    notes: '',
    verificationLevel: 'self_declared' as VerificationLevel,
    receiptUrl: '',
    intervalKm: preselectedTask?.intervalKm || 5000,
    intervalMonths: preselectedTask?.intervalMonths || 6
  });

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const compressed = await compressImage(file, 1024, 0.6);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const data = await extractReceiptData(base64);
        setForm(prev => ({
          ...prev,
          cost: data.totalAmount?.toString() || prev.cost,
          provider: data.vendor || prev.provider,
          date: data.date || prev.date,
          verificationLevel: 'receipt_verified',
          receiptUrl: 'CLOUD_VERIFIED_BLOB' 
        }));
        setStep(4);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      alert("Optical Scan Failed. Falling back to manual entry.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    if (!preselectedTask) return;
    setIsSaving(true);
    try {
      const { log, updatedTask } = await finalizeMaintenanceCompletion(vehicle, preselectedTask, {
        mileageAtService: form.mileage,
        serviceDate: form.date,
        cost: parseFloat(form.cost) || 0,
        provider: form.provider,
        notes: form.notes,
        verificationLevel: form.verificationLevel,
        receiptUrl: form.receiptUrl,
        intervalKm: form.intervalKm,
        intervalMonths: form.intervalMonths
      });
      
      addServiceLog(log);
      const updatedTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
      setTasks(updatedTasks);
      
      if (form.mileage > vehicle.mileage) {
        updateMileage(vehicle.id, form.mileage);
      }
      
      onClose();
    } catch (e) {
      alert("Terminal Sync Error.");
    } finally {
      setIsSaving(false);
    }
  };

  const categories: ServiceCategory[] = ['engine', 'brakes', 'fluids', 'tires', 'suspension', 'other'];
  const verificationLevels: {id: VerificationLevel, label: string, icon: string}[] = [
    { id: 'self_declared', label: 'Self Declared', icon: '👤' },
    { id: 'receipt_verified', label: 'Receipt Verified', icon: '📄' },
    { id: 'mechanic_verified', label: 'Mechanic Verified', icon: '🛠️' }
  ];

  return (
    <div className="fixed inset-0 z-[1001] bg-slate-950/95 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-lg space-y-10">
        <header className="flex justify-between items-center text-white">
          <div className="space-y-1">
             <h3 className="text-xl font-black uppercase tracking-tighter">Terminal Execution</h3>
             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
               Step {step} • {isScanning ? 'AI Optical Scanning...' : 'Node Verification'}
             </p>
          </div>
          <button onClick={onClose} className="text-3xl font-light">×</button>
        </header>

        {isScanning && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Gemini 3 Flash: Extracting Telemetry...</p>
          </div>
        )}

        {!isScanning && step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center">Protocol Category</h4>
            <div className="grid grid-cols-2 gap-4">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => { setForm({...form, category: cat}); setStep(2); }}
                  className={`py-8 rounded-[2rem] border-2 font-black uppercase tracking-widest text-[10px] transition-all ${form.category === cat ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isScanning && step === 2 && (
          <div className="space-y-8 animate-slide-up text-center">
            <div className="space-y-4">
               <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Target Odometer (KM)</label>
               <input 
                type="number" 
                className="w-full bg-transparent border-b-4 border-blue-600 text-6xl font-mono font-black text-white text-center py-4 outline-none tracking-tighter"
                value={form.mileage}
                onChange={e => setForm({...form, mileage: parseInt(e.target.value)})}
               />
            </div>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Task Description" 
                className="w-full bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 font-bold text-center outline-none"
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
              />
              <div className="grid grid-cols-1 gap-4">
                {user?.tier === 'premium' ? (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 text-white py-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                  >
                    <span>📸</span> Flash-Scan Receipt (Premium)
                  </button>
                ) : (
                  <button onClick={() => setStep(3)} className="bg-slate-900 text-slate-400 border border-slate-800 py-6 rounded-2xl font-black uppercase tracking-widest text-xs">Manual Entry Mode →</button>
                )}
                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleScanReceipt} />
                {user?.tier === 'premium' && <button onClick={() => setStep(3)} className="text-slate-600 text-[9px] font-black uppercase tracking-widest">Or Skip AI & Use Manual Entry</button>}
              </div>
            </div>
          </div>
        )}

        {!isScanning && step === 3 && (
          <div className="space-y-6 animate-slide-up">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center">Verification Level</h4>
            <div className="space-y-4">
              {verificationLevels.map(level => (
                <button 
                  key={level.id}
                  onClick={() => { setForm({...form, verificationLevel: level.id}); setStep(4); }}
                  className={`w-full p-6 rounded-2xl border-2 flex items-center gap-6 transition-all ${form.verificationLevel === level.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                >
                  <span className="text-2xl">{level.icon}</span>
                  <div>
                    <div className="font-black uppercase tracking-widest text-[10px]">{level.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!isScanning && step === 4 && (
          <div className="space-y-8 animate-slide-up text-center">
            <div className="space-y-4">
               <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Amount (₦)</label>
               <input 
                type="number" 
                className="w-full bg-transparent border-b-4 border-emerald-500 text-6xl font-mono font-black text-white text-center py-4 outline-none tracking-tighter"
                value={form.cost}
                onChange={e => setForm({...form, cost: e.target.value})}
               />
            </div>
            <div className="space-y-4">
               <input 
                type="text" 
                placeholder="Vendor / Workshop Name" 
                className="w-full bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 font-bold text-center outline-none"
                value={form.provider}
                onChange={e => setForm({...form, provider: e.target.value})}
              />
              <button 
                onClick={() => setStep(5)} 
                className="w-full bg-slate-800 text-slate-300 py-6 rounded-2xl font-black uppercase tracking-widest text-xs border border-slate-700"
              >
                Configure Recurrence →
              </button>
            </div>
          </div>
        )}

        {!isScanning && step === 5 && (
          <div className="space-y-8 animate-slide-up text-center">
             <div className="space-y-6">
                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Recurrence Optimization</h4>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-slate-500 text-[8px] font-black uppercase tracking-widest">Interval (KM)</label>
                      <input 
                        type="number" 
                        className="w-full bg-slate-900 border-2 border-slate-800 rounded-xl p-4 text-xl font-mono font-black text-blue-500 outline-none text-center"
                        value={form.intervalKm}
                        onChange={e => setForm({...form, intervalKm: parseInt(e.target.value) || 0})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-slate-500 text-[8px] font-black uppercase tracking-widest">Months</label>
                      <input 
                        type="number" 
                        className="w-full bg-slate-900 border-2 border-slate-800 rounded-xl p-4 text-xl font-mono font-black text-blue-500 outline-none text-center"
                        value={form.intervalMonths}
                        onChange={e => setForm({...form, intervalMonths: parseInt(e.target.value) || 0})}
                      />
                   </div>
                </div>
                <p className="text-slate-500 text-[9px] font-medium leading-relaxed px-4">
                  Adjust these values to fine-tune the JIT prediction for the next {form.type || 'service'}. 
                  The Velocity Engine will recalibrate based on these inputs.
                </p>
             </div>
             <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full bg-emerald-600 text-white py-8 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[12px] shadow-3xl shadow-emerald-500/20"
              >
                {isSaving ? "Recursive Syncing..." : "Finalize Protocol"}
              </button>
              <button 
                onClick={() => setStep(4)} 
                className="text-slate-500 text-[9px] font-black uppercase tracking-widest"
              >
                ← Back to Financials
              </button>
          </div>
        )}
      </div>
    </div>
  );
};
