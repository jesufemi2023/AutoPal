import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { formatDate } from '../shared/utils.ts';

const AdminPanel: React.FC = () => {
  const { user } = useAutoPalStore();
  const [activeTab, setActiveTab] = useState<'stats' | 'feedback'>('stats');
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'feedback' && supabase) {
      setIsLoading(true);
      supabase.from('system_calibration')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setFeedbacks(data || []);
          setIsLoading(false);
        });
    }
  }, [activeTab]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="text-6xl">🚫</div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-rose-600">Access Denied</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Unauthorized Pilot Signature Detected</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Users', value: '1,240', trend: '+12%', color: 'blue' },
    { label: 'Premium Subs', value: '312', trend: '+5%', color: 'green' },
    { label: 'AI API Cost', value: '$12.40', trend: 'Budget: $70', color: 'orange' },
    { label: 'Active Alerts', value: '42', trend: 'Critical: 3', color: 'red' },
  ];

  return (
    <div className="animate-slide-up space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">System <span className="text-blue-600">Command</span></h2>
          <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[8px] sm:text-[9px] mt-2">Operational Analytics v4.2</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('stats')}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Telemetry
          </button>
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'feedback' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Calibration Vault
          </button>
        </div>
      </header>

      {activeTab === 'stats' ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map(stat => (
              <div key={stat.label} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all">
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">{stat.label}</div>
                <div className="text-4xl font-black text-slate-900 tracking-tighter mb-4">{stat.value}</div>
                <div className={`text-[8px] font-black uppercase tracking-widest text-${stat.color}-600 bg-${stat.color}-50 px-2 py-1 rounded-md inline-block`}>{stat.trend}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">User Activity Feed</h3>
              <button className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Neural Refresh</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[8px] font-black tracking-[0.2em]">
                  <tr>
                    <th className="px-10 py-5">Pilot Identity</th>
                    <th className="px-10 py-5">Tier</th>
                    <th className="px-10 py-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="hover:bg-slate-50 transition cursor-pointer group">
                      <td className="px-10 py-6 font-bold text-slate-700 group-hover:text-blue-600 transition-colors">pilot_{i}@autopal.ng</td>
                      <td className="px-10 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[8px] font-black tracking-widest ${i % 2 === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          {i % 2 === 0 ? 'PREMIUM' : 'FREE'}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live Link</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
          <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">User Resilience Reports</h3>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{feedbacks.length} Submissions</span>
          </div>
          
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Decrypting vault...</p>
            </div>
          ) : feedbacks.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {feedbacks.map((f, i) => (
                <div key={i} className="p-10 hover:bg-slate-50/50 transition-all group">
                   <div className="flex flex-col lg:flex-row justify-between gap-6 mb-6">
                      <div className="space-y-1">
                         <div className="flex items-center gap-3">
                            <h4 className="text-base font-black text-slate-900">{f.user_email || 'Anonymous Pilot'}</h4>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${f.rating > 7 ? 'bg-emerald-50 text-emerald-600' : f.rating > 4 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>Score: {f.rating}/10</span>
                         </div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Received: {formatDate(f.created_at)} // Context: {f.vehicle_context}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {f.tags?.map((tag: string) => (
                          <span key={tag} className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[7px] font-black uppercase tracking-widest text-slate-500">{tag}</span>
                        ))}
                      </div>
                   </div>
                   <p className="text-sm font-medium text-slate-600 leading-relaxed bg-white border border-slate-100 p-6 rounded-2xl shadow-inner">
                     "{f.comment || 'No qualitative logs provided.'}"
                   </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-32 text-center space-y-4 opacity-40">
               <div className="text-5xl">📥</div>
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">Vault currently empty</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;