
import Dexie, { type EntityTable } from 'dexie';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../shared/types.ts';

/**
 * AutoPal Local Persistence Engine (IndexedDB)
 * Ensures the app works offline and data persists across refreshes.
 * Stores the full Vehicle object including latestAiAudit.
 */

const db = new Dexie('AutoPalGarage') as Dexie & {
  vehicles: EntityTable<Vehicle, 'id'>;
  tasks: EntityTable<MaintenanceTask, 'id'>;
  serviceLogs: EntityTable<ServiceLog, 'id'>;
  fuelLogs: EntityTable<FuelLog, 'id'>;
};

// We index keys we need to query by frequently.
// Dexie stores the entire object, so fields like `latestAiAudit` are safe.
db.version(2).stores({
  vehicles: 'id, ownerId, vin, isDirty',
  tasks: 'id, vehicleId, status, isDirty',
  serviceLogs: 'id, vehicleId, isDirty',
  fuelLogs: 'id, vehicleId, isDirty'
});

export const localDb = {
  // Vehicles
  saveVehicle: (v: Vehicle) => db.vehicles.put(v),
  /**
   * Fetch vehicles filtered by owner ID
   */
  getVehicles: (ownerId: string) => db.vehicles.where('ownerId').equals(ownerId).toArray(),
  getVehicle: (id: string) => db.vehicles.get(id),
  deleteVehicle: (id: string) => db.vehicles.delete(id),
  
  // Tasks
  saveTask: (t: MaintenanceTask) => db.tasks.put(t),
  saveTasksBatch: (ts: MaintenanceTask[]) => db.tasks.bulkPut(ts),
  getTasks: (vehicleId: string) => db.tasks.where('vehicleId').equals(vehicleId).toArray(),
  
  // Service Logs
  saveLog: (l: ServiceLog) => db.serviceLogs.put(l),
  getLogs: (vehicleId: string) => db.serviceLogs.where('vehicleId').equals(vehicleId).toArray(),

  // Fuel Logs
  saveFuelLog: (l: FuelLog) => db.fuelLogs.put(l),
  getFuelLogs: (vehicleId: string) => db.fuelLogs.where('vehicleId').equals(vehicleId).toArray(),
  
  // Dirty Records (for Sync Engine)
  getDirtyRecords: async () => {
    const vehicles = await db.vehicles.where('isDirty').equals(1).toArray();
    const tasks = await db.tasks.where('isDirty').equals(1).toArray();
    const logs = await db.serviceLogs.where('isDirty').equals(1).toArray();
    const fuel = await db.fuelLogs.where('isDirty').equals(1).toArray();
    return { vehicles, tasks, logs, fuel };
  },
  
  clearDirtyFlag: async (id: string, table: 'vehicles' | 'tasks' | 'serviceLogs' | 'fuelLogs') => {
    return (db[table] as any).update(id, { isDirty: false, lastSyncedAt: new Date().toISOString() });
  }
};

export default db;
