
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
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card card-radius p-8 max-w-sm w-full text-center border-rose-100">
          <h2 className="text-xl font-black mb-2">System Locked</h2>
          <p className="text-slate-500 text-xs mb-6 uppercase tracking-widest">{initError}</p>
          <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px]">Reboot System</button>
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  const NavigationItems = () => (
    <>
      <NavButton tab="dashboard" icon="🏠" label="Garage" />
      <NavButton tab="marketplace" icon="🛒" label="Spares" />
      {useAutoPalStore.getState().user?.role === 'admin' && (
        <NavButton tab="admin" icon="🛡️" label="Admin" />
      )}
    </>
  );

  const NavButton = ({ tab, icon, label }: { tab: typeof activeTab, icon: string, label: string }) => (
    <button 
      onClick={() => setActiveTab(tab)}
      className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-4 px-4 lg:px-6 py-2 lg:py-4 rounded-2xl transition-all w-full lg:w-auto ${
        activeTab === tab 
          ? 'text-blue-600 bg-blue-50 lg:bg-blue-600 lg:text-white shadow-lg shadow-blue-500/10' 
          : 'text-slate-400 hover:text-slate-600 lg:hover:bg-slate-50'
      }`}
    >
      <span className="text-xl lg:text-base">{icon}</span>
      <span className="text-[10px] lg:text-sm font-black uppercase tracking-widest lg:normal-case lg:tracking-normal">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 sticky top-0 h-screen p-8 shrink-0">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl">A</div>
          <span className="text-2xl font-black tracking-tighter">AutoPal</span>
        </div>
        
        <nav className="flex-grow space-y-2">
          <NavigationItems />
        </nav>

        <div className="pt-8 border-t border-slate-50 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${session.user.email}`} alt="User" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black truncate">{session.user.email}</p>
              <button onClick={() => supabase?.auth.signOut()} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors">Logout</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 h-16 px-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">A</div>
          <span className="font-black tracking-tighter">AutoPal</span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden ring-2 ring-slate-50">
          <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${session.user.email}`} alt="Avatar" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow min-w-0">
        <div className="max-w-6xl mx-auto px-4 lg:px-12 py-8 lg:py-12 pb-28 lg:pb-12">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'marketplace' && <Marketplace />}
          {activeTab === 'admin' && <AdminPanel />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-6 left-6 right-6 z-50">
        <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] border border-slate-100 shadow-2xl p-2 flex justify-around items-center ring-1 ring-black/5">
          <NavigationItems />
        </div>
      </nav>
    </div>
  );
};

export default App;
