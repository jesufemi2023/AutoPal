
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
}

export const DiagnosticsPanel: React.FC<Props> = ({ 
  vehicle, symptom, setSymptom, diagImage, setDiagImage, isAskingAI, onAnalyze, aiAdvice 
}) => {
  const diagImageRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-slate-950 text-white rounded-[3rem] p-10 sm:p-12 shadow-3xl relative overflow-hidden flex flex-col min-h-[600px] sm:min-h-[700px] border border-white/10 transition-all duration-500 hover:shadow-blue-900/10">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600/5 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2 opacity-40"></div>
      
      {isAskingAI && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
          <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-10 shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
          <h4 className="text-xl font-black tracking-tight mb-3 uppercase">Consulting Neural Link</h4>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Analyzing lifecycle metadata...</p>
        </div>
      )}
      
      <div className="relative z-10 flex flex-col flex-grow">
        <div className="flex items-center gap-6 mb-12">
          <div className="w-14 h-14 bg-blue-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-blue-600/30 group transition-all duration-500 hover:rotate-12">
            <span className="text-2xl animate-pulse text-white">✧</span>
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tighter leading-none uppercase">Neural Diagnostic</h3>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Asset Logic Interface</p>
          </div>
        </div>
        
        <div className="space-y-8 flex-grow">
          <div className="relative group">
            <div className="absolute top-4 left-6 text-[9px] font-black text-slate-600 uppercase tracking-widest z-10">Symptom Input</div>
            <textarea 
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              placeholder="Describe sounds, vibrations, or leaks in technical detail..."
              className="w-full bg-slate-900/60 border border-slate-800 rounded-[2rem] p-10 pt-12 text-sm focus:ring-4 focus:ring-blue-600/20 outline-none h-48 sm:h-56 transition-all text-slate-100 resize-none font-medium placeholder-slate-700 shadow-inner leading-relaxed"
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
              <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-slate-900 border border-slate-800 group/img shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                <img src={diagImage} className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-110" alt="Telemetry Evidence" />
                <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                   <button onClick={() => setDiagImage(null)} className="bg-white text-slate-950 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transform scale-90 group-hover/img:scale-100 transition-all">Remove Node</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => diagImageRef.current?.click()}
                className="w-full py-6 border-2 border-dashed border-slate-800 rounded-[2rem] text-slate-600 text-[11px] font-black uppercase tracking-[0.3em] hover:border-blue-500 hover:text-blue-500 transition-all bg-slate-900/20"
              >
                + Evidence Capture (Photo)
              </button>
            )}
          </div>

          <button 
            disabled={isAskingAI || !symptom}
            onClick={onAnalyze}
            className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-blue-600/30 disabled:opacity-20 transition-all transform active:scale-95 hover:bg-blue-700"
          >
            Neural Synthesis
          </button>
        </div>

        {aiAdvice && (
          <div className={`mt-10 p-8 rounded-[2.5rem] animate-slide-up relative z-10 border-2 backdrop-blur-md ${aiAdvice.severity === 'critical' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-blue-600/10 border-blue-600/20'}`}>
            <div className={`flex items-center gap-3 mb-4 text-[10px] font-black uppercase tracking-[0.2em] ${aiAdvice.severity === 'critical' ? 'text-rose-400' : 'text-blue-400'}`}>
              <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] animate-ping ${aiAdvice.severity === 'critical' ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
              Vector Severity: {aiAdvice.severity}
            </div>
            <h5 className="text-xl font-bold text-white leading-tight mb-8 font-mono">{aiAdvice.advice}</h5>
            <div className="space-y-4">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10 pb-2">Technical Recommendations</div>
              <ul className="space-y-4">
                {aiAdvice.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-4 leading-relaxed group/rec">
                    <span className="text-blue-500 font-mono font-bold transition-all group-hover/rec:scale-125">{i+1}.</span>
                    <span className="transition-colors group-hover/rec:text-slate-200">{rec}</span>
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
