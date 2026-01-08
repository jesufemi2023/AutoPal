
import React, { useState, useEffect, useMemo } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchVehicleTasks, fetchVehicleServiceLogs } from '../services/vehicleService.ts';
import { deleteServiceLog } from '../services/logService.ts';
import { formatCurrency, formatDate } from '../shared/utils.ts';
import { MaintenanceTask, ServiceLog } from '../shared/types.ts';
import { calculateVitalityScore, calculateDisciplineScore, getSpendByCategory } from '../services/maintenanceLogic.ts';
import { MaintenanceRoadmap } from './dashboard/MaintenanceRoadmap.tsx';
// Fixed: Path was incorrectly referencing components/components/
import { ServiceLogTerminal } from './ServiceLogTerminal.tsx';

/**
 * Service Intelligence Center
 * Immersive command center for vehicle maintenance and engineering lifecycle.
 */
const ServiceIntelligenceCenter: React.FC = () => {
  const { 
    vehicles, tasks, serviceLogs, setTasks, setServiceLogs, setCurrentView
  } = useAutoPalStore();
  
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'ledger'>('roadmap');
  const [showLogTerminal, setShowLogTerminal] = useState(false);
  const [selectedTaskForLog, setSelectedTaskForLog] = useState<MaintenanceTask | undefined>();

  useEffect(() => {
    if (vehicles.length > 0 && !activeVehicleId) {
      setActiveVehicleId(vehicles[0].id);
    }
  }, [vehicles, activeVehicleId]);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  useEffect(() => {
    if (activeVehicleId) {
      setIsLoading(true);
      Promise.all([
        fetchVehicleTasks(activeVehicleId),
        fetchVehicleServiceLogs(activeVehicleId)
      ])
      .then(([taskList, logList]) => {
        setTasks(taskList);
        setServiceLogs(logList);
      })
      .finally(() => setIsLoading(false));
    }
  }, [activeVehicleId, setTasks, setServiceLogs]);

  const stats = useMemo(() => {
    if (!activeVehicle) return { vitality: 0, discipline: 0, totalSpend: 0, spendByCat: {} };
    return {
      vitality: calculateVitalityScore(activeVehicle, tasks),
      discipline: calculateDisciplineScore(serviceLogs, tasks),
      totalSpend: serviceLogs.reduce((acc, l) => acc + l.cost, 0),
      spendByCat: getSpendByCategory(serviceLogs)
    };
  }, [activeVehicle, tasks, serviceLogs]);

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service record? This will affect your health score.")) return;
    try {
      await deleteServiceLog(id);
      setServiceLogs(serviceLogs.filter(l => l.id !== id));
    } catch (e) {
      alert("System Sync Failure.");
    }
  };

  const pendingTasks = tasks.filter(t => t.vehicleId === activeVehicleId && t.status === 'pending');

  return (
    <div className="space-y-12 sm:space-y-16 animate-slide-up pb-24 sm:pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-500 animate-spin' : 'bg-blue-600 animate-pulse'}`}></div>
            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[8px] sm:text-[9px]">
              {isLoading ? 'Scanning Engineering Nodes...' : 'Neural Maintenance Link Active'}
            </span>
          </div>
          <h2 className="text-5xl sm:text-8xl font-black text-slate-900 tracking-tighter leading-[0.8] transition-all">
            Service <br/><span className="text-blue-600">Module</span>
          </h2>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button 
            onClick={() => { setSelectedTaskForLog(undefined); setShowLogTerminal(true); }}
            className="bg-slate-900 text-white px-8 sm:px-12 py-5 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] shadow-3xl hover:bg-blue-600 transition-all active:scale-95 group flex items-center justify-center gap-3"
          >
            <span className="text-lg sm:text-xl group-hover:rotate-90 transition-transform">🛠️</span>
            Log Protocol
          </button>
        </div>
      </header>

      {/* Analytics KPI Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2">
        <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between min-h-[180px] shadow-sm">
          <div className="space-y-4">
            <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Asset Vitality</h3>
            <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-baseline">
              {stats.vitality}<span className="text-xs text-slate-300 ml-1 font-bold">%</span>
            </div>
            <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Engineering Integrity</div>
          </div>
        </div>

        <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between min-h-[180px] shadow-sm">
          <div className="space-y-4">
            <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Discipline Score</h3>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              {stats.discipline}<span className="text-xs text-slate-300 ml-1 font-bold">%</span>
            </div>
            <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Ownership Credibility</div>
          </div>
        </div>

        <div className="bg-slate-900 card-radius p-8 text-white flex flex-col justify-between min-h-[180px] shadow-xl col-span-1 sm:col-span-2">
          <div className="space-y-4">
            <h3 className="text-slate-500 text-[8px] font-black uppercase tracking-[0.4em]">Life-cycle Spend</h3>
            <div className="text-5xl font-black tracking-tighter">
              {formatCurrency(stats.totalSpend)}
            </div>
            <div className="flex gap-4">
               {Object.entries(stats.spendByCat).slice(0, 3).map(([cat, val]) => (
                 <div key={cat} className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                   {cat}: {formatCurrency(val as number)}
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Control */}
      <div className="space-y-8 px-2">
        <div className="flex bg-slate-100/50 p-2 rounded-2xl sm:rounded-3xl w-full sm:w-max">
          <button 
            onClick={() => setActiveTab('roadmap')}
            className={`flex-1 sm:flex-none px-10 py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'roadmap' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Roadmap
          </button>
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`flex-1 sm:flex-none px-10 py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >
            History Ledger
          </button>
        </div>

        {activeTab === 'roadmap' && activeVehicle && (
          <MaintenanceRoadmap 
            vehicle={activeVehicle} 
            tasks={pendingTasks} 
            onLog={(t) => { setSelectedTaskForLog(t); setShowLogTerminal(true); }} 
          />
        )}

        {activeTab === 'ledger' && (
          <div className="space-y-6">
            {serviceLogs.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {serviceLogs.map((log) => (
                  <div key={log.id} className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl">
                        {log.category === 'engine' ? '⚙️' : log.category === 'tires' ? '🛞' : log.category === 'brakes' ? '🛑' : '🛠️'}
                      </div>
                      <div className="space-y-1">
                        <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{formatDate(log.serviceDate)}</div>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{log.serviceType}</h4>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">{log.provider || 'Independent Operator'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 w-full lg:w-auto pt-6 lg:pt-0 border-t lg:border-t-0 border-slate-50">
                      <div>
                        <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Mileage</div>
                        <div className="text-lg font-black text-slate-900 tracking-tighter">{log.mileageAtService.toLocaleString()} KM</div>
                      </div>
                      <div>
                        <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Investment</div>
                        <div className="text-lg font-black text-slate-900 tracking-tighter">{formatCurrency(log.cost)}</div>
                      </div>
                      <div>
                        <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Verification</div>
                        <div className="text-[9px] font-black uppercase text-emerald-500">{log.verificationLevel?.replace('_', ' ') || 'Self Declared'}</div>
                      </div>
                      <div className="flex items-center justify-end">
                        <button 
                          onClick={() => handleDeleteLog(log.id)}
                          className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center text-sm"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-white card-radius border-4 border-dashed border-slate-100 p-16">
                 <div className="w-24 h-24 bg-slate-50 rounded-[3rem] flex items-center justify-center text-4xl mx-auto mb-8 grayscale opacity-50">📜</div>
                 <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Ledger Offline</h3>
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">No historical service protocols detected.</p>
                 <button 
                  onClick={() => setShowLogTerminal(true)}
                  className="mt-10 bg-slate-900 text-white px-12 py-6 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-3xl"
                 >
                   Initialize First Protocol
                 </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showLogTerminal && activeVehicle && (
        <ServiceLogTerminal 
          vehicle={activeVehicle} 
          preselectedTask={selectedTaskForLog} 
          onClose={() => { setShowLogTerminal(false); setSelectedTaskForLog(undefined); }} 
        />
      )}
    </div>
  );
};

export default ServiceIntelligenceCenter;
