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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSumbit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onSubmit(form as any);
    }
  };

  const inputClasses = (error?: string) => `
    w-full px-5 py-4 bg-slate-50 border 
    ${error ? 'border-rose-400 ring-4 ring-rose-50' : 'border-slate-100 focus:border-blue-600 focus:bg-white'} 
    rounded-2xl font-bold outline-none transition-all shadow-sm
  `;

  const labelClasses = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block";

  return (
    <div className="bg-white card-radius shadow-4xl border border-slate-100 p-6 sm:p-10 md:p-14 w-full max-w-5xl animate-slide-up mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{title}</h2>
          <p className="text-blue-600 text-[9px] font-black uppercase tracking-[0.3em] mt-2">Asset Calibration Interface</p>
        </div>
        <button onClick={onCancel} className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
          <span className="text-2xl">×</span>
        </button>
      </div>

      <form onSubmit={handleSumbit} className="space-y-12">
        {/* PHASE 01: IDENTITY */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <span className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[10px] font-black">01</span>
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Core Identification</h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="space-y-1">
              <label className={labelClasses}>Manufacturer</label>
              <input 
                type="text" value={form.make} 
                onChange={e => setForm({...form, make: e.target.value})}
                placeholder="e.g. Toyota"
                className={inputClasses(errors.make)}
              />
              {errors.make && <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest ml-1 mt-1">{errors.make}</p>}
            </div>

            <div className="space-y-1">
              <label className={labelClasses}>Model Name</label>
              <input 
                type="text" value={form.model} 
                onChange={e => setForm({...form, model: e.target.value})}
                placeholder="e.g. Land Cruiser"
                className={inputClasses(errors.model)}
              />
              {errors.model && <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest ml-1 mt-1">{errors.model}</p>}
            </div>

            <div className="space-y-1">
              <label className={labelClasses}>Year of Registry</label>
              <input 
                type="number" value={form.year} 
                onChange={e => setForm({...form, year: parseInt(e.target.value)})}
                className={inputClasses(errors.year)}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1 space-y-1">
              <label className={labelClasses}>Chassis ID (VIN)</label>
              <input 
                type="text" value={form.vin} 
                onChange={e => setForm({...form, vin: e.target.value.toUpperCase()})}
                maxLength={17}
                placeholder="17-DIGIT CODE"
                className={`${inputClasses(errors.vin)} font-mono tracking-widest text-center`}
              />
              {errors.vin && <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest ml-1 mt-1">{errors.vin}</p>}
            </div>

            <div className="sm:col-span-2 lg:col-span-2 space-y-1">
              <label className={labelClasses}>Digital Asset Image URL</label>
              <input 
                type="url" value={form.imageUrl} 
                onChange={e => setForm({...form, imageUrl: e.target.value})}
                placeholder="https://images.autopal.ng/v/..."
                className={inputClasses()}
              />
            </div>
          </div>
        </section>

        {/* PHASE 02: ENGINEERING */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <span className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center text-[10px] font-black">02</span>
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Engineering Parameters</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
             <div className="space-y-1">
              <label className={labelClasses}>Body Classification</label>
              <select 
                value={form.bodyType} 
                onChange={e => setForm({...form, bodyType: e.target.value as BodyType})}
                className={`${inputClasses()} appearance-none cursor-pointer`}
              >
                <option value="sedan">Saloon / Sedan</option>
                <option value="suv">SUV / Crossover</option>
                <option value="truck">Truck / Pickup</option>
                <option value="van">Van / MPV</option>
                <option value="coupe">Coupe / Sport</option>
                <option value="other">Other / Special</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelClasses}>Fuel Architecture</label>
              <select 
                value={form.fuelType} 
                onChange={e => setForm({...form, fuelType: e.target.value})}
                className={`${inputClasses()} appearance-none cursor-pointer`}
              >
                <option value="petrol">Petrol (PMS)</option>
                <option value="diesel">Diesel (AGO)</option>
                <option value="hybrid">Hybrid (HEV)</option>
                <option value="electric">Electric (EV)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelClasses}>Engine Capacity</label>
              <input 
                type="text" value={form.engineSize} 
                onChange={e => setForm({...form, engineSize: e.target.value})}
                placeholder="e.g. 2.5L V6"
                className={inputClasses()}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClasses}>Transmission</label>
              <select 
                value={form.specs.transmission} 
                onChange={e => setForm({...form, specs: {...form.specs, transmission: e.target.value as any}})}
                className={`${inputClasses()} appearance-none cursor-pointer`}
              >
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
        </section>

        {/* PHASE 03: TECHNICAL SPECS */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <span className="w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center text-[10px] font-black">03</span>
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Component Specifications</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
            <div className="space-y-1">
              <label className={labelClasses}>Oil Viscosity</label>
              <input 
                type="text" value={form.specs.oilGrade} 
                onChange={e => setForm({...form, specs: {...form.specs, oilGrade: e.target.value}})}
                placeholder="e.g. 0W-20"
                className={inputClasses()}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Tire Dimension</label>
              <input 
                type="text" value={form.specs.tireSize} 
                onChange={e => setForm({...form, specs: {...form.specs, tireSize: e.target.value}})}
                placeholder="e.g. 225/60 R18"
                className={inputClasses()}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Battery Group</label>
              <input 
                type="text" value={form.specs.batteryType} 
                onChange={e => setForm({...form, specs: {...form.specs, batteryType: e.target.value}})}
                placeholder="e.g. Group 35"
                className={inputClasses()}
              />
            </div>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-slate-50">
          <button 
            type="button" onClick={onCancel}
            className="flex-1 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 rounded-2xl sm:bg-transparent"
          >
            Discard Changes
          </button>
          <button 
            type="submit" disabled={isProcessing}
            className="flex-[2] bg-slate-900 text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
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