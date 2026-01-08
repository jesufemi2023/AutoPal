
import { Vehicle, MaintenanceTask, ServiceLog, Priority, ServiceCategory } from '../shared/types.ts';

const CATEGORY_WEIGHTS: Record<ServiceCategory, number> = {
  brakes: 2.5, // Safety Critical
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

/**
 * The Vitality Engine
 * Calculates a 0-100 health score based on weighted maintenance status.
 */
export const calculateVitalityScore = (vehicle: Vehicle, tasks: MaintenanceTask[]): number => {
  if (tasks.length === 0) return 100;

  let totalPossibleDebt = 0;
  let currentDebt = 0;

  tasks.forEach(task => {
    if (task.status !== 'pending') return;
    
    const weight = CATEGORY_WEIGHTS[task.category] * PRIORITY_MULTIPLIER[task.priority];
    totalPossibleDebt += weight;

    const kmOverdue = vehicle.mileage - task.dueMileage;
    if (kmOverdue > 0) {
      // Debt increases as mileage goes past due, capped at full weight
      // A safety-critical item reaches max debt severity faster (1000km vs 5000km)
      const cap = task.priority === 'high' ? 1000 : 3000;
      const debtSeverity = Math.min(1, kmOverdue / cap); 
      currentDebt += weight * debtSeverity;
    }
  });

  const score = 100 - (totalPossibleDebt > 0 ? (currentDebt / totalPossibleDebt) * 100 : 0);
  return Math.max(0, Math.round(score));
};

/**
 * Maintenance Discipline Score
 * Measures consistency of logging vs intervals.
 */
export const calculateDisciplineScore = (logs: ServiceLog[], tasks: MaintenanceTask[]): number => {
  if (logs.length === 0) return 0;
  
  const completedCount = logs.length;
  // Count tasks that are currently overdue
  const overdueCount = tasks.filter(t => t.status === 'pending' && t.dueMileage < 0).length;
  
  // Discipline also considers the verification level of logs
  const verificationBonus = logs.reduce((acc, l) => {
    if (l.verificationLevel === 'receipt_verified') return acc + 2;
    if (l.verificationLevel === 'mechanic_verified') return acc + 5;
    return acc;
  }, 0);
  
  const rawScore = (completedCount / (completedCount + overdueCount)) * 100;
  const score = rawScore + (verificationBonus / logs.length);
  
  return Math.min(100, Math.round(score));
};

/**
 * Pattern Detection
 * Detects if a service is happening too frequently (Anomaly detection).
 */
export const detectAnomalies = (logs: ServiceLog[]) => {
  const anomalies: Array<{ type: string; severity: 'low' | 'high'; message: string }> = [];
  
  // 1. Excessive Oil/Fluid Consumption
  const engineLogs = logs.filter(l => l.category === 'engine' || l.category === 'fluids').sort((a,b) => b.mileageAtService - a.mileageAtService);
  if (engineLogs.length >= 2) {
    const delta = engineLogs[0].mileageAtService - engineLogs[1].mileageAtService;
    if (delta > 0 && delta < 2000) {
      anomalies.push({
        type: 'consumption',
        severity: 'high',
        message: "Excessive Engine/Fluid Maintenance frequency detected. Potential leak or burning."
      });
    }
  }

  // 2. Cost Drift
  const categoryCosts: Record<string, number[]> = {};
  logs.forEach(l => {
    if (!categoryCosts[l.category]) categoryCosts[l.category] = [];
    categoryCosts[l.category].push(l.cost);
  });

  Object.entries(categoryCosts).forEach(([cat, costs]) => {
    if (costs.length < 3) return;
    const last = costs[0];
    const avg = costs.slice(1).reduce((a,b) => a+b, 0) / (costs.length - 1);
    if (last > avg * 1.5) {
      anomalies.push({
        type: 'cost',
        severity: 'low',
        message: `Surge in ${cat} costs (+50%) vs historical average.`
      });
    }
  });
  
  return anomalies;
};

/**
 * Financial Intelligence
 * Aggregates spend by category.
 */
export const getSpendByCategory = (logs: ServiceLog[]) => {
  const totals: Record<string, number> = {};
  logs.forEach(log => {
    totals[log.category] = (totals[log.category] || 0) + log.cost;
  });
  return totals;
};
