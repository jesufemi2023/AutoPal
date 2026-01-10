
import { supabase } from '../auth/supabaseClient.ts';
import { Vehicle, MaintenanceTask, ServiceLog, VerificationLevel, FuelLog, Priority, TaskStatus } from '../shared/types.ts';
import { calculateNextMilestone, calculateAverageDailyKm, calculateVitalityScore } from './maintenanceLogic.ts';
import { fetchFuelLogs } from './fuelService.ts';
// Fixed: Added createServiceLog import to support maintenance completion logic
import { createServiceLog } from './logService.ts';

/**
 * Vehicle Lifecycle Service
 * Manages the "Digital Twin" state in Supabase.
 */

const DB_TABLES = {
  VEHICLES: 'vehicles',
  RULES: 'maintenance_tasks',
  RECORDS: 'service_logs'
};

const handleSupabaseError = (error: any, context: string) => {
  const message = error?.message || "Unknown Database Error";
  const details = error?.details || "";
  
  console.error(`Supabase Error [${context}]:`, { message, details, code: error?.code });

  // Handle common RLS violation (403 or code 42501)
  if (
    error.message?.toLowerCase().includes('row-level security') || 
    error.message?.toLowerCase().includes('permission denied') ||
    error.code === '42501' || 
    error.status === 403
  ) {
    throw new Error(`Permission Denied: ${context} failed due to RLS policies. Check SUPABASE_GUIDE.md.`);
  }

  if (error.code === 'PGRST116') return null; 
  if (error.code === '42P01') {
    throw new Error(`Database table missing. Please run migrations.`);
  }
  if (error.code === '23505') {
    throw new Error(`A vehicle with this VIN already exists.`);
  }
  if (error.code === 'PGRST204' || error.code === '42703' || error.status === 400) {
    return 'SCHEMA_MISMATCH';
  }
  throw error;
};

const mapVehicleFromDb = (v: any): Vehicle => ({
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
  updatedAt: v.updated_at
});

export const fetchUserVehicles = async (): Promise<Vehicle[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(DB_TABLES.VEHICLES)
    .select('*')
    .eq('status', 'active') 
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'fetchUserVehicles');
  return (data || []).map(mapVehicleFromDb);
};

export const updateVehicle = async (vehicleId: string, data: Partial<Vehicle>): Promise<Vehicle> => {
  if (!supabase) throw new Error("Supabase not configured");

  const dbPayload: any = {};
  
  // Standard field mapping
  if (data.make !== undefined) dbPayload.make = data.make;
  if (data.model !== undefined) dbPayload.model = data.model;
  if (data.year !== undefined) dbPayload.year = data.year;
  if (data.vin !== undefined) dbPayload.vin = data.vin;
  if (data.status !== undefined) dbPayload.status = data.status;
  if (data.specs !== undefined) dbPayload.specs = data.specs;
  
  // Custom snake_case mappings
  if (data.mileage !== undefined) dbPayload.current_mileage = data.mileage;
  if (data.ownerId !== undefined) dbPayload.owner_id = data.ownerId;
  if (data.bodyType !== undefined) dbPayload.body_type = data.bodyType;
  if (data.fuelType !== undefined) dbPayload.fuel_type = data.fuelType;
  if (data.engineSize !== undefined) dbPayload.engine_size = data.engineSize;
  if (data.avgDailyKm !== undefined) dbPayload.avg_daily_km = data.avgDailyKm;
  if (data.healthScore !== undefined) dbPayload.health_score = data.healthScore;
  if (data.imageUrl !== undefined) dbPayload.image_url = data.imageUrl;

  // Prevent PGRST116 by checking if payload is empty
  if (Object.keys(dbPayload).length === 0) {
    const { data: current } = await supabase.from(DB_TABLES.VEHICLES).select('*').eq('id', vehicleId).single();
    return current ? mapVehicleFromDb(current) : (data as Vehicle);
  }

  let { data: updated, error } = await supabase
    .from(DB_TABLES.VEHICLES)
    .update(dbPayload)
    .eq('id', vehicleId)
    .select()
    .single();

  if (error) {
    const errType = handleSupabaseError(error, 'updateVehicle');
    if (errType === 'SCHEMA_MISMATCH') {
       delete dbPayload.avg_daily_km;
       delete dbPayload.health_score;
       const retry = await supabase
         .from(DB_TABLES.VEHICLES)
         .update(dbPayload)
         .eq('id', vehicleId)
         .select()
         .single();
       if (retry.error) throw retry.error;
       updated = retry.data;
    } else {
      throw error;
    }
  }
  return mapVehicleFromDb(updated);
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'healthScore'>): Promise<Vehicle> => {
  if (!supabase) throw new Error("Supabase not configured");
  
  const payload: any = {
    owner_id: vehicle.ownerId,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    vin: vehicle.vin,
    current_mileage: vehicle.mileage,
    body_type: vehicle.bodyType,
    image_url: vehicle.imageUrl,
    specs: vehicle.specs,
    status: 'active',
    fuel_type: vehicle.fuelType,
    engine_size: vehicle.engineSize,
    avg_daily_km: 35
  };

  let { data, error } = await supabase
    .from(DB_TABLES.VEHICLES)
    .insert([payload])
    .select()
    .single();

  if (error) {
    const errType = handleSupabaseError(error, 'createVehicle');
    if (errType === 'SCHEMA_MISMATCH') {
      delete payload.avg_daily_km;
      const retry = await supabase
        .from(DB_TABLES.VEHICLES)
        .insert([payload])
        .select()
        .single();
      if (retry.error) throw retry.error;
      data = retry.data;
    } else {
      throw error;
    }
  }
  return mapVehicleFromDb(data);
};

