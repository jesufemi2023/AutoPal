import { create } from 'zustand';
import { UserProfile, Vehicle, MaintenanceTask, ServiceLog } from './types.ts';

/**
 * AutoPal NG Unified State Engine
 * Manages reactive UI state and synchronizes with local/cloud persistence.
 */

interface AutoPalState {
  // Identity & Session
  user: UserProfile | null;
  session: any | null;
  isInitialized: boolean;
  isRecovering: boolean;
  isLoading: boolean;
  
  // Navigation & UI
  currentView: 'garage' | 'onboarding' | 'marketplace' | 'admin' | 'settings';
  
  // Data Slices (Placeholders for Phase 2)
  vehicles: Vehicle[];
  tasks: MaintenanceTask[];
  serviceLogs: ServiceLog[];
  suggestedPartNames: string[];
  marketplace: any[];

  // Actions: Session
  setSession: (session: any) => void;
  setUser: (user: UserProfile | null) => void;
  setInitialized: (initialized: boolean) => void;
  setRecovering: (isRecovering: boolean) => void;
  setLoading: (loading: boolean) => void;
  
  // Actions: UI
  setCurrentView: (view: 'garage' | 'onboarding' | 'marketplace' | 'admin' | 'settings') => void;
  
  // Actions: Data
  setVehicles: (vehicles: Vehicle[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  // Fix: Added updateMileage action used in Dashboard.tsx
  updateMileage: (vehicleId: string, mileage: number) => void;
  // Fix: Added completeTask action used in Dashboard.tsx
  completeTask: (taskId: string, cost: number, currentMileage: number) => void;
  setTasks: (tasks: MaintenanceTask[]) => void;
  addServiceLog: (log: ServiceLog) => void;
  setMarketplace: (items: any[]) => void;
  setSuggestedParts: (parts: string[]) => void;
  
  // System
  reset: () => void;
}

export const useAutoPalStore = create<AutoPalState>((set) => ({
  user: null,
  session: null,
  isInitialized: false,
  isRecovering: false,
  isLoading: false,
  currentView: 'garage',
  vehicles: [],
  tasks: [],
  serviceLogs: [],
  suggestedPartNames: [],
  marketplace: [],

  setSession: (session) => {
    if (!session) {
      set({ session: null, user: null });
      return;
    }
    const { user } = session;
    set({ 
      session, 
      user: {
        id: user.id,
        email: user.email || '',
        tier: user.user_metadata?.tier || 'free',
        role: user.user_metadata?.role || 'user',
        onboarded: user.user_metadata?.onboarded || false,
      } 
    });
  },
  
  setUser: (user) => set({ user }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setRecovering: (isRecovering) => set({ isRecovering }),
  setLoading: (loading) => set({ isLoading: loading }),
  setCurrentView: (currentView) => set({ currentView }),
  
  setVehicles: (vehicles) => set({ vehicles }),
  addVehicle: (vehicle) => set((state) => ({ vehicles: [vehicle, ...state.vehicles] })),
  // Fix: Implemented updateMileage to sync store state with UI updates
  updateMileage: (vehicleId, mileage) => set((state) => ({
    vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, mileage } : v)
  })),
  // Fix: Implemented completeTask to update task status in reactive store
  completeTask: (taskId, cost, currentMileage) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'completed' } : t)
  })),
  setTasks: (tasks) => set({ tasks }),
  addServiceLog: (log) => set((state) => ({ serviceLogs: [log, ...state.serviceLogs] })),
  setMarketplace: (marketplace) => set({ marketplace }),
  setSuggestedParts: (suggestedPartNames) => set({ suggestedPartNames }),

  reset: () => set({ 
    user: null, 
    session: null, 
    vehicles: [], 
    tasks: [], 
    serviceLogs: [],
    isRecovering: false 
  }),
}));
