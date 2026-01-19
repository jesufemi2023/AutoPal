
import React, { useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { addFuelLog, updateFuelLog } from '../services/fuelService.ts';
import { updateMileage as syncOdometerBridge } from '../services/vehicleService.ts';
import { ENV } from '../services/envService.ts';
import { FuelLog } from '../shared/types.ts';

interface FuelEntryTerminalProps {
  vehicleId: string;
  currentOdo: number;
  initialLog?: FuelLog;
  onClose: () => void;
}

const FuelEntryTerminal: React.FC<FuelEntryTerminalProps> = ({ vehicleId, currentOdo, initialLog, onClose }) => {
  const { addFuelLogStore, updateFuelLogStore, syncVehicleState, user } = useAutoPalStore();
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

    const odo = parseInt(form.odometer);
    const lit = parseFloat(form.liters);
    const cost = parseFloat(form.cost);

    if (isNaN(odo) || odo < (initialLog ? 0 : currentOdo)) {
      setError(`Odometer must be at least ${currentOdo} KM.`);
      return;
    }
    if (isNaN(lit) || lit <= 0) {
      setError("Please enter liters.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (initialLog) {
        const updated = await updateFuelLog(initialLog.id, {
          liters: lit,
          totalCost: isNaN(cost) ? 0 : cost,
          odometerKm: odo,
          isFullTank: form.isFull,
          vendor: form.vendor.trim()
        });
        updateFuelLogStore(updated);
        const updatedVehicle = await syncOdometerBridge(vehicleId, odo);
        syncVehicleState(vehicleId, updatedVehicle);
      } else {
        const log = await addFuelLog({
          vehicleId,
          liters: lit,
          totalCost: isNaN(cost) ? 0 : cost,
          odometerKm: odo,
          isFullTank: form.isFull,
          vendor: form.vendor.trim()
        });
        addFuelLogStore(log);
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
    <div className="fixed inset-0 bg-slate-950/95 z-[9999] overflow-y-auto flex flex-col p-6 sm:p-10 animate-in fade-in duration-300">
      <div className="max-w-xl mx-auto w-full flex justify-between items-center mb-10 text-white">
        <h2 className="text-xl font-black uppercase">{initialLog ? "Edit Fuel Log" : "Log Refill"}</h2>
        <button onClick={onClose} className="text-3xl font-black">×</button>
      </div>
      <div className="max-w-xl mx-auto w-full space-y-8">
        {error && <div className="p-4 bg-rose-500/10 text-rose-500 font-black text-xs text-center rounded-xl">{error}</div>}
        <input type="number" className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl p-8 text-5xl font-mono font-black text-blue-500 text-center" value={form.odometer} onChange={e => setForm({...form, odometer: e.target.value})} />
        <div className="grid grid-cols-2 gap-4">
          <input type="number" step="0.01" placeholder="Liters" className="w-full bg-slate-900 border-2 rounded-2xl p-6 text-white text-center" value={form.liters} onChange={e => setForm({...form, liters: e.target.value})} />
          <input type="number" placeholder={ENV.CURRENCY} className="w-full bg-slate-900 border-2 rounded-2xl p-6 text-white text-center" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} />
        </div>
        <button onClick={handleCommit} disabled={isProcessing} className="w-full bg-white text-slate-900 py-8 rounded-[2.5rem] font-black uppercase text-[12px] hover:bg-blue-600 hover:text-white transition-all">{isProcessing ? 'Processing...' : 'Save Fuel Entry'}</button>
      </div>
    </div>
  );
};

export default FuelEntryTerminal;
