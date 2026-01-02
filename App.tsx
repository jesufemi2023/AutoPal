
import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './auth/supabaseClient.ts';
import { useAutoPalStore } from './shared/store.ts';
import { fetchUserVehicles } from './services/vehicleService.ts';
import AuthScreen from './components/AuthScreen.tsx';
import Dashboard from './components/Dashboard.tsx';
import Marketplace from './components/Marketplace.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import { validateEnv } from './services/envService.ts';

const App: React.FC = () => {
  const { 
    session, setSession, isInitialized, setInitialized, 
    setVehicles, hydrateFromLocal 
  } = useAutoPalStore();
  
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'marketplace' | 'admin'>('dashboard');
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    validateEnv();
    hydrateFromLocal();
  }, [hydrateFromLocal]);

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
            setVehicles([]);
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
  }, [setSession, setInitialized, setVehicles]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserVehicles(session.user.id).then(setVehicles).catch(console.error);
    }
  }, [session, setVehicles]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcfcfd]">
        <div className="relative animate-pulse-slow">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl rotate-12 flex items-center justify-center shadow-2xl shadow-blue-500/40">
            <span className="text-white font-black text-3xl -rotate-12">A</span>
          </div>
        </div>
        <p className="mt-8 text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Initializing Garage</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card card-radius p-10 max-w-sm w-full text-center border-red-100">
          <h2 className="text-2xl font-black mb-2">Setup Required</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">{initError}</p>
          <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]">Retry Bootstrap</button>
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  const NavButton = ({ tab, icon, label }: { tab: typeof activeTab, icon: string, label: string }) => (
    <button 
      onClick={() => setActiveTab(tab)}
      className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-4 md:px-6 py-2 md:py-3 rounded-2xl transition-all ${activeTab === tab ? 'text-blue-600 bg-blue-50 md:bg-slate-900 md:text-white' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <span className="text-xl md:text-lg">{icon}</span>
      <span className="text-[10px] md:text-sm font-black uppercase tracking-widest md:normal-case md:tracking-normal">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#fcfcfd] pb-24 md:pb-0">
      {/* Desktop Header */}
      <nav className="hidden md:block sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-8 h-24 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">A</div>
              <span className="text-2xl font-black tracking-tighter">AutoPal<span className="text-blue-600">NG</span></span>
            </div>
            <div className="flex gap-2">
              <NavButton tab="dashboard" icon="🏠" label="Garage" />
              <NavButton tab="marketplace" icon="🛒" label="Spares" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => supabase?.auth.signOut()} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors">Logout</button>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden ring-4 ring-slate-50">
              <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${session.user.email}`} alt="Avatar" />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <nav className="md:hidden sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 h-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg">A</div>
          <span className="text-xl font-black tracking-tighter">AutoPal</span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden">
          <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${session.user.email}`} alt="Avatar" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'marketplace' && <Marketplace />}
        {activeTab === 'admin' && <AdminPanel />}
      </main>

      {/* Mobile Tab Bar */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 z-[100]">
        <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] border border-slate-100 shadow-2xl p-2 flex justify-around items-center">
          <NavButton tab="dashboard" icon="🏠" label="Garage" />
          <NavButton tab="marketplace" icon="🛒" label="Spares" />
        </div>
      </div>
    </div>
  );
};

export default App;
