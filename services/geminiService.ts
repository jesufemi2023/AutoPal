
import { supabase } from "../auth/supabaseClient.ts";
import { ENV } from "./envService.ts";
import { PROMPTS } from "./promptService.ts";
import { 
  AIResponse, MaintenanceScheduleResponse, Priority, AIValuationReport, 
  Vehicle, MaintenanceTask, ServiceLog, FuelLog 
} from "../shared/types.ts";

/**
 * Proxy Bridge to Supabase Edge Function
 * This prevents exposure of the API_KEY to the client-side bundle.
 */
const invokeAIProxy = async (action: string, payload: any) => {
  if (!supabase) throw new Error("Cloud synchronization offline.");
  
  // 1. Explicitly retrieve the active session token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // 2. Invoke Function with Hard-Bound Authorization Header
  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: { action, payload },
    headers: token ? {
      Authorization: `Bearer ${token}`
    } : {}
  });

  // 3. Handle Network or SDK Errors
  if (error) {
    console.error("AI Proxy Network/SDK Fault:", error);
    
    if (error.message?.includes("401") || (error as any).status === 401) {
      throw new Error("AUTH_REQUIRED: Your secure session has expired. Please sign out and sign back in to refresh your neural link.");
    }
    
    // Provide a more descriptive error if we get the generic non-2xx message
    if (error.message?.includes("non-2xx")) {
      throw new Error("PROX_FAULT: The neural bridge returned an error. This usually indicates a missing API_KEY secret in Supabase or an internal function crash. Check your Supabase function logs for details.");
    }
    
    throw new Error(error.message || "Neural Handshake Failed. Check your connection.");
  }

  // 4. Handle logic errors wrapped inside a 200 response (Controlled Failures)
  if (data?.error) {
    console.warn("Neural Proxy Logic Alert:", data.error);
    throw new Error(data.error);
  }

  if (!data?.text) {
    throw new Error("Neural link returned empty data sequence. Check if the model is responding.");
  }

  try {
    return JSON.parse(data.text);
  } catch (e) {
    console.warn("Proxy returned non-JSON text, returning raw string:", data.text);
    return data.text;
  }
};

export const generateAIValuation = async (
  vehicle: Vehicle,
  tasks: MaintenanceTask[],
  serviceLogs: ServiceLog[],
  fuelLogs: FuelLog[]
): Promise<AIValuationReport> => {
  const telemetry = {
    vehicle: { 
      make: vehicle.make, 
      model: vehicle.model, 
      year: vehicle.year, 
      mileage: vehicle.mileage, 
      bodyType: vehicle.bodyType, 
      fuel: vehicle.fuelType,
      engineSize: vehicle.engineSize || 'unknown',
      specs: vehicle.specs 
    },
    pendingTasks: tasks.filter(t => t.status === 'pending').map(t => ({ title: t.title, due: t.dueMileage, cost: t.estimatedCost, cat: t.category })),
    recentService: serviceLogs.slice(0, 15).map(l => ({ type: l.serviceType, date: l.serviceDate, km: l.mileageAtService, cost: l.cost, ver: l.verificationLevel, cat: l.category })),
    recentFuel: fuelLogs.slice(0, 15).map(l => ({ km: l.odometerKm, lit: l.liters, cost: l.totalCost, full: l.isFullTank, station: l.vendor }))
  };

  const report = await invokeAIProxy('VALUATION', telemetry);
  return {
    ...report,
    vehicleId: vehicle.id,
    timestamp: new Date().toISOString()
  };
};

export const generateMaintenanceSchedule = async (
  make: string, model: string, year: number, mileage: number
): Promise<MaintenanceScheduleResponse> => {
  if (ENV.MOCK_AI) {
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    return {
      summary: "Standard regional maintenance protocol applied (Mock Mode).",
      tasks: [{ 
        title: "Full Synthetic Oil Service", 
        description: "Premium oil replacement.", 
        dueMileage: mileage + 5000, 
        dueDate: sixMonthsLater.toISOString().split('T')[0],
        priority: Priority.HIGH, 
        category: "fluids", 
        estimatedCost: 45000,
        intervalKm: 5000,
        intervalMonths: 6
      }]
    };
  }

  return await invokeAIProxy('ROADMAP', {
    systemInstruction: PROMPTS.MAINTENANCE_ROADMAP,
    userPrompt: `Vehicle Profile: ${year} ${make} ${model}. Current Telemetry: ${mileage}km. Environment: ${ENV.REGIONAL_CONTEXT}`
  });
};

export const decodeVIN = async (vin: string): Promise<{ make: string; model: string; year: number; bodyType: string }> => {
  return await invokeAIProxy('VIN_DECODE', { vin });
};

export const getAdvancedDiagnostic = async (
  vehicle: any, symptoms: string, isPremium: boolean, imageBase64?: string
): Promise<AIResponse> => {
  const payload = {
    prompt: `Vehicle Asset: ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.mileage}km). Reported Symptoms: ${symptoms}`,
    imageBase64: imageBase64?.includes(",") ? imageBase64.split(",")[1] : imageBase64
  };

  return await invokeAIProxy('DIAGNOSTIC', payload);
};
