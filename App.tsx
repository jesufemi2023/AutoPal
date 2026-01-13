
import React, { useEffect } from 'react';
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

  useEffect(() => { validateEnv(); }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (!isSupabaseConfigured) {
        setInitialized(true);
        return;
      }
      try {
        if (!supabase) return;
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setInitialized(true);
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          setSession(session);
        });
        return () => subscription.unsubscribe();
      } catch (err) {
        setInitialized(true);
      }
    };
    initAuth();
  }, [setSession, setInitialized]);

  useEffect(() => {
    if (session && user) {
      fetchUserVehicles().then(setVehicles).catch(console.error);
    }
  }, [session, user, setVehicles]);

  if (!isInitialized) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!session) return <AuthScreen />;

  if (currentView === 'onboarding' || currentView === 'edit') {
    return <AssetIntelligenceCenter mode={currentView} />;
  }

  const NavItem = ({ view, label, icon }: { view: any; label: string; icon: string }) => (
    <button 
      onClick={() => setCurrentView(view)}
      className={`flex items-center gap-4 px-6 py-4.5 w-full transition-all group relative ${currentView === view ? 'sidebar-link-active' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
    >
      <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-[11px] font-black uppercase tracking-[0.2em]">{label}</span>
      {currentView === view && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-600 rounded-l-full"></div>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-slate-100 fixed inset-y-0 z-50">
        <div className="p-10 pb-6 shrink-0">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setCurrentView('garage')}>
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl">A</div>
            <div>
              <span className="block font-black tracking-tighter text-slate-900 text-lg">AutoPal NG</span>
              <span className="block text-[8px] font-black uppercase tracking-widest text-blue-500">Fleet Control</span>
            </div>
          </div>
        </div>

        <nav className="flex-grow mt-6 space-y-1 px-4 overflow-y-auto scrollbar-hide">
          <NavItem view="garage" label="Dashboard" icon="🏠" />
          <NavItem view="service" label="Service Hub" icon="🛠️" />
          <NavItem view="fuel" label="Fuel Logic" icon="⛽" />
          <NavItem view="marketplace" label="Marketplace" icon="🛒" />
          {user?.role === 'admin' && <NavItem view="admin" label="Admin" icon="🛡️" />}
        </nav>

        <div className="p-8 mt-auto border-t border-slate-50">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 text-xs font-black uppercase">{user?.email?.[0]}</div>
            <div className="overflow-hidden">
              <span className="block text-[10px] font-black text-slate-900 truncate">{user?.email}</span>
              <span className="block text-[8px] font-black text-blue-500 uppercase tracking-widest">{user?.tier} Class</span>
            </div>
          </div>
          <button 
            onClick={() => supabase?.auth.signOut()}
            className="w-full text-rose-500 hover:bg-rose-50 p-4 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow lg:ml-[280px] flex flex-col min-h-screen">
        <main className="p-6 sm:p-12 lg:p-16 max-w-7xl mx-auto w-full pb-32 lg:pb-16 flex-grow">
          <div className="animate-slide-up">
            {currentView === 'garage' && <Dashboard />}
            {currentView === 'service' && <ServiceIntelligenceCenter />}
            {currentView === 'fuel' && <FuelIntelligenceCenter />}
            {currentView === 'marketplace' && <Marketplace />}
            {currentView === 'admin' && <AdminPanel />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center pb-safe pt-3 shadow-lg">
        <button onClick={() => setCurrentView('garage')} className={`flex flex-col items-center gap-1.5 flex-1 ${currentView === 'garage' ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="text-xl">🏠</span>
          <span className="text-[9px] font-black uppercase tracking-widest">Dash</span>
        </button>
        <button onClick={() => setCurrentView('service')} className={`flex flex-col items-center gap-1.5 flex-1 ${currentView === 'service' ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="text-xl">🛠️</span>
          <span className="text-[9px] font-black uppercase tracking-widest">Hub</span>
        </button>
        <button onClick={() => setCurrentView('fuel')} className={`flex flex-col items-center gap-1.5 flex-1 ${currentView === 'fuel' ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="text-xl">⛽</span>
          <span className="text-[9px] font-black uppercase tracking-widest">Fuel</span>
        </button>
        <button onClick={() => setCurrentView('marketplace')} className={`flex flex-col items-center gap-1.5 flex-1 ${currentView === 'marketplace' ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="text-xl">🛒</span>
          <span className="text-[9px] font-black uppercase tracking-widest">Market</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
