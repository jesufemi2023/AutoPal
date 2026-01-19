
import React, { useState, useRef, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { initializeVehicleAsset, prepareProposedRoadmap, commitFinalRoadmap } from '../services/vehicleRegistrationService.ts';
import { uploadVehicleImage, updateVehicle, archiveVehicle, syncVehicleVitals } from '../services/vehicleService.ts';
import { BodyType, Vehicle, MaintenanceTask, Priority, ServiceCategory, MaintenanceScheduleResponse } from '../shared/types.ts';
import { compressImage } from '../shared/utils.ts';
import { VehicleBlueprint } from './VehicleBlueprint.tsx';

interface AssetIntelligenceCenterProps {
  mode: 'onboarding' | 'edit';
}

type OnboardingStep = 'parameters' | 'calibrating' | 'review' | 'success';

const AssetIntelligenceCenter: React.FC<AssetIntelligenceCenterProps> = ({ mode }) => {
  const { 
    user, addVehicle, updateVehicleStore, removeVehicleStore, 
    setCurrentView, vehicles, editingVehicleId, setEditingVehicle 
  } = useAutoPalStore();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('parameters');
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [proposedTasks, setProposedTasks] = useState<Omit<MaintenanceTask, 'id'>[]>([]);
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const [rawRoadmap, setRawRoadmap] = useState<MaintenanceScheduleResponse | undefined>();

  const initialVehicle = mode === 'edit' ? vehicles.find(v => v.id === editingVehicleId) : null;

  const [form, setForm] = useState({
    make: initialVehicle?.make || '',
    model: initialVehicle?.model || '',
    year: initialVehicle?.year || new Date().getFullYear(),
    bodyType: initialVehicle?.bodyType || 'sedan' as BodyType,
    mileage: initialVehicle?.mileage || 0,
    fuelType: initialVehicle?.fuelType || 'petrol',
    engineSize: initialVehicle?.engineSize || '',
    vin: initialVehicle?.vin || '',
    imageUrl: initialVehicle?.imageUrl || '',
    specs: {
      tireSize: initialVehicle?.specs?.tireSize || '',
      oilGrade: initialVehicle?.specs?.oilGrade || '',
      batteryType: initialVehicle?.specs?.batteryType || '',
      transmission: initialVehicle?.specs?.transmission || 'automatic'
    }
  });

  useEffect(() => {
    if (initialVehicle?.imageUrl) {
      setImagePreview(initialVehicle.imageUrl);
    }
  }, [initialVehicle]);

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartCalibration = async () => {
    if (!user) return;

    if (!form.make || !form.model) {
      alert("Please provide the car make and model to continue.");
      return;
    }
    setIsProcessing(true);
    setCurrentStep('calibrating');
    
    try {
      const vehicle = await initializeVehicleAsset(user?.id || 'guest', form.vin, { ...form });
      setActiveVehicle(vehicle);

      const { tasks, isNewTemplate: isNew, rawRoadmap: raw } = await prepareProposedRoadmap(vehicle);
      setProposedTasks(tasks);
      setIsNewTemplate(isNew);
      setRawRoadmap(raw);

      if (imageFile && user?.id) {
        try {
          const compressed = await compressImage(imageFile, 800, 0.7);
          const url = await uploadVehicleImage(user.id, vehicle.id, compressed);
          await updateVehicle(vehicle.id, { imageUrl: url });
          vehicle.imageUrl = url;
        } catch (e) {
          console.error("Image upload error:", e);
        }
      }

      setCurrentStep('review');
    } catch (err: any) {
      alert(`Setup Error: ${err.message}`);
      setCurrentStep('parameters');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateAsset = async () => {
    if (!initialVehicle) return;
    setIsProcessing(true);

    try {
      let finalImageUrl = form.imageUrl;

      if (imageFile && user?.id) {
        try {
          const compressed = await compressImage(imageFile, 800, 0.7);
          finalImageUrl = await uploadVehicleImage(user.id, initialVehicle.id, compressed);
        } catch (e) {
          console.error("Image update fault:", e);
        }
      }

      const updatedData = { ...form, imageUrl: finalImageUrl };
      const result = await updateVehicle(initialVehicle.id, updatedData);
      
      if (form.mileage !== initialVehicle.mileage) {
        const synced = await syncVehicleVitals(initialVehicle.id);
        updateVehicleStore(synced);
      } else {
        updateVehicleStore(result);
      }

      setEditingVehicle(null);
      setCurrentView('garage');
    } catch (err: any) {
      alert(`Update Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecommission = async () => {
    if (!initialVehicle) return;
    const confirmed = confirm("Are you sure? All history will be archived.");
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await archiveVehicle(initialVehicle.id);
      removeVehicleStore(initialVehicle.id);
      setEditingVehicle(null);
      setCurrentView('garage');
    } catch (err: any) {
      alert(`Removal Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalize = async () => {
    if (!activeVehicle) return;
    setIsProcessing(true);
    try {
      await commitFinalRoadmap(activeVehicle, proposedTasks, isNewTemplate, rawRoadmap);
      addVehicle(activeVehicle);
      setCurrentStep('success');
    } catch (err: any) {
      alert(`Sync Failure: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const addTask = () => {
    const newTask: Omit<MaintenanceTask, 'id'> = {
      vehicleId: activeVehicle?.id || '',
      title: 'New Custom Task',
      description: 'Custom recurring service',
      dueMileage: (activeVehicle?.mileage || 0) + 5000,
      status: 'pending',
      priority: Priority.MEDIUM,
      category: 'other',
      intervalKm: 5000,
      intervalMonths: 6
    };
    setProposedTasks([...proposedTasks, newTask]);
  };

  const removeTask = (index: number) => {
    setProposedTasks(proposedTasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, updates: Partial<Omit<MaintenanceTask, 'id'>>) => {
    setProposedTasks(proposedTasks.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const handleClose = () => {
    setEditingVehicle(null);
    setCurrentView('garage');
  };

  if (currentStep === 'success') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6 z-[9999]">
        <div className="w-full max-w-xl text-center space-y-8 animate-slide-up">
          <div className="w-24 h-24 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center text-white text-4xl mx-auto shadow-4xl">✓</div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Setup Complete</h2>
          <button onClick={handleClose} className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase text-[11px] shadow-3xl hover:bg-emerald-600 hover:text-white transition-all">Enter Dashboard</button>
        </div>
      </div>
    );
  }

  if (currentStep === 'calibrating') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 z-[9999] text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-8"></div>
        <h2 className="text-white text-2xl font-black tracking-tighter uppercase">Analyzing Vehicle</h2>
      </div>
    );
  }

  if (currentStep === 'review') {
    return (
      <div className="fixed inset-0 bg-[#fcfcfd] z-[9999] flex flex-col overflow-hidden animate-in fade-in duration-500">
        <header className="p-6 sm:p-10 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6 bg-white shrink-0 pt-safe">
          <h2 className="text-2xl font-black tracking-tighter uppercase">Review Schedule</h2>
          <button onClick={handleFinalize} disabled={isProcessing} className="w-full sm:w-auto bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-emerald-600 transition-all">Start My Garage →</button>
        </header>
        <div className="flex-grow overflow-y-auto p-4 sm:p-10 lg:p-20 scrollbar-hide pb-32">
          <div className="max-w-4xl mx-auto space-y-10">
            <button onClick={addTask} className="bg-white text-blue-600 px-8 py-4 rounded-xl font-black uppercase text-[9px] border border-blue-200 shadow-sm hover:bg-blue-600 hover:text-white transition-all">+ Add Custom Task</button>
            <div className="space-y-4">
              {proposedTasks.map((task, idx) => (
                <div key={idx} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 sm:p-8 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between group">
                  <div className="flex-grow space-y-4 w-full">
                    <input type="text" value={task.title} onChange={e => updateTask(idx, { title: e.target.value })} className="text-lg font-black text-slate-900 w-full bg-transparent border-b border-transparent focus:border-blue-600 outline-none" />
                  </div>
                  <button onClick={() => removeTask(idx)} className="text-rose-500 text-xl">×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#fcfcfd] z-[9999] flex flex-col lg:flex-row overflow-hidden animate-in fade-in duration-500">
      <div className="h-[45vh] lg:h-full lg:w-5/12 bg-slate-900 flex flex-col relative overflow-hidden shrink-0 pt-safe">
        <header className="p-6 sm:p-10 relative z-10 shrink-0 flex justify-between items-center">
          <h1 className="text-white font-black text-xl tracking-tighter uppercase">{mode === 'edit' ? 'Update Car' : 'New Vehicle'}</h1>
          <button onClick={handleClose} className="lg:hidden w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center text-xl">×</button>
        </header>
        <div className="flex-grow flex items-center justify-center p-6 relative z-10">
          <div className="w-full max-w-lg space-y-4 lg:space-y-12 animate-slide-up text-center">
             <h2 className="text-2xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter">{form.make || 'Draft'} <span className="text-blue-500">{form.model}</span></h2>
             <div className="relative group cursor-pointer max-w-[300px] mx-auto" onClick={() => fileInputRef.current?.click()}>
              <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={onImageChange} />
              {imagePreview ? (
                <img src={imagePreview} className="aspect-[16/10] rounded-[2rem] object-cover border-[8px] border-slate-800 shadow-3xl" alt="Asset Preview" />
              ) : (
                <div className="aspect-[16/10] rounded-[2rem] border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-700">📷 Upload Photo</div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-grow flex flex-col min-h-0 bg-white relative">
        <div className="flex-grow overflow-y-auto p-6 sm:p-10 lg:p-20 scrollbar-hide pb-32">
          <div className="max-w-2xl mx-auto space-y-12">
            <div className="grid grid-cols-2 gap-6">
              <input type="text" placeholder="Make" className="px-6 py-5 bg-slate-50 border-2 rounded-3xl font-black outline-none focus:border-blue-500" value={form.make} onChange={e => setForm({...form, make: e.target.value})} />
              <input type="text" placeholder="Model" className="px-6 py-5 bg-slate-50 border-2 rounded-3xl font-black outline-none focus:border-blue-500" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
              <input type="number" className="px-6 py-5 bg-slate-50 border-2 rounded-3xl font-black outline-none" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value)})} />
              <input type="text" placeholder="VIN (Optional)" className="px-6 py-5 bg-slate-50 border-2 rounded-3xl font-mono font-black" value={form.vin} onChange={e => setForm({...form, vin: e.target.value.toUpperCase()})} />
            </div>
            <div className="space-y-6">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">Current Odometer (KM)</label>
              <input type="number" className="w-full py-10 bg-blue-50 border-[6px] border-blue-100 rounded-[3rem] text-7xl font-mono font-black text-blue-600 text-center outline-none focus:border-blue-400" value={form.mileage || ''} onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})} />
            </div>
            {mode === 'edit' && <button onClick={handleDecommission} className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black uppercase text-[11px]">Remove Vehicle</button>}
          </div>
        </div>
        <footer className="p-6 border-t bg-white sticky bottom-0 flex gap-4 shadow-xl">
          {mode === 'edit' ? (
            <button onClick={handleUpdateAsset} disabled={isProcessing} className="flex-grow bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-[11px] hover:bg-emerald-600 transition-all">{isProcessing ? 'Syncing...' : 'Save Changes'}</button>
          ) : (
            <button onClick={handleStartCalibration} disabled={isProcessing} className="flex-grow bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-[11px] hover:bg-blue-600 transition-all">{isProcessing ? 'Syncing...' : 'Start Intelligence Setup →'}</button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default AssetIntelligenceCenter;
