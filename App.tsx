
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
import ProfileDossier from './components/ProfileDossier.tsx';
import LandingTerminal from './components/LandingTerminal.tsx';
import GuestReport from './components/GuestReport.tsx';
import { validateEnv } from './services/envService.ts';
import { fetchUserVehicles } from './services/vehicleService.ts';
import { DiagnosticsPanel } from './components/dashboard/DiagnosticsPanel.tsx';
import { getAdvancedDiagnostic } from './services/geminiService.ts';

const App: React.FC = () => {
  const { 
    session, setSession, isInitialized, setInitialized, 
    user, currentView, setCurrentView, setVehicles, vehicles, activeVehicleId, setEditingVehicle,
    setSuggestedParts, transientVehicle
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

  // Strategic routing logic after login
  useEffect(() => {
    if (session && user) {
      fetchUserVehicles().then((fetchedVehicles) => {
        setVehicles(fetchedVehicles);
        
        // If we're coming from the landing/auth flow, decide the next destination
        if (currentView === 'landing' || currentView === 'garage') {
          if (fetchedVehicles.length === 0) {
            // New User: Send to "Deploy Asset"
            setCurrentView('onboarding');
          } else {
            // Returning User: Send to Dashboard
            setCurrentView('garage');
          }
        }
      }).catch(console.error);
    }
  }, [session, user, setVehicles]);

  if (!isInitialized) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // Unauthenticated Flow
  if (!session) {
    if (currentView === 'report' && transientVehicle) return <GuestReport />;
    // When currentView is 'garage', show AuthScreen
    if (currentView === 'garage') return <AuthScreen />;
    // Default to Landing Page
    return <LandingTerminal />;
  }

  // Authenticated Modal Views
  if (currentView === 'onboarding' || currentView === 'edit') {
    return <AssetIntelligenceCenter mode={currentView} />;
  }

  const NavItem = ({ view, label, icon, isNeural = false }: { view: any; label: string; icon: string; isNeural?: boolean }) => (
    <button 
      onClick={() => setCurrentView(view)}
      className={`flex items-center gap-4 px-5 py-3.5 w-full transition-all group relative ${currentView === view ? 'sidebar-link-active' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
    >
      <span className={`text-lg group-hover:scale-110 transition-transform ${isNeural && 'text-blue-500 animate-pulse'}`}>{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
      {currentView === view && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-600 rounded-l-full"></div>
      )}
    </button>
  );

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
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-lg">A</div>
            <div>
              <span className="block font-black tracking-tighter text-slate-900 text-base">AutoPal NG</span>
              <span className="block text-[7px] font-black uppercase tracking-widest text-blue-500">Fleet Control</span>
            </div>
          </div>
        </div>

        <nav className="mt-4 space-y-0.5 px-3">
          <NavItem view="garage" label="Dashboard" icon="🏠" />
          <NavItem view="diagnostic" label="Neural Diagnostic" icon="✧" isNeural />
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
          </div>

          {user?.role === 'admin' && (
            <div className="pt-4">
              <p className="px-5 text-[7px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">Core</p>
              <NavItem view="admin" label="Admin Panel" icon="🛡️" />
            </div>
          )}
        </nav>

        <div className="p-6 mt-auto border-t border-slate-50 shrink-0 bg-white">
          <button 
            onClick={() => setCurrentView('profile')}
            className={`flex items-center gap-3 mb-4 w-full p-2 rounded-xl transition-all ${currentView === 'profile' ? 'bg-slate-50 border border-slate-100' : 'hover:bg-slate-50'}`}
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-black uppercase">{user?.email?.[0]}</div>
            <div className="overflow-hidden text-left">
              <span className="block text-[9px] font-black text-slate-900 truncate">{user?.displayName || user?.email}</span>
              <span className="block text-[7px] font-black text-blue-500 uppercase tracking-widest">{user?.tier} Class</span>
            </div>
          </button>
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
        <main className={`p-4 sm:p-6 lg:p-10 xl:p-12 max-w-full lg:max-w-7xl mx-auto w-full pb-32 lg:pb-16 flex-grow flex flex-col items-center ${currentView === 'landing' ? '!p-0 !max-w-none' : ''}`}>
          <div className={`animate-slide-up w-full max-w-full ${currentView === 'landing' ? '!max-w-none' : ''}`}>
            {currentView === 'landing' && <LandingTerminal />}
            {currentView === 'garage' && <Dashboard />}
            {currentView === 'service' && <ServiceIntelligenceCenter />}
            {currentView === 'fuel' && <FuelIntelligenceCenter />}
            {currentView === 'marketplace' && <Marketplace />}
            {currentView === 'admin' && <AdminPanel />}
            {currentView === 'profile' && <ProfileDossier />}
            {currentView === 'diagnostic' && activeVehicle && (
              <div className="max-w-4xl mx-auto w-full space-y-8">
                <header className="px-1">
                  <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter mb-1 leading-none uppercase">Neural Link</h1>
                  <p className="text-slate-400 font-black uppercase tracking-widest text-[7px] sm:text-[9px]">JIT Asset Diagnostic Engine v4.1</p>
                </header>
                <DiagnosticsPanel 
                  vehicle={activeVehicle} 
                  symptom={symptom} 
                  setSymptom={setSymptom} 
                  diagImage={diagImage} 
                  setDiagImage={setDiagImage} 
                  isAskingAI={isAskingAI} 
                  onAnalyze={handleAnalyze} 
                  aiAdvice={aiAdvice}
                  compact={false}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center pb-safe pt-2 shadow-2xl">
        <button onClick={() => setCurrentView('garage')} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${currentView === 'garage' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}>
          <span className="text-lg">🏠</span>
          <span className="text-[7px] font-black uppercase tracking-widest">Dash</span>
        </button>
        <button onClick={() => setCurrentView('diagnostic')} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${currentView === 'diagnostic' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}>
          <span className="text-lg">✧</span>
          <span className="text-[7px] font-black uppercase tracking-widest">AI</span>
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
        <button onClick={() => setCurrentView('profile')} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${currentView === 'profile' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}>
          <span className="text-lg">👤</span>
          <span className="text-[7px] font-black uppercase tracking-widest">Pilot</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
