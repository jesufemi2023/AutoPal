import { supabase } from '../auth/supabaseClient.ts';
import { Vehicle, MaintenanceTask, ServiceLog, VerificationLevel, FuelLog, Priority, TaskStatus } from '../shared/types.ts';
import { calculateNextMilestone, calculateAverageDailyKm, calculateVitalityScore } from './maintenanceLogic.ts';
import { fetchFuelLogs } from './fuelService.ts';
import { localDb } from './localDb.ts';

const DB_TABLES = {
  VEHICLES: 'vehicles',
  RULES: 'maintenance_tasks',
  RECORDS: 'service_logs'
};

export const fetchUserVehicles = async (): Promise<Vehicle[]> => {
  const local = await localDb.getVehicles();
  if (local.length > 0) return local;

  if (!supabase) return [];
  const { data, error } = await supabase
    .from(DB_TABLES.VEHICLES)
    .select('*')
    .eq('status', 'active') 
    .order('created_at', { ascending: false });

  if (error) return [];
  const logs = (data || []).map(v => ({
    id: v.id,
    ownerId: v.owner_id,
    make: v.make,
    model: v.model,
    year: v.year,
    vin: v.vin,
    mileage: parseFloat(v.current_mileage || '0'),
    healthScore: v.health_score || 100,
    bodyType: v.body_type,
    imageUrl: v.image_url,
    status: v.status,
    specs: v.specs || {},
    fuelType: v.fuel_type,
    engineSize: v.engine_size,
    avgDailyKm: v.avg_daily_km || 30,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
    latestAiAudit: v.latest_ai_audit,
    syncStatus: 'synced',
    isDirty: false
  }));

  for (const v of logs) await localDb.saveVehicle(v);
  return logs;
};

export const updateMileage = async (vehicleId: string, mileage: number): Promise<Vehicle> => {
  const existing = await localDb.getVehicle(vehicleId);
  if (!existing) throw new Error("Vehicle not found in local link.");

  const updated: Vehicle = {
    ...existing,
    mileage,
    isDirty: true,
    syncStatus: 'pending'
  };

  await localDb.saveVehicle(updated);
  return updated;
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'healthScore'>): Promise<Vehicle> => {
  // Initial creation must be cloud-bound to associate with user ID if online
  if (supabase) {
    const { data, error } = await supabase
      .from(DB_TABLES.VEHICLES)
      .insert([{
        owner_id: vehicle.ownerId,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        current_mileage: vehicle.mileage,
        body_type: vehicle.bodyType,
        fuel_type: vehicle.fuelType,
        engine_size: vehicle.engineSize,
        status: vehicle.status,
        image_url: vehicle.imageUrl,
        specs: vehicle.specs,
        avg_daily_km: vehicle.avgDailyKm || 30
      }])
      .select()
      .single();

    if (!error && data) {
      const v: Vehicle = {
        id: data.id,
        ownerId: data.owner_id,
        make: data.make,
        model: data.model,
        year: data.year,
        vin: data.vin,
        mileage: parseFloat(data.current_mileage),
        healthScore: 100,
        bodyType: data.body_type,
        imageUrl: data.image_url,
        status: data.status,
        specs: data.specs,
        syncStatus: 'synced',
        isDirty: false
      };
      await localDb.saveVehicle(v);
      return v;
    }
  }

  // Fallback to local only creation
  const localV: Vehicle = {
    ...vehicle,
    id: `local-car-${Date.now()}`,
    healthScore: 100,
    syncStatus: 'pending',
    isDirty: true
  };
  await localDb.saveVehicle(localV);
  return localV;
};

