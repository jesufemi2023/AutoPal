import { supabase } from '../auth/supabaseClient.ts';
import { Vehicle, MaintenanceTask, ServiceLog, VerificationLevel, FuelLog, Priority } from '../shared/types.ts';
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

  // Handle common RLS violation (403 or code 42501)
  if (
    error.message?.toLowerCase().includes('row-level security') || 
    error.message?.toLowerCase().includes('permission denied') ||
    error.code === '42501' || 
    error.status === 403
  ) {
    throw new Error(`Permission Denied: ${context} failed due to RLS policies.
    
1. Check if the 'vehicle-images' bucket exists in Supabase.
2. Ensure you have run the RLS policies from SUPABASE_GUIDE.md in the SQL Editor.
3. Verify that your user session is still active.

Full Details: ${message}`);
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
  imageUrls: v.image_urls || [],
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
  provider: l.provider,
  notes: l.notes,
  status: l.status,
  category: l.category,
  verificationLevel: l.verification_level,
  receiptUrl: l.receipt_url,
  createdAt: l.created_at
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

  const dbPayload: any = { ...data };
  if (data.mileage !== undefined) dbPayload.current_mileage = data.mileage;
  if (data.ownerId !== undefined) dbPayload.owner_id = data.ownerId;
  if (data.bodyType !== undefined) dbPayload.body_type = data.bodyType;
  if (data.fuelType !== undefined) dbPayload.fuel_type = data.fuelType;
  if (data.engineSize !== undefined) dbPayload.engine_size = data.engineSize;
  if (data.avgDailyKm !== undefined) dbPayload.avg_daily_km = data.avgDailyKm;
  if (data.healthScore !== undefined) dbPayload.health_score = data.healthScore;

  const keysToRemove = ['id', 'mileage', 'ownerId', 'bodyType', 'fuelType', 'engineSize', 'avgDailyKm', 'healthScore', 'createdAt', 'updatedAt', 'imageUrls'];
  keysToRemove.forEach(k => delete dbPayload[k]);

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

  return await updateVehicle(vehicleId, { 
    avgDailyKm: newAvgDailyKm, 
    healthScore: newHealthScore 
  });
};

export const updateMileage = async (vehicleId: string, mileage: number): Promise<Vehicle> => {
  if (!supabase) throw new Error("Supabase client missing.");
  
  await supabase
    .from(DB_TABLES.VEHICLES)
    .update({ current_mileage: mileage })
    .eq('id', vehicleId);
    
  return await syncVehicleVitals(vehicleId);
};

export const finalizeMaintenanceCompletion = async (
  vehicle: Vehicle, 
  task: MaintenanceTask, 
  completionData: {
    mileageAtService: number;
    serviceDate: string;
    cost: number;
    provider: string;
    notes: string;
    verificationLevel: VerificationLevel;
    receiptUrl?: string;
    intervalKm?: number;
    intervalMonths?: number;
  }
): Promise<{ log: ServiceLog; updatedTask: MaintenanceTask; updatedVehicle: Vehicle }> => {
  if (!supabase) throw new Error("Supabase client missing.");

  const targetIntervalKm = completionData.intervalKm ?? task.intervalKm ?? 5000;
  const targetIntervalMonths = completionData.intervalMonths ?? task.intervalMonths ?? 6;

  const { nextMileage, nextDate } = calculateNextMilestone(
    completionData.mileageAtService, 
    completionData.serviceDate, 
    targetIntervalKm, 
    targetIntervalMonths
  );

  const { data: logData, error: logError } = await supabase
    .from(DB_TABLES.RECORDS)
    .insert([{
      vehicle_id: vehicle.id,
      task_id: task.id,
      service_type: task.title,
      service_date: completionData.serviceDate,
      mileage_at_service: completionData.mileageAtService,
      cost: completionData.cost,
      provider: completionData.provider,
      notes: completionData.notes,
      category: task.category,
      verification_level: completionData.verificationLevel,
      receipt_url: completionData.receiptUrl,
      status: 'completed'
    }])
    .select()
    .single();
  if (logError) handleSupabaseError(logError, 'Sync-Log');

  const { data: ruleData, error: ruleError } = await supabase
    .from(DB_TABLES.RULES)
    .update({
      due_mileage: nextMileage,
      due_date: nextDate,
      last_completed_at: completionData.serviceDate,
      interval_km: targetIntervalKm,
      interval_months: targetIntervalMonths,
      last_verification_level: completionData.verificationLevel,
      status: 'pending' 
    })
    .eq('id', task.id)
    .select()
    .single();
  if (ruleError) handleSupabaseError(ruleError, 'Sync-Rule');

  const updatedVehicle = await syncVehicleVitals(vehicle.id);

  return {
    log: mapLogFromDb(logData),
    updatedTask: {
      id: ruleData.id,
      taskId: ruleData.task_id,
      vehicleId: ruleData.vehicle_id,
      title: ruleData.title,
      description: ruleData.description,
      dueMileage: parseFloat(ruleData.due_mileage),
      dueDate: ruleData.due_date,
      status: ruleData.status,
      priority: ruleData.priority as Priority,
      category: ruleData.category,
      estimatedCost: parseFloat(ruleData.estimated_cost),
      lastCompletedAt: ruleData.last_completed_at,
      intervalKm: ruleData.interval_km,
      intervalMonths: ruleData.interval_months,
      lastVerificationLevel: ruleData.last_verification_level
    },
    updatedVehicle
  };
};

