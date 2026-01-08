
import { supabase } from '../auth/supabaseClient.ts';
import { ServiceLog } from '../shared/types.ts';

/**
 * Log Intelligence Service
 * Handles CRUD for maintenance records.
 */

export const fetchServiceLogs = async (vehicleId: string): Promise<ServiceLog[]> => {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('service_logs')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('service_date', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    vehicleId: row.vehicle_id,
    serviceType: row.service_type,
    serviceDate: row.service_date,
    mileageAtService: parseFloat(row.mileage_at_service),
    cost: parseFloat(row.cost),
    provider: row.provider,
    notes: row.notes,
    // Fix: category is required in ServiceLog
    category: row.category,
    // Fix: status and updatedAt are now part of ServiceLog type
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
};

export const createServiceLog = async (log: Omit<ServiceLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceLog> => {
  if (!supabase) throw new Error("Cloud infrastructure not connected.");
  
  const { data, error } = await supabase
    .from('service_logs')
    .insert([{
      vehicle_id: log.vehicleId,
      service_type: log.serviceType,
      service_date: log.serviceDate,
      mileage_at_service: log.mileageAtService,
      cost: log.cost,
      provider: log.provider,
      notes: log.notes,
      // Fix: category and status mapping
      category: log.category,
      status: log.status
    }])
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    serviceType: data.service_type,
    serviceDate: data.service_date,
    mileageAtService: parseFloat(data.mileage_at_service),
    cost: parseFloat(data.cost),
    provider: data.provider,
    notes: data.notes,
    category: data.category,
    // Fix: mapping status and updatedAt from DB response
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

export const deleteServiceLog = async (id: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('service_logs').delete().eq('id', id);
  if (error) throw error;
};