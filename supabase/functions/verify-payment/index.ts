
// Fix: Added Deno declaration to satisfy TypeScript linter
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

/**
 * Omnivorous Search: Recursively finds a value starting with 'AP-' in any object
 */
function findReferenceInObject(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;
  
  // Check common keys first for performance
  const direct = obj.reference || obj.trxref || obj.ref;
  if (typeof direct === 'string' && direct.startsWith('AP-')) return direct;

  // Deep recursive search
  for (const value of Object.values(obj)) {
    if (typeof value === 'string' && value.startsWith('AP-')) {
      return value;
    } else if (typeof value === 'object') {
      const found = findReferenceInObject(value);
      if (found) return found;
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  const url = new URL(req.url)
  const traceId = crypto.randomUUID().substring(0, 8);
  
  try {
    const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!PAYSTACK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Cloud environment variables are not initialized.")
    }

    // 1. Extract Reference from URL
    let reference = url.searchParams.get('reference') || url.searchParams.get('trxref');
    
    // 2. Extract Reference from Body (Standard or Nested Webhook)
    if (!reference && req.method !== 'GET') {
      const rawBody = await req.text().catch(() => "");
      if (rawBody) {
        try {
          const json = JSON.parse(rawBody);
          reference = findReferenceInObject(json);
          console.log(`[${traceId}] Found reference via deep-search: ${reference}`);
        } catch (e) {
          if (rawBody.startsWith('AP-')) reference = rawBody.trim();
        }
      }
    }

    if (!reference || reference === 'undefined' || reference === 'null') {
      console.error(`[${traceId}] Identification Fault: Payload was unreadable or missing AP- token.`);
      return new Response(
        JSON.stringify({ error: 'Missing transaction reference.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${traceId}] Verifying: ${reference}`);

    // 3. Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!verifyRes.ok) {
      const errorDetail = await verifyRes.text();
      console.error(`[${traceId}] Gateway Rejected Request: ${verifyRes.status}`);
      return new Response(
        JSON.stringify({ error: 'Gateway verification failed.', details: errorDetail }), 
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const paystackData = await verifyRes.json()
    const status = paystackData.data?.status || 'unknown'

    if (status !== 'success') {
      return new Response(
        JSON.stringify({ status, reference }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Update Database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: existing } = await supabase
      .from('payments')
      .select('status')
      .eq('reference', reference)
      .maybeSingle()

    if (existing?.status !== 'success') {
      console.log(`[${traceId}] Authorized. Finalizing database state...`);
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
    console.error(`[${traceId}] Fatal Crash:`, err.message);
    return new Response(
      JSON.stringify({ error: 'Internal Server Fault' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
