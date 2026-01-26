
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI, Type } from "https://esm.sh/@google/genai@1.3.0"
import process from "node:process"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. JWT Authentication Guard
    // Supabase Edge Functions provide the user's JWT in the Authorization header.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized: Neural link requires active pilot session." }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { action, payload } = await req.json();

    // 2. Sanitization Layer (Prompt Injection Prevention)
    const promptString = JSON.stringify(payload).toLowerCase();
    const dangerousPatterns = ["ignore all previous", "developer mode", "system prompt", "you are now a"];
    if (dangerousPatterns.some(p => promptString.includes(p))) {
      return new Response(JSON.stringify({ error: "Security Policy Violation: Malicious command detected." }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    let modelName = 'gemini-3-flash-preview';
    let config: any = { responseMimeType: "application/json" };
    let contents: any;
    let systemInstruction = "";

    switch (action) {
      case 'VALUATION':
        modelName = 'gemini-3-pro-preview';
        systemInstruction = `You are the AutoPal NG Neural Audit Engine. Perform a 4-quadrant mechanical & financial audit. Response must be valid JSON.`;
        contents = JSON.stringify(payload);
        config.responseSchema = {
          type: Type.OBJECT,
          properties: {
            valuationNGN: { type: Type.NUMBER },
            priceRange: { type: Type.OBJECT, properties: { min: { type: Type.NUMBER }, max: { type: Type.NUMBER } }, required: ["min", "max"] },
            marketGrade: { type: Type.STRING },
            auditedScores: { type: Type.OBJECT, properties: { vitality: { type: Type.NUMBER }, discipline: { type: Type.NUMBER } }, required: ["vitality", "discipline"] },
            metabolicAudit: { type: Type.OBJECT, properties: { trueKml: { type: Type.NUMBER }, consumptionGap: { type: Type.NUMBER }, monthlyNeglectTax: { type: Type.NUMBER }, efficiencyTrend: { type: Type.STRING } }, required: ["trueKml", "consumptionGap", "monthlyNeglectTax", "efficiencyTrend"] },
            diagnostics: { type: Type.OBJECT, properties: { faultHypothesis: { type: Type.STRING }, severity: { type: Type.STRING }, reasoning: { type: Type.STRING } }, required: ["faultHypothesis", "severity", "reasoning"] },
            suggestedParts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, reason: { type: Type.STRING }, impact: { type: Type.STRING } } } },
            strategicInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
            insights: { type: Type.OBJECT, properties: { trustPremium: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, description: { type: Type.STRING } } }, mechanicalVitality: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, description: { type: Type.STRING } } }, maintenanceDebt: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, description: { type: Type.STRING } } }, exitStrategy: { type: Type.STRING }, marketComparison: { type: Type.STRING } } }
          }
        };
        break;

      case 'ROADMAP':
        systemInstruction = payload.systemInstruction;
        contents = payload.userPrompt;
        config.responseSchema = {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, dueMileage: { type: Type.NUMBER }, dueDate: { type: Type.STRING }, priority: { type: Type.STRING }, category: { type: Type.STRING }, estimatedCost: { type: Type.NUMBER }, intervalKm: { type: Type.NUMBER }, intervalMonths: { type: Type.NUMBER } } } }
          }
        };
        break;

      case 'VIN_DECODE':
        systemInstruction = `You are a specialized automotive identification expert. Return JSON: { make, model, year, bodyType }.`;
        contents = `Chassis Number (VIN) to analyze: ${payload.vin}`;
        break;

      case 'DIAGNOSTIC':
        modelName = 'gemini-3-pro-preview';
        systemInstruction = `You are a world-class diagnostic mechanic. Assess severity and provide safety advice with required parts.`;
        const parts = [{ text: payload.prompt }];
        if (payload.imageBase64) {
          parts.push({ inlineData: { mimeType: "image/jpeg", data: payload.imageBase64 } } as any);
        }
        contents = { parts };
        config.responseSchema = {
          type: Type.OBJECT,
          properties: {
            advice: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            severity: { type: Type.STRING },
            partsIdentified: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        };
        break;
   
      default:
        throw new Error("Invalid action protocol.");
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: { ...config, systemInstruction }
    });

    return new Response(JSON.stringify({ text: response.text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
