import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../shared/types.ts';
import { calculateFinancialLedger, calculateIntelligentHealth } from './maintenanceLogic.ts';

export interface GarageReportData {
  generatedAt: string;
  totalCars: number;
  totalSpentOverall: number;
  averageGarageHealth: number;
  vehicleSummaries: Array<{
    vehicle: Vehicle;
    healthScore: number;
    spending: {
      maintenance: number;
      fuel: number;
      total: number;
    };
    toDoCount: number;
    estimatedValue: number;
  }>;
}

export const generateGlobalGarageReport = (
  vehicles: Vehicle[],
  allTasks: MaintenanceTask[],
  allServiceLogs: ServiceLog[],
  allFuelLogs: FuelLog[]
): GarageReportData => {
  const summaries = vehicles.map(v => {
    const vTasks = allTasks.filter(t => t.vehicleId === v.id);
    const vService = allServiceLogs.filter(l => l.vehicleId === v.id);
    const vFuel = allFuelLogs.filter(l => l.vehicleId === v.id);
    
    const finances = calculateFinancialLedger(vService, vFuel);
    const health = calculateIntelligentHealth(v, vTasks, vFuel, vService);
    
    // Get AI value if audited, otherwise 0
    const estimatedValue = v.latestAiAudit?.valuationNGN || 0;

    return {
      vehicle: v,
      healthScore: health.total,
      spending: {
        maintenance: finances.maintenanceTotal,
        fuel: finances.fuelTotal,
        total: finances.grandTotal
      },
      toDoCount: vTasks.filter(t => t.status === 'pending').length,
      estimatedValue
    };
  });

  const totalSpent = summaries.reduce((acc, s) => acc + s.spending.total, 0);
  const avgHealth = summaries.length > 0 
    ? Math.round(summaries.reduce((acc, s) => acc + s.healthScore, 0) / summaries.length)
    : 100;

  return {
    generatedAt: new Date().toISOString(),
    totalCars: vehicles.length,
    totalSpentOverall: totalSpent,
    averageGarageHealth: avgHealth,
    vehicleSummaries: summaries
  };
};