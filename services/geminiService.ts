
import { GoogleGenAI, Type } from "@google/genai";
import { ENV } from "./envService.ts";
import { PROMPTS } from "./promptService.ts";
import { AIResponse, MaintenanceScheduleResponse, Priority, AIValuationReport, Vehicle, MaintenanceTask, ServiceLog, FuelLog } from "../shared/types.ts";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("Neural Sync Failure: Gemini API key not found in environment.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateAIValuation = async (
  vehicle: Vehicle,
  tasks: MaintenanceTask[],
  serviceLogs: ServiceLog[],
  fuelLogs: FuelLog[]
): Promise<AIValuationReport> => {
  const ai = getAIClient();
  
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: JSON.stringify(telemetry),
      config: {
        temperature: 0.1, 
        systemInstruction: `You are the AutoPal NG Neural Audit Engine. Perform a 4-quadrant mechanical & financial cross-examination.
        
        QUADRANT 1: METABOLIC AUDIT
        - Calculate true KM/L based on fuel logs.
        - Determine 'Consumption Gap' (variance from factory potential for this engine displacement).
        - Calculate 'Neglect Tax' (Monthly NGN wasted due to inefficiency).
        
        QUADRANT 2: ENGINEERING DIAGNOSTICS
        - Correlate dropping efficiency with maintenance lag (e.g. poor KM/L + overdue spark plugs = High Confidence Ignition Fault).
        - Severity: normal, advisory, critical.
        
        QUADRANT 3: PRECISION PARTS
        - Suggest specific components (e.g. Bosch Iridium Plugs, Synthetic Filters) to close the Consumption Gap.
        
        QUADRANT 4: 5 STRATEGIC INSIGHTS
        - Trust Premium Impact: Financial value added by verified records.
        - Optimal Exit: When to sell based on depreciation vs mileage velocity.
        - Maintenance Debt: Cost of neglect vs future risk cost.
        - Regional Benchmark: Performance vs Nigeria average.
        - Fuel Strategy: Recommended brand switch based on log performance.
        
        RULES:
        - Currency: NGN.
        - Scores (vitality/discipline) 0-100.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            valuationNGN: { type: Type.NUMBER },
            priceRange: {
              type: Type.OBJECT,
              properties: { min: { type: Type.NUMBER }, max: { type: Type.NUMBER } },
              required: ["min", "max"]
            },
            marketGrade: { type: Type.STRING, enum: ["A+", "A", "B", "C", "D"] },
            auditedScores: {
              type: Type.OBJECT,
              properties: {
                vitality: { type: Type.NUMBER },
                discipline: { type: Type.NUMBER }
              },
              required: ["vitality", "discipline"]
            },
            metabolicAudit: {
              type: Type.OBJECT,
              properties: {
                trueKml: { type: Type.NUMBER },
                consumptionGap: { type: Type.NUMBER },
                monthlyNeglectTax: { type: Type.NUMBER },
                efficiencyTrend: { type: Type.STRING, enum: ["improving", "stable", "degrading"] }
              },
              required: ["trueKml", "consumptionGap", "monthlyNeglectTax", "efficiencyTrend"]
            },
            diagnostics: {
              type: Type.OBJECT,
              properties: {
                faultHypothesis: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["normal", "advisory", "critical"] },
                reasoning: { type: Type.STRING }
              },
              required: ["faultHypothesis", "severity", "reasoning"]
            },
            suggestedParts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  impact: { type: Type.STRING }
                },
                required: ["name", "reason", "impact"]
              }
            },
            strategicInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
            insights: {
              type: Type.OBJECT,
              properties: {
                trustPremium: { 
                  type: Type.OBJECT,
                  properties: { value: { type: Type.NUMBER }, description: { type: Type.STRING } },
                  required: ["value", "description"]
                },
                mechanicalVitality: {
                  type: Type.OBJECT,
                  properties: { score: { type: Type.NUMBER }, description: { type: Type.STRING } },
                  required: ["score", "description"]
                },
                maintenanceDebt: {
                  type: Type.OBJECT,
                  properties: { value: { type: Type.NUMBER }, description: { type: Type.STRING } },
                  required: ["value", "description"]
                },
                exitStrategy: { type: Type.STRING },
                marketComparison: { type: Type.STRING }
              },
              required: ["trustPremium", "mechanicalVitality", "maintenanceDebt", "exitStrategy", "marketComparison"]
            }
          },
          required: ["valuationNGN", "priceRange", "marketGrade", "auditedScores", "metabolicAudit", "diagnostics", "suggestedParts", "strategicInsights", "insights"]
        }
      }
    });

    const report = JSON.parse(response.text || "{}");
    return {
      ...report,
      vehicleId: vehicle.id,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("AI Neural Audit Failure:", error);
    throw error;
  }
};

const getStandardProtocol = (mileage: number): MaintenanceScheduleResponse => {
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
  
  const oneYearLater = new Date();
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  return {
    summary: "Standard regional maintenance protocol applied (AI Quota Sleep).",
    tasks: [
      { 
        title: "Full Synthetic Oil Service", 
        description: "Premium oil and filter replacement to protect against high tropical heat.", 
        dueMileage: mileage + 5000, 
        dueDate: sixMonthsLater.toISOString().split('T')[0],
        priority: Priority.HIGH, 
        category: "fluids", 
        estimatedCost: 45000,
        intervalKm: 5000,
        intervalMonths: 6
      },
      { 
        title: "Brake System Calibration", 
        description: "Inspect pads, rotors, and flush fluid for heavy stop-and-go urban traffic.", 
        dueMileage: mileage + 10000, 
        dueDate: oneYearLater.toISOString().split('T')[0],
        priority: Priority.HIGH, 
        category: "brakes", 
        estimatedCost: 15000,
        intervalKm: 10000,
        intervalMonths: 12
      },
      { 
        title: "Air Intake & Filter Swap", 
        description: "Replace engine air filter to combat high dust levels in the environment.", 
        dueMileage: mileage + 15000, 
        priority: Priority.MEDIUM, 
        category: "engine", 
        estimatedCost: 12000,
        intervalKm: 15000,
        intervalMonths: 12
      }
    ]
  };
};

export const generateMaintenanceSchedule = async (
  make: string, model: string, year: number, mileage: number
): Promise<MaintenanceScheduleResponse> => {
  if (ENV.MOCK_AI) {
    return getStandardProtocol(mileage);
  }

  const ai = getAIClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Vehicle Profile: ${year} ${make} ${model}. Current Telemetry: ${mileage}km. Environment: ${ENV.REGIONAL_CONTEXT}`,
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
                  dueDate: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["low", "medium", "high"] },
                  category: { type: Type.STRING, enum: ["engine", "tires", "brakes", "fluids", "suspension", "other"] },
                  estimatedCost: { type: Type.NUMBER },
                  intervalKm: { type: Type.NUMBER },
                  intervalMonths: { type: Type.NUMBER }
                },
                required: ["title", "dueMileage", "priority", "category", "intervalKm", "intervalMonths"]
              }
            }
          },
          required: ["summary", "tasks"]
        }
      }
    });

    const jsonStr = (response.text || "{}").trim();
    return JSON.parse(jsonStr) as MaintenanceScheduleResponse;
  } catch (error: any) {
    return getStandardProtocol(mileage);
  }
};

