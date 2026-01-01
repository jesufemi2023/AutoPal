import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './auth/supabaseClient.ts';
import { useAutoPalStore } from './shared/store.ts';
import AuthScreen from './components/AuthScreen.tsx';
import Dashboard from './components/Dashboard.tsx';
import Marketplace from './components/Marketplace.tsx';
import AdminPanel from './components/AdminPanel.tsx';

/**
 * AutoPal NG - Core Application Controller
 * Handles authentication lifecycle, routing, and environment verification.
 */
const App: React.FC = () => {
  const { 
    session, setSession, isInitialized, setInitialized, 
    isRecovering, setRecovering 
  } = useAutoPalStore();
  
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'marketplace' | 'admin'>('dashboard');
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    /** Bootstraps authentication and listens for session changes */
    const initAuth = async () => {
      // 1. Validate Infrastructure
      if (!isSupabaseConfigured) {
        setInitError("Incomplete Configuration: SUPABASE_URL or ANON_KEY is missing from environment.");
        setInitialized(true);
        return;
      }

      try {
        if (!supabase) return;

        // 2. Identify Entry Vector (Standard Login vs Password Recovery)
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
          setRecovering(true);
        }

        // 3. Hydrate Session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setInitialized(true);

        // 4. Real-time Auth Subscription
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.debug(`[Auth Event] ${event}`);
          
          if (event === 'PASSWORD_RECOVERY') {
            setRecovering(true);
          }
          
          if (event === 'SIGNED_OUT') {
            setRecovering(false);
            setSession(null);
          }

          if (event === 'SIGNED_IN') {
            // Distinguish Google OAuth from Recovery redirects
            const isActuallyRecovering = window.location.hash.includes('type=recovery');
            if (!isActuallyRecovering) {
              setRecovering(false);
            }
            
            // Clean URL for security and aesthetics
            if (window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname);
            }
            setSession(session);
          }

          if (event === 'USER_UPDATED' && session) {
            setSession(session);
          }
        });

        return () => subscription.unsubscribe();
      } catch (err: any) {
        console.error("Critical Auth Initialization Error:", err);
        setInitError("The authentication server could not be reached. Check your network or configuration.");
        setInitialized(true);
      }
    };

    initAuth();
  }, [setSession, setInitialized, setRecovering]);

  // Loading State
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl animate-spin-slow"></div>
            <div className="absolute inset-0 flex items-center justify-center text-white font-black text-xl">A</div>
          </div>
          <div className="text-center">
            <p className="text-slate-900 font-bold text-lg">Waking up AutoPal...</p>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Vehicle Intelligence</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-red-50 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 text-3xl mx-auto mb-8">⚠️</div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">Connection Failed</h2>
          <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">
            {initError}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-xl"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Routing Control
  if (isRecovering || !session) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Global Navigation */}
      <nav className="bg-white/80 border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-10">
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30">A</div>
                <span className="text-2xl font-black text-slate-900 tracking-tighter">AutoPal<span className="text-blue-600">NG</span></span>
              </div>
              
              <div className="hidden md:flex space-x-2">
                <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>🏠 Dashboard</button>
                <button onClick={() => setActiveTab('marketplace')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'marketplace' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>🛒 Marketplace</button>
                {session.user.user_metadata?.role === 'admin' && (
                  <button onClick={() => setActiveTab('admin')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'admin' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>⚡ Admin</button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <button 
                onClick={() => supabase?.auth.signOut()}
                className="text-[10px] font-black text-slate-400 hover:text-red-500 transition uppercase tracking-widest"
              >
                Sign Out
              </button>
              <div className="h-11 w-11 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 shadow-inner">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`} alt="Profile" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Primary Context Area */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'marketplace' && <Marketplace />}
        {activeTab === 'admin' && <AdminPanel />}
      </main>
      
      {/* Platform Status Bar */}
      <footer className="bg-white border-t border-slate-100 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">AutoPal NG Platform v1.0.0-PROD</p>
        </div>
      </footer>
    </div>
  );
};

export default App;