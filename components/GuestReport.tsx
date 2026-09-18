import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { generateMaintenanceSchedule } from '../services/geminiService.ts';
import { MaintenanceScheduleResponse } from '../shared/types.ts';
import { 
  Car, Shield, CheckCircle2, Clock, AlertTriangle, ArrowRight, ArrowLeft, 
  Sparkles, Fuel, Wrench, Lock, Save, Share2 
} from 'lucide-react';

const GuestReport: React.FC = () => {
  const { transientVehicle, setTransientVehicle, setCurrentView } = useAutoPalStore();
  const [report, setReport] = useState<MaintenanceScheduleResponse | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (transientVehicle) {
      generateMaintenanceSchedule(
        transientVehicle.make,
        transientVehicle.model,
        transientVehicle.year,
        transientVehicle.mileage
      ).then(setReport).catch((err) => {
        console.error("Diagnostic report generation error:", err);
      });
    }
  }, [transientVehicle]);

  const handleExit = () => {
    setIsExiting(true);
    setTimeout(() => {
      setTransientVehicle(null);
      setCurrentView('landing');
      setIsExiting(false);
    }, 1500);
  };

  if (isExiting) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[9999] flex items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="space-y-6 max-w-sm">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white mx-auto text-2xl">
            👋
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Temporary Buffer Cleared</h2>
          <p className="text-slate-400 text-xs font-mono uppercase tracking-wider leading-relaxed">
            Your guest session has ended. You can initialize a permanent free garage anytime.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col animate-slide-up text-slate-900 font-sans">
      
      {/* INDUSTRIAL TOP COMMAND BANNER */}
      <header className="bg-slate-950 text-white px-6 sm:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 sticky top-0 z-50 shadow-md">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setCurrentView('landing')}
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
            <Car size={18} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-400">
                GUEST TELEMETRY AUDIT
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Temporary buffer • Save this plan to prevent data loss
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExit}
            className="text-slate-400 hover:text-white px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors"
          >
            Discard
          </button>
          <button 
            onClick={() => setCurrentView('garage')}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-6 py-2.5 rounded-xl uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 border border-blue-400/30"
          >
            <Save size={14} />
            <span>Save to Free Garage</span>
          </button>
        </div>
      </header>

      {/* REPORT CONTENT */}
      <main className="max-w-5xl mx-auto w-full p-6 sm:p-12 space-y-10 flex-grow pb-24">
        
        {/* Vehicle Header Card */}
        <section className="bg-slate-950 text-white rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-mono font-bold uppercase border border-blue-500/30">
                <Sparkles size={12} />
                <span>AI WEAR CALIBRATION COMPLETE</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
                {transientVehicle?.year} {transientVehicle?.make} <span className="text-blue-400">{transientVehicle?.model}</span>
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm font-mono uppercase tracking-wider">
                Audited at {transientVehicle?.mileage.toLocaleString()} KM // Regional Fuel & Heat Calibrated
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center min-w-[120px]">
                <div className="text-[8px] font-mono uppercase text-slate-400 font-bold mb-1">Checkpoints</div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {report?.tasks?.length || '...'}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center min-w-[120px]">
                <div className="text-[8px] font-mono uppercase text-slate-400 font-bold mb-1">Audit Status</div>
                <div className="text-xs font-black font-mono text-blue-400 uppercase">
                  Verified
                </div>
              </div>
            </div>
          </div>
        </section>

        {report ? (
          <div className="space-y-10">
            
            {/* Executive Summary Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                <Wrench size={16} className="text-blue-600" />
                <span>Mechanical Diagnostic Summary</span>
              </div>
              <p className="text-slate-700 text-base leading-relaxed font-medium">
                {report.summary}
              </p>
            </div>

            {/* Checkpoints Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
                  Critical Service Road Map
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {report.tasks.length} Checkpoints Calculated
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {report.tasks.map((task, idx) => (
                  <div 
                    key={idx}
                    className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-sm hover:border-blue-400 hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider ${
                        task.category === 'engine' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        task.category === 'fluids' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        task.category === 'brakes' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {task.category}
                      </span>
                      <div className={`text-[9px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        task.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {task.priority} Priority
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-base font-black text-slate-950 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                        {task.title}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        {task.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Interval Trigger:</span>
                      <span className="font-bold text-slate-900">{task.dueMileage.toLocaleString()} KM</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* High-Impact Signup Conversion Banner */}
            <section className="bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 border-2 border-blue-600/40 shadow-2xl relative overflow-hidden space-y-8">
              <div className="space-y-3 relative z-10 max-w-xl">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-400">
                  NEVER FORGET A CRITICAL SERVICE AGAIN
                </span>
                <h3 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white leading-tight">
                  Keep This Plan In Your <br />
                  <span className="text-blue-400">Permanent Free Garage</span>
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  Save your car's digital record before you close this window. You'll receive automated mileage-based notifications, AI diagnostic lookups, and a verified resale dossier.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 relative z-10 pt-2">
                <button 
                  onClick={() => setCurrentView('garage')}
                  className="px-8 py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-wider text-xs hover:bg-blue-500 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 border border-blue-400/30"
                >
                  <span>Save Plan & Create Free Account</span>
                  <ArrowRight size={16} />
                </button>
                <button 
                  onClick={handleExit}
                  className="px-6 py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-mono uppercase tracking-wider transition-colors text-center"
                >
                  Discard & Exit
                </button>
              </div>
            </section>

          </div>
        ) : (
          <div className="py-24 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
              Generating Precision Maintenance Dossier...
            </p>
          </div>
        )}

      </main>

    </div>
  );
};

export default GuestReport;
