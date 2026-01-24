
/// <reference lib="deno.ns" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

/**
 * Paystack Webhook Handler for AutoPal NG
 * Securely processes successful payment signals and provisions user tiers.
 */

// Added standard Deno reference above to fix "Cannot find name 'Deno'" errors
Deno.serve(async (req) => {
  // 1. Health Check & Diagnostic (GET)
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        status: 'Operational', 
        message: 'AutoPal NG Webhook Listener is active.',
        diagnostics: {
          paystack_secret_set: !!Deno.env.get('PAYSTACK_SECRET_KEY'),
          supabase_role_set: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
          region: Deno.env.get('SB_REGION') || 'unknown'
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
    const rawBody = await req.text()

    if (!rawBody) {
      return new Response(JSON.stringify({ error: 'Payload missing' }), { status: 400 })
    }

    const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!PAYSTACK_SECRET || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_URL) {
      console.error("Critical Fault: Missing Edge Function Secrets.")
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
      console.error("Security Violation: Invalid Signature.")
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 401 })
    }

    const event = JSON.parse(rawBody)
    console.log(`Signal Received: ${event.event}`)
    
    if (event.event === 'charge.success') {
      const { reference, amount, metadata, customer } = event.data
      const requestedTier = metadata?.custom_fields?.find((f: any) => f.variable_name === 'requested_tier')?.value || 'standard'
      const userId = metadata?.custom_fields?.find((f: any) => f.variable_name === 'user_id')?.value

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      // Resolve User ID if not provided in metadata
      let resolvedUserId = userId
      if (!resolvedUserId) {
        const { data: userRecord } = await supabase.from('Users').select('id').eq('email', customer.email).maybeSingle()
        resolvedUserId = userRecord?.id
      }

      if (!resolvedUserId) {
        console.error(`Provisioning Aborted: No pilot found for ${customer.email}`)
        return new Response(JSON.stringify({ status: 'Ignored: No User' }), { status: 200 })
      }

      console.log(`Activating Protocol: ${requestedTier} for Pilot ${resolvedUserId}`)

      // UPSERT logic prevents race conditions between Webhook and Browser
      const { error: dbError } = await supabase
        .from('payments')
        .upsert({
          user_id: resolvedUserId,
          tier: requestedTier,
          amount: amount / 100, // Convert Kobo to NGN
          reference: reference,
          status: 'success'
        }, { onConflict: 'reference' })

      if (dbError) throw dbError
      
      console.log(`System Provisioned Successfully. Ref: ${reference}`)
    }

    return new Response(JSON.stringify({ status: 'Handled' }), { status: 200 })
  } catch (err: any) {
    console.error("Neural Execution Fault:", err.message)
    return new Response(JSON.stringify({ error: 'Internal Server Error', detail: err.message }), { status: 500 })
  }
})
