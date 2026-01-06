import React, { useState, useRef } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { registerNewVehicle } from '../services/vehicleRegistrationService.ts';
import { uploadVehicleImage, updateVehicle } from '../services/vehicleService.ts';
import { BodyType } from '../shared/types.ts';
import { compressImage } from '../shared/utils.ts';
import { VehicleBlueprint } from './VehicleBlueprint.tsx';

const OnboardingCommandCenter: React.FC = () => {
  const { user, addVehicle, setCurrentView } = useAutoPalStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    bodyType: 'sedan' as BodyType,
    mileage: 0,
    fuelType: 'petrol',
    engineSize: '',
    vin: '',
    specs: {
      tireSize: '',
      oilGrade: '',
      batteryType: ''
    }
  });

  const handleFinalize = async () => {
    if (!form.make || !form.model) {
      alert("Manufacturer and Model are required for calibration.");
      return;
    }
    setIsProcessing(true);
    try {
      const vehicle = await registerNewVehicle(user?.id || 'guest', form.vin, { ...form });
      
      if (imageFile && user?.id) {
        try {
          const compressed = await compressImage(imageFile, 800, 0.7);
          const url = await uploadVehicleImage(user.id, vehicle.id, compressed);
          await updateVehicle(vehicle.id, { imageUrls: [url] });
          vehicle.imageUrls = [url];
        } catch (e) { console.error("Image upload failed", e); }
      }

      addVehicle(vehicle);
      setIsComplete(true);
    } catch (err) {
      alert("Asset initialization failed. Check connectivity.");
    } finally {
      setIsProcessing(false);
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

  if (isComplete) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6 z-[9999]">
        <div className="w-full max-w-xl text-center space-y-8 animate-slide-up">
          <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white text-4xl mx-auto shadow-2xl shadow-emerald-500/20">✓</div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white tracking-tighter">Asset Initialized</h2>
            <p className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">Digital Twin Active & Synchronized</p>
          </div>
          <button 
            onClick={() => setCurrentView('garage')}
            className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-blue-500 transition-all"
          >
            Enter Command Garage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#fcfcfd] z-[9999] flex flex-col lg:flex-row overflow-hidden">
      {/* Sidebar: Digital Twin Preview */}
      <div className="lg:w-5/12 bg-slate-900 flex flex-col relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:40px_40px]"></div>
        </div>
        
        <header className="p-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black">A</div>
            <div>
              <h1 className="text-white font-black text-lg tracking-tight uppercase">Onboarding</h1>
              <p className="text-blue-400 text-[8px] font-black uppercase tracking-[0.3em]">Asset Calibration Node</p>
            </div>
          </div>
        </header>

        <div className="flex-grow flex items-center justify-center p-12 relative z-10">
          <div className="w-full max-w-lg space-y-12 animate-slide-up">
            <div className="text-center space-y-2">
               <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{form.make || 'Draft'} {form.model || 'Asset'}</h2>
               <div className="text-blue-500/60 font-mono text-[10px] uppercase tracking-widest">{form.vin || 'VIN_PENDING_COMMIT'}</div>
            </div>

            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={onImageChange} />
              {imagePreview ? (
                <div className="aspect-[16/10] rounded-[3rem] overflow-hidden border-8 border-slate-800 shadow-3xl relative">
                  <img src={imagePreview} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-blue-600/20 mix-blend-overlay"></div>
                </div>
              ) : (
                <div className="relative group">
                  <VehicleBlueprint type={form.bodyType} className="bg-slate-800/50 border-slate-700/50 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white text-slate-950 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xl">Upload Asset Image</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-slate-800/40 rounded-3xl border border-slate-700/50">
                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</div>
                <div className="text-white font-black">UNINITIALIZED</div>
              </div>
              <div className="p-6 bg-slate-800/40 rounded-3xl border border-slate-700/50">
                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Complexity</div>
                <div className="text-white font-black">Lvl 4 Core</div>
              </div>
            </div>
          </div>
        </div>

        <footer className="p-8 border-t border-slate-800 text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] relative z-10">
          AUTOPAL NEURAL ENGINE v4.0.2
        </footer>
      </div>

      {/* Main Form Area */}
      <div className="flex-grow flex flex-col min-h-0 bg-white">
        <header className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
             <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">01</span>
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Manual Configuration</h3>
          </div>
          <button onClick={() => setCurrentView('garage')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors">Abort</button>
        </header>

        <div className="flex-grow overflow-y-auto p-8 md:p-16 lg:p-20 scrollbar-hide">
          <div className="max-w-xl mx-auto space-y-16">
            <section className="space-y-10">
              <div className="space-y-6">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Identification</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <input type="text" placeholder="Make (e.g. Toyota)" className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner" value={form.make} onChange={e => setForm({...form, make: e.target.value})} />
                  <input type="text" placeholder="Model (e.g. Camry)" className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <input type="number" placeholder="Year" className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none shadow-inner" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value)})} />
                  <input type="text" placeholder="Chassis ID (VIN)" className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl font-mono font-black text-center tracking-widest outline-none shadow-inner uppercase" value={form.vin} onChange={e => setForm({...form, vin: e.target.value.toUpperCase()})} />
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Engineering Baseline</label>
                <div className="grid grid-cols-2 gap-6">
                  <select className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none appearance-none cursor-pointer" value={form.bodyType} onChange={e => setForm({...form, bodyType: e.target.value as BodyType})}>
                    <option value="sedan">Saloon / Sedan</option>
                    <option value="suv">SUV / Cross-over</option>
                    <option value="truck">Truck / Pickup</option>
                    <option value="van">Van / MPV</option>
                    <option value="other">Special Utility</option>
                  </select>
                  <select className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none appearance-none cursor-pointer" value={form.fuelType} onChange={e => setForm({...form, fuelType: e.target.value})}>
                    <option value="petrol">Petrol (PMS)</option>
                    <option value="diesel">Diesel (AGO)</option>
                    <option value="hybrid">Hybrid (HEV)</option>
                    <option value="electric">Electric (EV)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">Current Odometer (KM)</label>
                <input 
                  type="number" 
                  className="w-full px-10 py-10 bg-blue-50 border-4 border-blue-100 rounded-[2.5rem] text-5xl md:text-6xl font-mono font-black text-blue-600 text-center shadow-inner outline-none focus:bg-blue-100/50 transition-all"
                  value={form.mileage || ''}
                  onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})}
                />
              </div>
            </section>
          </div>
        </div>

        <footer className="p-8 border-t border-slate-100 bg-white/95 backdrop-blur-md sticky bottom-0 flex gap-4">
          <button 
            disabled={isProcessing}
            onClick={handleFinalize}
            className="flex-grow bg-slate-900 text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4 disabled:opacity-50 active:scale-[0.98]"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : 'Launch Digital Twin'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default OnboardingCommandCenter;