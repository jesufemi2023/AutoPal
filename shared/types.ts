export type Tier = 'free' | 'standard' | 'premium';
export type UserRole = 'user' | 'admin';
export type BodyType = 'sedan' | 'suv' | 'truck' | 'van' | 'coupe' | 'hatchback' | 'other';
export type TaskStatus = 'pending' | 'completed' | 'skipped';
export type Priority = 'low' | 'medium' | 'high';
export type LogStatus = 'upcoming' | 'overdue' | 'completed';

export interface UserProfile {
  id: string;
  email: string;
  tier: Tier;
  role: UserRole;
  onboarded: boolean;
  createdAt: string;
}

export interface VehicleSpecs {
  oilGrade?: string;
  tireSize?: string;
  batteryType?: string;
  engineType?: 'petrol' | 'diesel' | 'hybrid' | 'electric';
  transmission?: 'manual' | 'automatic';
  [key: string]: any;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  mileage: number; // Mapping to current_mileage
  healthScore: number;
  bodyType?: BodyType;
  imageUrl?: string;
  imageUrls?: string[];
  status: 'active' | 'archived' | 'sold';
  specs: VehicleSpecs;
  createdAt?: string;
  updatedAt?: string;
  // Missing fields for TS support
  fuelType?: string;
  engineSize?: string;
  avgDailyKm?: number;
  isDirty?: boolean;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  liters: number;
  cost: number;
  odometerKm: number;
  createdAt: string;
}

export interface ServiceLog {
  id: string;
  vehicleId: string;
  serviceType: string;
  serviceDate: string;
  mileageAtService: number;
  cost: number;
  provider?: string;
  notes?: string;
  status: LogStatus;
  createdAt?: string;
  updatedAt?: string;
  // Missing fields for TS support
  taskId?: string;
  isDirty?: boolean;
}

export interface MaintenanceTask {
  id: string;
  vehicleId: string;
  title: string;
  description: string;
  dueMileage: number;
  status: TaskStatus;
  priority: Priority;
  category: 'engine' | 'tires' | 'brakes' | 'fluids' | 'other';
  estimatedCost?: number;
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
    priority: Priority;
    category: MaintenanceTask['category'];
    estimatedCost?: number;
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