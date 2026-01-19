
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { UserProfile } from '../shared/types.ts';

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
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <section className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-sm border border-slate-100">
            <form onSubmit={handleUpdate} className="space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <input type="text" placeholder="Name" required className="w-full bg-slate-50 border-2 rounded-2xl px-6 py-5 font-bold" value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })} disabled={!isEditing} />
                <input type="tel" placeholder="Phone" className="w-full bg-slate-50 border-2 rounded-2xl px-6 py-5 font-mono" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} disabled={!isEditing} />
              </div>
              <div className="flex gap-4">
                {isEditing ? (
                  <button type="submit" className="flex-grow bg-blue-600 text-white py-5 rounded-2xl font-black uppercase">Save</button>
                ) : (
                  <button type="button" onClick={() => setIsEditing(true)} className="flex-grow bg-slate-900 text-white py-5 rounded-2xl font-black uppercase">Edit Details</button>
                )}
              </div>
            </form>
          </section>
        </div>
        <div className="lg:col-span-4">
          <div className="bg-slate-950 rounded-[2rem] p-10 text-white space-y-10 shadow-3xl">
             <h4 className="text-[10px] font-black uppercase text-slate-500">Fleet Stats</h4>
             <div className="grid grid-cols-2 gap-6">
                <div>
                   <p className="text-xs">Vehicles</p>
                   <p className="text-4xl font-black">{vehicles.length}</p>
                </div>
                <div>
                   <p className="text-xs">Logs</p>
                   <p className="text-4xl font-black">{serviceLogs.length}</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDossier;
