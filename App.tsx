
import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './auth/supabaseClient.ts';
import { useAutoPalStore } from './shared/store.ts';
import { fetchUserVehicles } from './services/vehicleService.ts';
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
    isRecovering, setRecovering, setVehicles 
  } = useAutoPalStore();
  
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'marketplace' | 'admin'>('dashboard');
  const [initError, setInitError] = useState<string | null>(null);

  // 1. Auth Bootstrap
  useEffect(() => {
    const initAuth = async () => {
      if (!isSupabaseConfigured) {
        setInitError("Incomplete Configuration: SUPABASE_URL or ANON_KEY is missing.");
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
            setVehicles([]);
          } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            setSession(session);
          }
        });

        return () => subscription.unsubscribe();
      } catch (err: any) {
        setInitError("The authentication server could not be reached.");
        setInitialized(true);
      }
    };

    initAuth();
  }, [setSession, setInitialized, setVehicles]);

  // 2. Data Hydration: Fetch vehicles on session
  useEffect(() => {
    if (session?.user?.id) {
      const loadUserData = async () => {
        try {
          const vList = await fetchUserVehicles(session.user.id);
          setVehicles(vList);
        } catch (e) {
          console.error("Data Hydration Failed:", e);
        }
      };
      loadUserData();
    }
  }, [session, setVehicles]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center text-white font-black text-xl">A</div>
          </div>
          <div className="text-center">
            <p className="text-slate-900 font-bold text-lg">Initializing Garage...</p>
          </div>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 text-center">
        <div className="max-w-md bg-white p-10 rounded-[2.5rem] shadow-xl border border-red-50">
          <h2 className="text-2xl font-black mb-4">Infrastructure Error</h2>
          <p className="text-slate-500 mb-8">{initError}</p>
          <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Retry</button>
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <nav className="bg-white/80 border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30">A</div>
              <span className="text-2xl font-black text-slate-900 tracking-tighter">AutoPal<span className="text-blue-600">NG</span></span>
            </div>
            <div className="hidden md:flex gap-2">
              <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>🏠 Dashboard</button>
              <button onClick={() => setActiveTab('marketplace')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'marketplace' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>🛒 Marketplace</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => supabase?.auth.signOut()} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500">Sign Out</button>
             <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`} alt="User" />
             </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'marketplace' && <Marketplace />}
        {activeTab === 'admin' && <AdminPanel />}
      </main>
    </div>
  );
};

export default App;
