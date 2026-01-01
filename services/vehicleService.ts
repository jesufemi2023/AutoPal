
import { supabase } from '../auth/supabaseClient.ts';
import { Vehicle, MaintenanceTask } from '../shared/types.ts';

/**
 * Vehicle Service
 * Handles CRUD operations for the Garage Module via Supabase.
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
  
  // Map snake_case from DB to camelCase for Store
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
    imageUrl: v.image_url,
    status: v.status,
    engineSize: v.engine_size,
    fuelType: v.fuel_type,
    specs: v.specs
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
      image_url: vehicle.imageUrl,
      engine_size: vehicle.engineSize,
      fuel_type: vehicle.fuelType,
      specs: vehicle.specs
    }])
    .select()
    .single();

  if (error) throw error;
  
  // Map result back to CamelCase
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
    imageUrl: data.image_url,
    status: data.status,
    engineSize: data.engine_size,
    fuelType: data.fuel_type,
    specs: data.specs
  } as Vehicle;
};

export const updateVehicleData = async (id: string, updates: Partial<Vehicle>): Promise<void> => {
  if (!supabase) return;
  
  // Map camelCase to snake_case for DB
  const dbUpdates: any = {};
  if (updates.make) dbUpdates.make = updates.make;
  if (updates.model) dbUpdates.model = updates.model;
  if (updates.year) dbUpdates.year = updates.year;
  if (updates.mileage !== undefined) dbUpdates.mileage = updates.mileage;
  if (updates.bodyType) dbUpdates.body_type = updates.bodyType;
  if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.engineSize) dbUpdates.engine_size = updates.engineSize;
  if (updates.fuelType) dbUpdates.fuel_type = updates.fuelType;
  if (updates.specs) dbUpdates.specs = updates.specs;

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

export const fetchMaintenanceTasks = async (vehicleId: string): Promise<MaintenanceTask[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('maintenance_tasks')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('due_mileage', { ascending: true });

  if (error) throw error;
  return data || [];
};
