
import React from 'react';
import { useAutoPalStore } from '../shared/store.ts';

export const Toast: React.FC = () => {
  const notifications = useAutoPalStore(state => state.notifications);

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 w-full max-w-sm px-4 pointer-events-none">
      {notifications.map((n) => (
        <div 
          key={n.id} 
          className={`glass p-4 rounded-2xl shadow-2xl border-l-4 flex items-center justify-between animate-slide-in pointer-events-auto ${
            n.type === 'success' ? 'border-emerald-500' : 
            n.type === 'error' ? 'border-rose-500' : 'border-blue-500'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">
              {n.type === 'success' ? '✨' : n.type === 'error' ? '⚠️' : 'ℹ️'}
            </span>
            <p className="text-xs font-bold text-slate-900 tracking-tight">{n.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
