
import React from 'react';
import { FuelLog } from '../shared/types.ts';
import { formatCurrency } from '../shared/utils.ts';

const FuelIntelligenceCenter: React.FC<{ logs: FuelLog[] }> = ({ logs }) => {
  return (
    <div className="space-y-10 px-2">
      <header className="space-y-4">
        <h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Metabolic Tracking</h2>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">OpEx Analysis & Efficiency Drift</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {logs.map((log, i) => (
          <div key={log.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-all">
            <div className="flex items-center gap-6">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 text-xs">#{logs.length - i}</div>
              <div>
                <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{new Date(log.createdAt).toLocaleDateString()}</div>
                <h4 className="text-lg font-black text-slate-900">{log.liters.toFixed(2)}L @ {log.vendor}</h4>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono font-bold text-slate-900">{formatCurrency(log.totalCost)}</div>
              <div className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Transaction Recorded</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FuelIntelligenceCenter;
