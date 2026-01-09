
import { GoogleGenAI, Type } from "@google/genai";
import { ENV } from "./envService.ts";
import { PROMPTS } from "./promptService.ts";
import { AIResponse, MaintenanceScheduleResponse } from "../shared/types.ts";

const getAIClient = () => {
  /**
   * We prioritize process.env.API_KEY as per instructions.
   * With the vite.config.ts update, this will be physically replaced 
   * by the string value of VITE_API_KEY during the Vercel build.
   */
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
    // Check fallback for development/browser injection
    const fallbackKey = (window as any).process?.env?.API_KEY;
    if (fallbackKey && fallbackKey !== "undefined" && fallbackKey.trim() !== "") {
      return new GoogleGenAI({ apiKey: fallbackKey });
    }
    
    throw new Error(
      "Neural Sync Failure: Gemini API key not found in environment. " +
      "Ensure VITE_API_KEY is set in Vercel and the app is redeployed."
    );
  }

  return new GoogleGenAI({ apiKey });
};

export const decodeVIN = async (vin: string): Promise<{ make: string; model: string; year: number; bodyType: string }> => {
  if (ENV.MOCK_AI) {
    return { make: "Toyota", model: "Camry", year: 2022, bodyType: "sedan" };
  }

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
    
    let text = response.text?.replace(/```json/g, "").replace(/```/g, "").trim() || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("VIN Decode Error:", error);
    throw error;
  }
};

export const generateMaintenanceSchedule = async (
  make: string, model: string, year: number, mileage: number
): Promise<MaintenanceScheduleResponse> => {
  if (ENV.MOCK_AI) {
    return {
      summary: "Mock roadmap generated.",
      tasks: [
        { title: "Standard Oil Change", description: "Synthetic oil and filter replacement.", dueMileage: mileage + 5000, priority: "high", category: "fluids", estimatedCost: 45000 }
      ]
    };
  }

  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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

  let text = response.text?.replace(/```json/g, "").replace(/```/g, "").trim() || "{}";
  return JSON.parse(text) as MaintenanceScheduleResponse;
};

export const getAdvancedDiagnostic = async (
  vehicle: any, symptoms: string, isPremium: boolean, imageBase64?: string
): Promise<AIResponse> => {
  const ai = getAIClient();
  const modelId = (isPremium && ENV.ENABLE_PREMIUM_AI) ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
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

  let text = response.text?.replace(/```json/g, "").replace(/```/g, "").trim() || "{}";
  return JSON.parse(text) as AIResponse;
};
