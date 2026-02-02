
import React, { useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { Car, Shield, Zap, Database, BarChart3 } from 'lucide-react';

/**
 * LandingTerminal Component
 * Implements the immersive landing experience for AutoPal NG.
 * Fixed: Completed the component implementation and added the missing default export.
 */
const LandingTerminal: React.FC = () => {
  const { setTransientVehicle, setCurrentView } = useAutoPalStore();
  
  const [form, setForm] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: 0
  });

  const handleGuestAccess = () => {
    if (!form.make || !form.model) {
      alert("Please enter make and model for the trial report.");
      return;
    }
    setTransientVehicle({
      make: form.make,
      model: form.model,
      year: form.year,
      mileage: form.mileage
    });
    setCurrentView('report');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 w-full overflow-x-hidden">
      {/* Navigation */}
      <nav className="h-20 border-b border-slate-100 flex items-center justify-between px-6 sm:px-12 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {/* LOGO UNIFORMITY: STANDARD SLATE COMMAND LOGO */}
          <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-950 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Car size={22} strokeWidth={2.5} />
          </div>
          <span className="font-black tracking-tighter text-xl uppercase text-slate-900">AutoPal NG</span>
        </div>
        <button 
          onClick={() => setCurrentView('garage')}
          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 py-16 lg:py-24 grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 rounded-full border border-blue-100">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Nigeria's #1 AI Garage</span>
            </div>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.85] uppercase">
              Protect Your <br/><span className="text-blue-600">Car's Value</span>
            </h1>
            <p className="text-slate-500 text-lg sm:text-xl font-medium max-w-lg leading-relaxed pt-4">
              Advanced vehicle maintenance intelligence. Automate your service schedule, track every Naira, and maximize resale profit with AI.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              onClick={() => setCurrentView('garage')}
              className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-3xl hover:bg-blue-600 transition-all active:scale-95"
            >
              Start Free Garage
            </button>
            <a href="#trial" className="px-10 py-5 bg-white border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:border-blue-600 hover:text-blue-600 transition-all text-center">
              Try Maintenance AI
            </a>
          </div>

          <div className="grid grid-cols-3 gap-8 pt-12 border-t border-slate-100">
            <div className="space-y-1">
              <div className="text-3xl font-black text-slate-900">1.2k+</div>
              <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Active Pilots</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-slate-900">₦150k</div>
              <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Avg. Yearly Savings</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-slate-900">99.2%</div>
              <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">AI Accuracy</div>
            </div>
          </div>
        </div>

        {/* Feature Preview Card */}
        <div className="relative group hidden lg:block">
          <div className="absolute -inset-4 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-[3rem] opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"></div>
          <div className="bg-slate-950 rounded-[3rem] p-10 text-white space-y-10 shadow-4xl relative border border-white/10">
             <div className="flex justify-between items-start">
               <div className="space-y-1">
                 <h4 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">Telemetry Scan</h4>
                 <div className="text-3xl font-black tracking-tighter">Toyota Camry 2018</div>
               </div>
               <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-blue-600/40">✧</div>
             </div>
             
             <div className="grid grid-cols-2 gap-6">
               <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                 <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Health Score</div>
                 <div className="text-3xl font-black text-emerald-400">92%</div>
               </div>
               <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                 <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Market Grade</div>
                 <div className="text-3xl font-black text-blue-500">A+</div>
               </div>
             </div>

             <div className="space-y-4">
               <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                 <span>Maintenance Protocol</span>
                 <span className="text-blue-500">Running...</span>
               </div>
               <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full w-3/4 bg-blue-600 rounded-full animate-pulse"></div>
               </div>
             </div>
          </div>
        </div>
      </main>

      {/* Trial Section */}
      <section id="trial" className="bg-slate-50 py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-12 sm:space-y-16">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase text-slate-900">Instant <span className="text-blue-600">Guest Pass</span></h2>
            <p className="text-slate-500 text-base sm:text-lg font-medium uppercase tracking-widest">Get a one-time maintenance report without signing up.</p>
          </div>

          <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-2xl border border-slate-100 grid sm:grid-cols-2 gap-6 sm:gap-8 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Vehicle Make</label>
              <input 
                type="text" 
                placeholder="e.g. Honda" 
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition font-black text-slate-900"
                value={form.make}
                onChange={e => setForm({...form, make: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Vehicle Model</label>
              <input 
                type="text" 
                placeholder="e.g. Accord" 
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition font-black text-slate-900"
                value={form.model}
                onChange={e => setForm({...form, model: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Model Year</label>
              <input 
                type="number" 
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition font-black text-slate-900"
                value={form.year}
                onChange={e => setForm({...form, year: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Current KM</label>
              <input 
                type="number" 
                placeholder="0"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition font-black text-slate-900"
                value={form.mileage || ''}
                onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})}
              />
            </div>
            <button 
              onClick={handleGuestAccess}
              className="sm:col-span-2 mt-6 bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-blue-500/30 hover:bg-slate-900 transition-all active:scale-95"
            >
              Generate Trial Report →
            </button>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="py-24 sm:py-32 max-w-7xl mx-auto px-6 sm:px-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-16">
        <div className="space-y-6">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
            <Shield size={28} />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Audit Trail</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">Verified digital history that proves your car's condition to future buyers, commanding higher resale prices.</p>
        </div>
        <div className="space-y-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
            <Zap size={28} />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Predictive AI</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">Our velocity engine predicts exactly when components will reach their limit, preventing expensive emergency repairs.</p>
        </div>
        <div className="space-y-6">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
            <Database size={28} />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Fuel Logic</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">Advanced metabolic tracking detects hidden engine efficiency issues through deep fuel consumption variance analysis.</p>
        </div>
        <div className="space-y-6">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
            <BarChart3 size={28} />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Market Value</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">Real-time valuation based on Nigerian market benchmarks, condition audit, and maintenance documentation trust levels.</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-900 py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-10">
          <h2 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase text-white leading-none">
            Ready to Take <br/><span className="text-blue-500">Command?</span>
          </h2>
          <p className="text-slate-400 text-lg font-medium uppercase tracking-widest max-w-lg mx-auto">Join thousands of smart vehicle owners today.</p>
          <button 
            onClick={() => setCurrentView('garage')}
            className="bg-white text-slate-900 px-12 py-6 rounded-[2rem] font-black uppercase tracking-widest text-[12px] shadow-3xl hover:bg-blue-600 hover:text-white transition-all active:scale-95"
          >
            Create My Garage ID
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-slate-100 text-center space-y-6 bg-white">
        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-md">
            <Car size={16} strokeWidth={2.5} />
          </div>
          <span className="font-black tracking-tighter text-base uppercase text-slate-900">AutoPal NG</span>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Engineered for Automotive Longevity // v4.0.2</p>
      </footer>
    </div>
  );
};

export default LandingTerminal;
