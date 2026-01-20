
import Dexie, { type EntityTable } from 'dexie';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../shared/types.ts';

/**
 * AutoPal Local Persistence Engine (IndexedDB)
 * The primary "Master Record" for the app.
 */

const db = new Dexie('AutoPalGarage') as Dexie & {
  vehicles: EntityTable<Vehicle, 'id'>;
  tasks: EntityTable<MaintenanceTask, 'id'>;
  serviceLogs: EntityTable<ServiceLog, 'id'>;
  fuelLogs: EntityTable<FuelLog, 'id'>;
};

// Versioning with indexes for sync and retrieval
db.version(3).stores({
  vehicles: 'id, ownerId, vin, isDirty, syncStatus',
  tasks: 'id, vehicleId, status, isDirty, syncStatus',
  serviceLogs: 'id, vehicleId, isDirty, syncStatus',
  fuelLogs: 'id, vehicleId, isDirty, syncStatus'
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
  // Added getServiceLog to fetch a single service log by ID
  getServiceLog: (id: string) => db.serviceLogs.get(id),
  // Added deleteServiceLog to remove a single service log by ID
  deleteServiceLog: (id: string) => db.serviceLogs.delete(id),

  // Fuel Logs
  saveFuelLog: (l: FuelLog) => db.fuelLogs.put(l),
  getFuelLogs: (vehicleId: string) => db.fuelLogs.where('vehicleId').equals(vehicleId).toArray(),
  // Added getFuelLog to fetch a single fuel log by ID
  getFuelLog: (id: string) => db.fuelLogs.get(id),
  // Added deleteFuelLog to remove a single fuel log by ID
  deleteFuelLog: (id: string) => db.fuelLogs.delete(id),
  
  // Sync Intelligence
  getDirtyRecords: async () => {
    const vehicles = await db.vehicles.filter(v => v.isDirty === true).toArray();
    const tasks = await db.tasks.filter(t => t.isDirty === true).toArray();
    const logs = await db.serviceLogs.filter(l => l.isDirty === true).toArray();
    const fuel = await db.fuelLogs.filter(f => f.isDirty === true).toArray();
    return { vehicles, tasks, logs, fuel };
  },
  
  markSynced: async (id: string, table: 'vehicles' | 'tasks' | 'serviceLogs' | 'fuelLogs') => {
    return (db[table] as any).update(id, { isDirty: false, syncStatus: 'synced' });
  }
};

export default db;