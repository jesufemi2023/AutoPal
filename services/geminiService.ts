
import { GoogleGenAI, Type } from "@google/genai";
import { UnifiedAIDossier, Vehicle, MaintenanceTask, ServiceLog, FuelLog, AIResponse, MaintenanceScheduleResponse } from "../shared/types.ts";
import { PROMPTS } from "./promptService.ts";

const getAIClient = () => {
  if (!process.env.API_KEY) throw new Error("API Key Missing");
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Added missing getAdvancedDiagnostic function
export const getAdvancedDiagnostic = async (
  vehicle: Vehicle,
  symptom: string,
  isPremium: boolean,
  image?: string
): Promise<AIResponse> => {
  const ai = getAIClient();
  const model = isPremium ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

  const parts = [{ text: `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}\nSymptoms: ${symptom}` }];
  if (image) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: image.split(',')[1]
      }
    } as any);
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      systemInstruction: PROMPTS.DIAGNOSTIC_EXPERT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          advice: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["info", "warning", "critical"] },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          partsIdentified: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["advice", "severity", "recommendations"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

// Added missing generateMaintenanceSchedule function
export const generateMaintenanceSchedule = async (
  make: string,
  model: string,
  year: number,
  mileage: number
): Promise<MaintenanceScheduleResponse> => {
  const ai = getAIClient();
  const prompt = `Vehicle: ${year} ${make} ${model} at ${mileage}km.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: PROMPTS.MAINTENANCE_ROADMAP,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                dueMileage: { type: Type.NUMBER },
                priority: { type: Type.STRING, enum: ["low", "medium", "high"] },
                category: { type: Type.STRING },
                estimatedCost: { type: Type.NUMBER },
                intervalKm: { type: Type.NUMBER },
                intervalMonths: { type: Type.NUMBER }
              },
              required: ["title", "description", "dueMileage", "priority", "category"]
            }
          }
        },
        required: ["summary", "tasks"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const runNeuralAudit = async (
  vehicle: Vehicle,
  tasks: MaintenanceTask[],
  serviceLogs: ServiceLog[],
  fuelLogs: FuelLog[]
): Promise<UnifiedAIDossier> => {
  const ai = getAIClient();
  
  const telemetry = {
    vehicle: { make: vehicle.make, model: vehicle.model, year: vehicle.year, mileage: vehicle.mileage, bodyType: vehicle.bodyType },
    pendingTasks: tasks.filter(t => t.status === 'pending'),
    serviceHistory: serviceLogs.map(l => ({ type: l.serviceType, cost: l.cost, ver: l.verificationLevel, cat: l.category })),
    fuelLedger: fuelLogs.slice(0, 15).map(f => ({ km: f.odometerKm, lit: f.liters, full: f.isFullTank }))
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: JSON.stringify(telemetry),
      config: {
        temperature: 0,
        systemInstruction: `You are the AutoPal NG Neural Auditor. Perform a deep mechanical & financial audit of this vehicle.
        
        LOGIC RULES:
        1. vitalityScore: Assess engine/mechanical health (0-100). Penalize heavily for missed critical tasks (oil, timing belt) or unstable fuel KM/L trends.
        2. disciplineScore: Assess user adherence (0-100). Reward "mechanic_verified" logs. Penalize "self_declared" only logs.
        3. valuation: Provide a Nigerian market-specific valuation (NGN). Verified cars get a +15% Trust Premium.
        4. finance: Calculate totalOpEx (Fuel Only) and totalCapEx (Maintenance Only).
        5. equityPreserved: Estimate how much the verified logs have prevented the car from depreciating.
        
        Context: Lagos/Abuja market, high heat, dusty environment.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            valuation: {
              type: Type.OBJECT,
              properties: {
                marketValueNGN: { type: Type.NUMBER },
                priceRange: { type: Type.OBJECT, properties: { min: { type: Type.NUMBER }, max: { type: Type.NUMBER } }, required: ["min", "max"] },
                marketGrade: { type: Type.STRING, enum: ["A+", "A", "B", "C", "D"] }
              },
              required: ["marketValueNGN", "priceRange", "marketGrade"]
            },
            health: {
              type: Type.OBJECT,
              properties: {
                vitalityScore: { type: Type.NUMBER },
                disciplineScore: { type: Type.NUMBER },
                status: { type: Type.STRING, enum: ["pristine", "stable", "degrading", "critical"] }
              },
              required: ["vitalityScore", "disciplineScore", "status"]
            },
            finance: {
              type: Type.OBJECT,
              properties: {
                totalOpEx: { type: Type.NUMBER },
                totalCapEx: { type: Type.NUMBER },
                equityPreserved: { type: Type.NUMBER },
                maintenanceDebt: { type: Type.NUMBER }
              },
              required: ["totalOpEx", "totalCapEx", "equityPreserved", "maintenanceDebt"]
            },
            insights: {
              type: Type.OBJECT,
              properties: {
                metabolicState: { type: Type.STRING },
                trustPremium: { type: Type.STRING },
                exitStrategy: { type: Type.STRING },
                criticalAlert: { type: Type.STRING }
              },
              required: ["metabolicState", "trustPremium", "exitStrategy"]
            }
          },
          required: ["valuation", "health", "finance", "insights"]
        }
      }
    });

    return {
      ...JSON.parse(response.text || "{}"),
      vehicleId: vehicle.id,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Neural Audit Failed:", error);
    throw error;
  }
};
