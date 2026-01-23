import React, { useState, useEffect, useMemo } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { deleteAccountPermanently } from '../auth/authService.ts';
import { Tier, CapabilityKey } from '../shared/types.ts';
import { useUsageQuota } from '../hooks/useUsageQuota.ts';
import { Shield, Zap, Database, BarChart3, Lock, CheckCircle2, AlertTriangle, Terminal as TerminalIcon } from 'lucide-react';

/**
 * CapacityMeter
 * Specialized high-fidelity progress bar for quota tracking.
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
 * An immersive terminal-style effect that triggers during tier transitions.
 */
const NeuralProvisioningOverlay: React.FC<{ tier: Tier; onComplete: () => void }> = ({ tier, onComplete }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const sequence = [
    "> INITIALIZING NEURAL HANDSHAKE...",
    "> AUTHENTICATING PILOT SIGNATURE...",
    `> REQUESTING ${tier.toUpperCase()} PROTOCOL ACCESS...`,
    "> SYNCHRONIZING CLOUD MASTER NODES...",
    "> RECALIBRATING DATABASE GOVERNOR...",
    "> EXPANDING ASSET CAPACITY SLOTS...",
    "> UNFILTERING ANALYTICS BANDWIDTH...",
    "> PROVISIONING COMPLETE. WELCOME PILOT."
  ];

  useEffect(() => {
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < sequence.length) {
        setLogs(prev => [...prev, sequence[currentIdx]]);
        currentIdx++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 1000);
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950 flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="max-w-xl w-full bg-slate-900 border border-blue-500/20 rounded-[2rem] p-10 shadow-[0_0_100px_rgba(37,99,235,0.2)]">
        <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white animate-pulse">
            <TerminalIcon size={24} />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-tighter text-xl">System Recalibration</h3>
            <p className="text-blue-500 text-[8px] font-black uppercase tracking-[0.4em]">Environment Activation in Progress</p>
          </div>
        </div>
        <div className="space-y-3 font-mono text-[10px] sm:text-[11px]">
          {logs.map((log, i) => (
            <div key={i} className={`${i === logs.length - 1 ? 'text-blue-400' : 'text-slate-500'} animate-in slide-in-from-left-2`}>
              {log}
            </div>
          ))}
          <div className="w-2 h-4 bg-blue-500 animate-pulse inline-block mt-2"></div>
        </div>
      </div>
    </div>
  );
};

