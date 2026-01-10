
import { generateMaintenanceSchedule } from './geminiService.ts';
import { createVehicle, createMaintenanceTasksBatch } from './vehicleService.ts';
import { getCachedRoadmap, saveRoadmapTemplate } from './templateService.ts';
import { Vehicle, BodyType, MaintenanceScheduleResponse } from '../shared/types.ts';

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

  const savedVehicle = await createVehicle(payload);
  bootstrapIntelligence(savedVehicle);
  return savedVehicle;
};

async function bootstrapIntelligence(vehicle: Vehicle) {
  try {
    let roadmap = await getCachedRoadmap(vehicle.make, vehicle.model, vehicle.year);
    let isNewTemplate = false;

    if (!roadmap) {
      roadmap = await generateMaintenanceSchedule(vehicle.make, vehicle.model, vehicle.year, vehicle.mileage);
      isNewTemplate = true;
    }

    if (roadmap && roadmap.tasks) {
      await createMaintenanceTasksBatch(roadmap.tasks.map(t => ({
        ...t,
        vehicleId: vehicle.id,
        status: 'pending' as const,
        isDirty: false
      })));

      if (isNewTemplate && roadmap.summary !== "Standard regional maintenance protocol applied (AI Quota Sleep).") {
        saveRoadmapTemplate(vehicle.make, vehicle.model, vehicle.year, roadmap);
      }
    }
  } catch (e) {
    console.error("Non-critical Intelligence Bootstrap Failure:", e);
  }
}
