
// Fix: Added Deno declaration to satisfy TypeScript linter in non-Deno environments
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  const method = req.method;

  // 1. Health Check & CORS Support
  if (method === 'GET' || method === 'OPTIONS') {
    return new Response(
      JSON.stringify({ status: 'Operational', message: "Neural Link Ready." }), 
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
      return new Response('Unauthorized: Missing Signature', { status: 401 })
    }

    // 2. HMAC-SHA512 Verification
    const hmac = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(PAYSTACK_SECRET),
      { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
    )
    const signed = await crypto.subtle.sign("HMAC", hmac, new TextEncoder().encode(rawBody))
    const expectedSignature = Array.from(new Uint8Array(signed))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (signature !== expectedSignature) {
      console.error("Security Fault: HMAC Mismatch Detected.");
      return new Response('Unauthorized: Invalid Signature', { status: 401 })
    }

    const event = JSON.parse(rawBody)
    
    // 3. Database Sync via Service Role
    if (event.event === 'charge.success') {
      const reference = event.data.reference
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      // Update payment status - this triggers the public.Users update automatically via DB trigger
      const { error: payError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference)

      if (payError) {
        console.error("Ledger Update Failure:", payError);
        return new Response('Database Error', { status: 500 })
      }
    }

    return new Response(JSON.stringify({ status: 'processed' }), { status: 200 })
  } catch (err) {
    console.error("Internal Engine Fault:", err);
    return new Response('Internal Engine Error', { status: 500 })
  }
})
