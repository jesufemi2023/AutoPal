
import { decodeVIN, generateMaintenanceSchedule } from './geminiService.ts';
import { createVehicle, createMaintenanceTasksBatch } from './vehicleService.ts';
import { Vehicle, BodyType } from '../shared/types.ts';

/**
 * Vehicle Registration Orchestrator
 * Handles the multi-step flow of creating a "Digital Twin".
 */
export const registerNewVehicle = async (
  userId: string,
  vin: string,
  manualData?: { make: string; model: string; year: number; bodyType: BodyType; mileage: number }
): Promise<Vehicle> => {
  let details: any;

  if (manualData) {
    details = manualData;
  } else {
    // Attempt AI-assisted registration
    details = await decodeVIN(vin);
    details.mileage = 0; // Default for new registration
  }

  const payload: Omit<Vehicle, 'id'> = {
    ownerId: userId,
    make: details.make,
    model: details.model,
    year: details.year,
    vin: vin || 'MANUAL-ENTRY',
    mileage: details.mileage,
    healthScore: 100,
    bodyType: details.bodyType,
    status: 'active',
    imageUrls: [],
    isDirty: false
  };

  const savedVehicle = await createVehicle(payload);

  // Background Task: Generate Initial Roadmap
  // Note: We don't await this to keep registration UI fast
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
