
import { supabase } from '../auth/supabaseClient.ts';
import { Vehicle, MaintenanceTask, ServiceLog } from '../shared/types.ts';

/**
 * Vehicle Service
 * Handles CRUD operations and storage for the Garage Module via Supabase.
 */

export const uploadVehicleImage = async (userId: string, file: Blob): Promise<string> => {
  if (!supabase) throw new Error("Database connection lost");
  
  const fileExt = 'jpg';
  const fileName = `${userId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `vehicle-images/${fileName}`;

  const { data, error } = await supabase.storage
    .from('assets')
    .upload(filePath, file, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('assets')
    .getPublicUrl(filePath);

  return publicUrl;
};

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
    imageUrls: v.image_urls || (v.image_url ? [v.image_url] : []),
    status: v.status,
    engineSize: v.engine_size,
    fuelType: v.fuel_type,
    specs: v.specs,
    // Fix: satisfy Vehicle interface requirement for isDirty
    isDirty: false
  })) as Vehicle[];
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
  if (!supabase) throw new Error("Database connection lost");
  
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
      image_urls: vehicle.imageUrls,
      engine_size: vehicle.engineSize,
      fuel_type: vehicle.fuelType,
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
    imageUrls: data.image_urls,
    status: data.status,
    engineSize: data.engine_size,
    fuelType: data.fuel_type, // Fixed property name from fuel_type to fuelType
    specs: data.specs,
    // Fix: satisfy Vehicle interface requirement for isDirty
    isDirty: false
  } as Vehicle;
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
  
  if (error) throw error;
};

export const updateTaskStatus = async (taskId: string, status: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from('maintenance_tasks')
    .update({ status })
    .eq('id', taskId);
  
  if (error) throw error;
};

export const createServiceLogEntry = async (log: Omit<ServiceLog, 'id'>): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from('service_logs')
    .insert([{
      vehicle_id: log.vehicleId,
      task_id: log.taskId,
      date: log.date,
      description: log.description,
      cost: log.cost,
      mileage: log.mileage
    }]);
  
  if (error) throw error;
};

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
    // Fix: satisfy MaintenanceTask interface requirement for isDirty
    isDirty: false
  })) as MaintenanceTask[];
};

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
    // Fix: satisfy ServiceLog interface requirement for isDirty
    isDirty: false
  })) as ServiceLog[];
};

export const updateVehicleData = async (id: string, updates: Partial<Vehicle>): Promise<void> => {
  if (!supabase) return;
  
  const dbUpdates: any = {};
  if (updates.make) dbUpdates.make = updates.make;
  if (updates.model) dbUpdates.model = updates.model;
  if (updates.year) dbUpdates.year = updates.year;
  if (updates.mileage !== undefined) dbUpdates.mileage = updates.mileage;
  if (updates.bodyType) dbUpdates.body_type = updates.bodyType;
  if (updates.imageUrls) dbUpdates.image_urls = updates.imageUrls;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.healthScore !== undefined) dbUpdates.health_score = updates.healthScore;

  const { error } = await supabase
    .from('vehicles')
    .update(dbUpdates)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteVehiclePermanently = async (id: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};
