
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
      if (!supabase) throw new Error("Connection Error.");
      
      const { error: dbError } = await supabase
        .from('Users')
        .update({ "Display name": formData.displayName, "Phone": formData.phone })
        .eq('id', user.id);
      
      if (dbError) throw dbError;

      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: { "Display name": formData.displayName, "Phone": formData.phone }
      });
      
      if (authError) throw authError;
      
      if (authData?.user) {
        setUser({
          ...user,
          displayName: authData.user.user_metadata?.['Display name'] || formData.displayName,
          phone: authData.user.user_metadata?.['Phone'] || formData.phone
        });
        setSuccessMessage("Profile updated successfully.");
        setTimeout(() => setIsEditing(false), 1500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Update failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-slide-up px-4 w-full pb-20">
      <header className="space-y-2">
        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 uppercase">Account <span className="text-blue-600">Profile</span></h1>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Manage your Pilot Identity</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <section className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-sm border border-slate-100">
            {errorMessage && <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold">{errorMessage}</div>}
            {successMessage && <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold">{successMessage}</div>}
            
            <form onSubmit={handleUpdate} className="space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input type="text" placeholder="Name" required className="w-full bg-slate-50 border-2 rounded-2xl px-6 py-5 font-bold outline-none focus:border-blue-500" value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })} disabled={!isEditing} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Contact</label>
                  <input type="tel" placeholder="Phone" className="w-full bg-slate-50 border-2 rounded-2xl px-6 py-5 font-mono outline-none focus:border-blue-500" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} disabled={!isEditing} />
                </div>
              </div>
              <div className="flex gap-4">
                {isEditing ? (
                  <>
                    <button type="submit" disabled={isSaving} className="flex-grow bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-blue-700 transition-all">{isSaving ? 'Saving...' : 'Save Changes'}</button>
                    <button type="button" onClick={() => setIsEditing(false)} className="px-8 py-5 text-slate-400 font-black uppercase tracking-widest text-[10px]">Cancel</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setIsEditing(true)} className="flex-grow bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-blue-600 transition-all">Edit Pilot Details</button>
                )}
              </div>
            </form>
          </section>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-slate-950 rounded-[2rem] p-10 text-white space-y-10 shadow-3xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-10 text-6xl">📊</div>
             <div className="relative z-10 space-y-6">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Fleet Intelligence</h4>
                <div className="grid grid-cols-2 gap-6">
                   <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Vehicles</p>
                      <p className="text-4xl font-black text-blue-500 tracking-tighter">{vehicles.length}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Operations</p>
                      <p className="text-4xl font-black text-emerald-500 tracking-tighter">{serviceLogs.length}</p>
                   </div>
                </div>
             </div>
             <div className="pt-8 border-t border-white/5 relative z-10">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Your digital twin network is fully synchronized with the AutoPal NG secure cloud.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDossier;
