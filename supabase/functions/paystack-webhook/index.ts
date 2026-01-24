
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

// Fix: Ambient declaration for the Deno global namespace to resolve 'Cannot find name Deno' errors
declare const Deno: any;

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  try {
    const signature = req.headers.get('x-paystack-signature')
    const rawBody = await req.text()

    // 1. CRYPTOGRAPHIC VERIFICATION
    // We hash the body with our secret. If it doesn't match Paystack's signature, it's a hack.
    const hmac = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(PAYSTACK_SECRET),
      { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
    )
    const signed = await crypto.subtle.sign("HMAC", hmac, new TextEncoder().encode(rawBody))
    const expectedSignature = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('')

    if (signature !== expectedSignature) {
      return new Response(JSON.stringify({ error: 'Invalid Signature' }), { status: 401 })
    }

    const event = JSON.parse(rawBody)
    if (event.event === 'charge.success') {
      const reference = event.data.reference
      const requestedTier = event.data.metadata?.requested_tier

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      // 2. ATOMIC FULFILLMENT
      // We update the payment status. This triggers the DB trigger to upgrade the user.
      const { data: payment, error: payError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference)
        .select()
        .single()

      if (payError) throw payError

      console.log(`Successfully provisioned ${requestedTier} for user ${payment.user_id}`)
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
