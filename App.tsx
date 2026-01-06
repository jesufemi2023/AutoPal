
import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './auth/supabaseClient.ts';
import { useAutoPalStore } from './shared/store.ts';
import AuthScreen from './components/AuthScreen.tsx';
import Dashboard from './components/Dashboard.tsx';
import Marketplace from './components/Marketplace.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import AssetIntelligenceCenter from './components/AssetIntelligenceCenter.tsx';
import { validateEnv } from './services/envService.ts';
import { fetchUserVehicles } from './services/vehicleService.ts';

const App: React.FC = () => {
  const { 
    session, setSession, isInitialized, setInitialized, 
    user, currentView, setCurrentView, setVehicles
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

  // Fetch initial data when session becomes active
  useEffect(() => {
    if (session && user) {
      fetchUserVehicles()
        .then(setVehicles)
        .catch(err => console.error("Initial load failed", err));
    }
  }, [session, user, setVehicles]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="relative animate-pulse-slow">
          <div className="w-16 h-16 blue-gradient rounded-2xl rotate-12 flex items-center justify-center shadow-xl">
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

  // Full-screen flows
  if (currentView === 'onboarding' || currentView === 'edit') {
    return <AssetIntelligenceCenter mode={currentView} />;
  }

  return (
    <div className="min-h-screen bg-[#fcfcfd] pb-32">
      {/* Navigation Top Bar */}
      <nav className="sticky top-0 z-[50] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 blue-gradient rounded-lg flex items-center justify-center text-white font-black text-sm">A</div>
            <span className="font-black tracking-tighter text-slate-900">AutoPal NG</span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-6">
            <button 
              onClick={() => setCurrentView('garage')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'garage' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
            >
              Garage
            </button>
            <button 
              onClick={() => setCurrentView('marketplace')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'marketplace' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
            >
              Market
            </button>
            {user?.role === 'admin' && (
              <button 
                onClick={() => setCurrentView('admin')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'admin' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-rose-600'}`}
              >
                Admin
              </button>
            )}
            <div className="h-6 w-px bg-slate-100 hidden md:block"></div>
            <button 
              onClick={() => supabase?.auth.signOut()}
              className="hidden md:block text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content View Switcher */}
      <main className="max-w-7xl mx-auto px-6 pt-12">
        {currentView === 'garage' && <Dashboard />}
        {currentView === 'marketplace' && <Marketplace />}
        {currentView === 'admin' && <AdminPanel />}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm glass-card border-slate-200 rounded-[2.5rem] p-3 shadow-2xl z-[100] md:hidden">
        <div className="flex justify-around items-center">
          <button onClick={() => setCurrentView('garage')} className={`p-4 rounded-2xl transition-all ${currentView === 'garage' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>
            🏠
          </button>
          <button onClick={() => setCurrentView('marketplace')} className={`p-4 rounded-2xl transition-all ${currentView === 'marketplace' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>
            🛒
          </button>
          <button onClick={() => setCurrentView('onboarding')} className="p-4 rounded-2xl text-slate-400">
            ➕
          </button>
          <button onClick={() => supabase?.auth.signOut()} className="p-4 rounded-2xl text-rose-500">
            🚪
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
