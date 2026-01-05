
import { supabase } from '../auth/supabaseClient.ts';
import { Vehicle, MaintenanceTask, ServiceLog } from '../shared/types.ts';

/**
 * Vehicle Lifecycle Service
 */

export const fetchUserVehicles = async (): Promise<Vehicle[]> => {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
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
    mileage: parseFloat(v.current_mileage),
    healthScore: 100, // Placeholder for Phase 3
    bodyType: v.body_type,
    imageUrl: v.image_url,
    imageUrls: v.image_urls || [],
    status: v.status,
    specs: v.specs,
    createdAt: v.created_at,
    updatedAt: v.updated_at
  }));
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
      status: vehicle.status,
      fuel_type: vehicle.fuelType,
      engine_size: vehicle.engineSize
    }])
    .select()
    .single();

  if (error) throw error;
  
  return {
    ...data,
    mileage: parseFloat(data.current_mileage),
    healthScore: 100
  };
};

export const updateMileage = async (vehicleId: string, mileage: number): Promise<void> => {
  if (!supabase) return;
  
  const { error } = await supabase
    .from('vehicles')
    .update({ current_mileage: mileage })
    .eq('id', vehicleId);
    
  if (error) throw error;
};

// Fix: Added missing export fetchVehicleTasks used in Dashboard.tsx
export const fetchVehicleTasks = async (vehicleId: string): Promise<MaintenanceTask[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('maintenance_tasks').select('*').eq('vehicle_id', vehicleId);
  if (error) throw error;
  return data || [];
};

// Fix: Added missing export fetchVehicleServiceLogs used in Dashboard.tsx
export const fetchVehicleServiceLogs = async (vehicleId: string): Promise<ServiceLog[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('service_logs').select('*').eq('vehicle_id', vehicleId);
  if (error) throw error;
  return data || [];
};

// Fix: Added missing export updateVehicleData used in Dashboard.tsx and OnboardingCommandCenter.tsx
export const updateVehicleData = async (vehicleId: string, data: Partial<Vehicle>): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('vehicles').update(data).eq('id', vehicleId);
  if (error) throw error;
};

// Fix: Added missing export updateTaskStatus used in Dashboard.tsx and syncService.ts
export const updateTaskStatus = async (taskId: string, status: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('maintenance_tasks').update({ status }).eq('id', taskId);
  if (error) throw error;
};

// Fix: Added missing export createServiceLogEntry used in Dashboard.tsx
export const createServiceLogEntry = async (log: Omit<ServiceLog, 'id'>): Promise<ServiceLog> => {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from('service_logs').insert([log]).select().single();
  if (error) throw error;
  return data;
};

// Fix: Added missing export createMaintenanceTasksBatch used in syncService.ts and vehicleRegistrationService.ts
export const createMaintenanceTasksBatch = async (tasks: Omit<MaintenanceTask, 'id'>[]): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('maintenance_tasks').insert(tasks);
  if (error) throw error;
};

// Fix: Added missing export uploadVehicleImage used in OnboardingCommandCenter.tsx
export const uploadVehicleImage = async (userId: string, vehicleId: string, blob: Blob): Promise<string> => {
  if (!supabase) throw new Error("Supabase not configured");
  const fileName = `${userId}/${vehicleId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage.from('vehicle-images').upload(fileName, blob);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('vehicle-images').getPublicUrl(data.path);
  return publicUrl;
};
