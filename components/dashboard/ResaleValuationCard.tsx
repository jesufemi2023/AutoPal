
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
    <section className="bg-slate-950 rounded-[3rem] p-10 sm:p-16 text-white relative overflow-hidden shadow-3xl group border border-white/10 transition-all duration-700 hover:shadow-blue-900/20">
      {/* Background Micro-Design */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div className="relative z-10 flex flex-col xl:flex-row gap-16 xl:gap-24 items-center">
        {/* Market Liquidity Side */}
        <div className="w-full xl:w-5/12 space-y-12">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-pulse"></div>
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Real-Time Market Liquidity</h3>
            </div>
            <div className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-white transition-all duration-500 group-hover:scale-[1.02] origin-left">
              <span className="text-3xl sm:text-4xl text-slate-500 mr-2 font-mono">₦</span>
              {valuation.finalValue.toLocaleString()}
            </div>
            <p className="text-blue-500/80 text-[11px] font-black uppercase tracking-[0.3em] font-mono">Telemetry-Optimized Valuation v5.1</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-sm group-hover:bg-white/10 transition-all">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Market Grade</div>
              <div className={`text-4xl font-black ${gradeColors[valuation.marketGrade]} transition-all duration-500 group-hover:scale-110 origin-left`}>{valuation.marketGrade}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-sm group-hover:bg-white/10 transition-all">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Equity Preservation</div>
              <div className="text-4xl font-black text-white font-mono">{valuePreserved}%</div>
            </div>
          </div>
        </div>

        {/* Adjustments Ledger */}
        <div className="w-full xl:w-7/12 space-y-10 xl:border-l xl:border-white/10 xl:pl-20">
          <div className="space-y-8">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Financial Adjustments Ledger</h4>
              <span className="text-[9px] font-mono text-blue-500 font-bold">NGN CURRENCY UNIT</span>
            </div>
            
            <div className="space-y-8">
              {/* Integrity Premium */}
              <div className="flex justify-between items-center group/item">
                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-white group-hover/item:text-emerald-400 transition-colors">Integrity Premium</div>
                  <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Verified Infrastructure Metadata</div>
                </div>
                <div className="text-lg font-mono font-black text-emerald-500">+{valuation.trustPremium.toLocaleString()}</div>
              </div>

              {/* Maintenance Debt */}
              <div className="flex justify-between items-center group/item">
                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-white group-hover/item:text-rose-400 transition-colors">Technical Debt</div>
                  <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Overdue Engineering Tasks</div>
                </div>
                <div className="text-lg font-mono font-black text-rose-500">-{valuation.maintenanceDebt.toLocaleString()}</div>
              </div>

              {/* Mechanical Risk Penalty */}
              {valuation.mechanicalRiskPenalty > 0 && (
                <div className="flex justify-between items-center group/item">
                  <div className="space-y-1.5">
                    <div className="text-sm font-bold text-amber-500">Telemetry Variance</div>
                    <div className={`text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] ${valuation.mechanicalRiskPenalty > 0 ? 'animate-pulse' : ''}`}>Efficiency Deviation Penalty</div>
                  </div>
                  <div className="text-lg font-mono font-black text-rose-600">-{valuation.mechanicalRiskPenalty.toLocaleString()}</div>
                </div>
              )}

              {/* Usage Correction */}
              <div className="flex justify-between items-center group/item">
                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-white">Usage Calibration</div>
                  <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Mileage-to-Age Correction</div>
                </div>
                <div className="text-lg font-mono font-black text-slate-400">-{valuation.mileagePenalty.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10">
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-[2rem] p-8 flex flex-col sm:flex-row items-center justify-between gap-8 transition-all hover:bg-blue-600/20">
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em]">Potential Asset Ceiling</div>
                <div className="text-3xl font-black text-white font-mono">{valuation.potentialValue.toLocaleString()}</div>
              </div>
              <p className="text-[9px] font-black text-blue-300 uppercase leading-[2] max-w-[220px] text-center sm:text-right tracking-widest">
                Resolve Technical Debt and Telemetry Leaks to hit peak equity value.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
