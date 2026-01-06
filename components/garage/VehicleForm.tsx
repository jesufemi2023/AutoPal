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
    w-full px-5 py-4 bg-slate-50 border 
    ${error ? 'border-rose-400 ring-4 ring-rose-50' : 'border-slate-100 focus:border-blue-600 focus:bg-white'} 
    rounded-2xl font-bold outline-none transition-all shadow-sm text-slate-900 placeholder-slate-300
  `;

  const labelClasses = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block";

  return (
    <div className="bg-white card-radius shadow-4xl border border-slate-100 p-6 sm:p-10 md:p-14 w-full max-w-5xl animate-slide-up mx-auto overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 md:mb-14">
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">{title}</h2>
          <p className="text-blue-600 text-[9px] font-black uppercase tracking-[0.3em] mt-3">Neural Configuration Interface</p>
        </div>
        <button 
          type="button"
          onClick={onCancel} 
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90"
        >
          <span className="text-2xl font-light">×</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10 md:space-y-16">
        {/* SECTION 01: IDENTITY & REGISTRY */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <span className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[10px] font-black shadow-lg shadow-slate-900/10">01</span>
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Asset Identification</h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className={labelClasses}>Make (Manufacturer)</label>
              <input 
                type="text" value={form.make} 
                onChange={e => setForm({...form, make: e.target.value})}
                placeholder="e.g. Mercedes-Benz"
                className={inputClasses(errors.make)}
              />
              {errors.make && <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest ml-1 mt-1">{errors.make}</p>}
            </div>

            <div className="space-y-1">
              <label className={labelClasses}>Model Designation</label>
              <input 
                type="text" value={form.model} 
                onChange={e => setForm({...form, model: e.target.value})}
                placeholder="e.g. G-Class"
                className={inputClasses(errors.model)}
              />
              {errors.model && <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest ml-1 mt-1">{errors.model}</p>}
            </div>

            <div className="space-y-1">
              <label className={labelClasses}>Year (Registry)</label>
              <input 
                type="number" value={form.year} 
                onChange={e => setForm({...form, year: parseInt(e.target.value)})}
                className={inputClasses(errors.year)}
              />
            </div>

            <div className="lg:col-span-1 space-y-1">
              <label className={labelClasses}>Chassis ID (VIN)</label>
              <input 
                type="text" value={form.vin} 
                onChange={e => setForm({...form, vin: e.target.value.toUpperCase()})}
                maxLength={17}
                placeholder="17-CHAR CODE"
                className={`${inputClasses(errors.vin)} font-mono tracking-[0.2em] text-center`}
              />
              {errors.vin && <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest ml-1 mt-1">{errors.vin}</p>}
            </div>

            <div className="sm:col-span-2 lg:col-span-2 space-y-1">
              <label className={labelClasses}>Image URL (Digital Twin Asset)</label>
              <input 
                type="url" value={form.imageUrl} 
                onChange={e => setForm({...form, imageUrl: e.target.value})}
                placeholder="https://cdn.autopal.io/assets/vehicle_main.jpg"
                className={inputClasses()}
              />
            </div>
          </div>
        </section>

        {/* SECTION 02: ENGINEERING BASELINE */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <span className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center text-[10px] font-black shadow-lg shadow-blue-600/10">02</span>
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Engineering Baseline</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
             <div className="space-y-1">
              <label className={labelClasses}>Body Type</label>
              <div className="relative">
                <select 
                  value={form.bodyType} 
                  onChange={e => setForm({...form, bodyType: e.target.value as BodyType})}
                  className={`${inputClasses()} appearance-none cursor-pointer pr-10`}
                >
                  <option value="sedan">Saloon / Sedan</option>
                  <option value="suv">SUV / Crossover</option>
                  <option value="truck">Truck / Pickup</option>
                  <option value="van">Van / MPV</option>
                  <option value="coupe">Coupe / Sport</option>
                  <option value="other">Special Utility</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelClasses}>Fuel Type</label>
              <div className="relative">
                <select 
                  value={form.fuelType} 
                  onChange={e => setForm({...form, fuelType: e.target.value})}
                  className={`${inputClasses()} appearance-none cursor-pointer pr-10`}
                >
                  <option value="petrol">Petrol (PMS)</option>
                  <option value="diesel">Diesel (AGO)</option>
                  <option value="hybrid">Hybrid (HEV)</option>
                  <option value="electric">Electric (EV)</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelClasses}>Engine Size</label>
              <input 
                type="text" value={form.engineSize} 
                onChange={e => setForm({...form, engineSize: e.target.value})}
                placeholder="e.g. 4.0L V8 Biturbo"
                className={inputClasses()}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClasses}>Current Mileage (KM)</label>
              <input 
                type="number" value={form.mileage} 
                onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})}
                className={`${inputClasses(errors.mileage)} font-mono font-black text-blue-600`}
              />
              {errors.mileage && <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest ml-1 mt-1">{errors.mileage}</p>}
            </div>
          </div>
        </section>

        {/* SECTION 03: TECHNICAL SPECS */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <span className="w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center text-[10px] font-black shadow-lg shadow-emerald-500/10">03</span>
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Component Specs</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className={labelClasses}>Oil Viscosity</label>
              <input 
                type="text" value={form.specs.oilGrade} 
                onChange={e => setForm({...form, specs: {...form.specs, oilGrade: e.target.value}})}
                placeholder="e.g. 0W-40"
                className={inputClasses()}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Tire Dimension</label>
              <input 
                type="text" value={form.specs.tireSize} 
                onChange={e => setForm({...form, specs: {...form.specs, tireSize: e.target.value}})}
                placeholder="e.g. 275/50 R20"
                className={inputClasses()}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Battery Group</label>
              <input 
                type="text" value={form.specs.batteryType} 
                onChange={e => setForm({...form, specs: {...form.specs, batteryType: e.target.value}})}
                placeholder="e.g. AGM 12V 95Ah"
                className={inputClasses()}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Transmission</label>
              <div className="relative">
                <select 
                  value={form.specs.transmission} 
                  onChange={e => setForm({...form, specs: {...form.specs, transmission: e.target.value as any}})}
                  className={`${inputClasses()} appearance-none cursor-pointer pr-10`}
                >
                  <option value="automatic">Automatic</option>
                  <option value="manual">Manual</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
              </div>
            </div>
          </div>
        </section>

        {/* FORM ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-slate-50">
          <button 
            type="button" 
            onClick={onCancel}
            className="flex-1 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-all rounded-2xl active:scale-95"
          >
            Discard Changes
          </button>
          <button 
            type="submit" 
            disabled={isProcessing}
            className="flex-[2] bg-slate-900 text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-slate-900/10 hover:bg-blue-600 transition-all flex items-center justify-center gap-4 disabled:opacity-50 active:scale-[0.98]"
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : 'Commit Calibration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VehicleForm;