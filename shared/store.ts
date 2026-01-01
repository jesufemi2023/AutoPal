
import { create } from 'zustand';
import { 
  Vehicle, UserProfile, MaintenanceTask, FuelLog, ServiceLog, 
  MarketplaceProduct, Tier, MileageLog 
} from './types.ts';

interface AutoPalState {
  user: UserProfile | null;
  session: any | null;
  isInitialized: boolean;
  isLoading: boolean;
  isRecovering: boolean;
  vehicles: Vehicle[];
  tasks: MaintenanceTask[];
  fuelLogs: FuelLog[];
  serviceLogs: ServiceLog[];
  mileageLogs: MileageLog[];
  marketplace: MarketplaceProduct[];
  
  setSession: (session: any) => void;
  setUser: (user: UserProfile | null) => void;
  setInitialized: (initialized: boolean) => void;
  setRecovering: (recovering: boolean) => void;
  setTier: (tier: Tier) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  addVehicle: (vehicle: Vehicle) => boolean;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  removeVehicle: (id: string) => void;
  updateMileage: (vehicleId: string, newMileage: number) => void;
  setTasks: (tasks: MaintenanceTask[]) => void;
  addTask: (task: MaintenanceTask) => void;
  completeTask: (taskId: string, cost: number, mileage: number) => void;
  addServiceLog: (log: ServiceLog) => void;
  setMarketplace: (items: MarketplaceProduct[]) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAutoPalStore = create<AutoPalState>((set, get) => ({
  user: null,
  session: null,
  isInitialized: false,
  isLoading: false,
  isRecovering: false,
  vehicles: [],
  tasks: [],
  fuelLogs: [],
  serviceLogs: [],
  mileageLogs: [],
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
  setTier: (tier) => set((state) => ({ user: state.user ? { ...state.user, tier } : null })),
  
  setVehicles: (vehicles) => set({ vehicles }),
  
  addVehicle: (vehicle) => {
    const { vehicles, user } = get();
    const limits = { free: 1, standard: 3, premium: 999 };
    const currentLimit = limits[user?.tier || 'free'];
    
    if (vehicles.length >= currentLimit) return false;
    
    set((state) => ({ vehicles: [vehicle, ...state.vehicles] }));
    return true;
  },

  updateVehicle: (id, updates) => set((state) => ({
    vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...updates } : v)
  })),

  updateMileage: (vehicleId, newMileage) => {
    set((state) => ({
      vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, mileage: newMileage } : v),
      mileageLogs: [{
        id: Math.random().toString(36).substr(2, 9),
        vehicleId,
        mileage: newMileage,
        timestamp: new Date().toISOString()
      }, ...state.mileageLogs]
    }));
  },

  completeTask: (taskId, cost, mileage) => {
    const { tasks } = get();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const vehicleId = task.vehicleId;
    
    set((state) => ({
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'completed' as const } : t),
      serviceLogs: [{
        id: Math.random().toString(36).substr(2, 9),
        vehicleId,
        taskId,
        date: new Date().toISOString(),
        description: task.title,
        cost,
        mileage
      }, ...state.serviceLogs],
      vehicles: state.vehicles.map(v => v.id === vehicleId ? { 
        ...v, 
        healthScore: Math.min(100, v.healthScore + (task.priority === 'high' ? 15 : 5)) 
      } : v)
    }));
  },

  addServiceLog: (log) => set((state) => ({ serviceLogs: [log, ...state.serviceLogs] })),
  
  removeVehicle: (id) => set((state) => ({ 
    vehicles: state.vehicles.filter(v => v.id !== id) 
  })),
  
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  setMarketplace: (items) => set({ marketplace: items }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({ user: null, session: null, vehicles: [], tasks: [], isRecovering: false }),
}));
