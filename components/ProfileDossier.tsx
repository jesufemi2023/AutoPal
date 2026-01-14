
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { Tier, UserProfile } from '../shared/types.ts';

/**
 * ProfileDossier
 * Managed identity component for AutoPal NG.
 * Provides a high-fidelity interface for account management, security clearance,
 * and subscription intelligence.
 */
const ProfileDossier: React.FC = () => {
  const { user, setUser, vehicles, serviceLogs } = useAutoPalStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'identity' | 'subscription'>('identity');
  
  const [formData, setFormData] = useState({
    displayName: '',
    phone: ''
  });

  // Sync internal form data ONLY when entering edit mode or when not currently editing.
  // This prevents background auth updates from overwriting the user's typing.
  useEffect(() => {
    if (user && !isEditing && !isSaving) {
      setFormData({
        displayName: user.displayName || '',
        phone: user.phone || ''
      });
    }
  }, [user, isEditing, isSaving]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!supabase) throw new Error("Neural Link Failure: Supabase disconnected.");
      
      // Update Supabase Auth metadata using exact keys provided by user
      const { data, error } = await supabase.auth.updateUser({
        data: {
          "Display name": formData.displayName,
          "Phone": formData.phone
        }
      });
      
      if (error) throw error;
      
      if (data?.user) {
        // Construct the updated profile object manually for optimistic UI update
        const updatedProfile: UserProfile = {
          ...user,
          displayName: data.user.user_metadata?.['Display name'] || formData.displayName,
          phone: data.user.user_metadata?.['Phone'] || formData.phone
        };
        
        // Immediately update global store to prevent the "blink"
        setUser(updatedProfile);
        setSuccessMessage("Identity parameters synchronized.");
        
        // Brief delay for user feedback before closing
        setTimeout(() => {
          setIsEditing(false);
          setSuccessMessage(null);
          setIsSaving(false);
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Identity synchronization failure.");
      setIsSaving(false);
    }
  };

  const handleAccountDeletion = async () => {
    const confirmed = confirm(
      "CRITICAL ALERT: System Purge Requested. This will permanently incinerate all vehicle telemetry and identity records. Proceed?"
    );
    if (!confirmed) return;

    try {
      if (!supabase) throw new Error("Supabase connection missing.");
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err: any) {
      alert("Purge Failure: " + err.message);
    }
  };

  const TIER_BENEFITS: Record<Tier, string[]> = {
    free: ["1 Vehicle Digital Twin", "Manual Service Logs", "Basic Fuel Tracking"],
    standard: ["3 Vehicle Digital Twins", "JIT AI Maintenance Roadmap", "Advanced Fuel Analytics"],
    premium: ["Unlimited Vehicles", "Gemini 3 Pro Diagnostics", "Full Supply Chain Integration", "Priority WhatsApp Support"]
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-slide-up px-4 sm:px-0 w-full pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter leading-none uppercase">Profile <span className="text-blue-600">Dossier</span></h1>
          <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[8px] sm:text-[9px]">Identity Node: {user?.id.split('-')[0]} // Status: Active</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('identity')}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'identity' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Identity
          </button>
          <button 
            onClick={() => setActiveTab('subscription')}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'subscription' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Subscription
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-10">
          {activeTab === 'identity' ? (
            <section className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-sm border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] font-black text-[12rem] select-none pointer-events-none transition-transform duration-1000 group-hover:scale-110">
                ID
              </div>
              
              <div className="relative z-10 space-y-12">
                <div className="flex items-center gap-8">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-900 flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-2xl border-4 border-slate-800">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981]"></span>
                      <span className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">Identity Verified</span>
                    </div>
                    <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none">
                      {user?.displayName || 'Unknown Entity'}
                    </h3>
                    <p className="text-slate-400 font-mono text-xs sm:text-sm tracking-tight">{user?.email}</p>
                  </div>
                </div>

                <form onSubmit={handleUpdate} className="space-y-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          required
                          disabled={isSaving}
                          className="w-full bg-slate-50 border-2 border-blue-600/20 rounded-2xl px-6 py-5 font-bold text-sm outline-none focus:border-blue-600 focus:bg-white transition-all text-slate-900 shadow-inner disabled:opacity-50"
                          value={formData.displayName}
                          onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                        />
                      ) : (
                        <div className="px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold text-sm">
                          {user?.displayName || "N/A"}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Protocol</label>
                      {isEditing ? (
                        <input 
                          type="tel" 
                          disabled={isSaving}
                          className="w-full bg-slate-50 border-2 border-blue-600/20 rounded-2xl px-6 py-5 font-mono font-bold text-sm outline-none focus:border-blue-600 focus:bg-white transition-all text-slate-900 shadow-inner disabled:opacity-50"
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                      ) : (
                        <div className="px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-mono font-bold text-sm">
                          {user?.phone || "N/A"}
                        </div>
                      )}
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                      {errorMessage}
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                      {successMessage}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    {isEditing ? (
                      <>
                        <button 
                          type="submit" 
                          disabled={isSaving} 
                          className="flex-grow bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                          {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                          {isSaving ? 'Updating...' : 'Save Changes'}
                        </button>
                        <button 
                          type="button" 
                          disabled={isSaving}
                          onClick={() => { setIsEditing(false); setErrorMessage(null); setSuccessMessage(null); }} 
                          className="px-10 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => { setIsEditing(true); setErrorMessage(null); setSuccessMessage(null); }} 
                        className="flex-grow bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-600 transition-all shadow-xl active:scale-95"
                      >
                        Update Identity Profile
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </section>
          ) : (
            <section className="space-y-8 animate-slide-up">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(['free', 'standard', 'premium'] as Tier[]).map((tier) => (
                  <div 
                    key={tier} 
                    className={`bg-white rounded-[2rem] p-8 border-4 transition-all relative overflow-hidden group ${user?.tier === tier ? 'border-blue-600 shadow-2xl' : 'border-slate-100 opacity-60 hover:opacity-100'}`}
                  >
                    {user?.tier === tier && (
                      <div className="absolute top-0 right-0 bg-blue-600 text-white px-6 py-2 rounded-bl-2xl text-[8px] font-black uppercase tracking-widest">Active License</div>
                    )}
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{tier}</h4>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{tier === 'free' ? 'Pilot' : tier === 'standard' ? 'Navigator' : 'Fleet Master'}</p>
                      </div>
                      <ul className="space-y-4">
                        {TIER_BENEFITS[tier].map((benefit, i) => (
                          <li key={i} className="flex items-center gap-3 text-[11px] font-bold text-slate-600">
                            <span className="text-blue-500 font-black">✓</span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                      {user?.tier !== tier && (
                        <button className="w-full bg-slate-900 text-white py-4 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg group-hover:bg-blue-600 transition-all">
                          Select Protocol
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 border border-white/10 shadow-3xl">
                <div className="space-y-2 text-center md:text-left">
                  <h4 className="text-2xl font-black uppercase tracking-tighter">Enterprise Logistics</h4>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-sm">Need to manage a fleet of 50+ assets with custom API hooks? Contact our Strategic Solutions node.</p>
                </div>
                <button className="bg-blue-600 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-105 transition-transform shrink-0">
                  Request Intelligence Kit
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Clearance & Meta Column */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-950 rounded-[2rem] p-10 text-white space-y-10 shadow-3xl border border-white/5 relative overflow-hidden group">
             <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
             
             <div className="space-y-2 relative z-10">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Security Clearance</h4>
                <div className="text-4xl font-black text-blue-500 tracking-tighter group-hover:scale-105 transition-transform origin-left">
                  {user?.role.toUpperCase()}
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/10 relative z-10">
                <div className="space-y-1">
                   <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Fleet Assets</div>
                   <div className="text-3xl font-black text-white">{vehicles.length}</div>
                </div>
                <div className="space-y-1">
                   <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Telemetry Logs</div>
                   <div className="text-3xl font-black text-white">{serviceLogs.length}</div>
                </div>
             </div>

             <div className="space-y-6 pt-8 border-t border-white/10 relative z-10">
                <div className="space-y-1.5">
                   <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Last Synced</div>
                   <div className="text-xs font-mono font-bold text-slate-400">{new Date().toLocaleString()}</div>
                </div>
                <div className="space-y-1.5">
                   <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Neural Link Latency</div>
                   <div className="text-xs font-mono font-bold text-emerald-500">14ms (Optimal)</div>
                </div>
             </div>
          </div>

          <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-10 space-y-6 shadow-sm">
            <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.5em]">Account Decommission</h4>
            <p className="text-[11px] text-rose-400 font-bold uppercase tracking-widest leading-relaxed">Liquidating your profile will permanently terminate all digital twins and purge historical telemetry from the cloud.</p>
            <button 
              onClick={handleAccountDeletion} 
              className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all active:scale-95"
            >
              Liquidate Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDossier;
