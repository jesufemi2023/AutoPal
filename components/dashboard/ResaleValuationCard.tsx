
import React, { useMemo } from 'react';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../../shared/types.ts';
import { calculateResaleValue } from '../../services/valuationService.ts';
import { formatCurrency } from '../../shared/utils.ts';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  serviceLogs: ServiceLog[];
  fuelLogs: FuelLog[];
}

export const ResaleValuationCard: React.FC<Props> = ({ vehicle, tasks, serviceLogs, fuelLogs }) => {
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
    <section className="bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 text-white relative overflow-hidden shadow-3xl shadow-blue-900/20 group border border-white/5">
      {/* Visual Accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

      <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
        {/* Main Financial Figure */}
        <div className="w-full lg:w-5/12 space-y-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Equity & Liquidity Estimate</h3>
            </div>
            <div className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-white">
              {formatCurrency(valuation.finalValue)}
            </div>
            <p className="text-blue-400/60 text-[10px] font-black uppercase tracking-[0.2em]">Based on Tech-Telemetry Scan</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Mkt Grade</div>
              <div className={`text-3xl font-black ${gradeColors[valuation.marketGrade]}`}>{valuation.marketGrade}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Preservation</div>
              <div className="text-3xl font-black text-white">{valuePreserved}%</div>
            </div>
          </div>
        </div>

        {/* Valuation Drivers Ledger */}
        <div className="w-full lg:w-7/12 space-y-8 lg:border-l lg:border-white/10 lg:pl-12">
          <div className="space-y-6">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Valuation Drivers</h4>
            
            <div className="space-y-6">
              {/* Integrity Premium */}
              <div className="flex justify-between items-center group/item">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white group-hover/item:text-emerald-400 transition-colors">Integrity Premium</div>
                  <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Verified Service Ledger Bonus</div>
                </div>
                <div className="text-sm font-black text-emerald-500">+{formatCurrency(valuation.trustPremium)}</div>
              </div>

              {/* Maintenance Debt */}
              <div className="flex justify-between items-center group/item">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white group-hover/item:text-rose-400 transition-colors">Maintenance Debt</div>
                  <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Unresolved Overdue Protocols</div>
                </div>
                <div className="text-sm font-black text-rose-500">-{formatCurrency(valuation.maintenanceDebt)}</div>
              </div>

              {/* Mechanical Risk Penalty */}
              {valuation.mechanicalRiskPenalty > 0 && (
                <div className="flex justify-between items-center group/item animate-pulse">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-amber-500">Mechanical Risk</div>
                    <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Engine Metabolism Warning</div>
                  </div>
                  <div className="text-sm font-black text-rose-600">-{formatCurrency(valuation.mechanicalRiskPenalty)}</div>
                </div>
              )}

              {/* Usage Correction */}
              <div className="flex justify-between items-center group/item">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">Usage Correction</div>
                  <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest">KM Variance vs Mkt Norm</div>
                </div>
                <div className="text-sm font-black text-slate-400">-{formatCurrency(valuation.mileagePenalty)}</div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Optimal Trade-In Value</div>
                <div className="text-2xl font-black text-white">{formatCurrency(valuation.potentialValue)}</div>
              </div>
              <p className="text-[8px] font-black text-blue-300 uppercase leading-relaxed max-w-[200px] text-center sm:text-right">
                Unlock full equity by resolving high-priority mechanical debt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
