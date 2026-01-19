import React, { useMemo } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { generateGlobalGarageReport } from '../services/reportingService.ts';
import { formatCurrency, formatDate, exportToCSV, triggerProfessionalPrint } from '../shared/utils.ts';

const GlobalReportingCenter: React.FC = () => {
  const { vehicles, tasks, serviceLogs, fuelLogs } = useAutoPalStore();

  const report = useMemo(() => 
    generateGlobalGarageReport(vehicles, tasks, serviceLogs, fuelLogs), 
    [vehicles, tasks, serviceLogs, fuelLogs]
  );

  const handleExcelExport = () => {
    const data = report.vehicleSummaries.map(s => ({
      Vehicle: `${s.vehicle.year} ${s.vehicle.make} ${s.vehicle.model}`,
      Chassis: s.vehicle.vin || 'Not Set',
      Mileage: `${s.vehicle.mileage} KM`,
      'Health Status': `${s.healthScore}%`,
      'Maintenance Cost': formatCurrency(s.spending.maintenance),
      'Fuel Cost': formatCurrency(s.spending.fuel),
      'Total Cost': formatCurrency(s.spending.total),
      'Items to Fix': s.toDoCount,
      'Current Value': s.estimatedValue > 0 ? formatCurrency(s.estimatedValue) : 'Needs Audit'
    }));
    exportToCSV(data, `AutoPal_Garage_Report_${new Date().toISOString().split('T')[0]}`);
  };

  const handlePdfExport = () => {
    triggerProfessionalPrint('printable-report-area');
  };

  return (
    <div className="animate-slide-up space-y-12 pb-24">
      {/* Hidden Professional PDF Template */}
      <div id="printable-report-area" className="hidden" style={{ width: '100%' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            #printable-report-area { display: block !important; }
            body { background: white !important; padding: 0 !important; margin: 0 !important; }
          }
        `}} />
        <div className="p-16 text-slate-900 bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <header className="flex justify-between items-end border-b-8 border-slate-900 pb-12 mb-12">
            <div>
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-1">AutoPal NG</h1>
              <p className="text-sm font-black uppercase tracking-[0.4em] text-blue-600">Garage Ownership Summary</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Report Generated On</p>
              <p className="text-xl font-bold font-mono">{formatDate(report.generatedAt)}</p>
            </div>
          </header>

          <section className="grid grid-cols-3 gap-8 mb-16">
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Vehicles Managed</p>
               <p className="text-4xl font-black">{report.totalCars}</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Garage Spent</p>
               <p className="text-4xl font-black text-blue-600">{formatCurrency(report.totalSpentOverall)}</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Avg. Fleet Health</p>
               <p className="text-4xl font-black text-emerald-600">{report.averageGarageHealth}%</p>
            </div>
          </section>

          <div className="space-y-10">
            <h2 className="text-2xl font-black uppercase tracking-tight border-b-2 border-slate-100 pb-4">Individual Car Profiles</h2>
            {report.vehicleSummaries.map((s, i) => (
              <div key={i} className="grid grid-cols-12 gap-8 border-b border-slate-100 pb-10 last:border-0">
                <div className="col-span-4 space-y-2">
                  <h3 className="text-2xl font-black uppercase">{s.vehicle.year} {s.vehicle.make} {s.vehicle.model}</h3>
                  <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Chassis: {s.vehicle.vin || 'Manual Entry'}</p>
                  <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">{s.vehicle.mileage.toLocaleString()} KM // {s.healthScore}% Condition</p>
                </div>
                <div className="col-span-4 space-y-3">
                   <div className="flex justify-between text-xs">
                      <span className="text-slate-400 uppercase font-black tracking-widest">Maintenance Logged</span>
                      <span className="font-bold">{formatCurrency(s.spending.maintenance)}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-slate-400 uppercase font-black tracking-widest">Fuel & Energy</span>
                      <span className="font-bold">{formatCurrency(s.spending.fuel)}</span>
                   </div>
                   <div className="flex justify-between text-xs border-t border-slate-100 pt-2 mt-2">
                      <span className="text-slate-900 uppercase font-black tracking-widest">Total Spent</span>
                      <span className="font-black text-blue-600">{formatCurrency(s.spending.total)}</span>
                   </div>
                </div>
                <div className="col-span-4 text-right space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Resale Estimate</p>
                   <p className="text-3xl font-black text-emerald-600">{s.estimatedValue > 0 ? formatCurrency(s.estimatedValue) : 'AUDIT PENDING'}</p>
                   <p className="text-[9px] font-bold text-slate-300 italic">Based on documentation trust levels</p>
                </div>
              </div>
            ))}
          </div>

          <footer className="mt-24 pt-10 border-t-2 border-slate-100 text-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Personal Vehicle Records // Powered by AutoPal NG Intelligence</p>
          </footer>
        </div>
      </div>

      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[9px]">Comprehensive Garage Audit</span>
          </div>
          <h2 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-[0.85]">Ownership <br/><span className="text-blue-600">Report</span></h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-sm pt-2">An overview of your entire garage, including total costs, car health, and resale estimates.</p>
        </div>

        <div className="flex flex-wrap gap-4">
           <button onClick={handleExcelExport} className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-3">
             <span className="text-xl">📊</span> Download Excel
           </button>
           <button onClick={handlePdfExport} className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all flex items-center gap-3">
             <span className="text-xl">📄</span> Print Professional PDF
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Total Cars</p>
          <div className="text-6xl font-black tracking-tighter text-slate-900">{report.totalCars}</div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Garage Health</p>
          <div className={`text-6xl font-black tracking-tighter ${report.averageGarageHealth > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
            {report.averageGarageHealth}%
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Total Spent on Fleet</p>
          <div className="text-4xl sm:text-5xl font-black tracking-tighter">
            {formatCurrency(report.totalSpentOverall)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Your Vehicle Fleet</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{report.totalCars} Smart Profiles Active</span>
        </div>
        <div className="divide-y divide-slate-50">
          {report.vehicleSummaries.map((s, i) => (
            <div key={i} className="p-8 sm:p-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between hover:bg-slate-50/50 transition-all">
              <div className="space-y-1">
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">{s.vehicle.year} {s.vehicle.make} {s.vehicle.model}</h4>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-tight">VIN: {s.vehicle.vin || 'N/A'}</span>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${s.healthScore > 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{s.healthScore}% Condition</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12 w-full lg:w-auto">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Spent</p>
                  <p className="text-base font-black text-slate-900">{formatCurrency(s.spending.total)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pending Tasks</p>
                  <p className={`text-base font-black ${s.toDoCount > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{s.toDoCount} Items</p>
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Current Value</p>
                  <p className="text-base font-black text-emerald-600">{s.estimatedValue > 0 ? formatCurrency(s.estimatedValue) : 'Needs Audit'}</p>
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