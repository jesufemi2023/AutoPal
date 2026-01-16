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

const REGIONAL_STRESS_FACTOR = 1.2; 

/**
 * TELEMETRY DRIFT ENGINE
 * Returns the timestamp of the most recent data point in the system.
 */
export const getLatestTelemetryTimestamp = (serviceLogs: ServiceLog[], fuelLogs: FuelLog[]): number => {
  const serviceTimes = serviceLogs.map(l => new Date(l.createdAt || l.serviceDate).getTime());
  const fuelTimes = fuelLogs.map(l => new Date(l.createdAt).getTime());
  return Math.max(0, ...serviceTimes, ...fuelTimes);
};

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
 * METABOLIC ENGINE (Now treated as Evidence for AI)
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
 * DETERMINISTIC INTELLIGENT HEALTH (Internal Evidence Only)
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

  const metabolism = calculateMetabolicStatus(vehicle, vehicleFuel);

  const pillarStatus: Record<string, boolean> = {};
  const categories: ServiceCategory[] = ['fluids', 'engine', 'brakes', 'suspension', 'tires', 'electrical', 'cooling', 'other'];
  
  categories.forEach(cat => {
    const catTasks = vehicleTasks.filter(t => t.category === cat);
    if (catTasks.length === 0) {
      pillarStatus[cat] = true; 
      return;
    }
    const isOverdue = catTasks.some(t => t.status === 'pending' && getTaskMaintenanceStatus(vehicle, t) === 'overdue');
    pillarStatus[cat] = !isOverdue;
  });

  const healthyPillars = Object.values(pillarStatus).filter(v => v).length;
  let hygieneScore = (healthyPillars / categories.length) * 100;

  let provenanceScore = 50;
  if (vehicleService.length > 0) {
    const verifiedCount = vehicleService.filter(l => l.verificationLevel === 'mechanic_verified').length;
    const receiptCount = vehicleService.filter(l => l.verificationLevel === 'receipt_verified').length;
    const totalLogs = vehicleService.length;
    const weightedSum = (verifiedCount * 1.0) + (receiptCount * 0.6) + ((totalLogs - verifiedCount - receiptCount) * 0.2);
    provenanceScore = (weightedSum / totalLogs) * 100;
  }

  const total = Math.round((metabolism.score * 0.4) + (hygieneScore * 0.4) + (provenanceScore * 0.2));

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

/**
 * REFACTORED: Expenditure Logic
 */
export const calculateFinancialLedger = (serviceLogs: ServiceLog[], fuelLogs: FuelLog[]): { maintenanceTotal: number, fuelTotal: number, grandTotal: number } => {
  const maintenanceTotal = serviceLogs.reduce((acc, l) => acc + (l.cost || 0), 0);
  const fuelTotal = fuelLogs.reduce((acc, l) => acc + (l.totalCost || 0), 0);
  return {
    maintenanceTotal,
    fuelTotal,
    grandTotal: maintenanceTotal + fuelTotal
  };
};

export const getSpendByCategory = (logs: ServiceLog[]) => {
  const totals: Record<string, number> = {};
  logs.forEach(log => { totals[log.category] = (totals[log.category] || 0) + log.cost; });
  return totals;
};