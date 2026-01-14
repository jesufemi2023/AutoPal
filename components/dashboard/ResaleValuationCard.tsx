
import React, { useMemo } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../../shared/types.ts';
import { calculateResaleValue } from '../../services/valuationService.ts';
import { formatCurrency } from '../../shared/utils.ts';

export const ResaleValuationCard: React.FC<{
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  serviceLogs: ServiceLog[];
  fuelLogs: FuelLog[];
}> = ({ vehicle, tasks, serviceLogs, fuelLogs }) => {
  const valuation = useMemo(() => 
    calculateResaleValue(vehicle, tasks, serviceLogs, fuelLogs), 
    [vehicle, tasks, serviceLogs, fuelLogs]
  );
  
  const valuePreserved = Math.round((valuation.finalValue / valuation.baseValue) * 100);

  const gradeColors = {
    'A+': 'text-emerald-400',
    'A': 'text-emerald-500',
    'B': 'text-blue-400',
    'C': 'text-amber-500',
    'D': 'text-rose-500'
  };

  return (
    <section className="bg-slate-950 rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl group border border-white/10 transition-all duration-700 hover:shadow-blue-900/20 w-full h-full flex flex-col justify-center">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-600/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

      <div className="relative z-10 flex flex-col gap-10 lg:gap-12 w-full">
        <div className="w-full space-y-10 shrink-0">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_#3b82f6] animate-pulse"></div>
              <h3 className="text-[10px] lg:text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Current Value Estimate</h3>
            </div>
            <div className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-white transition-all duration-500 group-hover:scale-[1.01] origin-left leading-none flex flex-wrap items-baseline">
              <span className="text-2xl lg:text-3xl text-slate-500 mr-3 font-mono font-bold">₦</span>
              {valuation.finalValue.toLocaleString()}
            </div>
            <p className="text-blue-500/80 text-[10px] font-black uppercase tracking-[0.3em] font-mono font-bold">Estimated Market Value</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
            <div className="bg-white/5 border border-white/10 rounded-[1.75rem] p-8 backdrop-blur-md group-hover:bg-white/10 transition-all flex flex-col justify-center">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Vehicle Grade</div>
              <div className={`text-4xl lg:text-5xl font-black ${gradeColors[valuation.marketGrade]} transition-all duration-500 group-hover:scale-110 origin-left`}>{valuation.marketGrade}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[1.75rem] p-8 backdrop-blur-md group-hover:bg-white/10 transition-all flex flex-col justify-center">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Value Retained</div>
              <div className="text-4xl lg:text-5xl font-black text-white font-mono">{valuePreserved}%</div>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col space-y-8 border-t border-white/10 pt-10">
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Valuation Breakdown</h4>
              <span className="text-[9px] font-mono text-blue-500 font-bold tracking-widest">NGN IMPACT</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-10">
              <div className="flex justify-between items-center group/item gap-4">
                <div className="space-y-1">
                  <div className="text-base font-bold text-white group-hover/item:text-emerald-400 transition-colors">Service History</div>
                  <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Verified Records</div>
                </div>
                <div className="text-xl font-mono font-black text-emerald-500 shrink-0">+{valuation.trustPremium.toLocaleString()}</div>
              </div>

              <div className="flex justify-between items-center group/item gap-4">
                <div className="space-y-1">
                  <div className="text-base font-bold text-white group-hover/item:text-rose-400 transition-colors">Maintenance Impact</div>
                  <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Pending Tasks</div>
                </div>
                <div className="text-xl font-mono font-black text-rose-500 shrink-0">-{valuation.maintenanceDebt.toLocaleString()}</div>
              </div>

              {valuation.mechanicalRiskPenalty > 0 && (
                <div className="flex justify-between items-center group/item gap-4">
                  <div className="space-y-1">
                    <div className="text-base font-bold text-amber-500">Efficiency Variance</div>
                    <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Fuel Performance</div>
                  </div>
                  <div className="text-xl font-mono font-black text-rose-600 shrink-0">-{valuation.mechanicalRiskPenalty.toLocaleString()}</div>
                </div>
              )}

              <div className="flex justify-between items-center group/item gap-4">
                <div className="space-y-1">
                  <div className="text-base font-bold text-white whitespace-nowrap">Mileage Adjustment</div>
                  <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Usage Factor</div>
                </div>
                <div className="text-xl font-mono font-black text-slate-400 shrink-0">-{valuation.mileagePenalty.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-[1.75rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:bg-blue-600/20">
              <div className="space-y-2 text-center md:text-left shrink-0">
                <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Potential Value</div>
                <div className="text-3xl lg:text-4xl font-black text-white font-mono leading-none tracking-tighter">₦{valuation.potentialValue.toLocaleString()}</div>
              </div>
              <p className="text-[9px] font-black text-blue-300 uppercase leading-relaxed md:max-w-[200px] text-center md:text-right tracking-[0.15em] opacity-80">
                Maximum potential value if all pending maintenance is completed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
