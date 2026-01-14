
import { create } from 'zustand';
import { UserProfile, Vehicle, MaintenanceTask, ServiceLog, FuelLog, TransientVehicle } from './types.ts';

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
  suggestedPartNames: string[];
  marketplace: any[];
  marketplaceFilter: string;

  setSession: (session: any) => void;
  setUser: (user: UserProfile | null) => void;
  setInitialized: (initialized: boolean) => void;
  setRecovering: (isRecovering: boolean) => void;
  setLoading: (loading: boolean) => void;
  setCurrentView: (view: 'garage' | 'onboarding' | 'marketplace' | 'admin' | 'settings' | 'edit' | 'fuel' | 'service' | 'diagnostic' | 'landing' | 'profile' | 'report') => void;
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
  setMarketplace: (items: any[]) => void;
  setSuggestedParts: (parts: string[]) => void;
  setMarketplaceFilter: (filter: string) => void;
  reset: () => void;
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
  suggestedPartNames: [],
  marketplace: [],
  marketplaceFilter: '',

  setSession: (session) => {
    if (!session) {
      if (get().session !== null) set({ session: null, user: null });
      return;
    }

    const { user: supabaseUser } = session;
    const currentState = get();

    // Mapping Supabase User Metadata to AutoPal UserProfile
    // Keys match exactly what is sent in supabase.auth.updateUser
    const newUserObj: UserProfile = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      displayName: supabaseUser.user_metadata?.displayName || '',
      phone: supabaseUser.user_metadata?.phone || '',
      tier: supabaseUser.user_metadata?.tier || 'free',
      role: supabaseUser.user_metadata?.role || 'user',
      onboarded: supabaseUser.user_metadata?.onboarded || false,
      createdAt: supabaseUser.created_at || new Date().toISOString(),
    };

    // Strict value comparison to prevent re-render loops
    const hasUserChanged = !currentState.user || 
      currentState.user.id !== newUserObj.id ||
      currentState.user.displayName !== newUserObj.displayName ||
      currentState.user.phone !== newUserObj.phone ||
      currentState.user.tier !== newUserObj.tier;

    // Only update if identity or auth token has changed
    if (hasUserChanged || currentState.session?.access_token !== session.access_token) {
      set({ session, user: newUserObj });
    }
  },
  
  setUser: (user) => set({ user }),
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

  setVehicles: (vehicles) => set({ 
    vehicles,
    activeVehicleId: get().activeVehicleId || (vehicles.length > 0 ? vehicles[0].id : null)
  }),
  addVehicle: (vehicle) => set((state) => ({ 
    vehicles: [vehicle, ...state.vehicles],
    activeVehicleId: vehicle.id 
  })),
  updateVehicleStore: (vehicle) => set((state) => ({
    vehicles: state.vehicles.map(v => v.id === vehicle.id ? vehicle : v)
  })),
  syncVehicleState: (vehicleId, updates) => set((state) => ({
    vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, ...updates } : v)
  })),
  removeVehicleStore: (vehicleId) => set((state) => ({
    vehicles: state.vehicles.filter(v => v.id !== vehicleId),
    tasks: state.tasks.filter(t => t.vehicleId !== vehicleId),
    serviceLogs: state.serviceLogs.filter(l => l.vehicleId !== vehicleId),
    fuelLogs: state.fuelLogs.filter(l => l.vehicleId !== vehicleId),
    activeVehicleId: state.activeVehicleId === vehicleId ? (state.vehicles.length > 1 ? state.vehicles.find(v => v.id !== vehicleId)?.id || null : null) : state.activeVehicleId
  })),
  updateMileage: (vehicleId, mileage) => set((state) => ({
    vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, mileage } : v)
  })),
  completeTask: (taskId, cost, currentMileage) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'completed' } : t)
  })),
  setTasks: (tasks) => set({ tasks }),
  setServiceLogs: (serviceLogs) => set({ serviceLogs }),
  addServiceLog: (log) => set((state) => ({ serviceLogs: [log, ...state.serviceLogs] })),
  updateServiceLogStore: (log) => set((state) => ({
    serviceLogs: state.serviceLogs.map(l => l.id === log.id ? log : l)
  })),
  setFuelLogs: (fuelLogs) => set({ fuelLogs }),
  addFuelLogStore: (log) => set((state) => ({ fuelLogs: [log, ...state.fuelLogs] })),
  updateFuelLogStore: (log) => set((state) => ({
    fuelLogs: state.fuelLogs.map(l => l.id === log.id ? log : l)
  })),
  removeFuelLogStore: (logId) => set((state) => ({
    fuelLogs: state.fuelLogs.filter(l => l.id !== logId)
  })),
  setMarketplace: (marketplace) => set({ marketplace }),
  setSuggestedParts: (suggestedPartNames) => set({ suggestedPartNames }),
  setMarketplaceFilter: (filter: string) => set({ marketplaceFilter: filter }),

  reset: () => set({ 
    user: null, 
    session: null, 
    vehicles: [], 
    tasks: [], 
    serviceLogs: [],
    fuelLogs: [],
    activeVehicleId: null,
    transientVehicle: null,
    guestAttempts: 0,
    isRecovering: false,
    marketplaceFilter: ''
  }),
}));
