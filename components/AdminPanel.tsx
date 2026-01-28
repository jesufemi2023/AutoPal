import React, { useState, useEffect, useMemo } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { formatDate, formatCurrency } from '../shared/utils.ts';
import { verifyTransaction } from '../subscriptions/paymentService.ts';
import { 
  Activity, 
  Shield, 
  Zap, 
  Users, 
  CreditCard, 
  Terminal as TerminalIcon, 
  Database, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Search,
  ChevronRight,
  TrendingUp,
  Cpu
} from 'lucide-react';

type AdminTab = 'telemetry' | 'financial' | 'fleet' | 'calibration' | 'templates';

const AdminPanel: React.FC = () => {
  const { user } = useAutoPalStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('telemetry');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data States
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [fleetStats, setFleetStats] = useState<any>(null);
  const [userList, setUserList] = useState<any[]>([]);
  const [manualRef, setManualRef] = useState('');
  const [handshakeStatus, setHandshakeStatus] = useState<{msg: string, type: 'info' | 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin' || !supabase) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'calibration') {
          const { data } = await supabase.from('system_calibration').select('*').order('created_at', { ascending: false });
          setFeedbacks(data || []);
        } else if (activeTab === 'financial') {
          const { data } = await supabase.from('payments').select('*, Users(email)').order('created_at', { ascending: false }).limit(50);
          setPayments(data || []);
        } else if (activeTab === 'fleet') {
          const { data } = await supabase.from('Users').select('*, vehicles(count)').order('created_at', { ascending: false });
          setUserList(data || []);
        } else if (activeTab === 'telemetry') {
          // Aggregate stats for telemetry
          const [uCount, vCount, pSum] = await Promise.all([
            supabase.from('Users').select('*', { count: 'exact', head: true }),
            supabase.from('vehicles').select('*', { count: 'exact', head: true }),
            supabase.from('payments').select('amount').eq('status', 'success')
          ]);
          
          const totalRevenue = pSum.data?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
          
          setFleetStats({
            totalUsers: uCount.count || 0,
            totalVehicles: vCount.count || 0,
            revenue: totalRevenue,
            aiHealth: 98.4 // Mocked for UI
          });
        }
      } catch (err) {
        console.error("Admin Data Fetch Fault:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeTab, user?.role]);

  const handleManualHandshake = async () => {
    if (!manualRef.startsWith('AP-')) {
      setHandshakeStatus({ msg: "Invalid Reference Format. Must start with AP-", type: 'error' });
      return;
    }
    setHandshakeStatus({ msg: "Initiating Neural Handshake...", type: 'info' });
    try {
      const result = await verifyTransaction(manualRef);
      if (result.status === 'success') {
        setHandshakeStatus({ msg: `SUCCESS: Protocol ${manualRef} Activated.`, type: 'success' });
        setManualRef('');
      } else {
        setHandshakeStatus({ msg: `FAILED: Gateway returned ${result.status}`, type: 'error' });
      }
    } catch (e: any) {
      setHandshakeStatus({ msg: `FAULT: ${e.message}`, type: 'error' });
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center text-rose-500 mx-auto border border-rose-500/20">
            <Shield size={40} />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Access Restricted</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
            Unauthorized Pilot Signature Detected. This area is reserved for Fleet Command.
          </p>
        </div>
      </div>
    );
  }

  const StatCard = ({ label, value, trend, icon: Icon, color }: any) => (
    <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group shadow-2xl">
      <div className={`absolute top-0 right-0 p-8 opacity-[0.05] transition-transform group-hover:scale-110 duration-700 ${color}`}>
        <Icon size={80} />
      </div>
      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${color}`}>
            <Icon size={16} />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{label}</span>
        </div>
        <div className="space-y-1">
          <div className="text-4xl font-black text-white tracking-tighter leading-none">{value}</div>
          <div className="flex items-center gap-2">
            <TrendingUp size={10} className="text-emerald-500" />
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{trend}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-slide-up space-y-10 pb-32">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-1">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#3b82f6]"></div>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em]">Fleet Command Center</p>
          </div>
          <h1 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            System <br/><span className="text-blue-600">Nerve Center</span>
          </h1>
        </div>
        
        <nav className="flex bg-white p-1.5 rounded-[1.75rem] border border-slate-100 shadow-sm overflow-x-auto scrollbar-hide">
          {(['telemetry', 'financial', 'fleet', 'calibration'] as AdminTab[]).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900'}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === 'telemetry' && (
        <div className="space-y-10 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Active Fleet" value={fleetStats?.totalUsers || '0'} trend="+14% this month" icon={Users} color="text-blue-400" />
            <StatCard label="Tracked Assets" value={fleetStats?.totalVehicles || '0'} trend="+8.2% Growth" icon={Activity} color="text-emerald-400" />
            <StatCard label="Total Revenue" value={formatCurrency(fleetStats?.revenue || 0)} trend="+22% ARR" icon={CreditCard} color="text-amber-400" />
            <StatCard label="Neural Health" value={`${fleetStats?.aiHealth || 100}%`} trend="0.2ms latency" icon={Cpu} color="text-indigo-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
              <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">System Activity Stream</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Real-time Node Monitoring</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  LIVE SYNC
                </div>
              </div>
              <div className="p-8 bg-slate-950 font-mono text-[11px] text-blue-400/80 flex-grow space-y-4 overflow-y-auto max-h-[400px]">
                <div className="flex gap-4">
                  <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                  <span>&gt; INITIALIZING SYSTEM HANDSHAKE... SUCCESS</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                  <span>&gt; POLLING GEMINI PRO API... STATUS: NOMINAL</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                  <span className="text-emerald-500">&gt; NEW PILOT REGISTERED: pilot_94@autopal.ng</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                  <span className="text-amber-500">&gt; QUOTA REACHED: UID_99482 (AI_SCAN_MONTHLY)</span>
                </div>
                <div className="flex gap-4 animate-pulse">
                  <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                  <span className="text-blue-500">&gt; LISTENING ON PORT 443...</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full"></div>
               <div className="space-y-8 relative z-10">
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Handshake Protocol</h4>
                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest leading-relaxed">
                      Force verification of Paystack references to override network latency.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute top-3 left-4 text-[7px] font-black text-slate-500 uppercase tracking-widest">Manual Reference</div>
                      <input 
                        type="text" 
                        placeholder="AP-PREMIUM-..." 
                        value={manualRef}
                        onChange={(e) => setManualRef(e.target.value.toUpperCase())}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl p-5 pt-8 font-mono text-[10px] text-white outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <button 
                      onClick={handleManualHandshake}
                      disabled={!manualRef}
                      className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-30"
                    >
                      Trigger Handshake
                    </button>
                  </div>

                  {handshakeStatus && (
                    <div className={`p-4 rounded-xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-3 animate-in slide-in-from-top-2 ${handshakeStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : handshakeStatus.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                      {handshakeStatus.type === 'info' && <RefreshCw size={14} className="animate-spin" />}
                      {handshakeStatus.type === 'success' && <CheckCircle2 size={14} />}
                      {handshakeStatus.type === 'error' && <AlertCircle size={14} />}
                      {handshakeStatus.msg}
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'financial' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-700">
           <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Transaction Ledger</h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Last 50 Protocol Activations</p>
              </div>
              <div className="flex gap-2">
                <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase">Confirmed: {payments.filter(p => p.status === 'success').length}</div>
                <div className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[9px] font-black uppercase">Pending: {payments.filter(p => p.status === 'pending').length}</div>
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                       <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                       <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Pilot</th>
                       <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tier</th>
                       <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                       <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-6 font-mono text-[10px] font-bold text-slate-900 group-hover:text-blue-600">{p.reference}</td>
                        <td className="px-10 py-6 text-xs font-bold text-slate-500">{p.Users?.email || 'System Override'}</td>
                        <td className="px-10 py-6">
                           <span className={`px-3 py-1 rounded-lg text-[8px] font-black tracking-widest ${p.tier === 'premium' ? 'bg-slate-900 text-blue-400' : 'bg-blue-600 text-white'}`}>
                              {p.tier.toUpperCase()}
                           </span>
                        </td>
                        <td className="px-10 py-6 text-right font-mono font-black text-slate-900 text-xs">{formatCurrency(p.amount)}</td>
                        <td className="px-10 py-6 text-center">
                           <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${p.status === 'success' ? 'bg-emerald-50 text-emerald-600' : p.status === 'pending' ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-rose-50 text-rose-600'}`}>
                              <div className={`w-1 h-1 rounded-full ${p.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                              {p.status}
                           </div>
                        </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeTab === 'fleet' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-700">
           <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Pilot Directory</h3>
              <div className="relative">
                <input type="text" placeholder="Search pilots..." className="bg-white border border-slate-200 rounded-xl px-10 py-2.5 text-xs outline-none focus:border-blue-500 w-64" />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-50">
                    <tr>
                       <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Pilot Identity</th>
                       <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol Tier</th>
                       <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Assets</th>
                       <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Joined</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {userList.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs">
                                 {u.display_name?.[0] || u.email[0].toUpperCase()}
                              </div>
                              <div className="space-y-0.5">
                                 <div className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{u.display_name || 'Nameless Pilot'}</div>
                                 <div className="text-[10px] font-mono text-slate-400">{u.email}</div>
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <span className={`px-3 py-1 rounded-lg text-[8px] font-black tracking-widest ${u.tier === 'premium' ? 'bg-slate-900 text-blue-400 shadow-lg' : u.tier === 'standard' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              {u.tier.toUpperCase()}
                           </span>
                        </td>
                        <td className="px-10 py-6 text-center">
                           <span className="px-3 py-1 bg-slate-50 rounded-lg text-xs font-black text-slate-700 border border-slate-100">
                              {u.vehicles[0]?.count || 0}
                           </span>
                        </td>
                        <td className="px-10 py-6 text-right text-[10px] font-bold text-slate-400">{formatDate(u.created_at)}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeTab === 'calibration' && (
        <div className="space-y-6 animate-in fade-in duration-700">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">User Resilience Reports</h3>
            <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">{feedbacks.length} Submissions</span>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-4 bg-white rounded-[2.5rem] border border-slate-100">
                <RefreshCw size={40} className="text-blue-500 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Decrypting Calibration Vault...</p>
              </div>
            ) : feedbacks.length > 0 ? (
              feedbacks.map((f, i) => (
                <div key={i} className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 -translate-y-1/2 translate-x-1/2 rotate-45 pointer-events-none"></div>
                   
                   <div className="flex flex-col lg:flex-row justify-between gap-10 mb-8">
                      <div className="space-y-4">
                         <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black ${f.rating > 7 ? 'bg-emerald-50 text-emerald-600' : f.rating > 4 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                              {f.rating}
                            </div>
                            <div>
                               <h4 className="text-base font-black text-slate-900">{f.user_email || 'Anonymous Pilot'}</h4>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Captured: {formatDate(f.created_at)}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                               <Database size={10} /> Context: {f.vehicle_context}
                            </span>
                         </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 h-fit">
                        {f.tags?.map((tag: string) => (
                          <span key={tag} className="px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-500 hover:border-blue-200 hover:text-blue-600 transition-colors">{tag}</span>
                        ))}
                      </div>
                   </div>
                   
                   <div className="relative">
                      <div className="absolute -left-6 top-0 text-6xl text-slate-100 font-serif pointer-events-none">“</div>
                      <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50/50 p-8 rounded-3xl border border-slate-100 shadow-inner relative z-10">
                        {f.comment || 'No qualitative logs provided for this session.'}
                      </p>
                      <div className="absolute -right-2 -bottom-4 text-6xl text-slate-100 font-serif rotate-180 pointer-events-none">“</div>
                   </div>

                   <div className="mt-8 flex justify-end">
                      <button className="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase tracking-widest hover:translate-x-1 transition-transform">
                         Resolve Report <ChevronRight size={14} />
                      </button>
                   </div>
                </div>
              ))
            ) : (
              <div className="py-32 text-center space-y-6 opacity-40 bg-white rounded-[2.5rem] border border-slate-100">
                 <div className="text-6xl">📥</div>
                 <p className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400">Vault Currently Empty</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;