export const updateVehicle = async (vehicleId: string, data: Partial<Vehicle>): Promise<Vehicle> => {
  const existing = await localDb.getVehicle(vehicleId);
  if (!existing) throw new Error("Asset missing from local master.");

  const updated: Vehicle = {
    ...existing,
    ...data,
    isDirty: true,
    syncStatus: 'pending'
  };

  await localDb.saveVehicle(updated);
  return updated;
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<void> => {
  const t = await localDb.getTask(taskId);
  if (t) {
    await localDb.saveTask({ ...t, status, isDirty: true, syncStatus: 'pending' });
  }
};

export const archiveVehicle = async (vehicleId: string): Promise<void> => {
  const v = await localDb.getVehicle(vehicleId);
  if (v) {
    await localDb.saveVehicle({ ...v, status: 'archived', isDirty: true, syncStatus: 'pending' });
  }
};

export const fetchVehicleTasks = async (vehicleId: string): Promise<MaintenanceTask[]> => {
  const local = await localDb.getTasks(vehicleId);
  if (local.length > 0) return local;

  if (!supabase) return [];
  const { data, error } = await supabase.from(DB_TABLES.RULES).select('*').eq('vehicle_id', vehicleId);
  if (error) return [];
  
  const tasks: MaintenanceTask[] = (data || []).map(t => ({
    id: t.id,
    vehicleId: t.vehicle_id,
    title: t.title,
    description: t.description,
    dueMileage: t.due_mileage,
    dueDate: t.due_date,
    status: t.status,
    priority: t.priority,
    category: t.category,
    estimatedCost: t.estimated_cost,
    intervalKm: t.interval_km,
    intervalMonths: t.interval_months,
    syncStatus: 'synced',
    isDirty: false
  }));

  for (const t of tasks) await localDb.saveTask(t);
  return tasks;
};

export const fetchVehicleServiceLogs = async (vehicleId: string): Promise<ServiceLog[]> => {
  const local = await localDb.getLogs(vehicleId);
  if (local.length > 0) return local;

  if (!supabase) return [];
  const { data, error } = await supabase.from(DB_TABLES.RECORDS).select('*').eq('vehicle_id', vehicleId).order('service_date', { ascending: false });
  if (error) return [];
  
  const logs: ServiceLog[] = (data || []).map(l => ({
    id: l.id,
    vehicleId: l.vehicle_id,
    taskId: l.task_id, 
    serviceType: l.service_type,
    serviceDate: l.service_date,
    mileageAtService: parseFloat(l.mileage_at_service || '0'),
    cost: parseFloat(l.cost || '0'),
    notes: l.notes,
    provider: l.provider,
    status: l.status,
    category: l.category,
    verificationLevel: l.verification_level,
    receiptUrl: l.receipt_url,
    syncStatus: 'synced',
    isDirty: false
  }));

  for (const log of logs) await localDb.saveLog(log);
  return logs;
};

export const createManualServiceLog = async (vehicle: Vehicle, log: Omit<ServiceLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceLog> => {
  const newLog: ServiceLog = {
    ...log,
    id: `local-svc-${Date.now()}`,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    isDirty: true
  };
  await localDb.saveLog(newLog);
  return newLog;
};

export const finalizeMaintenanceCompletion = async (
  vehicle: Vehicle, 
  task: MaintenanceTask, 
  completionData: {
    mileageAtService: number;
    serviceDate: string;
    cost: number;
    notes: string;
    provider?: string;
    verificationLevel: VerificationLevel;
    receiptUrl?: string;
    intervalKm?: number;
    intervalMonths?: number;
  }
): Promise<{ log: ServiceLog; updatedTask: MaintenanceTask; updatedVehicle: Vehicle }> => {
  const targetIntervalKm = completionData.intervalKm ?? task.intervalKm ?? 5000;
  const targetIntervalMonths = completionData.intervalMonths ?? task.intervalMonths ?? 6;
  const { nextMileage, nextDate } = calculateNextMilestone(completionData.mileageAtService, completionData.serviceDate, targetIntervalKm, targetIntervalMonths);

  const log: ServiceLog = {
    id: `local-svc-${Date.now()}`,
    vehicleId: vehicle.id,
    taskId: task.id,
    serviceType: task.title,
    serviceDate: completionData.serviceDate,
    mileageAtService: completionData.mileageAtService,
    cost: completionData.cost,
    notes: completionData.notes,
    provider: completionData.provider,
    category: task.category,
    verificationLevel: completionData.verificationLevel,
    receiptUrl: completionData.receiptUrl,
    syncStatus: 'pending',
    isDirty: true
  };

  const updatedTask: MaintenanceTask = {
    ...task,
    dueMileage: nextMileage,
    dueDate: nextDate,
    lastCompletedAt: completionData.serviceDate,
    lastVerificationLevel: completionData.verificationLevel,
    lastReceiptUrl: completionData.receiptUrl,
    status: 'pending',
    isDirty: true,
    syncStatus: 'pending'
  };

  const updatedVehicle = await updateMileage(vehicle.id, Math.max(vehicle.mileage, completionData.mileageAtService));

  await localDb.saveLog(log);
  await localDb.saveTask(updatedTask);

  return { log, updatedTask, updatedVehicle };
};

export const syncVehicleVitals = async (vehicleId: string): Promise<Vehicle> => {
  const [vehicle, fuelLogs, serviceLogs, tasks] = await Promise.all([
    localDb.getVehicle(vehicleId),
    localDb.getFuelLogs(vehicleId),
    localDb.getLogs(vehicleId),
    localDb.getTasks(vehicleId)
  ]);

  if (!vehicle) throw new Error("Master record missing.");

  const newAvgDailyKm = calculateAverageDailyKm(fuelLogs, serviceLogs);
  const newHealthScore = calculateVitalityScore({ ...vehicle, avgDailyKm: newAvgDailyKm }, tasks, fuelLogs, serviceLogs);

  return await updateVehicle(vehicleId, { avgDailyKm: newAvgDailyKm, healthScore: newHealthScore });
};

export const uploadVehicleImage = async (userId: string, vehicleId: string, blob: Blob): Promise<string> => {
  if (!supabase) return "";
  const path = `${userId}/${vehicleId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('vehicle-images').upload(path, blob);
  if (error) return "";
  const { data: { publicUrl } } = supabase.storage.from('vehicle-images').getPublicUrl(path);
  return publicUrl;
};

export const createMaintenanceTasksBatch = async (tasks: Omit<MaintenanceTask, 'id'>[]): Promise<void> => {
  const localTasks = tasks.map(t => ({
    ...t,
    id: `local-task-${Math.random().toString(36).substr(2, 9)}`,
    syncStatus: 'pending' as const,
    isDirty: true
  }));
  await localDb.saveTasksBatch(localTasks);
};