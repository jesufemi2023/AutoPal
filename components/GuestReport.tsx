import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { generateMaintenanceSchedule } from '../services/geminiService.ts';
import { MaintenanceScheduleResponse } from '../shared/types.ts';
import { Car } from 'lucide-react';

const GuestReport: React.FC = () => {
  const { transientVehicle, setTransientVehicle, setCurrentView } = useAutoPalStore();
  const [report, setReport] = useState<MaintenanceScheduleResponse | null>(null);
  const [isSad, setIsSad] = useState(false);

  useEffect(() => {
    if (transientVehicle) {
      generateMaintenanceSchedule(
        transientVehicle.make,
        transientVehicle.model,
        transientVehicle.year,
        transientVehicle.mileage
      ).then(setReport);
    }
  }, [transientVehicle]);

  const handleExit = () => {
    setIsSad(true);
    setTimeout(() => {
      setTransientVehicle(null);
      setCurrentView('landing');
      setIsSad(false);
    }, 2500);
  };

  if (isSad) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[9999] flex items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="space-y-8">
           <div className="text-6xl">👋</div>
           <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Safe Travels</h2>
           <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] max-w-xs leading-relaxed">
             Your unsaved plan has been removed. Come back anytime to start a new journey.
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col animate-slide-up">
      {/* Warning Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 relative z-50">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setCurrentView('landing')}
        >
          {/* LOGO UNIFORMITY: STANDARD SLATE COMMAND LOGO */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center shadow-lg shadow-slate-900/30 group-hover:scale-110 transition-transform">
            <Car size={16} strokeWidth={2.5} />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">One-Time Guest Pass</h4>
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">This report will vanish if you close this window.</p>
          </div>
        </div>
        <button 
          onClick={() => setCurrentView('garage')}
          className="bg-white text-slate-900 text-[9px] font-black px-8 py-2.5 rounded-lg uppercase tracking-widest shadow-xl hover:bg-blue-600 hover:text-white transition-all"
        >
          Save My Plan Forever
        </button>
      </div>

      <div className="max-w-4xl mx-auto w-full p-6 sm:p-12 space-y-12 flex-grow pb-32">
        <header className="space-y-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4">
            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">
              {transientVehicle?.year} {transientVehicle?.make} <span className="text-blue-600">{transientVehicle?.model}</span>
            </h1>
            <span className="bg-slate-100 text-slate-400 text-[9px] font-black px-3 py-1 rounded-md uppercase tracking-widest inline-block w-fit mx-auto sm:mx-0">
              {transientVehicle?.mileage.toLocaleString()} KM
            </span>
          </div>
          <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">Your Personalized Maintenance Plan</p>
        </header>

        {report ? (
          <div className="space-y-12">
            {/* Overview Section */}
            <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl pointer-events-none select-none group-hover:scale-110 transition-transform duration-700">📋</div>
              <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tight relative z-10">What Your Car Needs</h3>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-medium relative z-10">{report.summary}</p>
            </div>

            {/* Checklist Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Upcoming Maintenance</h3>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{report.tasks.length} Points Detected</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {report.tasks.slice(0, 4).map((task, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-8 space-y-5 hover:shadow-xl hover:border-blue-100 transition-all group animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="flex justify-between items-start">
                      <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-sm ${
                        task.category === 'fluids' ? 'bg-blue-50 text-blue-600' :
                        task.category === 'engine' ? 'bg-amber-50 text-amber-600' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                        {task.category}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-300 group-hover:text-blue-500 transition-colors">
                        {i + 1}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">{task.title}</h4>
                      <p className="text-[11px] text-slate-400 font-bold leading-relaxed">{task.description}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex justify-between items-end">
                      <div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Check at</div>
                        <div className="text-base font-black font-mono text-slate-900">{task.dueMileage.toLocaleString()} <span className="text-[10px] opacity-40">KM</span></div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Priority</div>
                        <div className={`text-[9px] font-black uppercase tracking-widest ${
                          task.priority === 'high' ? 'text-rose-500' : 'text-slate-400'
                        }`}>{task.priority}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Why Join? CTA Section */}
            <div className="bg-slate-900 p-10 sm:p-16 rounded-[3rem] text-center space-y-10 border-4 border-blue-600/30 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]"></div>
              </div>

              <div className="space-y-4 relative z-10">
                <h3 className="text-white text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-none">
                  Don't Let This <br/><span className="text-blue-500">Value Leak Away</span>
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                  Join 1,200+ vehicle owners saving ₦150k/year by automating their maintenance schedules.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                   <div className="text-xl mb-2">📈</div>
                   <div className="text-[9px] font-black text-white uppercase tracking-widest">Track Resale Value</div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                   <div className="text-xl mb-2">⛽</div>
                   <div className="text-[9px] font-black text-white uppercase tracking-widest">Fuel Monitoring</div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                   <div className="text-xl mb-2">✧</div>
                   <div className="text-[9px] font-black text-white uppercase tracking-widest">AI Diagnostics</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10 pt-4">
                <button onClick={() => setCurrentView('garage')} className="bg-white text-slate-900 px-12 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-blue-600 hover:text-white transition-all active:scale-95">
                  Create My Free ID
                </button>
                <button onClick={handleExit} className="px-10 py-5 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-rose-500 transition-colors">
                  Exit & Purge Data
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center space-y-6">
            <div className="w-14 h-14 border-[5px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Expert System Analysis...</p>
              <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Building your custom lifecycle plan</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestReport;