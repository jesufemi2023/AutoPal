
import React, { useState, useRef, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { decodeVIN } from '../services/geminiService.ts';
import { registerNewVehicle } from '../services/vehicleRegistrationService.ts';
import { uploadVehicleImage, updateVehicleData } from '../services/vehicleService.ts';
import { BodyType } from '../shared/types.ts';
import { isValidVIN, compressImage } from '../shared/utils.ts';
import { VehicleBlueprint } from './VehicleBlueprint.tsx';

type OnboardingStep = 'identification' | 'calibration' | 'completion';

const OnboardingCommandCenter: React.FC = () => {
  const { user, addVehicle, setCurrentView } = useAutoPalStore();
  
  const [step, setStep] = useState<OnboardingStep>('identification');
  const [isProcessing, setIsProcessing] = useState(false);
  const [vin, setVin] = useState('');
  const [vinError, setVinError] = useState<string | null>(null);
  
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
    specs: {
      tireSize: '',
      oilGrade: '',
      batteryType: ''
    }
  });

  const handleVinSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setVinError(null);
    if (vin.length !== 17) { setVinError("17 characters required."); return; }
    if (!isValidVIN(vin)) { setVinError("Invalid Chassis ID Format."); return; }

    setIsProcessing(true);
    try {
      const decoded = await decodeVIN(vin);
      setForm(prev => ({
        ...prev,
        make: decoded.make || '',
        model: decoded.model || '',
        year: decoded.year || new Date().getFullYear(),
        bodyType: (decoded.bodyType as BodyType) || 'sedan'
      }));
      setStep('calibration');
    } catch (err) {
      console.warn("AI decoding failed, switching to manual mode");
      setStep('calibration');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalize = async () => {
    if (!form.make || !form.model) {
      alert("Core manufacturer data required.");
      return;
    }
    setIsProcessing(true);
    try {
      const vehicle = await registerNewVehicle(user?.id || 'guest', vin, { ...form });
      
      if (imageFile && user?.id) {
        try {
          const compressed = await compressImage(imageFile, 800, 0.7);
          const url = await uploadVehicleImage(user.id, vehicle.id, compressed);
          await updateVehicleData(vehicle.id, { imageUrls: [url] });
          vehicle.imageUrls = [url];
        } catch (e) { console.error("Image upload failed", e); }
      }

      addVehicle(vehicle);
      setStep('completion');
    } catch (err) {
      alert("Initialization failed. Check network.");
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

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden selection:bg-blue-100">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[80vw] h-[80vh] bg-blue-50/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      {/* HEADER */}
      <header className="px-6 md:px-12 py-8 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-[100] border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black">A</div>
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Onboarding Stage</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${step === 'identification' ? 'bg-blue-600 animate-pulse' : 'bg-emerald-500'}`}></span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                {step === 'identification' ? 'Phase 01: Identification' : step === 'calibration' ? 'Phase 02: Calibration' : 'Phase 03: Finalized'}
              </span>
            </div>
          </div>
        </div>
        
        {step !== 'completion' && (
          <button 
            onClick={() => setCurrentView('garage')}
            className="group flex items-center gap-3 px-6 py-3 rounded-xl hover:bg-slate-50 transition-all"
          >
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Abort Mission</span>
            <span className="text-2xl font-light text-slate-300">×</span>
          </button>
        )}
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow flex flex-col">
        {step === 'identification' && (
          <div className="flex-grow flex items-center justify-center p-6 animate-slide-up">
            <div className="w-full max-w-2xl space-y-12 py-12">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-blue-600 text-white rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto shadow-2xl shadow-blue-500/20">🔍</div>
                <div className="space-y-3">
                  <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">Initiate Asset Scan</h2>
                  <p className="text-slate-400 text-sm md:text-base font-medium max-w-sm mx-auto">Input the 17-digit Chassis Number (VIN) to map your vehicle's factory roadmap.</p>
                </div>
              </div>

              <form onSubmit={handleVinSubmit} className="space-y-8">
                <div className="relative group">
                  <input 
                    type="text"
                    autoFocus
                    placeholder="ABC1234567890XYZ"
                    maxLength={17}
                    value={vin}
                    onChange={(e) => {
                      setVin(e.target.value.toUpperCase());
                      setVinError(null);
                    }}
                    className={`w-full px-8 py-10 bg-slate-50 border-4 ${vinError ? 'border-rose-400 ring-8 ring-rose-50' : 'border-slate-100 focus:border-blue-600'} rounded-[2.5rem] text-2xl md:text-5xl font-mono font-black text-center uppercase tracking-[0.2em] outline-none transition-all shadow-inner`}
                  />
                  {vinError && <p className="absolute -bottom-8 left-0 right-0 text-center text-rose-500 text-[10px] font-black uppercase tracking-widest animate-pulse">{vinError}</p>}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => { setVin(''); setStep('calibration'); }}
                    className="flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    Skip to Manual Setup
                  </button>
                  <button 
                    type="submit"
                    disabled={isProcessing || vin.length < 17}
                    className="flex-[2] bg-slate-900 text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-slate-900/10 hover:bg-blue-600 transition-all disabled:opacity-20 flex items-center justify-center gap-4"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <span>Syncing Data...</span>
                      </>
                    ) : 'Analyze Asset Matrix'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {step === 'calibration' && (
          <div className="flex-grow grid grid-cols-1 lg:grid-cols-2">
            {/* LEFT: PREVIEW / BLUEPRINT */}
            <div className="bg-slate-50/50 p-8 md:p-16 flex flex-col justify-center items-center border-b lg:border-b-0 lg:border-r border-slate-100 relative group overflow-hidden">
               <div className="absolute inset-0 pointer-events-none">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border-[2px] border-slate-200/20 rounded-full"></div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border-[1px] border-slate-200/30 rounded-full"></div>
               </div>

               <div className="w-full max-w-xl space-y-12 relative z-10 animate-slide-up">
                  <div className="text-center">
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{form.make || 'Draft'} {form.model || 'Asset'}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{vin || 'MANUAL_ENTRY_MODE'}</p>
                  </div>

                  <div className="relative group/img">
                    <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={onImageChange} />
                    {imagePreview ? (
                      <div className="aspect-[16/10] rounded-[3rem] overflow-hidden border-8 border-white shadow-3xl relative group">
                        <img src={imagePreview} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={() => fileInputRef.current?.click()} className="bg-white text-slate-900 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl">Replace Photo</button>
                        </div>
                      </div>
                    ) : (
                      <div className="cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                        <VehicleBlueprint type={form.bodyType} className="shadow-2xl shadow-slate-200/40 scale-100 group-hover:scale-[1.02] transition-transform duration-500" />
                        <div className="absolute bottom-6 right-6 w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-xl border border-slate-50 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">📷</div>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            {/* RIGHT: FORM */}
            <div className="p-8 md:p-16 lg:p-24 overflow-y-auto scrollbar-hide bg-white animate-slide-up">
              <div className="max-w-xl mx-auto space-y-12">
                <section className="space-y-8">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] font-black">01</span>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mechanical Specification</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Make / Brand</label>
                      <input type="text" placeholder="Toyota" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:bg-white focus:border-blue-600 outline-none transition-all" value={form.make} onChange={e => setForm({...form, make: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Model Lineup</label>
                      <input type="text" placeholder="Camry" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:bg-white focus:border-blue-600 outline-none transition-all" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Production Year</label>
                      <input type="number" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Engine Size</label>
                      <input type="text" placeholder="2.4L / 180hp" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none" value={form.engineSize} onChange={e => setForm({...form, engineSize: e.target.value})} />
                    </div>
                  </div>
                </section>

                <section className="space-y-8">
                   <div className="flex items-center gap-4">
                    <span className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-[10px] font-black">02</span>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Telemetry</h4>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Odometer (Kilometers)</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      className="w-full px-10 py-8 bg-blue-50 border-4 border-blue-100 rounded-[2rem] text-4xl font-mono font-black text-blue-600 outline-none text-center shadow-inner" 
                      value={form.mileage || ''} 
                      onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Propulsion</label>
                      <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none appearance-none cursor-pointer" value={form.fuelType} onChange={e => setForm({...form, fuelType: e.target.value})}>
                        <option value="petrol">Petrol (PMS)</option>
                        <option value="diesel">Diesel (AGO)</option>
                        <option value="hybrid">Hybrid (HEV)</option>
                        <option value="electric">Electric (EV)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Form Factor</label>
                      <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none appearance-none cursor-pointer" value={form.bodyType} onChange={e => setForm({...form, bodyType: e.target.value as BodyType})}>
                        <option value="sedan">Saloon / Sedan</option>
                        <option value="suv">SUV / Cross-over</option>
                        <option value="truck">Truck / Pickup</option>
                        <option value="van">Van / Minibus</option>
                        <option value="coupe">Coupe / GT</option>
                        <option value="other">Special Utility</option>
                      </select>
                    </div>
                  </div>
                </section>

                <div className="pt-10 flex gap-4">
                  <button 
                    onClick={() => setStep('identification')}
                    className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    Previous Phase
                  </button>
                  <button 
                    disabled={isProcessing}
                    onClick={handleFinalize}
                    className="flex-[2] bg-slate-900 text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-slate-900/10 hover:bg-emerald-600 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <span>Initializing Twin...</span>
                      </>
                    ) : 'Confirm Calibration'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'completion' && (
          <div className="flex-grow flex items-center justify-center p-6 animate-slide-up bg-slate-50/50">
            <div className="w-full max-w-xl bg-white rounded-[3.5rem] p-12 md:p-20 text-center shadow-4xl border border-white space-y-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
              
              <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-10 shadow-inner">✓</div>
              
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Digital Twin Created</h2>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Your <span className="text-slate-900 font-bold">{form.year} {form.make} {form.model}</span> is now fully synchronized with our predictive maintenance roadmap.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Baseline Health</div>
                  <div className="text-2xl font-black text-emerald-600">100%</div>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Roadmap Active</div>
                  <div className="text-2xl font-black text-blue-600">Yes</div>
                </div>
              </div>

              <button 
                onClick={() => setCurrentView('garage')}
                className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-blue-600 transition-all active:scale-[0.98]"
              >
                Access Command Garage
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER METRICS */}
      <footer className="px-6 md:px-12 py-6 border-t border-slate-100 bg-white/80 backdrop-blur-md flex justify-between items-center text-[8px] font-black uppercase tracking-[0.3em] text-slate-300">
        <div className="flex gap-8">
          <span>Serverless Sync: 🟢 Stable</span>
          <span className="hidden sm:inline">AI Latency: 420ms</span>
        </div>
        <div>
          AutoPal NG Engine v3.5
        </div>
      </footer>
    </div>
  );
};

export default OnboardingCommandCenter;
