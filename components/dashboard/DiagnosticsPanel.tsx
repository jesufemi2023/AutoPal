
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
    ? "bg-slate-950 text-white rounded-[1.5rem] p-5 shadow-2xl relative overflow-hidden flex flex-col border border-white/10"
    : "bg-slate-950 text-white rounded-[2rem] p-8 sm:p-10 shadow-3xl relative overflow-hidden flex flex-col min-h-[550px] border border-white/10 transition-all duration-500 hover:shadow-blue-900/10 w-full";

  return (
    <div className={containerClasses}>
      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      
      {isAskingAI && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <div className="w-12 h-12 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_15px_#3b82f6]"></div>
          <h4 className="text-sm font-black tracking-tight mb-2 uppercase">Neural Processing</h4>
          <p className="text-slate-400 text-[7px] font-black uppercase tracking-[0.3em]">Analyzing Lifecycle Metadata...</p>
        </div>
      )}
      
      <div className="relative z-10 flex flex-col flex-grow">
        {!compact && (
          <div className="flex items-center gap-5 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-[1rem] flex items-center justify-center shadow-xl shadow-blue-600/30">
              <span className="text-xl animate-pulse text-white">✧</span>
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter leading-none uppercase">Neural Diagnostic</h3>
              <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.3em] mt-1.5">Asset Logic Interface</p>
            </div>
          </div>
        )}
        
        <div className="space-y-5 flex-grow">
          <div className="relative group">
            <div className="absolute top-3 left-4 text-[7px] font-black text-slate-600 uppercase tracking-widest z-10">Symptom Input</div>
            <textarea 
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              placeholder="Describe sounds or leaks..."
              className={`w-full bg-slate-900/60 border border-slate-800 rounded-[1.25rem] p-4 pt-8 text-[11px] focus:ring-2 focus:ring-blue-600/20 outline-none ${compact ? 'h-24' : 'h-36'} transition-all text-slate-100 resize-none font-medium placeholder-slate-700 shadow-inner leading-relaxed`}
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
              <div className="relative aspect-video rounded-[1.25rem] overflow-hidden bg-slate-900 border border-slate-800 group/img shadow-xl transition-all">
                <img src={diagImage} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="Telemetry Evidence" />
                <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                   <button onClick={() => setDiagImage(null)} className="bg-white text-slate-950 px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest">Remove</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => diagImageRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-slate-800 rounded-[1.25rem] text-slate-600 text-[9px] font-black uppercase tracking-[0.2em] hover:border-blue-500 hover:text-blue-500 transition-all bg-slate-900/20"
              >
                + Evidence (Photo)
              </button>
            )}
          </div>

          <button 
            disabled={isAskingAI || !symptom}
            onClick={onAnalyze}
            className="w-full bg-blue-600 text-white py-4 rounded-[1.25rem] font-black uppercase tracking-[0.2em] text-[9px] shadow-xl disabled:opacity-20 transition-all hover:bg-blue-700"
          >
            Run Neural Synthesis
          </button>
        </div>

        {aiAdvice && (
          <div className={`mt-6 p-5 rounded-[1.5rem] animate-slide-up relative z-10 border-2 backdrop-blur-md ${aiAdvice.severity === 'critical' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-blue-600/10 border-blue-600/20'}`}>
            <div className={`flex items-center gap-2 mb-3 text-[8px] font-black uppercase tracking-[0.15em] ${aiAdvice.severity === 'critical' ? 'text-rose-400' : 'text-blue-400'}`}>
              <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] ${aiAdvice.severity === 'critical' ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'}`}></div>
              Severity: {aiAdvice.severity}
            </div>
            <h5 className="text-sm font-bold text-white leading-tight mb-5 font-mono">{aiAdvice.advice}</h5>
            <div className="space-y-3">
              <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10 pb-1.5">Technical Recommendations</div>
              <ul className="space-y-2.5">
                {aiAdvice.recommendations.map((rec, i) => (
                  <li key={i} className="text-[10px] text-slate-400 flex items-start gap-2 leading-tight">
                    <span className="text-blue-500 font-mono font-bold">{i+1}.</span>
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
