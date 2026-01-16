
import React, { useEffect, useState, useRef } from 'react';
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
import { fetchUserVehicles, archiveVehicle } from './services/vehicleService.ts';
import { DiagnosticsPanel } from './components/dashboard/DiagnosticsPanel.tsx';
import { getAdvancedDiagnostic } from './services/geminiService.ts';

const App: React.FC = () => {
  const { 
    session, setSession, isInitialized, setInitialized, 
    user, currentView, setCurrentView, setVehicles, vehicles, activeVehicleId, setEditingVehicle,
    setSuggestedParts, transientVehicle, removeVehicleStore
  } = useAutoPalStore();

  const [isAskingAI, setIsAskingAI] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [diagImage, setDiagImage] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  useEffect(() => { validateEnv(); }, []);

  /**
   * INITIAL AUTH LOAD
   */
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

  /**
   * STRATEGIC ROUTING
   */
  useEffect(() => {
    if (session && user) {
      fetchUserVehicles().then((fetchedVehicles) => {
        setVehicles(fetchedVehicles);
        const isTransitioning = currentView === 'landing' || currentView === 'garage';
        if (isTransitioning) {
          if (fetchedVehicles.length === 0) {
            setCurrentView('onboarding');
          } else {
            setCurrentView('garage');
          }
        }
      }).catch(console.error);
    }
  }, [session?.user?.id, user?.id, setVehicles]);

  const handleArchiveAsset = async () => {
    if (!activeVehicleId || !activeVehicle) return;
    const confirmed = confirm(
      `DELETE VEHICLE: Are you sure you want to remove the ${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}? This will archive all service and fuel history.`
    );
    if (!confirmed) return;

    try {
      await archiveVehicle(activeVehicleId);
      removeVehicleStore(activeVehicleId);
      setIsSettingsOpen(false);
      setIsMobileMenuOpen(false);
      setCurrentView('garage');
    } catch (e: any) {
      alert(`System Error: ${e.message}`);
    }
  };

  const handleEditAsset = () => {
    if (!activeVehicleId) return;
    setEditingVehicle(activeVehicleId);
    setIsSettingsOpen(false);
    setIsMobileMenuOpen(false);
    setCurrentView('edit');
  };

  if (!isInitialized) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!session) {
    if (currentView === 'report' && transientVehicle) return <GuestReport />;
    if (currentView === 'garage') return <AuthScreen />;
    return <LandingTerminal />;
  }

  if (currentView === 'onboarding' || currentView === 'edit') {
    return <AssetIntelligenceCenter mode={currentView} />;
  }

  const NavItem = ({ view, label, icon, isNeural = false }: { view: any; label: string; icon: string; isNeural?: boolean }) => (
    <button 
      onClick={() => {
        setCurrentView(view);
        setIsSettingsOpen(false);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center gap-4 px-5 py-3.5 w-full transition-all group relative ${currentView === view ? 'sidebar-link-active' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
    >
      <span className={`text-lg group-hover:scale-110 transition-transform ${isNeural && 'text-blue-500 animate-pulse'}`}>{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
      {currentView === view && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-600 rounded-l-full"></div>
      )}
    </button>
  );

  const NavigationMenu = () => (
    <>
      <div className="pb-4">
        <p className="px-5 text-[7px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2 mt-2">Navigation</p>
        <NavItem view="garage" label="Dashboard" icon="🏠" />
        <NavItem view="diagnostic" label="AI Diagnostic" icon="✧" isNeural />
        <NavItem view="service" label="Service History" icon="🛠️" />
        <NavItem view="fuel" label="Fuel Tracker" icon="⛽" />
        <NavItem view="marketplace" label="Shop Parts" icon="🛒" />
      </div>

      <div className="pt-4 border-t border-slate-50 mx-2">
        <button 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={`flex items-center justify-between w-full px-5 py-4 rounded-2xl transition-all group border ${isSettingsOpen ? 'bg-slate-50 border-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 border-transparent'}`}
        >
          <div className="flex items-center gap-4">
            <span className={`text-lg transition-transform ${isSettingsOpen ? 'rotate-90 text-blue-600' : 'group-hover:rotate-12'}`}>⚙</span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Vehicle Settings</span>
          </div>
          <span className={`text-[10px] transition-transform duration-300 ${isSettingsOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>

        <div className={`transition-all duration-300 overflow-hidden ${isSettingsOpen ? 'max-h-[400px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
          <div className="bg-slate-50/50 rounded-2xl p-2 space-y-0.5 border border-slate-100/50 ml-2">
            <button 
              onClick={() => {
                setCurrentView('onboarding');
                setIsSettingsOpen(false);
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-4 px-4 py-3 w-full text-blue-600 hover:bg-white transition-all group rounded-xl"
            >
              <span className="text-base group-hover:scale-110">➕</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Add a Vehicle</span>
            </button>

            {activeVehicle && (
              <>
                <button 
                  onClick={handleEditAsset}
                  className="flex items-center gap-4 px-4 py-3 w-full text-slate-600 hover:text-blue-600 hover:bg-white transition-all group rounded-xl"
                >
                  <span className="text-base group-hover:scale-110">✎</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Update Details</span>
                </button>
                <button 
                  onClick={handleArchiveAsset}
                  className="flex items-center gap-4 px-4 py-3 w-full text-rose-500 hover:bg-rose-50 transition-all group rounded-xl"
                >
                  <span className="text-base group-hover:scale-110">📁</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Remove Vehicle</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {user?.role === 'admin' && (
        <div className="pt-6">
          <p className="px-5 text-[7px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">Admin Tools</p>
          <NavItem view="admin" label="Admin Panel" icon="🛡️" />
        </div>
      )}
    </>
  );

  const handleAnalyze = async () => {
    if (!activeVehicle) return;
    setIsAskingAI(true);
    try {
      const advice = await getAdvancedDiagnostic(activeVehicle, symptom, user?.tier === 'premium', diagImage || undefined);
      setAiAdvice(advice);
      if (advice.partsIdentified) setSuggestedParts(advice.partsIdentified);
    } catch (e) { 
      alert("AI Assistant error. Please try again."); 
    } finally { 
      setIsAskingAI(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-[100] w-full">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md">A</div>
          <span className="font-black tracking-tighter text-slate-900 text-sm">AutoPal NG</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-slate-900 p-2 focus:outline-none"
          aria-label="Menu"
        >
          <div className="w-6 h-5 relative flex flex-col justify-between">
            <span className={`w-full h-0.5 bg-slate-900 transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`w-full h-0.5 bg-slate-900 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`w-full h-0.5 bg-slate-900 transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </div>
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      <div 
        className={`lg:hidden fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-[110] transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <aside 
          className={`w-[280px] h-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8 pb-6 flex justify-between items-center border-b border-slate-50">
            <div>
              <span className="block font-black tracking-tighter text-slate-900 text-base leading-none mb-1">AutoPal NG</span>
              <span className="block text-[7px] font-black uppercase tracking-widest text-blue-500">Navigation Hub</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 text-2xl font-light">×</button>
          </div>
          <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 space-y-0.5 py-6">
            <NavigationMenu />
          </nav>
          <div className="p-6 border-t border-slate-50">
            <button 
              onClick={() => {
                setCurrentView('profile');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 mb-4 w-full p-2 rounded-xl transition-all ${currentView === 'profile' ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-black uppercase shadow-inner">{user?.email?.[0]}</div>
              <div className="text-left overflow-hidden">
                <span className="block text-[9px] font-black text-slate-900 truncate">{user?.displayName || user?.email}</span>
                <span className="block text-[7px] font-black text-blue-500 uppercase tracking-widest">{user?.tier} Member</span>
              </div>
            </button>
            <button 
              onClick={() => supabase?.auth.signOut()}
              className="w-full text-rose-500 hover:bg-rose-50 p-3 rounded-xl transition-all text-[8px] font-black uppercase tracking-widest text-center"
            >
              🚪 Sign Out
            </button>
          </div>
        </aside>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[300px] bg-white border-r border-slate-100 fixed inset-y-0 z-50 overflow-hidden">
        {/* Fixed Header */}
        <div className="p-8 pb-6 shrink-0">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-slate-900/20">A</div>
            <div>
              <span className="block font-black tracking-tighter text-slate-900 text-base leading-none mb-1">AutoPal NG</span>
              <span className="block text-[7px] font-black uppercase tracking-widest text-blue-500">My Garage</span>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 space-y-0.5 pb-8">
          <NavigationMenu />
        </nav>

        {/* Fixed Footer */}
        <div className="p-6 mt-auto border-t border-slate-50 shrink-0 bg-white">
          <button 
            onClick={() => {
              setCurrentView('profile');
              setIsSettingsOpen(false);
            }}
            className={`flex items-center gap-3 mb-4 w-full p-2 rounded-xl transition-all ${currentView === 'profile' ? 'bg-slate-50 border border-slate-100' : 'hover:bg-slate-50'}`}
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-black uppercase shadow-inner">{user?.email?.[0]}</div>
            <div className="overflow-hidden text-left">
              <span className="block text-[9px] font-black text-slate-900 truncate">{user?.displayName || user?.email}</span>
              <span className="block text-[7px] font-black text-blue-500 uppercase tracking-widest">{user?.tier} Member</span>
            </div>
          </button>
          <button 
            onClick={() => supabase?.auth.signOut()}
            className="w-full text-rose-500 hover:bg-rose-50 p-3 rounded-xl transition-all text-[8px] font-black uppercase tracking-widest border border-transparent hover:border-rose-100"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow lg:ml-[300px] flex flex-col min-h-screen w-full overflow-x-hidden">
        <main 
          onClick={() => {
            setIsSettingsOpen(false);
            setIsMobileMenuOpen(false);
          }}
          className={`p-4 sm:p-6 lg:p-10 xl:p-12 max-w-full lg:max-w-7xl mx-auto w-full pb-32 lg:pb-16 flex-grow flex flex-col items-center ${currentView === 'landing' ? '!p-0 !max-w-none' : ''}`}
        >
          <div className={`animate-slide-up w-full max-w-full ${currentView === 'landing' ? '!max-w-none' : ''}`}>
            {currentView === 'landing' && <LandingTerminal />}
            {currentView === 'garage' && <Dashboard />}
            {currentView === 'service' && <ServiceIntelligenceCenter logs={vehicles.length > 0 ? useAutoPalStore.getState().serviceLogs.filter(l => l.vehicleId === activeVehicleId) : []} />}
            {currentView === 'fuel' && <FuelIntelligenceCenter logs={vehicles.length > 0 ? useAutoPalStore.getState().fuelLogs.filter(l => l.vehicleId === activeVehicleId) : []} />}
            {currentView === 'marketplace' && <Marketplace />}
            {currentView === 'admin' && <AdminPanel />}
            {currentView === 'profile' && <ProfileDossier />}
            {currentView === 'diagnostic' && activeVehicle && (
              <div className="max-w-4xl mx-auto w-full space-y-8">
                <header className="px-1">
                  <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter mb-1 leading-none uppercase">AI Diagnostic Assistant</h1>
                  <p className="text-slate-400 font-black uppercase tracking-widest text-[7px] sm:text-[9px]">Intelligent System Analysis</p>
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
          <span className="text-[7px] font-black uppercase tracking-widest">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
