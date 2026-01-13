
import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './auth/supabaseClient.ts';
import { useAutoPalStore } from './shared/store.ts';
import AuthScreen from './components/AuthScreen.tsx';
import Dashboard from './Dashboard.tsx';
import Marketplace from './components/Marketplace.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import FuelIntelligenceCenter from './components/FuelIntelligenceCenter.tsx';
import ServiceIntelligenceCenter from './components/ServiceIntelligenceCenter.tsx';
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
        <div className="relative animate-pulse">
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
        <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center border border-rose-100 shadow-xl">
          <h2 className="text-xl font-black mb-2 text-rose-600 uppercase tracking-tighter">Access Denied</h2>
          <p className="text-slate-500 text-[10px] mb-6 uppercase tracking-widest leading-relaxed">
            {initError}
          </p>
          <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px]">Retry Initialization</button>
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  if (currentView === 'onboarding' || currentView === 'edit') {
    return <AssetIntelligenceCenter mode={currentView} />;
  }

  const NavItem = ({ view, label, icon }: { view: typeof currentView; label: string; icon: string }) => (
    <button 
      onClick={() => setCurrentView(view)}
      className={`flex items-center gap-4 px-6 py-4 w-full transition-all duration-200 group relative ${currentView === view ? 'sidebar-link-active' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
    >
      <span className="text-xl transition-transform group-hover:scale-110">{icon}</span>
      <span className="text-[11px] font-black uppercase tracking-[0.2em]">{label}</span>
      {currentView === view && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-600 rounded-r-full shadow-[2px_0_8px_rgba(37,99,235,0.4)]"></div>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-slate-100 fixed inset-y-0 z-50">
        <div className="p-8 shrink-0">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentView('garage')}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg transition-transform group-hover:rotate-6 shadow-lg shadow-blue-200">A</div>
            <div>
              <span className="block font-black tracking-tighter text-slate-900 text-lg leading-tight">AutoPal NG</span>
              <span className="block text-[8px] font-black uppercase tracking-[0.3em] text-blue-500">Intelligence Garage</span>
            </div>
          </div>
        </div>

        <nav className="flex-grow mt-4 space-y-1 px-4">
          <NavItem view="garage" label="Garage Command" icon="🏠" />
          <NavItem view="service" label="Service Hub" icon="🛠️" />
          <NavItem view="fuel" label="Fuel Logic" icon="⛽" />
          <NavItem view="marketplace" label="Marketplace" icon="🛒" />
          {user?.role === 'admin' && (
            <NavItem view="admin" label="Admin Center" icon="🛡️" />
          )}
        </nav>

        <div className="p-6 mt-auto border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-4 px-2 py-3 bg-slate-50 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-900 text-xs font-black uppercase tracking-tighter border border-slate-200 shadow-sm">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className="block text-[10px] font-black text-slate-900 truncate">{user?.email}</span>
              <span className="block text-[8px] font-black text-blue-500 uppercase tracking-widest">{user?.tier} Member</span>
            </div>
          </div>
          <button 
            onClick={() => supabase?.auth.signOut()}
            className="w-full flex items-center gap-4 px-6 py-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow lg:ml-[280px] flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-[40] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3" onClick={() => setCurrentView('garage')}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">A</div>
            <span className="font-black tracking-tighter text-slate-900 text-sm">AutoPal NG</span>
          </div>
          <button 
            onClick={() => supabase?.auth.signOut()}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] border border-slate-200"
          >
            👋
          </button>
        </header>

        <main className="p-6 sm:p-10 lg:p-14 max-w-7xl mx-auto w-full pb-32 lg:pb-14">
          {currentView === 'garage' && <Dashboard />}
          {currentView === 'service' && <ServiceIntelligenceCenter />}
          {currentView === 'fuel' && <FuelIntelligenceCenter />}
          {currentView === 'marketplace' && <Marketplace />}
          {currentView === 'admin' && <AdminPanel />}
        </main>
      </div>

      {/* Mobile Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[50] bg-white border-t border-slate-100 px-4 py-3 flex justify-around items-center pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <button onClick={() => setCurrentView('garage')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${currentView === 'garage' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}>
          <span className="text-xl">🏠</span>
          <span className="text-[8px] font-black uppercase tracking-widest">Garage</span>
        </button>
        <button onClick={() => setCurrentView('service')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${currentView === 'service' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}>
          <span className="text-xl">🛠️</span>
          <span className="text-[8px] font-black uppercase tracking-widest">Service</span>
        </button>
        <button onClick={() => setCurrentView('fuel')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${currentView === 'fuel' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}>
          <span className="text-xl">⛽</span>
          <span className="text-[8px] font-black uppercase tracking-widest">Fuel</span>
        </button>
        <button onClick={() => setCurrentView('marketplace')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${currentView === 'marketplace' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}>
          <span className="text-xl">🛒</span>
          <span className="text-[8px] font-black uppercase tracking-widest">Market</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
