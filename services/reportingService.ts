import { Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../shared/types.ts';
import { calculateFinancialLedger, calculateIntelligentHealth } from './maintenanceLogic.ts';
import { formatCurrency } from '../shared/utils.ts';

export interface GarageReport {
  generatedAt: string;
  fleetCount: number;
  totalInvestment: number;
  avgHealth: number;
  vehicles: Array<{
    vehicle: Vehicle;
    health: number;
    financials: {
      maintenance: number;
      fuel: number;
      total: number;
    };
    pendingTasks: number;
    resaleValue: number;
  }>;
}

export const aggregateGarageReport = (
  vehicles: Vehicle[],
  allTasks: MaintenanceTask[],
  allServiceLogs: ServiceLog[],
  allFuelLogs: FuelLog[]
): GarageReport => {
  const vehicleReports = vehicles.map(v => {
    const vTasks = allTasks.filter(t => t.vehicleId === v.id);
    const vService = allServiceLogs.filter(l => l.vehicleId === v.id);
    const vFuel = allFuelLogs.filter(l => l.vehicleId === v.id);
    
    const financials = calculateFinancialLedger(vService, vFuel);
    const health = calculateIntelligentHealth(v, vTasks, vFuel, vService);
    
    // Fallback to algorithmic resale value if AI audit not present
    const resaleValue = v.latestAiAudit?.valuationNGN || 0;

    return {
      vehicle: v,
      health: health.total,
      financials: {
        maintenance: financials.maintenanceTotal,
        fuel: financials.fuelTotal,
        total: financials.grandTotal
      },
      pendingTasks: vTasks.filter(t => t.status === 'pending').length,
      resaleValue
    };
  });

  const totalInv = vehicleReports.reduce((acc, r) => acc + r.financials.total, 0);
  const avgHealth = vehicleReports.length > 0 
    ? Math.round(vehicleReports.reduce((acc, r) => acc + r.health, 0) / vehicleReports.length)
    : 100;

  return {
    generatedAt: new Date().toISOString(),
    fleetCount: vehicles.length,
    totalInvestment: totalInv,
    avgHealth,
    vehicles: vehicleReports
  };
};