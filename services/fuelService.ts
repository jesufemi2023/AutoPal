import { supabase } from '../auth/supabaseClient.ts';
import { FuelLog } from '../shared/types.ts';

/**
 * Fuel Intelligence Service
 * Handles data entry and efficiency telemetry.
 */

export const fetchFuelLogs = async (vehicleId: string): Promise<FuelLog[]> => {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('fuel_logs')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(l => ({
    id: l.id,
    vehicleId: l.vehicle_id,
    liters: parseFloat(l.liters),
    cost: parseFloat(l.cost),
    odometerKm: parseFloat(l.odometer_km),
    createdAt: l.created_at
  }));
};

export const addFuelLog = async (log: Omit<FuelLog, 'id' | 'createdAt'>): Promise<FuelLog> => {
  if (!supabase) throw new Error("Supabase not configured");
  
  const { data, error } = await supabase
    .from('fuel_logs')
    .insert([{
      vehicle_id: log.vehicleId,
      liters: log.liters,
      cost: log.cost,
      odometer_km: log.odometerKm
    }])
    .select()
    .single();

  if (error) throw error;
  
  // Logic Note: After adding a fuel log, we should update the vehicle current_mileage.
  // This is handled in the UI/Store orchestrator to maintain rule 1 (offline-first logic).
  
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    liters: parseFloat(data.liters),
    cost: parseFloat(data.cost),
    odometerKm: parseFloat(data.odometer_km),
    createdAt: data.created_at
  };
};

/**
 * Calculates KM/L efficiency between the two most recent logs.
 */
export const calculateEfficiency = (logs: FuelLog[]): number | null => {
  if (logs.length < 2) return null;
  
  const latest = logs[0];
  const previous = logs[1];
  
  const distance = latest.odometerKm - previous.odometerKm;
  if (distance <= 0) return null;
  
  return distance / latest.liters;
};
