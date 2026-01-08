
import { supabase } from '../auth/supabaseClient.ts';
import { Vehicle, MaintenanceTask, ServiceLog, VerificationLevel } from '../shared/types.ts';
import { calculateNextMilestone } from './maintenanceLogic.ts';

/**
 * Vehicle Lifecycle Service
 * Manages the "Digital Twin" state in Supabase.
 * NOTE: User's DB has inverted table names:
 * 'service_logs' table stores Rules (MaintenanceTask)
 * 'maintenance_tasks' table stores Records (ServiceLog)
 */

const DB_TABLES = {
  VEHICLES: 'vehicles',
  RULES: 'service_logs', // Points to rules/intervals
  RECORDS: 'maintenance_tasks' // Points to history/logs
};

const handleSupabaseError = (error: any, context: string) => {
  console.error(`Supabase Error [${context}]:`, error);
  if (error.code === 'PGRST116') return null; 
  if (error.code === '42P01') {
    throw new Error(`Database table missing. Please run migrations in Supabase SQL Editor.`);
  }
  if (error.code === '23505') {
    throw new Error(`A vehicle with this Chassis ID (VIN) already exists in the system.`);
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

  const dbPayload: any = { ...data };
  if (data.mileage !== undefined) dbPayload.current_mileage = data.mileage;
  if (data.ownerId !== undefined) dbPayload.owner_id = data.owner_id;
  if (data.bodyType !== undefined) dbPayload.body_type = data.bodyType;
  if (data.fuelType !== undefined) dbPayload.fuel_type = data.fuelType;
  if (data.engineSize !== undefined) dbPayload.engine_size = data.engineSize;

  delete dbPayload.id;
  delete dbPayload.mileage;
  delete dbPayload.ownerId;
  delete dbPayload.bodyType;
  delete dbPayload.fuelType;
  delete dbPayload.engineSize;
  delete dbPayload.createdAt;
  delete dbPayload.updatedAt;

  const { data: updated, error } = await supabase
    .from(DB_TABLES.VEHICLES)
    .update(dbPayload)
    .eq('id', vehicleId)
    .select()
    .single();

  if (error) handleSupabaseError(error, 'updateVehicle');
  return mapVehicleFromDb(updated);
};

export const updateMileage = async (vehicleId: string, mileage: number): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from(DB_TABLES.VEHICLES)
    .update({ current_mileage: mileage })
    .eq('id', vehicleId);
  if (error) handleSupabaseError(error, 'updateMileage');
};

