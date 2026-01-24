
import React, { useState, useEffect, useCallback } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { Tier, CapabilityKey } from '../shared/types.ts';
import { useUsageQuota } from '../hooks/useUsageQuota.ts';
import { initiateUpgrade, verifyTransaction } from '../subscriptions/paymentService.ts';
import { ENV } from '../services/envService.ts';
import { Shield, Zap, Database, CheckCircle2, AlertTriangle, Terminal as TerminalIcon, Sparkles, Clock, Ban, RefreshCw, Bug, Cpu, Globe, Edit3, Save, X as CloseIcon } from 'lucide-react';
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
  statusMsg?: string;
  remoteStatus?: string;
}> = ({ tier, isSyncing, onManualVerify, statusMsg, remoteStatus }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    let currentIdx = 0;
    const sequence = [
      "> SECURING CONNECTION...",
      "> AUTHENTICATING PAYMENT...",
      `> ACTIVATING ${tier.toUpperCase()} PLAN...`,
      "> SYNCING CLOUD PROFILE...",
      "> FINALIZING SETUP..."
    ];

    const interval = setInterval(() => {
      if (currentIdx < sequence.length) {
        setLogs(prev => [...prev, sequence[currentIdx]]);
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    const fallbackTimer = setTimeout(() => setShowFallback(true), 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(fallbackTimer);
    };
  }, [tier]);

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500 overflow-y-auto">
      <div className="max-w-xl w-full bg-slate-900 border border-blue-500/20 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_0_100px_rgba(37,99,235,0.2)] my-auto">
        <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white animate-pulse">
            <TerminalIcon size={24} />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-tighter text-xl">Activation Center</h3>
            <p className="text-blue-500 text-[8px] font-black uppercase tracking-[0.4em]">Upgrading to: {tier}</p>
          </div>
        </div>
        
        <div className="space-y-3 font-mono text-[11px] mb-8">
          {logs.map((log, i) => (
            <div key={i} className={`${i === logs.length - 1 ? 'text-blue-400 font-bold' : 'text-slate-500'} animate-in slide-in-from-left-2`}>
              {log}
            </div>
          ))}
          <div className="w-2 h-4 bg-blue-500 animate-pulse inline-block mt-2"></div>
        </div>

        {remoteStatus && (
          <div className={`p-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-center mb-6 border animate-pulse ${remoteStatus === 'success' ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400' : 'bg-blue-600/10 border-blue-500/30 text-blue-400'}`}>
            Status: {remoteStatus === 'success' ? 'Upgrade Successful' : 'Processing...'}
          </div>
        )}

        {showFallback && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl text-center">
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed">
                Verification is taking longer than expected. If your payment was successful, please use the button below to retry.
              </p>
            </div>
            
            <button 
              disabled={isSyncing}
              onClick={onManualVerify}
              className="w-full bg-blue-600 text-white py-5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {isSyncing ? "Verifying..." : "Verify Plan Update"}
            </button>
            
            {statusMsg && <p className="text-[8px] text-slate-500 text-center font-mono uppercase tracking-widest">{statusMsg}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileDossier: React.FC = () => {
  const { user, setUser, setCurrentView } = useAutoPalStore();
  const [activeTab, setActiveTab] = useState<'identity' | 'license'>('identity');
  const [provisioningTier, setProvisioningTier] = useState<Tier | null>(null);
  const [lastRef, setLastRef] = useState<string | undefined>();
  const [remoteStatus, setRemoteStatus] = useState<string | undefined>();
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isWaitingForServer, setIsWaitingForServer] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [formData, setFormData] = useState({ displayName: '', phone: '' });

  useEffect(() => {
    if (user) {
      setFormData({ displayName: user.displayName || '', phone: user.phone || '' });
    }
  }, [user]);

  /**
   * AUTOMATIC REDIRECT WATCHER
   */
  useEffect(() => {
    if (isWaitingForServer && user?.tier && provisioningTier === user.tier) {
      setIsWaitingForServer(false);
      setProvisioningTier(null);
      setRemoteStatus('success');
      setStatusMsg({ 
        type: 'success', 
        text: `Upgrade complete. Your new plan is now active.` 
      });
      
      setTimeout(() => {
        setCurrentView('garage');
      }, 1500);
    }
  }, [user?.tier, isWaitingForServer, provisioningTier, setCurrentView]);

  /**
   * ROBUST VERIFICATION POLLING
   */
  useEffect(() => {
    let pollInterval: number;
    
    if (isWaitingForServer && lastRef) {
      pollInterval = window.setInterval(async () => {
        try {
          const result = await verifyTransaction(lastRef);
          setRemoteStatus(result.status);
          if (result.status === 'success') {
            console.log("Success confirmed. Re-syncing local identity...");
            await forceProfileSync(true);
            clearInterval(pollInterval);
          }
        } catch (e) {
          console.warn("Heartbeat missed. Retrying handshake...");
        }
      }, 3500);
    }

    return () => clearInterval(pollInterval);
  }, [isWaitingForServer, lastRef]);

  const forceProfileSync = async (autoRedirect = false) => {
    if (!supabase || !user) return;
    if (!autoRedirect) setIsManualSyncing(true);
    
    try {
      const { data: profile, error } = await supabase
        .from('Users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (profile) {
        setUser({
          ...user,
          tier: profile.tier,
          licenseExpiresAt: profile.license_expires_at,
          role: profile.role,
          displayName: profile.display_name,
          phone: profile.phone,
          avatarUrl: profile.avatar_url
        });

        if (profile.tier === provisioningTier && !autoRedirect) {
          setStatusMsg({ type: 'success', text: "Profile updated successfully." });
          setIsWaitingForServer(false);
        }
      }
    } catch (e: any) {
      if (!autoRedirect) setStatusMsg({ type: 'error', text: "Update failed. Please check your connection." });
    } finally {
      if (!autoRedirect) setIsManualSyncing(false);
    }
  };

  const handleCommitIdentity = async () => {
    if (!supabase || !user) return;
    setIsSavingProfile(true);
    setStatusMsg(null);

    try {
      const { error } = await supabase
        .from('Users')
        .update({
          display_name: formData.displayName,
          phone: formData.phone
        })
        .eq('id', user.id);

      if (error) throw error;

      setUser({
        ...user,
        displayName: formData.displayName,
        phone: formData.phone
      });

      setIsEditing(false);
      setStatusMsg({ type: 'success', text: "Account profile updated." });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Failed to save changes: ${err.message}` });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpgrade = (tier: 'standard' | 'premium', price: number) => {
    if (!user) return;
    setStatusMsg(null);
    setRemoteStatus(undefined);

    initiateUpgrade({
      userId: user.id,
      email: user.email,
      amount: price,
      tier: tier,
      onSuccess: async (ref) => {
        try {
          if (supabase) {
            const { error: insertError } = await supabase.from('payments').insert([{
              user_id: user.id,
              tier: tier,
              amount: price,
              reference: ref,
              status: 'pending'
            }]);

            if (insertError) {
               const errorText = insertError.message.toLowerCase();
               const isIgnorable = 
                 insertError.code === '23505' || 
                 errorText.includes('row-level security') || 
                 errorText.includes('policy');

               if (!isIgnorable) {
                 throw insertError;
               }
               console.log("Synchronous record creation blocked. Proceeding to verification.");
            }

            setProvisioningTier(tier);
            setLastRef(ref);
            setRemoteStatus('pending');
            setIsWaitingForServer(true);
            verifyTransaction(ref).catch(() => {});
          }
        } catch (err: any) {
          setStatusMsg({ type: 'error', text: `Activation Error: ${err.message}` });
        }
      },
      onCancel: () => {
        setStatusMsg({ type: 'error', text: 'Upgrade cancelled.' });
      }
    });
  };

  const PLANS = [
    { 
      id: 'free' as Tier, 
      label: 'Free Plan', 
      price: 0,
      priceLabel: '₦0',
      tagline: 'Basic vehicle tracking',
      features: ['1 Active Vehicle', '2 Monthly Fuel Logs', 'No AI Diagnostic Scans', 'Limited Market Data', 'Non-renewable after 30 days']
    },
    { 
      id: 'standard' as Tier, 
      label: 'Standard Plan', 
      price: 2500,
      priceLabel: '₦2,500/mo',
      tagline: 'Enhanced maintenance tracking',
      features: ['3 Active Vehicles', '7 Monthly Fuel Logs', '2 Monthly AI Scans', 'Professional Exports', 'Fully Renewable Monthly']
    },
    { 
      id: 'premium' as Tier, 
      label: 'Premium Plan', 
      price: 7500,
      priceLabel: '₦7,500/mo',
      tagline: 'Full fleet intelligence',
      features: ['10 Active Vehicles', 'Unlimited Fuel logs', '4 Monthly AI Scans', 'Detailed Garage Reports', 'Priority Support']
    }
  ];

  const isExpired = user?.licenseExpiresAt ? new Date(user.licenseExpiresAt) < new Date() : false;

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-slide-up px-4 pb-32">
      {provisioningTier && isWaitingForServer && (
        <NeuralProvisioningOverlay 
          tier={provisioningTier} 
          isSyncing={isManualSyncing}
          onManualVerify={() => forceProfileSync(false)}
          statusMsg={lastRef ? `Transaction ID: ${lastRef}` : undefined}
          remoteStatus={remoteStatus}
        />
      )}

      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className={`w-2 h-2 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-blue-600 animate-pulse'}`}></div>
             <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em]">Account Settings & Plan</p>
          </div>
          <h1 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            {activeTab === 'identity' ? 'My Profile' : 'Current'} <br/>
            <span className="text-blue-600">{activeTab === 'identity' ? 'Information' : 'Plan'}</span>
          </h1>
        </div>

        <div className="flex bg-white p-1.5 rounded-[1.75rem] border border-slate-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('identity')}
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'identity' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900'}`}
          >
            My Details
          </button>
          <button 
            onClick={() => setActiveTab('license')}
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'license' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900'}`}
          >
            Subscription Plan
          </button>
        </div>
      </header>

      {statusMsg && (
        <div className={`p-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border-2 animate-in slide-in-from-top-4 ${statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose border-rose-100 text-rose-600'}`}>
          <div className="flex items-start gap-4">
            <span className="text-lg">{statusMsg.type === 'success' ? '✓' : '⚠️'}</span>
            <div className="space-y-1">
              <p className="leading-relaxed">{statusMsg.text}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {activeTab === 'identity' ? (
          <>
            <div className="lg:col-span-7 space-y-8">
              <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-12 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-[0.02] text-9xl pointer-events-none select-none group-hover:scale-110 transition-transform duration-1000">ID</div>
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-10 mb-12 relative z-10">
                  <div className="flex flex-col sm:flex-row items-center gap-10">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] bg-slate-900 flex items-center justify-center text-white text-4xl sm:text-5xl font-black shadow-2xl border-4 border-slate-800 rotate-3 group-hover:rotate-0 transition-transform overflow-hidden">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'P'
                      )}
                    </div>
                    <div className="text-center sm:text-left space-y-2">
                        <div className={`inline-block px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] mb-2 ${user?.tier === 'premium' ? 'bg-slate-900 text-blue-400' : user?.tier === 'standard' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {user?.tier?.toUpperCase()} PLAN
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none">{user?.displayName || 'Set your name'}</h3>
                        <p className="text-slate-400 font-mono text-sm tracking-tight">{user?.email}</p>
                        {user?.licenseExpiresAt && (
                          <p className={`text-[9px] font-black uppercase tracking-widest pt-2 flex items-center gap-2 ${isExpired ? 'text-rose-500' : 'text-slate-400'}`}>
                            <Clock size={10} /> Plan Expires: {formatDate(user.licenseExpiresAt)}
                          </p>
                        )}
                    </div>
                  </div>
                  
                  {!isEditing && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="bg-slate-50 border border-slate-100 text-slate-400 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition-all"
                    >
                      <Edit3 size={12} /> Edit Profile
                    </button>
                  )}
                </div>

                <div className="space-y-8 relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Display Name</label>
                      <input 
                        type="text" 
                        disabled={!isEditing} 
                        className={`w-full border-2 rounded-2xl px-6 py-5 font-bold text-sm outline-none transition-all ${isEditing ? 'bg-white border-blue-500 shadow-inner' : 'bg-slate-50 border-slate-100'}`} 
                        value={formData.displayName} 
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        placeholder="Your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone Number</label>
                      <input 
                        type="tel" 
                        disabled={!isEditing} 
                        className={`w-full border-2 rounded-2xl px-6 py-5 font-mono font-bold text-sm outline-none transition-all ${isEditing ? 'bg-white border-blue-500 shadow-inner' : 'bg-slate-50 border-slate-100'}`} 
                        value={formData.phone} 
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+234..."
                      />
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <button 
                        onClick={handleCommitIdentity}
                        disabled={isSavingProfile}
                        className="flex-grow bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-95"
                      >
                        {isSavingProfile ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        Save Profile
                      </button>
                      <button 
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({ displayName: user?.displayName || '', phone: user?.phone || '' });
                        }}
                        className="px-10 py-5 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-rose-500 transition-colors"
                      >
                        Cancel Changes
                      </button>
                    </div>
                  ) : (
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] text-center">Update your contact information above.</p>
                  )}
                </div>
              </section>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white space-y-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full"></div>
                <div className="space-y-1 relative z-10">
                   <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Usage Summary</h4>
                   <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">Monthly feature status</p>
                </div>
                
                <div className="space-y-4 relative z-10">
                   <CapacityMeter label="Garage Capacity" capability="MAX_VEHICLES" icon={<Shield size={14} />} color="text-blue-500" />
                   <CapacityMeter label="AI Value Scans" capability="AI_SCAN_MONTHLY" icon={<Zap size={14} />} color="text-amber-500" />
                   <CapacityMeter label="AI Diagnostics" capability="AI_MECHANIC_MONTHLY" icon={<Cpu size={14} />} color="text-rose-500" />
                   <CapacityMeter label="Fuel History logs" capability="FUEL_LOGS_MONTHLY" icon={<Database size={14} />} color="text-emerald-500" />
                   <CapacityMeter label="Service Records" capability="SERVICE_LOGS_MONTHLY" icon={<TerminalIcon size={14} />} color="text-indigo-500" />
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
                        {isExpired ? <Ban size={10} /> : <Sparkles size={10} />} {isExpired ? 'Expired' : 'Active Plan'}
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
                      className={`mt-12 w-full py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-3 ${isActive && !isExpired ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200 cursor-default' : plan.id === 'free' ? 'bg-slate-100 text-slate-400 border-2 border-slate-200 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-2xl active:scale-0.98]'}`}
                    >
                      {isActive && isExpired ? 'Renew Plan' : isActive ? 'Current Plan' : plan.id === 'free' ? 'Initial Plan' : `Upgrade to ${plan.label}`}
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
