import React, { useRef, useState } from 'react';
import { AIResponse, Vehicle } from '../../shared/types.ts';
import { canUseAiDiagnosis } from '../../services/permissionService.ts';
import { useAutoPalStore } from '../../shared/store.ts';
import UpgradeModal from '../UpgradeModal.tsx';

interface Props {
  vehicle: Vehicle;
  symptom: string;
  setSymptom: (s: string) => void;
  diagImage: string | null;
  setDiagImage: (img: string | null) => void;
  isAskingAI: boolean;
  onAnalyze: () => void;
  aiAdvice: AIResponse | null;
  compact?: boolean;
}

export const DiagnosticsPanel: React.FC<Props> = ({ 
  vehicle, symptom, setSymptom, diagImage, setDiagImage, isAskingAI, onAnalyze, aiAdvice, compact = false 
}) => {
  const diagImageRef = useRef<HTMLInputElement>(null);
  const { user, updateUsageLedger } = useAutoPalStore();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleAuditRun = () => {
    if (!user) return;
    const permission = canUseAiDiagnosis(user);
    if (!permission.allowed) {
      alert(permission.reason);
      if (user.tier === 'free') setShowUpgrade(true);
      return;
    }

    // Call the original analyze function
    onAnalyze();
    
    // Update usage (The app.tsx handleAnalyze would also call this if we wanted, but we keep it here for direct control)
    updateUsageLedger({
      aiDiagnosisCount: (user.usageLedger.aiDiagnosisCount || 0) + 1,
      aiDiagnosisYearlyCount: (user.usageLedger.aiDiagnosisYearlyCount || 0) + 1
    });
  };

  const containerClasses = compact 
    ? "bg-slate-950 text-white rounded-2xl p-4 shadow-xl relative overflow-hidden flex flex-col border border-white/10"
    : "bg-slate-950 text-white rounded-[2.5rem] p-8 sm:p-12 shadow-3xl relative overflow-hidden flex flex-col min-h-[600px] border border-white/10 transition-all duration-700 hover:shadow-blue-900/10 w-full";

  return (
    <div className={containerClasses}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      
      {isAskingAI && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-300">
          <div className="w-12 h-12 border-[4px] border-blue-500 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_20px_#3b82f6]"></div>
          <h4 className="text-sm font-black tracking-tight mb-2 uppercase">Analyzing...</h4>
          <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.3em]">AI Assistant is Processing Your Input</p>
        </div>
      )}
      
      <div className="relative z-10 flex flex-col flex-grow">
        {!compact && (
          <div className="flex items-center gap-5 mb-10">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <span className="text-xl animate-pulse text-white">✧</span>
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter leading-none uppercase">AI Diagnostic</h3>
              <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.3em] mt-2">Active Link: {vehicle.make} {vehicle.model}</p>
            </div>
          </div>
        )}

        {user?.tier === 'free' && !compact && (
          <div className="mb-6 bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl text-center">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Upgrade to Standard to Unlock AI Troubleshooting</p>
            <button onClick={() => setShowUpgrade(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg">View Plans</button>
          </div>
        )}
        
        <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-10 flex-grow`}>
          <div className="space-y-6">
            <div className="relative">
              <div className="absolute top-3 left-4 text-[7px] font-black text-slate-500 uppercase tracking-widest z-10">Describe Issues</div>
              <textarea 
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                placeholder="What sounds or leaks are you noticing? Describe any changes in behavior..."
                className={`w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 pt-9 text-[11px] focus:ring-1 focus:ring-blue-600/30 outline-none ${compact ? 'h-24' : 'h-48'} transition-all text-slate-100 resize-none font-medium placeholder-slate-700 shadow-inner leading-relaxed`}
              />
            </div>
            
            <div className="relative">
              <input type="file" hidden ref={diagImageRef} accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setDiagImage(reader.result as string);
                  reader.readAsDataURL(file);
                }
              }} />
              {diagImage ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 group/img shadow-xl">
                  <img src={diagImage} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" alt="Uploaded Photo" />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                     <button onClick={() => setDiagImage(null)} className="bg-white text-slate-950 px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest">Remove Photo</button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => diagImageRef.current?.click()}
                  className="w-full py-5 border-2 border-dashed border-slate-800 rounded-2xl text-slate-600 text-[9px] font-black uppercase tracking-[0.2em] hover:border-blue-500 hover:text-blue-500 transition-all bg-slate-900/10"
                >
                  + Add Supporting Photo
                </button>
              )}
            </div>

            <button 
              disabled={isAskingAI || !symptom || user?.tier === 'free'}
              onClick={handleAuditRun}
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl disabled:opacity-20 transition-all hover:bg-blue-700 active:scale-95"
            >
              Analyze Symptoms
            </button>
          </div>

          <div className="flex flex-col min-h-[300px]">
            {aiAdvice ? (
              <div className={`p-6 rounded-2xl animate-slide-up relative z-10 border-2 backdrop-blur-md flex-grow ${aiAdvice.severity === 'critical' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-blue-600/10 border-blue-600/20'}`}>
                <div className={`flex items-center gap-2 mb-4 text-[8px] font-black uppercase tracking-wider ${aiAdvice.severity === 'critical' ? 'text-rose-400' : 'text-blue-400'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_10px_currentColor] ${aiAdvice.severity === 'critical' ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'}`}></div>
                  Severity: {aiAdvice.severity}
                </div>
                <h5 className="text-xl font-black text-white leading-tight mb-6 font-sans">{aiAdvice.advice}</h5>
                <div className="space-y-6">
                  <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">AI Expert Recommendations</div>
                  <ul className="space-y-3">
                    {aiAdvice.recommendations.map((rec, i) => (
                      <li key={i} className="text-[11px] text-slate-300 flex items-start gap-3 leading-relaxed">
                        <span className="text-blue-500 font-mono font-black shrink-0">{i+1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>

                  {aiAdvice.partsIdentified && aiAdvice.partsIdentified.length > 0 && (
                    <div className="pt-4">
                      <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-3">Parts Identified</div>
                      <div className="flex flex-wrap gap-2">
                        {aiAdvice.partsIdentified.map((part, i) => (
                          <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-blue-400 uppercase tracking-tight">{part}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl text-center p-10 opacity-40">
                <div className="text-4xl mb-4">🩺</div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 max-w-[200px]">Awaiting symptom description for AI analysis</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
};