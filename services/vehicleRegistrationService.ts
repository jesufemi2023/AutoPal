
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
    isDirty: false
  };

  const savedVehicle = await createVehicle(payload);

  // Background Task: Generate Initial Roadmap localized to regional conditions
  generateMaintenanceSchedule(savedVehicle.make, savedVehicle.model, savedVehicle.year, savedVehicle.mileage)
    .then(roadmap => {
      return createMaintenanceTasksBatch(roadmap.tasks.map(t => ({
        ...t,
        vehicleId: savedVehicle.id,
        status: 'pending' as const,
        isDirty: false
      })));
    })
    .catch(e => console.error("Roadmap generation background error:", e));

  return savedVehicle;
};
