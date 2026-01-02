
import { GoogleGenAI, Type } from "@google/genai";
import { ENV } from "./envService.ts";
import { PROMPTS } from "./promptService.ts";
import { AIResponse, MaintenanceScheduleResponse } from "../shared/types.ts";

/**
 * VIN Decoding with Fail-Soft Logic
 * Uses Gemini 3 Flash to extract vehicle metadata from a raw VIN.
 */
export const decodeVIN = async (vin: string): Promise<{ make: string; model: string; year: number; bodyType: string }> => {
  if (ENV.MOCK_AI) {
    return { make: "Toyota", model: "Camry", year: 2022, bodyType: "sedan" };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Chassis Number (VIN) to analyze: ${vin}`,
    config: {
      systemInstruction: PROMPTS.VIN_DECODER,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          make: { type: Type.STRING, description: "The vehicle manufacturer (e.g., Honda, Toyota)" },
          model: { type: Type.STRING, description: "The specific model name (e.g., Civic, Corolla)" },
          year: { type: Type.INTEGER, description: "The production year" },
          bodyType: { 
            type: Type.STRING, 
            enum: ["sedan", "suv", "truck", "coupe", "van", "other"],
            description: "Categorization of the vehicle body style"
          }
        },
        required: ["make", "model", "year", "bodyType"]
      }
    }
  });
  
  const text = response.text;
  if (!text) throw new Error("EMPTY_AI_RESPONSE");
  
  const data = JSON.parse(text);
  if (!data.make || !data.model) throw new Error("INCONCLUSIVE_VIN_DECODE");
  
  return data;
};

/**
 * Localized Roadmap Generation
 */
export const generateMaintenanceSchedule = async (
  make: string, 
  model: string, 
  year: number, 
  mileage: number
): Promise<MaintenanceScheduleResponse> => {
  if (ENV.MOCK_AI) {
    return {
      summary: "Mock optimized roadmap for local testing.",
      tasks: [
        { title: "Synthetic Oil Change", description: "Replace oil filter and 5L 0W-20", dueMileage: mileage + 5000, priority: "high", category: "fluids", estimatedCost: 45000 },
        { title: "Brake Pad Inspection", description: "Check front pads for wear", dueMileage: mileage + 8000, priority: "medium", category: "brakes", estimatedCost: 5000 }
      ]
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Vehicle: ${year} ${make} ${model}. Odometer: ${mileage}km.`;

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

  return JSON.parse(response.text || "{}") as MaintenanceScheduleResponse;
};

/**
 * Symptom Diagnosis with Multi-Modal Vision support
 */
export const getAdvancedDiagnostic = async (
  vehicle: any, 
  symptoms: string, 
  isPremium: boolean,
  imageBase64?: string
): Promise<AIResponse> => {
  if (ENV.MOCK_AI) return { advice: "Checking the auxiliary belt is recommended.", recommendations: ["Inspect belt tension", "Check for cracks"], severity: "warning" };

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = (isPremium && ENV.ENABLE_PREMIUM_AI) ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
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

  return JSON.parse(response.text || "{}") as AIResponse;
};
