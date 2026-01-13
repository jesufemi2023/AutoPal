
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

  // Derived Telemetry State
  const vehicleTasks = useMemo(() => tasks.filter(t => t.vehicleId === activeVehicleId), [tasks, activeVehicleId]);
  const activeServiceLogs = useMemo(() => serviceLogs.filter(l => l.vehicleId === activeVehicleId), [serviceLogs, activeVehicleId]);
  const activeFuelLogs = useMemo(() => fuelLogs.filter(l => l.vehicleId === activeVehicleId), [fuelLogs, activeVehicleId]);

  const stats = useMemo(() => {
    if (!activeVehicle) return { vitality: 0, discipline: 0, totalSpend: 0, spendByCat: {} };
    
    return {
      vitality: calculateVitalityScore(activeVehicle, vehicleTasks, activeFuelLogs, activeServiceLogs),
      discipline: Math.round(calculateDisciplineScore(activeServiceLogs, vehicleTasks)),
      totalSpend: calculateTotalExpenditure(activeServiceLogs, activeFuelLogs),
      spendByCat: getSpendByCategory(activeServiceLogs)
    };
  }, [activeVehicle, vehicleTasks, activeServiceLogs, activeFuelLogs]);

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Proceed with purging this record? Asset history and health scores will be recalibrated.")) return;
    try {
      await deleteServiceLog(id);
      setServiceLogs(serviceLogs.filter(l => l.id !== id));
    } catch (e) {
      alert("Synchronization Fault.");
    }
  };

  const handleEditLog = (log: ServiceLog) => {
    setEditingLog(log);
    setShowLogTerminal(true);
  };

  return (
    <div className="space-y-8 sm:space-y-10 animate-slide-up pb-24 px-1">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 px-1">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-blue-500 animate-spin' : 'bg-blue-600 animate-pulse'}`}></div>
            <span className="text-slate-400 font-black uppercase tracking-widest text-[7px] sm:text-[8px]">
              {isLoading ? 'Syncing Engineering Nodes...' : 'Neural Maintenance Active'}
            </span>
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter leading-none transition-all">
            Service <span className="text-blue-600">Module</span>
          </h2>
          {vehicles.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {vehicles.map(v => (
                <button 
                  key={v.id}
                  onClick={() => setActiveVehicleId(v.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest border transition-all ${activeVehicleId === v.id ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  {v.model}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button 
            disabled={!activeVehicle}
            onClick={() => { setEditingLog(undefined); setSelectedTaskForLog(undefined); setShowLogTerminal(true); }}
            className="bg-slate-900 text-white px-6 sm:px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg hover:bg-blue-600 transition-all active:scale-95 group flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <span className="text-lg group-hover:rotate-90 transition-transform">🛠️</span>
            Log Protocol
          </button>
        </div>
      </header>

      {!activeVehicle ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-50 p-8 shadow-sm w-full">
           <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">No Active Asset in Link</h3>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 px-1 items-stretch">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-center min-h-[140px] shadow-sm">
              <div className="space-y-2">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-widest leading-none">Vitality Score</h3>
                <div className="text-3xl font-black text-slate-900 tracking-tighter flex items-baseline leading-none">
                  {stats.vitality}<span className="text-xs text-slate-300 ml-0.5 font-bold">%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-center min-h-[140px] shadow-sm">
              <div className="space-y-2">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-widest leading-none">Verification Grade</h3>
                <div className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                  {stats.discipline}<span className="text-xs text-slate-300 ml-0.5 font-bold">%</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-center min-h-[140px] shadow-xl col-span-1 sm:col-span-2">
              <div className="space-y-3">
                <h3 className="text-slate-500 text-[8px] font-black uppercase tracking-widest leading-none">Total Maintenance Commitment</h3>
                <div className="text-4xl font-black tracking-tighter leading-none">
                  {formatCurrency(stats.totalSpend)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-1">
            <div className="flex bg-slate-100/50 p-1.5 rounded-2xl w-full sm:w-max">
              <button 
                onClick={() => setActiveTab('roadmap')}
                className={`flex-1 sm:flex-none px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'roadmap' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Roadmap
              </button>
              <button 
                onClick={() => setActiveTab('ledger')}
                className={`flex-1 sm:flex-none px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
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
              <div className="space-y-4">
                {activeServiceLogs.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {activeServiceLogs.map((log) => (
                      <div key={log.id} className="bg-white border border-slate-100 p-5 sm:p-7 rounded-2xl shadow-sm flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between group transition-all hover:shadow-md">
                        <div className="flex flex-grow items-center gap-5 w-full xl:w-auto">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${log.taskId ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                            {log.taskId ? '✓' : '🛠️'}
                          </div>
                          <div className="space-y-1 flex-grow overflow-hidden">
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="text-[7px] font-black text-blue-500 uppercase tracking-widest leading-none">{formatDate(log.serviceDate)}</div>
                              {log.taskId && (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[6px] font-black uppercase tracking-wider rounded">Linked to Roadmap</span>
                              )}
                              <span className="text-[7px] font-black text-slate-300 uppercase leading-none">{log.category}</span>
                            </div>
                            <h4 className="text-lg font-black text-slate-900 tracking-tighter leading-none truncate">{log.serviceType}</h4>
                            <div className="flex items-center gap-4 flex-wrap">
                              {log.provider && (
                                  <p className="text-slate-400 text-[8px] font-bold uppercase tracking-wider truncate leading-none">Workshop: {log.provider}</p>
                              )}
                              <p className="text-slate-300 text-[8px] font-mono leading-none">{log.mileageAtService.toLocaleString()} KM Entry</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between xl:justify-end gap-6 w-full xl:w-auto pt-4 xl:pt-0 border-t xl:border-t-0 border-slate-50">
                           <div className="text-left xl:text-right shrink-0">
                              <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Asset Investment</div>
                              <div className="text-xl font-black text-slate-900 tracking-tighter leading-none">{formatCurrency(log.cost)}</div>
                           </div>
                           <div className="flex gap-2">
                             <button onClick={() => handleEditLog(log)} className="px-4 py-2 rounded-lg bg-slate-50 text-blue-600 text-[8px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all">Edit</button>
                             <button onClick={() => handleDeleteLog(log.id)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center text-sm hover:bg-rose-100 transition-all">×</button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center bg-white rounded-3xl border border-slate-50 border-dashed p-10 flex flex-col items-center">
                     <div className="text-3xl opacity-20 mb-4">📜</div>
                     <h3 className="text-lg font-black text-slate-300 uppercase tracking-tighter">History Ledger Empty</h3>
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
