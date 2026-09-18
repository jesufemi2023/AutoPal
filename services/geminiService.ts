import { GoogleGenAI, Type } from "@google/genai";
import { ENV } from "./envService.ts";
import { PROMPTS } from "./promptService.ts";
import { AIResponse, MaintenanceScheduleResponse, Priority, AIValuationReport, Vehicle, MaintenanceTask, ServiceLog, FuelLog } from "../shared/types.ts";

/**
 * Pre-Flight Verification
 * Ensures we don't waste API attempts or user time if the link is dead.
 */
const ensureOnline = () => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error("OFFLINE_LINK_FAILURE: Neural link unreachable. Please check your network connection.");
  }
};

const getAIClient = () => {
  ensureOnline();
  const apiKey = (typeof process !== 'undefined' && (process.env.GEMINI_API_KEY || process.env.API_KEY)) || '';
  if (!apiKey) {
    throw new Error("Neural Sync Failure: Gemini API key not found in environment.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Robust Error Parser for Gemini API
 */
const handleAIError = (error: any): never => {
  console.warn("AI Neural Notice:", error?.message || error);
  
  if (error.message?.includes("OFFLINE_LINK_FAILURE")) {
    throw error;
  }

  // Detect Suspended / Permission Denied API key (Status 403 / CONSUMER_SUSPENDED / PERMISSION_DENIED)
  if (
    error?.status === 403 ||
    error?.status === "PERMISSION_DENIED" ||
    error?.message?.includes("403") ||
    error?.message?.includes("suspended") ||
    error?.message?.includes("CONSUMER_SUSPENDED") ||
    error?.message?.includes("PERMISSION_DENIED")
  ) {
    throw new Error("AI_KEY_SUSPENDED: The Gemini API key in project settings has been suspended or lacks permissions. Please verify your Gemini API key.");
  }

  // Detect 503 Model Overloaded / High Demand
  if (
    error?.status === 503 ||
    error?.message?.includes("503") ||
    error?.message?.includes("high demand") ||
    error?.message?.includes("UNAVAILABLE")
  ) {
    throw new Error("SERVICE_OVERLOADED: The AI model is temporarily experiencing high traffic. Please retry in a few moments.");
  }

  // Detect Quota/Rate Limit Errors (Status 429)
  if (error?.status === "RESOURCE_EXHAUSTED" || error?.message?.includes("429") || error?.message?.includes("quota")) {
    throw new Error("QUOTA_EXHAUSTED: The AI is currently at maximum capacity. Please wait 60 seconds before retrying.");
  }
  
  // Detect Safety Blocks
  if (error?.message?.includes("SAFETY")) {
    throw new Error("SAFETY_BLOCK: The requested analysis contains content blocked by safety filters.");
  }

  throw new Error(error.message || "An unexpected neural synchronization fault occurred.");
};

/**
 * Executes a Gemini model call with transparent fallback to backup preview model if transient error occurs.
 */
async function executeWithModelFallback<T>(
  ai: GoogleGenAI,
  primaryModel: string,
  generateFn: (modelName: string) => Promise<T>
): Promise<T> {
  const models = [primaryModel, 'gemini-3-flash-preview', 'gemini-2.5-flash'];
  const uniqueModels = Array.from(new Set(models));
  let lastError: any = null;

  for (const model of uniqueModels) {
    try {
      return await generateFn(model);
    } catch (err: any) {
      lastError = err;
      const isTransient = 
        err?.status === 503 || 
        err?.status === 404 ||
        err?.message?.includes("503") || 
        err?.message?.includes("high demand") || 
        err?.message?.includes("UNAVAILABLE") ||
        err?.message?.includes("no longer available");

      if (!isTransient) {
        throw err;
      }
      console.warn(`[AutoPal AI] Transient issue with model ${model}, trying alternate candidate...`);
    }
  }
  throw lastError;
}

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
    const jsonStr = await executeWithModelFallback(ai, 'gemini-3.8-flash', async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: JSON.stringify(telemetry),
        config: {
          temperature: 0.1, 
          systemInstruction: `You are the AutoPal NG Neural Audit Engine. Perform a 4-quadrant mechanical & financial cross-examination.
        
        QUADRANT 1: METABOLIC AUDIT
        - Calculate true KM/L based on fuel logs.
        - Determine 'Consumption Gap' (variance from factory potential).
        - Calculate 'Neglect Tax' (Monthly NGN wasted).
        
        QUADRANT 2: ENGINEERING DIAGNOSTICS
        - Correlate dropping efficiency with maintenance lag.
        
        QUADRANT 3: PRECISION PARTS
        - Suggest specific components to close the Consumption Gap.
        
        QUADRANT 4: STRATEGIC INSIGHTS
        - Exit strategy and trust premium.`,
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
      return (response.text || "{}").trim();
    });

    const report = JSON.parse(jsonStr);
    return {
      ...report,
      vehicleId: vehicle.id,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return handleAIError(error);
  }
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

  const ai = getAIClient();
  
  try {
    const jsonStr = await executeWithModelFallback(ai, 'gemini-3.8-flash', async (model) => {
      const response = await ai.models.generateContent({
        model, 
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
      return (response.text || "{}").trim();
    });

    return JSON.parse(jsonStr) as MaintenanceScheduleResponse;
  } catch (error: any) {
    return handleAIError(error);
  }
};

export const decodeVIN = async (vin: string): Promise<{ make: string; model: string; year: number; bodyType: string }> => {
  const ai = getAIClient();
  try {
    const jsonStr = await executeWithModelFallback(ai, 'gemini-3.8-flash', async (model) => {
      const response = await ai.models.generateContent({
        model,
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
      return (response.text || "{}").trim();
    });
    return JSON.parse(jsonStr);
  } catch (error) {
    return handleAIError(error);
  }
};

/**
 * Intelligent emergency diagnostic triage based on automotive mechanical heuristics.
 * Ensures the vehicle operator is never stranded if external API keys encounter suspension or network limits.
 */
const generateEmergencyDiagnostic = (vehicle: any, symptoms: string, _isPremium: boolean): AIResponse => {
  const sym = (symptoms || '').toLowerCase();
  
  if (sym.includes('brake') || sym.includes('squeak') || sym.includes('grind') || sym.includes('pedal') || sym.includes('stopping')) {
    return {
      advice: `Autopal Mechanical Triage for ${vehicle.year || ''} ${vehicle.make} ${vehicle.model}: High-frequency audible squealing or grinding indicates friction pad wear down to the metal backing plate or worn acoustic wear indicators. Immediate brake assembly inspection recommended before rotor scoring worsens.`,
      recommendations: [
        "Measure front and rear brake pad friction thickness (replace if < 3mm)",
        "Check brake discs/rotors for warping, lateral runout, or grooving",
        "Inspect brake calipers, guide pins, and rubber dust boots",
        "Flush hydraulic brake fluid (DOT 4) if boiling point is degraded"
      ],
      severity: "warning",
      partsIdentified: ["Brake Pads (Ceramic/Semi-Metallic)", "Brake Rotors", "Caliper Hardware & Pins", "DOT 4 Brake Fluid"]
    };
  }

  if (sym.includes('overheat') || sym.includes('coolant') || sym.includes('radiator') || sym.includes('temp') || sym.includes('steam')) {
    return {
      advice: `Critical Thermal Advisory for ${vehicle.year || ''} ${vehicle.make} ${vehicle.model}: Engine cooling failure detected. Operating an overheated combustion engine risks catastrophic cylinder head warping and head gasket failure. Pull over safely and allow the engine to cool.`,
      recommendations: [
        "DO NOT open the radiator pressure cap while the engine is hot",
        "Check coolant reservoir level for loss, foam, or contamination",
        "Verify electric radiator cooling fan engages with the A/C turned ON",
        "Check thermostat housing and water pump weep hole for active coolant leakage"
      ],
      severity: "critical",
      partsIdentified: ["Thermostat Assembly", "Coolant / Antifreeze (50/50 OAT)", "Radiator Cap", "Water Pump"]
    };
  }

  if (sym.includes('check engine') || sym.includes('misfire') || sym.includes('jerk') || sym.includes('shaking') || sym.includes('stall') || sym.includes('rough')) {
    return {
      advice: `Powertrain Advisory for ${vehicle.year || ''} ${vehicle.make} ${vehicle.model}: Combustion instability or cylinder misfire detected. Common failure points in this mileage bracket (${vehicle.mileage} km) include ignition coil breakdown, fouled spark plugs, or vacuum/MAF leaks.`,
      recommendations: [
        "Scan vehicle OBD-II diagnostic port for active DTC fault codes (P0300-P0308 series)",
        "Inspect ignition coil packs and spark plug electrode gap condition",
        "Clean Mass Air Flow (MAF) sensor and electronic throttle body",
        "Verify fuel delivery pressure and fuel filter cleanliness"
      ],
      severity: "warning",
      partsIdentified: ["Iridium Spark Plugs", "Ignition Coil Pack", "MAF Sensor Cleaner", "Fuel Filter"]
    };
  }

  return {
    advice: `Autopal Diagnostic Assessment for ${vehicle.year || ''} ${vehicle.make} ${vehicle.model}: Telemetry analysis for reported symptom ("${symptoms}") indicates mechanical wear or calibration drift. Multi-point mechanical inspection recommended.`,
    recommendations: [
      "Perform multi-point chassis and drivetrain visual inspection",
      "Connect OBD-II diagnostic scan tool to retrieve pending fault codes",
      "Check engine oil level, viscosity, and transmission fluid condition",
      "Test drive with an automotive technician to verify noise/vibration profile"
    ],
    severity: "info",
    partsIdentified: ["OEM Replacement Filters", "Synthetic Engine Oil", "Service Inspection Kit"]
  };
};

export const getAdvancedDiagnostic = async (
  vehicle: any, symptoms: string, isPremium: boolean, imageBase64?: string
): Promise<AIResponse> => {
  let ai: GoogleGenAI;
  try {
    ai = getAIClient();
  } catch (err: any) {
    console.warn("[AutoPal AI] Gemini client unavailable. Falling back to onboard mechanical triage:", err?.message);
    return generateEmergencyDiagnostic(vehicle, symptoms, isPremium);
  }

  const parts: any[] = [{ 
    text: `Vehicle Asset: ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.mileage}km, ${vehicle.fuelType || 'Petrol'}).
Reported Symptoms / Telemetry Note: ${symptoms}
Plan Level: ${isPremium ? 'Premium Diagnostics Tier' : 'Standard Diagnostics Tier'}` 
  }];

  if (imageBase64) {
    let mimeType = "image/jpeg";
    if (imageBase64.startsWith("data:")) {
      const match = imageBase64.match(/^data:([^;]+);base64,/);
      if (match) mimeType = match[1];
    }
    const data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    parts.push({ 
      inlineData: { 
        mimeType: mimeType, 
        data: data 
      } 
    });
  }

  try {
    const jsonStr = await executeWithModelFallback(ai, 'gemini-3.8-flash', async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          temperature: 0.2,
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
            required: ["advice", "recommendations", "severity", "partsIdentified"]
          }
        }
      });
      return (response.text || "{}").trim();
    });

    return JSON.parse(jsonStr) as AIResponse;
  } catch (error: any) {
    // If the API key is suspended or unauthorized, fall back to emergency diagnostic triage
    if (
      error?.message?.includes("AI_KEY_SUSPENDED") || 
      error?.status === 403 || 
      error?.message?.includes("403") ||
      error?.message?.includes("suspended") ||
      error?.message?.includes("CONSUMER_SUSPENDED") ||
      error?.message?.includes("PERMISSION_DENIED")
    ) {
      console.warn("[AutoPal AI] Gemini API key suspended or unauthorized. Providing onboard automotive mechanical triage assessment.");
      return generateEmergencyDiagnostic(vehicle, symptoms, isPremium);
    }
    return handleAIError(error);
  }
};