
import { Vehicle, MaintenanceTask, ServiceLog, Priority, ServiceCategory, FuelLog, HealthBreakdown } from '../shared/types.ts';

const CATEGORY_WEIGHTS: Record<ServiceCategory, number> = {
  brakes: 2.5, 
  suspension: 1.5,
  engine: 1.2,
  tires: 1.0,
  fluids: 0.8,
  electrical: 1.0,
  cooling: 1.5,
  other: 0.5
};

const PRIORITY_MULTIPLIER: Record<Priority, number> = {
  [Priority.HIGH]: 2.0,
  [Priority.MEDIUM]: 1.2,
  [Priority.LOW]: 0.8
};

const REGIONAL_SEVERITY = 1.2;

/**
 * Velocity Engine: Average Daily Kilometers
 */
export const calculateAverageDailyKm = (fuelLogs: FuelLog[], serviceLogs: ServiceLog[]): number => {
  const allLogs = [
    ...fuelLogs.map(l => ({ odo: l.odometerKm, date: new Date(l.createdAt) })),
    ...serviceLogs.map(l => ({ odo: l.mileageAtService, date: new Date(l.serviceDate) }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const recentLogs = allLogs.slice(-10);
  if (recentLogs.length < 2) return 35;

  const oldest = recentLogs[0];
  const newest = recentLogs[recentLogs.length - 1];
  
  const distance = newest.odo - oldest.odo;
  const timeDiff = newest.date.getTime() - oldest.date.getTime();
  const days = Math.max(1, timeDiff / (1000 * 60 * 60 * 24));

  return Math.max(5, Math.min(400, distance / days));
};

/**
 * METABOLIC ENGINE: Efficiency interpretation
 */
export const calculateMetabolicStatus = (fuelLogs: FuelLog[]): { score: number, status: 'optimal' | 'warning' | 'critical', waste: number } => {
  if (fuelLogs.length < 5) return { score: 100, status: 'optimal', waste: 0 };

  const sorted = [...fuelLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Baseline = First 5 logs
  const baselineLogs = sorted.slice(-5);
  const baselineDist = baselineLogs[0].odometerKm - baselineLogs[baselineLogs.length-1].odometerKm;
  const baselineFuel = baselineLogs.reduce((acc, l) => acc + l.liters, 0);
  const baselineKml = baselineFuel > 0 ? baselineDist / baselineFuel : 0;

  // Recent = Last 3 logs
  const recentLogs = sorted.slice(0, 3);
  const recentDist = recentLogs[0].odometerKm - recentLogs[recentLogs.length-1].odometerKm;
  const recentFuel = recentLogs.reduce((acc, l) => acc + l.liters, 0);
  const recentKml = recentFuel > 0 ? recentDist / recentFuel : 0;

  if (baselineKml === 0 || recentKml === 0) return { score: 100, status: 'optimal', waste: 0 };

  const variance = (baselineKml - recentKml) / baselineKml;
  
  let score = 100;
  let status: 'optimal' | 'warning' | 'critical' = 'optimal';
  
  if (variance > 0.15) {
    score = 40;
    status = 'critical';
  } else if (variance > 0.05) {
    score = 75;
    status = 'warning';
  }

  // Calculate waste based on 500km monthly driving and N800/liter
  const waste = variance > 0 ? (500 / recentKml - 500 / baselineKml) * 800 : 0;

  return { score, status, waste: Math.max(0, waste) };
};

/**
 * DETERMINISTIC HEALTH BRAIN
 * Drastically increases user value by identifying correlated faults.
 */
export const calculateIntelligentHealth = (
  vehicle: Vehicle, 
  tasks: MaintenanceTask[], 
  fuelLogs: FuelLog[],
  serviceLogs: ServiceLog[]
): { total: number, breakdown: HealthBreakdown } => {
  
  // 1. Metabolic Score (Fuel)
  const metabolism = calculateMetabolicStatus(fuelLogs);

  // 2. Hygiene Score (Service)
  let totalPillars = 8;
  let healthyPillars = 8;
  const categoriesPresent = new Set(tasks.map(t => t.category));
  
  tasks.forEach(task => {
    if (task.status === 'pending') {
      const status = getTaskMaintenanceStatus(vehicle, task);
      if (status === 'overdue') healthyPillars--;
    }
  });
  const hygieneScore = (Math.max(0, healthyPillars) / totalPillars) * 100;

  // 3. Provenance Score (Trust)
  const verifiedCount = serviceLogs.filter(l => l.verificationLevel === 'mechanic_verified').length;
  const totalLogs = serviceLogs.length || 1;
  const provenanceScore = (verifiedCount / totalLogs) * 100;

  // Final Weighted Score
  // Metabolic (40%), Hygiene (40%), Provenance Bonus (20%)
  const total = Math.round((metabolism.score * 0.4) + (hygieneScore * 0.4) + (provenanceScore * 0.2));

  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown: {
      metabolic: metabolism.score,
      hygiene: hygieneScore,
      provenance: provenanceScore,
      metabolicStatus: metabolism.status,
      wasteMonthly: metabolism.waste
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

export const calculateNextMilestone = (
  baseMileage: number,
  baseDate: string,
  intervalKm: number = 5000,
  intervalMonths?: number
) => {
  const adjustedInterval = Math.round(intervalKm / REGIONAL_SEVERITY);
  const nextMileage = baseMileage + adjustedInterval;
  
  let nextDate = undefined;
  if (intervalMonths && intervalMonths > 0) {
    const d = new Date(baseDate);
    const adjustedMonths = Math.max(1, Math.round(intervalMonths / REGIONAL_SEVERITY));
    d.setMonth(d.getMonth() + adjustedMonths);
    nextDate = d.toISOString();
  }
  return { nextMileage, nextDate };
};

export const predictServiceDate = (vehicle: Vehicle, task: MaintenanceTask, add: number): string | undefined => {
  const kmRemaining = task.dueMileage - vehicle.mileage;
  if (kmRemaining <= 0) return undefined;
  const daysUntil = Math.ceil(kmRemaining / add);
  const prediction = new Date();
  prediction.setDate(prediction.getDate() + daysUntil);
  return prediction.toISOString();
};

/** DEPRECATED: Use calculateIntelligentHealth */
export const calculateVitalityScore = (vehicle: Vehicle, tasks: MaintenanceTask[]): number => 100;
export const calculateDisciplineScore = (logs: ServiceLog[], tasks: MaintenanceTask[]): number => 100;
export const calculateTotalExpenditure = (serviceLogs: ServiceLog[], fuelLogs: FuelLog[]): number => {
  return serviceLogs.reduce((acc, l) => acc + (l.cost || 0), 0);
};
export const getExpenditureRatio = (serviceLogs: ServiceLog[], fuelLogs: FuelLog[]) => {
  const serviceTotal = serviceLogs.reduce((acc, l) => acc + (l.cost || 0), 0);
  const fuelTotal = fuelLogs.reduce((acc, l) => acc + (l.totalCost || 0), 0);
  const total = serviceTotal + fuelTotal;
  if (total === 0) return { service: 50, fuel: 50 };
  return { service: (serviceTotal / total) * 100, fuel: (fuelTotal / total) * 100 };
};
export const getSpendByCategory = (logs: ServiceLog[]) => {
  const totals: Record<string, number> = {};
  logs.forEach(log => { totals[log.category] = (totals[log.category] || 0) + log.cost; });
  return totals;
};
