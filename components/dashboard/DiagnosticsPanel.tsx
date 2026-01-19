
import React, { useRef } from 'react';
import { AIResponse, Vehicle } from '../../shared/types.ts';
import { useAutoPalStore } from '../../shared/store.ts';

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
  const { user } = useAutoPalStore();

  const handleAuditRun = () => {
    if (!user) return;
    onAnalyze();
  };

  const containerClasses = compact 
    ? "bg-slate-950 text-white rounded-2xl p-4 shadow-xl border border-white/10"
    : "bg-slate-950 text-white rounded-[2.5rem] p-8 sm:p-12 shadow-3xl min-h-[600px] border border-white/10 w-full";

  return (
    <div className={containerClasses}>
      <div className="relative z-10 flex flex-col flex-grow">
        {!compact && (
          <div className="flex items-center gap-5 mb-10">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-xl text-white">✧</div>
            <h3 className="text-xl font-black uppercase tracking-tighter">AI Mechanic</h3>
          </div>
        )}

        <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-10 flex-grow`}>
          <div className="space-y-6">
            <textarea 
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              placeholder="What sounds or leaks are you noticing?"
              className={`w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-[11px] outline-none ${compact ? 'h-24' : 'h-48'} text-slate-100 resize-none`}
            />
            <button 
              disabled={isAskingAI || !symptom}
              onClick={handleAuditRun}
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-2xl transition-all"
            >
              Start Diagnostic
            </button>
          </div>

          <div className="flex flex-col min-h-[300px]">
            {aiAdvice ? (
              <div className={`p-6 rounded-2xl border-2 ${aiAdvice.severity === 'critical' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-blue-600/10 border-blue-600/20'}`}>
                <h5 className="text-xl font-black text-white mb-6">{aiAdvice.advice}</h5>
                <ul className="space-y-3">
                  {aiAdvice.recommendations.map((rec, i) => (
                    <li key={i} className="text-[11px] text-slate-300 flex items-start gap-3">
                      <span className="text-blue-500 font-mono font-black">{i+1}</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl opacity-40">
                <div className="text-4xl mb-4">🩺</div>
                <p className="text-[9px] font-black uppercase text-slate-500">Awaiting input...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
