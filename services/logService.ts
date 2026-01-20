
import { supabase } from '../auth/supabaseClient.ts';
import { ServiceLog } from '../shared/types.ts';
import { localDb } from './localDb.ts';

/**
 * Log Intelligence Service (Local-First Implementation)
 */

export const fetchServiceLogs = async (vehicleId: string): Promise<ServiceLog[]> => {
  const localLogs = await localDb.getLogs(vehicleId);
  if (localLogs.length > 0) return localLogs;

  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('service_logs')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('service_date', { ascending: false });

  if (error) return [];
  
  const logs = (data || []).map(row => ({
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
    receiptUrl: row.receipt_url,
    syncStatus: 'synced' as const
  }));

  for (const log of logs) {
    await localDb.saveLog(log);
  }

  return logs;
};

export const createServiceLog = async (log: Omit<ServiceLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceLog> => {
  const newLog: ServiceLog = {
    ...log,
    id: `local-svc-${Date.now()}`,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    isDirty: true
  };

  await localDb.saveLog(newLog);
  return newLog;
};

export const updateServiceLog = async (id: string, updates: Partial<ServiceLog>): Promise<ServiceLog> => {
  // Fix: Use getServiceLog method instead of accessing serviceLogs property directly
  const existing = await localDb.getServiceLog(id);
  if (!existing) throw new Error("Record not found locally");

  const updated: ServiceLog = {
    ...existing,
    ...updates,
    isDirty: true,
    syncStatus: 'pending'
  };

  await localDb.saveLog(updated);
  return updated;
};

export const deleteServiceLog = async (id: string): Promise<void> => {
  // Fix: Use deleteServiceLog method instead of accessing serviceLogs property directly
  await localDb.deleteServiceLog(id);
  if (supabase && !id.startsWith('local-')) {
    await supabase.from('service_logs').delete().eq('id', id);
  }
};