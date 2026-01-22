import { localDb } from './localDb.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { FuelLog, ServiceLog, Vehicle, MaintenanceTask } from '../shared/types.ts';

/**
 * Sync Engine v2
 * Handles the "Local-Master to Cloud-Mirror" synchronization with ID reconciliation.
 */

export const performPushSync = async () => {
  if (!supabase) return { status: 'offline' };
  
  // 1. SYNC VEHICLES FIRST (The Parent Assets)
  const dirtyVehicles = await localDb.getDirtyRecords().then(r => r.vehicles);
  
  for (const v of dirtyVehicles) {
    try {
      const isLocalId = v.id.startsWith('local-');
      
      const payload: any = {
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
      };

      // If it's an update to an existing cloud record, include the ID
      if (!isLocalId) payload.id = v.id;

      const { data, error } = await supabase
        .from('vehicles')
        .upsert(payload)
        .select()
        .single();

      if (!error && data) {
        if (isLocalId) {
          // ID RECONCILIATION: We have a new cloud UUID. 
          // We must update all local records referencing the old local ID.
          const oldId = v.id;
          const newId = data.id;

          console.log(`SyncEngine: Reconciling ID ${oldId} -> ${newId}`);

          // Update child records in Local DB to point to new cloud UUID
          const [tasks, logs, fuel] = await Promise.all([
            localDb.getTasks(oldId),
            localDb.getLogs(oldId),
            localDb.getFuelLogs(oldId)
          ]);

          for (const t of tasks) await localDb.saveTask({ ...t, vehicleId: newId, isDirty: true });
          for (const l of logs) await localDb.saveLog({ ...l, vehicleId: newId, isDirty: true });
          for (const f of fuel) await localDb.saveFuelLog({ ...f, vehicleId: newId, isDirty: true });

          // Swap the vehicle record itself
          await localDb.deleteVehicle(oldId);
        }
        
        // Save/Update local record with cloud-state
        await localDb.saveVehicle({
          ...v,
          id: data.id,
          isDirty: false,
          syncStatus: 'synced'
        });
      }
    } catch (e) { console.warn("Vehicle Sync Fail", e); }
  }

  // RE-FETCH DIRTY AFTER VEHICLE ID RECONCILIATION
  const { tasks, logs, fuel } = await localDb.getDirtyRecords();

  // 2. Sync Maintenance Tasks
  for (const t of tasks) {
    try {
      const isLocalId = t.id.startsWith('local-');
      const payload: any = {
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
      };

      if (!isLocalId) payload.id = t.id;

      const { data, error } = await supabase.from('maintenance_tasks').upsert(payload).select().single();
      if (!error && data) {
        if (isLocalId) await (localDb as any).db.tasks.delete(t.id);
        await localDb.saveTask({ ...t, id: data.id, isDirty: false, syncStatus: 'synced' });
      }
    } catch (e) { console.warn("Task Sync Fail", e); }
  }

  // 3. Sync Fuel Logs
  for (const f of fuel) {
    try {
      const isLocalId = f.id.startsWith('local-');
      const payload: any = {
        vehicle_id: f.vehicleId,
        liters: f.liters,
        total_cost: f.totalCost,
        odometer_km: f.odometerKm,
        is_full_tank: f.isFullTank,
        vendor_brand: f.vendor,
        captured_at: f.createdAt
      };

      if (!isLocalId) payload.id = f.id;

      const { data, error } = await supabase.from('fuel_logs').upsert(payload).select().single();
      if (!error && data) {
        if (isLocalId) await localDb.deleteFuelLog(f.id);
        await localDb.saveFuelLog({ ...f, id: data.id, isDirty: false, syncStatus: 'synced' });
      }
    } catch (e) { console.warn("Fuel Sync Fail", e); }
  }

  // 4. Sync Service Logs
  for (const l of logs) {
    try {
      const isLocalId = l.id.startsWith('local-');
      const payload: any = {
        vehicle_id: l.vehicleId,
        task_id: l.taskId && !l.taskId.startsWith('local-') ? l.taskId : undefined,
        service_type: l.serviceType,
        service_date: l.serviceDate,
        mileage_at_service: l.mileageAtService,
        cost: l.cost,
        notes: l.notes,
        provider: l.provider,
        category: l.category,
        verification_level: l.verificationLevel,
        receipt_url: l.receiptUrl
      };

      if (!isLocalId) payload.id = l.id;

      const { data, error } = await supabase.from('service_logs').upsert(payload).select().single();
      if (!error && data) {
        if (isLocalId) await localDb.deleteServiceLog(l.id);
        await localDb.saveLog({ ...l, id: data.id, isDirty: false, syncStatus: 'synced' });
      }
    } catch (e) { console.warn("Service Sync Fail", e); }
  }

  const finalDirty = await localDb.getDirtyRecords();
  return { 
    status: 'success', 
    remaining: finalDirty.vehicles.length + finalDirty.tasks.length + finalDirty.logs.length + finalDirty.fuel.length 
  };
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
        latestAiAudit: v.latestAiAudit,
        syncStatus: 'synced',
        isDirty: false
      });
    }
  }
};
