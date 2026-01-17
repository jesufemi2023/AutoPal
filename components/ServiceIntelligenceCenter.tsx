import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchVehicleTasks, fetchVehicleServiceLogs } from '../services/vehicleService.ts';
import { fetchFuelLogs } from '../services/fuelService.ts';
import { deleteServiceLog } from '../services/logService.ts';
import { formatCurrency, formatDate, exportToCSV, triggerProfessionalPrint } from '../shared/utils.ts';
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
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
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
    if (!activeVehicle) return { vitality: 0, discipline: 0, maintenanceTotal: 0, isAiAudited: false };
    const financial = calculateFinancialLedger(activeServiceLogs, activeFuelLogs);
    const cachedAudit = activeVehicle.latestAiAudit;
    return {
      vitality: cachedAudit ? cachedAudit.auditedScores.vitality : null,
      discipline: cachedAudit ? cachedAudit.auditedScores.discipline : null,
      maintenanceTotal: financial.maintenanceTotal,
      isAiAudited: !!cachedAudit
    };
  }, [activeVehicle, activeServiceLogs, activeFuelLogs]);

  const handleExportCSV = () => {
    const exportData = activeServiceLogs.map(l => ({
      Date: formatDate(l.serviceDate),
      Type: l.serviceType,
      Category: l.category,
      Provider: l.provider || 'Independent Mechanic',
      Mileage: `${l.mileageAtService.toLocaleString()} KM`,
      Cost: formatCurrency(l.cost),
      Verification: l.verificationLevel
    }));
    exportToCSV(exportData, `AutoPal_ServiceHistory_${activeVehicle?.make}_${activeVehicle?.model}`);
  };

  const handleExportPDF = () => {
    triggerProfessionalPrint('service-report-content');
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteServiceLog(id);
      setServiceLogs(serviceLogs.filter(l => l.id !== id));
    } catch (e) { alert("Failed to delete record."); }
  };

  const handleEditLog = (log: ServiceLog) => {
    setEditingLog(log);
    setShowLogTerminal(true);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  const InfoIcon = ({ id, text }: { id: string, text: string }) => (
    <div className="relative inline-block ml-1">
      <button 
        onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === id ? null : id); }}
        className="text-slate-400 hover:text-blue-500 transition-colors"
      >
        ℹ️
      </button>
      {activeTooltip === id && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveTooltip(null)}
        >
          <div 
            className="bg-slate-900 text-white p-6 sm:p-8 rounded-[2rem] shadow-3xl max-w-xs w-full border border-white/10 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
               <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 text-lg">ℹ️</div>
               <button onClick={() => setActiveTooltip(null)} className="text-slate-500 hover:text-white text-2xl font-light">×</button>
            </div>
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-3">Service Intelligence</h4>
            <p className="text-[11px] font-bold uppercase tracking-widest leading-relaxed text-slate-200">
              {text}
            </p>
            <div className="mt-8 pt-6 border-t border-white/5">
               <button 
                 onClick={() => setActiveTooltip(null)}
                 className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all"
               >
                 Got it
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const getVerificationBadge = (level?: string) => {
    switch (level) {
      case 'mechanic_verified': return <span className="text-[7px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded uppercase tracking-widest">Verified ✓</span>;
      case 'receipt_verified': return <span className="text-[7px] font-black bg-blue-600 text-white px-2 py-0.5 rounded uppercase tracking-widest">Receipt Scanned</span>;
      default: return <span className="text-[7px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded uppercase tracking-widest border border-slate-200">Self-Declared</span>;
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16 animate-slide-up pb-24 sm:pb-32">
      {/* Hidden Print Template */}
      <div id="service-report-content" className="hidden" style={{ width: '100%' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            #service-report-content { display: block !important; }
            .no-print { display: none !important; }
            body { background: white !important; }
            table { -webkit-print-color-adjust: exact; width: 100%; border-collapse: collapse; }
          }
        `}} />
        <div className="p-12" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <div className="flex justify-between items-center border-b-4 border-blue-600 pb-10 mb-10">
            <div className="space-y-1">
              <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">AutoPal NG</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Official Asset Maintenance Dossier</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black text-slate-900">{activeVehicle?.year} {activeVehicle?.make} {activeVehicle?.model}</h2>
              <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">VIN: {activeVehicle?.vin || 'UNAVAILABLE'}</p>
            </div>
          </div>
          
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Date</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Service Operation</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Facility</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Odometer</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Investment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeServiceLogs.map((log) => (
                <tr key={log.id}>
                  <td className="p-4 text-[10px] font-bold text-slate-500">{formatDate(log.serviceDate)}</td>
                  <td className="p-4 text-[11px] font-black text-slate-900 uppercase tracking-tight">{log.serviceType}</td>
                  <td className="p-4 text-[10px] font-bold text-slate-400 italic">{log.provider || 'Independent'}</td>
                  <td className="p-4 text-[11px] font-mono font-bold text-slate-900 text-right">{log.mileageAtService.toLocaleString()} KM</td>
                  <td className="p-4 text-[11px] font-black text-blue-600 text-right">{formatCurrency(log.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-20 pt-10 border-t-2 border-slate-100 flex justify-between items-end">
             <div className="space-y-4">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Generated: {new Date().toLocaleString()} // Verified Digital Ledger</p>
                <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest max-w-sm leading-relaxed">
                  This document serves as an official maintenance record for the identified asset.
                </p>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Maintenance Spend</p>
                <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(stats.maintenanceTotal)}</p>
             </div>
          </div>
        </div>
      </div>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2 no-print">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-500 animate-spin' : 'bg-blue-600 animate-pulse'}`}></div>
            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[8px] sm:text-[9px]">{isLoading ? 'Loading records...' : 'Service History Active'}</span>
          </div>
          <h2 className="text-5xl sm:text-8xl font-black text-slate-900 tracking-tighter leading-[0.8]">Service <br/><span className="text-blue-600">Records</span></h2>
          
          <div className="flex gap-3 pt-6">
             <button onClick={handleExportCSV} className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-3">
               <span className="text-base">📊</span> Export Excel (CSV)
             </button>
             <button onClick={handleExportPDF} className="bg-blue-50 text-blue-600 border border-blue-100 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-blue-600 hover:text-white transition-all flex items-center gap-3">
               <span className="text-base">📄</span> Official PDF Dossier
             </button>
          </div>

          {vehicles.length > 1 && (
            <div className="relative group/scroll w-full max-w-sm mt-6">
              <button onClick={() => handleScroll('left')} className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/80 backdrop-blur-md border border-slate-100 rounded-full items-center justify-center shadow-md text-slate-900 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover/scroll:opacity-100 -ml-4">←</button>
              <div ref={scrollContainerRef} className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide scrollbar-desktop-show scroll-smooth px-1">
                {vehicles.map(v => (
                  <button key={v.id} onClick={() => setActiveVehicleId(v.id)} className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${activeVehicleId === v.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}>
                    {v.year} {v.make} {v.model}
                  </button>
                ))}
              </div>
              <button onClick={() => handleScroll('right')} className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/80 backdrop-blur-md border border-slate-100 rounded-full items-center justify-center shadow-md text-slate-900 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover/scroll:opacity-100 -mr-4">→</button>
            </div>
          )}
        </div>
        <button disabled={!activeVehicle} onClick={() => setShowLogTerminal(true)} className="bg-slate-900 text-white px-8 sm:px-12 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-3xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
          <span className="text-xl">🛠️</span> Record Service
        </button>
      </header>

      {!activeVehicle ? (
        <div className="py-24 text-center bg-white card-radius border-2 border-slate-50 p-12 no-print">
           <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Active Asset Selected</h3>
        </div>
      ) : (
        <div className="space-y-12 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2">
            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between shadow-sm group">
              <div className="space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em] flex items-center">
                  Health Condition
                  <InfoIcon id="sHealth" text="Overall condition based on recorded maintenance." />
                </h3>
                <div className={`text-4xl font-black tracking-tighter ${stats.vitality !== null ? 'text-blue-600' : 'text-slate-300'}`}>
                  {stats.vitality !== null ? `${stats.vitality}%` : '--'}
                </div>
              </div>
            </div>

            <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between shadow-sm group">
              <div className="space-y-4">
                <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em] flex items-center">
                  Record Integrity
                  <InfoIcon id="sTrust" text="How trustworthy your maintenance history appears to buyers." />
                </h3>
                <div className={`text-4xl font-black tracking-tighter ${stats.discipline !== null ? 'text-emerald-600' : 'text-slate-300'}`}>
                  {stats.discipline !== null ? `${stats.discipline}%` : '--'}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 card-radius p-8 text-white flex flex-col justify-between shadow-xl col-span-1 sm:col-span-2 relative overflow-hidden group">
              <div className="space-y-4 relative z-10">
                <h3 className="text-slate-500 text-[8px] font-black uppercase tracking-[0.4em] flex items-center">
                  Total Maintenance Spend
                  <InfoIcon id="sSpent" text="Cumulative amount spent on parts and labor across all logs." />
                </h3>
                <div className="text-4xl sm:text-5xl font-black tracking-tighter">{formatCurrency(stats.maintenanceTotal)}</div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{activeServiceLogs.length} logged maintenance entries.</p>
              </div>
            </div>
          </div>

          <div className="space-y-8 px-2">
            <div className="flex bg-slate-100/50 p-2 rounded-2xl w-full sm:w-max">
              <button onClick={() => setActiveTab('roadmap')} className={`flex-1 sm:flex-none px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'roadmap' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Maintenance Plan</button>
              <button onClick={() => setActiveTab('ledger')} className={`flex-1 sm:flex-none px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>History Log</button>
            </div>

            {activeTab === 'roadmap' && <MaintenanceRoadmap vehicle={activeVehicle} tasks={vehicleTasks} onLog={(t) => { setSelectedTaskForLog(t); setShowLogTerminal(true); }} />}

            {activeTab === 'ledger' && (
              <div className="grid grid-cols-1 gap-6">
                {activeServiceLogs.length > 0 ? activeServiceLogs.map((log) => (
                  <div key={log.id} className="bg-white border border-slate-100 p-6 sm:p-10 rounded-[2.5rem] shadow-sm flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between group relative transition-all hover:shadow-xl">
                    <div className="flex items-center gap-8 relative z-10 w-full lg:w-auto">
                      <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-2xl shrink-0 ${log.taskId ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-300 border border-slate-100'}`}>
                        {log.taskId ? '✓' : '🛠️'}
                      </div>
                      <div className="space-y-2 flex-grow">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">{formatDate(log.serviceDate)}</div>
                          {getVerificationBadge(log.verificationLevel)}
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 px-2 py-0.5 rounded-md">{log.category} System</span>
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-blue-600 transition-colors">{log.serviceType}</h4>
                        <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                           <span className="flex items-center gap-1.5"><span className="text-slate-300">Provider:</span> {log.provider || 'Independent Mechanic'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-2 gap-8 lg:gap-12 w-full lg:w-auto relative z-10 border-t lg:border-t-0 pt-6 lg:pt-0">
                       <div className="space-y-1">
                          <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Odometer</div>
                          <div className="text-xl font-mono font-black text-slate-900 tracking-tighter">
                             {log.mileageAtService.toLocaleString()} <span className="text-xs text-slate-300 font-sans">KM</span>
                          </div>
                       </div>
                       <div className="space-y-1 text-right lg:text-left">
                          <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Investment</div>
                          <div className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(log.cost)}</div>
                       </div>
                    </div>

                    <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-2">
                       <button onClick={() => handleEditLog(log)} className="px-6 py-3 rounded-xl bg-slate-50 text-[9px] font-black uppercase text-blue-600 hover:bg-blue-600 hover:text-white transition-all">Edit</button>
                       <button onClick={() => handleDeleteLog(log.id)} className="px-4 py-3 rounded-xl bg-rose-50 text-[9px] font-black uppercase text-rose-500 hover:bg-rose-500 hover:text-white transition-all">×</button>
                    </div>
                  </div>
                )) : (
                  <div className="py-24 text-center bg-white card-radius border-2 border-dashed border-slate-100 p-12">
                     <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tighter uppercase">No service history</h3>
                     <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Logged repairs and maintenance will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showLogTerminal && activeVehicle && (
        <ServiceLogTerminal vehicle={activeVehicle} preselectedTask={selectedTaskForLog} initialLog={editingLog} onClose={() => { setShowLogTerminal(false); setSelectedTaskForLog(undefined); setEditingLog(undefined); }} />
      )}
    </div>
  );
};

export default ServiceIntelligenceCenter;