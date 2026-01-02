
import { GoogleGenAI, Type } from "@google/genai";
import { ENV } from "./envService.ts";
import { PROMPTS } from "./promptService.ts";
import { AIResponse, MaintenanceScheduleResponse } from "../shared/types.ts";

/**
 * AI Client Factory
 * Fixed: Strictly use process.env.API_KEY directly for initialization as per @google/genai guidelines.
 */
const getAIClient = () => {
  if (!process.env.API_KEY) throw new Error("AI_CONFIG_MISSING");
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Robust Decoder with Local Mock Support
 */
export const decodeVIN = async (vin: string): Promise<any> => {
  if (ENV.MOCK_AI) return { make: "Toyota", model: "Camry", year: 2020, bodyType: "sedan" };

  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: ENV.MODEL_FLASH,
    contents: `VIN: ${vin}`,
    config: {
      systemInstruction: PROMPTS.VIN_DECODER,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          make: { type: Type.STRING, nullable: true },
          model: { type: Type.STRING, nullable: true },
          year: { type: Type.INTEGER, nullable: true },
          bodyType: { type: Type.STRING, enum: ["sedan", "suv", "truck", "coupe", "van", "other"], nullable: true }
        }
      }
    }
  });
  
  // Access the .text property directly from GenerateContentResponse
  const data = JSON.parse(response.text || "{}");
  if (!data.make || data.make === "null") throw new Error("INCONCLUSIVE_DECODE");
  return data;
};

/**
 * Localized Roadmap Generator
 */
export const generateMaintenanceSchedule = async (
  make: string, 
  model: string, 
  year: number, 
  mileage: number
): Promise<MaintenanceScheduleResponse> => {
  const ai = getAIClient();
  const prompt = `Vehicle: ${year} ${make} ${model}. Odometer: ${mileage}km.`;

  const response = await ai.models.generateContent({
    model: ENV.MODEL_FLASH,
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
                category: { type: Type.STRING, enum: ["engine", "tires", "brakes", "fluids", "other"] },
                estimatedCost: { type: Type.NUMBER }
              },
              required: ["title", "dueMileage", "priority", "category"]
            }
          }
        },
        required: ["summary", "tasks"]
      }
    }
  });

  // Access the .text property directly from GenerateContentResponse
  return JSON.parse(response.text || "{}") as MaintenanceScheduleResponse;
};

/**
 * Diagnostic service with tiered model selection
 */
export const getAdvancedDiagnostic = async (
  vehicle: any, 
  symptoms: string, 
  isPremium: boolean,
  imageBase64?: string
): Promise<AIResponse> => {
  const ai = getAIClient();
  const modelId = (isPremium && ENV.ENABLE_PREMIUM_AI) ? ENV.MODEL_PRO : ENV.MODEL_FLASH;
  
  const parts: any[] = [
    { text: `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.mileage}km). Problem: ${symptoms}` }
  ];
  
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

  // Access the .text property directly from GenerateContentResponse
  return JSON.parse(response.text || "{}") as AIResponse;
};
