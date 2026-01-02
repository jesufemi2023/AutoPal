
export type Tier = 'free' | 'standard' | 'premium';
export type UserRole = 'user' | 'admin';
export type BodyType = 'sedan' | 'suv' | 'truck' | 'coupe' | 'van' | 'other';
export type VehicleStatus = 'active' | 'transferred' | 'archived';
export type LogSource = 'user' | 'ai_projection' | 'service_provider';

export interface SyncMetadata {
  isDirty: boolean;
  lastSyncedAt?: string;
  localId?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  tier: Tier;
  role: UserRole;
  onboarded: boolean;
}

export interface OwnershipHistory {
  id: string;
  vehicleId: string;
  fromUserId: string | null;
  toUserId: string;
  transferDate: string;
  odometerAtTransfer: number;
}

export interface Vehicle extends SyncMetadata {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  mileage: number;
  avgDailyKm?: number; // Calculated velocity
  healthScore: number;
  bodyType: BodyType;
  imageUrls: string[];
  status: VehicleStatus;
  isManualEntry?: boolean;
  nextServiceMileage?: number;
  engineSize?: string;
  fuelType?: string;
  specs?: {
    tireSize?: string;
    oilGrade?: string;
    batteryType?: string;
  };
}

export interface MaintenanceTask extends SyncMetadata {
  id: string;
  vehicleId: string;
  title: string;
  description: string;
  dueMileage?: number;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  estimatedCost?: number;
  category: 'engine' | 'tires' | 'brakes' | 'fluids' | 'other';
}

export interface ServiceLog extends SyncMetadata {
  id: string;
  vehicleId: string;
  taskId?: string;
  date: string;
  description: string;
  cost: number;
  mileage: number;
  providerName?: string;
}

export interface MileageLog {
  id: string;
  vehicleId: string;
  mileage: number;
  timestamp: string;
  source: LogSource;
}

export interface AIResponse {
  advice: string;
  recommendations: string[];
  severity: 'info' | 'warning' | 'critical';
  partsIdentified?: string[];
}

export interface AppraisalResult {
  estimatedValue: number;
  priceRange: { min: number; max: number };
  marketInsight: string;
  confidenceScore: number;
}

export interface MaintenanceScheduleResponse {
  tasks: Array<Omit<MaintenanceTask, 'id' | 'vehicleId' | 'status' | 'isDirty' | 'lastSyncedAt'>>;
  summary: string;
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
