
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../shared/types.ts';
import { getTaskMaintenanceStatus, calculateMetabolicStatus, calculateIntelligentHealth } from './maintenanceLogic.ts';

/**
 * PRODUCTION-GRADE RESALE VALUATION ENGINE
 * Translates technical telemetry into financial intelligence.
 */

interface ValuationBreakdown {
  baseValue: number;
  mileagePenalty: number;
  maintenanceDebt: number;
  trustPremium: number;
  mechanicalRiskPenalty: number;
  finalValue: number;
  potentialValue: number;
  marketGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
}

// Regional MSRP benchmarks (Nigeria Used Market Averages)
const BASE_MSRP_LOOKUP: Record<string, number> = {
  'toyota-camry': 18500000,
  'toyota-corolla': 14000000,
  'honda-accord': 16000000,
  'honda-civic': 12500000,
  'lexus-rx350': 28000000,
  'lexus-es350': 22000000,
  'mercedes-benz-c300': 32000000,
  'toyota-rav4': 19500000,
  'hyundai-elantra': 11000000,
  'toyota-hilux': 35000000,
  'range-rover-sport': 45000000,
};

export const calculateResaleValue = (
  vehicle: Vehicle,
  tasks: MaintenanceTask[],
  serviceLogs: ServiceLog[],
  fuelLogs: FuelLog[]
): ValuationBreakdown => {
  const currentYear = new Date().getFullYear();
  const age = Math.max(1, currentYear - vehicle.year);
  
  // 1. BASE MARKET VALUE (Exponential Depreciation)
  const key = `${vehicle.make.toLowerCase()}-${vehicle.model.toLowerCase()}`;
  const msrp = BASE_MSRP_LOOKUP[key] || 12000000;
  
  // High-resale brands (Toyota/Lexus) retain ~12% more value annually in the secondary market
  const isHighResaleBrand = ['toyota', 'lexus', 'honda'].includes(vehicle.make.toLowerCase());
  const depRate = isHighResaleBrand ? 0.88 : 0.82; 
  const baseValue = msrp * Math.pow(depRate, age);

  // 2. USAGE CORRECTION (Mileage Variance)
  // Region standard: 12,500km/year. Excess usage suggests commercial wear.
  const expectedMileage = age * 12500;
  const excessMileage = Math.max(0, vehicle.mileage - expectedMileage);
  const mileagePenalty = excessMileage * 125; // N125 per KM penalty

  // 3. MAINTENANCE DEBT (Direct & Risk-Based Deductions)
  const overdueTasks = tasks.filter(t => t.status === 'pending' && getTaskMaintenanceStatus(vehicle, t) === 'overdue');
  
  // Calculate direct cost debt
  let maintenanceDebt = overdueTasks.reduce((acc, t) => acc + (t.estimatedCost || 0), 0);
  
  // Add "Neglect Risk" penalties for critical pillars
  const criticalPillars = ['engine', 'fluids', 'brakes'];
  criticalPillars.forEach(pillar => {
    if (overdueTasks.some(t => t.category === pillar)) {
      maintenanceDebt += (baseValue * 0.04); // 4% flat penalty for "Critical Component Neglect"
    }
  });

  // 4. INTEGRITY PREMIUM (Weighted Trust Model)
  const verifiedLogs = serviceLogs.filter(l => l.verificationLevel === 'mechanic_verified' || l.verificationLevel === 'receipt_verified');
  let trustPremium = 0;

  verifiedLogs.forEach(log => {
    // Critical system verification provides 4x the value preservation of cosmetic records
    const isCritical = ['engine', 'fluids', 'drivetrain', 'brakes'].includes(log.category);
    const weight = isCritical ? 0.01 : 0.0025; 
    trustPremium += baseValue * weight;
  });
  
  // Cap premium at 20% of current value to avoid inflation
  trustPremium = Math.min(baseValue * 0.20, trustPremium);

  // 5. MECHANICAL RISK (Engine Metabolism Integration)
  const metabolism = calculateMetabolicStatus(vehicle, fuelLogs);
  let mechanicalRiskPenalty = 0;
  
  if (metabolism.status === 'critical') {
    mechanicalRiskPenalty = baseValue * 0.15; // Heavy 15% drop for efficiency failure (potential engine/fuel system wear)
  } else if (metabolism.status === 'warning') {
    mechanicalRiskPenalty = baseValue * 0.05; // 5% drop for "Warning" metabolic state
  }

  // 6. HEALTH SYNERGY (Vitality Integration)
  const health = calculateIntelligentHealth(vehicle, tasks, fuelLogs, serviceLogs);
  if (health.total < 50) {
    mechanicalRiskPenalty += baseValue * 0.10; // Extra "Poor Condition" penalty
  }

  const finalValue = Math.max(
    msrp * 0.15, // Scrap/Salvage Floor (15% of MSRP)
    baseValue - mileagePenalty - maintenanceDebt + trustPremium - mechanicalRiskPenalty
  );

  // Potential value: What it would be worth with a 100% Health Score
  const potentialValue = baseValue - mileagePenalty + (baseValue * 0.10);

  // 7. MARKET GRADING
  let marketGrade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'B';
  const ratio = finalValue / baseValue;

  if (health.total > 90 && ratio > 0.85) marketGrade = 'A+';
  else if (health.total > 75 && ratio > 0.75) marketGrade = 'A';
  else if (health.total > 50 || ratio > 0.50) marketGrade = 'B';
  else if (health.total > 30 || ratio > 0.30) marketGrade = 'C';
  else marketGrade = 'D';

  return {
    baseValue,
    mileagePenalty,
    maintenanceDebt,
    trustPremium,
    mechanicalRiskPenalty,
    finalValue: Math.round(finalValue),
    potentialValue: Math.round(potentialValue),
    marketGrade
  };
};
