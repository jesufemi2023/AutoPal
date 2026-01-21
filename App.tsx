
import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './auth/supabaseClient.ts';
import { useAutoPalStore } from './shared/store.ts';
import AuthScreen from './components/AuthScreen.tsx';
import Dashboard from './Dashboard.tsx';
import Marketplace from './components/Marketplace.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import FuelIntelligenceCenter from './components/dashboard/FuelIntelligenceCenter.tsx';
import ServiceIntelligenceCenter from './components/dashboard/ServiceIntelligenceCenter.tsx';
import AssetIntelligenceCenter from './components/AssetIntelligenceCenter.tsx';
import ProfileDossier from './components/ProfileDossier.tsx';
import GlobalReportingCenter from './components/GlobalReportingCenter.tsx';
import LandingTerminal from './components/LandingTerminal.tsx';
import GuestReport from './components/GuestReport.tsx';
import { validateEnv } from './services/envService.ts';
import { fetchUserVehicles, archiveVehicle } from './services/vehicleService.ts';
import { DiagnosticsPanel } from './components/dashboard/DiagnosticsPanel.tsx';
import { getAdvancedDiagnostic } from './services/geminiService.ts';
import { CalibrationTerminal } from './components/CalibrationTerminal.tsx';
import { PlanGuard } from './components/PlanGuard.tsx';
import { Car, Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const { 
    session, setSession, isInitialized, setInitialized, isSyncing, loadLocalData, hasDirtyData, triggerSync,
    user, setUser, currentView, setCurrentView, setVehicles, vehicles, activeVehicleId, setEditingVehicle,
    transientVehicle, removeVehicleStore, reset
  } = useAutoPalStore();

  const [isAskingAI, setIsAskingAI] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [diagImage, setDiagImage] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isManagePanelOpen, setIsManagePanelOpen] = useState(false);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  useEffect(() => { 
    validateEnv();
    loadLocalData();
  }, []);

  // Sync session and fetch full user profile (including updated roles)
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
        
        if (currentSession?.user) {
          const { data: profile } = await supabase
            .from('Users')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
          
          if (profile) {
            setUser({
              id: currentSession.user.id,
              email: currentSession.user.email || '',
              displayName: profile.display_name || '',
              phone: profile.phone || '',
              tier: profile.tier || 'free',
              role: profile.role || 'user',
              onboarded: profile.onboarded || false,
              createdAt: profile.created_at || ''
            });
          }
        }

        setInitialized(true);
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          setSession(session);
          if (!session) {
            reset();
          } else {
            const { data: profile } = await supabase.from('Users').select('*').eq('id', session.user.id).single();
            if (profile) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                displayName: profile.display_name || '',
                phone: profile.phone || '',
                tier: profile.tier || 'free',
                role: profile.role || 'user',
                onboarded: profile.onboarded || false,
                createdAt: profile.created_at || ''
              });
            }
          }
        });
        return () => subscription.unsubscribe();
      } catch (err) {
        setInitialized(true);
      }
    };
    initAuth();
  }, [setSession, setInitialized, reset, setUser]);

  useEffect(() => {
    if (session && user && vehicles.length === 0) {
      fetchUserVehicles().then((fetchedVehicles) => {
        if (fetchedVehicles.length > 0) setVehicles(fetchedVehicles);
        const isTransitioning = currentView === 'landing' || currentView === 'garage';
        if (isTransitioning) {
          if (fetchedVehicles.length === 0) setCurrentView('onboarding');
          else setCurrentView('garage');
        }
      }).catch(console.error);
    }
  }, [session?.user?.id, user?.id]);

  const handleSignOut = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      await reset();
      setIsMobileMenuOpen(false);
      setIsManagePanelOpen(false);
      setCurrentView('landing');
    } catch (e) {
      console.error("Signout Error:", e);
      window.location.reload(); 
    }
  };

  const closeManagement = () => setIsManagePanelOpen(false);

  const handleArchiveAsset = async () => {
    if (!activeVehicleId || !activeVehicle) return;
    const confirmed = confirm(`DELETE VEHICLE: Remove ${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}?`);
    if (!confirmed) return;

    try {
      await archiveVehicle(activeVehicleId);
      removeVehicleStore(activeVehicleId);
      closeManagement();
      setCurrentView('garage');
    } catch (e: any) {
      alert(`System Error: ${e.message}`);
    }
  };

  const handleEditAsset = () => {
    if (!activeVehicleId) return;
    setEditingVehicle(activeVehicleId);
    closeManagement();
    setCurrentView('edit');
  };

  const NavItem = ({ view, label, icon, isNeural = false }: { view: any; label: string; icon: string; isNeural?: boolean }) => (
    <button 
      onClick={() => { 
        setCurrentView(view); 
        setIsMobileMenuOpen(false); 
        closeManagement();
      }}
      className={`flex items-center gap-4 px-5 py-3.5 w-full transition-all group relative rounded-xl ${currentView === view ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
    >
      <span className={`text-lg group-hover:scale-110 transition-transform ${isNeural && 'text-blue-500 animate-pulse'}`}>{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
      {currentView === view && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>}
    </button>
  );

  const SyncShield = () => (
    <button 
      onClick={() => hasDirtyData && triggerSync()}
      disabled={isSyncing}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all ${
        isSyncing 
          ? 'bg-blue-50 border-blue-100 text-blue-500' 
          : hasDirtyData 
            ? 'bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100' 
            : 'bg-emerald-50 border-emerald-100 text-emerald-600 opacity-60'
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${
        isSyncing ? 'bg-blue-500 animate-pulse' : hasDirtyData ? 'bg-amber-500 animate-bounce' : 'bg-emerald-500'
      }`}></div>
      {isSyncing ? 'Vaulting...' : hasDirtyData ? 'Sync Needed' : 'Synced'}
    </button>
  );

  const NavigationMenu = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between px-5 mb-4">
          <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.4em]">Navigation</p>
          <SyncShield />
        </div>
        <NavItem view="garage" label="Garage Overview" icon="🏠" />
        <NavItem view="diagnostic" label="AI Mechanic" icon="✧" isNeural />
        <NavItem view="service" label="Service History" icon="🛠️" />
        <NavItem view="fuel" label="Fuel Tracker" icon="⛽" />
        <NavItem view="marketplace" label="Find Parts" icon="🛒" />
      </div>

      <div className="pt-4 border-t border-slate-100 mx-2">
        <p className="px-5 text-[7px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">Reports & Audit</p>
        <NavItem view="report" label="Ownership Report" icon="📄" />
        <NavItem view="profile" label="Pilot Profile" icon="👤" />
        {user?.role === 'admin' && <NavItem view="admin" label="Admin Command" icon="⚡" />}
        
        <button 
          onClick={() => setIsManagePanelOpen(!isManagePanelOpen)} 
          className={`mt-2 flex items-center justify-between w-full px-5 py-4 rounded-2xl transition-all group border ${isManagePanelOpen ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:bg-slate-50 border-transparent'}`}
        >
          <div className="flex items-center gap-4">
            <span className={`text-lg transition-transform ${isManagePanelOpen ? 'rotate-90 text-blue-400' : 'group-hover:rotate-12'}`}>⚙</span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Vehicle Controls</span>
          </div>
          <span className={`text-[10px] transition-transform duration-300 ${isManagePanelOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
      </div>
    </div>
  );

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

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <header className="lg:hidden h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-[100] w-full">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
          <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-950 rounded-lg flex items-center justify-center text-white shadow-md">
            <Car size={18} strokeWidth={2.5} />
          </div>
          <span className="font-black tracking-tighter text-slate-900 text-sm">AutoPal NG</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-900 p-2 hover:bg-slate-50 rounded-lg transition-colors">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-[110] bg-slate-950/20 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Sidebar Navigation */}
      <aside className={`fixed lg:sticky top-0 left-0 z-[120] h-screen w-[300px] bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 pb-6 shrink-0 bg-white">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setCurrentView('landing'); setIsMobileMenuOpen(false); }}>
            <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-950 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Car size={22} strokeWidth={2.5} />
            </div>
            <div>
              <span className="block font-black tracking-tighter text-slate-900 text-base mb-1">AutoPal NG</span>
              <span className="block text-[7px] font-black uppercase tracking-widest text-blue-500">Master Fleet</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-8 bg-white"><NavigationMenu /></nav>
        <div className="p-6 mt-auto border-t border-slate-50 shrink-0 bg-white">
           <button onClick={handleSignOut} className="w-full text-rose-500 hover:bg-rose-50 p-3 rounded-xl transition-all text-[8px] font-black uppercase tracking-widest text-center">🚪 Sign Out</button>
        </div>
      </aside>

      {/* Slide-out Control Panel (Secondary Menu) */}
      <div 
        className={`fixed top-0 bottom-0 w-[280px] bg-white border-r border-slate-100 shadow-[40px_0_60px_-15px_rgba(0,0,0,0.1)] z-[150] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] pt-24 px-6 ${isManagePanelOpen ? 'left-[300px] opacity-100' : 'left-[20px] opacity-0 pointer-events-none translate-x-[-50px]'}`}
      >
        <div className="mb-10 px-2">
          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em] mb-1.5">Fleet Ops</h4>
          <div className="w-10 h-1 bg-blue-600 rounded-full"></div>
        </div>
        <div className="space-y-1">
          <button onClick={() => { setCurrentView('onboarding'); closeManagement(); setIsMobileMenuOpen(false); }} className="w-full p-4 text-left text-blue-600 text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 rounded-xl transition-all">+ Add New Asset</button>
          {activeVehicle && (
            <>
              <button onClick={() => { handleEditAsset(); setIsMobileMenuOpen(false); }} className="w-full p-4 text-left text-slate-600 text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all">✎ Modify Specs</button>
              <button onClick={() => { handleArchiveAsset(); setIsMobileMenuOpen(false); }} className="w-full p-4 text-left text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all">📁 Decommission</button>
            </>
          )}
        </div>
        <button onClick={closeManagement} className="absolute bottom-10 left-6 right-6 p-4 text-slate-400 text-[8px] font-black uppercase tracking-widest hover:text-slate-900 transition-colors border-t border-slate-50 pt-8">Close Panel</button>
      </div>

      {/* Main Layout Area */}
      <div className="flex-grow flex flex-col min-h-screen w-full overflow-x-hidden">
        <main className={`p-4 sm:p-6 lg:p-10 xl:p-12 max-w-full lg:max-w-7xl mx-auto w-full pb-32 lg:pb-16 flex-grow flex flex-col items-center ${currentView === 'landing' ? '!p-0 !max-w-none' : ''}`}>
          <div className={`animate-slide-up w-full max-w-full ${currentView === 'landing' ? '!max-w-none' : ''}`}>
            {currentView === 'landing' && <LandingTerminal />}
            {currentView === 'garage' && <Dashboard />}
            {currentView === 'service' && <ServiceIntelligenceCenter />}
            {currentView === 'fuel' && <FuelIntelligenceCenter />}
            {currentView === 'marketplace' && <Marketplace />}
            {currentView === 'admin' && <AdminPanel />}
            {currentView === 'profile' && <ProfileDossier />}
            {currentView === 'report' && (
              <PlanGuard requirement={(t) => t !== 'free'} fallbackMode="blur" label="Ownership Intelligence">
                <GlobalReportingCenter />
              </PlanGuard>
            )}
            {currentView === 'diagnostic' && activeVehicle && (
              <div className="max-w-4xl mx-auto w-full space-y-8">
                <header className="px-1">
                  <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter mb-1 leading-none uppercase">AI Diagnostics</h1>
                  <p className="text-slate-400 font-black uppercase tracking-widest text-[7px] sm:text-[9px]">Neural Mechanical Link</p>
                </header>
                <DiagnosticsPanel 
                  vehicle={activeVehicle} 
                  symptom={symptom} 
                  setSymptom={setSymptom} 
                  diagImage={diagImage} 
                  setDiagImage={setDiagImage} 
                  isAskingAI={isAskingAI} 
                  onAnalyze={async () => {
                    if (!activeVehicle) return;
                    setIsAskingAI(true);
                    try {
                      const advice = await getAdvancedDiagnostic(activeVehicle, symptom, user?.tier === 'premium', diagImage || undefined);
                      setAiAdvice(advice);
                    } catch (e) { alert("Neural Fail"); } finally { setIsAskingAI(false); }
                  }} 
                  aiAdvice={aiAdvice}
                  compact={false}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center pb-safe pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <button onClick={() => { setCurrentView('garage'); setIsMobileMenuOpen(false); }} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${currentView === 'garage' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}><span className="text-lg">🏠</span><span className="text-[7px] font-black uppercase tracking-widest">Garage</span></button>
        <button onClick={() => { setCurrentView('diagnostic'); setIsMobileMenuOpen(false); }} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${currentView === 'diagnostic' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}><span className="text-lg">✧</span><span className="text-[7px] font-black uppercase tracking-widest">Repair</span></button>
        <button onClick={() => { setCurrentView('onboarding'); setIsMobileMenuOpen(false); }} className="flex flex-col items-center -translate-y-4 flex-none px-4"><div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-xl border-4 border-white"><Car size={24} strokeWidth={2.5} /></div></button>
        <button onClick={() => { setCurrentView('fuel'); setIsMobileMenuOpen(false); }} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${currentView === 'fuel' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}><span className="text-lg">⛽</span><span className="text-[7px] font-black uppercase tracking-widest">Fuel</span></button>
        <button onClick={() => { setCurrentView('report'); setIsMobileMenuOpen(false); }} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${currentView === 'report' ? 'text-blue-600 scale-105' : 'text-slate-400'}`}><span className="text-lg">📄</span><span className="text-[7px] font-black uppercase tracking-widest">Report</span></button>
      </nav>

      <CalibrationTerminal />
    </div>
  );
};

export default App;
