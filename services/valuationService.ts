
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../shared/types.ts';
import { getTaskMaintenanceStatus } from './maintenanceLogic.ts';

/**
 * Resale Valuation Engine
 * Orchestrates Garage, Service, and Fuel telemetry into financial intelligence.
 */

interface ValuationBreakdown {
  baseValue: number;
  mileagePenalty: number;
  maintenanceDebt: number;
  trustPremium: number;
  efficiencyPenalty: number;
  finalValue: number;
  potentialValue: number;
}

// Estimated MSRP for common regional models (Nigeria Context)
const BASE_MSRP_LOOKUP: Record<string, number> = {
  'toyota-camry': 15000000,
  'toyota-corolla': 12000000,
  'honda-accord': 13000000,
  'honda-civic': 11000000,
  'lexus-rx350': 22000000,
  'lexus-es350': 18000000,
  'mercedes-benz-c300': 25000000,
  'toyota-rav4': 16000000,
  'hyundai-elantra': 9000000,
};

export const calculateResaleValue = (
  vehicle: Vehicle,
  tasks: MaintenanceTask[],
  serviceLogs: ServiceLog[],
  fuelLogs: FuelLog[]
): ValuationBreakdown => {
  const currentYear = new Date().getFullYear();
  const age = Math.max(1, currentYear - vehicle.year);
  
  // 1. Calculate Base Market Value (Depreciation)
  const key = `${vehicle.make.toLowerCase()}-${vehicle.model.toLowerCase()}`;
  const msrp = BASE_MSRP_LOOKUP[key] || 10000000; // Fallback to 10M
  
  // Standard 10% annual depreciation curve
  const baseValue = msrp * Math.pow(0.9, age);

  // 2. Mileage Penalty
  // Average is 15k km/year. Anything above that is a penalty.
  const expectedMileage = age * 15000;
  const excessMileage = Math.max(0, vehicle.mileage - expectedMileage);
  const mileagePenalty = excessMileage * 50; // N50 per KM penalty

  // 3. Maintenance Debt
  // Overdue items are a direct deduction for the next buyer.
  const maintenanceDebt = tasks
    .filter(t => t.status === 'pending' && getTaskMaintenanceStatus(vehicle, t) === 'overdue')
    .reduce((acc, t) => acc + (t.estimatedCost || 0), 0);

  // 4. Trust Premium (Provenance Score)
  // Reward verified records. 
  const verifiedCount = serviceLogs.filter(l => l.verificationLevel === 'mechanic_verified').length;
  const totalRecords = serviceLogs.length || 1;
  const trustRatio = verifiedCount / totalRecords;
  
  // Max +15% premium for 100% verified records
  const trustPremium = baseValue * (trustRatio * 0.15);

  // 5. Fuel Efficiency Proxy (Engine Health)
  // If we have fuel logs, we check for consistency. (Simplified for MVP)
  const efficiencyPenalty = fuelLogs.length > 10 ? baseValue * 0.02 : 0; 

  const finalValue = Math.max(
    baseValue * 0.2, // Residual value floor (20%)
    baseValue - mileagePenalty - maintenanceDebt + trustPremium - efficiencyPenalty
  );

  // Potential value if all maintenance debt was cleared
  const potentialValue = baseValue - mileagePenalty + trustPremium;

  return {
    baseValue,
    mileagePenalty,
    maintenanceDebt,
    trustPremium,
    efficiencyPenalty,
    finalValue: Math.round(finalValue),
    potentialValue: Math.round(potentialValue)
  };
};
