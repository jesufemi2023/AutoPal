
import { GoogleGenAI } from "@google/genai";

/**
 * AI Service for AutoPal NG
 * Responsible for diagnostic reasoning and marketplace intelligence.
 */
export const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("Gemini API key is not configured in environment.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Prompt templates and logic will be added here in the next step.
