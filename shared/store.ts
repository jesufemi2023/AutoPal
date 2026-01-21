
import { create } from 'zustand';
import { UserProfile, Vehicle, MaintenanceTask, ServiceLog, FuelLog, TransientVehicle, AIValuationReport, Tier } from './types.ts';
import { localDb } from '../services/localDb.ts';
import { performPushSync } from '../services/syncService.ts';

interface AutoPalState {
  user: UserProfile | null;
  session: any | null;
  isInitialized: boolean;
  isRecovering: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  hasDirtyData: boolean;
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

  getUsageStats: () => {
    monthlyServiceCount: number;
    monthlyFuelCount: number;
    monthlyAiScanCount: number;
    monthlyAiDiagnosticCount: number;
  };

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
  incrementDiagnosticUsage: () => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  updateVehicleStore: (vehicle) => void;
  syncVehicleState: (vehicleId, updates) => void;
  removeVehicleStore: (vehicleId: string) => void;
  updateMileage: (vehicleId, mileage) => void;
  completeTask: (taskId, cost, currentMileage) => void;
  setTasks: (tasks: MaintenanceTask[]) => void;
  setServiceLogs: (logs: ServiceLog[]) => void;
  addServiceLog: (log: ServiceLog) => void;
  updateServiceLogStore: (log: ServiceLog) => void;
  setFuelLogs: (logs: FuelLog[]) => void;
  addFuelLogStore: (log: FuelLog) => void;
  updateFuelLogStore: (log: FuelLog) => void;
  removeFuelLogStore: (logId: string) => void;
  setAIValuationReport: (vehicleId, report) => void;
  setMarketplace: (items: any[]) => void;
  setSuggestedParts: (parts: string[]) => void;
  setMarketplaceFilter: (filter: string) => void;
  reset: () => Promise<void>;
  loadLocalData: () => Promise<void>;
  triggerSync: () => Promise<void>;
  checkDirtyStatus: () => Promise<void>;
}

