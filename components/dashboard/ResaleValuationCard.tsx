
import React, { useState } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog, UnifiedAIDossier } from '../../shared/types.ts';
import { runNeuralAudit } from '../../services/geminiService.ts';
import { useAutoPalStore } from '../../shared/store.ts';
import { formatCurrency } from '../../shared/utils.ts';

export const ResaleValuationCard: React.FC<{
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  serviceLogs: ServiceLog[];
  fuelLogs: FuelLog[];
}> = ({ vehicle, tasks, serviceLogs, fuelLogs }) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [dossier, setDossier] = useState<UnifiedAIDossier | null>(null);

  const handleAudit = async () => {
    setIsAuditing(true);
    try {
      const result = await runNeuralAudit(vehicle, tasks, serviceLogs, fuelLogs);
      setDossier(result);
    } catch (e) {
      alert("Neural Link Interrupted.");
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <section className="bg-slate-950 rounded-[2.5rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl border border-white/10 w-full">
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      
      {isAuditing && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h4 className="text-sm font-black uppercase tracking-widest text-blue-400">Performing Neural Audit...</h4>
        </div>
      )}

      <div className="relative z-10 space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Asset Equity</h3>
            <div className="text-5xl sm:text-7xl font-black tracking-tighter text-white">
              <span className="text-xl text-slate-500 mr-2 font-bold">₦</span>
              {dossier ? dossier.valuation.marketValueNGN.toLocaleString() : "??,???,???"}
            </div>
            <div className="flex items-center gap-3">
              <div className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[8px] font-black uppercase rounded">
                {dossier ? `Grade ${dossier.valuation.marketGrade}` : "Awaiting Audit"}
              </div>
            </div>
          </div>
        </div>

        {dossier ? (
          <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Operating (Fuel)</div>
              <div className="text-sm font-bold text-slate-300">{formatCurrency(dossier.finance.totalOpEx)}</div>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Maintenance Invested</div>
              <div className="text-sm font-bold text-emerald-400">{formatCurrency(dossier.finance.totalCapEx)}</div>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleAudit}
            className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20"
          >
            ✧ Trigger Neural Audit
          </button>
        )}
      </div>
    </section>
  );
};
