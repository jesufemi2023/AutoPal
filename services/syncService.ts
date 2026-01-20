
import { localDb } from './localDb.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { updateVehicle, updateTaskStatus } from './vehicleService.ts';
import { addFuelLog as cloudAddFuel, updateFuelLog as cloudUpdateFuel } from './fuelService.ts';
import { createServiceLog as cloudAddService, updateServiceLog as cloudUpdateService } from './logService.ts';

/**
 * Sync Engine
 * Orchestrates the "Local-Master to Cloud-Mirror" synchronization.
 */

export const performPushSync = async () => {
  if (!supabase) return { status: 'offline' };
  
  const { vehicles, tasks, logs, fuel } = await localDb.getDirtyRecords();
  const total = vehicles.length + tasks.length + logs.length + fuel.length;
  
  if (total === 0) return { status: 'idle' };

  console.log(`SyncEngine: Pushing ${total} dirty records to vault...`);

  // 1. Sync Vehicles (Updates)
  for (const v of vehicles) {
    try {
      await updateVehicle(v.id, v);
      await localDb.markSynced(v.id, 'vehicles');
    } catch (e) { console.warn("Vehicle Sync Fail", e); }
  }

  // 2. Sync Maintenance Tasks
  for (const t of tasks) {
    try {
      await updateTaskStatus(t.id, t.status);
      await localDb.markSynced(t.id, 'tasks');
    } catch (e) { console.warn("Task Sync Fail", e); }
  }

  // 3. Sync Fuel Logs (Sequential to prevent race conditions on odometer)
  for (const f of fuel) {
    try {
      // In a real local-first app, we'd check if it exists in cloud. 
      // For MVP, we use the existing fuelService methods.
      await cloudAddFuel(f);
      await localDb.markSynced(f.id, 'fuelLogs');
    } catch (e) { console.warn("Fuel Sync Fail", e); }
  }

  // 4. Sync Service Logs
  for (const l of logs) {
    try {
      await cloudAddService(l);
      await localDb.markSynced(l.id, 'serviceLogs');
    } catch (e) { console.warn("Service Sync Fail", e); }
  }

  return { status: 'success', pushed: total };
};

/**
 * Inbound Sync: Pours Cloud Master into Local Mirror
 */
export const performPullSync = async (userId: string) => {
  if (!supabase) return;

  // This is a simplified pull for the MVP
  // Ideally, we fetch all user data and bulkPut into Dexie
  console.log("SyncEngine: Pulling latest from cloud vault...");
};
