
// Fixed: Removed problematic lib reference and added Deno declaration to satisfy compiler in environments without Deno types
declare const Deno: any;
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

/**
 * Paystack Webhook Handler for AutoPal NG
 * Securely processes successful payment signals and provisions user tiers.
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().split('-')[0];
  console.log(`[${requestId}] Webhook Request Received: ${req.method}`);

  // 1. Health Check & Diagnostic (GET)
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        status: 'Operational', 
        message: 'AutoPal NG Webhook Listener is active.',
        diagnostics: {
          paystack_secret_set: !!Deno.env.get('PAYSTACK_SECRET_KEY'),
          supabase_role_set: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
          supabase_url_set: !!Deno.env.get('SUPABASE_URL'),
          timestamp: new Date().toISOString()
        }
      }), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  // 2. CORS handling (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-paystack-signature'
      } 
    })
  }

  // 3. Process POST (Webhook Signal)
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const signature = req.headers.get('x-paystack-signature')
    if (!signature) {
      console.error(`[${requestId}] Missing Paystack Signature Header.`);
      return new Response(JSON.stringify({ error: 'Missing Signature' }), { status: 401 })
    }

    const rawBody = await req.text()
    if (!rawBody) {
      console.error(`[${requestId}] Empty Payload Received.`);
      return new Response(JSON.stringify({ error: 'Empty Body' }), { status: 400 })
    }

    const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!PAYSTACK_SECRET || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_URL) {
      console.error(`[${requestId}] Configuration Fault: Missing Environment Variables.`);
      return new Response(JSON.stringify({ error: 'Server Configuration Incomplete' }), { status: 500 })
    }

    // Cryptographic Signature Verification
    const hmac = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(PAYSTACK_SECRET),
      { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
    )
    const signed = await crypto.subtle.sign("HMAC", hmac, new TextEncoder().encode(rawBody))
    const expectedSignature = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('')

    if (signature !== expectedSignature) {
      console.error(`[${requestId}] Security Violation: Signature mismatch.`);
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 401 })
    }

    const event = JSON.parse(rawBody)
    console.log(`[${requestId}] Processing Event: ${event.event} | Ref: ${event.data?.reference}`);
    
    if (event.event === 'charge.success') {
      const { reference, amount, metadata, customer } = event.data
      const requestedTier = metadata?.custom_fields?.find((f: any) => f.variable_name === 'requested_tier')?.value || 'standard'
      const userId = metadata?.custom_fields?.find((f: any) => f.variable_name === 'user_id')?.value

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      // Resolve User ID if not provided in metadata (Fallback to Email)
      let resolvedUserId = userId
      if (!resolvedUserId) {
        console.log(`[${requestId}] User ID missing in metadata, attempting email resolution...`);
        const { data: userRecord, error: userError } = await supabase
          .from('Users')
          .select('id')
          .eq('email', customer.email)
          .maybeSingle()
        
        if (userError) {
          console.error(`[${requestId}] Database error during user resolution:`, userError.message);
          throw userError;
        }
        resolvedUserId = userRecord?.id
      }

      if (!resolvedUserId) {
        console.error(`[${requestId}] Provisioning Aborted: No pilot record found for ${customer.email}`);
        return new Response(JSON.stringify({ status: 'Ignored: No User Record Found' }), { status: 200 })
      }

      console.log(`[${requestId}] Executing Provisioning: ${requestedTier} for Pilot ${resolvedUserId}`);

      // UPSERT record - Database trigger tr_activate_tier_on_payment handles the rest
      const { error: dbError } = await supabase
        .from('payments')
        .upsert({
          user_id: resolvedUserId,
          tier: requestedTier,
          amount: amount / 100, // Paystack Kobo to NGN
          reference: reference,
          status: 'success'
        }, { onConflict: 'reference' })

      if (dbError) {
        console.error(`[${requestId}] Database Upsert Failure:`, dbError.message);
        throw dbError;
      }
      
      console.log(`[${requestId}] Success: Environment Synchronized for Ref: ${reference}`);
    } else {
      console.log(`[${requestId}] Event Ignored: ${event.event}`);
    }

    return new Response(JSON.stringify({ status: 'Handled', requestId }), { status: 200 })
  } catch (err: any) {
    console.error(`[${requestId}] Neural Execution Fault:`, err.message);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', requestId, detail: err.message }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
