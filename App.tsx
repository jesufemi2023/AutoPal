
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
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!session) return <AuthScreen />;

  if (currentView === 'onboarding' || currentView === 'edit') {
    return <AssetIntelligenceCenter mode={currentView} />;
  }

  const NavItem = ({ view, label, icon }: { view: any; label: string; icon: string }) => (
    <button 
      onClick={() => setCurrentView(view)}
      className={`flex items-center gap-3 px-4 py-3 w-full transition-all group relative rounded-lg ${currentView === view ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
    >
      <span className="text-lg group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
      {currentView === view && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-600 rounded-full"></div>
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
      {/* Desktop Sidebar - Optimized for information density and persistent Diagnostics */}
      <aside className="hidden lg:flex flex-col w-[320px] bg-white border-r border-slate-100 fixed inset-y-0 z-50 overflow-y-auto scrollbar-hide shadow-sm">
        <div className="p-6 pb-4 shrink-0">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('garage')}>
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-base">A</div>
            <div>
              <span className="block font-black tracking-tighter text-slate-900 text-sm">AutoPal NG</span>
              <span className="block text-[7px] font-black uppercase tracking-widest text-blue-500">Fleet Control</span>
            </div>
          </div>
        </div>

        <nav className="mt-2 space-y-0.5 px-3">
          <NavItem view="garage" label="Dashboard" icon="🏠" />
          <NavItem view="service" label="Service Hub" icon="🛠️" />
          <NavItem view="fuel" label="Fuel Logic" icon="⛽" />
          <NavItem view="marketplace" label="Marketplace" icon="🛒" />
          
          <div className="pt-4 pb-2">
            <p className="px-4 text-[7px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">Management</p>
            <button 
              onClick={() => setCurrentView('onboarding')}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all group rounded-lg"
            >
              <span className="text-lg group-hover:scale-110 transition-transform">➕</span>
              <span className="text-[9px] font-black uppercase tracking-wider">Deploy Asset</span>
            </button>
            {vehicles.length > 0 && (
              <button 
                onClick={handleTuneAction}
                className="flex items-center gap-3 px-4 py-2.5 w-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all group rounded-lg"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">⚙️</span>
                <span className="text-[9px] font-black uppercase tracking-wider">Asset Tuning</span>
              </button>
            )}
          </div>

          {user?.role === 'admin' && (
            <div className="pt-2">
              <p className="px-4 text-[7px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">Core</p>
              <NavItem view="admin" label="Admin Panel" icon="🛡️" />
            </div>
          )}

          {/* AI Diagnostic in Sidebar - Persistent and Accessible */}
          {activeVehicle && (
            <div className="pt-6 px-1">
              <p className="px-4 text-[7px] font-black text-slate-300 uppercase tracking-[0.4em] mb-3">Neural Link Diagnostic</p>
              <div className="px-2">
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

        <div className="p-4 mt-auto border-t border-slate-50 shrink-0 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 text-[9px] font-black uppercase">{user?.email?.[0]}</div>
            <div className="overflow-hidden">
              <span className="block text-[9px] font-black text-slate-900 truncate leading-tight">{user?.email}</span>
              <span className="block text-[7px] font-black text-blue-500 uppercase tracking-widest leading-none">{user?.tier} Class</span>
            </div>
          </div>
          <button 
            onClick={() => supabase?.auth.signOut()}
            className="w-full text-rose-500 hover:bg-rose-50 py-2.5 rounded-lg transition-all text-[8px] font-black uppercase tracking-widest"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area - Fluid horizontal-first behavior */}
      <div className="flex-grow lg:ml-[320px] flex flex-col min-h-screen w-full overflow-x-hidden">
        <main className="p-4 sm:p-6 lg:p-10 max-w-full mx-auto w-full pb-32 lg:pb-10 flex-grow flex flex-col">
          <div className="animate-slide-up w-full flex-grow">
            {currentView === 'garage' && <Dashboard />}
            {currentView === 'service' && <ServiceIntelligenceCenter />}
            {currentView === 'fuel' && <FuelIntelligenceCenter />}
            {currentView === 'marketplace' && <Marketplace />}
            {currentView === 'admin' && <AdminPanel />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation - Compacted for accessibility */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center pb-safe pt-2 shadow-2xl">
        <button onClick={() => setCurrentView('garage')} className={`flex flex-col items-center gap-0.5 flex-1 py-1 ${currentView === 'garage' ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="text-lg">🏠</span>
          <span className="text-[7px] font-black uppercase tracking-wider">Dash</span>
        </button>
        <button onClick={() => setCurrentView('service')} className={`flex flex-col items-center gap-0.5 flex-1 py-1 ${currentView === 'service' ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="text-lg">🛠️</span>
          <span className="text-[7px] font-black uppercase tracking-wider">Hub</span>
        </button>
        <button 
          onClick={() => setCurrentView('onboarding')} 
          className="flex flex-col items-center -translate-y-3 flex-none px-3"
        >
          <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-lg shadow-xl shadow-blue-600/30 border-2 border-white">
            ➕
          </div>
        </button>
        <button onClick={() => setCurrentView('fuel')} className={`flex flex-col items-center gap-0.5 flex-1 py-1 ${currentView === 'fuel' ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="text-lg">⛽</span>
          <span className="text-[7px] font-black uppercase tracking-wider">Fuel</span>
        </button>
        <button onClick={() => setCurrentView('marketplace')} className={`flex flex-col items-center gap-0.5 flex-1 py-1 ${currentView === 'marketplace' ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="text-lg">🛒</span>
          <span className="text-[7px] font-black uppercase tracking-wider">Market</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
