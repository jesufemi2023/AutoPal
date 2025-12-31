
export type Tier = 'free' | 'standard' | 'premium';
export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  tier: Tier;
  role: UserRole;
  onboarded: boolean;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  mileage: number;
  healthScore: number;
  nextServiceMileage?: number;
  engineSize?: string;
  fuelType?: string;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  date: string;
  volume: number;
  cost: number;
  mileage: number;
  isFullTank: boolean;
}

export interface ServiceLog {
  id: string;
  vehicleId: string;
  serviceType: string;
  date: string;
  cost: number;
  provider: string;
  notes: string;
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

export interface MaintenanceTask {
  id: string;
  vehicleId: string;
  title: string;
  description: string;
  dueMileage?: number;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
}

export interface AIResponse {
  advice: string;
  recommendations: string[];
  severity: 'info' | 'warning' | 'critical';
  marketInsight?: string;
}