export const createManualServiceLog = async (
  vehicle: Vehicle,
  data: Omit<ServiceLog, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ServiceLog> => {
  if (!supabase) throw new Error("Supabase client missing.");

  const { data: logData, error } = await supabase
    .from(DB_TABLES.RECORDS)
    .insert([{
      vehicle_id: vehicle.id,
      task_id: data.taskId || null,
      service_type: data.serviceType,
      service_date: data.serviceDate,
      mileage_at_service: data.mileageAtService,
      cost: data.cost,
      provider: data.provider,
      notes: data.notes,
      category: data.category,
      verification_level: data.verificationLevel,
      status: 'completed'
    }])
    .select()
    .single();

  if (error) handleSupabaseError(error, 'createManualServiceLog');

  if (data.mileageAtService > vehicle.mileage) {
    await updateMileage(vehicle.id, data.mileageAtService);
  } else {
    await syncVehicleVitals(vehicle.id);
  }

  return mapLogFromDb(logData);
};

export const fetchVehicleTasks = async (vehicleId: string): Promise<MaintenanceTask[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(DB_TABLES.RULES)
    .select('*')
    .eq('vehicle_id', vehicleId);
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
    intervalMonths: t.interval_months,
    lastVerificationLevel: t.last_verification_level
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

export const archiveVehicle = async (vehicleId: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from(DB_TABLES.VEHICLES)
    .update({ status: 'archived' })
    .eq('id', vehicleId);
  if (error) handleSupabaseError(error, 'archiveVehicle');
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
    image_urls: vehicle.imageUrls,
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

export const createMaintenanceTasksBatch = async (tasks: Omit<MaintenanceTask, 'id'>[]): Promise<void> => {
  if (!supabase) return;
  
  const fullPayload = tasks.map(t => ({
    vehicle_id: t.vehicleId,
    title: t.title,
    description: t.description || '',
    due_mileage: t.dueMileage,
    due_date: t.dueDate || null,
    status: t.status,
    priority: t.priority,
    category: t.category,
    estimated_cost: t.estimatedCost || 0,
    interval_km: t.intervalKm || 5000,
    interval_months: t.intervalMonths || 6,
    last_verification_level: t.lastVerificationLevel || 'self_declared',
    last_receipt_url: t.lastReceiptUrl || null
  }));

  const { error: error1 } = await supabase.from(DB_TABLES.RULES).insert(fullPayload);
  if (!error1) return;

  const errType = handleSupabaseError(error1, 'Sync-Batch-Full');
  
  if (errType === 'SCHEMA_MISMATCH') {
    const fallbackPayload = fullPayload.map(p => {
      const { estimated_cost, interval_km, interval_months, last_verification_level, last_receipt_url, ...rest } = p;
      return rest;
    });
    
    console.warn("Retrying with fallback schema...");
    const { error: error2 } = await supabase.from(DB_TABLES.RULES).insert(fallbackPayload);
    if (!error2) return;

    const barePayload = fallbackPayload.map(p => ({
      vehicle_id: p.vehicle_id,
      title: p.title,
      status: p.status
    }));

    console.warn("Retrying with barebones schema...");
    const { error: error3 } = await supabase.from(DB_TABLES.RULES).insert(barePayload);
    if (error3) {
      throw error3;
    }
  } else {
    throw error1;
  }
};

export const uploadVehicleImage = async (userId: string, vehicleId: string, blob: Blob): Promise<string> => {
  if (!supabase) throw new Error("Supabase not configured");
  
  // CRITICAL: The path MUST start with userId to satisfy the RLS policy:
  // (storage.foldername(name))[1] = auth.uid()::text
  const fileName = `${userId}/${vehicleId}/${Date.now()}.jpg`;
  
  const { data, error } = await supabase.storage
    .from('vehicle-images')
    .upload(fileName, blob, {
      cacheControl: '3600',
      upsert: true // Allows updating if the path somehow conflicts
    });
  
  if (error) {
    handleSupabaseError(error, `Optical Storage Sync (${fileName})`);
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from('vehicle-images')
    .getPublicUrl(data!.path);
    
  return publicUrl;
};

export const updateTaskStatus = async (taskId: string, status: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from(DB_TABLES.RULES)
    .update({ status })
    .eq('id', taskId);
  if (error) handleSupabaseError(error, 'updateTaskStatus');
};
