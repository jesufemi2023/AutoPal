import { supabase } from '../auth/supabaseClient.ts';
import { Vehicle, MaintenanceTask, ServiceLog } from '../shared/types.ts';

/**
 * Vehicle Lifecycle Service
 * Manages the "Digital Twin" state in Supabase.
 */

const handleSupabaseError = (error: any, context: string) => {
  console.error(`Supabase Error [${context}]:`, error);
  if (error.code === 'PGRST116') return null; // Not found
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
    .from('vehicles')
    .select('*')
    .eq('status', 'active') // Only fetch non-archived vehicles
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'fetchUserVehicles');
  return (data || []).map(mapVehicleFromDb);
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'healthScore'>): Promise<Vehicle> => {
  if (!supabase) throw new Error("Supabase not configured");
  
  const { data, error } = await supabase
    .from('vehicles')
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

export const updateVehicle = async (vehicleId: string, data: Partial<Vehicle>): Promise<Vehicle> => {
  if (!supabase) throw new Error("Supabase not configured");

  // Map JS keys to DB columns
  const dbPayload: any = { ...data };
  if (data.mileage !== undefined) dbPayload.current_mileage = data.mileage;
  if (data.ownerId !== undefined) dbPayload.owner_id = data.ownerId;
  if (data.bodyType !== undefined) dbPayload.body_type = data.bodyType;
  if (data.fuelType !== undefined) dbPayload.fuel_type = data.fuelType;
  if (data.engineSize !== undefined) dbPayload.engine_size = data.engineSize;

  // Cleanup JS keys that don't exist in DB
  delete dbPayload.id;
  delete dbPayload.mileage;
  delete dbPayload.ownerId;
  delete dbPayload.bodyType;
  delete dbPayload.fuelType;
  delete dbPayload.engineSize;
  delete dbPayload.createdAt;
  delete dbPayload.updatedAt;

  const { data: updated, error } = await supabase
    .from('vehicles')
    .update(dbPayload)
    .eq('id', vehicleId)
    .select()
    .single();

  if (error) handleSupabaseError(error, 'updateVehicle');
  return mapVehicleFromDb(updated);
};

/**
 * Soft Delete (Archive)
 */
export const archiveVehicle = async (vehicleId: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from('vehicles')
    .update({ status: 'archived' })
    .eq('id', vehicleId);
  if (error) handleSupabaseError(error, 'archiveVehicle');
};

export const updateMileage = async (vehicleId: string, mileage: number): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from('vehicles')
    .update({ current_mileage: mileage })
    .eq('id', vehicleId);
  if (error) handleSupabaseError(error, 'updateMileage');
};

export const fetchVehicleTasks = async (vehicleId: string): Promise<MaintenanceTask[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('maintenance_tasks').select('*').eq('vehicle_id', vehicleId);
  if (error) handleSupabaseError(error, 'fetchVehicleTasks');
  return data || [];
};

export const fetchVehicleServiceLogs = async (vehicleId: string): Promise<ServiceLog[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('service_logs').select('*').eq('vehicle_id', vehicleId);
  if (error) handleSupabaseError(error, 'fetchVehicleServiceLogs');
  return data || [];
};

export const updateTaskStatus = async (taskId: string, status: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('maintenance_tasks').update({ status }).eq('id', taskId);
  if (error) handleSupabaseError(error, 'updateTaskStatus');
};

export const createServiceLogEntry = async (log: Omit<ServiceLog, 'id'>): Promise<ServiceLog> => {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from('service_logs').insert([log]).select().single();
  if (error) handleSupabaseError(error, 'createServiceLogEntry');
  return data;
};

export const createMaintenanceTasksBatch = async (tasks: Omit<MaintenanceTask, 'id'>[]): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('maintenance_tasks').insert(tasks);
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