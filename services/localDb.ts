
import Dexie, { type EntityTable } from 'dexie';
import { Vehicle, MaintenanceTask, ServiceLog } from '../shared/types.ts';

/**
 * AutoPal Local Persistence Engine (IndexedDB)
 * Ensures the app works offline and data persists across refreshes.
 */

const db = new Dexie('AutoPalGarage') as Dexie & {
  vehicles: EntityTable<Vehicle, 'id'>;
  tasks: EntityTable<MaintenanceTask, 'id'>;
  serviceLogs: EntityTable<ServiceLog, 'id'>;
};

db.version(1).stores({
  vehicles: 'id, ownerId, vin, isDirty',
  tasks: 'id, vehicleId, status, isDirty',
  serviceLogs: 'id, vehicleId, isDirty'
});

export const localDb = {
  // Vehicles
  saveVehicle: (v: Vehicle) => db.vehicles.put(v),
  getVehicles: () => db.vehicles.toArray(),
  getVehicle: (id: string) => db.vehicles.get(id),
  deleteVehicle: (id: string) => db.vehicles.delete(id),
  
  // Tasks
  saveTask: (t: MaintenanceTask) => db.tasks.put(t),
  saveTasksBatch: (ts: MaintenanceTask[]) => db.tasks.bulkPut(ts),
  getTasks: (vehicleId: string) => db.tasks.where('vehicleId').equals(vehicleId).toArray(),
  
  // Service Logs
  saveLog: (l: ServiceLog) => db.serviceLogs.put(l),
  getLogs: (vehicleId: string) => db.serviceLogs.where('vehicleId').equals(vehicleId).toArray(),
  
  // Dirty Records (for Sync Engine)
  getDirtyRecords: async () => {
    const vehicles = await db.vehicles.where('isDirty').equals(1).toArray();
    const tasks = await db.tasks.where('isDirty').equals(1).toArray();
    const logs = await db.serviceLogs.where('isDirty').equals(1).toArray();
    return { vehicles, tasks, logs };
  },
  
  clearDirtyFlag: async (id: string, table: 'vehicles' | 'tasks' | 'serviceLogs') => {
    return db[table].update(id, { isDirty: false, lastSyncedAt: new Date().toISOString() });
  }
};

export default db;
