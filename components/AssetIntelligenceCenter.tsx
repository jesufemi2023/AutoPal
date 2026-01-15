
import React, { useState, useRef, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { initializeVehicleAsset, prepareProposedRoadmap, commitFinalRoadmap } from '../services/vehicleRegistrationService.ts';
import { uploadVehicleImage, updateVehicle, archiveVehicle, syncVehicleVitals } from '../services/vehicleService.ts';
import { BodyType, Vehicle, MaintenanceTask, Priority, ServiceCategory } from '../shared/types.ts';
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
    if (!form.make || !form.model) {
      alert("Please provide the car make and model to continue.");
      return;
    }
    setIsProcessing(true);
    setCurrentStep('calibrating');
    
    try {
      const vehicle = await initializeVehicleAsset(user?.id || 'guest', form.vin, { ...form });
      setActiveVehicle(vehicle);

      const { tasks, isNewTemplate: isNew } = await prepareProposedRoadmap(vehicle);
      setProposedTasks(tasks);
      setIsNewTemplate(isNew);

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

      const updatedData = {
        ...form,
        imageUrl: finalImageUrl
      };

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
    const confirmed = confirm(
      "Are you sure you want to remove this vehicle from your garage? All history for this car will be archived."
    );
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
      await commitFinalRoadmap(activeVehicle, proposedTasks, isNewTemplate);
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
        <div className="w-full max-w-xl text-center space-y-8 animate-slide-up px-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center text-white text-4xl sm:text-5xl mx-auto shadow-4xl shadow-emerald-500/40 border-4 border-white/20">
            ✓
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none">
              Setup Complete
            </h2>
            <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">
              Your vehicle is now linked to your garage
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-3xl hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
          >
            Enter Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 'calibrating') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 z-[9999] text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-8"></div>
        <h2 className="text-white text-2xl font-black tracking-tighter uppercase mb-2">Analyzing Vehicle</h2>
        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em]">Preparing your custom maintenance schedule...</p>
      </div>
    );
  }

  if (currentStep === 'review') {
    return (
      <div className="fixed inset-0 bg-[#fcfcfd] z-[9999] flex flex-col overflow-hidden animate-in fade-in duration-500">
        <header className="p-6 sm:p-10 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6 bg-white shrink-0 pt-safe">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-black tracking-tighter uppercase">Review Schedule</h2>
            <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.3em]">Step 2: Confirm your roadmap</p>
          </div>
          <button 
            onClick={handleFinalize}
            disabled={isProcessing}
            className="w-full sm:w-auto bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-4"
          >
            {isProcessing ? 'Syncing...' : 'Start My Garage →'}
          </button>
        </header>

        <div className="flex-grow overflow-y-auto p-4 sm:p-10 lg:p-20 scrollbar-hide pb-32">
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="bg-blue-50 border-2 border-blue-100 rounded-[2.5rem] p-8 sm:p-10 flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-xl font-black text-blue-900 tracking-tight">Your Maintenance Roadmap</h3>
                <p className="text-blue-600/60 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-sm">
                  We've suggested these tasks based on your car model. Feel free to tweak them.
                </p>
              </div>
              <button onClick={addTask} className="w-full md:w-auto bg-white text-blue-600 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[9px] border border-blue-200 shadow-sm hover:bg-blue-600 hover:text-white transition-all">
                + Add Custom Task
              </button>
            </div>

            <div className="space-y-4">
              {proposedTasks.map((task, idx) => (
                <div key={idx} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 sm:p-8 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between group animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="flex-grow space-y-4 w-full lg:w-auto">
                    <div className="flex flex-wrap items-center gap-3">
                      <select 
                        value={task.category} 
                        onChange={e => updateTask(idx, { category: e.target.value as ServiceCategory })}
                        className="bg-slate-50 border border-slate-100 text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg outline-none"
                      >
                        <option value="fluids">Fluids</option>
                        <option value="engine">Engine</option>
                        <option value="brakes">Brakes</option>
                        <option value="tires">Tires</option>
                        <option value="suspension">Suspension</option>
                        <option value="other">Other</option>
                      </select>
                      <select 
                        value={task.priority} 
                        onChange={e => updateTask(idx, { priority: e.target.value as Priority })}
                        className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg outline-none ${task.priority === 'high' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-500'}`}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <button onClick={() => removeTask(idx)} className="lg:hidden ml-auto text-rose-500 font-black text-[10px] uppercase tracking-widest px-2 py-1 bg-rose-50 rounded-lg">Remove</button>
                    </div>
                    <input 
                      type="text" 
                      value={task.title} 
                      onChange={e => updateTask(idx, { title: e.target.value })}
                      className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter w-full bg-transparent border-b border-transparent focus:border-blue-600 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="flex items-center gap-6 sm:gap-8 w-full lg:w-auto shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0">
                    <div className="space-y-1 text-left lg:text-right flex-1 lg:flex-none">
                      <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Repeat Every (KM)</div>
                      <input 
                        type="number" 
                        value={task.intervalKm} 
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          updateTask(idx, { intervalKm: val, dueMileage: (activeVehicle?.mileage || 0) + val });
                        }}
                        className="text-lg font-mono font-black text-slate-900 text-left lg:text-right bg-slate-50 rounded-xl px-4 py-2 w-full lg:w-24 outline-none border border-slate-100"
                      />
                    </div>
                    <button onClick={() => removeTask(idx)} className="hidden lg:block text-rose-500 text-xl transition-transform hover:scale-125">×</button>
                  </div>
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
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:32px_32px]"></div>
        </div>
        
        <header className="p-6 sm:p-10 relative z-10 shrink-0 flex justify-between items-center">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-black text-base sm:text-lg shadow-xl shadow-blue-600/20">A</div>
            <div>
              <h1 className="text-white font-black text-sm sm:text-xl tracking-tighter uppercase leading-tight">
                {mode === 'edit' ? 'Update Car' : 'New Vehicle Setup'}
              </h1>
              <p className="text-blue-500/60 text-[7px] sm:text-[8px] font-black uppercase tracking-[0.3em]">{mode === 'edit' ? 'Modifying details' : 'Getting started'}</p>
            </div>
          </div>
          <button onClick={handleClose} className="lg:hidden w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center text-xl transition-all active:scale-90">×</button>
        </header>

        <div className="flex-grow flex items-center justify-center p-6 relative z-10 overflow-hidden">
          <div className="w-full max-w-lg space-y-4 lg:space-y-12 animate-slide-up">
            <div className="text-center space-y-2 mb-4 lg:mb-0">
               <h2 className="text-2xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-[0.9] truncate px-4">
                 {form.make || 'Draft'} <br className="hidden sm:block" />
                 <span className="text-blue-500"> {form.model || 'Asset'}</span>
               </h2>
               <div className="inline-block px-3 py-1 bg-slate-800 rounded-full text-slate-500 font-mono text-[8px] uppercase tracking-widest border border-slate-700">
                 {form.vin || 'VIN NOT SET'}
               </div>
            </div>

            <div 
              className="relative group cursor-pointer max-w-[240px] sm:max-w-[320px] lg:max-w-none mx-auto w-full transition-transform active:scale-95" 
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={onImageChange} />
              
              {imagePreview ? (
                <div className="aspect-[16/10] rounded-[2rem] overflow-hidden border-[6px] sm:border-[8px] border-slate-800 shadow-3xl relative">
                  <img src={imagePreview} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Asset Preview" />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all backdrop-blur-sm">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-900 text-xl mb-2 shadow-xl">📷</div>
                    <span className="bg-white text-slate-900 px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">Change Photo</span>
                  </div>
                </div>
              ) : (
                <div className="relative group overflow-hidden rounded-[2.5rem] border-2 border-dashed border-slate-700 hover:border-blue-500 transition-all flex flex-col items-center justify-center bg-slate-800/20 group">
                  <VehicleBlueprint type={form.bodyType} className="bg-transparent border-transparent text-slate-700 group-hover:text-blue-500 transition-all py-10 lg:py-24" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 group-hover:bg-slate-950/0 transition-all">
                     <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl mb-4 shadow-2xl group-hover:bg-blue-600 group-hover:border-blue-400 group-hover:scale-110 transition-all text-white/80 group-hover:text-white">
                       <span className="animate-pulse">📷</span>
                     </div>
                     <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] bg-blue-600 px-4 py-1.5 rounded-lg shadow-xl mb-2">Upload Photo</span>
                     <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Click to link an image</span>
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-center text-slate-500 text-[8px] font-black uppercase tracking-[0.3em] lg:hidden">
              Tap the icon above to upload a photo
            </p>
          </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col min-h-0 bg-white shadow-[-40px_0_80px_-40px_rgba(0,0,0,0.1)] relative">
        <header className="p-6 sm:p-10 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur-xl sticky top-0 z-50 shrink-0">
          <div className="flex items-center gap-3">
             <span className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[10px] font-black">01</span>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
               {mode === 'edit' ? 'Modify Vehicle Details' : 'Basic Information'}
             </h3>
          </div>
          <button onClick={handleClose} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors hidden lg:block">Cancel & Exit</button>
        </header>

        <div className="flex-grow overflow-y-auto p-6 sm:p-10 lg:p-20 scrollbar-hide pb-32 lg:pb-32">
          <div className="max-w-2xl mx-auto space-y-12 sm:space-y-16">
            <section className="space-y-6 sm:space-y-10">
              <div className="space-y-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Car Details</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Make / Manufacturer</div>
                    <input type="text" placeholder="e.g. Toyota" className="w-full px-6 sm:px-8 py-4 sm:py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none transition-all text-sm focus:border-blue-500" value={form.make} onChange={e => setForm({...form, make: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Model</div>
                    <input type="text" placeholder="e.g. Camry" className="w-full px-6 sm:px-8 py-4 sm:py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none transition-all text-sm focus:border-blue-500" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Model Year</div>
                    <input type="number" className="w-full px-6 sm:px-8 py-4 sm:py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none text-sm focus:border-blue-500" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">VIN Number</div>
                    <input type="text" placeholder="Optional" className="w-full px-6 sm:px-8 py-4 sm:py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-mono font-black text-center tracking-widest outline-none uppercase text-sm focus:border-blue-500" value={form.vin} onChange={e => setForm({...form, vin: e.target.value.toUpperCase()})} />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6 sm:space-y-10">
              <div className="space-y-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Technical Specs</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Car Type</div>
                    <select className="w-full px-6 sm:px-8 py-4 sm:py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none text-sm focus:border-blue-500" value={form.bodyType} onChange={e => setForm({...form, bodyType: e.target.value as BodyType})}>
                      <option value="sedan">Saloon / Sedan</option>
                      <option value="suv">SUV / Cross-over</option>
                      <option value="truck">Truck / Pickup</option>
                      <option value="van">Van / MPV</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Fuel Type</div>
                    <select className="w-full px-6 sm:px-8 py-4 sm:py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none text-sm focus:border-blue-500" value={form.fuelType} onChange={e => setForm({...form, fuelType: e.target.value})}>
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="electric">Electric</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-10">
              <div className="space-y-6 sm:space-y-8">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] ml-2">Current Odometer (KM)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    className="w-full px-6 sm:px-10 py-10 sm:py-12 bg-blue-50 border-[4px] sm:border-[6px] border-blue-100 rounded-[2.5rem] sm:rounded-[3rem] text-5xl sm:text-7xl font-mono font-black text-blue-600 text-center shadow-inner outline-none transition-all tracking-tighter focus:border-blue-400"
                    value={form.mileage || ''}
                    onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
            </section>

            {mode === 'edit' && (
              <section className="pt-10 space-y-6">
                <div className="h-px bg-slate-100 w-full"></div>
                <div className="flex flex-col sm:flex-row gap-6 items-center justify-between p-8 bg-rose-50 rounded-[2rem] border border-rose-100">
                  <div className="space-y-1 text-center sm:text-left">
                    <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em]">Danger Zone</h4>
                    <p className="text-[9px] text-rose-400 font-bold uppercase tracking-widest leading-relaxed">
                      Remove this vehicle and archive all its history.
                    </p>
                  </div>
                  <button 
                    onClick={handleDecommission}
                    disabled={isProcessing}
                    className="w-full sm:w-auto bg-rose-600 text-white px-8 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-rose-600/20 active:scale-95 transition-all"
                  >
                    Remove Vehicle
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>

        <footer className="p-6 sm:p-10 lg:p-12 border-t border-slate-100 bg-white sticky bottom-0 flex gap-4 sm:gap-6 shrink-0 shadow-[0_-20px_40px_rgba(0,0,0,0.02)] pb-[calc(1.5rem+var(--safe-bottom))]">
          <button 
            onClick={handleClose}
            className="hidden sm:block px-10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all rounded-3xl active:scale-95"
          >
            Go Back
          </button>
          
          {mode === 'edit' ? (
            <button 
              disabled={isProcessing}
              onClick={handleUpdateAsset}
              className="flex-grow bg-slate-900 text-white py-6 sm:py-8 rounded-[2rem] sm:rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[11px] sm:text-[12px] shadow-4xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-6 disabled:opacity-50 active:scale-95"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Save Changes</>
              )}
            </button>
          ) : (
            <button 
              disabled={isProcessing}
              onClick={handleStartCalibration}
              className="flex-grow bg-slate-900 text-white py-6 sm:py-8 rounded-[2rem] sm:rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[11px] sm:text-[12px] shadow-4xl hover:bg-blue-600 transition-all flex items-center justify-center gap-6 disabled:opacity-50 active:scale-95"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Create My Schedule →</>
              )}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default AssetIntelligenceCenter;
