
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { supabase } from '../auth/supabaseClient.ts';

/**
 * ProfileDossier
 * Handles user identity metadata management.
 * Refactored for clear state-driven UI toggling between Read and Edit modes.
 */
const ProfileDossier: React.FC = () => {
  const { user, setUser, vehicles, serviceLogs } = useAutoPalStore();
  
  // UI Flow States
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Local Form State
  const [formData, setFormData] = useState({
    displayName: '',
    phone: ''
  });

  // Sync form data when the user profile is loaded or when exiting edit mode
  useEffect(() => {
    if (user && !isEditing) {
      setFormData({
        displayName: user.displayName || '',
        phone: user.phone || ''
      });
    }
  }, [user, isEditing]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (!supabase) throw new Error("Cloud infrastructure disconnected.");
      
      const { data, error } = await supabase.auth.updateUser({
        data: {
          displayName: formData.displayName,
          phone: formData.phone
        }
      });
      
      if (error) throw error;
      
      // Update global context
      setUser({ 
        ...user, 
        displayName: formData.displayName, 
        phone: formData.phone 
      });
      
      setIsEditing(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to synchronize profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrorMessage(null);
  };

  const handleAccountDeletion = async () => {
    const confirmed = confirm(
      "CAUTION: System Purge Requested. This will permanently delete all vehicle records and telemetry history. Proceed?"
    );
    if (!confirmed) return;

    try {
      if (!supabase) throw new Error("Supabase connection missing.");
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err: any) {
      alert("System Error: " + err.message);
    }
  };

  const stats = {
    assets: vehicles.length,
    records: serviceLogs.length,
    tier: user?.tier.toUpperCase() || 'FREE'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-slide-up px-4 sm:px-0 w-full">
      <header className="px-1">
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter leading-none uppercase">Profile Dossier</h1>
        <p className="text-slate-400 font-black uppercase tracking-widest text-[8px] sm:text-[9px] mt-2">Neural Identity: {user?.id.split('-')[0]}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Profile Card */}
        <div className="lg:col-span-7 bg-white rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-12 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="relative z-10 space-y-10">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-2xl">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Authentication Active</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {user?.displayName || 'Identity Pending'}
                </h3>
                <p className="text-slate-400 font-mono text-[10px] sm:text-xs">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* Field 1: Display Name */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Identity Name</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      placeholder="Enter full name"
                      className="w-full bg-slate-50 border-2 border-blue-100 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:border-blue-600 focus:bg-white transition-all text-slate-900 shadow-inner animate-in fade-in zoom-in-95 duration-300"
                      value={formData.displayName}
                      onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                      autoFocus
                    />
                  ) : (
                    <div className="px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold text-sm">
                      {user?.displayName || <span className="text-slate-300">Not configured</span>}
                    </div>
                  )}
                </div>

                {/* Field 2: Phone Number */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Telemetry</label>
                  {isEditing ? (
                    <input 
                      type="tel" 
                      placeholder="+234..."
                      className="w-full bg-slate-50 border-2 border-blue-100 rounded-2xl px-5 py-4 font-mono font-bold text-sm outline-none focus:border-blue-600 focus:bg-white transition-all text-slate-900 shadow-inner animate-in fade-in zoom-in-95 duration-300"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  ) : (
                    <div className="px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-mono font-bold text-sm">
                      {user?.phone || <span className="text-slate-300">Not configured</span>}
                    </div>
                  )}
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-500 text-[9px] font-black uppercase tracking-widest animate-in slide-in-from-top-2">
                  {errorMessage}
                </div>
              )}

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                {isEditing ? (
                  <>
                    <button 
                      type="submit" 
                      disabled={isSaving} 
                      className="flex-grow bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                          Updating...
                        </>
                      ) : 'Confirm Changes'}
                    </button>
                    <button 
                      type="button" 
                      onClick={handleCancel} 
                      className="px-6 py-4 border-2 border-slate-100 text-slate-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(true)} 
                    className="flex-grow bg-white border-2 border-slate-900 text-slate-900 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    Edit Personal Information
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Info Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-8 shadow-xl border border-white/5 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600"></div>
             <div className="space-y-1">
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Operational License</h4>
                <div className="text-3xl font-black text-blue-500 tracking-tighter">{stats.tier} ACCESS</div>
             </div>
             
             <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div className="space-y-1">
                   <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Digital Twins</div>
                   <div className="text-2xl font-black">{stats.assets}</div>
                </div>
                <div className="space-y-1">
                   <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Ledger Logs</div>
                   <div className="text-2xl font-black">{stats.records}</div>
                </div>
             </div>

             <button className="w-full bg-blue-600/10 border border-blue-500/20 py-4 rounded-xl text-blue-500 text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95">
               Upgrade Fleet Control
             </button>
          </div>

          <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 space-y-4">
            <h4 className="text-[9px] font-black text-rose-500 uppercase tracking-[0.4em]">Account Liquidation</h4>
            <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest leading-relaxed">Liquidating your account will terminate all digital twins and purge history records.</p>
            <button onClick={handleAccountDeletion} className="w-full bg-rose-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95">
              Purge Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDossier;
