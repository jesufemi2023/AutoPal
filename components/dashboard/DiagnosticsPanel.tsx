
import React, { useRef } from 'react';
import { AIResponse, Vehicle } from '../../shared/types.ts';

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

  const containerClasses = compact 
    ? "bg-slate-950 text-white rounded-2xl p-4 shadow-xl relative overflow-hidden flex flex-col border border-white/10"
    : "bg-slate-950 text-white rounded-[2rem] p-6 sm:p-8 shadow-3xl relative overflow-hidden flex flex-col min-h-[500px] border border-white/10 transition-all duration-500 hover:shadow-blue-900/10 w-full";

  return (
    <div className={containerClasses}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      
      {isAskingAI && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-300">
          <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_12px_#3b82f6]"></div>
          <h4 className="text-xs font-black tracking-tight mb-1 uppercase">Neural Sync</h4>
          <p className="text-slate-400 text-[6px] font-black uppercase tracking-[0.3em]">Analyzing Lifecycle Metadata...</p>
        </div>
      )}
      
      <div className="relative z-10 flex flex-col flex-grow">
        {!compact && (
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
              <span className="text-lg animate-pulse text-white">✧</span>
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tighter leading-none uppercase">Neural Diagnostic</h3>
              <p className="text-slate-500 text-[7px] font-black uppercase tracking-[0.3em] mt-1">Asset Logic Interface</p>
            </div>
          </div>
        )}
        
        <div className="space-y-3.5 flex-grow">
          <div className="relative">
            <div className="absolute top-2.5 left-3 text-[6px] font-black text-slate-500 uppercase tracking-widest z-10">Symptom Log</div>
            <textarea 
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              placeholder="Describe sounds, leaks or anomalies..."
              className={`w-full bg-slate-900/70 border border-slate-800 rounded-xl p-3 pt-7 text-[10px] focus:ring-1 focus:ring-blue-600/30 outline-none ${compact ? 'h-24' : 'h-32'} transition-all text-slate-100 resize-none font-medium placeholder-slate-700 shadow-inner leading-normal`}
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
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 group/img shadow-lg">
                <img src={diagImage} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" alt="Telemetry Evidence" />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                   <button onClick={() => setDiagImage(null)} className="bg-white text-slate-950 px-3 py-1 rounded text-[7px] font-black uppercase tracking-widest">Remove</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => diagImageRef.current?.click()}
                className="w-full py-3 border border-dashed border-slate-800 rounded-xl text-slate-600 text-[8px] font-black uppercase tracking-wider hover:border-blue-500 hover:text-blue-500 transition-all bg-slate-900/10"
              >
                + Visual Evidence (Photo)
              </button>
            )}
          </div>

          <button 
            disabled={isAskingAI || !symptom}
            onClick={onAnalyze}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[8px] shadow-lg disabled:opacity-20 transition-all hover:bg-blue-700 active:scale-95"
          >
            Run Neural Synthesis
          </button>
        </div>

        {aiAdvice && (
          <div className={`mt-5 p-4 rounded-xl animate-slide-up relative z-10 border backdrop-blur-md ${aiAdvice.severity === 'critical' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-blue-600/10 border-blue-600/20'}`}>
            <div className={`flex items-center gap-1.5 mb-2.5 text-[7px] font-black uppercase tracking-wider ${aiAdvice.severity === 'critical' ? 'text-rose-400' : 'text-blue-400'}`}>
              <div className={`w-1 h-1 rounded-full shadow-[0_0_6px_currentColor] ${aiAdvice.severity === 'critical' ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'}`}></div>
              Severity: {aiAdvice.severity}
            </div>
            <h5 className="text-[11px] font-bold text-white leading-tight mb-4 font-sans">{aiAdvice.advice}</h5>
            <div className="space-y-2.5">
              <div className="text-[6px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1">Recommended Actions</div>
              <ul className="space-y-2">
                {aiAdvice.recommendations.map((rec, i) => (
                  <li key={i} className="text-[9px] text-slate-400 flex items-start gap-1.5 leading-tight">
                    <span className="text-blue-500 font-mono font-bold shrink-0">{i+1}.</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
