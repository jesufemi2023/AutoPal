
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
    <div className="bg-slate-950 text-white card-radius p-10 shadow-3xl relative overflow-hidden flex flex-col min-h-[600px]">
      {/* High-tech background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
      
      {isAskingAI && (
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-8"></div>
          <h4 className="text-lg font-black tracking-tight mb-2">Analyzing Symptom Matrix</h4>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px]">Consulting Global Service Data Base...</p>
        </div>
      )}
      
      <div className="relative z-10 flex flex-col flex-grow">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <span className="text-xl animate-pulse">✧</span>
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight leading-none">Diagnostic AI</h3>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1">Direct Engine Interface</p>
          </div>
        </div>
        
        <div className="space-y-6 flex-grow">
          <div className="relative group">
            <textarea 
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              placeholder="Describe sounds, vibrations, or leaks..."
              className="w-full bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8 text-sm focus:ring-4 focus:ring-blue-600/10 outline-none h-48 transition-all text-slate-100 resize-none font-medium placeholder-slate-700"
            />
            <div className="absolute top-6 right-8 text-[9px] font-black text-slate-800 uppercase tracking-widest group-focus-within:text-blue-900 transition-colors">Terminal In</div>
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
              <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-slate-900 border border-slate-800 group/img shadow-2xl">
                <img src={diagImage} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="Symptom" />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                   <button onClick={() => setDiagImage(null)} className="bg-white text-slate-950 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Remove File</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => diagImageRef.current?.click()}
                className="w-full py-5 border-2 border-dashed border-slate-800 rounded-[1.5rem] text-slate-600 text-[10px] font-black uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all active:scale-[0.98]"
              >
                + Attach Evidence (Photo)
              </button>
            )}
          </div>

          <button 
            disabled={isAskingAI || !symptom}
            onClick={onAnalyze}
            className="w-full bg-blue-600 text-white py-6 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-blue-600/20 disabled:opacity-20 transition-all transform active:scale-95"
          >
            Run Neural Analysis
          </button>
        </div>

        {aiAdvice && (
          <div className={`mt-10 p-8 rounded-[2.5rem] animate-slide-up relative z-10 ${aiAdvice.severity === 'critical' ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
            <div className={`flex items-center gap-2 mb-4 text-[9px] font-black uppercase tracking-widest ${aiAdvice.severity === 'critical' ? 'text-rose-400' : 'text-blue-400'}`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-ping ${aiAdvice.severity === 'critical' ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
              Severity: {aiAdvice.severity}
            </div>
            <h5 className="text-lg font-bold text-white leading-tight mb-6">{aiAdvice.advice}</h5>
            <div className="space-y-4">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Protocol Recommendations</div>
              <ul className="space-y-3">
                {aiAdvice.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-4">
                    <span className="text-blue-500 font-bold">{i+1}.</span>
                    <span className="leading-relaxed">{rec}</span>
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
