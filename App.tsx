
import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './auth/supabaseClient.ts';
import { useAutoPalStore } from './shared/store.ts';
import AuthScreen from './components/AuthScreen.tsx';
import { validateEnv } from './services/envService.ts';

const App: React.FC = () => {
  const { 
    session, setSession, isInitialized, setInitialized, user
  } = useAutoPalStore();
  
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    validateEnv();
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (!isSupabaseConfigured) {
        setInitError("Configuration Error: Missing Cloud Keys.");
        setInitialized(true);
        return;
      }
      try {
        if (!supabase) return;
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setInitialized(true);
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') {
            setSession(null);
          } else {
            setSession(session);
          }
        });
        return () => subscription.unsubscribe();
      } catch (err) {
        setInitError("Network Error: Could not connect to auth services.");
        setInitialized(true);
      }
    };
    initAuth();
  }, [setSession, setInitialized]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="relative animate-pulse-slow">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl rotate-12 flex items-center justify-center shadow-xl">
            <span className="text-white font-black text-2xl -rotate-12">A</span>
          </div>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="glass-card card-radius p-8 max-w-sm w-full text-center border-rose-100">
          <h2 className="text-xl font-black mb-2 text-rose-600">Access Denied</h2>
          <p className="text-slate-500 text-[10px] mb-6 uppercase tracking-widest leading-relaxed">
            {initError}
          </p>
          <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px]">Retry Initialization</button>
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full animate-slide-up">
        <div className="bg-white card-radius p-10 md:p-14 shadow-2xl border border-slate-100 text-center space-y-8">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto shadow-inner">
            👤
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Identity Verified</h2>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Session Key: Active</p>
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left">
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated Account</div>
            <div className="text-sm font-bold text-slate-900 truncate">{user?.email}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-slate-100 rounded-xl">
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tier</div>
              <div className="text-xs font-black text-blue-600 uppercase tracking-wider">{user?.tier || 'Free'}</div>
            </div>
            <div className="p-4 bg-white border border-slate-100 rounded-xl">
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</div>
              <div className="text-xs font-black text-emerald-600 uppercase tracking-wider">Online</div>
            </div>
          </div>

          <button 
            onClick={() => supabase?.auth.signOut()}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-rose-600 transition-all active:scale-95"
          >
            Sign Out of Instance
          </button>
        </div>

        <footer className="mt-8 text-center">
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">AutoPal NG Kernel v4.0.0-Stable</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
