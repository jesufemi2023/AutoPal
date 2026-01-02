
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, MaintenanceScheduleResponse, AppraisalResult } from "../shared/types.ts";

/**
 * AutoPal Gemini Service - Advanced Vehicle Intelligence
 * Optimized for Nigerian automotive market data and budget constraints.
 */

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("AI_CONFIG_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Decodes VIN into structured vehicle data.
 */
export const decodeVIN = async (vin: string): Promise<any> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Parse this VIN: ${vin}`,
    config: {
      systemInstruction: "You are a professional VIN decoder. Return JSON. If values are unknown, provide best guesses or empty strings.",
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
  
  const data = JSON.parse(response.text || "{}");
  if (!data.make || data.make === "Unknown") throw new Error("INCONCLUSIVE_DECODE");
  return data;
};

/**
 * AI Appraisal: Estimates vehicle value based on current Nigerian market trends.
 */
export const getVehicleAppraisal = async (vehicle: any): Promise<AppraisalResult> => {
  const ai = getAIClient();
  const prompt = `Appraise: ${vehicle.year} ${vehicle.make} ${vehicle.model} with ${vehicle.mileage}km. Health score: ${vehicle.healthScore}%. Market: Nigeria (Lagos/Abuja). Currency: NGN.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "You are a vehicle valuation expert for the Nigerian market. Analyze mileage, age, and health score to provide accurate valuation in NGN.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          estimatedValue: { type: Type.NUMBER },
          priceRange: {
            type: Type.OBJECT,
            properties: {
              min: { type: Type.NUMBER },
              max: { type: Type.NUMBER }
            },
            required: ["min", "max"]
          },
          marketInsight: { type: Type.STRING },
          confidenceScore: { type: Type.NUMBER }
        },
        required: ["estimatedValue", "priceRange", "marketInsight", "confidenceScore"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as AppraisalResult;
};

/**
 * Maintenance roadmap with Nigerian-specific costing.
 */
export const generateMaintenanceSchedule = async (
  make: string, 
  model: string, 
  year: number, 
  mileage: number
): Promise<MaintenanceScheduleResponse> => {
  const ai = getAIClient();
  const prompt = `Plan maintenance for ${year} ${make} ${model} at ${mileage}km in Nigeria. Use local part availability and NGN costs.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "Nigerian Automotive Maintenance Expert. Provide specific local advice.",
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
 * Multimodal Diagnostic: Analyzes images (dash lights, engine parts) + text symptoms.
 */
export const getAdvancedDiagnostic = async (
  vehicle: any, 
  symptoms: string, 
  isPremium: boolean,
  imageBase64?: string
): Promise<AIResponse> => {
  const ai = getAIClient();
  const model = isPremium ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
  
  const parts: any[] = [];
  parts.push({ text: `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.mileage}km). Symptoms: ${symptoms}. Context: Nigerian market, local part names, road conditions.` });
  
  if (imageBase64) {
    const data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: data,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts },
    config: {
      systemInstruction: "You are an expert Nigerian mechanic and automotive diagnostician. Analyze symptoms and images to provide concise, actionable advice. Identify likely faulty parts.",
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