export const useAutoPalStore = create<AutoPalState>((set, get) => ({
  user: null,
  session: null,
  isInitialized: false,
  isRecovering: false,
  isLoading: false,
  isSyncing: false,
  hasDirtyData: false,
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

  getUsageStats: () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const filterMonthly = (items: any[]) => items.filter(i => {
      const dateStr = i.createdAt || i.serviceDate || i.timestamp;
      if (!dateStr) return false;
      return new Date(dateStr) >= startOfMonth;
    }).length;

    // AI Mechanic usage (Diagnostics) is tracked in localStorage for the month
    const diagHistory = JSON.parse(localStorage.getItem('autopal_diag_usage') || '[]');
    const currentMonthDiagCount = diagHistory.filter((ts: string) => new Date(ts) >= startOfMonth).length;

    return {
      monthlyServiceCount: filterMonthly(get().serviceLogs),
      monthlyFuelCount: filterMonthly(get().fuelLogs),
      monthlyAiScanCount: filterMonthly(Object.values(get().aiValuationReports)),
      monthlyAiDiagnosticCount: currentMonthDiagCount
    };
  },

  incrementDiagnosticUsage: () => {
    const history = JSON.parse(localStorage.getItem('autopal_diag_usage') || '[]');
    history.push(new Date().toISOString());
    localStorage.setItem('autopal_diag_usage', JSON.stringify(history));
    set({ isInitialized: true });
  },

  checkDirtyStatus: async () => {
    const { vehicles, tasks, logs, fuel } = await localDb.getDirtyRecords();
    set({ hasDirtyData: vehicles.length + tasks.length + logs.length + fuel.length > 0 });
  },

  triggerSync: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });
    try {
      await performPushSync();
      await get().checkDirtyStatus();
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
      tasks: localTasks,
      isInitialized: true
    });
    
    await get().checkDirtyStatus();
  },

  setSession: (session) => {
    if (!session) {
      set({ session: null, user: null });
      return;
    }
    const { user: supabaseUser } = session;
    const meta = supabaseUser.user_metadata || {};
    
    // Check for subscription expiry
    const expiryDate = meta.subscription_expires_at ? new Date(meta.subscription_expires_at) : null;
    const isExpired = expiryDate && expiryDate < new Date();
    
    const newUserObj: UserProfile = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      displayName: meta.display_name || meta.full_name || '',
      phone: meta.phone || '',
      tier: isExpired ? 'free' : (meta.tier || 'free'),
      role: meta.role || 'user',
      onboarded: meta.onboarded || false,
      createdAt: supabaseUser.created_at || new Date().toISOString(),
      subscriptionExpiresAt: meta.subscription_expires_at,
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
    const currentActiveId = get().activeVehicleId;
    const isCurrentIdStillValid = vehicles.some(v => v.id === currentActiveId);
    set({ 
      vehicles,
      activeVehicleId: isCurrentIdStillValid ? currentActiveId : (vehicles.length > 0 ? vehicles[0].id : null)
    });
    vehicles.forEach(v => localDb.saveVehicle(v));
    get().checkDirtyStatus();
  },
  addVehicle: (vehicle) => {
    set((state) => ({ 
      vehicles: [vehicle, ...state.vehicles],
      activeVehicleId: vehicle.id 
    }));
    localDb.saveVehicle({ ...vehicle, isDirty: true, syncStatus: 'pending' });
    get().checkDirtyStatus();
  },
  updateVehicleStore: (vehicle) => {
    set((state) => ({
      vehicles: state.vehicles.map(v => v.id === vehicle.id ? vehicle : v)
    }));
    localDb.saveVehicle({ ...vehicle, isDirty: true, syncStatus: 'pending' });
    get().checkDirtyStatus();
  },
  syncVehicleState: (vehicleId, updates) => {
    set((state) => ({
      vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, ...updates } : v)
    }));
    const updated = get().vehicles.find(v => v.id === vehicleId);
    if (updated) {
      localDb.saveVehicle({ ...updated, isDirty: true, syncStatus: 'pending' });
      get().checkDirtyStatus();
    }
  },
  removeVehicleStore: (vehicleId) => {
    set((state) => ({
      vehicles: state.vehicles.filter(v => v.id !== vehicleId),
      activeVehicleId: state.activeVehicleId === vehicleId ? (state.vehicles.find(v => v.id !== vehicleId)?.id || null) : state.activeVehicleId
    }));
    localDb.deleteVehicle(vehicleId);
    get().checkDirtyStatus();
  },
  updateMileage: (vehicleId, mileage) => {
    set((state) => ({
      vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, mileage } : v)
    }));
    const updated = get().vehicles.find(v => v.id === vehicleId);
    if (updated) {
      localDb.saveVehicle({ ...updated, isDirty: true, syncStatus: 'pending' });
      get().checkDirtyStatus();
    }
  },
  completeTask: (taskId, cost, currentMileage) => {
    set((state) => ({
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'completed' } : t)
    }));
    const updatedTask = get().tasks.find(t => t.id === taskId);
    if (updatedTask) {
      localDb.saveTask({ ...updatedTask, isDirty: true, syncStatus: 'pending' });
      get().checkDirtyStatus();
    }
  },
  setTasks: (tasks) => {
    set({ tasks });
    localDb.saveTasksBatch(tasks);
  },
  setServiceLogs: (serviceLogs) => set({ serviceLogs }),
  addServiceLog: (log) => {
    set((state) => ({ serviceLogs: [log, ...state.serviceLogs] }));
    localDb.saveLog({ ...log, isDirty: true, syncStatus: 'pending' });
    get().checkDirtyStatus();
  },
  updateServiceLogStore: (log) => {
    set((state) => ({
      serviceLogs: state.serviceLogs.map(l => l.id === log.id ? log : l)
    }));
    localDb.saveLog({ ...log, isDirty: true, syncStatus: 'pending' });
    get().checkDirtyStatus();
  },
  setFuelLogs: (fuelLogs) => set({ fuelLogs }),
  addFuelLogStore: (log) => {
    set((state) => ({ fuelLogs: [log, ...state.fuelLogs] }));
    localDb.saveFuelLog({ ...log, isDirty: true, syncStatus: 'pending' });
    get().checkDirtyStatus();
  },
  updateFuelLogStore: (log) => {
    set((state) => ({
      fuelLogs: state.fuelLogs.map(l => l.id === log.id ? log : l)
    }));
    localDb.saveFuelLog({ ...log, isDirty: true, syncStatus: 'pending' });
    get().checkDirtyStatus();
  },
  removeFuelLogStore: (logId) => {
    set((state) => ({
      fuelLogs: state.fuelLogs.filter(l => l.id !== logId)
    }));
    localDb.deleteFuelLog(logId);
    get().checkDirtyStatus();
  },
  setAIValuationReport: (vehicleId, report) => set((state) => ({
    aiValuationReports: { ...state.aiValuationReports, [vehicleId]: report }
  })),
  setMarketplace: (marketplace) => set({ marketplace }),
  setSuggestedParts: (parts) => set({ suggestedPartNames: parts }),
  setMarketplaceFilter: (filter) => set({ marketplaceFilter: filter }),

  reset: async () => {
    await localDb.clearDatabase();
    set({ 
      user: null, session: null, vehicles: [], tasks: [], serviceLogs: [], fuelLogs: [],
      aiValuationReports: {}, activeVehicleId: null, transientVehicle: null, guestAttempts: 0,
      isRecovering: false, marketplaceFilter: '', isSyncing: false, hasDirtyData: false
    });
  },
}));
