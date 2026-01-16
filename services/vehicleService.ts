
import { supabase } from '../auth/supabaseClient.ts';
import { Vehicle, MaintenanceTask, ServiceLog, VerificationLevel, FuelLog, Priority, TaskStatus } from '../shared/types.ts';
import { calculateNextMilestone, calculateAverageDailyKm, calculateVitalityScore } from './maintenanceLogic.ts';
import { fetchFuelLogs } from './fuelService.ts';

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
    throw new Error(`Database table missing. Please run migrations in Supabase SQL Editor.`);
  }
  if (error.code === '23505') {
    throw new Error(`A vehicle with this Chassis ID (VIN) already exists in the system.`);
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

const mapLogFromDb = (l: any): ServiceLog => ({
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
  createdAt: l.created_at
});

export const fetchVehicleTasks = async (vehicleId: string): Promise<MaintenanceTask[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(DB_TABLES.RULES)
    .select('*')
    .eq('vehicle_id', vehicleId);
  if (error) handleSupabaseError(error, 'fetchVehicleTasks');
  return (data || []).map(t => ({
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
    lastCompletedAt: t.last_completed_at
  }));
};

export const fetchVehicleServiceLogs = async (vehicleId: string): Promise<ServiceLog[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(DB_TABLES.RECORDS)
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('service_date', { ascending: false });
  if (error) handleSupabaseError(error, 'fetchVehicleServiceLogs');
  return (data || []).map(mapLogFromDb);
};

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

export const createVehicle = async (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'healthScore'>): Promise<Vehicle> => {
  if (!supabase) throw new Error("Supabase client missing.");
  const dbPayload = {
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
  };
  const { data, error } = await supabase
    .from(DB_TABLES.VEHICLES)
    .insert([dbPayload])
    .select()
    .single();
  if (error) handleSupabaseError(error, 'createVehicle');
  return mapVehicleFromDb(data);
};

export const createMaintenanceTasksBatch = async (tasks: Omit<MaintenanceTask, 'id'>[]): Promise<void> => {
  if (!supabase) return;
  const dbPayloads = tasks.map(t => ({
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
  const { error } = await supabase
    .from(DB_TABLES.RULES)
    .insert(dbPayloads);
  if (error) handleSupabaseError(error, 'createMaintenanceTasksBatch');
};

export const updateVehicle = async (vehicleId: string, data: Partial<Vehicle>): Promise<Vehicle> => {
  if (!supabase) throw new Error("Supabase not configured");

  const dbPayload: any = {};
  
  if (data.make !== undefined) dbPayload.make = data.make;
  if (data.model !== undefined) dbPayload.model = data.model;
  if (data.year !== undefined) dbPayload.year = data.year;
  if (data.vin !== undefined) dbPayload.vin = data.vin;
  if (data.status !== undefined) dbPayload.status = data.status;
  if (data.specs !== undefined) dbPayload.specs = data.specs;
  
  if (data.mileage !== undefined) dbPayload.current_mileage = data.mileage;
  if (data.ownerId !== undefined) dbPayload.owner_id = data.ownerId;
  if (data.bodyType !== undefined) dbPayload.body_type = data.bodyType;
  if (data.fuelType !== undefined) dbPayload.fuel_type = data.fuelType;
  if (data.engineSize !== undefined) dbPayload.engine_size = data.engineSize;
  if (data.avgDailyKm !== undefined) dbPayload.avg_daily_km = data.avgDailyKm;
  if (data.healthScore !== undefined) dbPayload.health_score = data.healthScore;
  if (data.imageUrl !== undefined) dbPayload.image_url = data.imageUrl;

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

export const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from(DB_TABLES.RULES)
    .update({ status })
    .eq('id', taskId);
  if (error) handleSupabaseError(error, 'updateTaskStatus');
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
  if (!supabase) throw new Error("Supabase client missing.");
  const path = `${userId}/${vehicleId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('vehicle-images')
    .upload(path, blob);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage
    .from('vehicle-images')
    .getPublicUrl(path);
  return publicUrl;
};

export const createManualServiceLog = async (vehicle: Vehicle, log: Omit<ServiceLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceLog> => {
  if (!supabase) throw new Error("Supabase client missing.");
  const { data, error } = await supabase
    .from(DB_TABLES.RECORDS)
    .insert([{
      vehicle_id: log.vehicleId,
      task_id: log.taskId || null,
      service_type: log.serviceType,
      service_date: log.serviceDate,
      mileage_at_service: log.mileageAtService,
      cost: log.cost,
      notes: log.notes,
      provider: log.provider,
      category: log.category,
      status: log.status || 'completed',
      verification_level: log.verificationLevel,
      receipt_url: log.receiptUrl
    }])
    .select()
    .single();
  if (error) handleSupabaseError(error, 'createManualServiceLog');
  return mapLogFromDb(data);
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
  const newHealthScore = calculateVitalityScore({ ...vehicle, avgDailyKm: newAvgDailyKm }, tasks, fuelLogs, serviceLogs);

  return await updateVehicle(vehicleId, { avgDailyKm: newAvgDailyKm, healthScore: newHealthScore });
};

export const updateMileage = async (vehicleId: string, mileage: number, force: boolean = false): Promise<Vehicle> => {
  if (!supabase) throw new Error("Supabase client missing.");
  
  const { data: current, error: fetchError } = await supabase
    .from(DB_TABLES.VEHICLES)
    .select('current_mileage')
    .eq('id', vehicleId)
    .single();

  if (fetchError) handleSupabaseError(fetchError, 'updateMileage-Fetch');

  const currentMileage = parseFloat(current.current_mileage || '0');
  
  if (!force && mileage <= currentMileage) {
    return await syncVehicleVitals(vehicleId);
  }

  const { error: updateError } = await supabase
    .from(DB_TABLES.VEHICLES)
    .update({ current_mileage: mileage })
    .eq('id', vehicleId);

  if (updateError) handleSupabaseError(updateError, 'updateMileage-Update');

  return await syncVehicleVitals(vehicleId);
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
  if (!supabase) throw new Error("Supabase client missing.");

  const targetIntervalKm = completionData.intervalKm ?? task.intervalKm ?? 5000;
  const targetIntervalMonths = completionData.intervalMonths ?? task.intervalMonths ?? 6;

  const { nextMileage, nextDate } = calculateNextMilestone(completionData.mileageAtService, completionData.serviceDate, targetIntervalKm, targetIntervalMonths);

  const { data: logData, error: logError } = await supabase
    .from(DB_TABLES.RECORDS)
    .insert([{
      vehicle_id: vehicle.id,
      task_id: task.id,
      service_type: task.title,
      service_date: completionData.serviceDate,
      mileage_at_service: completionData.mileageAtService,
      cost: completionData.cost,
      notes: completionData.notes,
      provider: completionData.provider,
      category: task.category,
      verification_level: completionData.verificationLevel,
      receipt_url: completionData.receiptUrl,
      status: 'completed'
    }])
    .select()
    .single();
  if (logError) handleSupabaseError(logError, 'finalize-Log');

  const { data: taskData, error: taskError } = await supabase
    .from(DB_TABLES.RULES)
    .update({
      due_mileage: nextMileage,
      due_date: nextDate,
      last_completed_at: completionData.serviceDate,
      last_verification_level: completionData.verificationLevel,
      last_receipt_url: completionData.receiptUrl,
      status: 'pending' 
    })
    .eq('id', task.id)
    .select()
    .single();
  if (taskError) handleSupabaseError(taskError, 'finalize-Task');

  const updatedVehicle = await updateMileage(vehicle.id, Math.max(vehicle.mileage, completionData.mileageAtService));

  return {
    log: mapLogFromDb(logData),
    updatedTask: {
      ...task,
      dueMileage: nextMileage,
      dueDate: nextDate,
      lastCompletedAt: completionData.serviceDate,
      lastVerificationLevel: completionData.verificationLevel,
      lastReceiptUrl: completionData.receiptUrl,
      intervalMonths: targetIntervalMonths
    },
    updatedVehicle
  };
};
