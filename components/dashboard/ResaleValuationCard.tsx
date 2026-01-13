
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
    <section className="bg-slate-950 rounded-[3rem] p-8 sm:p-14 xl:p-20 text-white relative overflow-hidden shadow-3xl group border border-white/10 transition-all duration-700 hover:shadow-blue-900/30 w-full">
      {/* Background Micro-Design */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      <div className="relative z-10 flex flex-col lg:flex-row gap-16 lg:gap-20 xl:gap-28 items-center w-full">
        {/* Market Liquidity Side */}
        <div className="w-full lg:w-5/12 space-y-14 xl:space-y-20 shrink-0">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse"></div>
              <h3 className="text-[11px] lg:text-[13px] font-black text-slate-500 uppercase tracking-[0.6em]">Real-Time Market Liquidity</h3>
            </div>
            <div className="text-6xl sm:text-8xl xl:text-9xl font-black tracking-tighter text-white transition-all duration-500 group-hover:scale-[1.02] origin-left leading-none flex flex-wrap items-baseline">
              <span className="text-3xl lg:text-4xl text-slate-500 mr-4 font-mono font-bold">₦</span>
              {valuation.finalValue.toLocaleString()}
            </div>
            <p className="text-blue-500/80 text-[11px] lg:text-[12px] font-black uppercase tracking-[0.4em] font-mono font-bold">Telemetry-Optimized Valuation v5.1</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 w-full">
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-md group-hover:bg-white/10 transition-all flex flex-col justify-center">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Market Grade</div>
              <div className={`text-5xl lg:text-6xl font-black ${gradeColors[valuation.marketGrade]} transition-all duration-500 group-hover:scale-110 origin-left`}>{valuation.marketGrade}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-md group-hover:bg-white/10 transition-all flex flex-col justify-center">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Equity Preservation</div>
              <div className="text-5xl lg:text-6xl font-black text-white font-mono">{valuePreserved}%</div>
            </div>
          </div>
        </div>

        {/* Adjustments Ledger */}
        <div className="w-full lg:w-7/12 flex flex-col space-y-12 lg:border-l lg:border-white/10 lg:pl-16 xl:pl-24">
          <div className="space-y-10">
            <div className="flex justify-between items-center border-b border-white/5 pb-6">
              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Financial Adjustments Ledger</h4>
              <span className="text-[10px] font-mono text-blue-500 font-bold tracking-widest">NGN CURRENCY UNIT</span>
            </div>
            
            <div className="space-y-10">
              {/* Integrity Premium */}
              <div className="flex justify-between items-center group/item gap-6">
                <div className="space-y-2">
                  <div className="text-lg font-bold text-white group-hover/item:text-emerald-400 transition-colors">Integrity Premium</div>
                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] leading-relaxed">Verified Infrastructure Metadata</div>
                </div>
                <div className="text-2xl font-mono font-black text-emerald-500 shrink-0">+{valuation.trustPremium.toLocaleString()}</div>
              </div>

              {/* Maintenance Debt */}
              <div className="flex justify-between items-center group/item gap-6">
                <div className="space-y-2">
                  <div className="text-lg font-bold text-white group-hover/item:text-rose-400 transition-colors">Technical Debt</div>
                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] leading-relaxed">Overdue Engineering Tasks</div>
                </div>
                <div className="text-2xl font-mono font-black text-rose-500 shrink-0">-{valuation.maintenanceDebt.toLocaleString()}</div>
              </div>

              {/* Mechanical Risk Penalty */}
              {valuation.mechanicalRiskPenalty > 0 && (
                <div className="flex justify-between items-center group/item gap-6">
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-amber-500">Telemetry Variance</div>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] leading-relaxed animate-pulse">Efficiency Deviation Penalty</div>
                  </div>
                  <div className="text-2xl font-mono font-black text-rose-600 shrink-0">-{valuation.mechanicalRiskPenalty.toLocaleString()}</div>
                </div>
              )}

              {/* Usage Correction */}
              <div className="flex justify-between items-center group/item gap-6">
                <div className="space-y-2">
                  <div className="text-lg font-bold text-white">Usage Calibration</div>
                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] leading-relaxed">Mileage-to-Age Correction</div>
                </div>
                <div className="text-2xl font-mono font-black text-slate-400 shrink-0">-{valuation.mileagePenalty.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="pt-10">
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-[2.5rem] p-10 flex flex-col xl:flex-row items-center justify-between gap-10 transition-all hover:bg-blue-600/20">
              <div className="space-y-3 text-center xl:text-left shrink-0">
                <div className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em]">Potential Asset Ceiling</div>
                <div className="text-4xl lg:text-5xl font-black text-white font-mono leading-none tracking-tighter">₦{valuation.potentialValue.toLocaleString()}</div>
              </div>
              <p className="text-[10px] lg:text-[11px] font-black text-blue-300 uppercase leading-[2.2] xl:max-w-[280px] text-center xl:text-right tracking-[0.2em] opacity-80">
                Resolve Technical Debt and Telemetry Leaks to hit peak equity value. Professional grading active.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
