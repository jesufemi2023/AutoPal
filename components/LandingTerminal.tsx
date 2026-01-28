import React, { useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { Car, Shield, ChevronRight } from 'lucide-react';

const LandingTerminal: React.FC = () => {
  const { setTransientVehicle, setCurrentView, setLoading, guestAttempts, incrementGuestAttempts, session, user, reset } = useAutoPalStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
      setCurrentView('garage'); // This will trigger AuthScreen
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

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    if (!supabase) {
      await reset();
      window.location.reload();
      return;
    }
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
      await reset();
      setCurrentView('landing');
    } catch (e) {
      console.error("Signout Error:", e);
      await reset();
      window.location.reload();
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-6 relative overflow-hidden pt-24 sm:pt-32">
      {/* Fixed Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-slate-950/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto flex justify-between items-center py-5 px-6 sm:px-10">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setCurrentView('landing')}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
              <Car size={18} strokeWidth={2.5} />
            </div>
            <span className="font-black text-white tracking-tighter uppercase text-sm">AutoPal NG</span>
          </div>

          {/* Desktop Navbar */}
          <div className="hidden md:flex items-center gap-6">
            {session ? (
              <>
                <button 
                  onClick={() => setCurrentView('garage')}
                  className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                >
                  Dashboard
                </button>
                <button 
                  onClick={handleSignOut}
                  className="bg-rose-600 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setCurrentView('garage')}
                  className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                >
                  Signin
                </button>
                <button 
                  onClick={() => setCurrentView('garage')}
                  className="bg-white text-slate-900 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-xl"
                >
                  Signup
                </button>
              </>
            )}
          </div>

          {/* Mobile Hamburger Icon */}
          <button 
            className="md:hidden text-white p-2 focus:outline-none" 
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            <div className="w-6 h-5 relative flex flex-col justify-between">
              <span className={`w-full h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`w-full h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`w-full h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </div>
          </button>
        </div>

        {/* Mobile/Tablet Dropdown Menu */}
        <div className={`md:hidden absolute top-full left-0 w-full bg-slate-900/95 backdrop-blur-3xl border-b border-white/5 transition-all duration-300 ease-in-out origin-top ${isMenuOpen ? 'scale-y-100 opacity-100 visible' : 'scale-y-0 opacity-0 invisible'}`}>
          <div className="flex flex-col p-6 gap-4">
            {session ? (
              <>
                <button 
                  onClick={() => { setCurrentView('garage'); setIsMenuOpen(false); }}
                  className="text-white text-[11px] font-black uppercase tracking-[0.2em] py-4 border-b border-white/5 text-left"
                >
                  Dashboard
                </button>
                <button 
                  onClick={handleSignOut}
                  className="text-rose-500 text-[11px] font-black uppercase tracking-[0.2em] py-4 text-left"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => { setCurrentView('garage'); setIsMenuOpen(false); }}
                  className="text-white text-[11px] font-black uppercase tracking-[0.2em] py-4 border-b border-white/5 text-left"
                >
                  Signin
                </button>
                <button 
                  onClick={() => { setCurrentView('garage'); setIsMenuOpen(false); }}
                  className="text-blue-500 text-[11px] font-black uppercase tracking-[0.2em] py-4 text-left"
                >
                  Signup
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:32px_32px]"></div>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 blur-[160px] rounded-full"></div>

      <div className="max-w-xl w-full space-y-12 relative z-10 animate-slide-up">
        {/* MODIFIED: Awareness Block for Admins */}
        {user?.role === 'admin' ? (
          <div className="text-center space-y-8 animate-in zoom-in duration-500">
             <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-blue-500/20 border-4 border-white/10">
                <Shield size={32} />
             </div>
             <div className="space-y-4">
                <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tighter leading-none uppercase">
                  Command <br/><span className="text-blue-500">Center</span>
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                  Administrator Signature Verified. Access global telemetry and fleet oversight.
                </p>
             </div>
             <button 
              onClick={() => setCurrentView('landing')} // In App.tsx this triggers AdminPanel if role === 'admin'
              className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-4xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-3"
             >
               Initialize Terminal Oversight <ChevronRight size={16} />
             </button>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tighter leading-none uppercase">
              Car <span className="text-blue-500">Health</span> Checker
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
              Stop guessing your car's condition. Get a professional maintenance plan tailored to your vehicle instantly.
            </p>
          </div>
        )}

        {/* Guest Intake Form (Only shown to non-admins) */}
        {user?.role !== 'admin' && (
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
        )}
      </div>
    </div>
  );
};

export default LandingTerminal;