
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
  // 1. CRITICAL: Handle Preflight IMMEDIATELY
  // Using 200 instead of 204 to satisfy strict browser/proxy checks
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: corsHeaders 
    })
  }

  try {
    // 2. Safely extract Environment Variables
    const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') || '';
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!PAYSTACK_SECRET || !SUPABASE_URL) {
      console.error("Environment Configuration Fault: Variables missing.");
      return new Response(JSON.stringify({ error: 'Cloud configuration error' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    let reference = '';

    // 3. Extract Reference (Query Param or Body)
    const url = new URL(req.url);
    reference = url.searchParams.get('reference') || '';

    if (!reference && req.method === 'POST') {
      try {
        const body = await req.json();
        reference = body.reference;
      } catch (e) {
        const text = await req.text();
        if (text && text.includes('AP-')) reference = text;
      }
    }

    if (!reference || reference === 'undefined' || reference === 'null') {
      return new Response(JSON.stringify({ error: 'Missing reference' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`Neural Sync: Verifying [${reference}]...`);

    // 4. Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!verifyRes.ok) {
      console.error(`Paystack unreachable: ${verifyRes.status}`);
      return new Response(JSON.stringify({ error: 'Verification provider offline' }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const paystackData = await verifyRes.json();
    const status = paystackData.data?.status || 'unknown';

    if (status !== 'success') {
      return new Response(JSON.stringify({ status }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 5. Upgrade Database Record
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: existing } = await supabase
      .from('payments')
      .select('status')
      .eq('reference', reference)
      .maybeSingle();

    if (existing?.status !== 'success') {
      const { error: updateError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference);

      if (updateError) throw updateError;
    }

    return new Response(JSON.stringify({ status: 'success' }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error("Critical Function Fault:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})
