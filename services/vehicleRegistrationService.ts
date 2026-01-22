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
    isDirty: true,
    syncStatus: 'pending'
  };

  return await createVehicle(payload);
};

/** Phase 2: Generate proposed tasks (Template -> AI) */
export const prepareProposedRoadmap = async (vehicle: Vehicle): Promise<{ tasks: Omit<MaintenanceTask, 'id'>[], isNewTemplate: boolean }> => {
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

    const tasks = roadmap.tasks.map(t => ({
      ...t,
      vehicleId: vehicle.id,
      status: 'pending' as const,
      isDirty: true,
      syncStatus: 'pending' as const
    }));

    return { tasks, isNewTemplate };
  } catch (e) {
    console.error("Roadmap generation failed, falling back to empty list", e);
    return { tasks: [], isNewTemplate: false };
  }
};

/** Phase 3: Commit the user-audited roadmap */
export const commitFinalRoadmap = async (vehicle: Vehicle, tasks: Omit<MaintenanceTask, 'id'>[], isNewTemplate: boolean) => {
  await createMaintenanceTasksBatch(tasks);
  
  // If this was a fresh AI generation, we cache it for the next user of this car model
  if (isNewTemplate && tasks.length > 0) {
    // Logic to save as template could be added here
  }
};
