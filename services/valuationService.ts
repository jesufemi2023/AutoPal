
import { Vehicle, MaintenanceTask, ServiceLog, FuelLog, Priority } from '../shared/types.ts';
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

// Industry-standard base values for the Nigerian used car market (Jevon's/Autochek benchmarks)
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
  // Nigeria specific: Toyotas/Lexuses hold ~15% better value than luxury European counterparts
  const key = `${vehicle.make.toLowerCase()}-${vehicle.model.toLowerCase()}`;
  const msrp = BASE_MSRP_LOOKUP[key] || 12000000;
  
  const isHighResaleBrand = ['toyota', 'lexus', 'honda'].includes(vehicle.make.toLowerCase());
  const depRate = isHighResaleBrand ? 0.88 : 0.82; // 12% vs 18% annual drop
  const baseValue = msrp * Math.pow(depRate, age);

  // 2. MILEAGE VARIANCE
  // Region standard: 12,000km/year. Anything above is aggressive usage.
  const expectedMileage = age * 12000;
  const excessMileage = Math.max(0, vehicle.mileage - expectedMileage);
  // High penalty (₦150/km) for excess mileage as it indicates commercial/heavy use
  const mileagePenalty = excessMileage * 150;

  // 3. MAINTENANCE DEBT (Direct Deductions)
  // We don't just sum costs; we apply flat risk penalties for unmonitored critical pillars.
  const overdueTasks = tasks.filter(t => t.status === 'pending' && getTaskMaintenanceStatus(vehicle, t) === 'overdue');
  
  let maintenanceDebt = overdueTasks.reduce((acc, t) => acc + (t.estimatedCost || 0), 0);
  
  // Flat penalties for critical risks (Engine/Fluids/Brakes)
  const criticalPillars = ['engine', 'fluids', 'brakes'];
  criticalPillars.forEach(pillar => {
    const isPillarAtRisk = overdueTasks.some(t => t.category === pillar);
    if (isPillarAtRisk) {
      maintenanceDebt += (baseValue * 0.03); // 3% flat penalty for "Mechanical Neglect"
    }
  });

  // 4. INTEGRITY PREMIUM (Trust Building)
  // Verified records for Engine/Drivetrain are 3x more valuable than cosmetic logs.
  const verifiedLogs = serviceLogs.filter(l => l.verificationLevel === 'mechanic_verified' || l.verificationLevel === 'receipt_verified');
  
  let trustPremium = 0;
  verifiedLogs.forEach(log => {
    const isCritical = ['engine', 'fluids', 'drivetrain', 'brakes'].includes(log.category);
    const weight = isCritical ? 0.008 : 0.002; // 0.8% vs 0.2% value bump per verified log
    trustPremium += baseValue * weight;
  });
  
  // Cap premium at 15% of current value to keep it realistic
  trustPremium = Math.min(baseValue * 0.15, trustPremium);

  // 5. MECHANICAL RISK (Metabolism Link)
  // If the Vitality engine detects high fuel variance, we flag "Stealth Engine Wear"
  const metabolism = calculateMetabolicStatus(vehicle, fuelLogs);
  let mechanicalRiskPenalty = 0;
  
  if (metabolism.status === 'critical') {
    mechanicalRiskPenalty = baseValue * 0.12; // 12% drop for internal engine risk
  } else if (metabolism.status === 'warning') {
    mechanicalRiskPenalty = baseValue * 0.05; // 5% drop for efficiency loss
  }

  // 6. HEALTH SYNERGY
  // If the overall Health Score is below 50, the market value collapses due to "Project Car" status
  const health = calculateIntelligentHealth(vehicle, tasks, fuelLogs, serviceLogs);
  if (health.total < 50) {
    mechanicalRiskPenalty += baseValue * 0.10;
  }

  const finalValue = Math.max(
    msrp * 0.1, // Residual Scrap Value Floor (10% of MSRP)
    baseValue - mileagePenalty - maintenanceDebt + trustPremium - mechanicalRiskPenalty
  );

  // Potential value: What it would be with 100% Vitality
  const potentialValue = baseValue - mileagePenalty + (baseValue * 0.10); // Standard "Well-Maintained" premium

  // 7. MARKET GRADING
  let marketGrade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'B';
  const ratio = finalValue / baseValue;

  if (health.total > 90 && ratio > 0.85) marketGrade = 'A+';
  else if (health.total > 75 && ratio > 0.75) marketGrade = 'A';
  else if (health.total > 55 || ratio > 0.50) marketGrade = 'B';
  else if (health.total > 35 || ratio > 0.30) marketGrade = 'C';
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
