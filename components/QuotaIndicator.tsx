import React from 'react';
import { CapabilityKey } from '../shared/types.ts';
import { useUsageQuota } from '../hooks/useUsageQuota.ts';

interface QuotaIndicatorProps {
  capability: CapabilityKey;
  label?: string;
  variant?: 'minimal' | 'detailed';
}

export const QuotaIndicator: React.FC<QuotaIndicatorProps> = ({ 
  capability, 
  label,
  variant = 'minimal' 
}) => {
  const quota = useUsageQuota(capability);
  
  if (quota.limit >= 900) return null; // Hide "Infinite" quotas for cleanliness

  const percentage = Math.min(100, (quota.current / quota.limit) * 100);
  
  const getStatusColor = () => {
    if (quota.isExhausted) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    if (percentage > 80) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  };

  if (variant === 'minimal') {
    return (
      <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all ${getStatusColor()}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${quota.isExhausted ? 'bg-rose-500 animate-pulse' : percentage > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
        <span>{label || capability.replace(/_/g, ' ')}: {quota.current} / {quota.limit}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <div className="flex justify-between items-end px-1">
        <div className="space-y-0.5">
          <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest">{label || capability.replace(/_/g, ' ')}</p>
          <p className={`text-xs font-black uppercase tracking-tighter ${quota.isExhausted ? 'text-rose-500' : 'text-slate-900'}`}>
            {quota.isExhausted ? 'Quota Full' : `${quota.limit - quota.current} Units Remaining`}
          </p>
        </div>
        <div className="text-right">
          <span className="font-mono text-sm font-black text-slate-900">{quota.current}</span>
          <span className="text-slate-300 mx-1">/</span>
          <span className="font-mono text-sm font-black text-slate-400">{quota.limit}</span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${quota.isExhausted ? 'bg-rose-500' : percentage > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};