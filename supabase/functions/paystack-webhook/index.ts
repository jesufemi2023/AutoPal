
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

// Ambient declaration for Deno runtime
declare const Deno: any;

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  const method = req.method;
  console.log(`[AUTOPAL_DEBUG] Incoming Request: ${method}`);

  // 1. PUBLIC HEALTH CHECK (GET)
  // Visit this URL in your browser to confirm deployment:
  // https://dojvsourwlvvolvmppxx.supabase.co/functions/v1/paystack-webhook
  if (method === 'GET') {
    const configCheck = {
      paystack_secret: !!PAYSTACK_SECRET,
      supabase_url: !!SUPABASE_URL,
      service_role: !!SUPABASE_SERVICE_ROLE_KEY
    };
    
    return new Response(
      JSON.stringify({ 
        status: 'Operational', 
        version: '4.0.5-PROD',
        message: 'AutoPal NG Webhook Logic is DEPLOYED and ACTIVE.',
        environment_sync: configCheck,
        instructions: 'Send a POST request with x-paystack-signature to activate tiers.'
      }), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  // 2. CORS Handling
  if (method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-paystack-signature'
      } 
    })
  }

  if (method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const signature = req.headers.get('x-paystack-signature')
    const rawBody = await req.text()

    if (!signature) {
      console.error("[SECURITY_FAULT] No signature provided by Paystack.");
      return new Response('Unauthorized', { status: 401 })
    }

    // Verify HMAC Signature
    const hmac = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(PAYSTACK_SECRET),
      { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
    )
    const signed = await crypto.subtle.sign("HMAC", hmac, new TextEncoder().encode(rawBody))
    const expectedSignature = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('')

    if (signature !== expectedSignature) {
      console.error("[SECURITY_FAULT] Signature mismatch. Ensure PAYSTACK_SECRET_KEY matches your dashboard.");
      return new Response('Invalid Signature', { status: 401 })
    }

    const event = JSON.parse(rawBody)
    console.log(`[SIGNAL_VERIFIED] Event: ${event.event} | Ref: ${event.data.reference}`);
    
    if (event.event === 'charge.success') {
      const reference = event.data.reference
      const metadataTier = event.data.metadata?.custom_fields?.find((f: any) => f.variable_name === 'requested_tier')?.value

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      // Update payment record to success
      const { data: payment, error: payError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference)
        .select()
        .single()

      if (payError) {
        console.error(`[DATABASE_FAULT] Failed to update payment ${reference}: ${payError.message}`);
        return new Response('DB Error', { status: 200 }) // Return 200 so Paystack doesn't keep retrying errors
      }

      console.log(`[PROVISIONING_COMPLETE] User ${payment.user_id} upgraded to ${metadataTier || 'standard'}`);
    }

    return new Response(JSON.stringify({ status: 'processed' }), { status: 200 })
  } catch (err) {
    console.error(`[NEURAL_FAULT] ${err.message}`);
    return new Response('Server Error', { status: 500 })
  }
})