export const decodeVIN = async (vin: string): Promise<{ make: string; model: string; year: number; bodyType: string }> => {
  if (ENV.MOCK_AI) return { make: "Toyota", model: "Camry", year: 2022, bodyType: "sedan" };
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Chassis Number (VIN) to analyze: ${vin}`,
      config: {
        systemInstruction: PROMPTS.VIN_DECODER,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            make: { type: Type.STRING },
            model: { type: Type.STRING },
            year: { type: Type.INTEGER },
            bodyType: { type: Type.STRING, enum: ["sedan", "suv", "truck", "coupe", "van", "other"] }
          },
          required: ["make", "model", "year", "bodyType"]
        }
      }
    });
    const jsonStr = (response.text || "{}").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    throw error;
  }
};

export const getAdvancedDiagnostic = async (
  vehicle: any, symptoms: string, isPremium: boolean, imageBase64?: string
): Promise<AIResponse> => {
  const ai = getAIClient();
  const modelId = 'gemini-3-flash-preview';
  const parts: any[] = [{ text: `Vehicle Asset: ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.mileage}km). Reported Symptoms: ${symptoms}` }];
  if (imageBase64) {
    const data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    parts.push({ inlineData: { mimeType: "image/jpeg", data: data } });
  }
  const response = await ai.models.generateContent({
    model: modelId,
    contents: { parts },
    config: {
      systemInstruction: PROMPTS.DIAGNOSTIC_EXPERT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          advice: { type: Type.STRING },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          severity: { type: Type.STRING, enum: ["info", "warning", "critical"] },
          partsIdentified: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["advice", "recommendations", "severity"]
      }
    }
  });
  const jsonStr = (response.text || "{}").trim();
  return JSON.parse(jsonStr) as AIResponse;
};
