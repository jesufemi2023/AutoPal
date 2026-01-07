import React, { useState, useEffect, useMemo } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchFuelLogs, calculateLastEfficiency, calculateAverageEfficiency, deleteFuelLog } from '../services/fuelService.ts';
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
  ReferenceLine
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

  const lastEfficiencyKml = calculateLastEfficiency(fuelLogs);
  const avgEfficiencyKml = calculateAverageEfficiency(fuelLogs);
  
  const lastEfficiencyMpg = kmlToMpg(lastEfficiencyKml);
  const avgEfficiencyMpg = kmlToMpg(avgEfficiencyKml);

  // Advanced: Calculate per-trip efficiency for the history list and chart
  const logsWithEfficiency = useMemo(() => {
    const sorted = [...fuelLogs].sort((a, b) => b.odometerKm - a.odometerKm);
    return sorted.map((log, index) => {
      let tripKml: number | null = null;
      if (log.isFullTank) {
        const prevFull = sorted.slice(index + 1).find(l => l.isFullTank);
        if (prevFull) {
          const dist = log.odometerKm - prevFull.odometerKm;
          if (dist > 0) tripKml = dist / log.liters;
        }
      }
      return { ...log, tripKml };
    });
  }, [fuelLogs]);

  const chartData = useMemo(() => {
    return [...logsWithEfficiency]
      .filter(l => l.tripKml !== null)
      .reverse()
      .map(l => ({
        date: formatDate(l.createdAt),
        kml: parseFloat(l.tripKml!.toFixed(2)),
        mpg: parseFloat(kmlToMpg(l.tripKml)!.toFixed(2)),
        odo: l.odometerKm
      }));
  }, [logsWithEfficiency]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-white text-xl font-black tracking-tighter">
              {payload[0].value} <span className="text-[10px] text-slate-500 uppercase">{metric}</span>
            </p>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
              Odometer: {payload[0].payload.odo.toLocaleString()} KM
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const openAddTerminal = () => {
    setEditingLog(null);
    setShowTerminal(true);
  };

  const openEditTerminal = (log: FuelLog) => {
    setEditingLog(log);
    setShowTerminal(true);
  };

  const handleDeleteRecord = async (logId: string) => {
    if (!window.confirm("CAUTION: This action purges a verified entry from the vehicle's immutable ledger. Efficiency projections will be recalibrated. Proceed?")) {
      return;
    }

    try {
      await deleteFuelLog(logId);
      removeFuelLogStore(logId);
    } catch (err: any) {
      alert("System Error: Failed to purge record from telemetry. " + (err.message || ""));
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
          onClick={openAddTerminal}
          className="w-full md:w-auto bg-slate-900 text-white px-8 sm:px-12 py-5 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] shadow-3xl hover:bg-blue-600 transition-all active:scale-95 group flex items-center justify-center gap-3"
        >
          <span className="text-lg sm:text-xl group-hover:rotate-90 transition-transform">⛽</span>
          Log Refill
        </button>
      </header>

      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {vehicles.map(v => (
          <button 
            key={v.id}
            onClick={() => setActiveVehicleId(v.id)}
            className={`flex-shrink-0 px-6 sm:px-10 py-4 sm:py-5 rounded-[1.25rem] sm:rounded-[2rem] border-2 font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all flex items-center gap-2 sm:gap-3 ${activeVehicleId === v.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
          >
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${activeVehicleId === v.id ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
            {v.make} {v.model}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-10">
        <div className="bg-white card-radius border border-slate-100 p-6 sm:p-12 flex flex-col justify-between min-h-[220px] sm:min-h-[300px] relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-4 sm:p-8 text-slate-50 font-black text-7xl sm:text-9xl pointer-events-none group-hover:text-blue-50/50 transition-colors">EFF</div>
          <div className="relative z-10 space-y-4 sm:space-y-8">
            <h3 className="text-slate-400 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em]">Current Efficiency</h3>
            <div className="space-y-2 sm:space-y-4">
              <div className="text-5xl sm:text-8xl font-black text-slate-900 tracking-tighter flex items-baseline">
                {lastEfficiencyKml ? lastEfficiencyKml.toFixed(1) : '--.-'}
                <span className="text-sm sm:text-xl text-slate-300 ml-2 sm:ml-4 font-sans tracking-normal font-bold">KM/L</span>
              </div>
              <div className="flex items-center gap-3 sm:gap-6">
                <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-950 rounded-lg sm:rounded-xl text-white font-mono font-black text-sm sm:text-lg tracking-tighter">
                  {lastEfficiencyMpg ? lastEfficiencyMpg.toFixed(1) : '--.-'} <span className="text-[8px] sm:text-[10px] opacity-40 font-sans ml-0.5">MPG</span>
                </div>
                <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest border ${lastEfficiencyKml && lastEfficiencyKml > 10 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                  {lastEfficiencyKml ? (lastEfficiencyKml > 10 ? 'OPTIMAL' : 'BASELINE') : 'AWAITING LOGS'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 card-radius p-6 sm:p-12 text-white flex flex-col justify-between min-h-[220px] sm:min-h-[300px] relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-48 sm:w-64 h-48 sm:h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 space-y-4 sm:space-y-8">
            <h3 className="text-slate-500 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em]">Network Average</h3>
            <div className="space-y-2 sm:space-y-4">
              <div className="text-5xl sm:text-8xl font-black tracking-tighter flex items-baseline">
                {avgEfficiencyKml ? avgEfficiencyKml.toFixed(1) : '--.-'}
                <span className="text-sm sm:text-xl text-slate-600 ml-2 sm:ml-4 font-sans tracking-normal font-bold">KM/L</span>
              </div>
              <div className="flex items-center gap-3 sm:gap-6">
                 <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white font-mono font-black text-sm sm:text-lg tracking-tighter">
                    {avgEfficiencyMpg ? avgEfficiencyMpg.toFixed(1) : '--.-'} <span className="text-[8px] sm:text-[10px] opacity-40 font-sans ml-0.5">MPG</span>
                 </div>
                 <div className="text-slate-500 font-black uppercase text-[8px] sm:text-[9px] tracking-widest">
                   {fuelLogs.length} Records Streamed
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-white border border-slate-100 card-radius p-6 sm:p-12 space-y-8 sm:space-y-10 shadow-sm overflow-hidden">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">Performance Curve</h3>
            <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Dynamic Efficiency Telemetry</p>
          </div>
          <div className="flex bg-slate-50 p-1 rounded-xl sm:rounded-2xl border border-slate-100 self-start sm:self-center">
            <button 
              onClick={() => setMetric('KML')}
              className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${metric === 'KML' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}
            >
              KM/L
            </button>
            <button 
              onClick={() => setMetric('MPG')}
              className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${metric === 'MPG' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}
            >
              MPG
            </button>
          </div>
        </header>

        <div className="h-60 sm:h-96 w-full touch-pan-x">
          {chartData.length >= 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  minTickGap={30}
                  tick={{ fontSize: 8, fontWeight: 800, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 8, fontWeight: 800, fill: '#94a3b8' }} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1 }} />
                <Area 
                  type="monotone" 
                  dataKey={metric === 'KML' ? 'kml' : 'mpg'} 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorEff)" 
                  animationDuration={1000}
                />
                {avgEfficiencyKml && (
                   <ReferenceLine 
                    y={metric === 'KML' ? avgEfficiencyKml : avgEfficiencyMpg} 
                    stroke="#cbd5e1" 
                    strokeDasharray="4 4"
                    label={{ position: 'right', value: 'AVG', fill: '#94a3b8', fontSize: 7, fontWeight: 900 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-200 space-y-4">
              <div className="text-4xl animate-pulse">📉</div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Telemetry Insufficient</p>
            </div>
          )}
        </div>
      </section>

      <div className="space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs text-slate-900">Immutable Record Stream</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[8px] font-black tracking-widest border border-emerald-100 uppercase">
              SYNCED
            </span>
            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[8px] font-black tracking-widest border border-slate-200 uppercase">
              {fuelLogs.length} ENTRIES
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {logsWithEfficiency.length > 0 ? logsWithEfficiency.map((log, idx) => (
            <div 
              key={log.id} 
              className="bg-white border border-slate-100 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] hover:shadow-xl hover:border-blue-100 transition-all group flex flex-col lg:flex-row gap-6 lg:gap-8 items-start lg:items-center justify-between relative shadow-sm overflow-hidden"
            >
              {/* Immutable Ledger Watermark */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none text-[8px] sm:text-[10px] font-black uppercase tracking-[0.8em] rotate-90 origin-right whitespace-nowrap">
                PERMANENT LEDGER ENTRY • HASHED RECORD
              </div>

              <div className="flex items-center gap-5 sm:gap-10 w-full lg:w-auto relative z-10">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-white font-black shadow-lg group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-500">
                    <span className="text-[7px] sm:text-[9px] opacity-40 uppercase tracking-widest mb-0.5 sm:mb-1">Log</span>
                    <span className="text-lg sm:text-2xl leading-none">{fuelLogs.length - idx}</span>
                  </div>
                  {/* Sealed Record Icon */}
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-blue-400 border-2 sm:border-4 border-white flex items-center justify-center text-[10px] sm:text-xs shadow-md">
                    🛡️
                  </div>
                  {log.isFullTank && (
                    <div className="absolute -top-1.5 -left-1.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-500 text-white border-2 sm:border-4 border-white flex items-center justify-center text-[8px] sm:text-[10px] font-black shadow-md">
                      F
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[8px] sm:text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                    {formatDate(log.createdAt)}
                  </div>
                  <h4 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tighter leading-none">
                    {log.liters.toFixed(2)} <span className="text-xs sm:text-sm text-slate-300 font-sans tracking-normal font-bold">Liters</span>
                  </h4>
                  <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    {log.vendor || 'Station Point'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8 sm:gap-x-12 lg:gap-16 w-full lg:w-auto pt-6 lg:pt-0 border-t lg:border-t-0 border-slate-50 relative z-10">
                <div className="space-y-1">
                  <div className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    Efficiency
                    <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                  </div>
                  {log.tripKml ? (
                    <div className="space-y-0.5">
                      <div className="text-lg sm:text-2xl font-black text-emerald-600 tracking-tighter">
                        {log.tripKml.toFixed(1)} <span className="text-[8px] sm:text-[9px] opacity-60">KM/L</span>
                      </div>
                      <div className="text-[9px] sm:text-[11px] font-mono font-black text-slate-300">
                        {kmlToMpg(log.tripKml)?.toFixed(1)} <span className="text-[7px] sm:text-[8px] font-sans">MPG</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-lg sm:text-2xl font-black text-slate-100 italic tracking-tighter">BOOTING...</div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    Odometer
                    <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tighter font-mono">
                    {log.odometerKm.toLocaleString()} <span className="text-[8px] sm:text-[9px] opacity-40 font-sans">KM</span>
                  </div>
                  <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden mt-1 sm:mt-2">
                    <div className="h-full bg-blue-500/30" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div className="col-span-2 md:col-span-2 lg:col-span-1 space-y-1 flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start">
                  <div className="lg:text-right">
                    <div className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Investment</div>
                    <div className="text-xl sm:text-3xl font-black text-slate-900 tracking-tighter leading-none">{formatCurrency(log.totalCost)}</div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 lg:mt-3">
                     <button 
                       onClick={() => openEditTerminal(log)}
                       className="px-4 sm:px-6 py-2 rounded-xl bg-slate-50 text-[8px] sm:text-[10px] font-black uppercase text-blue-600 hover:bg-blue-600 hover:text-white transition-all tracking-widest border border-slate-100 shadow-sm opacity-60 hover:opacity-100"
                     >
                       Correct
                     </button>
                     <button 
                       /* Fix: Replaced undefined logId with log.id */
                       onClick={() => handleDeleteRecord(log.id)}
                       className="px-4 sm:px-6 py-2 rounded-xl bg-rose-50 text-[8px] sm:text-[10px] font-black uppercase text-rose-500 hover:bg-rose-600 hover:text-white transition-all tracking-widest border border-rose-100 shadow-sm opacity-60 hover:opacity-100"
                     >
                       Purge
                     </button>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="py-24 sm:py-32 text-center bg-white card-radius border-2 border-dashed border-slate-100 p-8 sm:p-12">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 rounded-[2.5rem] sm:rounded-[3rem] flex items-center justify-center mx-auto mb-6 sm:mb-8 text-slate-200 text-3xl sm:text-4xl shadow-inner animate-pulse-slow">📭</div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 tracking-tight">Stream Standby</h3>
              <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[9px]">Awaiting initial refill calibration</p>
            </div>
          )}
        </div>
      </div>

      {showTerminal && activeVehicle && (
        <FuelEntryTerminal 
          vehicleId={activeVehicle.id} 
          currentOdo={activeVehicle.mileage} 
          initialLog={editingLog || undefined}
          onClose={() => {
            setShowTerminal(false);
            setEditingLog(null);
          }} 
        />
      )}
    </div>
  );
};

export default FuelIntelligenceCenter;