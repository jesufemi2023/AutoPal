import React, { useState } from 'react';
import { Vehicle, BodyType, VehicleSpecs } from '../../shared/types.ts';
import { isValidVIN } from '../../shared/utils.ts';

interface VehicleFormProps {
  initialData?: Partial<Vehicle>;
  onSubmit: (data: Partial<Vehicle>) => Promise<void>;
  onCancel: () => void;
  isProcessing?: boolean;
  title: string;
}

const VehicleForm: React.FC<VehicleFormProps> = ({ 
  initialData, onSubmit, onCancel, isProcessing, title 
}) => {
  const [form, setForm] = useState({
    make: initialData?.make || '',
    model: initialData?.model || '',
    year: initialData?.year || new Date().getFullYear(),
    vin: initialData?.vin || '',
    mileage: initialData?.mileage || 0,
    bodyType: initialData?.bodyType || 'sedan' as BodyType,
    fuelType: initialData?.fuelType || 'petrol',
    engineSize: initialData?.engineSize || '',
    imageUrl: initialData?.imageUrl || '',
    specs: {
      oilGrade: initialData?.specs?.oilGrade || '',
      tireSize: initialData?.specs?.tireSize || '',
      batteryType: initialData?.specs?.batteryType || '',
      transmission: initialData?.specs?.transmission || 'automatic',
    } as VehicleSpecs
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.make.trim()) newErrors.make = "Manufacturer required";
    if (!form.model.trim()) newErrors.model = "Model required";
    if (form.year < 1886 || form.year > new Date().getFullYear() + 2) newErrors.year = "Invalid year";
    if (form.vin && !isValidVIN(form.vin)) newErrors.vin = "Must be 17 characters";
    if (form.mileage < 0) newErrors.mileage = "Invalid mileage";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onSubmit(form as any);
    }
  };

  const inputClasses = (error?: string) => `
    w-full px-4 py-3.5 bg-slate-50 border 
    ${error ? 'border-rose-400 ring-4 ring-rose-50' : 'border-slate-100 focus:border-blue-600 focus:bg-white'} 
    rounded-2xl font-bold outline-none transition-all shadow-sm text-slate-900 placeholder-slate-300 text-sm
  `;

  const labelClasses = "text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block";

  return (
    <div className="bg-white card-radius shadow-4xl border border-slate-100 w-full max-w-5xl animate-slide-up mx-auto flex flex-col max-h-[92vh] sm:max-h-[85vh]">
      {/* Header: Sticky */}
      <div className="flex justify-between items-center p-6 sm:p-10 border-b border-slate-50 shrink-0">
        <div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">{title}</h2>
          <p className="text-blue-600 text-[8px] font-black uppercase tracking-[0.3em] mt-2">Neural Link Calibration</p>
        </div>
        <button 
          type="button"
          onClick={onCancel} 
          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90"
        >
          <span className="text-xl sm:text-2xl font-light">×</span>
        </button>
      </div>

      {/* Body: Scrollable */}
      <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 sm:p-10 md:p-14 scrollbar-hide space-y-12 sm:space-y-16">
        {/* SECTION 01: IDENTITY */}
        <section className="space-y-6 sm:space-y-8">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[9px] font-black shadow-lg">01</span>
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Asset Identification</h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            <div className="space-y-1">
              <label className={labelClasses}>Make</label>
              <input type="text" value={form.make} onChange={e => setForm({...form, make: e.target.value})} placeholder="Toyota" className={inputClasses(errors.make)} />
              {errors.make && <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest ml-1 mt-1">{errors.make}</p>}
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Model</label>
              <input type="text" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Camry" className={inputClasses(errors.model)} />
              {errors.model && <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest ml-1 mt-1">{errors.model}</p>}
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Year</label>
              <input type="number" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value)})} className={inputClasses(errors.year)} />
            </div>
            <div className="lg:col-span-1 space-y-1">
              <label className={labelClasses}>VIN</label>
              <input type="text" value={form.vin} onChange={e => setForm({...form, vin: e.target.value.toUpperCase()})} maxLength={17} placeholder="CHASSIS ID" className={`${inputClasses(errors.vin)} font-mono tracking-[0.1em] text-center`} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className={labelClasses}>Image Asset URL</label>
              <input type="url" value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} placeholder="https://..." className={inputClasses()} />
            </div>
          </div>
        </section>

        {/* SECTION 02: ENGINEERING */}
        <section className="space-y-6 sm:space-y-8">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-[9px] font-black shadow-lg">02</span>
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Baseline Engineering</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
             <div className="space-y-1">
              <label className={labelClasses}>Body Type</label>
              <div className="relative">
                <select value={form.bodyType} onChange={e => setForm({...form, bodyType: e.target.value as BodyType})} className={`${inputClasses()} appearance-none pr-10`}>
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="truck">Truck</option>
                  <option value="van">Van</option>
                  <option value="coupe">Coupe</option>
                  <option value="other">Utility</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">▼</div>
              </div>
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Fuel Architecture</label>
              <div className="relative">
                <select value={form.fuelType} onChange={e => setForm({...form, fuelType: e.target.value})} className={`${inputClasses()} appearance-none pr-10`}>
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="electric">Electric</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">▼</div>
              </div>
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Engine Capacity</label>
              <input type="text" value={form.engineSize} onChange={e => setForm({...form, engineSize: e.target.value})} placeholder="2.4L I4" className={inputClasses()} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Current Mileage (KM)</label>
              <input type="number" value={form.mileage} onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})} className={`${inputClasses(errors.mileage)} font-mono font-black text-blue-600`} />
            </div>
          </div>
        </section>

        {/* SECTION 03: SPECS */}
        <section className="space-y-6 sm:space-y-8">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-[9px] font-black shadow-lg">03</span>
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Hardware Specs</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            <div className="space-y-1">
              <label className={labelClasses}>Oil Viscosity</label>
              <input type="text" value={form.specs.oilGrade} onChange={e => setForm({...form, specs: {...form.specs, oilGrade: e.target.value}})} placeholder="5W-30" className={inputClasses()} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Tire Dimension</label>
              <input type="text" value={form.specs.tireSize} onChange={e => setForm({...form, specs: {...form.specs, tireSize: e.target.value}})} placeholder="225/55 R17" className={inputClasses()} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Battery Group</label>
              <input type="text" value={form.specs.batteryType} onChange={e => setForm({...form, specs: {...form.specs, batteryType: e.target.value}})} placeholder="AGM 95Ah" className={inputClasses()} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Transmission</label>
              <div className="relative">
                <select value={form.specs.transmission} onChange={e => setForm({...form, specs: {...form.specs, transmission: e.target.value as any}})} className={`${inputClasses()} appearance-none pr-10`}>
                  <option value="automatic">Automatic</option>
                  <option value="manual">Manual</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">▼</div>
              </div>
            </div>
          </div>
        </section>
      </form>

      {/* Footer: Sticky */}
      <div className="p-6 sm:p-10 border-t border-slate-50 flex flex-col sm:flex-row gap-4 bg-white shrink-0">
        <button type="button" onClick={onCancel} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all rounded-2xl active:scale-95 bg-slate-50 sm:bg-transparent">
          Discard Changes
        </button>
        <button type="submit" onClick={handleSubmit} disabled={isProcessing} className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4 disabled:opacity-50 active:scale-[0.98]">
          {isProcessing ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Commit Calibration'}
        </button>
      </div>
    </div>
  );
};

export default VehicleForm;