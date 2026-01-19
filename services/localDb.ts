
import Dexie, { type EntityTable } from 'dexie';
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../shared/types.ts';

const db = new Dexie('AutoPalGarage') as Dexie & {
  vehicles: EntityTable<Vehicle, 'id'>;
  tasks: EntityTable<MaintenanceTask, 'id'>;
  serviceLogs: EntityTable<ServiceLog, 'id'>;
  fuelLogs: EntityTable<FuelLog, 'id'>;
};

db.version(4).stores({
  vehicles: 'id, ownerId, vin, isDirty',
  tasks: 'id, vehicleId, ownerId, status, isDirty',
  serviceLogs: 'id, vehicleId, ownerId, isDirty',
  fuelLogs: 'id, vehicleId, ownerId, isDirty'
});

export const localDb = {
  saveVehicle: (v: Vehicle) => db.vehicles.put(v),
  getVehicles: (ownerId: string) => db.vehicles.where('ownerId').equals(ownerId).toArray(),
  getVehicle: (id: string) => db.vehicles.get(id),
  deleteVehicle: (id: string) => db.vehicles.delete(id),
  
  saveTask: (t: MaintenanceTask) => db.tasks.put(t),
  saveTasksBatch: (ts: MaintenanceTask[]) => db.tasks.bulkPut(ts),
  getTasks: (vehicleId: string) => db.tasks.where('vehicleId').equals(vehicleId).toArray(),
  
  saveLog: (l: ServiceLog) => db.serviceLogs.put(l),
  getLogs: (vehicleId: string) => db.serviceLogs.where('vehicleId').equals(vehicleId).toArray(),

  saveFuelLog: (l: FuelLog) => db.fuelLogs.put(l),
  getFuelLogs: (vehicleId: string) => db.fuelLogs.where('vehicleId').equals(vehicleId).toArray(),
  
  getDirtyRecords: async (ownerId: string) => {
    const vehicles = await db.vehicles.where('ownerId').equals(ownerId).and(v => v.isDirty === true).toArray();
    const tasks = await db.tasks.where('ownerId').equals(ownerId).and(t => t.isDirty === true).toArray();
    const logs = await db.serviceLogs.where('ownerId').equals(ownerId).and(l => l.isDirty === true).toArray();
    const fuel = await db.fuelLogs.where('ownerId').equals(ownerId).and(f => f.isDirty === true).toArray();
    return { vehicles, tasks, logs, fuel };
  },
  
  clearDirtyFlag: async (id: string, table: 'vehicles' | 'tasks' | 'serviceLogs' | 'fuelLogs') => {
    return (db[table] as any).update(id, { isDirty: false, lastSyncedAt: new Date().toISOString() });
  },

  purgeAllUserData: async () => {
    await db.vehicles.clear();
    await db.tasks.clear();
    await db.serviceLogs.clear();
    await db.fuelLogs.clear();
  }
};

export default db;
