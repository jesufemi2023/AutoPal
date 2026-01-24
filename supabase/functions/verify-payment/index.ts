
// Fix: Added Deno declaration to satisfy TypeScript linter
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req: Request) => {
  // 1. Explicit Preflight Handling
  // Use 204 No Content for OPTIONS as it's the standard for many proxies
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    })
  }

  try {
    const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!PAYSTACK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("CRITICAL: Environment configuration is incomplete.");
      return new Response(JSON.stringify({ error: 'System Configuration Error' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    let reference = '';

    // 2. Multimodal Extraction
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        reference = body.reference;
        console.log(`Method: POST. Extracted body ref: ${reference}`);
      } catch (e) {
        // Fallback to text for raw string bodies
        const text = await req.text();
        console.log(`Method: POST. JSON parse failed, raw body: ${text}`);
        if (text && text.includes('AP-')) reference = text;
      }
    }

    // 3. Query Param Fallback (Safest for some browser environments)
    if (!reference) {
      const url = new URL(req.url);
      reference = url.searchParams.get('reference') || '';
      console.log(`Method: ${req.method}. Extracted query ref: ${reference}`);
    }

    if (!reference || reference === 'undefined' || reference === 'null') {
      console.error("Validation Fault: No reference identifier provided in request.");
      return new Response(JSON.stringify({ error: 'Missing transaction reference' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`Neural Sync: Verifying [${reference}] with Paystack...`);

    // 4. Verification with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!verifyRes.ok) {
      const errorText = await verifyRes.text();
      console.error(`Paystack API Error (${verifyRes.status}):`, errorText);
      return new Response(JSON.stringify({ status: 'error', message: 'Verification source unreachable' }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const paystackData = await verifyRes.json();
    const status = paystackData.data?.status || 'unknown';
    console.log(`Paystack Status for [${reference}]: ${status}`);

    if (status !== 'success') {
      return new Response(JSON.stringify({ status }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 5. Database Escalation
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Check if we need to update
    const { data: existing } = await supabase
      .from('payments')
      .select('status')
      .eq('reference', reference)
      .maybeSingle();

    if (existing?.status !== 'success') {
      console.log(`Database Provisioning: Updating [${reference}] to SUCCESS.`);
      const { error: updateError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference);

      if (updateError) {
        console.error("PostgreSQL Update Failure:", updateError);
        throw updateError;
      }
    }

    return new Response(JSON.stringify({ status: 'success' }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error("Neural Link Fault:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})
