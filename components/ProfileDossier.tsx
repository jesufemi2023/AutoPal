
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { Tier, CapabilityKey } from '../shared/types.ts';
import { useUsageQuota } from '../hooks/useUsageQuota.ts';
import { initiateUpgrade } from '../subscriptions/paymentService.ts';
import { Shield, Zap, Database, CheckCircle2, Terminal as TerminalIcon, Sparkles, Clock, Ban, RefreshCw, Search, AlertCircle, Loader2 } from 'lucide-react';
import { formatDate } from '../shared/utils.ts';

/**
 * CapacityMeter
 */
const CapacityMeter: React.FC<{ 
  label: string; 
  capability: CapabilityKey; 
  icon: React.ReactNode;
  color: string;
}> = ({ label, capability, icon, color }) => {
  const quota = useUsageQuota(capability);
  const percentage = quota.limit > 0 ? Math.min(100, (quota.current / quota.limit) * 100) : 0;
  const isInfinite = quota.limit >= 999;

  return (
    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-3 group hover:border-blue-200 transition-colors">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white shadow-sm ${color}`}>{icon}</div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-mono font-black text-slate-900">
            {quota.current} / {isInfinite ? '∞' : quota.limit}
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-white rounded-full overflow-hidden border border-slate-100">
        <div 
          className={`h-full transition-all duration-1000 ease-out rounded-full ${color.replace('text-', 'bg-')}`}
          style={{ width: `${isInfinite ? 100 : percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

/**
 * NeuralProvisioningOverlay
 */
const NeuralProvisioningOverlay: React.FC<{ 
  tier: Tier; 
  isSyncing: boolean;
  onManualVerify: () => void;
}> = ({ tier, isSyncing, onManualVerify }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [showFallback, setShowFallback] = useState(false);
  
  const sequence = [
    "> INITIALIZING NEURAL HANDSHAKE...",
    "> AUTHENTICATING SETTLEMENT...",
    `> SECURING ${tier.toUpperCase()} PROTOCOL...`,
    "> SYNCHRONIZING CLOUD MASTER NODES...",
    "> RECALIBRATING DATABASE GOVERNOR...",
    "> AWAITING FINAL BROADCAST..."
  ];

  useEffect(() => {
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < sequence.length) {
        setLogs(prev => [...prev, sequence[currentIdx]]);
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    const fallbackTimer = setTimeout(() => setShowFallback(true), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(fallbackTimer);
    };
  }, [tier]);

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950 flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="max-w-xl w-full bg-slate-900 border border-blue-500/20 rounded-[2.5rem] p-10 shadow-[0_0_100px_rgba(37,99,235,0.2)]">
        <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white animate-pulse">
            <TerminalIcon size={24} />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-tighter text-xl">System Provisioning</h3>
            <p className="text-blue-500 text-[8px] font-black uppercase tracking-[0.4em]">Environment Shift in Progress</p>
          </div>
        </div>
        
        <div className="space-y-3 font-mono text-[11px] mb-8 min-h-[140px]">
          {logs.map((log, i) => (
            <div key={i} className={`${i === logs.length - 1 ? 'text-blue-400 font-bold' : 'text-slate-500'} animate-in slide-in-from-left-2`}>
              {log}
            </div>
          ))}
          {!isSyncing && !showFallback && <div className="w-2 h-4 bg-blue-500 animate-pulse inline-block mt-2"></div>}
          {isSyncing && (
             <div className="text-emerald-400 font-bold animate-pulse mt-4">
                &gt; PROBING DATABASE VAULT FOR SETTLEMENT SIGNALS...
             </div>
          )}
        </div>

        {showFallback && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl mb-6">
              <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest leading-relaxed">
                The cloud handshake is taking longer than expected. If your bank has debited you, the signal is likely on its way.
              </p>
            </div>
            <button 
              disabled={isSyncing}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onManualVerify(); }}
              className="w-full bg-blue-600 text-white py-5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Attempting Sync...
                </>
              ) : (
                <>
                  <Search size={14} />
                  Verify Activation Now
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileDossier: React.FC = () => {
  const { user, setUser } = useAutoPalStore();
  const [activeTab, setActiveTab] = useState<'identity' | 'license'>('identity');
  const [provisioningTier, setProvisioningTier] = useState<Tier | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isWaitingForServer, setIsWaitingForServer] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [formData, setFormData] = useState({ displayName: '', phone: '' });

  useEffect(() => {
    if (user) {
      setFormData({ displayName: user.displayName || '', phone: user.phone || '' });
    }
  }, [user]);

  /** 
   * AUTO-RECOVERY: Restore UI state if user refreshes during provisioning
   */
  useEffect(() => {
    const checkRecovery = async () => {
      if (!supabase || !user || user.tier !== 'free') return;
      
      const { data: recentPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentPayments && (recentPayments.status === 'pending' || recentPayments.status === 'success')) {
        setProvisioningTier(recentPayments.tier as Tier);
        setIsWaitingForServer(true);
      }
    };
    checkRecovery();
  }, [user?.id, user?.tier]);

  /**
   * SUCCESS WATCHER: Closes overlay when store updates via App.tsx realtime subscription
   */
  useEffect(() => {
    if (isWaitingForServer && user?.tier && user.tier !== 'free') {
      setIsWaitingForServer(false);
      const targetTier = user.tier;
      setProvisioningTier(null);
      setStatusMsg({ type: 'success', text: `System Recalibrated: ${targetTier.toUpperCase()} Protocol Active.` });
    }
  }, [user?.tier, isWaitingForServer]);

  /**
   * DEEP MANUAL VERIFICATION
   * This is the fix for the "unresponsive" button.
   */
  const forceProfileSync = async () => {
    if (!supabase || !user) return;
    
    setIsManualSyncing(true);
    setStatusMsg(null);
    console.log("Manual Sync Initiated...");
    
    try {
      // 1. Fetch latest profile truth from cloud
      const { data: profile, error: profError } = await supabase
        .from('Users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profError) throw profError;
      
      // 2. Fetch the latest payment attempt for this user
      const { data: payRecord, error: payError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (payError) throw payError;

      // 3. Logic Branching based on found data
      if (profile && profile.tier !== 'free') {
        // CASE A: User is already upgraded in the DB
        setUser({
          ...user,
          tier: profile.tier,
          licenseExpiresAt: profile.license_expires_at,
          role: profile.role,
          displayName: profile.display_name,
          phone: profile.phone
        });
        setIsWaitingForServer(false);
        setProvisioningTier(null);
        setStatusMsg({ type: 'success', text: "Activation Confirmed! Cloud state synchronized." });
      } 
      else if (payRecord) {
        if (payRecord.status === 'success') {
          // CASE B: Payment is success but Trigger hasn't flipped User yet
          setStatusMsg({ type: 'error', text: "Payment confirmed, but system trigger is latent. Retrying in 10s..." });
          setTimeout(forceProfileSync, 10000);
        } else {
          // CASE C: Record exists but is still PENDING (Webhook hasn't fired or failed)
          setStatusMsg({ type: 'error', text: `Reference ${payRecord.reference} is still PENDING. Paystack signal hasn't reached our cloud yet.` });
        }
      } 
      else {
        // CASE D: No record at all
        setStatusMsg({ type: 'error', text: "No payment attempt found in the vault. Please try activating again." });
        setIsWaitingForServer(false);
        setProvisioningTier(null);
      }
    } catch (e: any) {
      console.error("Manual Sync Fault:", e);
      setStatusMsg({ type: 'error', text: "Network Fault: Connection to Cloud Master Nodes interrupted." });
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleUpgrade = (tier: 'standard' | 'premium', price: number) => {
    if (!user) return;
    setStatusMsg(null);

    initiateUpgrade({
      userId: user.id,
      email: user.email,
      amount: price,
      tier: tier,
      onSuccess: async (ref) => {
        try {
          if (supabase) {
            await supabase.from('payments').upsert([{
              user_id: user.id,
              tier: tier,
              amount: price,
              reference: ref,
              status: 'pending'
            }], { onConflict: 'reference' });

            setProvisioningTier(tier);
            setIsWaitingForServer(true);
            setStatusMsg({ type: 'success', text: 'Signal captured. System is calibrating...' });
          }
        } catch (err: any) {
          console.error("Billing Persistence Fault:", err);
          setStatusMsg({ type: 'error', text: `Data Vault Error: ${err.message}` });
        }
      },
      onCancel: () => {
        setStatusMsg({ type: 'error', text: 'Activation Sequence Aborted.' });
      }
    });
  };

  const PLANS = [
    { 
      id: 'free' as Tier, 
      label: 'Pilot Basic', 
      price: 0,
      priceLabel: '₦0',
      tagline: 'Discovery Environment',
      features: ['1 Active Vehicle Twin', '2 Monthly Fuel Logs', '0 AI Diagnostic Scans', 'Regional Market Data', 'Non-renewable after 30 days']
    },
    { 
      id: 'standard' as Tier, 
      label: 'Enthusiast', 
      price: 2500,
      priceLabel: '₦2,500/mo',
      tagline: 'High-Performance Protocol',
      features: ['3 Active Vehicle Twins', '7 Monthly Fuel Logs', '2 Monthly AI Scans', 'Professional Exports', 'Fully Renewable']
    },
    { 
      id: 'premium' as Tier, 
      label: 'Fleet Commander', 
      price: 7500,
      priceLabel: '₦7,500/mo',
      tagline: 'Unlimited Intelligence',
      features: ['10 Active Vehicle Twins', 'Unlimited Logic streams', '4 Monthly AI Scans', 'Global Reporting', 'Priority Processing']
    }
  ];

  const isExpired = user?.licenseExpiresAt ? new Date(user.licenseExpiresAt) < new Date() : false;

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-slide-up px-4 pb-32">
      {provisioningTier && isWaitingForServer && (
        <NeuralProvisioningOverlay 
          tier={provisioningTier} 
          isSyncing={isManualSyncing}
          onManualVerify={forceProfileSync}
        />
      )}

      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className={`w-2 h-2 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-blue-600 animate-pulse'}`}></div>
             <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em]">Pilot Command & Licensing</p>
          </div>
          <h1 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            {activeTab === 'identity' ? 'Identity' : 'Activation'} <br/>
            <span className="text-blue-600">{activeTab === 'identity' ? 'Telemetry' : 'Protocol'}</span>
          </h1>
        </div>

        <div className="flex bg-white p-1.5 rounded-[1.75rem] border border-slate-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('identity')}
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'identity' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900'}`}
          >
            Telemetry
          </button>
          <button 
            onClick={() => setActiveTab('license')}
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'license' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900'}`}
          >
            License Manager
          </button>
        </div>
      </header>

      {statusMsg && (
        <div className={`p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border animate-in slide-in-from-top-4 flex items-center gap-3 ${statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {statusMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {activeTab === 'identity' ? (
          <>
            <div className="lg:col-span-7 space-y-8">
              <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-12 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-[0.02] text-9xl pointer-events-none select-none group-hover:scale-110 transition-transform duration-1000">ID</div>
                <div className="flex flex-col sm:flex-row items-center gap-10 mb-12 relative z-10">
                   <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] bg-slate-900 flex items-center justify-center text-white text-4xl sm:text-5xl font-black shadow-2xl border-4 border-slate-800 rotate-3 group-hover:rotate-0 transition-transform">
                     {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'P'}
                   </div>
                   <div className="text-center sm:text-left space-y-2">
                      <div className={`inline-block px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] mb-2 ${user?.tier === 'premium' ? 'bg-slate-900 text-blue-400' : user?.tier === 'standard' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {user?.tier?.toUpperCase()} PROTOCOL
                      </div>
                      <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none">{user?.displayName || 'Unnamed Pilot'}</h3>
                      <p className="text-slate-400 font-mono text-sm tracking-tight">{user?.email}</p>
                      {user?.licenseExpiresAt && (
                        <p className={`text-[9px] font-black uppercase tracking-widest pt-2 flex items-center gap-2 ${isExpired ? 'text-rose-500' : 'text-slate-400'}`}>
                          <Clock size={10} /> Valid Until: {formatDate(user.licenseExpiresAt)}
                        </p>
                      )}
                   </div>
                </div>

                <div className="space-y-8 relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Pilot Name</label>
                      <input type="text" readOnly className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-bold text-sm outline-none" value={formData.displayName} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Comms Hub</label>
                      <input type="tel" readOnly className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-mono font-bold text-sm outline-none" value={formData.phone} />
                    </div>
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] text-center">Identity is locked while mission is active.</p>
                </div>
              </section>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white space-y-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full"></div>
                <div className="space-y-1 relative z-10">
                   <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Resource Monitors</h4>
                   <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">Active Quota Feedback</p>
                </div>
                
                <div className="space-y-4 relative z-10">
                   <CapacityMeter label="Fleet Capacity" capability="MAX_VEHICLES" icon={<Shield size={14} />} color="text-blue-500" />
                   <CapacityMeter label="Neural Link (AI)" capability="AI_SCAN_MONTHLY" icon={<Zap size={14} />} color="text-amber-500" />
                   <CapacityMeter label="Fuel Intelligence" capability="FUEL_LOGS_MONTHLY" icon={<Database size={14} />} color="text-emerald-500" />
                   <CapacityMeter label="Service History" capability="SERVICE_LOGS_MONTHLY" icon={<TerminalIcon size={14} />} color="text-indigo-500" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="lg:col-span-12 space-y-12 animate-in fade-in slide-in-from-bottom-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PLANS.map((plan) => {
                const isActive = user?.tier === plan.id;
                return (
                  <div key={plan.id} className={`bg-white rounded-[2.5rem] p-10 border-4 transition-all relative overflow-hidden flex flex-col group ${isActive ? 'border-blue-600 shadow-3xl scale-[1.03] z-10' : 'border-slate-100 hover:border-slate-200'}`}>
                    {isActive && (
                      <div className={`absolute top-0 right-0 ${isExpired ? 'bg-rose-600' : 'bg-blue-600'} text-white px-6 py-2 rounded-bl-3xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2`}>
                        {isExpired ? <Ban size={10} /> : <Sparkles size={10} />} {isExpired ? 'Expired' : 'Active'}
                      </div>
                    )}
                    <div className="space-y-8 flex-grow">
                      <div className="space-y-2">
                        <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{plan.label}</h4>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{plan.tagline}</p>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter pt-4">{plan.priceLabel}</div>
                      </div>
                      <div className="h-px bg-slate-100 w-full"></div>
                      <ul className="space-y-5">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-3 text-[11px] font-bold text-slate-600 leading-relaxed">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button 
                      onClick={() => plan.id !== 'free' && handleUpgrade(plan.id as any, plan.price)}
                      disabled={isActive && !isExpired}
                      className={`mt-12 w-full py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-3 ${isActive && !isExpired ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200 cursor-default' : plan.id === 'free' ? 'bg-slate-100 text-slate-400 border-2 border-slate-200 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-2xl active:scale-[0.98]'}`}
                    >
                      {isActive && isExpired ? 'Renew Protocol' : isActive ? 'Current Protocol' : plan.id === 'free' ? 'Initial Protocol' : `Activate ${plan.label}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileDossier;
