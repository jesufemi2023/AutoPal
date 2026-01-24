import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

// Ambient declaration for Deno runtime
declare const Deno: any;

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Build timestamp to verify deployment - if you see this in your browser, the custom code is active.
const DEPLOY_ID = "AUTOPAL-STABLE-V5";

serve(async (req) => {
  const method = req.method;
  const url = new URL(req.url);

  // 1. HEALTH CHECK (What you see when you visit the URL in a browser)
  if (method === 'GET') {
    return new Response(
      JSON.stringify({ 
        status: 'Operational', 
        deploy_id: DEPLOY_ID,
        message: "Webhook listening for Paystack events.",
        ready: !!(PAYSTACK_SECRET && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
      }), 
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
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

  // 3. SECURE MESSAGE PROCESSING (The "Doorbell" logic)
  if (method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const signature = req.headers.get('x-paystack-signature')
    const rawBody = await req.text()

    if (!signature) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Verify HMAC Signature (Ensures the message actually came from Paystack)
    const hmac = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(PAYSTACK_SECRET),
      { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
    )
    const signed = await crypto.subtle.sign("HMAC", hmac, new TextEncoder().encode(rawBody))
    const expectedSignature = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('')

    if (signature !== expectedSignature) {
      console.error("[SECURITY] Signature mismatch.");
      return new Response('Invalid Signature', { status: 401 })
    }

    const event = JSON.parse(rawBody)
    
    // If payment was successful, find the user and upgrade their tier
    if (event.event === 'charge.success') {
      const reference = event.data.reference
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      const { data: payment, error: payError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference)
        .select()
        .single()

      if (payError) {
        console.error("[DATABASE ERROR]", payError);
        return new Response('DB Error', { status: 200 })
      }
      
      console.log(`[UPGRADE] Account activated for reference: ${reference}`);
    }

    return new Response(JSON.stringify({ status: 'processed' }), { status: 200 })
  } catch (err) {
    console.error("[SERVER ERROR]", err);
    return new Response('Server Error', { status: 500 })
  }
})