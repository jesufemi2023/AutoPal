
import { Vehicle, MaintenanceTask } from '../shared/types.ts';

/**
 * Maintenance Intelligence Service
 * Handles velocity-based projections and health metrics.
 */

export const calculateProjectedServiceDate = (vehicle: Vehicle, task: MaintenanceTask): Date | null => {
  if (!task.dueMileage || !vehicle.avgDailyKm || vehicle.avgDailyKm <= 0) return null;
  
  const kmRemaining = task.dueMileage - vehicle.mileage;
  if (kmRemaining <= 0) return new Date(); // Overdue

  const daysRemaining = kmRemaining / vehicle.avgDailyKm;
  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + Math.ceil(daysRemaining));
  
  return projectedDate;
};

export const getHealthColor = (score: number): string => {
  if (score > 80) return 'text-emerald-500';
  if (score > 50) return 'text-amber-500';
  return 'text-rose-500';
};

export const getHealthStatusText = (score: number): string => {
  if (score > 90) return 'Pristine';
  if (score > 75) return 'Good';
  if (score > 50) return 'Maintenance Due';
  return 'Critical Attention';
};
