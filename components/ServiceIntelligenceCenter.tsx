
import React from 'react';
import { ServiceLog } from '../shared/types.ts';
import { formatCurrency } from '../shared/utils.ts';

const ServiceIntelligenceCenter: React.FC<{ logs: ServiceLog[] }> = ({ logs }) => {
  const getBadge = (level: string) => {
    switch(level) {
      case 'mechanic_verified': return '💎 Mechanic Verified';
      case 'receipt_verified': return '📀 Receipt Uploaded';
      default: return '🔘 Self Declared';
    }
  };

  return (
    <div className="space-y-10 px-2">
      <header className="space-y-4">
        <h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Asset Resume</h2>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">CapEx Investment & Equity Protection</p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {logs.map((log) => (
          <div key={log.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 relative group overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{log.category} System</span>
              <span className="bg-slate-950 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{getBadge(log.verificationLevel || 'self_declared')}</span>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">{log.serviceType}</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">Performed at {log.provider || 'Independent Workshop'} • {log.mileageAtService.toLocaleString()}km</p>
            
            <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
              <div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Cost Investment</div>
                <div className="text-xl font-black text-slate-900">{formatCurrency(log.cost)}</div>
              </div>
              <div className="text-right">
                <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Equity Impact</div>
                <div className="text-xs font-bold text-emerald-600">Value Protected</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceIntelligenceCenter;
