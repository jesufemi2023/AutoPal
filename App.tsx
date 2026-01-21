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
import { fetchUserVehicles } from './services/vehicleService.ts';
import { DiagnosticsPanel } from './components/dashboard/DiagnosticsPanel.tsx';
import { getAdvancedDiagnostic } from './services/geminiService.ts';
import { CalibrationTerminal } from './components/CalibrationTerminal.tsx';
import { Car, Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const { 
    session, setSession, isInitialized, setInitialized, loadLocalData,
    user, setUser, currentView, setCurrentView, setVehicles, vehicles, activeVehicleId, 
    transientVehicle, reset
  } = useAutoPalStore();

  const [isAskingAI, setIsAskingAI] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [diagImage, setDiagImage] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  useEffect(() => { 
    validateEnv();
    loadLocalData();
  }, []);

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
          const { data: profile } = await supabase.from('Users').select('*').eq('id', currentSession.user.id).single();
          if (profile) {
            setUser({
              id: currentSession.user.id,
              email: currentSession.user.email || '',
              displayName: profile.display_name || '',
              phone: profile.phone || '',
              tier: profile.tier || 'free',
              role: profile.role || 'user',
              onboarded: profile.onboarded || false,
              createdAt: profile.created_at || '',
            });
          }
        }
        setInitialized(true);
      } catch (err) { setInitialized(true); }
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (session && user && vehicles.length === 0) {
      fetchUserVehicles().then((fetched) => {
        if (fetched.length > 0) setVehicles(fetched);
        if (currentView === 'landing') setCurrentView('garage');
      }).catch(console.error);
    }
  }, [session, user]);

  const handleSignOut = async () => {
    if (!supabase) return;
    try {
      setSession(null);
      setUser(null);
      setCurrentView('landing');
      await Promise.all([supabase.auth.signOut(), reset()]);
    } catch (e) {
      localStorage.clear();
      window.location.reload(); 
    }
  };

  const NavItem = ({ view, label, icon }: { view: any; label: string; icon: string }) => (
    <button 
      onClick={() => { setCurrentView(view); setIsMobileMenuOpen(false); }}
      className={`flex items-center gap-4 px-5 py-3.5 w-full transition-all group rounded-xl ${currentView === view ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
    >
      <span className="text-lg group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
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

  if (currentView === 'onboarding' || currentView === 'edit') return <AssetIntelligenceCenter mode={currentView} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row">
      <header className="lg:hidden h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-[100] w-full">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white"><Car size={18} /></div>
          <span className="font-black tracking-tighter text-slate-900 text-sm">AutoPal NG</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-900"><Menu size={24} /></button>
      </header>

      <aside className={`fixed lg:sticky top-0 left-0 z-[120] h-screen w-[300px] bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 pb-6 bg-white">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg"><Car size={22} /></div>
            <div>
              <span className="block font-black tracking-tighter text-slate-900 text-base">AutoPal NG</span>
              <span className="block text-[7px] font-black uppercase tracking-widest text-blue-500">Fleet Control Center</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 pb-8 bg-white overflow-y-auto">
          <div className="space-y-6">
            <div>
              <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.4em] px-5 mb-4">Command Center</p>
              <NavItem view="garage" label="Dashboard" icon="🏠" />
              <NavItem view="diagnostic" label="AI Mechanic" icon="✧" />
              <NavItem view="service" label="Service" icon="🛠️" />
              <NavItem view="fuel" label="Fuel" icon="⛽" />
              <NavItem view="marketplace" label="Marketplace" icon="🛒" />
              <NavItem view="report" label="Report" icon="📄" />
              <NavItem view="profile" label="Profile" icon="👤" />
            </div>
          </div>
        </nav>
        <div className="p-6 mt-auto border-t border-slate-50 shrink-0 bg-white">
           <button onClick={handleSignOut} className="w-full text-rose-500 hover:bg-rose-50 p-3 rounded-xl transition-all text-[8px] font-black uppercase tracking-widest text-center">🚪 Sign Out</button>
        </div>
      </aside>

      <main className="flex-grow p-4 sm:p-6 lg:p-10 xl:p-12 max-w-full lg:max-w-7xl mx-auto w-full pb-32">
        <div className="animate-slide-up w-full">
          {currentView === 'garage' && <Dashboard />}
          {currentView === 'service' && <ServiceIntelligenceCenter />}
          {currentView === 'fuel' && <FuelIntelligenceCenter />}
          {currentView === 'marketplace' && <Marketplace />}
          {currentView === 'admin' && <AdminPanel />}
          {currentView === 'profile' && <ProfileDossier />}
          {currentView === 'report' && <GlobalReportingCenter />}
          {currentView === 'diagnostic' && activeVehicle && (
            <DiagnosticsPanel 
              vehicle={activeVehicle} symptom={symptom} setSymptom={setSymptom} 
              diagImage={diagImage} setDiagImage={setDiagImage} isAskingAI={isAskingAI} 
              onAnalyze={async () => {
                setIsAskingAI(true);
                try {
                  const advice = await getAdvancedDiagnostic(activeVehicle, symptom, true, diagImage || undefined);
                  setAiAdvice(advice);
                } catch (e) { alert("Neural Link Error"); } finally { setIsAskingAI(false); }
              }} 
              aiAdvice={aiAdvice}
            />
          )}
        </div>
      </main>
      <CalibrationTerminal />
    </div>
  );
};

export default App;