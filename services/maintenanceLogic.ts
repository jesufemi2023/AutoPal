
import { Vehicle, MaintenanceTask, ServiceLog, Priority, ServiceCategory, FuelLog } from '../shared/types.ts';

const CATEGORY_WEIGHTS: Record<ServiceCategory, number> = {
  brakes: 2.5, 
  suspension: 1.5,
  engine: 1.2,
  tires: 1.0,
  fluids: 0.8,
  other: 0.5
};

const PRIORITY_MULTIPLIER: Record<Priority, number> = {
  high: 2.0,
  medium: 1.2,
  low: 0.8
};

// Tropical Context Multiplier (1.0 = Standard, 1.2 = Severe Conditions)
const REGIONAL_SEVERITY = 1.2;

/**
 * Velocity Engine: Average Daily Kilometers (ADD)
 * Calculates a weighted average of daily driving distance based on combined telemetry.
 */
export const calculateAverageDailyKm = (fuelLogs: FuelLog[], serviceLogs: ServiceLog[]): number => {
  const allLogs = [
    ...fuelLogs.map(l => ({ odo: l.odometerKm, date: new Date(l.createdAt) })),
    ...serviceLogs.map(l => ({ odo: l.mileageAtService, date: new Date(l.serviceDate) }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Use only the most recent 10 records for high-fidelity velocity
  const recentLogs = allLogs.slice(-10);
  
  if (recentLogs.length < 2) return 30; // Standard for urban Nigerian usage

  const oldest = recentLogs[0];
  const newest = recentLogs[recentLogs.length - 1];
  
  const distance = newest.odo - oldest.odo;
  const timeDiff = newest.date.getTime() - oldest.date.getTime();
  const days = Math.max(1, timeDiff / (1000 * 60 * 60 * 24));

  const add = distance / days;
  return Math.max(5, Math.min(500, add));
};

/**
 * Predicts the date a service will be due based on velocity.
 */
export const predictServiceDate = (vehicle: Vehicle, task: MaintenanceTask, add: number): string | undefined => {
  const kmRemaining = task.dueMileage - vehicle.mileage;
  if (kmRemaining <= 0) return undefined;

  const daysUntil = Math.ceil(kmRemaining / add);
  const prediction = new Date();
  prediction.setDate(prediction.getDate() + daysUntil);
  
  return prediction.toISOString();
};

/**
 * Calculates next milestone with regional severity compensation.
 */
export const calculateNextMilestone = (
  baseMileage: number,
  baseDate: string,
  intervalKm: number = 5000,
  intervalMonths?: number
) => {
  // Apply severity reduction (e.g., if severe, service happens sooner)
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

export const getTaskMaintenanceStatus = (vehicle: Vehicle, task: MaintenanceTask): 'optimal' | 'upcoming' | 'overdue' => {
  const currentMileage = vehicle.mileage;
  const currentDate = new Date();

  const kmRemaining = task.dueMileage - currentMileage;
  
  let daysRemaining = Infinity;
  if (task.dueDate) {
    const dueTime = new Date(task.dueDate).getTime();
    daysRemaining = Math.ceil((dueTime - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (kmRemaining <= 0 || daysRemaining <= 0) return 'overdue';
  
  // Warning triggers at 10% of interval or 14 days
  const warningKm = Math.min(1000, (task.intervalKm || 5000) * 0.15);
  if (kmRemaining <= warningKm || daysRemaining <= 14) return 'upcoming';

  return 'optimal';
};

/**
 * Precision Vitality Score
 * Factors in maintenance debt and rewards authenticated service records.
 */
export const calculateVitalityScore = (vehicle: Vehicle, tasks: MaintenanceTask[]): number => {
  if (tasks.length === 0) return 100;

  let totalPossibleDebt = 0;
  let currentDebt = 0;
  let verificationBonus = 0;

  tasks.forEach(task => {
    const weight = CATEGORY_WEIGHTS[task.category] * PRIORITY_MULTIPLIER[task.priority];
    totalPossibleDebt += weight;

    if (task.status === 'pending') {
      const status = getTaskMaintenanceStatus(vehicle, task);
      if (status === 'overdue') {
        currentDebt += weight;
      } else if (status === 'upcoming') {
        currentDebt += weight * 0.5;
      }
    }

    // Historical trust multiplier
    if (task.lastVerificationLevel === 'receipt_verified') verificationBonus += 2;
    if (task.lastVerificationLevel === 'mechanic_verified') verificationBonus += 5;
  });

  const baseScore = 100 - (totalPossibleDebt > 0 ? (currentDebt / totalPossibleDebt) * 100 : 0);
  const bonus = (verificationBonus / tasks.length);
  return Math.min(100, Math.max(0, Math.round(baseScore + bonus)));
};

export const calculateDisciplineScore = (logs: ServiceLog[], tasks: MaintenanceTask[]): number => {
  if (logs.length === 0) return 0;
  
  const completedCount = logs.length;
  const overdueCount = tasks.filter(t => t.status === 'pending' && getTaskMaintenanceStatus({mileage: 999999} as any, t) === 'overdue').length;
  
  const verificationBonus = logs.reduce((acc, l) => {
    if (l.verificationLevel === 'receipt_verified') return acc + 5;
    if (l.verificationLevel === 'mechanic_verified') return acc + 10;
    return acc;
  }, 0);
  
  const baseScore = (completedCount / (completedCount + overdueCount + 1)) * 80; 
  const finalScore = baseScore + (verificationBonus / logs.length);
  
  return Math.min(100, Math.round(finalScore));
};

export const detectAnomalies = (logs: ServiceLog[]) => {
  const anomalies: Array<{ type: string; severity: 'low' | 'high'; message: string }> = [];
  
  const engineLogs = logs.filter(l => l.category === 'engine' || l.category === 'fluids').sort((a,b) => b.mileageAtService - a.mileageAtService);
  if (engineLogs.length >= 2) {
    const delta = engineLogs[0].mileageAtService - engineLogs[1].mileageAtService;
    if (delta > 0 && delta < 2000) {
      anomalies.push({
        type: 'consumption',
        severity: 'high',
        message: "Hyper-frequent engine service detected. Potential fluid leak or thermal distress identified."
      });
    }
  }
  
  return anomalies;
};

export const getSpendByCategory = (logs: ServiceLog[]) => {
  const totals: Record<string, number> = {};
  logs.forEach(log => {
    totals[log.category] = (totals[log.category] || 0) + log.cost;
  });
  return totals;
};
