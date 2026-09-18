
import React, { useState, useRef, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { initializeVehicleAsset, prepareProposedRoadmap, commitFinalRoadmap } from '../services/vehicleRegistrationService.ts';
import { uploadVehicleImage, updateVehicle, archiveVehicle, syncVehicleVitals } from '../services/vehicleService.ts';
import { decodeVIN } from '../services/geminiService.ts';
import { BodyType, Vehicle, MaintenanceTask, Priority, ServiceCategory } from '../shared/types.ts';
import { compressImage } from '../shared/utils.ts';
import { VehicleBlueprint } from './VehicleBlueprint.tsx';
import { Car, Sparkles, Loader2, AlertCircle, Trash2 } from 'lucide-react';

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
  const [isDecodingVin, setIsDecodingVin] = useState(false);
  const [vinFeedback, setVinFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [proposedTasks, setProposedTasks] = useState<Omit<MaintenanceTask, 'id'>[]>([]);
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const [rawRoadmap, setRawRoadmap] = useState<any>(null);

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

  const handleDecodeVIN = async () => {
    if (!form.vin || form.vin.trim().length < 5) {
      setVinFeedback({ type: 'error', message: 'Enter at least 5 characters of your Chassis/VIN.' });
      return;
    }
    setIsDecodingVin(true);
    setVinFeedback(null);
    try {
      const decoded = await decodeVIN(form.vin.trim());
      if (decoded && (decoded.make || decoded.model)) {
        setForm(prev => ({
          ...prev,
          make: decoded.make || prev.make,
          model: decoded.model || prev.model,
          year: decoded.year || prev.year,
          bodyType: (decoded.bodyType as BodyType) || prev.bodyType
        }));
        setVinFeedback({ 
          type: 'success', 
          message: `Decoded: ${decoded.year || ''} ${decoded.make || ''} ${decoded.model || ''} (${decoded.bodyType || 'Sedan'})` 
        });
      } else {
        setVinFeedback({ type: 'error', message: 'Could not resolve chassis specifications. Enter details manually.' });
      }
    } catch (err: any) {
      setVinFeedback({ type: 'error', message: 'VIN auto-decode service is unavailable. Enter details manually.' });
    } finally {
      setIsDecodingVin(false);
    }
  };

  const handleStartSetup = async () => {
    if (!form.make || !form.model) {
      setSetupError("Please enter car make and model.");
      return;
    }
    setSetupError(null);
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
          console.error("Image error:", e);
        }
      }

      setCurrentStep('review');
    } catch (err: any) {
      setSetupError(`Setup Error: ${err.message}`);
      setCurrentStep('parameters');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateAsset = async () => {
    if (!initialVehicle) return;
    setIsProcessing(true);
    setSetupError(null);

    try {
      let finalImageUrl = form.imageUrl;

      if (imageFile && user?.id) {
        try {
          const compressed = await compressImage(imageFile, 800, 0.7);
          finalImageUrl = await uploadVehicleImage(user.id, initialVehicle.id, compressed);
        } catch (e) {
          console.error("Image fault:", e);
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
      setSetupError(`Update Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveVehicle = async () => {
    if (!initialVehicle) return;
    setIsProcessing(true);
    try {
      await archiveVehicle(initialVehicle.id);
      removeVehicleStore(initialVehicle.id);
      setEditingVehicle(null);
      setCurrentView('garage');
    } catch (err: any) {
      setSetupError(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleFinalize = async () => {
    if (!activeVehicle) return;
    setIsProcessing(true);
    setSetupError(null);
    try {
      await commitFinalRoadmap(activeVehicle, proposedTasks, isNewTemplate, rawRoadmap);
      addVehicle(activeVehicle);
      setCurrentStep('success');
    } catch (err: any) {
      setSetupError(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const addTask = () => {
    const newTask: Omit<MaintenanceTask, 'id'> = {
      vehicleId: activeVehicle?.id || '',
      title: 'Custom Service',
      description: 'User added service task',
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
          <div className="w-24 h-24 sm:w-28 sm:h-28 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center text-white text-4xl sm:text-5xl mx-auto border-4 border-white/20">
            ✓
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none">All Set!</h2>
            <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Your car is now in your garage.</p>
          </div>
          <button 
            onClick={handleClose}
            className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
          >
            Enter My Garage
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 'calibrating') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 z-[9999] text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-8"></div>
        <h2 className="text-white text-2xl font-black tracking-tighter uppercase mb-2">Analyzing Your Car</h2>
        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em]">Setting up your service schedule...</p>
      </div>
    );
  }

  if (currentStep === 'review') {
    return (
      <div className="fixed inset-0 bg-[#fcfcfd] z-[9999] flex flex-col overflow-hidden animate-in fade-in duration-500">
        <header className="p-6 sm:p-10 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6 bg-white shrink-0 pt-safe">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-black tracking-tighter uppercase">Review Service Plan</h2>
            <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.3em]">Step 2: Confirm your schedule</p>
          </div>
          <button 
            onClick={handleFinalize}
            disabled={isProcessing}
            className="w-full sm:w-auto bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-4"
          >
            {isProcessing ? 'Saving...' : 'Finish Setup →'}
          </button>
        </header>

        <div className="flex-grow overflow-y-auto p-4 sm:p-10 lg:p-20 scrollbar-hide pb-32">
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="bg-blue-50 border-2 border-blue-100 rounded-[2.5rem] p-8 sm:p-10 flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-xl font-black text-blue-900 tracking-tight">Personalized Schedule</h3>
                <p className="text-blue-600/60 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-sm">
                  We suggested these based on your car. You can change them later.
                </p>
              </div>
              <button onClick={addTask} className="w-full md:w-auto bg-white text-blue-600 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[9px] border border-blue-200 shadow-sm hover:bg-blue-600 hover:text-white transition-all">
                + Add Extra Task
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
                      <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Repeat every (KM)</div>
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
        <header className="p-6 sm:p-10 relative z-10 shrink-0 flex justify-between items-center">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-slate-800 to-slate-950 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-xl">
              <Car size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-white font-black text-sm sm:text-xl tracking-tighter uppercase leading-tight">
                {mode === 'edit' ? 'Edit Details' : 'Add New Vehicle'}
              </h1>
              <p className="text-blue-500/60 text-[7px] sm:text-[8px] font-black uppercase tracking-[0.3em]">{mode === 'edit' ? 'Update your info' : 'Basic details'}</p>
            </div>
          </div>
          <button onClick={handleClose} className="lg:hidden w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center text-xl transition-all active:scale-90">×</button>
        </header>

        <div className="flex-grow flex items-center justify-center p-6 relative z-10">
          <div className="w-full max-w-lg space-y-4 lg:space-y-12 animate-slide-up text-center">
               <h2 className="text-2xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-[0.9] truncate px-4">
                 {form.make || 'Draft'} <br className="hidden sm:block" />
                 <span className="text-blue-500"> {form.model || 'Vehicle'}</span>
               </h2>
               <div className="inline-block px-3 py-1 bg-slate-800 rounded-full text-slate-500 font-mono text-[8px] uppercase tracking-widest border border-slate-700">
                 {form.vin || 'VIN (CHASSIS #)'}
               </div>
            
            <div 
              className="relative group cursor-pointer max-w-[220px] sm:max-w-[300px] lg:max-w-sm mx-auto w-full transition-transform active:scale-95" 
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={onImageChange} />
              
              {imagePreview ? (
                <div className="aspect-[16/10] rounded-[2rem] overflow-hidden border-[6px] border-slate-800 shadow-3xl">
                  <img src={imagePreview} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Car Preview" />
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-[2.5rem] border-2 border-dashed border-slate-700 hover:border-blue-500 transition-all flex flex-col items-center justify-center bg-slate-800/20 group py-8">
                  <VehicleBlueprint type={form.bodyType} className="bg-transparent border-transparent text-slate-700 group-hover:text-blue-500" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40">
                     <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] bg-blue-600 px-4 py-1.5 rounded-lg">Upload Photo</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col min-h-0 bg-white shadow-[-40px_0_80px_-40px_rgba(0,0,0,0.1)] relative">
        <header className="p-6 sm:p-10 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur-xl sticky top-0 z-50 shrink-0">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
            {mode === 'edit' ? 'Update Info' : 'Step 1: Register Vehicle'}
          </h3>
          <button onClick={handleClose} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors hidden lg:block">Cancel</button>
        </header>

        <div className="flex-grow overflow-y-auto p-6 sm:p-10 lg:p-20 scrollbar-hide pb-32">
          <div className="max-w-2xl mx-auto space-y-10">
            {setupError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold animate-in fade-in">
                <AlertCircle size={16} className="shrink-0" />
                <span>{setupError}</span>
              </div>
            )}

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Vehicle Identity</label>
                  <button
                    type="button"
                    disabled={isDecodingVin || !form.vin}
                    onClick={handleDecodeVIN}
                    className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded-full transition-all disabled:opacity-40"
                  >
                    {isDecodingVin ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span>Auto-Fill with AI</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <input 
                    type="text" 
                    placeholder="Chassis # / VIN (e.g. 4T1BK32K...)" 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-mono font-bold text-center tracking-widest outline-none uppercase text-sm focus:border-blue-500 transition-all" 
                    value={form.vin} 
                    onChange={e => {
                      setForm({...form, vin: e.target.value.toUpperCase()});
                      setVinFeedback(null);
                    }} 
                  />
                  {vinFeedback && (
                    <div className={`text-[10px] font-bold px-4 py-2 rounded-xl flex items-center gap-2 ${
                      vinFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      <span>{vinFeedback.type === 'success' ? '✓' : 'ℹ'}</span>
                      <span>{vinFeedback.message}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" placeholder="Make (e.g. Toyota)" className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none transition-all text-sm focus:border-blue-500" value={form.make} onChange={e => setForm({...form, make: e.target.value})} />
                  <input type="text" placeholder="Model (e.g. Camry)" className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none transition-all text-sm focus:border-blue-500" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="number" placeholder="Year" className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none text-sm focus:border-blue-500" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value) || 2020})} />
                  <input type="text" placeholder="Engine Size (e.g. 2.4L 4-Cyl)" className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none text-sm focus:border-blue-500" value={form.engineSize} onChange={e => setForm({...form, engineSize: e.target.value})} />
                </div>
            </section>

            <section className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Type & Fuel</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none text-sm focus:border-blue-500" value={form.bodyType} onChange={e => setForm({...form, bodyType: e.target.value as BodyType})}>
                      <option value="sedan">Saloon / Sedan</option>
                      <option value="suv">SUV / Crossover</option>
                      <option value="truck">Truck / Pickup</option>
                      <option value="van">Van / Minivan</option>
                      <option value="other">Other</option>
                    </select>
                    <select className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none text-sm focus:border-blue-500" value={form.fuelType} onChange={e => setForm({...form, fuelType: e.target.value})}>
                      <option value="petrol">Petrol (PMS)</option>
                      <option value="diesel">Diesel (AGO)</option>
                      <option value="hybrid">Hybrid (Gas/Electric)</option>
                      <option value="electric">Electric (EV)</option>
                    </select>
                </div>
            </section>

            <section className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Digital Twin Specifications</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input 
                    type="text" 
                    placeholder="Oil Grade (e.g. 0W-20)" 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-blue-500"
                    value={form.specs?.oilGrade || ''}
                    onChange={e => setForm({...form, specs: { ...form.specs, oilGrade: e.target.value }})}
                  />
                  <input 
                    type="text" 
                    placeholder="Tire Spec (e.g. 215/55 R17)" 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-blue-500"
                    value={form.specs?.tireSize || ''}
                    onChange={e => setForm({...form, specs: { ...form.specs, tireSize: e.target.value }})}
                  />
                  <select 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-blue-500"
                    value={form.specs?.transmission || 'automatic'}
                    onChange={e => setForm({...form, specs: { ...form.specs, transmission: e.target.value }})}
                  >
                    <option value="automatic">Automatic Transmission</option>
                    <option value="manual">Manual Transmission</option>
                    <option value="cvt">CVT Transmission</option>
                  </select>
                </div>
            </section>

            <section className="space-y-4">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] ml-2">Current KM Reading</label>
                <input 
                  type="number" 
                  className="w-full px-6 py-10 bg-blue-50 border-[4px] border-blue-100 rounded-[2.5rem] text-5xl font-mono font-black text-blue-600 text-center shadow-inner outline-none tracking-tighter focus:border-blue-400"
                  value={form.mileage || ''}
                  onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})}
                />
            </section>

            {mode === 'edit' && (
              <section className="pt-8">
                <div className="p-8 bg-rose-50 rounded-[2rem] border border-rose-100 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-6 items-center justify-between">
                    <div className="text-center sm:text-left">
                      <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em]">Danger Zone</h4>
                      <p className="text-[9px] text-rose-400 font-bold uppercase tracking-widest">Permanently remove this vehicle asset.</p>
                    </div>
                    {!showDeleteConfirm ? (
                      <button 
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 size={14} />
                        <span>Delete Car</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={handleRemoveVehicle}
                          className="bg-rose-700 hover:bg-rose-800 text-white px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider"
                        >
                          {isProcessing ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="bg-white border border-rose-200 text-slate-700 px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        <footer className="p-6 sm:p-10 border-t border-slate-100 bg-white sticky bottom-0 flex gap-4 shadow-[0_-20px_40px_rgba(0,0,0,0.02)] pb-[calc(1.5rem+var(--safe-bottom))]">
          {mode === 'edit' ? (
            <button 
              disabled={isProcessing}
              onClick={handleUpdateAsset}
              className="flex-grow bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-4xl hover:bg-emerald-600 transition-all active:scale-95"
            >
              {isProcessing ? 'Saving...' : 'Save Changes'}
            </button>
          ) : (
            <button 
              disabled={isProcessing}
              onClick={handleStartSetup}
              className="flex-grow bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-4xl hover:bg-blue-600 transition-all active:scale-95"
            >
              {isProcessing ? 'Analyzing...' : 'Next Step →'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default AssetIntelligenceCenter;
