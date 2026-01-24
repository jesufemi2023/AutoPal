
// Fix: Added Deno declaration to satisfy TypeScript linter
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Standard CORS headers for Supabase Edge Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // 1. Handle Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  // Debugging: Log high-level request info
  const url = new URL(req.url)
  console.log(`[DEBUG] Incoming Request: ${req.method} ${url.href}`);
  console.log(`[DEBUG] Content-Type: ${req.headers.get('content-type')}`);

  try {
    const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!PAYSTACK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server configuration variables are missing.")
    }

    // 2. Comprehensive Reference Extraction
    let reference = url.searchParams.get('reference') || url.searchParams.get('trxref');
    
    // If not in URL, check Body
    if (!reference && (req.method === 'POST' || req.method === 'PUT')) {
      const rawBody = await req.text();
      console.log(`[DEBUG] Raw Body: ${rawBody}`);
      
      if (rawBody) {
        try {
          const body = JSON.parse(rawBody);
          reference = body.reference || body.trxref || (typeof body === 'string' ? body : null);
        } catch (e) {
          console.warn("[DEBUG] Body is not JSON, might be raw string or empty.");
          // If JSON parse fails, check if the raw body itself looks like a reference (AP-...)
          if (rawBody.startsWith('AP-')) {
            reference = rawBody;
          }
        }
      }
    }

    console.log(`[DEBUG] Final Resolved Reference: ${reference}`);

    // Final validation of reference
    if (!reference || reference === 'undefined' || reference === 'null' || reference === '') {
      console.error("Security Fault: No valid transaction reference detected in Request Data.");
      return new Response(
        JSON.stringify({ 
          error: 'Transaction reference is missing from the payload.',
          debug: { url: url.href, method: req.method }
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Syncing: Verifying Paystack transaction [${reference}]...`);

    // 3. Contact Paystack API
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!verifyRes.ok) {
      const errorText = await verifyRes.text();
      console.error(`Paystack API unreachable: Status ${verifyRes.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Payment gateway connection failed.', details: errorText }), 
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const paystackData = await verifyRes.json()
    const status = paystackData.data?.status || 'unknown'

    if (status !== 'success') {
      console.log(`Paystack reported non-success status: ${status}`);
      return new Response(
        JSON.stringify({ status, reference }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Securely Update Database (Service Role bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const { data: existing } = await supabase
      .from('payments')
      .select('status')
      .eq('reference', reference)
      .maybeSingle()

    if (existing?.status !== 'success') {
      console.log(`Finalizing: Transaction ${reference} authorized. Syncing identity records...`);
      const { error: updateError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference)

      if (updateError) throw updateError
    }

    return new Response(
      JSON.stringify({ status: 'success', reference }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error("Edge Runtime Crash:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
