
import { supabase } from '../auth/supabaseClient.ts';
import { Vehicle, MaintenanceTask, ServiceLog } from '../shared/types.ts';

/**
 * Vehicle Persistence Service
 */

const handleSupabaseError = (error: any, context: string) => {
  if (error.code === 'PGRST116' || error.status === 404) {
    console.error(`[Supabase 404] Table missing for ${context}. Ensure you have run the database migrations in your Supabase SQL Editor.`);
  }
  throw error;
};

export const fetchUserVehicles = async (userId: string): Promise<Vehicle[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('owner_id', userId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  if (error) return handleSupabaseError(error, 'fetchUserVehicles');
  
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
    imageUrls: v.image_url ? [v.image_url] : [],
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
      image_url: vehicle.imageUrls[0] || null,
      specs: vehicle.specs
    }])
    .select()
    .single();

  if (error) return handleSupabaseError(error, 'createVehicle');
  
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

export const uploadVehicleImage = async (userId: string, vehicleId: string, file: Blob): Promise<string> => {
  if (!supabase) throw new Error("Supabase not configured");

  const fileExt = 'jpg';
  const fileName = `${userId}/${vehicleId}-${Math.random()}.${fileExt}`;
  const filePath = `vehicle-photos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('assets')
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
  
  if (error) return handleSupabaseError(error, 'updateVehicleData');
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
  
  if (error) return handleSupabaseError(error, 'createMileageLogEntry');
};

export const fetchVehicleTasks = async (vehicleId: string): Promise<MaintenanceTask[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('maintenance_tasks')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('due_mileage', { ascending: true });

  if (error) return handleSupabaseError(error, 'fetchVehicleTasks');
  
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
  
  if (error) return handleSupabaseError(error, 'updateTaskStatus');
};

export const createMaintenanceTasksBatch = async (tasks: Omit<MaintenanceTask, 'id'>[]): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from('maintenance_tasks')
    .insert(tasks.map(t => ({
      vehicle_id: t.vehicleId,
      title: t.title,
      description: t.description,
      due_mileage: t.dueMileage,
      priority: t.priority,
      category: t.category,
      estimated_cost: t.estimatedCost,
      status: t.status
    })));
  
  if (error) return handleSupabaseError(error, 'createMaintenanceTasksBatch');
};

export const fetchVehicleServiceLogs = async (vehicleId: string): Promise<ServiceLog[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('service_logs')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false });

  if (error) return handleSupabaseError(error, 'fetchVehicleServiceLogs');
  
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

  if (error) return handleSupabaseError(error, 'createServiceLogEntry');
  
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
