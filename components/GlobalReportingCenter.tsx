import React, { useMemo, useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { aggregateGarageReport, GarageReport } from '../services/reportingService.ts';
import { formatCurrency, formatDate, exportToCSV, triggerProfessionalPrint } from '../shared/utils.ts';

const GlobalReportingCenter: React.FC = () => {
  const { vehicles, tasks, serviceLogs, fuelLogs } = useAutoPalStore();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const report = useMemo(() => 
    aggregateGarageReport(vehicles, tasks, serviceLogs, fuelLogs), 
    [vehicles, tasks, serviceLogs, fuelLogs]
  );

  const handleExportCSV = () => {
    const csvData = report.vehicles.map(r => ({
      Vehicle: `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`,
      VIN: r.vehicle.vin || 'N/A',
      Odometer: `${r.vehicle.mileage} KM`,
      'Health Score': `${r.health}%`,
      'Maintenance Spend': formatCurrency(r.financials.maintenance),
      'Fuel Spend': formatCurrency(r.financials.fuel),
      'Total Investment': formatCurrency(r.financials.total),
      'Pending Tasks': r.pendingTasks,
      'Market Valuation': r.resaleValue > 0 ? formatCurrency(r.resaleValue) : 'Not Audited'
    }));
    exportToCSV(csvData, `AutoPal_Garage_Audit_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    triggerProfessionalPrint('global-garage-report');
  };

  const InfoIcon = ({ id, text }: { id: string, text: string }) => (
    <div className="relative inline-block ml-1">
      <button 
        onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === id ? null : id); }}
        className="text-slate-300 hover:text-blue-500 transition-colors"
      >
        ℹ️
      </button>
      {activeTooltip === id && (
        <div 
          className="absolute inset-x-0 top-0 z-50 bg-slate-900 text-white p-5 rounded-t-3xl border-b border-white/10 animate-in slide-in-from-top duration-300 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-[8px] font-black text-blue-400 uppercase tracking-[0.3em]">Reporting Metric</h4>
            <button onClick={() => setActiveTooltip(null)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed text-slate-100">
            {text}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="animate-slide-up space-y-12 pb-24 px-2">
      {/* Hidden PDF Template */}
      <div id="global-garage-report" className="hidden" style={{ width: '100%' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            #global-garage-report { display: block !important; }
            .no-print { display: none !important; }
            body { background: white !important; }
          }
        `}} />
        <div className="p-16 text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <header className="flex justify-between items-center border-b-8 border-slate-900 pb-12 mb-12">
            <div>
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">AutoPal NG</h1>
              <p className="text-xs font-black uppercase tracking-[0.5em] text-blue-600">Executive Garage Portfolio & Asset Audit</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Generation Date</p>
              <p className="text-xl font-bold font-mono uppercase">{formatDate(report.generatedAt)}</p>
            </div>
          </header>

          <section className="grid grid-cols-3 gap-8 mb-16">
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Fleet Scale</p>
               <p className="text-4xl font-black">{report.fleetCount} Active Digital Twins</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Fleet Total Investment</p>
               <p className="text-4xl font-black text-blue-600">{formatCurrency(report.totalInvestment)}</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Average Condition Score</p>
               <p className="text-4xl font-black text-emerald-600">{report.avgHealth}%</p>
            </div>
          </section>

          <div className="space-y-12">
            <h2 className="text-2xl font-black uppercase tracking-tight border-b-2 border-slate-100 pb-4">Asset Detail Matrix</h2>
            {report.vehicles.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-8 border-b border-slate-100 pb-8 last:border-0">
                <div className="col-span-4 space-y-1">
                  <h3 className="text-xl font-black uppercase">{r.vehicle.year} {r.vehicle.make} {r.vehicle.model}</h3>
                  <p className="text-[10px] font-mono font-bold text-slate-400">CHASSIS: {r.vehicle.vin || 'PENDING'}</p>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{r.vehicle.mileage.toLocaleString()} KM // {r.health}% Vitality</p>
                </div>
                <div className="col-span-4 space-y-2">
                   <div className="flex justify-between text-xs">
                      <span className="text-slate-400 uppercase font-black tracking-widest">Maintenance</span>
                      <span className="font-bold">{formatCurrency(r.financials.maintenance)}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-slate-400 uppercase font-black tracking-widest">Energy/Fuel</span>
                      <span className="font-bold">{formatCurrency(r.financials.fuel)}</span>
                   </div>
                   <div className="flex justify-between text-xs border-t border-slate-100 pt-1">
                      <span className="text-slate-900 uppercase font-black tracking-widest">Total OpEx</span>
                      <span className="font-black text-blue-600">{formatCurrency(r.financials.total)}</span>
                   </div>
                </div>
                <div className="col-span-4 text-right space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Resale Estimate</p>
                   <p className="text-2xl font-black text-emerald-600">{r.resaleValue > 0 ? formatCurrency(r.resaleValue) : 'AUDIT PENDING'}</p>
                   <p className="text-[9px] font-bold text-slate-300 italic">Based on documentation trust & metadata</p>
                </div>
              </div>
            ))}
          </div>

          <footer className="mt-20 pt-10 border-t-2 border-slate-100 text-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Official Engineering Metadata synchronized via AutoPal NG Cloud Protocol v4.0</p>
          </footer>
        </div>
      </div>

      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[9px]">Data Intelligence Center</span>
          </div>
          <h2 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-[0.85]">Garage <br/><span className="text-blue-600">Dossier</span></h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-sm pt-4">Global audit of your entire vehicle portfolio, investment telemetry, and mechanical risks.</p>
        </div>

        <div className="flex gap-3">
           <button onClick={handleExportCSV} className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-3">
             <span className="text-xl">📊</span> Excel / CSV
           </button>
           <button onClick={handleExportPDF} className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all flex items-center gap-3">
             <span className="text-xl">📄</span> Professional PDF Dossier
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden group">
          <InfoIcon id="fleet_scale" text="The total number of active vehicle digital twins synced to your account." />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Total Assets</p>
          <div className="text-6xl font-black tracking-tighter text-slate-900">{report.fleetCount}</div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden group">
          <InfoIcon id="fleet_health" text="Aggregate garage health score based on task compliance across all vehicles." />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Garage Vitality</p>
          <div className={`text-6xl font-black tracking-tighter ${report.avgHealth > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
            {report.avgHealth}%
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl">
          <InfoIcon id="fleet_investment" text="Total historical spend across all logged fuel refills and maintenance services." />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Total Fleet Investment</p>
          <div className="text-4xl sm:text-5xl font-black tracking-tighter">
            {formatCurrency(report.totalInvestment)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Portfolio Breakdown</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{vehicles.length} Digital Twins Online</span>
        </div>
        <div className="divide-y divide-slate-50">
          {report.vehicles.map((r, i) => (
            <div key={i} className="p-8 sm:p-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between hover:bg-slate-50/50 transition-all">
              <div className="space-y-1">
                <h4 className="text-xl font-black text-slate-900 tracking-tight">{r.vehicle.year} {r.vehicle.make} {r.vehicle.model}</h4>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-tight">{r.vehicle.vin || 'VIN PENDING'}</span>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${r.health > 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{r.health}% Health</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12 w-full lg:w-auto">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Operational Spend</p>
                  <p className="text-sm font-black text-slate-900">{formatCurrency(r.financials.total)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pending Tasks</p>
                  <p className={`text-sm font-black ${r.pendingTasks > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{r.pendingTasks} Items</p>
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Resale Position</p>
                  <p className="text-sm font-black text-emerald-600">{r.resaleValue > 0 ? formatCurrency(r.resaleValue) : 'AUDIT REQUIRED'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GlobalReportingCenter;