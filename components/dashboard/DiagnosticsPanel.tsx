
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
    <div className="bg-[#0f172a] text-white rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/10 blur-[80px] rounded-full"></div>
      {isAskingAI && <div className="absolute inset-0 bg-blue-600/10 z-20"><div className="scan-line"></div></div>}
      
      <h3 className="text-xl font-black mb-8 flex items-center gap-4 relative z-10">
        <span className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-xs shadow-lg shadow-blue-500/20 animate-pulse">✧</span> 
        AI Diagnostics
      </h3>
      
      <div className="space-y-4 mb-8 relative z-10">
        <textarea 
          value={symptom}
          onChange={(e) => setSymptom(e.target.value)}
          placeholder="Describe abnormal sounds or behaviors..."
          className="w-full bg-slate-900 border border-slate-800 rounded-[2rem] p-8 text-sm focus:ring-2 focus:ring-blue-600 outline-none h-48 transition-all text-slate-200 resize-none font-medium placeholder-slate-700"
        />
        
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
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-800 border border-slate-700">
              <img src={diagImage} className="w-full h-full object-cover" alt="Symptom" />
              <button onClick={() => setDiagImage(null)} className="absolute top-4 right-4 bg-black/60 backdrop-blur-md w-8 h-8 rounded-full flex items-center justify-center font-bold">×</button>
            </div>
          ) : (
            <button 
              onClick={() => diagImageRef.current?.click()}
              className="w-full py-5 border-2 border-dashed border-slate-800 rounded-[2rem] text-slate-600 text-[10px] font-black uppercase tracking-widest hover:border-blue-600 hover:text-blue-500 transition-all active:scale-[0.98]"
            >
              + Attachment (Optional)
            </button>
          )}
        </div>
      </div>

      <button 
        disabled={isAskingAI || !symptom}
        onClick={onAnalyze}
        className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-blue-500/20 disabled:opacity-30 active:scale-95 transition-all relative z-10"
      >
        {isAskingAI ? 'Consulting Neural Grid...' : 'Submit Diagnostic Query'}
      </button>

      {aiAdvice && (
        <div className={`mt-10 p-8 rounded-[2.5rem] animate-slide-in relative z-10 ${aiAdvice.severity === 'critical' ? 'bg-rose-500/10 border border-rose-500/30' : 'bg-white/5 border border-white/10'}`}>
          <div className={`text-[10px] font-black uppercase mb-3 tracking-[0.2em] ${aiAdvice.severity === 'critical' ? 'text-rose-400' : 'text-blue-400'}`}>
            System Status: {aiAdvice.severity}
          </div>
          <p className="text-base font-bold text-slate-200 leading-snug mb-6">{aiAdvice.advice}</p>
          <ul className="space-y-3">
            {aiAdvice.recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-slate-400 flex items-start gap-3">
                <span className="text-blue-500 mt-0.5">•</span> {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
