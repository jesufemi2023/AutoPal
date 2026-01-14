
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { generateMaintenanceSchedule } from '../services/geminiService.ts';
import { MaintenanceScheduleResponse } from '../shared/types.ts';
import { formatDate } from '../shared/utils.ts';

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
           <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Sad to see you go</h2>
           <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] max-w-xs leading-relaxed">
             Neural data purged. Your asset is now unmonitored. Be safe on the roads.
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-slide-up pb-32">
      <div className="bg-rose-500 text-white px-6 py-4 rounded-2xl flex items-center justify-between shadow-xl shadow-rose-500/20">
        <div className="flex items-center gap-4">
          <span className="animate-pulse text-xl">⚠️</span>
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-black uppercase tracking-widest">Volatile Session Active</h4>
            <p className="text-[8px] font-bold uppercase tracking-widest opacity-80">This data will be purged if you exit. Stabilize now to save.</p>
          </div>
        </div>
        <button 
          onClick={() => setCurrentView('garage')}
          className="bg-white text-rose-500 text-[9px] font-black px-6 py-2 rounded-xl uppercase tracking-widest shadow-lg"
        >
          Stabilize Data
        </button>
      </div>

      <header className="px-2 space-y-4 text-center sm:text-left">
        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">
          {transientVehicle?.make} <span className="text-blue-600">{transientVehicle?.model}</span>
        </h1>
        <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">Neural Roadmap Preview</p>
      </header>

      {report ? (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Intelligence Summary</h3>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">{report.summary}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {report.tasks.slice(0, 4).map((task, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-3xl p-8 space-y-4">
                <div className="flex justify-between items-start">
                  <span className="bg-blue-50 text-blue-600 text-[8px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">{task.category}</span>
                  <span className="text-slate-300 font-mono text-xs">#{i+1}</span>
                </div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight">{task.title}</h4>
                <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                  <div>
                    <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Target</div>
                    <div className="text-sm font-black font-mono text-slate-900">{task.dueMileage.toLocaleString()} KM</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 p-12 rounded-[3rem] text-center space-y-8 border-4 border-blue-600/30">
            <h3 className="text-white text-2xl font-black uppercase tracking-tighter">Stabilize Asset Memory</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
              Register your Pilot ID to save this roadmap, track fuel logic, and access L1 diagnostics.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => setCurrentView('garage')} className="bg-white text-slate-900 px-12 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-blue-600 hover:text-white transition-all">
                Create Pilot ID
              </button>
              <button onClick={handleExit} className="px-10 py-5 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-rose-500 transition-colors">
                Purge & Exit
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-24 flex flex-col items-center justify-center space-y-6">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Synthesizing Lifecycle Data...</p>
        </div>
      )}
    </div>
  );
};

export default GuestReport;
