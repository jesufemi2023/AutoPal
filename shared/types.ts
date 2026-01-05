export type Tier = 'free' | 'standard' | 'premium';
export type UserRole = 'user' | 'admin';
export type BodyType = 'sedan' | 'suv' | 'truck' | 'van' | 'coupe' | 'other';
export type TaskStatus = 'pending' | 'completed' | 'skipped';
export type Priority = 'low' | 'medium' | 'high';

export interface UserProfile {
  id: string;
  email: string;
  tier: Tier;
  role: UserRole;
  onboarded: boolean;
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
 * AI Maintenance Schedule Schema
 * Fix: Added missing export member required by geminiService.ts
 */
export interface MaintenanceScheduleResponse {
  summary: string;
  tasks: Array<{
    title: string;
    description: string;
    dueMileage: number;
    priority: Priority;
    category: 'engine' | 'tires' | 'brakes' | 'fluids' | 'other';
    estimatedCost?: number;
  }>;
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
  status: TaskStatus;
  priority: Priority;
  category: 'engine' | 'tires' | 'brakes' | 'fluids' | 'other';
  estimatedCost?: number;
  isDirty: boolean;
  // Fix: Added lastSyncedAt for localDb synchronization logic
  lastSyncedAt?: string;
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
  // Fix: Added avgDailyKm for maintenance projection calculations
  avgDailyKm?: number;
  healthScore: number;
  bodyType: BodyType;
  imageUrls: string[];
  status: 'active' | 'archived' | 'sold';
  specs: any;
  fuelType?: string;
  engineSize?: string;
  isDirty: boolean;
  // Fix: Added lastSyncedAt for localDb synchronization logic
  lastSyncedAt?: string;
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
  // Fix: Added lastSyncedAt for localDb synchronization logic
  lastSyncedAt?: string;
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
