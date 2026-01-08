
import React, { useState, useEffect, useMemo } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchFuelLogs, calculateAverageEfficiency, deleteFuelLog } from '../services/fuelService.ts';
import { formatCurrency, formatDate, kmlToMpg } from '../shared/utils.ts';
import FuelEntryTerminal from './FuelEntryTerminal.tsx';
import { FuelLog } from '../shared/types.ts';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Area, 
  AreaChart,
  ReferenceLine,
  Line,
  ComposedChart
} from 'recharts';

const FuelIntelligenceCenter: React.FC = () => {
  const { vehicles, fuelLogs, setFuelLogs, removeFuelLogStore } = useAutoPalStore();
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(vehicles[0]?.id || null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null);
  const [metric, setMetric] = useState<'KML' | 'MPG'>('KML');

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  useEffect(() => {
    if (activeVehicleId) {
      setIsLoading(true);
      fetchFuelLogs(activeVehicleId)
        .then(setFuelLogs)
        .finally(() => setIsLoading(false));
    }
  }, [activeVehicleId, setFuelLogs]);

  // Comprehensive Logic Engine for Efficiency and Cost Analytics
  // Implementing "Full-to-Full Cumulative Block" Logic
  const logsWithAnalytics = useMemo(() => {
    const sorted = [...fuelLogs].sort((a, b) => b.odometerKm - a.odometerKm);
    return sorted.map((log, index) => {
      let tripKml: number | null = null;
      let tripDistance: number | null = null;
      const costPerLiter = log.liters > 0 ? log.totalCost / log.liters : 0;
      
      if (log.isFullTank) {
        // Find the previous "Full" log to close the block
        const prevFullIndex = sorted.slice(index + 1).findIndex(l => l.isFullTank);
        if (prevFullIndex !== -1) {
          const actualPrevIndex = prevFullIndex + index + 1;
          const prevFull = sorted[actualPrevIndex];
          const dist = log.odometerKm - prevFull.odometerKm;
          
          if (dist > 0) {
            tripDistance = dist;
            // The fuel consumed for this distance is the sum of liters from this Full log 
            // and all partial logs that happened after the previous Full log.
            const blockLogs = sorted.slice(index, actualPrevIndex);
            const totalLiters = blockLogs.reduce((acc, l) => acc + l.liters, 0);
            
            if (totalLiters > 0) {
              tripKml = dist / totalLiters;
            }
          }
        }
      }
      return { ...log, tripKml, costPerLiter, tripDistance };
    });
  }, [fuelLogs]);

  const efficienciesKml = useMemo(() => 
    logsWithAnalytics.filter(l => l.tripKml !== null && !isNaN(l.tripKml)).map(l => l.tripKml as number),
    [logsWithAnalytics]
  );

  const currentEffKml = efficienciesKml[0] || null;
  const previousEffKml = efficienciesKml[1] || null;
  const avgEfficiencyKml = useMemo(() => calculateAverageEfficiency(fuelLogs), [fuelLogs]);
  
  const avgPricePerLiter = useMemo(() => {
    const validLogs = fuelLogs.filter(l => l.liters > 0 && l.totalCost > 0);
    if (validLogs.length === 0) return 0;
    return validLogs.reduce((acc, l) => acc + (l.totalCost / l.liters), 0) / validLogs.length;
  }, [fuelLogs]);
  
  const efficiencyDelta = useMemo(() => {
    if (currentEffKml === null || previousEffKml === null) return null;
    return ((currentEffKml - previousEffKml) / previousEffKml) * 100;
  }, [currentEffKml, previousEffKml]);

  // Chart Data Pipeline
  const chartData = useMemo(() => {
    const data = [...logsWithAnalytics].reverse();
    return data.map((l, idx) => {
      const slice = data.slice(Math.max(0, idx - 2), idx + 1);
      const movingAvg = slice.reduce((acc, curr) => acc + curr.costPerLiter, 0) / slice.length;

      return {
        date: formatDate(l.createdAt),
        kml: l.tripKml ? parseFloat(l.tripKml.toFixed(2)) : null,
        mpg: l.tripKml ? parseFloat(kmlToMpg(l.tripKml)!.toFixed(2)) : null,
        cost: parseFloat(l.costPerLiter.toFixed(2)),
        avgCostTrend: parseFloat(movingAvg.toFixed(2)),
        odo: l.odometerKm
      };
    });
  }, [logsWithAnalytics]);

  const CustomTooltip = ({ active, payload, label, mode }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl z-[100]">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>
          <div className="space-y-2">
            {payload.map((p: any, i: number) => (
              <div key={i} className="flex flex-col">
                <p className="text-white text-xl font-black tracking-tighter">
                  {p.name === 'avgCostTrend' ? 'Trend: ' : ''}
                  {mode === 'cost' ? formatCurrency(p.value) : p.value} 
                  <span className="text-[10px] text-slate-500 uppercase ml-1">
                    {mode === 'cost' ? '/ L' : metric}
                  </span>
                </p>
                {p.name === 'avgCostTrend' && (
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest -mt-1">Rolling Average</span>
                )}
              </div>
            ))}
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest pt-1 border-t border-slate-800">
              Odo: {payload[0].payload.odo?.toLocaleString()} KM
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleDeleteRecord = async (logId: string) => {
    if (!window.confirm("CAUTION: Purging this record will permanently alter efficiency telemetry. Proceed?")) return;
    try {
      await deleteFuelLog(logId);
      removeFuelLogStore(logId);
    } catch (err: any) {
      alert("System Error: " + (err.message || "Failed to purge record."));
    }
  };

  return (
    <div className="space-y-8 sm:space-y-16 animate-slide-up pb-24 sm:pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[8px] sm:text-[9px]">Neural Telemetry Active</span>
          </div>
          <h2 className="text-5xl sm:text-8xl font-black text-slate-900 tracking-tighter leading-[0.8] transition-all">
            Fuel <br/><span className="text-blue-600">Logic</span>
          </h2>
        </div>
        <button 
          onClick={() => { setEditingLog(null); setShowTerminal(true); }}
          className="w-full md:w-auto bg-slate-900 text-white px-8 sm:px-12 py-5 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] shadow-3xl hover:bg-blue-600 transition-all active:scale-95 group flex items-center justify-center gap-3"
        >
          <span className="text-lg sm:text-xl group-hover:rotate-90 transition-transform">⛽</span>
          Log Refill
        </button>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between min-h-[180px] relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 text-blue-500/5 font-black text-6xl pointer-events-none select-none uppercase">Now</div>
          <div className="relative z-10 space-y-4">
            <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Last Efficiency</h3>
            <div className="space-y-2">
              <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-baseline">
                {currentEffKml ? currentEffKml.toFixed(1) : '--.-'}
                <span className="text-xs text-slate-300 ml-2 font-sans font-bold">KM/L</span>
              </div>
              {efficiencyDelta !== null && (
                <div className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${efficiencyDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {efficiencyDelta >= 0 ? '▲' : '▼'} {Math.abs(efficiencyDelta).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between min-h-[180px] relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 text-slate-200/40 font-black text-6xl pointer-events-none select-none uppercase">Prev</div>
          <div className="relative z-10 space-y-4">
            <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Previous Run</h3>
            <div className="text-4xl font-black text-slate-500 tracking-tighter flex items-baseline">
              {previousEffKml ? previousEffKml.toFixed(1) : '--.-'}
              <span className="text-xs text-slate-200 ml-2 font-sans font-bold">KM/L</span>
            </div>
            <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
              {previousEffKml ? "Calibrated" : "Waiting for Anchor"}
            </div>
          </div>
        </div>

        <div className="bg-white card-radius border border-slate-100 p-8 flex flex-col justify-between min-h-[180px] relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 text-emerald-500/5 font-black text-6xl pointer-events-none select-none uppercase">Price</div>
          <div className="relative z-10 space-y-4">
            <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em]">Avg. Price / L</h3>
            <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-baseline">
              {formatCurrency(avgPricePerLiter)}
            </div>
            <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Market Telemetry</div>
          </div>
        </div>

        <div className="bg-slate-900 card-radius p-8 text-white flex flex-col justify-between min-h-[180px] relative overflow-hidden group shadow-xl">
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 space-y-4">
            <h3 className="text-slate-500 text-[8px] font-black uppercase tracking-[0.4em]">Fleet Average</h3>
            <div className="text-4xl font-black tracking-tighter flex items-baseline">
              {avgEfficiencyKml ? avgEfficiencyKml.toFixed(1) : '--.-'}
              <span className="text-xs text-slate-600 ml-2 font-sans font-bold">KM/L</span>
            </div>
            <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Lifetime Precision</div>
          </div>
        </div>
      </div>

      {/* DUAL CHART VISUALIZATION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
        {/* EFFICIENCY CURVE */}
        <section className="bg-white border border-slate-100 card-radius p-6 sm:p-10 space-y-8 shadow-sm overflow-hidden min-h-[450px]">
          <header className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Performance Curve</h3>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Efficiency over time (Full Tank Anchors)</p>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button onClick={() => setMetric('KML')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${metric === 'KML' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}>KM/L</button>
              <button onClick={() => setMetric('MPG')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${metric === 'MPG' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}>MPG</button>
            </div>
          </header>
          <div className="h-64 sm:h-80 w-full relative" key={`eff-chart-${activeVehicleId}`}>
            {efficienciesKml.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.filter(d => d.kml !== null)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={30} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey={metric === 'KML' ? 'kml' : 'mpg'} stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorEff)" />
                  {avgEfficiencyKml && (
                    <ReferenceLine y={metric === 'KML' ? avgEfficiencyKml : kmlToMpg(avgEfficiencyKml) || 0} stroke="#cbd5e1" strokeDasharray="4 4" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <div className="text-3xl">📊</div>
                <p className="text-[9px] font-black uppercase tracking-widest">Awaiting Two Full Refills</p>
              </div>
            )}
          </div>
        </section>

        {/* COST DYNAMICS */}
        <section className="bg-white border border-slate-100 card-radius p-6 sm:p-10 space-y-8 shadow-sm overflow-hidden min-h-[450px]">
          <header className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Cost Dynamics</h3>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Price per liter trend</p>
            </div>
            <div className="hidden sm:flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-0.5 bg-emerald-500"></div>
                 <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Spot Price</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-0.5 bg-emerald-700"></div>
                 <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Rolling Avg</span>
               </div>
            </div>
          </header>
          <div className="h-64 sm:h-80 w-full relative" key={`cost-chart-${activeVehicleId}`}>
            {fuelLogs.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={30} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip mode="cost" />} cursor={{ stroke: '#10b981', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
                  <Line type="monotone" dataKey="avgCostTrend" stroke="#047857" strokeWidth={4} dot={false} strokeDasharray="none" />
                  {avgPricePerLiter > 0 && (
                    <ReferenceLine y={avgPricePerLiter} stroke="#cbd5e1" strokeDasharray="4 4" />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <div className="text-3xl">💸</div>
                <p className="text-[9px] font-black uppercase tracking-widest">Awaiting Logs</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* RECORD STREAM */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-900">Immutable Record Stream</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {logsWithAnalytics.map((log, idx) => (
            <div key={log.id} className="bg-white border border-slate-100 p-6 sm:p-8 rounded-[2rem] hover:shadow-xl transition-all group flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between relative shadow-sm overflow-hidden">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none select-none text-[8px] font-black uppercase tracking-[0.8em] rotate-90 origin-right whitespace-nowrap">
                AUTOPAL_LEDGER_NODE_{log.id.slice(0, 8)}
              </div>

              <div className="flex items-center gap-6 w-full lg:w-auto relative z-10">
                <div className="relative">
                  <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white font-black transition-colors duration-500 ${log.isFullTank ? 'bg-slate-900 group-hover:bg-blue-600' : 'bg-slate-100 group-hover:bg-slate-200 !text-slate-400'}`}>
                    <span className="text-[7px] opacity-40 uppercase tracking-widest mb-0.5 font-sans">Node</span>
                    <span className="text-lg leading-none">{fuelLogs.length - idx}</span>
                  </div>
                  {log.isFullTank && (
                    <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white border-2 border-white flex items-center justify-center text-[8px] font-black shadow-lg">F</div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                    {formatDate(log.createdAt)}
                  </div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tighter leading-none">
                    {log.liters.toFixed(2)} <span className="text-[10px] text-slate-300 font-sans font-bold">Liters</span>
                  </h4>
                  {log.tripDistance && (
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      +{log.tripDistance.toLocaleString()} KM block
                    </div>
                  )}
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{log.vendor || 'Station Node'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-y-6 gap-x-8 w-full lg:w-auto pt-6 lg:pt-0 border-t lg:border-t-0 border-slate-50 relative z-10">
                <div className="space-y-1">
                  <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Efficiency</div>
                  {log.tripKml ? (
                    <div className="text-lg font-black text-emerald-600 tracking-tighter leading-none">
                      {log.tripKml.toFixed(1)} <span className="text-[8px] opacity-60">KM/L</span>
                    </div>
                  ) : (
                    <div className={`text-[10px] font-black tracking-widest leading-none py-1.5 ${log.isFullTank ? 'text-slate-200 italic' : 'text-blue-400 animate-pulse'}`}>
                      {log.isFullTank ? 'ANCHOR' : 'ACCUMULATING...'}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Price / L</div>
                  <div className="text-lg font-black text-slate-900 tracking-tighter leading-none">{formatCurrency(log.costPerLiter)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Investment</div>
                  <div className="text-lg font-black text-slate-900 tracking-tighter leading-none">{formatCurrency(log.totalCost)}</div>
                </div>
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2 lg:gap-3">
                   <button onClick={() => { setEditingLog(log); setShowTerminal(true); }} className="flex-1 lg:flex-none px-4 py-2 rounded-xl bg-slate-50 text-[8px] font-black uppercase text-blue-600 hover:bg-blue-600 hover:text-white transition-all tracking-widest border border-slate-100 shadow-sm">Correct</button>
                   <button onClick={() => handleDeleteRecord(log.id)} className="flex-1 lg:flex-none px-4 py-2 rounded-xl bg-rose-50 text-[8px] font-black uppercase text-rose-500 hover:bg-rose-600 hover:text-white transition-all tracking-widest border border-rose-100 shadow-sm">Purge</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showTerminal && activeVehicle && (
        <FuelEntryTerminal vehicleId={activeVehicle.id} currentOdo={activeVehicle.mileage} initialLog={editingLog || undefined} onClose={() => { setShowTerminal(false); setEditingLog(null); }} />
      )}
    </div>
  );
};

export default FuelIntelligenceCenter;
