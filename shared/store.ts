
import { create } from 'zustand';
import { 
  Vehicle, UserProfile, MaintenanceTask, FuelLog, ServiceLog, 
  MarketplaceProduct, Tier 
} from './types.ts';

interface AutoPalState {
  user: UserProfile | null;
  session: any | null;
  isInitialized: boolean;
  isLoading: boolean;
  
  // Data
  vehicles: Vehicle[];
  tasks: MaintenanceTask[];
  fuelLogs: FuelLog[];
  serviceLogs: ServiceLog[];
  marketplace: MarketplaceProduct[];
  
  // Actions
  setSession: (session: any) => void;
  setUser: (user: UserProfile | null) => void;
  setInitialized: (initialized: boolean) => void;
  setTier: (tier: Tier) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  removeVehicle: (id: string) => void;
  setTasks: (tasks: MaintenanceTask[]) => void;
  addTask: (task: MaintenanceTask) => void;
  setMarketplace: (items: MarketplaceProduct[]) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAutoPalStore = create<AutoPalState>((set) => ({
  user: null,
  session: null,
  isInitialized: false,
  isLoading: false,
  vehicles: [
    {
      id: 'v_1',
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      vin: 'JTEKB1FX...',
      mileage: 15400,
      healthScore: 92,
      nextServiceMileage: 20000
    }
  ],
  tasks: [
    {
      id: 't_1',
      vehicleId: 'v_1',
      title: 'Oil Change',
      description: 'Standard synthetic oil and filter change.',
      dueMileage: 20000,
      status: 'pending',
      priority: 'medium'
    },
    {
      id: 't_2',
      vehicleId: 'v_1',
      title: 'Brake Inspection',
      description: 'Check front and rear pads.',
      dueMileage: 18000,
      status: 'pending',
      priority: 'high'
    }
  ],
  fuelLogs: [],
  serviceLogs: [],
  marketplace: [
    {
      id: 'p_1',
      name: 'Synthetic Oil 5W-30 (4L)',
      category: 'Fluids',
      price: 25000,
      vendorName: 'Lagos Auto Parts',
      isVerified: true,
      compatibility: ['Toyota', 'Honda', 'Lexus']
    },
    {
      id: 'p_2',
      name: 'Front Brake Pads',
      category: 'Brakes',
      price: 18500,
      vendorName: 'Oando Spares',
      isVerified: true,
      compatibility: ['Toyota Camry', 'Toyota Corolla']
    }
  ],

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
  setTier: (tier) => set((state) => ({ 
    user: state.user ? { ...state.user, tier } : null 
  })),
  setVehicles: (vehicles) => set({ vehicles }),
  addVehicle: (vehicle) => set((state) => ({ vehicles: [vehicle, ...state.vehicles] })),
  removeVehicle: (id) => set((state) => ({ vehicles: state.vehicles.filter(v => v.id !== id) })),
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  setMarketplace: (items) => set({ marketplace: items }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({ user: null, session: null, vehicles: [], tasks: [] }),
}));
