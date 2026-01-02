
import { localDb } from './localDb.ts';
import { updateVehicleData, createVehicle, createMaintenanceTasksBatch, updateTaskStatus } from './vehicleService.ts';
import { getConfig } from './configService.ts';
import { Tier } from '../shared/types.ts';

/**
 * Sync Engine - Checkpoint Implementation
 * Minimizes cloud hits by only syncing "dirty" or milestone-reaching data.
 */

export const performSync = async (userTier: Tier = 'free') => {
  const config = getConfig(userTier);
  const { vehicles, tasks, logs } = await localDb.getDirtyRecords();
  
  console.log(`SyncEngine: Processing ${vehicles.length + tasks.length + logs.length} updates...`);

  // 1. Sync Vehicles
  for (const v of vehicles) {
    try {
      // In a real app, check if V exists in Supabase. For MVP, assume update if has ID.
      await updateVehicleData(v.id, v);
      await localDb.clearDirtyFlag(v.id, 'vehicles');
    } catch (e) {
      console.warn(`Sync failed for vehicle ${v.id}`, e);
    }
  }

  // 2. Sync Tasks
  for (const t of tasks) {
    try {
      await updateTaskStatus(t.id, t.status);
      await localDb.clearDirtyFlag(t.id, 'tasks');
    } catch (e) {
      console.warn(`Sync failed for task ${t.id}`, e);
    }
  }

  // Note: Logs are typically append-only and handled via dedicated batch service.
  return { status: 'success', timestamp: new Date().toISOString() };
};

/**
 * Determines if a mileage update warrants a cloud sync based on tier delta.
 */
export const shouldSyncMileage = (oldVal: number, newVal: number, tier: Tier): boolean => {
  const delta = Math.abs(newVal - oldVal);
  return delta >= getConfig(tier).mileageSyncDelta;
};
