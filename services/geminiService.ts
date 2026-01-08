
import { GoogleGenAI, Type } from "@google/genai";
import { ENV } from "./envService.ts";
import { PROMPTS } from "./promptService.ts";
import { AIResponse, MaintenanceScheduleResponse, ReceiptData } from "../shared/types.ts";

export const decodeVIN = async (vin: string): Promise<{ make: string; model: string; year: number; bodyType: string }> => {
  if (ENV.MOCK_AI) {
    return { make: "Toyota", model: "Camry", year: 2022, bodyType: "sedan" };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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

export const extractReceiptData = async (imageBase64: string): Promise<ReceiptData> => {
  if (ENV.MOCK_AI) {
    return { vendor: "TotalEnergies Service Center", totalAmount: 25000, date: new Date().toISOString().split('T')[0] };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: data } },
          { text: "Extract receipt details: vendor name, total amount, and date." }
        ]
      },
      config: {
        systemInstruction: "You are a specialized receipt scanner. Extract data precisely. Return JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendor: { type: Type.STRING },
            totalAmount: { type: Type.NUMBER },
            date: { type: Type.STRING, description: "ISO 8601 date YYYY-MM-DD" },
            items: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["vendor", "totalAmount"]
        }
      }
    });

    let text = response.text?.replace(/```json/g, "").replace(/```/g, "").trim() || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Receipt AI Error:", error);
    throw error;
  }
};

export const generateMaintenanceSchedule = async (
  make: string, model: string, year: number, mileage: number
): Promise<MaintenanceScheduleResponse> => {
  if (ENV.MOCK_AI) {
    return {
      summary: "Mock roadmap.",
      tasks: [
        { title: "Oil Change", description: "Standard service", dueMileage: mileage + 5000, priority: "high", category: "fluids", estimatedCost: 45000 }
      ]
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Vehicle: ${year} ${make} ${model}. Odometer: ${mileage}km.`,
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = (isPremium && ENV.ENABLE_PREMIUM_AI) ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  const parts: any[] = [{ text: `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.mileage}km). Problem: ${symptoms}` }];
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
