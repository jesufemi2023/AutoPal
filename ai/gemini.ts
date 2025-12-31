
import { GoogleGenAI } from "@google/genai";
import { getEnv } from "../shared/utils.ts";

/**
 * AI Service for AutoPal NG
 * Responsible for diagnostic reasoning and marketplace intelligence.
 */
export const getAIClient = () => {
  const apiKey = getEnv('API_KEY');
  if (!apiKey) {
    throw new Error("Gemini API key is not configured in environment.");
  }
  return new GoogleGenAI({ apiKey });
};
