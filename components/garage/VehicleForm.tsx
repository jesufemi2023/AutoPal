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
    specs: {
      oilGrade: initialData?.specs?.oilGrade || '',
      tireSize: initialData?.specs?.tireSize || '',
      batteryType: initialData?.specs?.batteryType || '',
      ...initialData?.specs
    } as VehicleSpecs
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.make.trim()) newErrors.make = "Manufacturer required";
    if (!form.model.trim()) newErrors.model = "Model required";
    if (form.year < 1886 || form.year > new Date().getFullYear() + 1) newErrors.year = "Invalid year";
    if (form.mileage < 0) newErrors.mileage = "Mileage cannot be negative";
    if (form.vin && !isValidVIN(form.vin)) newErrors.vin = "Chassis ID must be 17 characters";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSumbit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onSubmit(form as any);
    }
  };

  return (
    <div className="bg-white card-radius shadow-4xl border border-slate-100 p-8 md:p-12 w-full max-w-2xl animate-slide-up">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{title}</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Digital Twin Calibration</p>
        </div>
        <button onClick={onCancel} className="text-slate-300 hover:text-slate-900 transition-colors text-2xl">×</button>
      </div>

      <form onSubmit={handleSumbit} className="space-y-10">
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-slate-900 text-white rounded flex items-center justify-center text-[8px] font-black">01</span>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identification</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Make</label>
              <input 
                type="text" value={form.make} 
                onChange={e => setForm({...form, make: e.target.value})}
                placeholder="Toyota"
                className={`w-full px-5 py-4 bg-slate-50 border ${errors.make ? 'border-rose-300 ring-4 ring-rose-50' : 'border-slate-100'} rounded-2xl font-bold focus:bg-white outline-none transition-all`}
              />
              {errors.make && <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest ml-1">{errors.make}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Model</label>
              <input 
                type="text" value={form.model} 
                onChange={e => setForm({...form, model: e.target.value})}
                placeholder="Corolla"
                className={`w-full px-5 py-4 bg-slate-50 border ${errors.model ? 'border-rose-300 ring-4 ring-rose-50' : 'border-slate-100'} rounded-2xl font-bold focus:bg-white outline-none transition-all`}
              />
              {errors.model && <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest ml-1">{errors.model}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
              <input 
                type="number" value={form.year} 
                onChange={e => setForm({...form, year: parseInt(e.target.value)})}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:bg-white outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Chassis ID (VIN)</label>
              <input 
                type="text" value={form.vin} 
                onChange={e => setForm({...form, vin: e.target.value.toUpperCase()})}
                maxLength={17}
                placeholder="17 CHARACTERS"
                className={`w-full px-5 py-4 bg-slate-50 border ${errors.vin ? 'border-rose-300 ring-4 ring-rose-50' : 'border-slate-100'} rounded-2xl font-mono font-black focus:bg-white outline-none text-center tracking-widest`}
              />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-blue-600 text-white rounded flex items-center justify-center text-[8px] font-black">02</span>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engineering Data</h4>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Body Type</label>
              <select 
                value={form.bodyType} 
                onChange={e => setForm({...form, bodyType: e.target.value as BodyType})}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none cursor-pointer appearance-none"
              >
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="truck">Truck</option>
                <option value="van">Van</option>
                <option value="coupe">Coupe</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fuel Type</label>
              <select 
                value={form.fuelType} 
                onChange={e => setForm({...form, fuelType: e.target.value})}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none cursor-pointer appearance-none"
              >
                <option value="petrol">Petrol (PMS)</option>
                <option value="diesel">Diesel (AGO)</option>
                <option value="hybrid">Hybrid</option>
                <option value="electric">Electric</option>
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-emerald-500 text-white rounded flex items-center justify-center text-[8px] font-black">03</span>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telemetry</h4>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Odometer (KM)</label>
            <input 
              type="number" value={form.mileage} 
              onChange={e => setForm({...form, mileage: parseInt(e.target.value)})}
              className="w-full px-10 py-6 bg-slate-900 border-none rounded-[2rem] text-3xl font-mono font-black text-emerald-400 text-center shadow-inner outline-none focus:ring-4 focus:ring-emerald-400/10"
            />
          </div>
        </section>

        <div className="flex gap-4 pt-4">
          <button 
            type="button" onClick={onCancel}
            className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
          >
            Discard
          </button>
          <button 
            type="submit" disabled={isProcessing}
            className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : 'Commit Updates'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VehicleForm;