const ProfileDossier: React.FC = () => {
  const { user, setUser, reset, setCurrentView } = useAutoPalStore();
  
  const [activeTab, setActiveTab] = useState<'identity' | 'license'>('identity');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [provisioningTier, setProvisioningTier] = useState<Tier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({ displayName: '', phone: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        phone: user.phone || ''
      });
    }
  }, [user, isEditing]);

  const handleTierChange = async (newTier: Tier) => {
    if (!user || user.tier === newTier) return;
    
    // Check if cloud link is available
    if (!supabase) {
      setStatusMsg({ type: 'error', text: 'Cloud Link Offline. Cannot modify license.' });
      return;
    }

    try {
      // 1. Start Provisioning Visuals
      setProvisioningTier(newTier);

      // 2. Perform the Hard Gate update in Supabase
      const { error } = await supabase
        .from('Users')
        .update({ tier: newTier })
        .eq('id', user.id);

      if (error) throw error;

      // 3. Update Store - Note: The Overlay onComplete will handle the UI switch
      setUser({ ...user, tier: newTier });
    } catch (err: any) {
      setProvisioningTier(null);
      setStatusMsg({ type: 'error', text: err.message || "License Authorization Failed." });
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;
    
    setIsSaving(true);
    setStatusMsg(null);

    try {
      const { error: dbError } = await supabase
        .from('Users')
        .update({ display_name: formData.displayName, phone: formData.phone })
        .eq('id', user.id);
      
      if (dbError) throw dbError;

      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: formData.displayName, phone: formData.phone }
      });
      
      if (authError) throw authError;
      
      setUser({ ...user, ...formData });
      setIsEditing(false);
      setStatusMsg({ type: 'success', text: 'Identity Synchronized.' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Sync Failure: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const TIER_CONFIG = {
    free: { name: 'Basic Pilot', color: 'bg-slate-200 text-slate-600', description: 'Standard consumer monitoring.' },
    standard: { name: 'Enthusiast', color: 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]', description: 'Advanced mechanical auditing.' },
    premium: { name: 'Fleet Commander', color: 'bg-slate-900 text-blue-400 shadow-[0_0_25px_rgba(0,0,0,0.4)]', description: 'Enterprise-grade intelligence.' }
  };

  const PLANS = [
    { 
      id: 'free' as Tier, 
      label: 'Pilot Basic', 
      price: '₦0',
      features: ['1 Active Digital Twin', 'Standard Fuel Logic', 'Manual Service Ledger', 'Regional Insights']
    },
    { 
      id: 'standard' as Tier, 
      label: 'Enthusiast', 
      price: '₦2,500/mo',
      features: ['3 Active Digital Twins', 'AI-Generated Roadmaps', 'Advanced Efficiency Analytics', 'Professional PDF Exports']
    },
    { 
      id: 'premium' as Tier, 
      label: 'Fleet Commander', 
      price: '₦7,500/mo',
      features: ['10 Active Digital Twins', 'Deep AI Condition Audits', 'Global Ownership Reporting', 'Chassis Value Projection']
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-slide-up px-4 sm:px-6 w-full pb-32">
      {provisioningTier && (
        <NeuralProvisioningOverlay 
          tier={provisioningTier} 
          onComplete={() => setProvisioningTier(null)} 
        />
      )}

      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
             <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em]">Pilot Security Dossier</p>
          </div>
          <h1 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            {activeTab === 'identity' ? 'Identity' : 'Licensing'} <br/>
            <span className="text-blue-600">{activeTab === 'identity' ? 'Telemetry' : 'Activation'}</span>
          </h1>
        </div>

        <div className="flex bg-white p-1.5 rounded-[1.75rem] border border-slate-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('identity')}
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'identity' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900'}`}
          >
            Profile Data
          </button>
          <button 
            onClick={() => setActiveTab('license')}
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'license' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900'}`}
          >
            Plan Manager
          </button>
        </div>
      </header>

      {statusMsg && (
        <div className={`p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border animate-in slide-in-from-top-4 ${statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
          {statusMsg.type === 'success' ? '✓' : '⚠️'} {statusMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {activeTab === 'identity' ? (
          <>
            {/* Identity Card */}
            <div className="lg:col-span-7 space-y-8">
              <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-12 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-[0.02] text-9xl pointer-events-none select-none group-hover:scale-110 transition-transform duration-1000">ID</div>
                
                <div className="flex flex-col sm:flex-row items-center gap-10 mb-12">
                   <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] bg-slate-900 flex items-center justify-center text-white text-4xl sm:text-5xl font-black shadow-2xl border-4 border-slate-800 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                     {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'P'}
                   </div>
                   <div className="text-center sm:text-left space-y-2">
                      <div className={`inline-block px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] mb-2 ${TIER_CONFIG[user?.tier || 'free'].color}`}>
                        {TIER_CONFIG[user?.tier || 'free'].name}
                      </div>
                      <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none">{user?.displayName || 'Unnamed Pilot'}</h3>
                      <p className="text-slate-400 font-mono text-sm tracking-tight">{user?.email}</p>
                   </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-8 relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Legal Name</label>
                      <input 
                        type="text" 
                        required 
                        disabled={!isEditing || isSaving}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-bold text-sm outline-none focus:border-blue-600 transition-all disabled:opacity-50"
                        value={formData.displayName}
                        onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Comms Channel (Phone)</label>
                      <input 
                        type="tel" 
                        disabled={!isEditing || isSaving}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-mono font-bold text-sm outline-none focus:border-blue-600 transition-all disabled:opacity-50"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {isEditing ? (
                      <>
                        <button 
                          type="submit" 
                          disabled={isSaving}
                          className="flex-grow bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                          {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                          Update Dossier
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setIsEditing(false)}
                          className="px-10 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[11px]"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => setIsEditing(true)}
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-blue-600 transition-all active:scale-95"
                      >
                        Modify Identity Data
                      </button>
                    )}
                  </div>
                </form>
              </section>
            </div>

            {/* Capacity Gauges */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 text-white space-y-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full"></div>
                <div className="space-y-1 relative z-10">
                   <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Resource Utilization</h4>
                   <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">Active Quota Monitoring</p>
                </div>
                
                <div className="space-y-4 relative z-10">
                   <CapacityMeter 
                     label="Fleet Capacity" 
                     capability="MAX_VEHICLES" 
                     icon={<Shield size={14} />} 
                     color="text-blue-500" 
                   />
                   <CapacityMeter 
                     label="Neural Link (AI)" 
                     capability="AI_SCAN_MONTHLY" 
                     icon={<Zap size={14} />} 
                     color="text-amber-500" 
                   />
                   <CapacityMeter 
                     label="Fuel Intelligence" 
                     capability="FUEL_LOGS_MONTHLY" 
                     icon={<Database size={14} />} 
                     color="text-emerald-500" 
                   />
                </div>
                
                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">System Governor active</span>
                   </div>
                   <button 
                     onClick={() => setActiveTab('license')}
                     className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline"
                   >
                     Increase Capacity →
                   </button>
                </div>
              </div>
              
              <div className="bg-rose-50 border-2 border-rose-100 rounded-[2rem] p-8 space-y-6">
                <div className="flex items-center gap-4 text-rose-600">
                  <AlertTriangle size={24} />
                  <h4 className="text-sm font-black uppercase tracking-widest leading-none">Security Override</h4>
                </div>
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-relaxed">
                  Decommissioning your pilot ID is permanent. All digital twins and records will be purged from the cloud mirror.
                </p>
                <button 
                  onClick={async () => {
                    const confirm = window.prompt("Type 'DELETE' to decommission account.");
                    if (confirm === 'DELETE' && user?.id) {
                      setIsDeleting(true);
                      await deleteAccountPermanently(user.id);
                      await reset();
                      setCurrentView('landing');
                    }
                  }}
                  className="w-full bg-rose-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
                >
                  {isDeleting ? 'PURGING...' : 'Nuclear Account Deletion'}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Licensing Tab - Upgrade Matrix */
          <div className="lg:col-span-12 space-y-12 animate-in fade-in slide-in-from-bottom-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PLANS.map((plan) => {
                const isActive = user?.tier === plan.id;
                return (
                  <div 
                    key={plan.id}
                    className={`bg-white rounded-[2.5rem] p-10 border-4 transition-all relative overflow-hidden flex flex-col group ${isActive ? 'border-blue-600 shadow-3xl scale-[1.03] z-10' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    {isActive && (
                      <div className="absolute top-0 right-0 bg-blue-600 text-white px-6 py-2 rounded-bl-3xl text-[9px] font-black uppercase tracking-widest">
                        Current Protocol
                      </div>
                    )}
                    
                    <div className="space-y-8 flex-grow">
                      <div className="space-y-2">
                        <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter group-hover:text-blue-600 transition-colors">{plan.label}</h4>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter">
                          {plan.price}
                        </div>
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
                      onClick={() => handleTierChange(plan.id)}
                      disabled={isActive}
                      className={`mt-12 w-full py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-3 ${isActive ? 'bg-emerald-50 text-emerald-600 cursor-default border-2 border-emerald-200' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-2xl active:scale-[0.98]'}`}
                    >
                      {isActive ? 'Protocol Active' : `Activate ${plan.label}`}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-50 border border-slate-100 p-8 sm:p-12 rounded-[3rem] text-center space-y-6">
              <div className="max-w-2xl mx-auto space-y-4">
                 <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Professional Fleet Licensing</h4>
                 <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                   Need to manage more than 10 vehicles? Contact our enterprise logistics wing for dedicated server instance provisioning and custom API rate limits.
                 </p>
                 <button className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] hover:underline pt-4">
                   Contact Enterprise Support →
                 </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileDossier;
