
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
        message: 'AutoPal NG Webhook Listener is active.',
        timestamp: new Date().toISOString()
      }), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  // 2. CORS handling (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const signature = req.headers.get('x-paystack-signature')
    const rawBody = await req.text()

    // Cryptographic Verification
    const hmac = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(PAYSTACK_SECRET),
      { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
    )
    const signed = await crypto.subtle.sign("HMAC", hmac, new TextEncoder().encode(rawBody))
    const expectedSignature = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('')

    if (signature !== expectedSignature) {
      console.error("Security Fault: Invalid Signature Detected")
      return new Response(JSON.stringify({ error: 'Invalid Signature' }), { status: 401 })
    }

    const event = JSON.parse(rawBody)
    
    // Only process successful charges
    if (event.event === 'charge.success') {
      const reference = event.data.reference
      const requestedTier = event.data.metadata?.requested_tier

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      // Update the payment record - this triggers the database activation
      const { data: payment, error: payError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference)
        .select()
        .single()

      if (payError) {
        console.error("Database Update Error:", payError.message)
        throw payError
      }

      console.log(`System Provisioning: Success for user ${payment.user_id} tier ${requestedTier}`)
    }

    return new Response(JSON.stringify({ status: 'processed' }), { status: 200 })
  } catch (err) {
    console.error("Webhook Execution Fault:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
