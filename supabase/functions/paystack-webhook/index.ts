
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

// Ambient declaration for Deno runtime
declare const Deno: any;

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  // 1. Health Check (GET) - Allows user to verify URL in browser
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        status: 'Operational', 
        message: 'AutoPal NG Webhook Listener is active and awaiting POST signals.',
        timestamp: new Date().toISOString()
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

  // 3. Process POST (The actual Webhook)
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const signature = req.headers.get('x-paystack-signature')
    const rawBody = await req.text()

    if (!rawBody) {
      console.error("Payload Fault: Received POST request with empty body.")
      return new Response(JSON.stringify({ error: 'Empty body' }), { status: 400 })
    }

    // Cryptographic Verification
    // We only verify if a signature is provided. If not, it's likely a malformed test.
    if (!signature) {
       console.error("Security Fault: Missing Paystack Signature Header.")
       return new Response(JSON.stringify({ error: 'Missing Signature' }), { status: 401 })
    }

    const hmac = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(PAYSTACK_SECRET),
      { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
    )
    const signed = await crypto.subtle.sign("HMAC", hmac, new TextEncoder().encode(rawBody))
    const expectedSignature = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('')

    if (signature !== expectedSignature) {
      console.error("Security Fault: Invalid Signature Detected. Verify PAYSTACK_SECRET_KEY matches Dashboard.")
      return new Response(JSON.stringify({ error: 'Invalid Signature' }), { status: 401 })
    }

    const event = JSON.parse(rawBody)
    console.log(`Signal Received: ${event.event}`)
    
    // Only process successful charges
    if (event.event === 'charge.success') {
      const reference = event.data.reference
      const requestedTier = event.data.metadata?.custom_fields?.find((f: any) => f.variable_name === 'requested_tier')?.value || 'standard'

      console.log(`Processing Provisioning for Ref: ${reference} (Tier: ${requestedTier})`)

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      // Update the payment record
      const { data: payment, error: payError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference)
        .select()
        .single()

      if (payError) {
        console.error("Database Handshake Failure:", payError.message)
        // We return 200 anyway so Paystack doesn't keep retrying if it's just a data mismatch
        return new Response(JSON.stringify({ status: 'error', message: payError.message }), { status: 200 })
      }

      console.log(`System Calibrated: User ${payment.user_id} upgraded to ${requestedTier}`)
    }

    return new Response(JSON.stringify({ status: 'processed' }), { status: 200 })
  } catch (err) {
    console.error("Neural Execution Fault:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
