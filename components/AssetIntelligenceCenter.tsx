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
    imageUrl: initialVehicle?.imageUrls?.[0] || '',
    specs: {
      tireSize: initialVehicle?.specs?.tireSize || '',
      oilGrade: initialVehicle?.specs?.oilGrade || '',
      batteryType: initialVehicle?.specs?.batteryType || '',
      transmission: initialVehicle?.specs?.transmission || 'automatic'
    }
  });

  useEffect(() => {
    if (initialVehicle?.imageUrls?.[0]) {
      setImagePreview(initialVehicle.imageUrls[0]);
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
        const payload = { ...form };
        delete (payload as any).imageUrl;
        savedVehicle = await updateVehicle(editingVehicleId!, payload as Partial<Vehicle>);
      }
      
      if (imageFile && user?.id) {
        try {
          const compressed = await compressImage(imageFile, 800, 0.7);
          const url = await uploadVehicleImage(user.id, savedVehicle.id, compressed);
          savedVehicle = await updateVehicle(savedVehicle.id, { imageUrls: [url] });
        } catch (e: any) { 
          console.error("Optical data sync failed", e); 
          // If the error is an RLS error, we want to inform the user specifically
          if (e.message?.includes('Permission Denied') || e.message?.includes('RLS')) {
            alert(`Optical Sync Error: Image storage permissions are not configured correctly in the backend. The vehicle was saved, but the photo was rejected.\n\nTechnical Details: ${e.message}`);
          }
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
      let errorMsg = err.message || "Unknown connectivity fault.";
      
      if (errorMsg.includes('RLS') || errorMsg.includes('policy')) {
        errorMsg = `Security Protocol Violation: The cloud database rejected this asset due to missing Row-Level Security (RLS) policies. Please consult SUPABASE_GUIDE.md to finalize infrastructure setup.\n\nFull error: ${errorMsg}`;
      }

      alert(`Neural Sync Failure:\n\n${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecommission = async () => {
    if (!editingVehicleId) return;
    
    const confirmed = window.confirm(
      "CAUTION: You are about to decommission this digital twin. All historical intelligence and service logs will be archived. Proceed?"
    );

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
          <div className="w-20 h-20 sm:w-28 sm:h-28 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white text-3xl sm:text-5xl mx-auto shadow-4xl shadow-blue-500/40 border-4 border-white/20">
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
          <button 
            onClick={handleClose}
            className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-3xl hover:bg-blue-600 hover:text-white transition-all active:scale-95"
          >
            Enter Command Garage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#fcfcfd] z-[9999] flex flex-col lg:flex-row overflow-hidden">
      {/* Visual Workspace Anchor */}
      <div className="h-[35vh] lg:h-full lg:w-5/12 bg-slate-900 flex flex-col relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:32px_32px]"></div>
        </div>
        
        <header className="p-6 sm:p-10 relative z-10 shrink-0 flex justify-between items-center">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-black text-base sm:text-lg shadow-xl shadow-blue-600/20">A</div>
            <div>
              <h1 className="text-white font-black text-sm sm:text-xl tracking-tighter uppercase leading-tight">Calibration Hub</h1>
              <p className="text-blue-500/60 text-[7px] sm:text-[8px] font-black uppercase tracking-[0.3em]">Node: {mode === 'onboarding' ? 'Initialization' : 'Maintenance'}</p>
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
               <div className="inline-block px-3 py-1 bg-slate-800 rounded-full text-slate-500 font-mono text-[8px] uppercase tracking-widest border border-slate-700">
                 {form.vin || 'VIN_NODE_PENDING'}
               </div>
            </div>

            <div className="relative group cursor-pointer max-w-xs sm:max-w-none mx-auto" onClick={() => fileInputRef.current?.click()}>
              <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={onImageChange} />
              {imagePreview ? (
                <div className="aspect-[16/10] rounded-[2rem] overflow-hidden border-[8px] border-slate-800 shadow-3xl relative group">
                  <img src={imagePreview} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                </div>
              ) : (
                <div className="relative group">
                  <VehicleBlueprint type={form.bodyType} className="bg-slate-800/40 border-slate-700/50 text-slate-600 group-hover:text-blue-500 transition-all py-8 sm:py-20" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Control Panel */}
      <div className="flex-grow flex flex-col min-h-0 bg-white shadow-[-40px_0_80px_-40px_rgba(0,0,0,0.1)]">
        <header className="p-6 sm:p-10 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur-xl sticky top-0 z-50 shrink-0">
          <div className="flex items-center gap-3">
             <span className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[10px] font-black">01</span>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Neural Calibration Parameters</h3>
          </div>
          <button onClick={handleClose} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors hidden lg:block">Discard & Terminate</button>
        </header>

        <div className="flex-grow overflow-y-auto p-6 sm:p-20 scrollbar-hide">
          <div className="max-w-2xl mx-auto space-y-12 sm:space-y-20">
            {/* Identity Module */}
            <section className="space-y-6 sm:space-y-10">
              <div className="space-y-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Asset Identity</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Manufacturer</div>
                    <input type="text" placeholder="Toyota" className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none transition-all text-sm" value={form.make} onChange={e => setForm({...form, make: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Model Series</div>
                    <input type="text" placeholder="Camry" className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none transition-all text-sm" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Prod. Year</div>
                    <input type="number" className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none text-sm" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Chassis VIN</div>
                    <input type="text" placeholder="17-CHAR_ID" className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-mono font-black text-center tracking-widest outline-none uppercase text-sm" value={form.vin} onChange={e => setForm({...form, vin: e.target.value.toUpperCase()})} />
                  </div>
                </div>
              </div>
            </section>

            {/* Engineering Module */}
            <section className="space-y-6 sm:space-y-10">
              <div className="space-y-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Core Engineering</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Body Classification</div>
                    <select className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none text-sm" value={form.bodyType} onChange={e => setForm({...form, bodyType: e.target.value as BodyType})}>
                      <option value="sedan">Saloon / Sedan</option>
                      <option value="suv">SUV / Cross-over</option>
                      <option value="truck">Truck / Pickup</option>
                      <option value="van">Van / MPV</option>
                      <option value="other">Special Utility</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Power Source</div>
                    <select className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none text-sm" value={form.fuelType} onChange={e => setForm({...form, fuelType: e.target.value})}>
                      <option value="petrol">Internal Combustion (Petrol)</option>
                      <option value="diesel">Compression (Diesel)</option>
                      <option value="hybrid">Hybrid Architecture</option>
                      <option value="electric">Electric (EV)</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Hardware Telemetry Module */}
            <section className="space-y-10">
              <div className="space-y-8">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] ml-2">Active Telemetry (KM)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    className="w-full px-10 py-12 bg-blue-50 border-[6px] border-blue-100 rounded-[3rem] text-7xl font-mono font-black text-blue-600 text-center shadow-inner outline-none transition-all tracking-tighter"
                    value={form.mileage || ''}
                    onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Oil Viscosity</div>
                  <input type="text" placeholder="0W-20" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none text-xs" value={form.specs.oilGrade} onChange={e => setForm({...form, specs: {...form.specs, oilGrade: e.target.value}})} />
                </div>
                <div className="space-y-2">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Tire Spec</div>
                  <input type="text" placeholder="225/55 R17" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none text-xs" value={form.specs.tireSize} onChange={e => setForm({...form, specs: {...form.specs, tireSize: e.target.value}})} />
                </div>
                <div className="space-y-2">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Battery Cell</div>
                  <input type="text" placeholder="AGM 80Ah" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none text-xs" value={form.specs.batteryType} onChange={e => setForm({...form, specs: {...form.specs, batteryType: e.target.value}})} />
                </div>
              </div>
            </section>

            {/* Danger Zone - Only show in Edit Mode */}
            {mode === 'edit' && (
              <section className="mt-20 pt-16 border-t-2 border-slate-100 space-y-8 pb-12">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.4em] ml-2">Danger Zone</h4>
                  <p className="text-[11px] font-medium text-slate-400 ml-2 max-w-lg">
                    Decommissioning an asset will archive its digital twin. You will no longer receive maintenance alerts for this vehicle.
                  </p>
                </div>
                <button 
                  onClick={handleDecommission}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-10 py-5 bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? "Executing..." : "Decommission Asset"}
                </button>
              </section>
            )}
          </div>
        </div>

        {/* Action Infrastructure */}
        <footer className="p-6 sm:p-12 border-t border-slate-100 bg-white/95 backdrop-blur-xl sticky bottom-0 flex gap-6 shrink-0 shadow-[0_-20px_40px_rgba(0,0,0,0.02)]">
          <button 
            onClick={handleClose}
            className="hidden sm:block px-12 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all rounded-3xl"
          >
            Cancel
          </button>
          <button 
            disabled={isProcessing}
            onClick={handleCommit}
            className="flex-grow bg-slate-900 text-white py-8 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[12px] shadow-4xl hover:bg-blue-600 transition-all flex items-center justify-center gap-6 disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>{mode === 'onboarding' ? 'Launch Digital Twin' : 'Sync Updates'}</>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AssetIntelligenceCenter;
