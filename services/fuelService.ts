
import { supabase } from '../auth/supabaseClient.ts';
import { FuelLog } from '../shared/types.ts';
import { localDb } from './localDb.ts';

/**
 * Fuel Intelligence Service (Local-First Implementation)
 */

export const fetchFuelLogs = async (vehicleId: string): Promise<FuelLog[]> => {
  // Always try local first
  const localLogs = await localDb.getFuelLogs(vehicleId);
  if (localLogs.length > 0) return localLogs;

  if (!supabase) return [];
  
  // Fallback to Cloud if local empty
  const { data, error } = await supabase
    .from('fuel_logs')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('odometer_km', { ascending: false });

  if (error) return [];
  
  const logs = (data || []).map(l => ({
    id: l.id,
    vehicleId: l.vehicle_id,
    liters: parseFloat(l.liters || '0'),
    totalCost: parseFloat(l.total_cost || '0'),
    odometerKm: parseInt(l.odometer_km || '0'),
    isFullTank: l.is_full_tank || false,
    vendor: l.vendor_brand,
    createdAt: l.captured_at || l.created_at,
    syncStatus: 'synced' as const
  }));

  // Populate local cache
  for (const log of logs) {
    await localDb.saveFuelLog(log);
  }

  return logs;
};

export const addFuelLog = async (log: Omit<FuelLog, 'id' | 'createdAt'>): Promise<FuelLog> => {
  const newLog: FuelLog = {
    ...log,
    id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    isDirty: true
  };

  // Immediate Local Save
  await localDb.saveFuelLog(newLog);
  return newLog;
};

export const updateFuelLog = async (logId: string, updates: Partial<FuelLog>): Promise<FuelLog> => {
  // Fix: Use getFuelLog method instead of accessing fuelLogs property directly
  const existing = await localDb.getFuelLog(logId);
  if (!existing) throw new Error("Record not found locally");

  const updated: FuelLog = {
    ...existing,
    ...updates,
    isDirty: true,
    syncStatus: 'pending'
  };

  await localDb.saveFuelLog(updated);
  return updated;
};

export const deleteFuelLog = async (logId: string): Promise<void> => {
  // Fix: Use deleteFuelLog method instead of accessing fuelLogs property directly
  await localDb.deleteFuelLog(logId);
  // Mark for cloud deletion (simplified for MVP: just delete cloud if possible)
  if (supabase && !logId.startsWith('local-')) {
    await supabase.from('fuel_logs').delete().eq('id', logId);
  }
};

/**
 * Existing Math logic (Unchanged as requested)
 */
export const calculateLastEfficiency = (logs: FuelLog[]): number | null => {
  if (logs.length < 2) return null;
  const sorted = [...logs].sort((a, b) => b.odometerKm - a.odometerKm);
  const currentFullIndex = sorted.findIndex(l => l.isFullTank);
  if (currentFullIndex === -1) return null;
  const prevFullIndex = sorted.slice(currentFullIndex + 1).findIndex(l => l.isFullTank);
  if (prevFullIndex === -1) return null;
  const actualPrevFullIndex = prevFullIndex + currentFullIndex + 1;
  const currentFull = sorted[currentFullIndex];
  const prevFull = sorted[actualPrevFullIndex];
  const distance = currentFull.odometerKm - prevFull.odometerKm;
  if (distance <= 0) return null;
  const logsInBlock = sorted.slice(currentFullIndex, actualPrevFullIndex);
  const totalLiters = logsInBlock.reduce((acc, l) => acc + l.liters, 0);
  return totalLiters > 0 ? distance / totalLiters : null;
};

export const calculateAverageEfficiency = (logs: FuelLog[]): number | null => {
  if (logs.length < 2) return null;
  const sorted = [...logs].sort((a, b) => b.odometerKm - a.odometerKm);
  const fullLogs = sorted.filter(l => l.isFullTank);
  if (fullLogs.length < 2) return null;
  const newestFull = fullLogs[0];
  const oldestFull = fullLogs[fullLogs.length - 1];
  const totalDistance = newestFull.odometerKm - oldestFull.odometerKm;
  if (totalDistance <= 0) return null;
  const startIndex = sorted.indexOf(newestFull);
  const endIndex = sorted.indexOf(oldestFull);
  const logsInGlobalBlock = sorted.slice(startIndex, endIndex);
  const totalLiters = logsInGlobalBlock.reduce((acc, l) => acc + l.liters, 0);
  return totalLiters > 0 ? totalDistance / totalLiters : null;
};