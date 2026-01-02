
import { supabase } from '../auth/supabaseClient.ts';
import { Vehicle, MaintenanceTask, ServiceLog } from '../shared/types.ts';

/**
 * Vehicle Persistence Service
 * Aligned with provided Supabase Table Schema.
 */

export const fetchUserVehicles = async (userId: string): Promise<Vehicle[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('owner_id', userId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(v => ({
    id: v.id,
    ownerId: v.owner_id,
    make: v.make,
    model: v.model,
    year: v.year,
    vin: v.vin,
    mileage: v.mileage,
    healthScore: v.health_score,
    bodyType: v.body_type,
    imageUrls: v.image_url ? [v.image_url] : [], // Mapping singular SQL column to plural local state
    status: v.status,
    specs: v.specs,
    isDirty: false
  })) as Vehicle[];
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
  if (!supabase) throw new Error("Supabase not configured");
  
  const { data, error } = await supabase
    .from('vehicles')
    .insert([{
      owner_id: vehicle.ownerId,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin,
      mileage: vehicle.mileage,
      health_score: vehicle.healthScore,
      body_type: vehicle.bodyType,
      status: vehicle.status,
      image_url: vehicle.imageUrls[0] || null, // Mapping local array to singular SQL column
      specs: vehicle.specs
    }])
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    ownerId: data.owner_id,
    make: data.make,
    model: data.model,
    year: data.year,
    vin: data.vin,
    mileage: data.mileage,
    healthScore: data.health_score,
    bodyType: data.body_type,
    imageUrls: data.image_url ? [data.image_url] : [],
    status: data.status,
    specs: data.specs,
    isDirty: false
  } as Vehicle;
};

/**
 * Uploads a vehicle image to Supabase Storage.
 * To save costs ($70 budget), images must be pre-compressed.
 */
export const uploadVehicleImage = async (userId: string, vehicleId: string, file: Blob): Promise<string> => {
  if (!supabase) throw new Error("Supabase not configured");

  const fileExt = 'jpg';
  const fileName = `${userId}/${vehicleId}-${Math.random()}.${fileExt}`;
  const filePath = `vehicle-photos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('assets') // Ensure this bucket exists in Supabase and is public
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('assets')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const updateVehicleData = async (id: string, updates: Partial<Vehicle>): Promise<void> => {
  if (!supabase) return;
  
  const dbUpdates: any = {};
  if (updates.make) dbUpdates.make = updates.make;
  if (updates.model) dbUpdates.model = updates.model;
  if (updates.year) dbUpdates.year = updates.year;
  if (updates.mileage !== undefined) dbUpdates.mileage = updates.mileage;
  if (updates.bodyType) dbUpdates.body_type = updates.bodyType;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.healthScore !== undefined) dbUpdates.health_score = updates.healthScore;
  if (updates.imageUrls && updates.imageUrls.length > 0) dbUpdates.image_url = updates.imageUrls[0];

  const { error } = await supabase
    .from('vehicles')
    .update(dbUpdates)
    .eq('id', id);
  
  if (error) throw error;
};

export const createMileageLogEntry = async (vehicleId: string, userId: string, mileage: number): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from('mileage_logs')
    .insert([{
      vehicle_id: vehicleId,
      user_id: userId,
      mileage: mileage
    }]);
  
  if (error) throw error;
};

// Maintenance Tasks and Logs logic remains modular and separate from vehicles table
export const fetchVehicleTasks = async (vehicleId: string): Promise<MaintenanceTask[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('maintenance_tasks')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('due_mileage', { ascending: true });

  if (error) throw error;
  
  return (data || []).map(t => ({
    id: t.id,
    vehicleId: t.vehicle_id,
    title: t.title,
    description: t.description,
    dueMileage: t.due_mileage,
    status: t.status,
    priority: t.priority,
    estimatedCost: t.estimated_cost,
    category: t.category,
    isDirty: false
  })) as MaintenanceTask[];
};

export const updateTaskStatus = async (taskId: string, status: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from('maintenance_tasks')
    .update({ status })
    .eq('id', taskId);
  
  if (error) throw error;
};

/**
 * Creates a batch of maintenance tasks in Supabase
 */
export const createMaintenanceTasksBatch = async (tasks: Omit<MaintenanceTask, 'id'>[]): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from('maintenance_tasks')
    .insert(tasks.map(t => ({
      vehicle_id: t.vehicleId,
      title: t.title,
      description: t.description,
      // Fixed: mapping camelCase property from Omit<MaintenanceTask, 'id'> to snake_case database column
      due_mileage: t.dueMileage,
      priority: t.priority,
      category: t.category,
      // Fixed: mapping camelCase property from Omit<MaintenanceTask, 'id'> to snake_case database column
      estimated_cost: t.estimatedCost,
      status: t.status
    })));
  
  if (error) throw error;
};

// Fix: Added missing export for fetchVehicleServiceLogs
/**
 * Fetch Service Logs for a vehicle
 */
export const fetchVehicleServiceLogs = async (vehicleId: string): Promise<ServiceLog[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('service_logs')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(l => ({
    id: l.id,
    vehicleId: l.vehicle_id,
    taskId: l.task_id,
    date: l.date,
    description: l.description,
    cost: l.cost,
    mileage: l.mileage,
    providerName: l.provider_name,
    isDirty: false
  })) as ServiceLog[];
};

// Fix: Added missing export for createServiceLogEntry
/**
 * Create a new Service Log Entry
 */
export const createServiceLogEntry = async (log: Omit<ServiceLog, 'id'>): Promise<ServiceLog> => {
  if (!supabase) throw new Error("Supabase not configured");
  
  const { data, error } = await supabase
    .from('service_logs')
    .insert([{
      vehicle_id: log.vehicleId,
      task_id: log.taskId,
      date: log.date,
      description: log.description,
      cost: log.cost,
      mileage: log.mileage,
      provider_name: log.providerName
    }])
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    taskId: data.task_id,
    date: data.date,
    description: data.description,
    cost: data.cost,
    mileage: data.mileage,
    providerName: data.provider_name,
    isDirty: false
  } as ServiceLog;
};
