
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

    // 1. Extract Reference
    let reference = url.searchParams.get('reference') || url.searchParams.get('trxref');
    if (!reference && req.method !== 'GET') {
      const rawBody = await req.text().catch(() => "");
      if (rawBody) {
        try {
          const json = JSON.parse(rawBody);
          reference = findReferenceInObject(json);
        } catch (e) {
          if (rawBody.startsWith('AP-')) reference = rawBody.trim();
        }
      }
    }

    if (!reference) {
      return new Response(JSON.stringify({ error: 'Missing reference' }), { status: 400, headers: corsHeaders });
    }

    console.log(`[${traceId}] Initiating Handshake with Paystack for: ${reference}`);

    // 2. Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!verifyRes.ok) {
      const errTxt = await verifyRes.text();
      console.error(`[${traceId}] Paystack API Rejected Handshake: ${verifyRes.status}`, errTxt);
      return new Response(JSON.stringify({ error: 'Paystack rejected request' }), { status: 502, headers: corsHeaders });
    }

    const paystackData = await verifyRes.json();
    const gatewayStatus = paystackData.data?.status;
    const metadata = paystackData.data?.metadata || {};
    
    console.log(`[${traceId}] Paystack Internal Status: ${gatewayStatus}`);

    if (gatewayStatus !== 'success') {
      return new Response(JSON.stringify({ status: gatewayStatus, reference }), { status: 200, headers: corsHeaders });
    }

    // 3. Database Activation via UPSERT (Race-Condition-Proof)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Extract vital attributes for idempotent record creation
    const userId = metadata.user_id;
    const tier = metadata.requested_tier || reference.split('-')[1]?.toLowerCase();
    const amount = paystackData.data?.amount / 100; // NGN

    if (!userId) {
      console.error(`[${traceId}] Critical Fault: No user_id found in Paystack metadata.`);
      return new Response(JSON.stringify({ error: 'Security metadata missing' }), { status: 400, headers: corsHeaders });
    }

    console.log(`[${traceId}] Provisioning ${tier.toUpperCase()} for User ${userId}...`);

    const { data: result, error: upsertError } = await supabase
      .from('payments')
      .upsert({
        user_id: userId,
        tier: tier,
        amount: amount,
        reference: reference,
        status: 'success'
      }, { onConflict: 'reference' })
      .select();

    if (upsertError) {
      console.error(`[${traceId}] Database Upsert Failure:`, upsertError);
      throw upsertError;
    }

    console.log(`[${traceId}] Activation Complete. Sequence Terminated.`);

    return new Response(
      JSON.stringify({ status: 'success', reference }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error(`[${traceId}] Fatal System Fault:`, err.message);
    return new Response(
      JSON.stringify({ error: 'Internal Server Fault' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
