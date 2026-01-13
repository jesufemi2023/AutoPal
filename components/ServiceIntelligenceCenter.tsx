
import React, { useState, useEffect, useMemo } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchVehicleTasks, fetchVehicleServiceLogs } from '../services/vehicleService.ts';
import { fetchFuelLogs } from '../services/fuelService.ts';
import { deleteServiceLog } from '../services/logService.ts';
import { formatCurrency, formatDate } from '../shared/utils.ts';
import { MaintenanceTask, ServiceLog } from '../shared/types.ts';
import { 
  calculateVitalityScore, 
  calculateDisciplineScore, 
  getSpendByCategory,
  calculateTotalExpenditure
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

  const stats = useMemo(() => {
    if (!activeVehicle) return { vitality: 0, discipline: 0, totalSpend: 0, spendByCat: {} };
    
    // Filter telemetry for the active vehicle to ensure precise calculations
    const vehicleFuelLogs = fuelLogs.filter(l => l.vehicleId === activeVehicle.id);
    const vehicleServiceLogs = serviceLogs.filter(l => l.vehicleId === activeVehicle.id);
    const vehicleTasks = tasks.filter(t => t.vehicleId === activeVehicle.id);
    
    return {
      // FIX: Pass fuel and service logs so the score is calculated with full context
      vitality: calculateVitalityScore(activeVehicle, vehicleTasks, vehicleFuelLogs, vehicleServiceLogs),
      discipline: calculateDisciplineScore(vehicleServiceLogs, vehicleTasks),
      totalSpend: calculateTotalExpenditure(vehicleServiceLogs, vehicleFuelLogs),
      spendByCat: getSpendByCategory(vehicleServiceLogs)
    };
  }, [activeVehicle, tasks, serviceLogs, fuelLogs]);

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service record? This will affect your health score and history ledger.")) return;
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

  const vehicleTasks = tasks.filter(t => t.vehicleId === activeVehicleId);

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
          {vehicles.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {vehicles.map(v => (
                <button 
                  key={v.id}
                  onClick={() => setActiveVehicleId(v.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${activeVehicleId === v.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  {v.model}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button 
            disabled={!activeVehicle}
            onClick={() => { setEditingLog(undefined); setSelectedTaskForLog(undefined); setShowLogTerminal(true); }}
            className="bg-slate-900 text-white px-8 sm:px-12 py-5 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] shadow-3xl hover:bg-blue-600 transition-all active:scale-95 group flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <span className="text-lg sm:text-xl group-hover:rotate-90 transition-transform">🛠️</span>
            Log Protocol
          </button>
        </div>
      </header>

      {!activeVehicle ? (
        <div className="py-24 text-center bg-white card-radius border-2 border-slate-50 p-12">
           <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Active Asset Selected</h3>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2">
            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between min-h-[180px] shadow-sm">
              <div className="space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Asset Vitality</h3>
                <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-baseline">
                  {stats.vitality}<span className="text-xs text-slate-300 ml-1 font-bold">%</span>
                </div>
              </div>
            </div>

            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between min-h-[180px] shadow-sm">
              <div className="space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Discipline Score</h3>
                <div className="text-4xl font-black text-slate-900 tracking-tighter">
                  {stats.discipline}<span className="text-xs text-slate-300 ml-1 font-bold">%</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 card-radius p-8 text-white flex flex-col justify-between min-h-[180px] shadow-xl col-span-1 sm:col-span-2">
              <div className="space-y-4">
                <h3 className="text-slate-500 text-[8px] font-black uppercase tracking-[0.4em]">Total Maintenance Spend</h3>
                <div className="text-5xl font-black tracking-tighter">
                  {formatCurrency(stats.totalSpend)}
                </div>
              </div>
            </div>
          </div>

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

            {activeTab === 'roadmap' && (
              <MaintenanceRoadmap 
                vehicle={activeVehicle} 
                tasks={vehicleTasks} 
                onLog={(t) => { setEditingLog(undefined); setSelectedTaskForLog(t); setShowLogTerminal(true); }} 
              />
            )}

            {activeTab === 'ledger' && (
              <div className="space-y-6">
                {serviceLogs.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {serviceLogs.map((log) => (
                      <div key={log.id} className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between group">
                        <div className="flex items-center gap-6">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${log.taskId ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                            {log.taskId ? '✓' : '🛠️'}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{formatDate(log.serviceDate)}</div>
                              {log.taskId && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[7px] font-black uppercase tracking-tighter rounded-md">Bonded</span>
                              )}
                            </div>
                            <h4 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{log.serviceType}</h4>
                            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Provider: {log.provider || 'Independent Operator'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-right">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Investment</div>
                              <div className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(log.cost)}</div>
                           </div>
                           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => handleEditLog(log)} className="w-10 h-10 rounded-xl bg-slate-50 text-blue-600 flex items-center justify-center text-[10px] font-black uppercase tracking-widest">Edit</button>
                             <button onClick={() => handleDeleteLog(log.id)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center text-sm">×</button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-24 text-center bg-white card-radius border-2 border-dashed border-slate-100 p-16">
                     <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Ledger Offline</h3>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {showLogTerminal && activeVehicle && (
        <ServiceLogTerminal 
          vehicle={activeVehicle} 
          preselectedTask={selectedTaskForLog} 
          initialLog={editingLog}
          onClose={() => { setShowLogTerminal(false); setSelectedTaskForLog(undefined); setEditingLog(undefined); }} 
        />
      )}
    </div>
  );
};

export default ServiceIntelligenceCenter;
