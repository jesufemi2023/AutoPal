
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
import { DiagnosticsPanel } from './components/dashboard/DiagnosticsPanel.tsx';
import { getAdvancedDiagnostic } from './services/geminiService.ts';

const App: React.FC = () => {
  const { 
    session, setSession, isInitialized, setInitialized, 
    user, currentView, setCurrentView, setVehicles, vehicles, activeVehicleId, setEditingVehicle,
    setSuggestedParts
  } = useAutoPalStore();

  const [isAskingAI, setIsAskingAI] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [diagImage, setDiagImage] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<any>(null);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

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
      className={`flex items-center gap-4 px-5 py-3.5 w-full transition-all group relative ${currentView === view ? 'sidebar-link-active' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
    >
      <span className="text-lg group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
      {currentView === view && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-600 rounded-l-full"></div>
      )}
    </button>
  );

  const handleTuneAction = () => {
    if (activeVehicleId) {
      setEditingVehicle(activeVehicleId);
      setCurrentView('edit');
    }
  };

  const handleAnalyze = async () => {
    if (!activeVehicle) return;
    setIsAskingAI(true);
    try {
      const advice = await getAdvancedDiagnostic(activeVehicle, symptom, user?.tier === 'premium', diagImage || undefined);
      setAiAdvice(advice);
      if (advice.partsIdentified) setSuggestedParts(advice.partsIdentified);
    } catch (e) { 
      alert("Neural Analysis Error"); 
    } finally { 
      setIsAskingAI(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[300px] bg-white border-r border-slate-100 fixed inset-y-0 z-50 overflow-y-auto scrollbar-hide">
        <div className="p-8 pb-4 shrink-0">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('garage')}>
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-lg">A</div>
            <div>
              <span className="block font-black tracking-tighter text-slate-900 text-base">AutoPal NG</span>
              <span className="block text-[7px] font-black uppercase tracking-widest text-blue-500">Fleet Control</span>
            </div>
          </div>
        </div>

        <nav className="mt-4 space-y-0.5 px-3">
          <NavItem view="garage" label="Dashboard" icon="🏠" />
          <NavItem view="service" label="Service Hub" icon="🛠️" />
          <NavItem view="fuel" label="Fuel Logic" icon="⛽" />
          <NavItem view="marketplace" label="Marketplace" icon="🛒" />
          
          <div className="pt-6 pb-2">
            <p className="px-5 text-[7px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">Management</p>
            <button 
              onClick={() => setCurrentView('onboarding')}
              className="flex items-center gap-4 px-5 py-3 w-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all group rounded-xl"
            >
              <span className="text-lg group-hover:scale-110 transition-transform">➕</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Deploy Asset</span>
            </button>
            {vehicles.length > 0 && (
              <button 
                onClick={handleTuneAction}
                className="flex items-center gap-4 px-5 py-3 w-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all group rounded-xl"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">⚙️</span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Asset Tuning</span>
              </button>
            )}
          </div>

          {user?.role === 'admin' && (
            <div className="pt-4">
              <p className="px-5 text-[7px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">Core</p>
              <NavItem view="admin" label="Admin Panel" icon="🛡️" />
            </div>
          )}

          {/* AI Diagnostic in Sidebar */}
          {activeVehicle && (
            <div className="pt-6 px-1">
              <p className="px-4 text-[7px] font-black text-slate-300 uppercase tracking-[0.4em] mb-3">Neural Link</p>
              <div className="scale-[0.9] origin-top">
                <DiagnosticsPanel 
                  vehicle={activeVehicle} 
                  symptom={symptom} 
                  setSymptom={setSymptom} 
                  diagImage={diagImage} 
                  setDiagImage={setDiagImage} 
                  isAskingAI={isAskingAI} 
                  onAnalyze={handleAnalyze} 
                  aiAdvice={aiAdvice}
                  compact={true}
                />
              </div>
            </div>
          )}
        </nav>

        <div className="p-6 mt-auto border-t border-slate-50 shrink-0 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 text-[10px] font-black uppercase">{user?.email?.[0]}</div>
            <div className="overflow-hidden">
              <span className="block text-[9px] font-black text-slate-900 truncate">{user?.email}</span>
              <span className="block text-[7px] font-black text-blue-500 uppercase tracking-widest">{user?.tier} Class</span>
            </div>
          </div>
          <button 
            onClick={() => supabase?.auth.signOut()}
            className="w-full text-rose-500 hover:bg-rose-50 p-3 rounded-xl transition-all text-[8px] font-black uppercase tracking-widest"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow lg:ml-[300px] flex flex-col min-h-screen w-full overflow-x-hidden">
        <main className="p-4 sm:p-6 lg:p-10 xl:p-12 max-w-full lg:max-w-7xl mx-auto w-full pb-32 lg:pb-16 flex-grow flex flex-col items-center">
          <div className="animate-slide-up w-full max-w-full">
            {currentView === 'garage' && <Dashboard />}
            {currentView === 'service' && <ServiceIntelligenceCenter />}
            {currentView === 'fuel' && <FuelIntelligenceCenter />}
            {currentView === 'marketplace' && <Marketplace />}
            {currentView === 'admin' && <AdminPanel />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center pb-safe pt-2 shadow-2xl">
        <button onClick={() => setCurrentView('garage')} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${currentView === 'garage' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}>
          <span className="text-lg">🏠</span>
          <span className="text-[7px] font-black uppercase tracking-widest">Dash</span>
        </button>
        <button onClick={() => setCurrentView('service')} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${currentView === 'service' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}>
          <span className="text-lg">🛠️</span>
          <span className="text-[7px] font-black uppercase tracking-widest">Hub</span>
        </button>
        <button 
          onClick={() => setCurrentView('onboarding')} 
          className="flex flex-col items-center -translate-y-4 flex-none px-4"
        >
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-xl shadow-blue-600/30 border-4 border-white">
            ➕
          </div>
        </button>
        <button onClick={() => setCurrentView('fuel')} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${currentView === 'fuel' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}>
          <span className="text-lg">⛽</span>
          <span className="text-[7px] font-black uppercase tracking-widest">Fuel</span>
        </button>
        <button onClick={() => setCurrentView('marketplace')} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${currentView === 'marketplace' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}>
          <span className="text-lg">🛒</span>
          <span className="text-[7px] font-black uppercase tracking-widest">Market</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
