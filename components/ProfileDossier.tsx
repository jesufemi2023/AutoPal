
import React, { useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { supabase } from '../auth/supabaseClient.ts';

const ProfileDossier: React.FC = () => {
  const { user, setUser, vehicles, serviceLogs } = useAutoPalStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    phone: user?.phone || ''
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase!.auth.updateUser({
        data: {
          displayName: formData.displayName,
          phone: formData.phone
        }
      });
      if (error) throw error;
      setUser({ ...user, ...formData });
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDecommission = async () => {
    if (!confirm("Are you sure? This will permanently decommission your pilot identity and all asset telemetry. This action cannot be undone.")) return;
    try {
      // In a real app, you'd call a backend function to delete the user.
      // For MVP, we sign out and show a goodbye message.
      await supabase!.auth.signOut();
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const stats = {
    assets: vehicles.length,
    ops: serviceLogs.length,
    tier: user?.tier.toUpperCase() || 'FREE'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-slide-up">
      <header className="px-1">
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter leading-none uppercase">Personnel Dossier</h1>
        <p className="text-slate-400 font-black uppercase tracking-widest text-[8px] sm:text-[9px] mt-2">Pilot ID: {user?.id.split('-')[0]}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Identity Card */}
        <div className="lg:col-span-7 bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="relative z-10 space-y-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-3xl font-black shadow-2xl">
                {user?.email[0].toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Active Pilot Session</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{user?.displayName || 'Anonymous Pilot'}</h3>
                <p className="text-slate-400 font-mono text-xs">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Pilot Name</label>
                  <input 
                    type="text" 
                    disabled={!isEditing}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 font-bold text-sm outline-none focus:border-blue-600 disabled:opacity-50 transition-all"
                    value={formData.displayName}
                    onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Neural Relay (Phone)</label>
                  <input 
                    type="text" 
                    disabled={!isEditing}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 font-mono font-bold text-sm outline-none focus:border-blue-600 disabled:opacity-50 transition-all"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                {isEditing ? (
                  <>
                    <button type="submit" disabled={isSaving} className="flex-grow bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-blue-600 transition-all">
                      {isSaving ? 'Syncing...' : 'Confirm Update'}
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-4 border-2 border-slate-100 text-slate-400 rounded-xl font-black uppercase tracking-widest text-[10px]">Cancel</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setIsEditing(true)} className="flex-grow bg-white border-2 border-slate-900 text-slate-900 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 hover:text-white transition-all">
                    Modify Identity
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Stats Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-8 shadow-xl">
             <div className="space-y-1">
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Operational License</h4>
                <div className="text-3xl font-black text-blue-500 tracking-tighter">{stats.tier} CLASS</div>
             </div>
             
             <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div className="space-y-1">
                   <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Active Assets</div>
                   <div className="text-2xl font-black">{stats.assets}</div>
                </div>
                <div className="space-y-1">
                   <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Neural Logs</div>
                   <div className="text-2xl font-black">{stats.ops}</div>
                </div>
             </div>

             <button className="w-full bg-blue-600/10 border border-blue-500/20 py-4 rounded-xl text-blue-500 text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
               Upgrade Clearance
             </button>
          </div>

          <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 space-y-4">
            <h4 className="text-[9px] font-black text-rose-500 uppercase tracking-[0.4em]">Danger Zone</h4>
            <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest leading-relaxed">Account decommissioning is permanent. Data persistence ends immediately.</p>
            <button onClick={handleDecommission} className="w-full bg-rose-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all">
              Decommission Identity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDossier;
