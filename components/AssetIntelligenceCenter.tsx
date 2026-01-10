
import React, { useState, useRef, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { registerNewVehicle } from '../services/vehicleRegistrationService.ts';
import { uploadVehicleImage, updateVehicle, archiveVehicle } from '../services/vehicleService.ts';
import { BodyType, Vehicle } from '../shared/types.ts';
import { compressImage } from '../shared/utils.ts';
import { VehicleBlueprint } from './VehicleBlueprint.tsx';

interface AssetIntelligenceCenterProps {
  mode: 'onboarding' | 'edit';
}

const AssetIntelligenceCenter: React.FC<AssetIntelligenceCenterProps> = ({ mode }) => {
  const { user, addVehicle, updateVehicleStore, removeVehicleStore, setCurrentView, vehicles, editingVehicleId, setEditingVehicle } = useAutoPalStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCommit = async () => {
    if (!form.make || !form.model) {
      alert("Asset calibration requires Manufacturer and Model data.");
      return;
    }
    setIsProcessing(true);
    try {
      let savedVehicle: Vehicle;
      
      if (mode === 'onboarding') {
        savedVehicle = await registerNewVehicle(user?.id || 'guest', form.vin, { ...form });
      } else {
        const updateData: Partial<Vehicle> = {
          make: form.make,
          model: form.model,
          year: form.year,
          vin: form.vin,
          mileage: form.mileage,
          bodyType: form.bodyType,
          fuelType: form.fuelType,
          engineSize: form.engineSize,
          specs: form.specs
        };
        savedVehicle = await updateVehicle(editingVehicleId!, updateData);
      }
      
      if (imageFile && user?.id) {
        try {
          const compressed = await compressImage(imageFile, 800, 0.7);
          const url = await uploadVehicleImage(user.id, savedVehicle.id, compressed);
          savedVehicle = await updateVehicle(savedVehicle.id, { imageUrl: url });
        } catch (e: any) { 
          console.error("Optical data sync failed", e); 
          alert(`Photo Update Error: ${e.message || "Unknown error"}`);
        }
      }

      if (mode === 'onboarding') {
        addVehicle(savedVehicle);
      } else {
        updateVehicleStore(savedVehicle);
      }
      
      setIsComplete(true);
    } catch (err: any) {
      console.error("Critical Asset Sync Error:", err);
      alert(`Neural Sync Failure:\n\n${err.message || "Unknown connectivity fault."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecommission = async () => {
    if (!editingVehicleId) return;
    const confirmed = window.confirm("CAUTION: Decommission this digital twin?");
    if (confirmed) {
      setIsProcessing(true);
      try {
        await archiveVehicle(editingVehicleId);
        removeVehicleStore(editingVehicleId);
        handleClose();
      } catch (err: any) {
        alert("Archive Protocol Failed: " + (err.message || "Network Error"));
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleClose = () => {
    setEditingVehicle(null);
    setCurrentView('garage');
  };

  if (isComplete) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6 z-[9999]">
        <div className="w-full max-w-xl text-center space-y-8 animate-slide-up px-4">
          <div className="w-20 h-20 sm:w-28 sm:h-28 bg-blue-600 rounded-[2rem] flex items-center justify-center text-3xl sm:text-5xl mx-auto shadow-4xl shadow-blue-500/40 border-4 border-white/20">
            {mode === 'onboarding' ? '✦' : '⚙'}
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter leading-none">
              {mode === 'onboarding' ? 'Asset Initialized' : 'Asset Recalibrated'}
            </h2>
            <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[9px]">
              Digital Twin Active & Synchronized
            </p>
          </div>
          <button onClick={handleClose} className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-3xl hover:bg-blue-600 hover:text-white transition-all active:scale-95">
            Enter Command Garage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#fcfcfd] z-[9999] flex flex-col lg:flex-row overflow-hidden">
      <div className="h-[35vh] lg:h-full lg:w-5/12 bg-slate-900 flex flex-col relative overflow-hidden shrink-0">
        <header className="p-6 sm:p-10 relative z-10 shrink-0 flex justify-between items-center">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-black text-base sm:text-lg">A</div>
            <div>
              <h1 className="text-white font-black text-sm sm:text-xl tracking-tighter uppercase leading-tight">Calibration Hub</h1>
            </div>
          </div>
          <button onClick={handleClose} className="lg:hidden w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center text-xl">×</button>
        </header>

        <div className="flex-grow flex items-center justify-center p-6 relative z-10 overflow-hidden">
          <div className="w-full max-w-lg space-y-6 sm:space-y-16 animate-slide-up">
            <div className="text-center space-y-2">
               <h2 className="text-2xl sm:text-6xl font-black text-white tracking-tighter leading-[0.85] truncate">
                 {form.make || 'Draft'} <br/>
                 <span className="text-blue-500">{form.model || 'Asset'}</span>
               </h2>
            </div>

            <div className="relative group cursor-pointer max-w-xs sm:max-w-none mx-auto" onClick={() => fileInputRef.current?.click()}>
              <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={onImageChange} />
              {imagePreview ? (
                <div className="aspect-[16/10] rounded-[2rem] overflow-hidden border-[8px] border-slate-800 shadow-3xl relative group">
                  <img src={imagePreview} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                </div>
              ) : (
                <VehicleBlueprint type={form.bodyType} className="bg-slate-800/40 border-slate-700/50 text-slate-600 group-hover:text-blue-500 transition-all py-8 sm:py-20" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col min-h-0 bg-white shadow-[-40px_0_80px_-40px_rgba(0,0,0,0.1)]">
        <header className="p-6 sm:p-10 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur-xl sticky top-0 z-50 shrink-0">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Neural Calibration Parameters</h3>
        </header>

        <div className="flex-grow overflow-y-auto p-6 sm:p-20 scrollbar-hide">
          <div className="max-w-2xl mx-auto space-y-12 sm:space-y-20">
            <section className="space-y-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Asset Identity</label>
              <div className="grid grid-cols-2 gap-6">
                <input type="text" placeholder="Make" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none" value={form.make} onChange={e => setForm({...form, make: e.target.value})} />
                <input type="text" placeholder="Model" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
              </div>
            </section>
            
            <section className="space-y-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Core Engineering</label>
              <div className="grid grid-cols-2 gap-6">
                <select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none" value={form.bodyType} onChange={e => setForm({...form, bodyType: e.target.value as BodyType})}>
                  <option value="sedan">Saloon / Sedan</option>
                  <option value="suv">SUV / Cross-over</option>
                  <option value="truck">Truck / Pickup</option>
                  <option value="van">Van / MPV</option>
                  <option value="other">Special Utility</option>
                </select>
                <select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none" value={form.fuelType} onChange={e => setForm({...form, fuelType: e.target.value})}>
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="electric">Electric</option>
                </select>
              </div>
            </section>

            <section className="space-y-6">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">Telemetry</label>
              <input type="number" placeholder="Odometer (KM)" className="w-full px-8 py-6 bg-blue-50 border-2 border-blue-100 rounded-3xl font-black text-3xl outline-none" value={form.mileage || ''} onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})} />
            </section>
          </div>
        </div>

        <footer className="p-6 border-t border-slate-100 bg-white flex gap-6">
          <button onClick={handleCommit} disabled={isProcessing} className="flex-grow bg-slate-900 text-white py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[12px] shadow-3xl hover:bg-blue-600 transition-all flex items-center justify-center gap-6 disabled:opacity-50">
            {isProcessing ? "Processing..." : (mode === 'onboarding' ? 'Launch Digital Twin' : 'Sync Updates')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AssetIntelligenceCenter;
