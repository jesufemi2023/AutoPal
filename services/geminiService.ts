
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, MaintenanceScheduleResponse, AppraisalResult } from "../shared/types.ts";

/**
 * AutoPal Gemini Service - Optimized for 10k users / $70 budget.
 * Strategy: Heavy use of Gemini 3 Flash + Structured JSON outputs.
 */

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("AI_CONFIG_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Decodes VIN with robust error handling for manual fallback.
 */
export const decodeVIN = async (vin: string): Promise<any> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identify vehicle: ${vin}`,
      config: {
        systemInstruction: "You are a VIN decoder. Return JSON with make, model, year, and bodyType (sedan, suv, truck, coupe, van, other). If you are unsure or the VIN is invalid, return all fields as null.",
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
    
    const data = JSON.parse(response.text || "{}");
    // If AI couldn't identify, we throw to trigger Manual Fallback in UI
    if (!data.make || data.make === "null") throw new Error("INCONCLUSIVE");
    return data;
  } catch (e) {
    console.error("AI Decode Error:", e);
    throw e; // Bubble up to UI
  }
};

/**
 * Generates a maintenance roadmap specifically for Nigerian conditions.
 */
export const generateMaintenanceSchedule = async (
  make: string, 
  model: string, 
  year: number, 
  mileage: number
): Promise<MaintenanceScheduleResponse> => {
  const ai = getAIClient();
  const prompt = `Generate a 5-step maintenance roadmap for a ${year} ${make} ${model} at ${mileage}km. 
  Environment: Nigeria (high dust, extreme heat, stop-and-go traffic). 
  Include estimated costs in NGN.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "You are AutoPal Mechanical Intel. Provide specific Nigerian-context maintenance advice in JSON format.",
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
 * Diagnostic tool using Pro model for premium tier users.
 */
export const getAdvancedDiagnostic = async (
  vehicle: any, 
  symptoms: string, 
  isPremium: boolean,
  imageBase64?: string
): Promise<AIResponse> => {
  const ai = getAIClient();
  // Budget control: use Pro only for high-value requests
  const model = isPremium ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
  
  const parts: any[] = [];
  parts.push({ text: `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.mileage}km). Symptoms: ${symptoms}` });
  
  if (imageBase64) {
    const data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    parts.push({ inlineData: { mimeType: "image/jpeg", data: data } });
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts },
    config: {
      systemInstruction: "Expert Mechanic. Analyze symptoms and photos. Provide severity, advice, and specific parts needed in JSON.",
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
