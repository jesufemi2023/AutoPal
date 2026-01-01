import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../shared/types.ts";
import { getEnv } from "../shared/utils.ts";

/**
 * Gemini Service Provider
 * Encapsulates all interactions with Google GenAI.
 * Models: gemini-3-flash-preview (Speed/Cost), gemini-3-pro-preview (Deep reasoning).
 */

/** Initializes the Gemini client using secure environment variables */
const getAIClient = () => {
  const apiKey = getEnv('API_KEY');
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Check your Vercel Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Diagnostic Engine
 * Analyzes vehicle data + user symptoms to provide technical repair advice.
 */
export const getAdvancedDiagnostic = async (
  context: any,
  symptoms: string,
  isPremium: boolean
): Promise<AIResponse> => {
  const ai = getAIClient();
  const model = isPremium ? "gemini-3-pro-preview" : "gemini-3-flash-preview";

  const prompt = `
    Analyze the following vehicle context: ${JSON.stringify(context)}
    Reported Symptom: "${symptoms}"
    
    Role: Senior Automotive Diagnostic Engineer (Nigeria Market Expert).
    Tasks:
    1. Identify likely root causes.
    2. Provide actionable repair steps.
    3. Estimate severity for Nigerian road conditions.
    4. Provide pricing insights (Estimated NGN range) for parts and labor in Nigeria.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are AutoPal AI. Return strictly valid JSON tailored for Nigerian vehicle owners.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            advice: { type: Type.STRING, description: "Main diagnostic summary" },
            recommendations: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of repair steps" 
            },
            severity: { 
              type: Type.STRING, 
              enum: ["info", "warning", "critical"] 
            },
            marketInsight: { 
              type: Type.STRING, 
              description: "Cost estimation and vendor advice for Nigeria" 
            }
          },
          required: ["advice", "recommendations", "severity"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from AI");
    
    return JSON.parse(resultText) as AIResponse;
  } catch (err) {
    console.error("AI Generation Error:", err);
    throw new Error("Failed to generate diagnostic report. Please check connection.");
  }
};

/**
 * VIN Decoder
 * Extracts manufacturer details from a VIN string.
 */
export const decodeVIN = async (vin: string): Promise<any> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract vehicle details for VIN: ${vin}. Focus on Make, Model, and Year.`,
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
  } catch (err) {
    console.warn("VIN decoding failed:", err);
    return { make: "Generic", model: "Vehicle", year: new Date().getFullYear() };
  }
};