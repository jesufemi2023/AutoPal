
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI, Type } from "https://esm.sh/@google/genai@1.3.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    // DEBUG: Log the presence of the auth header to function console
    console.log(`[Neural-Handshake] Action: ${action}, Authorized: ${!!authHeader}`);

    // 2. Hybrid Security Policy
    // Roadmaps and VIN Decoding are "Public Pass" actions to drive conversion.
    // Diagnostics and Valuations require an active Pilot Session (JWT).
    const isPublicAction = ['ROADMAP', 'VIN_DECODE'].includes(action);
    
    if (!authHeader && !isPublicAction) {
      console.error("[Security-Fault] Blocked unauthorized attempt on restricted action:", action);
      return new Response(JSON.stringify({ 
        error: "Unauthorized: Neural link requires active pilot session for this action." 
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const apiKey = Deno.env.get('API_KEY');
    if (!apiKey) throw new Error("Neural Engine configuration missing (API_KEY).");

    const ai = new GoogleGenAI({ apiKey });
    let modelName = 'gemini-3-flash-preview';
    let config: any = { responseMimeType: "application/json" };
    let contents: any;
    let systemInstruction = "";

    // 3. Action Protocol Routing
    switch (action) {
      case 'VALUATION':
        modelName = 'gemini-3-pro-preview';
        systemInstruction = `You are the AutoPal NG Neural Audit Engine. Perform a 4-quadrant mechanical & financial audit. Response must be valid JSON.`;
        contents = [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }];
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
        contents = [{ role: 'user', parts: [{ text: payload.userPrompt }] }];
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
        contents = [{ role: 'user', parts: [{ text: `Decode VIN: ${payload.vin}` }] }];
        break;

      case 'DIAGNOSTIC':
        modelName = 'gemini-3-pro-preview';
        systemInstruction = `You are a world-class diagnostic mechanic. Assess severity and provide safety advice with required parts.`;
        const diagParts: any[] = [{ text: payload.prompt }];
        if (payload.imageBase64) {
          diagParts.push({ inlineData: { mimeType: "image/jpeg", data: payload.imageBase64 } });
        }
        contents = [{ role: 'user', parts: diagParts }];
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
        throw new Error("Invalid action protocol requested.");
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
    console.error("Neural Proxy Fault:", err.message);
    return new Response(JSON.stringify({ error: err.message || "Internal Brain Failure" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
