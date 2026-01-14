
import React, { useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';

const LandingTerminal: React.FC = () => {
  const { setTransientVehicle, setCurrentView, setLoading, guestAttempts, incrementGuestAttempts } = useAutoPalStore();
  const [form, setForm] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: ''
  });

  const handleIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Guardrail: Guests can only generate a roadmap once.
    if (guestAttempts >= 1) {
      alert("Trial limit reached. Please create a Pilot ID to continue monitoring your vehicle's health.");
      setCurrentView('garage'); // This will trigger AuthScreen if no session
      return;
    }

    if (!form.make || !form.model || !form.mileage) {
      alert("Please fill in all vehicle details to continue.");
      return;
    }
    
    setLoading(true);
    try {
      setTransientVehicle({
        make: form.make,
        model: form.model,
        year: form.year,
        mileage: parseInt(form.mileage)
      });
      incrementGuestAttempts();
      setCurrentView('report');
    } catch (err) {
      alert("System connection lost. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-6 relative overflow-hidden">
      {/* Top Navigation */}
      <nav className="w-full max-w-6xl flex justify-between items-center py-6 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">A</div>
          <span className="font-black text-white tracking-tighter uppercase text-sm">AutoPal NG</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentView('garage')}
            className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={() => setCurrentView('garage')}
            className="bg-white text-slate-900 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
          >
            Create Account
          </button>
        </div>
      </nav>

      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:32px_32px]"></div>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 blur-[160px] rounded-full"></div>

      <div className="max-w-xl w-full space-y-12 relative z-10 animate-slide-up mt-12 sm:mt-24">
        <div className="text-center space-y-6">
          <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tighter leading-none uppercase">
            Car <span className="text-blue-500">Health</span> Checker
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
            Stop guessing your car's condition. Get a professional maintenance plan tailored to your vehicle instantly.
          </p>
        </div>

        <form onSubmit={handleIntake} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 sm:p-12 backdrop-blur-md space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Car Brand</label>
              <input 
                type="text" 
                placeholder="e.g. Toyota"
                className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all text-sm"
                value={form.make}
                onChange={e => setForm({ ...form, make: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Car Model</label>
              <input 
                type="text" 
                placeholder="e.g. Camry"
                className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all text-sm"
                value={form.model}
                onChange={e => setForm({ ...form, model: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2 sm:col-span-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Year</label>
              <input 
                type="number" 
                placeholder="2020"
                className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all text-sm"
                value={form.year}
                onChange={e => setForm({ ...form, year: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Current Mileage (KM)</label>
              <input 
                type="number" 
                placeholder="Current Odometer"
                className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all text-sm"
                value={form.mileage}
                onChange={e => setForm({ ...form, mileage: e.target.value })}
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-4xl hover:bg-blue-600 hover:text-white transition-all active:scale-95"
          >
            Check My Health Plan →
          </button>
          
          <p className="text-center text-[8px] text-slate-600 font-bold uppercase tracking-widest">
            One-time guest report included. No credit card required.
          </p>
        </form>
      </div>
    </div>
  );
};

export default LandingTerminal;
