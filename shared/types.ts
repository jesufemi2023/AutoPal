
export type Tier = 'free' | 'standard' | 'premium';
export type UserRole = 'user' | 'admin';
export type BodyType = 'sedan' | 'suv' | 'truck' | 'van' | 'coupe' | 'hatchback' | 'other';
export type TaskStatus = 'pending' | 'completed' | 'skipped';

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export type LogStatus = 'upcoming' | 'overdue' | 'completed';
export type ServiceCategory = 'engine' | 'tires' | 'brakes' | 'fluids' | 'suspension' | 'other' | 'electrical' | 'cooling';
export type VerificationLevel = 'self_declared' | 'receipt_verified' | 'mechanic_verified';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  phone?: string;
  tier: Tier;
  role: UserRole;
  onboarded: boolean;
  createdAt: string;
}

export interface TransientVehicle {
  make: string;
  model: string;
  year: number;
  mileage: number;
  vin?: string;
}

export interface AIValuationReport {
  vehicleId: string;
  timestamp: string;
  valuationNGN: number;
  priceRange: { min: number; max: number };
  marketGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
  auditedScores: {
    vitality: number;
    discipline: number;
  };
  metabolicAudit: {
    trueKml: number;
    consumptionGap: number; // percentage
    monthlyNeglectTax: number; // NGN wasted
    efficiencyTrend: 'improving' | 'stable' | 'degrading';
  };
  diagnostics: {
    faultHypothesis: string;
    severity: 'normal' | 'advisory' | 'critical';
    reasoning: string;
  };
  suggestedParts: Array<{
    name: string;
    reason: string;
    impact: string;
  }>;
  strategicInsights: string[]; // Exactly 5 insights
  insights: {
    trustPremium: { value: number; description: string };
    mechanicalVitality: { score: number; description: string };
    maintenanceDebt: { value: number; description: string };
    exitStrategy: string;
    marketComparison: string;
  };
}

export interface VehicleSpecs {
  oilGrade?: string;
  tireSize?: string;
  batteryType?: string;
  engineType?: 'petrol' | 'diesel' | 'hybrid' | 'electric';
  transmission?: 'manual' | 'automatic';
  recommendedFuel?: string;
  sparkPlugGap?: string;
  currency?: string;
  [key: string]: any;
}

export interface HealthBreakdown {
  metabolic: number; // Fuel efficiency score
  hygiene: number;    // Maintenance adherence
  provenance: number; // Trust/Verification score
  metabolicStatus: 'optimal' | 'warning' | 'critical';
  wasteMonthly: number; // Estimated ₦ wasted
  variance: number;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  mileage: number; 
  healthScore: number;
  healthBreakdown?: HealthBreakdown;
  bodyType: BodyType;
  imageUrl?: string;
  status: 'active' | 'archived' | 'sold';
  specs: VehicleSpecs;
  fuelType?: string;
  engineSize?: string;
  createdAt?: string;
  updatedAt?: string;
  avgDailyKm?: number;
  efficiencyBaseline?: number; 
  isDirty?: boolean;
  latestAiAudit?: AIValuationReport;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  liters: number;
  totalCost: number;
  odometerKm: number;
  isFullTank: boolean;
  vendor?: string;
  createdAt: string;
}

export interface ServiceLog {
  id: string;
  vehicleId: string;
  serviceType: string;
  serviceDate: string;
  mileageAtService: number;
  cost: number;
  notes?: string;
  provider?: string;
  category: ServiceCategory;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  taskId?: string;
  verificationLevel?: VerificationLevel;
  receiptUrl?: string;
}

export interface MaintenanceTask {
  id: string;
  taskId?: string;
  vehicleId: string;
  title: string;
  description: string;
  dueMileage: number;
  dueDate?: string; 
  status: TaskStatus;
  priority: Priority;
  category: ServiceCategory;
  estimatedCost?: number;
  lastCompletedAt?: string; 
  intervalKm?: number; 
  intervalMonths?: number; 
  projectedDate?: string; 
  lastVerificationLevel?: VerificationLevel;
  lastReceiptUrl?: string;
}

export interface AIResponse {
  advice: string;
  recommendations: string[];
  severity: 'info' | 'warning' | 'critical';
  partsIdentified?: string[];
}

export interface MaintenanceScheduleResponse {
  summary: string;
  tasks: Array<{
    title: string;
    description: string;
    dueMileage: number;
    dueDate?: string;
    priority: Priority;
    category: ServiceCategory;
    estimatedCost?: number;
    intervalKm?: number;
    intervalMonths?: number;
  }>;
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  vendorName: string;
  isVerified: boolean;
  compatibility: string[];
}
