
import { GoogleGenAI } from "@google/genai";

/**
 * AI Service for AutoPal NG
 * Responsible for diagnostic reasoning and marketplace intelligence.
 */
export const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured in process.env.");
  }
  return new GoogleGenAI({ apiKey });
};
