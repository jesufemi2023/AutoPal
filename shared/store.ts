
import { create } from 'zustand';
import { UserProfile, Vehicle, MaintenanceTask, ServiceLog, FuelLog, TransientVehicle, AIValuationReport } from './types.ts';
import { localDb } from '../services/localDb.ts';
import { performPushSync } from '../services/syncService.ts';

interface AutoPalState {
  user: UserProfile | null;
  session: any | null;
  isInitialized: boolean;
  isRecovering: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  currentView: 'garage' | 'onboarding' | 'marketplace' | 'admin' | 'settings' | 'edit' | 'fuel' | 'service' | 'diagnostic' | 'landing' | 'profile' | 'report';
  editingVehicleId: string | null;
  activeVehicleId: string | null; 
  transientVehicle: TransientVehicle | null;
  guestAttempts: number;
  vehicles: Vehicle[];
  tasks: MaintenanceTask[];
  serviceLogs: ServiceLog[];
  fuelLogs: FuelLog[];
  aiValuationReports: Record<string, AIValuationReport>;
  suggestedPartNames: string[];
  marketplace: any[];
  marketplaceFilter: string;

  setSession: (session: any) => void;
  setUser: (user: UserProfile | null) => void;
  setInitialized: (initialized: boolean) => void;
  setRecovering: (isRecovering: boolean) => void;
  setLoading: (loading: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  setCurrentView: (view: any) => void;
  setEditingVehicle: (id: string | null) => void;
  setActiveVehicleId: (id: string | null) => void;
  setTransientVehicle: (vehicle: TransientVehicle | null) => void;
  incrementGuestAttempts: () => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  updateVehicleStore: (vehicle: Vehicle) => void;
  syncVehicleState: (vehicleId: string, updates: Partial<Vehicle>) => void;
  removeVehicleStore: (vehicleId: string) => void;
  updateMileage: (vehicleId: string, mileage: number) => void;
  completeTask: (taskId: string, cost: number, currentMileage: number) => void;
  setTasks: (tasks: MaintenanceTask[]) => void;
  setServiceLogs: (logs: ServiceLog[]) => void;
  addServiceLog: (log: ServiceLog) => void;
  updateServiceLogStore: (log: ServiceLog) => void;
  setFuelLogs: (logs: FuelLog[]) => void;
  addFuelLogStore: (log: FuelLog) => void;
  updateFuelLogStore: (log: FuelLog) => void;
  removeFuelLogStore: (logId: string) => void;
  setAIValuationReport: (vehicleId: string, report: AIValuationReport) => void;
  setMarketplace: (items: any[]) => void;
  setSuggestedParts: (parts: string[]) => void;
  setMarketplaceFilter: (filter: string) => void;
  reset: () => void;
  loadLocalData: () => Promise<void>;
  triggerSync: () => Promise<void>;
}

export const useAutoPalStore = create<AutoPalState>((set, get) => ({
  user: null,
  session: null,
  isInitialized: false,
  isRecovering: false,
  isLoading: false,
  isSyncing: false,
  currentView: 'landing',
  editingVehicleId: null,
  activeVehicleId: null,
  transientVehicle: null,
  guestAttempts: parseInt(localStorage.getItem('autopal_guest_attempts') || '0'),
  vehicles: [],
  tasks: [],
  serviceLogs: [],
  fuelLogs: [],
  aiValuationReports: {},
  suggestedPartNames: [],
  marketplace: [],
  marketplaceFilter: '',

  triggerSync: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });
    try {
      await performPushSync();
    } finally {
      set({ isSyncing: false });
    }
  },

  loadLocalData: async () => {
    const localVehicles = await localDb.getVehicles();
    const activeId = get().activeVehicleId || (localVehicles.length > 0 ? localVehicles[0].id : null);
    
    let localFuel: FuelLog[] = [];
    let localService: ServiceLog[] = [];
    let localTasks: MaintenanceTask[] = [];

    if (activeId) {
      localFuel = await localDb.getFuelLogs(activeId);
      localService = await localDb.getLogs(activeId);
      localTasks = await localDb.getTasks(activeId);
    }

    set({ 
      vehicles: localVehicles,
      activeVehicleId: activeId,
      fuelLogs: localFuel,
      serviceLogs: localService,
      tasks: localTasks
    });
    
    // Background sync once loaded
    get().triggerSync();
  },

