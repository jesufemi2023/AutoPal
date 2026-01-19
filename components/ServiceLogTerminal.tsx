
import React, { useState, useMemo, useRef } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { finalizeMaintenanceCompletion, createManualServiceLog, syncVehicleVitals, uploadVehicleImage } from '../services/vehicleService.ts';
import { updateServiceLog } from '../services/logService.ts';
import { MaintenanceTask, ServiceCategory, VerificationLevel, Vehicle, ServiceLog } from '../shared/types.ts';
import { compressImage } from '../shared/utils.ts';

interface Props {
  vehicle: Vehicle;
  preselectedTask?: MaintenanceTask;
  initialLog?: ServiceLog;
  onClose: () => void;
}

export const ServiceLogTerminal: React.FC<Props> = ({ vehicle, preselectedTask, initialLog, onClose }) => {
  const { user, addServiceLog, updateServiceLogStore, tasks, setTasks, updateVehicleStore } = useAutoPalStore();
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
    setIsSaving(true);
    try {
      let finalReceiptUrl = initialLog?.receiptUrl || '';
      if (selectedFile && user.id) {
        const compressed = await compressImage(selectedFile, 1200, 0.7);
        finalReceiptUrl = await uploadVehicleImage(user.id, vehicle.id, compressed);
      }

      const activeTask = form.linkToTaskId ? tasks.find(t => t.id === form.linkToTaskId) : preselectedTask;

      if (initialLog) {
        const updated = await updateServiceLog(initialLog.id, {
          serviceType: form.type, serviceDate: form.date, mileageAtService: form.mileage,
          cost: parseFloat(form.cost) || 0, notes: form.notes, provider: form.provider,
          category: form.category, verificationLevel: form.verificationLevel, receiptUrl: finalReceiptUrl
        });
        updateServiceLogStore(updated);
        const syncedVehicle = await syncVehicleVitals(vehicle.id);
        updateVehicleStore(syncedVehicle);
      } else if (activeTask) {
        const { log, updatedTask, updatedVehicle } = await finalizeMaintenanceCompletion(vehicle, activeTask, {
          mileageAtService: form.mileage, serviceDate: form.date, cost: parseFloat(form.cost) || 0,
          notes: form.notes, provider: form.provider, verificationLevel: form.verificationLevel,
          receiptUrl: finalReceiptUrl, intervalKm: form.intervalKm, intervalMonths: form.intervalMonths
        });
        addServiceLog(log);
        setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        updateVehicleStore(updatedVehicle);
      } else {
        const log = await createManualServiceLog(vehicle, {
          vehicleId: vehicle.id, taskId: form.linkToTaskId || undefined,
          serviceType: form.type || "Unscheduled Maintenance", serviceDate: form.date,
          mileageAtService: form.mileage, cost: parseFloat(form.cost) || 0,
          notes: form.notes, provider: form.provider, category: form.category,
          verificationLevel: form.verificationLevel, receiptUrl: finalReceiptUrl, status: 'completed'
        });
        addServiceLog(log);
        const syncedVehicle = await syncVehicleVitals(vehicle.id);
        updateVehicleStore(syncedVehicle);
      }
      onClose();
    } catch (e) {
      alert("Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const categories: ServiceCategory[] = ['engine', 'brakes', 'fluids', 'tires', 'suspension', 'other'];

  return (
    <div className="fixed inset-0 z-[1001] bg-slate-950/95 overflow-y-auto flex flex-col p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-xl mx-auto space-y-10 pt-10 pb-20">
        <header className="flex justify-between items-center text-white border-b border-slate-800 pb-10">
          <h3 className="text-3xl font-black uppercase">{initialLog ? 'Update Entry' : 'Log Service'}</h3>
          <button onClick={onClose} className="text-4xl text-slate-600">×</button>
        </header>
        {step === 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {categories.map(cat => (
              <button key={cat} onClick={() => { setForm({...form, category: cat}); setStep(2); }} className={`py-8 rounded-3xl border-2 font-black uppercase text-[9px] transition-all ${form.category === cat ? 'bg-blue-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{cat}</button>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-8">
            <input type="text" placeholder="Service description" className="w-full bg-slate-900 text-white p-8 rounded-3xl border-2 border-slate-800 font-black text-center text-xl outline-none" value={form.type} onChange={e => setForm({...form, type: e.target.value})} />
            <input type="number" className="w-full bg-transparent border-b-4 border-blue-600 text-6xl font-mono font-black text-white text-center py-4 outline-none" value={form.mileage} onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})} />
            <button onClick={() => setStep(3)} className="w-full bg-white text-slate-950 py-6 rounded-3xl font-black uppercase text-[11px]">Continue →</button>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-8">
            <input type="number" placeholder="Cost" className="w-full bg-slate-900 text-white p-8 rounded-3xl border-2 border-slate-800 font-black text-center text-3xl outline-none" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} />
            <button onClick={handleSave} disabled={isSaving} className="w-full bg-emerald-600 text-white py-8 rounded-[2.5rem] font-black uppercase text-[12px] shadow-4xl">{isSaving ? 'Saving...' : 'Save Record'}</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceLogTerminal;
