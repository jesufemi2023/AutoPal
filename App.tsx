
import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './auth/supabaseClient.ts';
import { useAutoPalStore } from './shared/store.ts';
import AuthScreen from './components/AuthScreen.tsx';
import Dashboard from './components/Dashboard.tsx';
import Marketplace from './components/Marketplace.tsx';
import AdminPanel from './components/AdminPanel.tsx';

/**
 * AutoPal NG
 * Main Entry point with Protected Route Logic.
 */
const App: React.FC = () => {
  const { session, setSession, isInitialized, setInitialized } = useAutoPalStore();
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'marketplace' | 'admin'>('dashboard');
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      if (!isSupabaseConfigured) {
        setInitError("Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY) are missing. Please configure them to continue.");
        setInitialized(true);
        return;
      }

      try {
        if (!supabase) return;

        // 1. Check current session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setInitialized(true);

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
        });

        return () => subscription.unsubscribe();
      } catch (err: any) {
        console.error("Initialization Error:", err);
        setInitError("Failed to connect to authentication services. Check console for details.");
        setInitialized(true);
      }
    };

    initAuth();
  }, [setSession, setInitialized]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse w-12 h-12 bg-blue-600 rounded-2xl"></div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Initializing AutoPal...</p>
        </div>
      </div>
    );
  }

  if (initError || !isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 font-black text-2xl mx-auto mb-6">
            !
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Setup Required</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            {initError || "Supabase configuration is missing."} 
            <br/><br/>
            Please ensure <strong>SUPABASE_URL</strong> and <strong>SUPABASE_ANON_KEY</strong> are provided in your environment.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition"
            >
              Retry Connection
            </button>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">AutoPal NG v1.0.0-MVP</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  // Unified UI Shell for Authenticated Users
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-8">
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30">A</div>
                <span className="text-2xl font-black text-slate-900 tracking-tighter">AutoPal<span className="text-blue-600">NG</span></span>
              </div>
              
              <div className="hidden md:flex space-x-2">
                <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>🏠 Dashboard</button>
                <button onClick={() => setActiveTab('marketplace')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'marketplace' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>🛒 Marketplace</button>
                {session.user.user_metadata?.role === 'admin' && (
                  <button onClick={() => setActiveTab('admin')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'admin' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>⚡ Admin</button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => supabase?.auth.signOut()}
                className="text-xs font-bold text-slate-400 hover:text-red-500 transition"
              >
                Sign Out
              </button>
              <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`} alt="Avatar" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'marketplace' && <Marketplace />}
        {activeTab === 'admin' && <AdminPanel />}
      </main>
    </div>
  );
};

export default App;
