
import { localDb } from './localDb.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { FuelLog, ServiceLog, Vehicle, MaintenanceTask } from '../shared/types.ts';

/**
 * Sync Engine
 * Orchestrates the "Local-Master to Cloud-Mirror" synchronization.
 * Purely manual trigger for MVP.
 */

export const performPushSync = async () => {
  if (!supabase) return { status: 'offline' };
  
  const { vehicles, tasks, logs, fuel } = await localDb.getDirtyRecords();
  const total = vehicles.length + tasks.length + logs.length + fuel.length;
  
  if (total === 0) return { status: 'idle' };

  console.log(`SyncEngine: Pushing ${total} dirty records to vault...`);

  // 1. Sync Vehicles
  for (const v of vehicles) {
    try {
      const payload = { ...v };
      delete payload.isDirty;
      delete payload.syncStatus;
      
      const { error } = await supabase.from('vehicles').upsert({
        id: v.id,
        owner_id: v.ownerId,
        make: v.make,
        model: v.model,
        year: v.year,
        vin: v.vin,
        current_mileage: v.mileage,
        health_score: v.healthScore,
        body_type: v.bodyType,
        image_url: v.imageUrl,
        status: v.status,
        specs: v.specs,
        fuel_type: v.fuelType,
        engine_size: v.engineSize,
        avg_daily_km: v.avgDailyKm,
        latest_ai_audit: v.latestAiAudit
      });

      if (!error) await localDb.markSynced(v.id, 'vehicles');
    } catch (e) { console.warn("Vehicle Sync Fail", e); }
  }

  // 2. Sync Maintenance Tasks
  for (const t of tasks) {
    try {
      const { error } = await supabase.from('maintenance_tasks').upsert({
        id: t.id,
        vehicle_id: t.vehicleId,
        title: t.title,
        description: t.description,
        due_mileage: t.dueMileage,
        due_date: t.dueDate,
        status: t.status,
        priority: t.priority,
        category: t.category,
        estimated_cost: t.estimatedCost,
        interval_km: t.intervalKm,
        interval_months: t.intervalMonths
      });
      if (!error) await localDb.markSynced(t.id, 'tasks');
    } catch (e) { console.warn("Task Sync Fail", e); }
  }

  // 3. Sync Fuel Logs
  for (const f of fuel) {
    try {
      const { error } = await supabase.from('fuel_logs').upsert({
        id: f.id,
        vehicle_id: f.vehicleId,
        liters: f.liters,
        total_cost: f.totalCost,
        odometer_km: f.odometerKm,
        is_full_tank: f.isFullTank,
        vendor_brand: f.vendor,
        captured_at: f.createdAt
      });
      if (!error) await localDb.markSynced(f.id, 'fuelLogs');
    } catch (e) { console.warn("Fuel Sync Fail", e); }
  }

  // 4. Sync Service Logs
  for (const l of logs) {
    try {
      const { error } = await supabase.from('service_logs').upsert({
        id: l.id,
        vehicle_id: l.vehicleId,
        task_id: l.taskId,
        service_type: l.serviceType,
        service_date: l.serviceDate,
        mileage_at_service: l.mileageAtService,
        cost: l.cost,
        notes: l.notes,
        provider: l.provider,
        category: l.category,
        verification_level: l.verificationLevel,
        receipt_url: l.receiptUrl
      });
      if (!error) await localDb.markSynced(l.id, 'serviceLogs');
    } catch (e) { console.warn("Service Sync Fail", e); }
  }

  return { status: 'success', pushed: total };
};

export const performPullSync = async (userId: string) => {
  if (!supabase) return;
  console.log("SyncEngine: Force pulling cloud master...");
  
  const { data: vData } = await supabase.from('vehicles').select('*').eq('owner_id', userId).eq('status', 'active');
  if (vData) {
    for (const v of vData) {
      await localDb.saveVehicle({
        id: v.id,
        ownerId: v.owner_id,
        make: v.make,
        model: v.model,
        year: v.year,
        vin: v.vin,
        mileage: parseFloat(v.current_mileage || '0'),
        healthScore: v.health_score || 100,
        bodyType: v.body_type,
        imageUrl: v.image_url,
        status: v.status,
        specs: v.specs || {},
        fuelType: v.fuel_type,
        engineSize: v.engine_size,
        avgDailyKm: v.avg_daily_km,
        latestAiAudit: v.latest_ai_audit,
        syncStatus: 'synced',
        isDirty: false
      });
    }
  }
};
