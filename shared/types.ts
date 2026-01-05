
export type Tier = 'free' | 'standard' | 'premium';
export type UserRole = 'user' | 'admin';
export type BodyType = 'sedan' | 'suv' | 'truck' | 'van' | 'coupe' | 'other';

export interface UserProfile {
  id: string;
  email: string;
  tier: Tier;
  role: UserRole;
  onboarded: boolean;
}

export interface SyncMetadata {
  isDirty: boolean;
  lastSyncedAt?: string;
  localId?: string;
}

/**
 * AI Diagnosis Output Schema
 */
export interface AIResponse {
  advice: string;
  recommendations: string[];
  severity: 'info' | 'warning' | 'critical';
  partsIdentified?: string[];
}

/**
 * Maintenance Task Definition
 */
export interface MaintenanceTask {
  id: string;
  vehicleId: string;
  title: string;
  description: string;
  dueMileage: number;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  category: 'engine' | 'tires' | 'brakes' | 'fluids' | 'other';
  estimatedCost?: number;
  isDirty: boolean;
}

/**
 * AI Generated Maintenance Plan
 */
export interface MaintenanceScheduleResponse {
  summary: string;
  tasks: Omit<MaintenanceTask, 'id' | 'vehicleId' | 'status' | 'isDirty'>[];
}

/**
 * Vehicle Digital Twin Model
 */
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
  imageUrls: string[];
  status: string;
  specs: any;
  fuelType?: string;
  engineSize?: string;
  avgDailyKm?: number;
  isDirty: boolean;
}

/**
 * Completed Service Record
 */
export interface ServiceLog {
  id: string;
  vehicleId: string;
  taskId?: string;
  date: string;
  description: string;
  cost: number;
  mileage: number;
  providerName?: string;
  isDirty: boolean;
}

/**
 * Marketplace Item Schema
 */
export interface MarketplaceProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  vendorName: string;
  isVerified: boolean;
  compatibility: string[];
}