  setSession: (session) => {
    if (!session) {
      if (get().session !== null) set({ session: null, user: null });
      return;
    }
    const { user: supabaseUser } = session;
    const meta = supabaseUser.user_metadata || {};
    const newUserObj: UserProfile = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      displayName: meta.display_name || meta.full_name || '',
      phone: meta.phone || '',
      tier: meta.tier || 'free',
      role: meta.role || 'user',
      onboarded: meta.onboarded || false,
      createdAt: supabaseUser.created_at || new Date().toISOString(),
    };
    set({ session, user: newUserObj });
  },
  
  setUser: (user) => set({ user }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setRecovering: (isRecovering) => set({ isRecovering }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setCurrentView: (currentView) => set({ currentView }),
  setEditingVehicle: (editingVehicleId) => set({ editingVehicleId }),
  setActiveVehicleId: (activeVehicleId) => set({ activeVehicleId }),
  setTransientVehicle: (transientVehicle) => set({ transientVehicle }),
  
  incrementGuestAttempts: () => set((state) => {
    const newCount = state.guestAttempts + 1;
    localStorage.setItem('autopal_guest_attempts', newCount.toString());
    return { guestAttempts: newCount };
  }),

  setVehicles: (vehicles) => {
    set({ 
      vehicles,
      activeVehicleId: get().activeVehicleId || (vehicles.length > 0 ? vehicles[0].id : null)
    });
    vehicles.forEach(v => localDb.saveVehicle(v));
  },
  addVehicle: (vehicle) => {
    set((state) => ({ 
      vehicles: [vehicle, ...state.vehicles],
      activeVehicleId: vehicle.id 
    }));
    localDb.saveVehicle(vehicle);
    get().triggerSync();
  },
  updateVehicleStore: (vehicle) => {
    set((state) => ({
      vehicles: state.vehicles.map(v => v.id === vehicle.id ? vehicle : v)
    }));
    localDb.saveVehicle(vehicle);
    get().triggerSync();
  },
  syncVehicleState: (vehicleId, updates) => {
    set((state) => ({
      vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, ...updates } : v)
    }));
    const updated = get().vehicles.find(v => v.id === vehicleId);
    if (updated) {
      localDb.saveVehicle(updated);
      get().triggerSync();
    }
  },
  removeVehicleStore: (vehicleId) => {
    set((state) => ({
      vehicles: state.vehicles.filter(v => v.id !== vehicleId),
      activeVehicleId: state.activeVehicleId === vehicleId ? (state.vehicles.find(v => v.id !== vehicleId)?.id || null) : state.activeVehicleId
    }));
    localDb.deleteVehicle(vehicleId);
  },
  updateMileage: (vehicleId, mileage) => {
    set((state) => ({
      vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, mileage, isDirty: true } : v)
    }));
    const updated = get().vehicles.find(v => v.id === vehicleId);
    if (updated) {
      localDb.saveVehicle(updated);
      get().triggerSync();
    }
  },
  completeTask: (taskId, cost, currentMileage) => {
    set((state) => ({
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'completed', isDirty: true } : t)
    }));
    const updatedTask = get().tasks.find(t => t.id === taskId);
    if (updatedTask) {
      localDb.saveTask(updatedTask);
      get().triggerSync();
    }
  },
  setTasks: (tasks) => {
    set({ tasks });
    localDb.saveTasksBatch(tasks);
  },
  setServiceLogs: (serviceLogs) => set({ serviceLogs }),
  addServiceLog: (log) => {
    set((state) => ({ serviceLogs: [log, ...state.serviceLogs] }));
    localDb.saveLog(log);
    get().triggerSync();
  },
  updateServiceLogStore: (log) => {
    set((state) => ({
      serviceLogs: state.serviceLogs.map(l => l.id === log.id ? log : l)
    }));
    localDb.saveLog(log);
    get().triggerSync();
  },
  setFuelLogs: (fuelLogs) => set({ fuelLogs }),
  addFuelLogStore: (log) => {
    set((state) => ({ fuelLogs: [log, ...state.fuelLogs] }));
    localDb.saveFuelLog(log);
    get().triggerSync();
  },
  updateFuelLogStore: (log) => {
    set((state) => ({
      fuelLogs: state.fuelLogs.map(l => l.id === log.id ? log : l)
    }));
    localDb.saveFuelLog(log);
    get().triggerSync();
  },
  removeFuelLogStore: (logId) => set((state) => ({
    fuelLogs: state.fuelLogs.filter(l => l.id !== logId)
  })),
  setAIValuationReport: (vehicleId, report) => set((state) => ({
    aiValuationReports: { ...state.aiValuationReports, [vehicleId]: report }
  })),
  setMarketplace: (marketplace) => set({ marketplace }),
  setSuggestedParts: (parts) => set({ suggestedPartNames: parts }),
  setMarketplaceFilter: (filter) => set({ marketplaceFilter: filter }),

  reset: () => set({ 
    user: null, session: null, vehicles: [], tasks: [], serviceLogs: [], fuelLogs: [],
    aiValuationReports: {}, activeVehicleId: null, transientVehicle: null, guestAttempts: 0,
    isRecovering: false, marketplaceFilter: '', isSyncing: false
  }),
}));
