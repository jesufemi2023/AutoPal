
import React, { useState, useEffect, useMemo } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchFuelLogs, calculateLastEfficiency, calculateAverageEfficiency } from '../services/fuelService.ts';
import { formatCurrency, formatDate, kmlToMpg } from '../shared/utils.ts';
import FuelEntryTerminal from './FuelEntryTerminal.tsx';
import { FuelLog } from '../shared/types.ts';
import { 
  LineChart, 
  Line, 
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
  const { vehicles, fuelLogs, setFuelLogs } = useAutoPalStore();
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
      // Find the next "Full" log in chronological order (higher index in our sorted list)
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

  // Data for Charting Engine
  const chartData = useMemo(() => {
    return [...logsWithEfficiency]
      .filter(l => l.tripKml !== null)
      .reverse() // Chronological order
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

  return (
    <div className="space-y-10 sm:space-y-16 animate-slide-up pb-20">
      {/* Dynamic Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[8px] sm:text-[9px]">Neural Telemetry Active</span>
          </div>
          <h2 className="text-5xl sm:text-8xl font-black text-slate-900 tracking-tighter leading-[0.8]">Fuel <br/><span className="text-blue-600">Logic</span></h2>
        </div>
        <button 
          onClick={openAddTerminal}
          className="w-full md:w-auto bg-slate-900 text-white px-12 py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-3xl hover:bg-blue-600 transition-all active:scale-95 group flex items-center justify-center gap-3"
        >
          <span className="text-xl group-hover:rotate-90 transition-transform">⛽</span>
          Log Refill Telemetry
        </button>
      </header>

      {/* Modern Asset Switcher */}
      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {vehicles.map(v => (
          <button 
            key={v.id}
            onClick={() => setActiveVehicleId(v.id)}
            className={`flex-shrink-0 px-10 py-5 rounded-[2rem] border-2 font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-3 ${activeVehicleId === v.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
          >
            <div className={`w-2 h-2 rounded-full ${activeVehicleId === v.id ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
            {v.make} {v.model}
          </button>
        ))}
      </div>

      {/* Analytics Command Center */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
        <div className="bg-white card-radius border border-slate-100 p-8 sm:p-12 flex flex-col justify-between min-h-[300px] relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-8 text-slate-50 font-black text-9xl pointer-events-none group-hover:text-blue-50/50 transition-colors">EFF</div>
          <div className="relative z-10 space-y-8">
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Current Status</h3>
            <div className="space-y-4">
              <div className="text-7xl sm:text-8xl font-black text-slate-900 tracking-tighter flex items-baseline">
                {lastEfficiencyKml ? lastEfficiencyKml.toFixed(1) : '--.-'}
                <span className="text-xl text-slate-300 ml-4 font-sans tracking-normal">KM/L</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="px-4 py-2 bg-slate-950 rounded-xl text-white font-mono font-black text-lg tracking-tighter">
                  {lastEfficiencyMpg ? lastEfficiencyMpg.toFixed(1) : '--.-'} <span className="text-[10px] opacity-40 font-sans ml-1">MPG</span>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${lastEfficiencyKml && lastEfficiencyKml > 10 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                  {lastEfficiencyKml ? (lastEfficiencyKml > 10 ? 'OPTIMAL' : 'BASELINE') : 'AWAITING LOGS'}
                </div>
              </div>
            </div>
          </div>
          <p className="relative z-10 text-[11px] font-black text-slate-400 uppercase tracking-widest mt-8">Computed from last two full tanks</p>
        </div>

        <div className="bg-slate-900 card-radius p-8 sm:p-12 text-white flex flex-col justify-between min-h-[300px] relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 space-y-8">
            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Lifecycle Average</h3>
            <div className="space-y-4">
              <div className="text-7xl sm:text-8xl font-black tracking-tighter flex items-baseline">
                {avgEfficiencyKml ? avgEfficiencyKml.toFixed(1) : '--.-'}
                <span className="text-xl text-slate-600 ml-4 font-sans tracking-normal">KM/L</span>
              </div>
              <div className="flex items-center gap-6">
                 <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono font-black text-lg tracking-tighter">
                    {avgEfficiencyMpg ? avgEfficiencyMpg.toFixed(1) : '--.-'} <span className="text-[10px] opacity-40 font-sans ml-1">MPG</span>
                 </div>
                 <div className="text-slate-500 font-black uppercase text-[10px] tracking-widest">
                   {fuelLogs.length} Records Verified
                 </div>
              </div>
            </div>
          </div>
          <div className="relative z-10 pt-8 border-t border-white/5">
             <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Historical data stream synced</span>
                <span className="text-blue-500 text-xl">✦</span>
             </div>
          </div>
        </div>
      </div>

      {/* Telemetry Performance Curve (The Trend Chart) */}
      <section className="bg-white border border-slate-100 card-radius p-8 sm:p-12 space-y-10 shadow-sm overflow-hidden">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Performance Curve</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency Telemetry Stream</p>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button 
              onClick={() => setMetric('KML')}
              className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${metric === 'KML' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
            >
              KM/L
            </button>
            <button 
              onClick={() => setMetric('MPG')}
              className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${metric === 'MPG' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
            >
              MPG
            </button>
          </div>
        </header>

        <div className="h-72 sm:h-96 w-full">
          {chartData.length >= 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey={metric === 'KML' ? 'kml' : 'mpg'} 
                  stroke="#3b82f6" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorEff)" 
                  animationDuration={1500}
                />
                {avgEfficiencyKml && (
                   <ReferenceLine 
                    y={metric === 'KML' ? avgEfficiencyKml : avgEfficiencyMpg} 
                    stroke="#94a3b8" 
                    strokeDasharray="5 5"
                    label={{ position: 'right', value: 'AVG', fill: '#94a3b8', fontSize: 8, fontWeight: 900 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-200 space-y-4">
              <div className="text-4xl">📉</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Insufficient Data for Curve Analysis</p>
            </div>
          )}
        </div>
      </section>

      {/* Record Stream Section */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            <h3 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Immutable Telemetry Logs</h3>
          </div>
          <span className="bg-slate-50 text-slate-400 px-4 py-1 rounded-full text-[9px] font-black tracking-widest border border-slate-100">
            {fuelLogs.length} ENTRIES
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {logsWithEfficiency.length > 0 ? logsWithEfficiency.map((log, idx) => (
            <div 
              key={log.id} 
              className="bg-white border border-slate-100 p-6 sm:p-10 rounded-[2.5rem] hover:shadow-2xl hover:border-blue-100 transition-all group flex flex-col md:flex-row gap-8 items-start md:items-center justify-between relative"
            >
              <div className="flex items-center gap-6 sm:gap-10 w-full md:w-auto">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-950 rounded-3xl flex flex-col items-center justify-center text-white font-black shadow-xl group-hover:bg-blue-600 transition-colors">
                    <span className="text-[9px] opacity-40 uppercase tracking-widest mb-1">Log</span>
                    <span className="text-xl sm:text-2xl leading-none">{fuelLogs.length - idx}</span>
                  </div>
                  {log.isFullTank && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white border-4 border-white flex items-center justify-center text-[10px] font-black shadow-lg" title="Full Tank Fill">
                      F
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{formatDate(log.createdAt)}</div>
                  <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">
                    {log.liters.toFixed(2)} <span className="text-sm text-slate-300 font-sans tracking-normal font-bold">Liters</span>
                  </h4>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                    {log.vendor || 'Station Generic'}
                  </div>
                </div>
              </div>

              {/* Individual Trip Efficiency Module */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16 w-full md:w-auto pt-8 md:pt-0 border-t md:border-t-0 border-slate-50">
                <div className="space-y-1">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Efficiency</div>
                  {log.tripKml ? (
                    <div className="space-y-1">
                      <div className="text-xl font-black text-emerald-600 tracking-tighter">
                        {log.tripKml.toFixed(1)} <span className="text-[9px] opacity-60">KM/L</span>
                      </div>
                      <div className="text-[11px] font-mono font-black text-slate-400 opacity-60">
                        {kmlToMpg(log.tripKml)?.toFixed(1)} <span className="text-[8px] font-sans">MPG</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xl font-black text-slate-200 italic tracking-tighter">CALC...</div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Odometer</div>
                  <div className="text-xl font-black text-slate-900 tracking-tighter font-mono">
                    {log.odometerKm.toLocaleString()} <span className="text-[9px] opacity-40 font-sans">KM</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-blue-500" style={{ width: '60%' }}></div>
                  </div>
                </div>

                <div className="col-span-2 md:col-span-1 space-y-1 text-left md:text-right flex flex-col items-start md:items-end">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Investment</div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(log.totalCost)}</div>
                  <div className="flex items-center gap-4 mt-2">
                     <button 
                       onClick={() => openEditTerminal(log)}
                       className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors tracking-widest"
                     >
                       Edit Record
                     </button>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="py-32 text-center bg-white card-radius border-2 border-dashed border-slate-100 p-12">
              <div className="w-24 h-24 bg-slate-50 rounded-[3rem] flex items-center justify-center mx-auto mb-8 text-slate-200 text-4xl shadow-inner animate-pulse-slow">📭</div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Telemetry Stream Empty</h3>
              <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Initialize link by logging your first refill</p>
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
