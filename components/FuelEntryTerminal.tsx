import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { addFuelLog, updateFuelLog } from '../services/fuelService.ts';
import { updateMileage as syncOdometerBridge } from '../services/vehicleService.ts';
import { ENV } from '../services/envService.ts';
import { FuelLog } from '../shared/types.ts';
import { canLogFuel } from '../services/permissionService.ts';

interface FuelEntryTerminalProps {
  vehicleId: string;
  currentOdo: number;
  initialLog?: FuelLog;
  onClose: () => void;
}

const FuelEntryTerminal: React.FC<FuelEntryTerminalProps> = ({ vehicleId, currentOdo, initialLog, onClose }) => {
  const { addFuelLogStore, updateFuelLogStore, syncVehicleState, user, updateUsageLedger } = useAutoPalStore();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [form, setForm] = useState({
    liters: initialLog?.liters.toString() || '',
    cost: initialLog?.totalCost.toString() || '',
    odometer: initialLog?.odometerKm.toString() || (currentOdo + 1).toString(),
    isFull: initialLog ? initialLog.isFullTank : true,
    vendor: initialLog?.vendor || ''
  });

  const [error, setError] = useState<string | null>(null);

  const handleCommit = async () => {
    if (!user) return;

    if (!initialLog) {
      const permission = canLogFuel(user);
      if (!permission.allowed) {
        setError(permission.reason || "Quota reached.");
        return;
      }
    }

    const odo = parseInt(form.odometer);
    const lit = parseFloat(form.liters);
    const cost = parseFloat(form.cost);

    if (isNaN(odo) || odo < (initialLog ? 0 : currentOdo)) {
      setError(`Odometer must be at least ${currentOdo} KM.`);
      return;
    }
    if (isNaN(lit) || lit <= 0) {
      setError("Please enter the amount of fuel in liters.");
      return;
    }
    if (!form.vendor.trim()) {
      setError("Please enter the name of the fuel station.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (initialLog) {
        // Edit Mode
        const updated = await updateFuelLog(initialLog.id, {
          liters: lit,
          totalCost: isNaN(cost) ? 0 : cost,
          odometerKm: odo,
          isFullTank: form.isFull,
          vendor: form.vendor.trim()
        });
        updateFuelLogStore(updated);
        
        // Push the update through the Golden Thread Bridge
        const updatedVehicle = await syncOdometerBridge(vehicleId, odo);
        syncVehicleState(vehicleId, updatedVehicle);
      } else {
        // Create Mode
        const log = await addFuelLog({
          vehicleId,
          liters: lit,
          totalCost: isNaN(cost) ? 0 : cost,
          odometerKm: odo,
          isFullTank: form.isFull,
          vendor: form.vendor.trim()
        });

        addFuelLogStore(log);
        
        // Track Usage
        updateUsageLedger({
          fuelLogsCount: (user.usageLedger.fuelLogsCount || 0) + 1
        });

        // Push the update through the Golden Thread Bridge
        const updatedVehicle = await syncOdometerBridge(vehicleId, odo);
        syncVehicleState(vehicleId, updatedVehicle);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save fuel record.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-[9999] overflow-y-auto scrollbar-hide flex flex-col p-6 sm:p-10 animate-in fade-in duration-300">
      <div className="flex-shrink-0 flex justify-between items-center mb-10 max-w-xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black">⛽</div>
          <div>
            <h2 className="text-white text-xl font-black tracking-tighter uppercase">{initialLog ? "Edit Fuel Log" : "Log New Refill"}</h2>
            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest">Efficiency Tracking</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-3xl font-black">×</button>
      </div>

      <div className="flex-grow flex flex-col max-w-xl mx-auto w-full space-y-8 pb-10">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-500 text-[10px] font-black uppercase tracking-widest text-center">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] ml-2">Current KM Reading</label>
            <input 
              type="number" 
              placeholder={currentOdo.toString()}
              className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl p-8 text-5xl font-mono font-black text-blue-500 focus:border-blue-600 outline-none transition-all tracking-tighter text-center"
              value={form.odometer}
              onChange={e => setForm({...form, odometer: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] ml-2">Liters Added</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 text-2xl font-mono font-black text-white focus:border-emerald-500 outline-none transition-all text-center"
                  value={form.liters}
                  onChange={e => setForm({...form, liters: e.target.value})}
                />
             </div>
             <div className="space-y-2">
                <label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] ml-2">Total Price ({ENV.CURRENCY})</label>
                <input 
                  type="number" 
                  placeholder="0"
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 text-2xl font-mono font-black text-white focus:border-emerald-500 outline-none transition-all text-center"
                  value={form.cost}
                  onChange={e => setForm({...form, cost: e.target.value})}
                />
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] ml-2">Fuel Station Name</label>
              <input 
                type="text" 
                placeholder="e.g. Total, NNPC"
                className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 text-sm font-bold text-slate-300 focus:border-blue-600 outline-none transition-all"
                value={form.vendor}
                onChange={e => setForm({...form, vendor: e.target.value})}
              />
            </div>
            <button 
              type="button"
              onClick={() => setForm({...form, isFull: !form.isFull})}
              className={`mt-6 w-full py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 transition-all ${form.isFull ? 'bg-blue-600/10 border-blue-600 text-blue-500' : 'bg-slate-900 border-slate-800 text-slate-600'}`}
            >
              {form.isFull ? "✓ Filled to Full" : "Partial Tank"}
            </button>
          </div>
        </div>

        <div className="pt-10">
           <button 
             onClick={handleCommit}
             disabled={isProcessing}
             className="w-full bg-white text-slate-900 py-8 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[12px] shadow-3xl hover:bg-blue-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-4"
           >
             {isProcessing ? (
               <div className="w-5 h-5 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
             ) : (initialLog ? "Update Record" : "Save Fuel Entry")}
           </button>
        </div>
      </div>
    </div>
  );
};

export default FuelEntryTerminal;