
import { create } from 'zustand';
import { UserProfile, Vehicle, MaintenanceTask, ServiceLog, FuelLog, TransientVehicle, AIValuationReport, UsageLedger } from './types.ts';
import { localDb } from '../services/localDb.ts';
import { syncLedgerPeriod, QUOTAS } from '../services/permissionService.ts';
import { supabase } from '../auth/supabaseClient.ts';

const INITIAL_LEDGER: UsageLedger = {
  periodStart: new Date().toISOString(),
  serviceLogsCount: 0,
  fuelLogsCount: 0,
  aiAuditsCount: 0,
  aiDiagnosisCount: 0,
  aiDiagnosisYearlyCount: 0
};

interface AutoPalState {
  user: UserProfile | null;
  session: any | null;
  isInitialized: boolean;
  isRecovering: boolean;
  isLoading: boolean;
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

  setSession: (session: any) => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  updateUsageLedger: (updates: Partial<UsageLedger>) => Promise<void>;
  setInitialized: (initialized: boolean) => void;
  setRecovering: (isRecovering: boolean) => void;
  setLoading: (loading: boolean) => void;
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
  loadLocalData: (userId: string) => Promise<void>;
}

export const useAutoPalStore = create<AutoPalState>((set, get) => ({
  user: null,
  session: null,
  isInitialized: false,
  isRecovering: false,
  isLoading: false,
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

  loadLocalData: async (userId: string) => {
    // Strictly filter by current user ID to prevent data leakage
    const localVehicles = await localDb.getVehicles(userId);
    
    // Load local ledger if user is free to ensure persistence
    const localLedger = await localDb.getUsageLedger(userId);
    
    set((state) => ({ 
      vehicles: localVehicles,
      activeVehicleId: state.activeVehicleId || (localVehicles.length > 0 ? localVehicles[0].id : null),
      user: state.user && localLedger ? { ...state.user, usageLedger: localLedger } : state.user
    }));
  },

  setSession: async (session) => {
    if (!session) {
      get().reset();
      return;
    }

    const { user: supabaseUser } = session;
    
    let { data: profile, error } = await supabase
      .from('Users')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (error && error.code === 'PGRST116') {
      const { data: newProfile, error: createError } = await supabase
        .from('Users')
        .insert([{
          id: supabaseUser.id,
          tier: 'free',
          usage_ledger: INITIAL_LEDGER
        }])
        .select()
        .single();
      
      if (!createError) profile = newProfile;
    }

    const meta = supabaseUser.user_metadata || {};
    
    // Merge remote ledger with local one if local is fresher (for Free tier)
    let remoteLedger = profile?.usage_ledger || INITIAL_LEDGER;
    const localL = await localDb.getUsageLedger(supabaseUser.id);
    
    // If user is free, local ledger is the source of truth for counts
    const activeLedger = (profile?.tier === 'free' && localL) ? localL : remoteLedger;

    const newUserObj: UserProfile = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      displayName: profile?.['Display name'] || meta.displayName || '',
      phone: profile?.['Phone'] || meta.phone || '',
      tier: profile?.tier || 'free',
      role: meta.role || 'user',
      onboarded: meta.onboarded || false,
      createdAt: supabaseUser.created_at || new Date().toISOString(),
      usageLedger: activeLedger
    };

    const syncedUser = syncLedgerPeriod(newUserObj);
    
    // Save locally immediately
    await localDb.saveUsageLedger(syncedUser.id, syncedUser.usageLedger);

    if (syncedUser.usageLedger.periodStart !== activeLedger.periodStart) {
      await supabase
        .from('Users')
        .update({ usage_ledger: syncedUser.usageLedger })
        .eq('id', syncedUser.id);
    }

    set({ session, user: syncedUser });
    await get().loadLocalData(syncedUser.id);
  },
  
  setUser: (user) => {
    if (user) localDb.saveUsageLedger(user.id, user.usageLedger);
    set({ user });
  },

  updateUsageLedger: async (updates) => {
    const state = get();
    if (!state.user) return;
    
    const newLedger = { ...state.user.usageLedger, ...updates };
    const updatedUser = { ...state.user, usageLedger: newLedger };
    
    set({ user: updatedUser });

    // 1. Always save locally (critical for Free Tier)
    await localDb.saveUsageLedger(state.user.id, newLedger);

    // 2. Save to cloud only if synced tier
    if (QUOTAS[state.user.tier].isCloudSynced && supabase) {
      await supabase
        .from('Users')
        .update({ usage_ledger: newLedger })
        .eq('id', state.user.id);
    }
  },

  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setRecovering: (isRecovering) => set({ isRecovering }),
  setLoading: (loading) => set({ isLoading: loading }),
  setCurrentView: (currentView) => set({ currentView }),
  setEditingVehicle: (editingVehicleId) => set({ editingVehicleId }),
  setActiveVehicleId: (activeVehicleId) => set({ activeVehicleId }),
  setTransientVehicle: (transientVehicle) => set({ transientVehicle }),
  
  incrementGuestAttempts: () => set((state) => {
    const newCount = state.guestAttempts + 1;
    localStorage.setItem('autopal_guest_attempts', newCount.toString());
    return { guestAttempts: newCount };
  }),

  setVehicles: (cloudVehicles) => {
    const currentUser = get().user;
    if (!currentUser) return;

    set((state) => {
      const filteredCloud = cloudVehicles.filter(v => v.ownerId === currentUser.id);
      const merged = [...filteredCloud];
      state.vehicles.forEach(localV => {
        if (localV.ownerId === currentUser.id && !merged.find(m => m.id === localV.id)) {
          merged.push(localV);
        }
      });
      
      return { 
        vehicles: merged,
        activeVehicleId: state.activeVehicleId || (merged.length > 0 ? merged[0].id : null)
      };
    });
    
    cloudVehicles.forEach(v => {
      if (v.ownerId === currentUser.id) localDb.saveVehicle(v);
    });
  },

  addVehicle: (vehicle) => {
    set((state) => ({ 
      vehicles: [vehicle, ...state.vehicles],
      activeVehicleId: vehicle.id 
    }));
    localDb.saveVehicle(vehicle);
  },

  updateVehicleStore: (vehicle) => {
    set((state) => ({
      vehicles: state.vehicles.map(v => v.id === vehicle.id ? vehicle : v)
    }));
    localDb.saveVehicle(vehicle);
  },

  syncVehicleState: (vehicleId, updates) => {
    set((state) => ({
      vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, ...updates } : v)
    }));
    const updated = get().vehicles.find(v => v.id === vehicleId);
    if (updated) localDb.saveVehicle(updated);
  },

  removeVehicleStore: (vehicleId) => {
    set((state) => ({
      vehicles: state.vehicles.filter(v => v.id !== vehicleId),
      tasks: state.tasks.filter(t => t.vehicleId !== vehicleId),
      serviceLogs: state.serviceLogs.filter(l => l.vehicleId !== vehicleId),
      fuelLogs: state.fuelLogs.filter(l => l.vehicleId !== vehicleId),
      activeVehicleId: state.activeVehicleId === vehicleId ? (state.vehicles.length > 1 ? state.vehicles.find(v => v.id !== vehicleId)?.id || null : null) : state.activeVehicleId
    }));
    localDb.deleteVehicle(vehicleId);
  },

  updateMileage: (vehicleId, mileage) => {
    set((state) => ({
      vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, mileage } : v)
    }));
    const updated = get().vehicles.find(v => v.id === vehicleId);
    if (updated) localDb.saveVehicle(updated);
  },

  completeTask: (taskId, cost, currentMileage) => {
    set((state) => ({
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'completed' } : t)
    }));
    const updatedTask = get().tasks.find(t => t.id === taskId);
    if (updatedTask) localDb.saveTask(updatedTask);
  },

  setTasks: (tasks) => {
    const user = get().user;
    if (!user) return;
    const filtered = tasks.filter(t => t.ownerId === user.id || t.vehicleId);
    set({ tasks: filtered });
    localDb.saveTasksBatch(filtered);
  },

  setServiceLogs: (serviceLogs) => {
    set({ serviceLogs });
    serviceLogs.forEach(l => localDb.saveLog(l));
  },

  addServiceLog: (log) => {
    set((state) => ({ serviceLogs: [log, ...state.serviceLogs] }));
    localDb.saveLog(log);
  },

  updateServiceLogStore: (log) => {
    set((state) => ({
      serviceLogs: state.serviceLogs.map(l => l.id === log.id ? log : l)
    }));
    localDb.saveLog(log);
  },

  setFuelLogs: (fuelLogs) => {
    set({ fuelLogs });
    fuelLogs.forEach(l => localDb.saveFuelLog(l));
  },

  addFuelLogStore: (log) => {
    set((state) => ({ fuelLogs: [log, ...state.fuelLogs] }));
    localDb.saveFuelLog(log);
  },

  updateFuelLogStore: (log) => {
    set((state) => ({
      fuelLogs: state.fuelLogs.map(l => l.id === log.id ? log : l)
    }));
    localDb.saveFuelLog(log);
  },

  removeFuelLogStore: (logId) => set((state) => ({
    fuelLogs: state.fuelLogs.filter(l => l.id !== logId)
  })),

  setAIValuationReport: (vehicleId, report) => set((state) => ({
    aiValuationReports: { ...state.aiValuationReports, [vehicleId]: report }
  })),

  setMarketplace: (marketplace) => set({ marketplace }),
  setSuggestedParts: (parts: string[]) => set({ suggestedPartNames: parts }),
  setMarketplaceFilter: (filter: string) => set({ marketplaceFilter: filter }),

  reset: () => set({ 
    user: null, 
    session: null, 
    vehicles: [], 
    tasks: [], 
    serviceLogs: [],
    fuelLogs: [],
    aiValuationReports: {},
    activeVehicleId: null,
    transientVehicle: null,
    guestAttempts: 0,
    isRecovering: false,
    marketplaceFilter: ''
  }),
}));