export const archiveVehicle = async (vehicleId: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from(DB_TABLES.VEHICLES)
    .update({ status: 'archived' })
    .eq('id', vehicleId);
  if (error) handleSupabaseError(error, 'archiveVehicle');
};

export const uploadVehicleImage = async (userId: string, vehicleId: string, blob: Blob): Promise<string> => {
  if (!supabase) throw new Error("Supabase not configured");
  const fileName = `${userId}/${vehicleId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from('vehicle-images')
    .upload(fileName, blob, { cacheControl: '3600', upsert: true });
  
  if (error) handleSupabaseError(error, 'uploadVehicleImage');
  const { data: { publicUrl } } = supabase.storage.from('vehicle-images').getPublicUrl(data!.path);
  return publicUrl;
};

// Fixed: Added missing updateTaskStatus exported member
export const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from(DB_TABLES.RULES)
    .update({ status })
    .eq('id', taskId);
  if (error) handleSupabaseError(error, 'updateTaskStatus');
};

// Fixed: Added missing createMaintenanceTasksBatch exported member
export const createMaintenanceTasksBatch = async (tasks: Omit<MaintenanceTask, 'id'>[]): Promise<void> => {
  if (!supabase) return;
  const payload = tasks.map(t => ({
    vehicle_id: t.vehicleId,
    title: t.title,
    description: t.description,
    due_mileage: t.dueMileage,
    due_date: t.dueDate,
    status: t.status,
    priority: t.priority,
    category: t.category,
    estimated_cost: t.estimatedCost,
    interval_km: t.intervalKm,
    interval_months: t.intervalMonths
  }));
  const { error } = await supabase.from(DB_TABLES.RULES).insert(payload);
  if (error) handleSupabaseError(error, 'createMaintenanceTasksBatch');
};

// Fixed: Added missing finalizeMaintenanceCompletion exported member
export const finalizeMaintenanceCompletion = async (
  vehicle: Vehicle,
  task: MaintenanceTask,
  data: {
    mileageAtService: number;
    serviceDate: string;
    cost: number;
    provider?: string;
    notes?: string;
    verificationLevel: VerificationLevel;
    intervalKm: number;
    intervalMonths: number;
  }
): Promise<{ log: ServiceLog; updatedTask: MaintenanceTask; updatedVehicle: Vehicle }> => {
  if (!supabase) throw new Error("Supabase client missing.");

  // 1. Create the Service Log entry
  const log = await createServiceLog({
    vehicleId: vehicle.id,
    taskId: task.id,
    serviceType: task.title,
    serviceDate: data.serviceDate,
    mileageAtService: data.mileageAtService,
    cost: data.cost,
    provider: data.provider,
    notes: data.notes,
    category: task.category,
    status: 'completed',
    verificationLevel: data.verificationLevel
  });

  // 2. Calculate the next service milestone
  const { nextMileage, nextDate } = calculateNextMilestone(
    data.mileageAtService,
    data.serviceDate,
    data.intervalKm,
    data.intervalMonths
  );

  // 3. Update the task to reflect completion and set the next target
  const { data: updatedTaskData, error: taskError } = await supabase
    .from(DB_TABLES.RULES)
    .update({
      due_mileage: nextMileage,
      due_date: nextDate,
      last_completed_at: data.serviceDate,
      last_verification_level: data.verificationLevel,
      interval_km: data.intervalKm,
      interval_months: data.intervalMonths,
      status: 'pending' // Recycles back to pending for the next cycle
    })
    .eq('id', task.id)
    .select()
    .single();

  if (taskError) throw taskError;

  const updatedTask: MaintenanceTask = {
    ...task,
    dueMileage: nextMileage,
    dueDate: nextDate,
    lastCompletedAt: data.serviceDate,
    lastVerificationLevel: data.verificationLevel,
    intervalKm: data.intervalKm,
    intervalMonths: data.intervalMonths,
    status: 'pending'
  };

  // 4. Trigger vitality recalculation based on new mileage/history
  const updatedVehicle = await syncVehicleVitals(vehicle.id);

  return { log, updatedTask, updatedVehicle };
};

// Fixed: Added missing createManualServiceLog exported member
export const createManualServiceLog = async (
  vehicle: Vehicle, 
  log: Omit<ServiceLog, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ServiceLog> => {
  return await createServiceLog(log);
};

export const fetchVehicleTasks = async (vehicleId: string): Promise<MaintenanceTask[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from(DB_TABLES.RULES).select('*').eq('vehicle_id', vehicleId);
  if (error) handleSupabaseError(error, 'fetchVehicleTasks');
  return (data || []).map(t => ({
    id: t.id,
    taskId: t.task_id,
    vehicleId: t.vehicle_id,
    title: t.title,
    description: t.description,
    dueMileage: parseFloat(t.due_mileage || '0'),
    dueDate: t.due_date,
    status: t.status,
    priority: t.priority as Priority,
    category: t.category,
    estimatedCost: parseFloat(t.estimated_cost || '0'),
    lastCompletedAt: t.last_completed_at,
    intervalKm: t.interval_km,
    interval_months: t.interval_months,
    lastVerificationLevel: t.last_verification_level
  }));
};

export const fetchVehicleServiceLogs = async (vehicleId: string): Promise<ServiceLog[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from(DB_TABLES.RECORDS).select('*').eq('vehicle_id', vehicleId).order('service_date', { ascending: false });
  if (error) handleSupabaseError(error, 'fetchVehicleServiceLogs');
  return (data || []).map(l => ({
    id: l.id,
    vehicleId: l.vehicle_id,
    taskId: l.task_id,
    serviceType: l.service_type,
    serviceDate: l.service_date,
    mileageAtService: parseFloat(l.mileage_at_service || '0'),
    cost: parseFloat(l.cost || '0'),
    provider: l.provider,
    notes: l.notes,
    status: l.status,
    category: l.category,
    verificationLevel: l.verification_level,
    receiptUrl: l.receipt_url,
    createdAt: l.created_at
  }));
};

export const updateMileage = async (vehicleId: string, mileage: number): Promise<Vehicle> => {
  if (!supabase) throw new Error("Supabase client missing.");
  await supabase.from(DB_TABLES.VEHICLES).update({ current_mileage: mileage }).eq('id', vehicleId);
  return await syncVehicleVitals(vehicleId);
};

export const syncVehicleVitals = async (vehicleId: string): Promise<Vehicle> => {
  if (!supabase) throw new Error("Cloud infrastructure missing.");
  const { data: vData, error: vError } = await supabase.from(DB_TABLES.VEHICLES).select('*').eq('id', vehicleId).single();
  if (vError) throw vError;
  const vehicle = mapVehicleFromDb(vData);
  const [fuelLogs, serviceLogs, tasks] = await Promise.all([
    fetchFuelLogs(vehicleId),
    fetchVehicleServiceLogs(vehicleId),
    fetchVehicleTasks(vehicleId)
  ]);
  const newAvgDailyKm = calculateAverageDailyKm(fuelLogs, serviceLogs);
  const newHealthScore = calculateVitalityScore({ ...vehicle, avgDailyKm: newAvgDailyKm }, tasks);
  return await updateVehicle(vehicleId, { avgDailyKm: newAvgDailyKm, healthScore: newHealthScore });
};
