
import { generateMaintenanceSchedule } from './geminiService.ts';
import { createVehicle, createMaintenanceTasksBatch } from './vehicleService.ts';
import { Vehicle, BodyType } from '../shared/types.ts';

/**
 * Vehicle Registration Orchestrator
 * Finalizes the creation of a vehicle's digital twin and bootstraps its intelligence.
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

  // 1. Create the Vehicle Asset
  const savedVehicle = await createVehicle(payload);

  // 2. Generate Initial Roadmap (Awaited for UI feedback and atomicity)
  try {
    const roadmap = await generateMaintenanceSchedule(
      savedVehicle.make, 
      savedVehicle.model, 
      savedVehicle.year, 
      savedVehicle.mileage
    );

    if (roadmap && roadmap.tasks) {
      await createMaintenanceTasksBatch(roadmap.tasks.map(t => ({
        ...t,
        vehicleId: savedVehicle.id,
        status: 'pending' as const,
        isDirty: false
      })));
    }
  } catch (e) {
    console.error("Roadmap generation failed during registration:", e);
    // We throw the error so the UI (AssetIntelligenceCenter) can report the failure to the user.
    // The vehicle record still exists, but the user is informed that intelligence bootstrap failed.
    throw new Error(`Vehicle registered, but roadmap generation failed: ${e instanceof Error ? e.message : 'Unknown AI Error'}`);
  }

  return savedVehicle;
};
