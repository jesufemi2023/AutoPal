
import React from 'react';
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
  const valuation = calculateResaleValue(vehicle, tasks, serviceLogs, fuelLogs);
  
  // Calculate percentage of value preserved
  const valuePreserved = Math.round((valuation.finalValue / valuation.baseValue) * 100);

  return (
    <section className="bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 text-white relative overflow-hidden shadow-3xl shadow-blue-900/20 group">
      {/* Background Tech Decorative */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

      <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
        <div className="w-full lg:w-5/12 space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Asset Liquidity Valuation</h3>
            </div>
            <div className="text-5xl sm:text-6xl font-black tracking-tighter text-white">
              {formatCurrency(valuation.finalValue)}
            </div>
            <p className="text-blue-400 text-[9px] font-black uppercase tracking-widest">Estimated Resale Equity</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Preservation</div>
              <div className="text-xl font-black text-emerald-400">{valuePreserved}%</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Mkt Grade</div>
              <div className="text-xl font-black text-blue-400">{valuePreserved > 70 ? 'A+' : 'B'}</div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-7/12 space-y-6 lg:border-l lg:border-white/10 lg:pl-12">
          <div className="space-y-4">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Valuation Drivers</h4>
            
            <div className="space-y-4">
              {/* Trust Premium */}
              <div className="flex justify-between items-center group/item">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">Provenance Premium</div>
                  <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Verified Service History</div>
                </div>
                <div className="text-sm font-black text-emerald-500">+{formatCurrency(valuation.trustPremium)}</div>
              </div>

              {/* Maintenance Debt */}
              <div className="flex justify-between items-center group/item">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">Maintenance Debt</div>
                  <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Overdue Components</div>
                </div>
                <div className="text-sm font-black text-rose-500">-{formatCurrency(valuation.maintenanceDebt)}</div>
              </div>

              {/* Mileage Penalty */}
              <div className="flex justify-between items-center group/item">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">Usage Correction</div>
                  <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Mileage vs Age Variance</div>
                </div>
                <div className="text-sm font-black text-rose-400">-{formatCurrency(valuation.mileagePenalty)}</div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Potential Value</div>
                <div className="text-lg font-black text-white">{formatCurrency(valuation.potentialValue)}</div>
              </div>
              <p className="text-[7px] font-black text-blue-300 uppercase leading-relaxed max-w-[150px] text-right">
                Clear Maintenance Debt to unlock this value.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
