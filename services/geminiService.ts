
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../shared/types.ts";
import { getEnv } from "../shared/utils.ts";

const getAIClient = () => {
  const apiKey = getEnv('API_KEY');
  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }
  return new GoogleGenAI({ apiKey });
};

export const getAdvancedDiagnostic = async (
  context: any,
  symptoms: string,
  isPremium: boolean
): Promise<AIResponse> => {
  const ai = getAIClient();
  const model = isPremium ? "gemini-3-pro-preview" : "gemini-3-flash-preview";

  const prompt = `
    Vehicle Context: ${JSON.stringify(context)}
    User Symptom: "${symptoms}"
    
    You are AutoPal NG, an expert automotive engineer. 
    1. Diagnose the likely issue.
    2. Provide 3-5 specific recommendations.
    3. Categorize severity (info, warning, critical).
    4. Provide a brief "Market Insight" on typical repair costs in Nigeria for this issue.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      systemInstruction: "You provide expert-level vehicle diagnostics in structured JSON. Be concise but technically accurate for the Nigerian market context.",
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

export const decodeVIN = async (vin: string): Promise<any> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Decode this VIN and return details for the Nigerian market: ${vin}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          make: { type: Type.STRING },
          model: { type: Type.STRING },
          year: { type: Type.INTEGER },
          fuelType: { type: Type.STRING },
          engineSize: { type: Type.STRING }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};
