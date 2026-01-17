import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchVehicleTasks, fetchVehicleServiceLogs } from '../services/vehicleService.ts';
import { fetchFuelLogs } from '../services/fuelService.ts';
import { deleteServiceLog } from '../services/logService.ts';
import { formatCurrency, formatDate } from '../shared/utils.ts';
import { MaintenanceTask, ServiceLog } from '../shared/types.ts';
import { 
  getSpendByCategory,
  calculateFinancialLedger
} from '../services/maintenanceLogic.ts';
import { MaintenanceRoadmap } from './dashboard/MaintenanceRoadmap.tsx';
import { ServiceLogTerminal } from './ServiceLogTerminal.tsx';

const ServiceIntelligenceCenter: React.FC = () => {
  const { 
    vehicles, tasks, serviceLogs, fuelLogs, setTasks, setServiceLogs, setFuelLogs,
    activeVehicleId, setActiveVehicleId
  } = useAutoPalStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'ledger'>('roadmap');
  const [showLogTerminal, setShowLogTerminal] = useState(false);
  const [selectedTaskForLog, setSelectedTaskForLog] = useState<MaintenanceTask | undefined>();
  const [editingLog, setEditingLog] = useState<ServiceLog | undefined>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  useEffect(() => {
    if (activeVehicleId) {
      setIsLoading(true);
      Promise.all([
        fetchVehicleTasks(activeVehicleId),
        fetchVehicleServiceLogs(activeVehicleId),
        fetchFuelLogs(activeVehicleId)
      ])
      .then(([taskList, logList, fuelList]) => {
        setTasks(taskList);
        setServiceLogs(logList);
        setFuelLogs(fuelList);
      })
      .finally(() => setIsLoading(false));
    }
  }, [activeVehicleId, setTasks, setServiceLogs, setFuelLogs]);

  const vehicleTasks = useMemo(() => tasks.filter(t => t.vehicleId === activeVehicleId), [tasks, activeVehicleId]);
  const activeServiceLogs = useMemo(() => serviceLogs.filter(l => l.vehicleId === activeVehicleId), [serviceLogs, activeVehicleId]);
  const activeFuelLogs = useMemo(() => fuelLogs.filter(l => l.vehicleId === activeVehicleId), [fuelLogs, activeVehicleId]);

  const stats = useMemo(() => {
    if (!activeVehicle) return { vitality: 0, discipline: 0, maintenanceTotal: 0, fuelTotal: 0, isAiAudited: false };
    
    const financial = calculateFinancialLedger(activeServiceLogs, activeFuelLogs);
    
    // SOURCE OF TRUTH: If the AI has spoken, we use its scores.
    const cachedAudit = activeVehicle.latestAiAudit;
    
    return {
      vitality: cachedAudit ? cachedAudit.auditedScores.vitality : null,
      discipline: cachedAudit ? cachedAudit.auditedScores.discipline : null,
      maintenanceTotal: financial.maintenanceTotal,
      fuelTotal: financial.fuelTotal,
      isAiAudited: !!cachedAudit
    };
  }, [activeVehicle, activeServiceLogs, activeFuelLogs]);

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Are you sure? This will permanently delete the record.")) return;
    try {
      await deleteServiceLog(id);
      setServiceLogs(serviceLogs.filter(l => l.id !== id));
    } catch (e) {
      alert("System Sync Failure.");
    }
  };

  const handleEditLog = (log: ServiceLog) => {
    setEditingLog(log);
    setShowLogTerminal(true);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

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
        <button disabled={!activeVehicle} onClick={() => setShowLogTerminal(true)} className="bg-slate-900 text-white px-8 sm:px-12 py-5 sm:py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-3xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
          <span className="text-lg sm:text-xl">🛠️</span>
          Log Protocol
        </button>
      </header>

      {!activeVehicle ? (
        <div className="py-24 text-center bg-white card-radius border-2 border-slate-50 p-12">
           <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Active Asset Selected</h3>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2">
            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between shadow-sm group">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Audited Vitality</h3>
                  {stats.isAiAudited && <span className="text-[7px] text-blue-600 font-black uppercase">Audited</span>}
                </div>
                <div className={`text-4xl font-black tracking-tighter ${stats.vitality !== null ? 'text-blue-600' : 'text-slate-300'}`}>
                  {stats.vitality !== null ? `${stats.vitality}%` : '--'}
                </div>
              </div>
            </div>

            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between shadow-sm group">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Audited Discipline</h3>
                  {stats.isAiAudited && <span className="text-[7px] text-emerald-600 font-black uppercase">Audited</span>}
                </div>
                <div className={`text-4xl font-black tracking-tighter ${stats.discipline !== null ? 'text-emerald-600' : 'text-slate-300'}`}>
                  {stats.discipline !== null ? `${stats.discipline}%` : '--'}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 card-radius p-8 text-white flex flex-col justify-between shadow-xl col-span-1 sm:col-span-2">
              <div className="grid grid-cols-2 gap-8 h-full items-center">
                <div className="space-y-4">
                  <h3 className="text-slate-500 text-[8px] font-black uppercase tracking-[0.4em]">Service Investment</h3>
                  <div className="text-3xl font-black tracking-tighter">{formatCurrency(stats.maintenanceTotal)}</div>
                </div>
                <div className="space-y-4 border-l border-white/5 pl-8">
                  <h3 className="text-slate-500 text-[8px] font-black uppercase tracking-[0.4em]">Fuel Consumption</h3>
                  <div className="text-3xl font-black tracking-tighter">{formatCurrency(stats.fuelTotal)}</div>
                </div>
              </div>
            </div>
          </div>

          {!stats.isAiAudited && (
            <div className="mx-2 p-6 bg-blue-50 border border-blue-100 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="text-2xl">⚖️</div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Neural Audit Required</p>
                  <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tight">Run a resale valuation report to activate your audited health scores.</p>
                </div>
              </div>
              <button onClick={() => setActiveTab('roadmap')} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">Run Audit Now</button>
            </div>
          )}

          <div className="space-y-8 px-2">
            <div className="flex bg-slate-100/50 p-2 rounded-2xl w-full sm:w-max">
              <button onClick={() => setActiveTab('roadmap')} className={`flex-1 sm:flex-none px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'roadmap' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Roadmap</button>
              <button onClick={() => setActiveTab('ledger')} className={`flex-1 sm:flex-none px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>History Ledger</button>
            </div>

            {activeTab === 'roadmap' && <MaintenanceRoadmap vehicle={activeVehicle} tasks={vehicleTasks} onLog={(t) => { setSelectedTaskForLog(t); setShowLogTerminal(true); }} />}

            {activeTab === 'ledger' && (
              <div className="grid grid-cols-1 gap-4">
                {activeServiceLogs.map((log) => (
                  <div key={log.id} className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${log.taskId ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>{log.taskId ? '✓' : '🛠️'}</div>
                      <div className="space-y-1">
                        <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{formatDate(log.serviceDate)}</div>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{log.serviceType}</h4>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">{log.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Investment</div>
                          <div className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(log.cost)}</div>
                       </div>
                       <div className="flex gap-2">
                         <button onClick={() => handleEditLog(log)} className="w-10 h-10 rounded-xl bg-slate-50 text-blue-600 flex items-center justify-center text-[10px] font-black">Edit</button>
                         <button onClick={() => handleDeleteLog(log.id)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center text-sm">×</button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showLogTerminal && activeVehicle && (
        <ServiceLogTerminal vehicle={activeVehicle} preselectedTask={selectedTaskForLog} initialLog={editingLog} onClose={() => { setShowLogTerminal(false); setSelectedTaskForLog(undefined); setEditingLog(undefined); }} />
      )}
    </div>
  );
};

export default ServiceIntelligenceCenter;