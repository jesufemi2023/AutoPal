
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
    taskId: row.task_id,
    serviceType: row.service_type,
    serviceDate: row.service_date,
    mileageAtService: parseFloat(row.mileage_at_service),
    cost: parseFloat(row.cost),
    notes: row.notes,
    provider: row.provider,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    verificationLevel: row.verification_level,
    receiptUrl: row.receipt_url
  }));
};

export const createServiceLog = async (log: Omit<ServiceLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceLog> => {
  if (!supabase) throw new Error("Cloud infrastructure not connected.");
  
  const { data, error } = await supabase
    .from('service_logs')
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
      status: log.status,
      verification_level: log.verificationLevel
    }])
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    taskId: data.task_id,
    serviceType: data.service_type,
    serviceDate: data.service_date,
    mileageAtService: parseFloat(data.mileage_at_service),
    cost: parseFloat(data.cost),
    notes: data.notes,
    provider: data.provider,
    category: data.category,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    verificationLevel: data.verification_level,
    receiptUrl: data.receipt_url
  };
};

export const updateServiceLog = async (id: string, log: Partial<ServiceLog>): Promise<ServiceLog> => {
  if (!supabase) throw new Error("Cloud infrastructure not connected.");

  const payload: any = {};
  if (log.serviceType !== undefined) payload.service_type = log.serviceType;
  if (log.serviceDate !== undefined) payload.service_date = log.serviceDate;
  if (log.mileageAtService !== undefined) payload.mileage_at_service = log.mileageAtService;
  if (log.cost !== undefined) payload.cost = log.cost;
  if (log.notes !== undefined) payload.notes = log.notes;
  if (log.provider !== undefined) payload.provider = log.provider;
  if (log.category !== undefined) payload.category = log.category;
  if (log.verificationLevel !== undefined) payload.verification_level = log.verificationLevel;
  if (log.taskId !== undefined) payload.task_id = log.taskId;

  const { data, error } = await supabase
    .from('service_logs')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    taskId: data.task_id,
    serviceType: data.service_type,
    serviceDate: data.service_date,
    mileageAtService: parseFloat(data.mileage_at_service),
    cost: parseFloat(data.cost),
    notes: data.notes,
    provider: data.provider,
    category: data.category,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    verificationLevel: data.verification_level,
    receiptUrl: data.receipt_url
  };
};

export const deleteServiceLog = async (id: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('service_logs').delete().eq('id', id);
  if (error) throw error;
};
