
import { create } from 'zustand';
import { 
  Vehicle, UserProfile, MaintenanceTask, ServiceLog, 
  MarketplaceProduct, Tier, MileageLog 
} from './types.ts';
import { getConfig } from '../services/configService.ts';
import { localDb } from '../services/localDb.ts';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AutoPalState {
  user: UserProfile | null;
  session: any | null;
  isInitialized: boolean;
  isRecovering: boolean;
  isLoading: boolean;
  vehicles: Vehicle[];
  tasks: MaintenanceTask[];
  serviceLogs: ServiceLog[];
  mileageLogs: MileageLog[];
  marketplace: MarketplaceProduct[];
  suggestedPartNames: string[];
  notifications: Notification[];
  
  // Actions
  hydrateFromLocal: () => Promise<void>;
  setSession: (session: any) => void;
  setUser: (user: UserProfile | null) => void;
  setInitialized: (initialized: boolean) => void;
  setRecovering: (isRecovering: boolean) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  setMarketplace: (products: MarketplaceProduct[]) => void;
  setSuggestedParts: (parts: string[]) => void;
  addNotification: (message: string, type?: Notification['type']) => void;
  removeNotification: (id: string) => void;
  addVehicle: (vehicle: Vehicle) => { success: boolean; error?: string };
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  removeVehicle: (id: string) => void;
  updateMileage: (vehicleId: string, newMileage: number, source?: MileageLog['source']) => Promise<void>;
  setTasks: (tasks: MaintenanceTask[]) => void;
  completeTask: (taskId: string, cost: number, mileage: number) => void;
  addServiceLog: (log: ServiceLog) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAutoPalStore = create<AutoPalState>((set, get) => ({
  user: null,
  session: null,
  isInitialized: false,
  isRecovering: false,
  isLoading: false,
  vehicles: [],
  tasks: [],
  serviceLogs: [],
  mileageLogs: [],
  marketplace: [],
  suggestedPartNames: [],
  notifications: [],

  hydrateFromLocal: async () => {
    try {
      const vehicles = await localDb.getVehicles();
      if (get().vehicles.length === 0) {
        set({ vehicles });
      }
    } catch (e) {
      console.error("Local Hydration Failed", e);
    }
  },

  addNotification: (message, type = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    set(state => ({ notifications: [...state.notifications, { id, message, type }] }));
    setTimeout(() => get().removeNotification(id), 4000);
  },

  removeNotification: (id) => {
    set(state => ({ notifications: state.notifications.filter(n => n.id !== id) }));
  },

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
  setVehicles: (vehicles) => set({ vehicles }),
  setMarketplace: (marketplace) => set({ marketplace }),
  setSuggestedParts: (suggestedPartNames) => set({ suggestedPartNames }),
  
  addVehicle: (vehicle) => {
    const { vehicles, user } = get();
    const config = getConfig(user?.tier || 'free');
    
    if (vehicles.length >= config.maxVehicles) {
      return { 
        success: false, 
        error: `Limit reached for ${user?.tier} tier (${config.maxVehicles} vehicle).` 
      };
    }
    
    set((state) => ({ vehicles: [vehicle, ...state.vehicles] }));
    localDb.saveVehicle(vehicle);
    return { success: true };
  },

  updateVehicle: (id, updates) => set((state) => {
    const updated = state.vehicles.map(v => v.id === id ? { ...v, ...updates, isDirty: true } : v);
    const vehicle = updated.find(v => v.id === id);
    if (vehicle) localDb.saveVehicle(vehicle);
    return { vehicles: updated };
  }),

  updateMileage: async (vehicleId, newMileage, source = 'user') => {
    const state = get();
    const vehicle = state.vehicles.find(v => v.id === vehicleId);
    if (!vehicle || newMileage < vehicle.mileage) return;

    const lastLogs = state.mileageLogs.filter(l => l.vehicleId === vehicleId).slice(0, 5);
    let avgVelocity = vehicle.avgDailyKm || 0;
    if (lastLogs.length > 0) {
      const latest = lastLogs[0];
      const days = (new Date().getTime() - new Date(latest.timestamp).getTime()) / (1000 * 3600 * 24);
      if (days > 0.5) { 
        const delta = newMileage - latest.mileage;
        avgVelocity = delta / days;
      }
    }

    const updatedVehicle = { ...vehicle, mileage: newMileage, avgDailyKm: avgVelocity, isDirty: true };
    
    set((state) => ({
      vehicles: state.vehicles.map(v => v.id === vehicleId ? updatedVehicle : v),
      mileageLogs: [{
        id: Math.random().toString(36).substr(2, 9),
        vehicleId,
        mileage: newMileage,
        timestamp: new Date().toISOString(),
        source
      }, ...state.mileageLogs]
    }));

    await localDb.saveVehicle(updatedVehicle);
  },

  completeTask: (taskId, cost, mileage) => {
    const { tasks } = get();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const vehicleId = task.vehicleId;
    set((state) => {
      const updatedTasks = state.tasks.map(t => t.id === taskId ? { ...t, status: 'completed' as const, isDirty: true } : t);
      const updatedTask = updatedTasks.find(t => t.id === taskId);
      if (updatedTask) localDb.saveTask(updatedTask);

      return {
        tasks: updatedTasks,
        serviceLogs: [{
          id: Math.random().toString(36).substr(2, 9),
          vehicleId,
          taskId,
          date: new Date().toISOString(),
          description: task.title,
          cost,
          mileage,
          isDirty: true
        }, ...state.serviceLogs],
        vehicles: state.vehicles.map(v => v.id === vehicleId ? { 
          ...v, 
          healthScore: Math.min(100, v.healthScore + (task.priority === 'high' ? 15 : 5)),
          isDirty: true
        } : v)
      };
    });
  },

  addServiceLog: (log) => set((state) => {
    localDb.saveLog(log);
    return { serviceLogs: [log, ...state.serviceLogs] };
  }),
  
  setTasks: (tasks) => set({ tasks }),
  removeVehicle: (id) => set((state) => {
    localDb.deleteVehicle(id);
    return { vehicles: state.vehicles.filter(v => v.id !== id) };
  }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({ user: null, session: null, vehicles: [], tasks: [], mileageLogs: [], serviceLogs: [], isRecovering: false }),
}));
