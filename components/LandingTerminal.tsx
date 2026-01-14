
import React, { useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { generateMaintenanceSchedule } from '../services/geminiService.ts';

const LandingTerminal: React.FC = () => {
  const { setTransientVehicle, setCurrentView, setLoading } = useAutoPalStore();
  const [form, setForm] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: ''
  });

  const handleIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.make || !form.model || !form.mileage) return;
    
    setLoading(true);
    try {
      // Simulate/Trigger transient neural link
      setTransientVehicle({
        make: form.make,
        model: form.model,
        year: form.year,
        mileage: parseInt(form.mileage)
      });
      setCurrentView('report');
    } catch (err) {
      alert("Neural Link Interrupted");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:32px_32px]"></div>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 blur-[160px] rounded-full"></div>

      <div className="max-w-xl w-full space-y-12 relative z-10 animate-slide-up">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white text-3xl font-black shadow-3xl shadow-blue-500/30 mx-auto">A</div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter leading-none uppercase">Neural <span className="text-blue-500">Intake</span></h1>
          <p className="text-slate-500 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.4em] max-w-sm mx-auto leading-relaxed">
            Initialize transient telemetry for a one-time engineering roadmap. No Pilot ID required.
          </p>
        </div>

        <form onSubmit={handleIntake} className="bg-white/5 border border-white/10 rounded-[3rem] p-8 sm:p-12 backdrop-blur-md space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Asset Maker</label>
              <input 
                type="text" 
                placeholder="Toyota"
                className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all text-sm"
                value={form.make}
                onChange={e => setForm({ ...form, make: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Asset Model</label>
              <input 
                type="text" 
                placeholder="Camry"
                className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all text-sm"
                value={form.model}
                onChange={e => setForm({ ...form, model: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Current Telemetry (KM)</label>
            <input 
              type="number" 
              placeholder="000000"
              className="w-full bg-slate-900 border border-white/5 rounded-2xl p-8 text-4xl sm:text-5xl font-mono font-black text-blue-500 text-center outline-none focus:border-blue-400 transition-all tracking-tighter"
              value={form.mileage}
              onChange={e => setForm({ ...form, mileage: e.target.value })}
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-4xl hover:bg-blue-600 hover:text-white transition-all active:scale-95"
          >
            Generate Neural Roadmap →
          </button>
        </form>

        <div className="text-center pt-4">
          <button 
            onClick={() => setCurrentView('garage')}
            className="text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
          >
            Existing Pilot? Authenticate Hub
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingTerminal;
