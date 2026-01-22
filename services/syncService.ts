import { localDb } from './localDb.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { updateVehicle, updateTaskStatus } from './vehicleService.ts';
import { FuelLog, ServiceLog, Vehicle, MaintenanceTask } from '../shared/types.ts';

/**
 * Sync Engine
 * Orchestrates the "Local-Master to Cloud-Mirror" synchronization.
 */

export const performPushSync = async () => {
  if (!supabase) return { status: 'offline' };
  
  const { data: { session } } = await supabase.auth.getSession();
  const activeUid = session?.user?.id;

  const { vehicles, tasks, logs, fuel } = await localDb.getDirtyRecords();
  const total = vehicles.length + tasks.length + logs.length + fuel.length;
  
  if (total === 0) return { status: 'idle' };

  let firstError: string | null = null;

  // 1. Sync Vehicles
  for (const v of vehicles) {
    try {
      let finalOwnerId = v.ownerId;
      if (activeUid && (v.ownerId === 'guest' || !v.ownerId)) {
        finalOwnerId = activeUid;
      }

      // Stripping local ID for new records to satisfy UUID constraint
      const isLocalId = v.id.startsWith('local-');
      
      const { data, error } = await supabase.from('vehicles').upsert({
        id: isLocalId ? undefined : v.id,
        owner_id: finalOwnerId,
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
      }).select().single();

      if (error) {
        console.error(`SyncEngine: Vehicle Rejection [${error.code}]: ${error.message}`);
        if (error.message.includes('QUOTA_EXHAUSTED')) firstError = 'QUOTA_EXHAUSTED';
        continue; 
      }

      // If ID changed (cloud UUID assigned), we must update local records to match
      if (isLocalId && data) {
        await localDb.deleteVehicle(v.id);
        await localDb.saveVehicle({ ...v, id: data.id, ownerId: finalOwnerId, isDirty: false, syncStatus: 'synced' });
        // NOTE: In a full prod app, we'd also update all child records in localDb to point to the new data.id
      } else {
        await localDb.markSynced(v.id, 'vehicles');
      }
    } catch (e) { console.warn("Vehicle Sync Fault", e); }
  }

  // 2. Sync Maintenance Tasks
  for (const t of tasks) {
    try {
      const isLocalId = t.id.startsWith('local-');
      const { data, error } = await supabase.from('maintenance_tasks').upsert({
        id: isLocalId ? undefined : t.id,
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
      }).select().single();

      if (error) {
        console.error(`SyncEngine: Task Rejection [${error.code}]: ${error.message}`);
        continue;
      }

      if (isLocalId && data) {
        // Correcting local ID to match cloud UUID
        const { id: oldId } = t;
        const updatedTask = { ...t, id: data.id, isDirty: false, syncStatus: 'synced' };
        // Delete old indexed record and save new one
        const dbInstance = (await import('./localDb.ts')).default;
        await dbInstance.tasks.delete(oldId);
        await dbInstance.tasks.put(updatedTask);
      } else {
        await localDb.markSynced(t.id, 'tasks');
      }
    } catch (e) { console.warn("Task Sync Fault", e); }
  }

  // 3. Sync Fuel Logs
  for (const f of fuel) {
    try {
      const { error } = await supabase.from('fuel_logs').upsert({
        id: f.id.startsWith('local-') ? undefined : f.id, 
        vehicle_id: f.vehicleId,
        liters: f.liters,
        total_cost: f.totalCost,
        odometer_km: f.odometerKm,
        is_full_tank: f.isFullTank,
        vendor_brand: f.vendor,
        captured_at: f.createdAt
      });
      if (error) {
        console.error(`SyncEngine: Fuel Log Rejection [${error.code}]: ${error.message}`);
        if (error.message.includes('QUOTA_EXHAUSTED')) firstError = 'QUOTA_EXHAUSTED';
        continue;
      }
      await localDb.markSynced(f.id, 'fuelLogs');
    } catch (e) { console.warn("Fuel Sync Fault", e); }
  }

  // 4. Sync Service Logs
  for (const l of logs) {
    try {
      const { error } = await supabase.from('service_logs').upsert({
        id: l.id.startsWith('local-') ? undefined : l.id,
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
      if (error) {
        console.error(`SyncEngine: Service Log Rejection [${error.code}]: ${error.message}`);
        if (error.message.includes('QUOTA_EXHAUSTED')) firstError = 'QUOTA_EXHAUSTED';
        continue;
      }
      await localDb.markSynced(l.id, 'serviceLogs');
    } catch (e) { console.warn("Service Sync Fault", e); }
  }

  return { status: firstError ? 'error' : 'success', pushed: total, error: firstError };
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