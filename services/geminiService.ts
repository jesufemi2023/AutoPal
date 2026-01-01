
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, MaintenanceScheduleResponse, BodyType } from "../shared/types.ts";
import { getEnv } from "../shared/utils.ts";

// Updated getAIClient to follow Google GenAI SDK initialization guidelines by using process.env.API_KEY directly.
const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateMaintenanceSchedule = async (
  make: string, 
  model: string, 
  year: number, 
  mileage: number
): Promise<MaintenanceScheduleResponse> => {
  const ai = getAIClient();
  const prompt = `Create a 5-step maintenance schedule for a ${year} ${make} ${model} with ${mileage}km. Focus on tropical high-traffic conditions.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "You are AutoPal Garage AI. Return structured JSON.",
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

export const decodeVIN = async (vin: string): Promise<any> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze VIN: ${vin}`,
    config: {
      systemInstruction: "Identify vehicle specs and body type for a garage UI.",
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
              fuelType: { type: Type.STRING }
            }
          }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const getAdvancedDiagnostic = async (context: any, symptoms: string, isPremium: boolean): Promise<AIResponse> => {
  const ai = getAIClient();
  const model = isPremium ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model: model,
    contents: `Vehicle: ${JSON.stringify(context)}. Symptom: ${symptoms}`,
    config: {
      systemInstruction: "AutoPal Diagnostic AI. Focus on practical Nigerian market solutions.",
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

// Implemented processReceiptOCR to analyze vehicle maintenance receipts using multimodal Gemini.
export const processReceiptOCR = async (base64ImageWithHeader: string): Promise<any> => {
  const ai = getAIClient();
  const base64Data = base64ImageWithHeader.includes(',') 
    ? base64ImageWithHeader.split(',')[1] 
    : base64ImageWithHeader;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: "Analyze this receipt from an auto workshop. Extract: description of work done, total cost (number), date, and current mileage if visible." },
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
