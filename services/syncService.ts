
import { localDb } from './localDb.ts';
import { updateVehicle, updateTaskStatus } from './vehicleService.ts';

export const performSync = async (userId: string) => {
  const { vehicles, tasks, logs, fuel } = await localDb.getDirtyRecords(userId);
  
  for (const v of vehicles) {
    try {
      await updateVehicle(v.id, v);
      await localDb.clearDirtyFlag(v.id, 'vehicles');
    } catch (e) {
      console.warn(`Sync failed for vehicle ${v.id}`, e);
    }
  }

  for (const t of tasks) {
    try {
      await updateTaskStatus(t.id, t.status);
      await localDb.clearDirtyFlag(t.id, 'tasks');
    } catch (e) {
      console.warn(`Sync failed for task ${t.id}`, e);
    }
  }

  for (const l of logs) await localDb.clearDirtyFlag(l.id, 'serviceLogs');
  for (const f of fuel) await localDb.clearDirtyFlag(f.id, 'fuelLogs');

  return { status: 'success', timestamp: new Date().toISOString() };
};

export const shouldSyncMileage = (oldVal: number, newVal: number): boolean => {
  const delta = Math.abs(newVal - oldVal);
  return delta >= 100;
};
