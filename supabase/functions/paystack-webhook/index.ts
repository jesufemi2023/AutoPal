import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

// Ambient declaration for Deno runtime
declare const Deno: any;

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const DEPLOY_ID = "AUTOPAL-STABLE-V6";

serve(async (req) => {
  const method = req.method;

  // 1. HEALTH CHECK & CORS Preflight
  if (method === 'GET' || method === 'OPTIONS') {
    return new Response(
      JSON.stringify({ 
        status: 'Operational', 
        deploy_id: DEPLOY_ID,
        message: "Neural Link Ready.",
        secrets_configured: !!(PAYSTACK_SECRET && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
      }), 
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-paystack-signature"
        } 
      }
    )
  }

  if (method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const signature = req.headers.get('x-paystack-signature')
    const rawBody = await req.text()

    if (!signature) {
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
      return new Response('Invalid Signature', { status: 401 })
    }

    const event = JSON.parse(rawBody)
    
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
        return new Response('DB Update Failure', { status: 200 })
      }
    }

    return new Response(JSON.stringify({ status: 'processed' }), { status: 200 })
  } catch (err) {
    return new Response('Internal Engine Error', { status: 500 })
  }
})