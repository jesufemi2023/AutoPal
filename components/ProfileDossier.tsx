
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { deleteAccountPermanently } from '../auth/authService.ts';
import { Tier, UserProfile } from '../shared/types.ts';

/**
 * ProfileDossier
 * User profile and account management component.
 * Handles Tier switching and personal information updates.
 */
const ProfileDossier: React.FC = () => {
  const { user, setUser, reset, setCurrentView } = useAutoPalStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'subscription'>('info');
  
  const [formData, setFormData] = useState({
    displayName: '',
    phone: ''
  });

  useEffect(() => {
    if (user && !isEditing && !isSaving) {
      setFormData({
        displayName: user.displayName || '',
        phone: user.phone || ''
      });
    }
  }, [user, isEditing, isSaving]);

  const handleTierChange = async (newTier: Tier) => {
    if (!user || user.tier === newTier) return;
    
    setIsUpgrading(newTier);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!supabase) throw new Error("Connection Error: Cloud link offline.");

      const { error } = await supabase
        .from('Users')
        .update({ tier: newTier })
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, tier: newTier });
      setSuccessMessage(`Pilot license upgraded to ${newTier.toUpperCase()}`);
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upgrade tier. Security restriction or connection fault.");
    } finally {
      setIsUpgrading(null);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!supabase) throw new Error("Connection Error: Cloud link offline.");
      
      // 1. Update public profile table
      const { error: dbError } = await supabase
        .from('Users')
        .update({ 
          display_name: formData.displayName, 
          phone: formData.phone 
        })
        .eq('id', user.id);
      
      if (dbError) throw new Error(dbError.message || "Database update failed. Check RLS policies.");

      // 2. Update Auth metadata (Triggers global re-render via App.tsx)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          display_name: formData.displayName,
          phone: formData.phone
        }
      });
      
      if (authError) throw new Error(authError.message || "Identity synchronization failed.");
      
      // 3. Clear local editing state immediately BEFORE store updates trigger re-renders
      setIsEditing(false);
      setIsSaving(false);
      setSuccessMessage("Profile synchronized successfully.");
      
      // 4. Update local Zustand store
      setUser({
        ...user,
        displayName: formData.displayName,
        phone: formData.phone
      });
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Profile Sync Error:", err);
      setErrorMessage(err.message || "A system synchronization fault occurred.");
      setIsSaving(false);
    }
  };

  const handleAccountDeletion = async () => {
    if (!user?.id) return;
    
    const confirmationText = "DELETE MY ACCOUNT";
    const input = window.prompt(
      `CRITICAL ACTION: This will permanently delete all vehicles and history.\n\nType "${confirmationText}" to proceed.`
    );

    if (input !== confirmationText) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteAccountPermanently(user.id);
      await reset();
      setCurrentView('landing');
    } catch (err: any) {
      setErrorMessage("System Error: Failed to decommission account.");
      setIsDeleting(false);
    }
  };

  const TIER_BENEFITS: Record<Tier, string[]> = {
    free: ["1 Vehicle Profile", "Manual Maintenance Logs", "Basic Fuel Tracking"],
    standard: ["3 Vehicle Profiles", "AI Maintenance Roadmap", "Advanced Fuel Analytics", "PDF & Excel Exports"],
    premium: ["10 Vehicle Profiles", "Deep AI Condition Audits", "Full Ownership Reports", "Priority Support"]
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-slide-up px-4 sm:px-0 w-full pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter leading-none uppercase">Account <span className="text-blue-600">Profile</span></h1>
          <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[8px] sm:text-[9px]">Pilot License: {user?.tier.toUpperCase()}</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          <button onClick={() => setActiveTab('info')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'info' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Details</button>
          <button onClick={() => setActiveTab('subscription')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'subscription' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Upgrade Plan</button>
        </div>
      </header>

      {errorMessage && (
        <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-12">
          {activeTab === 'info' ? (
            <section className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-sm border border-slate-100 relative overflow-hidden group">
              <div className="relative z-10 space-y-12">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-900 flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-2xl border-4 border-slate-800">
                      {user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none">{user?.displayName || 'Unnamed Pilot'}</h3>
                      <p className="text-slate-400 font-mono text-xs sm:text-sm tracking-tight">{user?.email}</p>
                    </div>
                  </div>
                  {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="bg-slate-50 border border-slate-100 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-blue-600 hover:text-white transition-all">Edit Info</button>
                  )}
                </div>

                <form onSubmit={handleUpdate} className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        type="text" 
                        required 
                        disabled={!isEditing || isSaving} 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-bold text-sm outline-none focus:border-blue-600 transition-all disabled:opacity-60" 
                        value={formData.displayName} 
                        onChange={e => setFormData({ ...formData, displayName: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                      <input 
                        type="tel" 
                        disabled={!isEditing || isSaving} 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-mono font-bold text-sm outline-none focus:border-blue-600 transition-all disabled:opacity-60" 
                        value={formData.phone} 
                        onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                      />
                    </div>
                  </div>
                  {isEditing && (
                    <div className="flex gap-4">
                      <button 
                        type="submit" 
                        disabled={isSaving} 
                        className="flex-grow bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSaving && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                        {isSaving ? 'Synchronizing...' : 'Save Profile'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setIsEditing(false); setIsSaving(false); }} 
                        className="px-10 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[11px]"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </section>
          ) : (
            <section className="space-y-8 animate-slide-up">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(['free', 'standard', 'premium'] as Tier[]).map((tier) => (
                  <div key={tier} className={`bg-white rounded-[2rem] p-8 border-4 transition-all relative overflow-hidden flex flex-col ${user?.tier === tier ? 'border-blue-600 shadow-2xl' : 'border-slate-100'}`}>
                    <div className="space-y-6 flex-grow">
                      <div className="space-y-1">
                        <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{tier}</h4>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{tier === 'free' ? 'Standard' : tier === 'standard' ? 'Enthusiast' : 'Enterprise'}</p>
                      </div>
                      <ul className="space-y-4">
                        {TIER_BENEFITS[tier].map((benefit, i) => (
                          <li key={i} className="flex items-center gap-3 text-[11px] font-bold text-slate-600">
                            <span className="text-blue-500 font-black">✓</span> {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button 
                      onClick={() => handleTierChange(tier)}
                      disabled={user?.tier === tier || isUpgrading !== null}
                      className={`mt-10 w-full py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-3 ${user?.tier === tier ? 'bg-emerald-50 text-emerald-600 cursor-default' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-lg active:scale-95 disabled:opacity-70'}`}
                    >
                      {isUpgrading === tier ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : user?.tier === tier ? 'Active Plan' : 'Activate Plan'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      
      <div className="pt-20 border-t border-slate-100">
         <div className="bg-rose-50 p-8 sm:p-12 rounded-[2.5rem] border border-rose-100 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center sm:text-left">
              <h4 className="text-xl font-black text-rose-600 uppercase tracking-tighter">Nuclear Option</h4>
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-relaxed max-w-md">
                Permanently decommission your pilot account. This will wipe all vehicles and records from the cloud.
              </p>
            </div>
            <button 
              onClick={handleAccountDeletion} 
              disabled={isDeleting}
              className="bg-rose-600 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-rose-700 transition-all active:scale-95 flex items-center gap-4 disabled:opacity-50"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : "Purge Account Data"}
            </button>
         </div>
      </div>
    </div>
  );
};

export default ProfileDossier;
