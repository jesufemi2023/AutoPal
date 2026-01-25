
import { generateMaintenanceSchedule } from './geminiService.ts';
import { createVehicle, createMaintenanceTasksBatch } from './vehicleService.ts';
import { getCachedRoadmap, saveRoadmapTemplate } from './templateService.ts';
import { Vehicle, BodyType, MaintenanceTask, Priority } from '../shared/types.ts';

/**
 * Vehicle Registration Orchestrator
 * Optimized for Scale: Uses templates first, falls back to AI.
 */

/** Phase 1: Create the core asset */
export const initializeVehicleAsset = async (
  userId: string,
  vin: string,
  confirmedData: { 
    make: string; 
    model: string; 
    year: number; 
    bodyType: BodyType; 
    mileage: number;
    fuelType?: string;
    engineSize?: string;
    specs?: any;
  }
): Promise<Vehicle> => {
  const payload: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'healthScore'> = {
    ownerId: userId,
    make: confirmedData.make,
    model: confirmedData.model,
    year: confirmedData.year,
    vin: vin || `MANUAL-${Date.now()}`,
    mileage: confirmedData.mileage,
    fuelType: confirmedData.fuelType,
    engineSize: confirmedData.engineSize,
    bodyType: confirmedData.bodyType,
    status: 'active',
    imageUrl: '',
    specs: confirmedData.specs || {},
    isDirty: false
  };

  return await createVehicle(payload);
};

/** Phase 2: Generate proposed tasks (Template -> AI) */
export const prepareProposedRoadmap = async (vehicle: Vehicle): Promise<{ tasks: Omit<MaintenanceTask, 'id'>[], isNewTemplate: boolean, rawRoadmap?: any }> => {
  try {
    let roadmap = await getCachedRoadmap(vehicle.make, vehicle.model, vehicle.year);
    let isNewTemplate = false;

    if (!roadmap) {
      roadmap = await generateMaintenanceSchedule(
        vehicle.make, 
        vehicle.model, 
        vehicle.year, 
        vehicle.mileage
      );
      isNewTemplate = true;
    }

    const tasks = roadmap.tasks.map(t => {
      // ARCHITECTURAL FIX: Odometer Normalization
      // We ignore the absolute 'dueMileage' from the template (which belonged to the first user).
      // We calculate a fresh 'dueMileage' relative to THIS vehicle's current odometer.
      const interval = t.intervalKm || 5000;
      const normalizedDueMileage = vehicle.mileage + interval;

      // Calculate a fresh 'dueDate' relative to today.
      const intervalMonths = t.intervalMonths || 6;
      const normalizedDueDate = new Date();
      normalizedDueDate.setMonth(normalizedDueDate.getMonth() + intervalMonths);

      return {
        ...t,
        vehicleId: vehicle.id,
        dueMileage: normalizedDueMileage,
        dueDate: normalizedDueDate.toISOString().split('T')[0],
        status: 'pending' as const,
        isDirty: false
      };
    });

    return { tasks, isNewTemplate, rawRoadmap: roadmap };
  } catch (e) {
    console.error("Roadmap generation failed, falling back to empty list", e);
    return { tasks: [], isNewTemplate: false };
  }
};

/** Phase 3: Commit the user-audited roadmap */
export const commitFinalRoadmap = async (vehicle: Vehicle, tasks: Omit<MaintenanceTask, 'id'>[], isNewTemplate: boolean, rawRoadmap?: any) => {
  // 1. Persist tasks to the local/cloud database
  await createMaintenanceTasksBatch(tasks);
  
  // 2. If this was a fresh AI generation, we cache it in the roadmap_templates table
  // to serve the next pilot of this car model without hitting the Gemini API.
  if (isNewTemplate && rawRoadmap) {
    try {
      await saveRoadmapTemplate(vehicle.make, vehicle.model, vehicle.year, rawRoadmap);
    } catch (cacheErr) {
      console.warn("Template Factory: Failed to store new model pattern.", cacheErr);
    }
  }
};
