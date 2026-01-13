
import { Vehicle, MaintenanceTask, ServiceLog, Priority, ServiceCategory, FuelLog, HealthBreakdown } from '../shared/types.ts';

/**
 * GENETIC ANCHORS
 * Ideal KM/L baselines for vehicle classes under normal conditions.
 */
const GENETIC_BASELINES: Record<string, number> = {
  'sedan': 12.5,
  'hatchback': 14.0,
  'suv': 8.5,
  'van': 7.5,
  'truck': 6.5,
  'coupe': 10.0,
  'other': 9.0
};

const REGIONAL_STRESS_FACTOR = 1.2; // Nigerian heat/roads

/**
 * PILLAR WEIGHTING (Refined for NG Architecture)
 * Critical systems impact the score more heavily than secondary ones.
 */
const PRIMARY_PILLARS: ServiceCategory[] = ['engine', 'fluids', 'brakes', 'cooling'];
const SECONDARY_PILLARS: ServiceCategory[] = ['tires', 'suspension', 'electrical', 'other'];

/**
 * VELOCITY ENGINE
 */
export const calculateAverageDailyKm = (fuelLogs: FuelLog[], serviceLogs: ServiceLog[]): number => {
  const allLogs = [
    ...fuelLogs.map(l => ({ odo: l.odometerKm, date: new Date(l.createdAt) })),
    ...serviceLogs.map(l => ({ odo: l.mileageAtService, date: new Date(l.serviceDate) }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  if (allLogs.length < 2) return 35;

  const oldest = allLogs[0];
  const newest = allLogs[allLogs.length - 1];
  
  const distance = newest.odo - oldest.odo;
  const days = Math.max(1, (newest.date.getTime() - oldest.date.getTime()) / (1000 * 60 * 60 * 24));

  return Math.max(5, Math.min(400, distance / days));
};

/**
 * METABOLIC ENGINE (40% Weight)
 * Measures real-world fuel conversion efficiency against genetic baselines.
 */
export const calculateMetabolicStatus = (vehicle: Vehicle, fuelLogs: FuelLog[]): { score: number, status: 'optimal' | 'warning' | 'critical', waste: number, variance: number, isCalibrating: boolean } => {
  if (fuelLogs.length < 3) {
    return { score: 100, status: 'optimal', waste: 0, variance: 0, isCalibrating: true };
  }

  const sorted = [...fuelLogs].sort((a, b) => b.odometerKm - a.odometerKm);
  const fullLogs = sorted.filter(l => l.isFullTank);
  if (fullLogs.length < 2) return { score: 100, status: 'optimal', waste: 0, variance: 0, isCalibrating: true };

  const recent = fullLogs[0];
  const prev = fullLogs[1];
  const dist = recent.odometerKm - prev.odometerKm;
  
  const startIndex = sorted.indexOf(recent);
  const endIndex = sorted.indexOf(prev);
  const liters = sorted.slice(startIndex, endIndex).reduce((acc, l) => acc + l.liters, 0);
  
  const currentKml = liters > 0 ? dist / liters : 0;
  const factorySpec = GENETIC_BASELINES[vehicle.bodyType] || 10;
  
  // Traffic Normalizer: Low daily mileage suggests heavy traffic, relax efficiency baseline.
  const isHeavyTrafficUser = (vehicle.avgDailyKm || 35) < 20;
  const tolerance = isHeavyTrafficUser ? 0.30 : 0.10;

  const variance = (factorySpec - currentKml) / factorySpec;
  
  let score = 100;
  let status: 'optimal' | 'warning' | 'critical' = 'optimal';

  if (variance > (tolerance + 0.15)) {
    score = 40;
    status = 'critical';
  } else if (variance > tolerance) {
    score = 75;
    status = 'warning';
  }

  const idealFuelNeeded = 500 / factorySpec;
  const actualFuelNeeded = 500 / (currentKml || factorySpec);
  const waste = Math.max(0, (actualFuelNeeded - idealFuelNeeded) * 800);

  return { score, status, waste, variance: Math.round(variance * 100), isCalibrating: false };
};

/**
 * REFINED ASSET VITALITY SCORE (The NG Engine)
 * Translates multi-pillar telemetry into a singular health index.
 */
export const calculateIntelligentHealth = (
  vehicle: Vehicle, 
  tasks: MaintenanceTask[], 
  fuelLogs: FuelLog[],
  serviceLogs: ServiceLog[]
): { total: number, breakdown: HealthBreakdown & { isCalibrating: boolean } } => {
  
  const vehicleTasks = tasks.filter(t => t.vehicleId === vehicle.id);
  const vehicleFuel = fuelLogs.filter(l => l.vehicleId === vehicle.id);
  const vehicleService = serviceLogs.filter(l => l.vehicleId === vehicle.id);

  // 1. METABOLISM (40%)
  const metabolism = calculateMetabolicStatus(vehicle, vehicleFuel);

  // 2. HYGIENE (40%) - Weighted Pillar Adherence
  const pillarStatus: Record<string, boolean> = {};
  const allCategories: ServiceCategory[] = [...PRIMARY_PILLARS, ...SECONDARY_PILLARS];
  
  allCategories.forEach(cat => {
    const catTasks = vehicleTasks.filter(t => t.category === cat);
    if (catTasks.length === 0) {
      pillarStatus[cat] = true; // Assume healthy if no tasks defined (NG refinement: should be 'unknown')
      return;
    }
    const isOverdue = catTasks.some(t => t.status === 'pending' && getTaskMaintenanceStatus(vehicle, t) === 'overdue');
    pillarStatus[cat] = !isOverdue;
  });

  // Calculate weighted Hygiene Score
  const primaryHealthy = PRIMARY_PILLARS.filter(p => pillarStatus[p]).length;
  const secondaryHealthy = SECONDARY_PILLARS.filter(p => pillarStatus[p]).length;
  
  const primaryScore = (primaryHealthy / PRIMARY_PILLARS.length) * 100;
  const secondaryScore = (secondaryHealthy / SECONDARY_PILLARS.length) * 100;
  
  // Hygiene is 75% Primary, 25% Secondary
  let hygieneScore = (primaryScore * 0.75) + (secondaryScore * 0.25);

  // --- SYNERGY PENALTIES (The Intelligence Layer) ---
  
  // A. The "Thermal Trap": Cooling + Fluids overdue = High Risk
  if (!pillarStatus['cooling'] && !pillarStatus['fluids']) {
    hygieneScore *= 0.70; 
  }

  // B. The "Metabolic Cross-Check": Engine healthy but Metabolism Critical
  // This detects "Hidden Faults" where logs claim service but car performs poorly.
  if (pillarStatus['engine'] && metabolism.status === 'critical') {
    hygieneScore *= 0.75; 
  }

  // C. The "Safety Cascade": Brakes + Tires overdue
  let safetyMultiplier = 1.0;
  if (!pillarStatus['brakes'] && !pillarStatus['tires']) {
    safetyMultiplier = 0.80; 
  }

  // 3. PROVENANCE (20%) - History Veracity & Trust
  let provenanceScore = 40; // Default low-trust baseline
  if (vehicleService.length > 0) {
    const weightedLogs = vehicleService.map(log => {
      let multiplier = 0.2; // Base for Self-Declared
      if (log.verificationLevel === 'mechanic_verified') multiplier = 1.0;
      else if (log.verificationLevel === 'receipt_verified') multiplier = 0.6;
      
      // The "Provider Bonus": Logs with a named workshop signature are more trustworthy
      if (log.provider && log.provider.trim().length > 2) {
        multiplier += 0.1;
      }
      
      return Math.min(1.0, multiplier);
    });

    provenanceScore = (weightedLogs.reduce((a, b) => a + b, 0) / vehicleService.length) * 100;
  }

  // Final Aggregation with Safety Multiplier
  const total = Math.round(((metabolism.score * 0.4) + (hygieneScore * 0.4) + (provenanceScore * 0.2)) * safetyMultiplier);

  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown: {
      metabolic: metabolism.score,
      hygiene: hygieneScore,
      provenance: provenanceScore,
      metabolicStatus: metabolism.status,
      wasteMonthly: metabolism.waste,
      isCalibrating: metabolism.isCalibrating
    }
  };
};

export const getTaskMaintenanceStatus = (vehicle: Vehicle, task: MaintenanceTask): 'optimal' | 'upcoming' | 'overdue' => {
  const kmRemaining = task.dueMileage - vehicle.mileage;
  let daysRemaining = Infinity;
  if (task.dueDate) {
    daysRemaining = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }
  if (kmRemaining <= 0 || daysRemaining <= 0) return 'overdue';
  if (kmRemaining <= 1000 || daysRemaining <= 14) return 'upcoming';
  return 'optimal';
};

export const calculateNextMilestone = (baseMileage: number, baseDate: string, intervalKm: number = 5000, intervalMonths?: number) => {
  const adjustedInterval = Math.round(intervalKm / REGIONAL_STRESS_FACTOR);
  const nextMileage = baseMileage + adjustedInterval;
  let nextDate = undefined;
  if (intervalMonths && intervalMonths > 0) {
    const d = new Date(baseDate);
    const adjustedMonths = Math.max(1, Math.round(intervalMonths / REGIONAL_STRESS_FACTOR));
    d.setMonth(d.getMonth() + adjustedMonths);
    nextDate = d.toISOString();
  }
  return { nextMileage, nextDate };
};

export const predictServiceDate = (vehicle: Vehicle, task: MaintenanceTask, add: number): string | undefined => {
  const kmRemaining = task.dueMileage - vehicle.mileage;
  if (kmRemaining <= 0) return undefined;
  const daysUntil = Math.ceil(kmRemaining / (add || 35));
  const prediction = new Date();
  prediction.setDate(prediction.getDate() + daysUntil);
  return prediction.toISOString();
};

export const calculateVitalityScore = (
  vehicle: Vehicle, 
  tasks: MaintenanceTask[], 
  fuelLogs: FuelLog[] = [], 
  serviceLogs: ServiceLog[] = []
): number => {
  return calculateIntelligentHealth(vehicle, tasks, fuelLogs, serviceLogs).total;
};

export const calculateDisciplineScore = (logs: ServiceLog[], tasks: MaintenanceTask[]): number => {
  const verified = logs.filter(l => l.verificationLevel !== 'self_declared').length;
  return logs.length > 0 ? (verified / logs.length) * 100 : 0;
};

export const calculateTotalExpenditure = (serviceLogs: ServiceLog[], fuelLogs: FuelLog[]): number => {
  const s = serviceLogs.reduce((acc, l) => acc + (l.cost || 0), 0);
  const f = fuelLogs.reduce((acc, l) => acc + (l.totalCost || 0), 0);
  return s + f;
};

export const getSpendByCategory = (logs: ServiceLog[]) => {
  const totals: Record<string, number> = {};
  logs.forEach(log => { totals[log.category] = (totals[log.category] || 0) + log.cost; });
  return totals;
};
