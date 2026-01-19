
import { supabase } from '../auth/supabaseClient.ts';
import { FuelLog, UserProfile } from '../shared/types.ts';
import { QUOTAS } from './permissionService.ts';

/**
 * Fuel Intelligence Service
 * Handles data entry, retrieval, and JIT efficiency calculations.
 */

const handleSupabaseError = (error: any, context: string) => {
  console.error(`Supabase Error [${context}]:`, error);
  throw error;
};

export const fetchFuelLogs = async (vehicleId: string): Promise<FuelLog[]> => {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('fuel_logs')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('odometer_km', { ascending: false });

  if (error) handleSupabaseError(error, 'fetchFuelLogs');
  
  return (data || []).map(l => ({
    id: l.id,
    vehicleId: l.vehicle_id,
    liters: parseFloat(l.liters || '0'),
    totalCost: parseFloat(l.total_cost || '0'),
    odometerKm: parseInt(l.odometer_km || '0'),
    isFullTank: l.is_full_tank || false,
    vendor: l.vendor_brand,
    createdAt: l.captured_at || l.created_at
  }));
};

export const addFuelLog = async (log: Omit<FuelLog, 'id' | 'createdAt'>, user: UserProfile): Promise<FuelLog> => {
  // Check Cloud Sync eligibility
  if (!QUOTAS[user.tier].isCloudSynced) {
    console.log("[AutoPal NG] Local-Only Fuel Entry (Free Tier)");
    return {
      ...log,
      id: `LOCAL-${Date.now()}`,
      createdAt: new Date().toISOString()
    } as FuelLog;
  }

  if (!supabase) throw new Error("Cloud infrastructure not connected.");
  
  const { data, error } = await supabase
    .from('fuel_logs')
    .insert([{
      vehicle_id: log.vehicleId,
      liters: log.liters,
      total_cost: log.totalCost,
      odometer_km: log.odometerKm,
      is_full_tank: log.isFullTank,
      vendor_brand: log.vendor
    }])
    .select()
    .single();

  if (error) handleSupabaseError(error, 'addFuelLog');
  
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    liters: parseFloat(data.liters),
    totalCost: parseFloat(data.total_cost),
    odometerKm: parseInt(data.odometer_km),
    isFullTank: data.is_full_tank,
    vendor: data.vendor_brand,
    createdAt: data.captured_at || data.created_at
  };
};

export const updateFuelLog = async (logId: string, log: Partial<FuelLog>, user: UserProfile): Promise<FuelLog> => {
  if (!QUOTAS[user.tier].isCloudSynced) {
    return { ...log, id: logId } as FuelLog;
  }

  if (!supabase) throw new Error("Cloud infrastructure not connected.");

  const payload: any = {};
  if (log.liters !== undefined) payload.liters = log.liters;
  if (log.totalCost !== undefined) payload.total_cost = log.totalCost;
  if (log.odometerKm !== undefined) payload.odometer_km = log.odometerKm;
  if (log.isFullTank !== undefined) payload.is_full_tank = log.isFullTank;
  if (log.vendor !== undefined) payload.vendor_brand = log.vendor;

  const { data, error } = await supabase
    .from('fuel_logs')
    .update(payload)
    .eq('id', logId)
    .select()
    .single();

  if (error) handleSupabaseError(error, 'updateFuelLog');

  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    liters: parseFloat(data.liters),
    totalCost: parseFloat(data.total_cost),
    odometerKm: parseInt(data.odometer_km),
    isFullTank: data.is_full_tank,
    vendor: data.vendor_brand,
    createdAt: data.captured_at || data.created_at
  };
};

export const deleteFuelLog = async (logId: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('fuel_logs').delete().eq('id', logId);
  if (error) throw error;
};

/**
 * Client-Side JIT Calculation
 * Uses the "Full-to-Full" method with Cumulative Refill support.
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
  // Fix: corrected typo actualPrevPrevFullIndex to actualPrevFullIndex
  const prevFull = sorted[actualPrevFullIndex];

  const distance = currentFull.odometerKm - prevFull.odometerKm;
  if (distance <= 0) return null;

  const logsInBlock = sorted.slice(currentFullIndex, actualPrevFullIndex);
  const totalLiters = logsInBlock.reduce((acc, l) => acc + l.liters, 0);

  return totalLiters > 0 ? distance / totalLiters : null;
};

/**
 * Average Efficiency across historical logs using the Global Anchor method.
 */
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
