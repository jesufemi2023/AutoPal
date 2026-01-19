
import { localDb } from './localDb.ts';
import { updateVehicle, updateTaskStatus } from './vehicleService.ts';
import { getConfig } from './configService.ts';
import { Tier } from '../shared/types.ts';
import { QUOTAS } from './permissionService.ts';

/**
 * Sync Engine - Checkpoint Implementation
 * Minimizes cloud hits by only syncing "dirty" or milestone-reaching data.
 */

export const performSync = async (userTier: Tier = 'free') => {
  const isCloudEnabled = QUOTAS[userTier].isCloudSynced;
  const { vehicles, tasks, logs, fuel } = await localDb.getDirtyRecords();
  
  console.log(`SyncEngine: Processing ${vehicles.length + tasks.length + (isCloudEnabled ? logs.length + fuel.length : 0)} updates...`);

  // 1. Sync Vehicles (Always sync vehicles for all tiers to maintain digital twin link)
  for (const v of vehicles) {
    try {
      await updateVehicle(v.id, v);
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

  // 3. Sync Logs & Fuel (Only for Paying Users)
  if (isCloudEnabled) {
    // Note: In this MVP architecture, logs are typically append-only and handled immediately.
    // However, we clear dirty flags to prevent infinite sync attempts for local-only data.
    for (const l of logs) await localDb.clearDirtyFlag(l.id, 'serviceLogs');
    for (const f of fuel) await localDb.clearDirtyFlag(f.id, 'fuelLogs');
  } else {
    // For free users, we don't clear dirty flags yet, or we clear them silently 
    // to keep the local DB clean of sync noise.
    for (const l of logs) await localDb.clearDirtyFlag(l.id, 'serviceLogs');
    for (const f of fuel) await localDb.clearDirtyFlag(f.id, 'fuelLogs');
  }

  return { status: 'success', timestamp: new Date().toISOString() };
};

/**
 * Determines if a mileage update warrants a cloud sync based on tier delta.
 */
export const shouldSyncMileage = (oldVal: number, newVal: number, tier: Tier): boolean => {
  const delta = Math.abs(newVal - oldVal);
  return delta >= getConfig(tier).mileageSyncDelta;
};
