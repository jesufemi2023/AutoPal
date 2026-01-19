
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { supabase } from '../auth/supabaseClient.ts';

const ProfileDossier: React.FC = () => {
  const { user, setUser, vehicles, serviceLogs } = useAutoPalStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!supabase) throw new Error("Infrastructure sync failure. Supabase client is not available.");
      
      // 1. UPDATE PUBLIC TABLE (Uses snake_case lowercase columns)
      const { error: dbError } = await supabase
        .from('Users')
        .update({ 
          display_name: formData.displayName, 
          phone: formData.phone 
        })
        .eq('id', user.id);
      
      if (dbError) {
        console.error("DB Update Error:", dbError);
        throw new Error(dbError.message || "Failed to update profile record in database.");
      }

      // 2. UPDATE AUTH METADATA (Ensures the change persists across logins)
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: { 
          display_name: formData.displayName, 
          phone: formData.phone 
        }
      });
      
      if (authError) {
        console.error("Auth Metadata Update Error:", authError);
        throw new Error(authError.message || "Failed to synchronize authentication metadata.");
      }
      
      if (authData?.user) {
        setUser({
          ...user,
          displayName: formData.displayName,
          phone: formData.phone
        });
        setSuccessMessage("Pilot Identity Synchronized ✓");
        setTimeout(() => {
          setIsEditing(false);
          setSuccessMessage(null);
        }, 1500);
      }
    } catch (err: any) {
      console.error("[Profile Update Fault]", err);
      setErrorMessage(err.message || "Profile update rejected. Check database connectivity.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-slide-up px-4 w-full pb-20">
      <header className="space-y-2">
        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 uppercase tracking-tighter">Account <span className="text-blue-600">Profile</span></h1>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Manage your pilot identity and credentials</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <section className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-sm border border-slate-100 relative">
            {errorMessage && (
              <div className="mb-8 p-5 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                ⚠️ Error: {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="mb-8 p-5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                ✓ {successMessage}
              </div>
            )}
            
            <form onSubmit={handleUpdate} className="space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Full Identity</label>
                  <input 
                    type="text" 
                    placeholder="Alex Johnson" 
                    required 
                    className={`w-full bg-slate-50 border-2 rounded-2xl px-6 py-5 font-black text-slate-900 outline-none transition-all ${isEditing ? 'border-blue-100 focus:border-blue-500 focus:bg-white shadow-inner' : 'border-transparent cursor-not-allowed opacity-60'}`} 
                    value={formData.displayName} 
                    onChange={e => setFormData({ ...formData, displayName: e.target.value })} 
                    disabled={!isEditing || isSaving} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Comms Link (Phone)</label>
                  <input 
                    type="tel" 
                    placeholder="+234..." 
                    className={`w-full bg-slate-50 border-2 rounded-2xl px-6 py-5 font-mono font-bold text-slate-900 outline-none transition-all ${isEditing ? 'border-blue-100 focus:border-blue-500 focus:bg-white shadow-inner' : 'border-transparent cursor-not-allowed opacity-60'}`} 
                    value={formData.phone} 
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                    disabled={!isEditing || isSaving} 
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                {isEditing ? (
                  <>
                    <button 
                      type="submit" 
                      disabled={isSaving} 
                      className="flex-grow bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-4 disabled:opacity-50 active:scale-95 shadow-blue-500/20"
                    >
                      {isSaving ? (
                        <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : 'Synchronize Identity'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setIsEditing(false); setErrorMessage(null); }} 
                      className="px-10 py-5 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] hover:text-slate-900 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(true)} 
                    className="flex-grow bg-slate-950 text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-blue-600 transition-all active:scale-95"
                  >
                    Modify Pilot Details
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-950 rounded-[2.5rem] p-10 text-white space-y-10 shadow-3xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-10 text-7xl transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12 select-none pointer-events-none">🛡️</div>
             <div className="relative z-10 space-y-6">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.5em]">System Permissions</h4>
                <div className="space-y-4">
                   <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pilot Role</span>
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{user?.role}</span>
                   </div>
                   <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">License Tier</span>
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{user?.tier}</span>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fleet Size</span>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{vehicles.length} Units</span>
                   </div>
                </div>
             </div>
             <div className="pt-6 border-t border-white/5 relative z-10">
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                  Your profile data is encrypted and distributed across the AutoPal NG secure cloud infrastructure.
                </p>
             </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 p-8 space-y-6">
             <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-[0.3em]">Operational Metrics</h4>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-5 rounded-2xl">
                   <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Services</div>
                   <div className="text-2xl font-black text-slate-900">{serviceLogs.length}</div>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl">
                   <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Health Avg</div>
                   <div className="text-2xl font-black text-blue-600">
                      {vehicles.length > 0 
                        ? Math.round(vehicles.reduce((acc, v) => acc + v.healthScore, 0) / vehicles.length) 
                        : 100}%
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDossier;
