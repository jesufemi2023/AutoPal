
import { generateMaintenanceSchedule } from './geminiService.ts';
import { createVehicle, createMaintenanceTasksBatch } from './vehicleService.ts';
import { getCachedRoadmap, saveRoadmapTemplate } from './templateService.ts';
import { Vehicle, BodyType } from '../shared/types.ts';

/**
 * Vehicle Registration Orchestrator
 * Finalizes the creation of a vehicle's digital twin and bootstraps its intelligence.
 * Optimized for Scale: Uses templates first, falls back to AI, and never blocks registration.
 */
export const registerNewVehicle = async (
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
    specs?: {
      tireSize?: string;
      oilGrade?: string;
      batteryType?: string;
    }
  }
): Promise<Vehicle> => {
  
  const payload: Omit<Vehicle, 'id'> = {
    ownerId: userId,
    make: confirmedData.make,
    model: confirmedData.model,
    year: confirmedData.year,
    vin: vin || `MANUAL-${Date.now()}`,
    mileage: confirmedData.mileage,
    fuelType: confirmedData.fuelType,
    engineSize: confirmedData.engineSize,
    healthScore: 100,
    bodyType: confirmedData.bodyType,
    status: 'active',
    imageUrls: [],
    specs: confirmedData.specs || {},
    isDirty: false
  };

  // 1. Create the Vehicle Asset (MANDATORY STEP)
  const savedVehicle = await createVehicle(payload);

  /**
   * 2. Intelligence Bootstrap (NON-BLOCKING)
   * We try to get a roadmap, but we don't crash if it fails.
   */
  try {
    // Phase A: Check Template Factory ($0 Cost)
    let roadmap = await getCachedRoadmap(savedVehicle.make, savedVehicle.model, savedVehicle.year);
    let isNewTemplate = false;

    // Phase B: Call AI if missing (Quota Check)
    if (!roadmap) {
      roadmap = await generateMaintenanceSchedule(
        savedVehicle.make, 
        savedVehicle.model, 
        savedVehicle.year, 
        savedVehicle.mileage
      );
      isNewTemplate = true;
    }

    // Phase C: Apply Tasks
    if (roadmap && roadmap.tasks) {
      await createMaintenanceTasksBatch(roadmap.tasks.map(t => ({
        ...t,
        vehicleId: savedVehicle.id,
        status: 'pending' as const,
        isDirty: false
      })));

      // Phase D: Shared Intelligence ($0 for next 10,000 users)
      if (isNewTemplate) {
        saveRoadmapTemplate(savedVehicle.make, savedVehicle.model, savedVehicle.year, roadmap);
      }
    }
  } catch (e) {
    console.error("Non-critical Intelligence Bootstrap Failure:", e);
    // Silent fail - the user has their car, they can trigger a manual sync later.
  }

  return savedVehicle;
};
