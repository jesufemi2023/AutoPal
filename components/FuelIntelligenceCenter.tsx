
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

/**
 * Fuel Intelligence Center
 * Immersive dashboard for fuel efficiency tracking and cost analysis.
 */
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
        .catch(err => console.error("Fuel log fetch failure", err))
        .finally(() => setIsLoading(false));
    }
  }, [activeVehicleId, setFuelLogs]);

  // Comprehensive Logic Engine for Efficiency and Cost Analytics
  const logsWithAnalytics = useMemo(() => {
    const sorted = [...fuelLogs].sort((a, b) => b.odometerKm - a.odometerKm);
    
    return sorted.map((log, index) => {
      let tripKml: number | null = null;
      let tripDistance: number | null = null;
      const costPerLiter = log.liters > 0 ? log.totalCost / log.liters : 0;
      
      if (log.isFullTank) {
        const prevFullIndex = sorted.slice(index + 1).findIndex(l => l.isFullTank);
        if (prevFullIndex !== -1) {
          const actualPrevIndex = prevFullIndex + index + 1;
          const prevFull = sorted[actualPrevIndex];
          const dist = log.odometerKm - prevFull.odometerKm;
          
          if (dist > 0) {
            tripDistance = dist;
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
    logsWithAnalytics
      .filter(l => l.tripKml !== null && !isNaN(l.tripKml) && isFinite(l.tripKml))
      .map(l => l.tripKml as number),
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

  const chartData = useMemo(() => {
    const data = [...logsWithAnalytics].reverse();
    return data.map((l, idx) => {
      const slice = data.slice(Math.max(0, idx - 2), idx + 1);
      const validSlice = slice.filter(s => s.costPerLiter > 0);
      const movingAvg = validSlice.length > 0 
        ? validSlice.reduce((acc, curr) => acc + curr.costPerLiter, 0) / validSlice.length 
        : l.costPerLiter;

      return {
        id: l.id,
        date: formatDate(l.createdAt),
        kml: (l.tripKml && isFinite(l.tripKml)) ? parseFloat(l.tripKml.toFixed(2)) : null,
        mpg: (l.tripKml && isFinite(l.tripKml)) ? parseFloat(kmlToMpg(l.tripKml)!.toFixed(2)) : null,
        cost: parseFloat(l.costPerLiter.toFixed(2)),
        avgCostTrend: parseFloat(movingAvg.toFixed(2)),
        odo: l.odometerKm,
        rawDate: l.createdAt
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

  const hasEnoughForEff = efficienciesKml.length > 0;
  const hasLogsAtAll = fuelLogs.length > 0;

  return (
    <div className="space-y-8 sm:space-y-16 animate-slide-up pb-24 sm:pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`}></div>
            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[8px] sm:text-[9px]">
              {isLoading ? 'Synchronizing Sensors...' : 'Neural Telemetry Active'}
            </span>
          </div>
          <h2 className="text-5xl sm:text-8xl font-black text-slate-900 tracking-tighter leading-[0.8] transition-all">
            Fuel <br/><span className="text-blue-600">Logic</span>
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          {vehicles.length > 1 && (
            <select 
              className="bg-white border-2 border-slate-100 px-6 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] outline-none focus:border-blue-600 transition-all shadow-sm"
              value={activeVehicleId || ''}
              onChange={(e) => setActiveVehicleId(e.target.value)}
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
              ))}
            </select>
          )}
          <button 
            onClick={() => setShowTerminal(true)}
            className="flex-1 sm:flex-none bg-emerald-600 text-white px-10 py-6 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all"
          >
            + Log Refill
          </button>
        </div>
      </header>

      {/* Logic for metrics switching */}
      <div className="flex justify-end gap-2 px-2">
        {['KML', 'MPG'].map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m as 'KML' | 'MPG')}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${metric === m ? 'bg-slate-900 text-white' : 'text-slate-400 bg-slate-100 hover:bg-slate-200'}`}
          >
            {m}
          </button>
        ))}
      </div>

      {!hasLogsAtAll ? (
        <div className="py-24 sm:py-48 text-center bg-white card-radius border-4 border-dashed border-slate-100 px-6 sm:px-16">
          <div className="w-20 h-20 sm:w-32 sm:h-32 bg-slate-50 rounded-2xl sm:rounded-[4rem] flex items-center justify-center text-4xl sm:text-5xl mx-auto mb-8 sm:mb-12 shadow-inner">⛽</div>
          <h3 className="text-2xl sm:text-4xl font-black text-slate-900 mb-2 sm:mb-4 tracking-tighter">No Analytics Found</h3>
          <p className="text-slate-400 mb-10 sm:mb-16 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">Neural link needs refill telemetry to start projections</p>
          <button onClick={() => setShowTerminal(true)} className="w-full sm:w-auto bg-slate-900 text-white px-10 sm:px-16 py-6 sm:py-8 rounded-2xl sm:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] shadow-3xl hover:bg-emerald-600 transition-all">Record First Refill</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Dashboard Stats */}
          <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Avg Efficiency</div>
              <div className="text-3xl font-black text-slate-900 tracking-tighter">
                {avgEfficiencyKml ? (metric === 'KML' ? avgEfficiencyKml.toFixed(2) : kmlToMpg(avgEfficiencyKml)?.toFixed(2)) : '--'}
                <span className="text-sm ml-1 opacity-40 font-mono">{metric}</span>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cost Velocity</div>
              <div className="text-3xl font-black text-slate-900 tracking-tighter">
                {formatCurrency(avgPricePerLiter)}<span className="text-sm ml-1 opacity-40">/L</span>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Performance Shift</div>
              <div className={`text-3xl font-black tracking-tighter ${efficiencyDelta !== null && efficiencyDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {efficiencyDelta !== null ? `${efficiencyDelta > 0 ? '+' : ''}${efficiencyDelta.toFixed(1)}%` : '--'}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Refills</div>
              <div className="text-3xl font-black text-slate-900 tracking-tighter">
                {fuelLogs.length}
              </div>
            </div>
          </div>
          
          {/* Charts Area */}
          <div className="lg:col-span-12 h-[400px] bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
             <ResponsiveContainer width="100%" height="100%">
               <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="colorKml" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip mode="efficiency" />} />
                  <Area type="monotone" dataKey={metric === 'KML' ? 'kml' : 'mpg'} stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorKml)" />
                  <Line type="monotone" dataKey="avgCostTrend" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
               </ComposedChart>
             </ResponsiveContainer>
          </div>

          {/* Historical Logs Table */}
          <div className="lg:col-span-12 bg-white card-radius border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pump Vendor</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume / Cost</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logsWithAnalytics.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                       <div className="text-sm font-bold text-slate-900">{formatDate(log.createdAt)}</div>
                       <div className="text-[10px] font-mono text-slate-400">{log.odometerKm.toLocaleString()} KM</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-slate-600">{log.vendor || 'Independent'}</div>
                      <div className="text-[9px] font-black uppercase text-blue-500 tracking-widest">{log.isFullTank ? 'Full Refill' : 'Partial'}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-black text-slate-900">{formatCurrency(log.totalCost)}</div>
                      <div className="text-[10px] font-bold text-slate-400">{log.liters}L @ {formatCurrency(log.costPerLiter)}/L</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button onClick={() => handleDeleteRecord(log.id)} className="text-rose-500 text-[10px] font-black uppercase tracking-widest hover:underline">Purge</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showTerminal && activeVehicle && (
        <FuelEntryTerminal 
          vehicleId={activeVehicle.id} 
          currentOdo={activeVehicle.mileage} 
          onClose={() => setShowTerminal(false)} 
        />
      )}
    </div>
  );
};

export default FuelIntelligenceCenter;
