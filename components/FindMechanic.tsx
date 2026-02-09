
import React from 'react';
import { User, MapPin, Star, ShieldCheck } from 'lucide-react';

const FindMechanic: React.FC = () => {
  const mockMechanics = [
    { name: "Lagos Auto Masters", location: "Ikeja, Lagos", rating: 4.8, verified: true },
    { name: "Expert Gearbox PH", location: "Port Harcourt", rating: 4.5, verified: true },
    { name: "Capital Spanners", location: "Garki, Abuja", rating: 4.9, verified: true }
  ];

  return (
    <div className="relative animate-slide-up space-y-8 sm:space-y-12 lg:space-y-16 min-h-[60vh]">
      {/* Background content (Grayscale & Blurred) */}
      <div className="grayscale blur-sm pointer-events-none opacity-40 select-none space-y-12">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 px-2">
          <div>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tighter">Find Mechanic</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] sm:text-[10px] mt-2 sm:mt-4">Trusted Networks v1.0</p>
          </div>
          <div className="relative group w-full lg:w-96">
            <div className="w-full bg-white border border-slate-100 rounded-2xl py-5 px-6 text-slate-300 font-bold shadow-sm">Search by city...</div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {mockMechanics.map((mech, i) => (
            <div key={i} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 space-y-6">
              <div className="flex justify-between items-start">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400"><User /></div>
                {mech.verified && <ShieldCheck className="text-blue-500" size={20} />}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-1">{mech.name}</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><MapPin size={10} /> {mech.location}</p>
              </div>
              <div className="flex items-center gap-2 text-amber-500 font-black text-sm">
                <Star size={14} fill="currentColor" /> {mech.rating}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COMING SOON OVERLAY */}
      <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
        <div className="bg-slate-900 text-white rounded-[3rem] p-10 sm:p-16 shadow-4xl text-center space-y-8 border-4 border-blue-600/30 max-w-lg w-full animate-in zoom-in-95 duration-500">
           <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto shadow-2xl shadow-blue-600/40 animate-pulse">👨‍🔧</div>
           <div className="space-y-4">
              <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter leading-none">Find Mechanic <br/><span className="text-blue-500">Coming Soon</span></h3>
              <p className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-widest leading-relaxed">
                We are currently vetting specialized mechanics in your region to ensure quality service and fair pricing.
              </p>
           </div>
           <div className="pt-4">
             <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/5 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-500">
                Network Launch: Q3 2024
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default FindMechanic;
