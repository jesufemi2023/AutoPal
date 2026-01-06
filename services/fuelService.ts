
import { supabase } from '../auth/supabaseClient.ts';
import { FuelLog } from '../shared/types.ts';

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

export const addFuelLog = async (log: Omit<FuelLog, 'id' | 'createdAt'>): Promise<FuelLog> => {
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

/**
 * Client-Side JIT Calculation
 * Uses the "Full-to-Full" method for high accuracy.
 * Efficiency (KM/L) = Distance since last full tank / Liters added now
 */
export const calculateLastEfficiency = (logs: FuelLog[]): number | null => {
  if (logs.length < 2) return null;

  // We need the most recent log (the one that filled the tank)
  // and the previous log that also filled the tank.
  const sortedLogs = [...logs].sort((a, b) => b.odometerKm - a.odometerKm);
  
  const currentRefill = sortedLogs[0];
  if (!currentRefill.isFullTank) return null;

  // Find the previous "Full" log
  const previousFull = sortedLogs.slice(1).find(l => l.isFullTank);
  if (!previousFull) return null;

  const distance = currentRefill.odometerKm - previousFull.odometerKm;
  if (distance <= 0) return null;

  // Consumption for this distance is what we just put in to make it full again
  return distance / currentRefill.liters;
};

/**
 * Average Efficiency across historical logs
 */
export const calculateAverageEfficiency = (logs: FuelLog[]): number | null => {
  const sorted = [...logs].sort((a, b) => b.odometerKm - a.odometerKm);
  const fullLogs = sorted.filter(l => l.isFullTank);
  
  if (fullLogs.length < 2) return null;

  const newest = fullLogs[0];
  const oldest = fullLogs[fullLogs.length - 1];
  
  const totalDistance = newest.odometerKm - oldest.odometerKm;
  if (totalDistance <= 0) return null;

  // Total liters consumed between the first and last full tank
  // (We don't include the oldest refill's liters because those were for a previous trip)
  const totalLiters = fullLogs.slice(0, -1).reduce((acc, l) => acc + l.liters, 0);
  
  return totalDistance / totalLiters;
};
