
export type Tier = 'free' | 'standard' | 'premium';
export type UserRole = 'user' | 'admin';
export type BodyType = 'sedan' | 'suv' | 'truck' | 'van' | 'coupe' | 'hatchback' | 'other';
export type TaskStatus = 'pending' | 'completed' | 'skipped';

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

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

export interface UnifiedAIDossier {
  vehicleId: string;
  timestamp: string;
  valuation: {
    marketValueNGN: number;
    priceRange: { min: number; max: number };
    marketGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
  };
  health: {
    vitalityScore: number; // 0-100: Internal mechanical state
    disciplineScore: number; // 0-100: Maintenance adherence/verification
    status: 'pristine' | 'stable' | 'degrading' | 'critical';
  };
  finance: {
    totalOpEx: number; // Fuel only
    totalCapEx: number; // Maintenance/Repairs
    equityPreserved: number; // NGN value saved by verified logs
    maintenanceDebt: number; // Upcoming costs
  };
  insights: {
    metabolicState: string;
    trustPremium: string;
    exitStrategy: string;
    criticalAlert?: string;
  };
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
  bodyType: BodyType;
  imageUrl?: string;
  status: 'active' | 'archived' | 'sold';
  fuelType?: string;
  engineSize?: string;
  createdAt?: string;
  updatedAt?: string;
  specs: any;
  avgDailyKm?: number;
  isDirty?: boolean;
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
  taskId?: string;
  serviceType: string;
  serviceDate: string;
  mileageAtService: number;
  cost: number;
  notes?: string;
  provider?: string;
  category: ServiceCategory;
  verificationLevel?: VerificationLevel;
  receiptUrl?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MaintenanceTask {
  id: string;
  vehicleId: string;
  title: string;
  description: string;
  dueMileage: number;
  dueDate?: string;
  status: TaskStatus;
  priority: Priority;
  category: ServiceCategory;
  estimatedCost?: number;
  intervalKm?: number;
  intervalMonths?: number;
  lastCompletedAt?: string;
  lastVerificationLevel?: VerificationLevel;
  lastReceiptUrl?: string;
}

// Added missing types
export interface TransientVehicle {
  make: string;
  model: string;
  year: number;
  mileage: number;
}

export interface AIValuationReport {
  marketValueNGN: number;
  confidenceScore: number;
  timestamp: string;
}

export interface AIResponse {
  advice: string;
  severity: 'info' | 'warning' | 'critical';
  recommendations: string[];
  partsIdentified?: string[];
}

export interface MaintenanceScheduleResponse {
  summary: string;
  tasks: Omit<MaintenanceTask, 'id' | 'vehicleId' | 'status'>[];
}

export interface HealthBreakdown {
  metabolic: number;
  hygiene: number;
  provenance: number;
  metabolicStatus: 'optimal' | 'warning' | 'critical';
  wasteMonthly: number;
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
