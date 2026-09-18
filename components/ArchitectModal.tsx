import React from 'react';
import { 
  ShieldCheck, ExternalLink, Mail, Linkedin, Code2, Layers, Cpu, 
  Database, Zap, CheckCircle2, Award, X, Terminal, GitBranch, Sparkles
} from 'lucide-react';

interface ArchitectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectModal: React.FC<ArchitectModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/80 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh] machined-border-dark relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/60 p-6 sm:p-8 border-b border-slate-800 flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-600/30 border border-blue-400/40">
              JS
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-mono font-bold uppercase border border-blue-500/30 mb-1">
                <Sparkles size={10} />
                <span>Lead Architect & Full-Stack Engineer</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
                Jesufemi Temitope Solomon
              </h2>
              <p className="text-slate-400 text-xs font-mono">
                Author & Creator of AutoPal NG Telemetry Platform
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 space-y-8 overflow-y-auto font-sans">
          
          {/* Quick Contact & Verified Identity Badges */}
          <div className="flex flex-wrap gap-3">
            <a 
              href="https://www.linkedin.com/in/temitope-solomon-jesufemi-2620ab275/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
            >
              <Linkedin size={15} />
              <span>Connect on LinkedIn</span>
              <ExternalLink size={12} className="opacity-70" />
            </a>

            <a 
              href="mailto:ogungbetemitope@gmail.com"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all"
            >
              <Mail size={15} />
              <span>ogungbetemitope@gmail.com</span>
            </a>

            <div className="px-3.5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-mono font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Available for Senior / Full-Stack Roles</span>
            </div>
          </div>

          {/* Project Engineering Summary */}
          <div className="space-y-3 bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-mono font-bold uppercase tracking-wider">
              <Terminal size={15} />
              <span>Engineering Objective & Architectural Narrative</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed font-medium">
              I designed and engineered <strong>AutoPal NG</strong> from scratch as a production-grade vehicle telemetry and asset protection platform specifically calibrated for the environmental realities of emerging African markets (tropical heat indexes, stop-and-go traffic patterns, and variable fuel quality).
            </p>
          </div>

          {/* Key Engineering Accomplishments */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
              Core Technical Solutions Implemented
            </h3>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold font-mono">
                  <Cpu size={15} />
                  <span>Resilient Gemini AI Fallback</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Engineered zero-downtime model orchestration across Gemini 3.8 and Flash preview models with an emergency onboard automotive heuristic triage system.
                </p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono">
                  <Zap size={15} />
                  <span>Metabolic Fuel Telemetry</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Implemented live KM/L fuel consumption algorithms with Nigerian pump price multipliers to detect sensor degradation before mechanical failure.
                </p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold font-mono">
                  <Database size={15} />
                  <span>State & Auth Orchestration</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Dual-layer persistence combining guest transient sessions with authenticated Supabase PostgreSQL schemas, Row Level Security, and Paystack subscriptions.
                </p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold font-mono">
                  <Layers size={15} />
                  <span>Industrial CAD UI/UX</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Crafted custom CAD-grid visuals, optical JetBrains Mono telemetry typography, and high-conversion dynamic calculators to maximize user signups.
                </p>
              </div>
            </div>
          </div>

          {/* Full Tech Stack Tags */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Production Tech Stack:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                'React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'Google GenAI SDK', 
                'Gemini 3.8 Flash', 'Zustand', 'Supabase', 'PostgreSQL (RLS)', 
                'Paystack Payments', 'Lucide React', 'JetBrains Mono'
              ].map((tech, i) => (
                <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-slate-300">
                  {tech}
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>100% Original Architecture & Codebase</span>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="https://www.linkedin.com/in/temitope-solomon-jesufemi-2620ab275/"
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-bold font-mono flex items-center gap-1.5 transition-colors"
            >
              <span>View LinkedIn Profile</span>
              <ExternalLink size={12} />
            </a>
            <button 
              onClick={onClose}
              className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
            >
              Close Dossier
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
