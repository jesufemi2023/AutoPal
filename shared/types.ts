
export type Tier = 'free' | 'standard' | 'premium';
export type UserRole = 'user' | 'admin';
export type BodyType = 'sedan' | 'suv' | 'truck' | 'coupe' | 'van' | 'other';
export type VehicleStatus = 'active' | 'transferred' | 'archived';

export interface UserProfile {
  id: string;
  email: string;
  tier: Tier;
  role: UserRole;
  onboarded: boolean;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  mileage: number;
  healthScore: number;
  bodyType: BodyType;
  imageUrl?: string;
  status: VehicleStatus;
  nextServiceMileage?: number;
  engineSize?: string;
  fuelType?: string;
  lastServiceDate?: string;
  specs?: {
    tireSize?: string;
    oilGrade?: string;
    batteryType?: string;
  };
}

export interface MileageLog {
  id: string;
  vehicleId: string;
  mileage: number;
  timestamp: string;
}

export interface MaintenanceTask {
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

export interface AIResponse {
  advice: string;
  recommendations: string[];
  severity: 'info' | 'warning' | 'critical';
  marketInsight?: string;
}

export interface MaintenanceScheduleResponse {
  tasks: Array<Omit<MaintenanceTask, 'id' | 'vehicleId' | 'status'>>;
  summary: string;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  date: string;
  amount: number;
  cost: number;
  mileage: number;
}

export interface ServiceLog {
  id: string;
  vehicleId: string;
  taskId?: string;
  date: string;
  description: string;
  cost: number;
  mileage: number;
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
