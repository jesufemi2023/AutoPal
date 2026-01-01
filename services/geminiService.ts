
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, MaintenanceScheduleResponse } from "../shared/types.ts";

/**
 * Gemini Service Module
 * Handles all Just-in-Time (JIT) AI operations.
 */

const getAIClient = () => {
  // Use a direct reference to satisfy prompt requirements
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    // If still missing, check window.process.env directly as a fallback for the browser context
    const windowApiKey = (window as any).process?.env?.API_KEY;
    if (windowApiKey) {
      return new GoogleGenAI({ apiKey: windowApiKey });
    }
    
    console.error("Critical: API_KEY not found in process.env or window.process.env");
    throw new Error("Gemini API_KEY is missing. Please ensure it is set as an environment variable in Vercel.");
  }
  
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates a localized maintenance roadmap based on vehicle specs.
 */
export const generateMaintenanceSchedule = async (
  make: string, 
  model: string, 
  year: number, 
  mileage: number
): Promise<MaintenanceScheduleResponse> => {
  const ai = getAIClient();
  const prompt = `Generate a maintenance roadmap for a ${year} ${make} ${model} currently at ${mileage}km. 
  Environment: Tropical (Nigeria), high dust, heavy traffic, variable fuel quality. 
  Return exactly 5 upcoming tasks with realistic estimated costs in NGN.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "You are the AutoPal Mechanical Intelligence engine. You provide accurate, safety-first maintenance schedules. Return ONLY structured JSON.",
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
 * Decodes a 17-digit VIN into structured vehicle specifications.
 */
export const decodeVIN = async (vin: string): Promise<any> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Decode VIN: ${vin}`,
    config: {
      systemInstruction: "You are a VIN decoder for a high-end garage app. Identify make, model, year, body type, and basic technical specs. If the VIN is invalid, return generic placeholders.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          make: { type: Type.STRING },
          model: { type: Type.STRING },
          year: { type: Type.INTEGER },
          bodyType: { type: Type.STRING, enum: ["sedan", "suv", "truck", "coupe", "van", "other"] },
          specs: {
            type: Type.OBJECT,
            properties: {
              engineSize: { type: Type.STRING },
              fuelType: { type: Type.STRING },
              oilGrade: { type: Type.STRING }
            }
          }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

/**
 * Provides real-time diagnostic advice based on symptoms.
 */
export const getAdvancedDiagnostic = async (vehicle: any, symptoms: string, isPremium: boolean): Promise<AIResponse> => {
  const ai = getAIClient();
  const modelName = isPremium ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model: modelName,
    contents: `Asset: ${vehicle.year} ${vehicle.make} ${vehicle.model}. Current Symptoms: ${symptoms}`,
    config: {
      systemInstruction: "You are AutoPal Diagnostic AI. Provide clear, actionable advice.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          advice: { type: Type.STRING },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          severity: { type: Type.STRING, enum: ["info", "warning", "critical"] },
          marketInsight: { type: Type.STRING }
        },
        required: ["advice", "recommendations", "severity"]
      }
    }
  });
  return JSON.parse(response.text || "{}") as AIResponse;
};

/**
 * OCR Service for maintenance receipts.
 */
export const processReceiptOCR = async (base64ImageWithHeader: string): Promise<any> => {
  const ai = getAIClient();
  const base64Data = base64ImageWithHeader.includes(',') 
    ? base64ImageWithHeader.split(',')[1] 
    : base64ImageWithHeader;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: "Analyze this workshop receipt. Extract the date, total amount, and a summary of work done." },
        { inlineData: { mimeType: "image/jpeg", data: base64Data } }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          totalCost: { type: Type.NUMBER },
          date: { type: Type.STRING },
          mileageFound: { type: Type.NUMBER }
        },
        required: ["description", "totalCost"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};