/**
 * PHASE 4: RECURSION CUSTOMIZATION
 * Finalizes maintenance completion with optional interval overrides.
 */
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
): Promise<{ log: ServiceLog; updatedTask: MaintenanceTask }> => {
  if (!supabase) throw new Error("Supabase client missing.");

  // Use task defaults if overrides aren't provided
  const targetIntervalKm = completionData.intervalKm ?? task.intervalKm ?? 5000;
  const targetIntervalMonths = completionData.intervalMonths ?? task.intervalMonths ?? 6;

  // 1. Calculate the next recursive milestone
  const { nextMileage, nextDate } = calculateNextMilestone(
    completionData.mileageAtService, 
    completionData.serviceDate, 
    targetIntervalKm, 
    targetIntervalMonths
  );

  // 2. Perform the Triple-Sync (Update Rules, Insert Records, Sync Telemetry)
  
  // A. Create History Record (maintenance_tasks table)
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

  if (logError) handleSupabaseError(logError, 'TripleSync-Record');

  // B. Update the Task Rule (service_logs table) for next time
  const { data: ruleData, error: ruleError } = await supabase
    .from(DB_TABLES.RULES)
    .update({
      due_mileage: nextMileage,
      due_date: nextDate,
      last_completed_at: completionData.serviceDate,
      verification_level: completionData.verificationLevel,
      receipt_url: completionData.receipt_url,
      interval_km: targetIntervalKm,
      interval_months: targetIntervalMonths,
      status: 'pending' 
    })
    .eq('id', task.id)
    .select()
    .single();

  if (ruleError) handleSupabaseError(ruleError, 'TripleSync-Rule');

  // C. Sync Vehicle Telemetry if odometer has increased
  if (completionData.mileageAtService > vehicle.mileage) {
    const { error: odoError } = await supabase
      .from(DB_TABLES.VEHICLES)
      .update({ current_mileage: completionData.mileageAtService })
      .eq('id', vehicle.id);
    if (odoError) handleSupabaseError(odoError, 'TripleSync-Odo');
  }

  return {
    log: {
      id: logData.id,
      vehicleId: logData.vehicle_id,
      taskId: logData.task_id,
      serviceType: logData.service_type,
      serviceDate: logData.service_date,
      mileageAtService: parseFloat(logData.mileage_at_service),
      cost: parseFloat(logData.cost),
      provider: logData.provider,
      notes: logData.notes,
      category: logData.category,
      verificationLevel: logData.verification_level,
      receiptUrl: logData.receipt_url,
      createdAt: logData.created_at
    },
    updatedTask: {
      id: ruleData.id,
      vehicleId: ruleData.vehicle_id,
      title: ruleData.title,
      description: ruleData.description,
      dueMileage: parseFloat(ruleData.due_mileage),
      dueDate: ruleData.due_date,
      status: ruleData.status,
      priority: ruleData.priority,
      category: ruleData.category,
      estimatedCost: parseFloat(ruleData.estimated_cost),
      lastCompletedAt: ruleData.last_completed_at,
      intervalKm: ruleData.interval_km,
      intervalMonths: ruleData.interval_months,
      lastVerificationLevel: ruleData.verification_level,
      lastReceiptUrl: ruleData.receipt_url
    }
  };
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
    vehicleId: t.vehicle_id,
    title: t.title,
    description: t.description,
    dueMileage: parseFloat(t.due_mileage || '0'),
    dueDate: t.due_date,
    status: t.status,
    priority: t.priority,
    category: t.category,
    estimatedCost: parseFloat(t.estimated_cost || '0'),
    lastCompletedAt: t.last_completed_at,
    intervalKm: t.interval_km,
    intervalMonths: t.interval_months,
    lastVerificationLevel: t.verification_level,
    lastReceiptUrl: t.receipt_url
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
      image_url: vehicle.imageUrl,
      image_urls: vehicle.imageUrls,
      specs: vehicle.specs,
      status: 'active',
      fuel_type: vehicle.fuelType,
      engine_size: vehicle.engineSize
    }])
    .select()
    .single();

  if (error) handleSupabaseError(error, 'createVehicle');
  return mapVehicleFromDb(data);
};

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
    // Fix: access t.estimatedCost instead of t.estimated_cost
    estimated_cost: t.estimatedCost,
    interval_km: t.intervalKm || 5000,
    // Fix: access t.intervalMonths instead of t.interval_months
    interval_months: t.intervalMonths || 6
  }));

  const { error } = await supabase
    .from(DB_TABLES.RULES)
    .insert(payload);
    
  if (error) handleSupabaseError(error, 'createMaintenanceTasksBatch');
};

export const uploadVehicleImage = async (userId: string, vehicleId: string, blob: Blob): Promise<string> => {
  if (!supabase) throw new Error("Supabase not configured");
  const fileName = `${userId}/${vehicleId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage.from('vehicle-images').upload(fileName, blob);
  if (error) handleSupabaseError(error, 'uploadVehicleImage');
  const { data: { publicUrl } } = supabase.storage.from('vehicle-images').getPublicUrl(data.path);
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

export const createServiceLogEntry = async (log: any): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from(DB_TABLES.RECORDS)
    .insert([{
      vehicle_id: log.vehicleId,
      task_id: log.taskId,
      service_type: log.serviceType,
      service_date: log.serviceDate,
      mileage_at_service: log.mileageAtService,
      cost: log.cost,
      category: log.category,
      status: log.status
    }]);
  if (error) handleSupabaseError(error, 'createServiceLogEntry');
};
