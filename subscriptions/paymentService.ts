
import { ENV } from '../services/envService.ts';
import { supabase } from '../auth/supabaseClient.ts';

declare const PaystackPop: any;

interface PaymentOptions {
  email: string;
  amount: number;
  tier: 'standard' | 'premium';
  onSuccess: (reference: string) => void;
  onCancel: () => void;
}

/**
 * Payment Service
 * Orchestrates Paystack checkout and tier synchronization.
 */
export const initiateUpgrade = (options: PaymentOptions) => {
  const { email, amount, tier, onSuccess, onCancel } = options;
  
  if (!ENV.PAYSTACK_PUBLIC_KEY || ENV.PAYSTACK_PUBLIC_KEY === 'pk_test_placeholder') {
    console.error("Payment Gateway Failure: Missing Public Key.");
    alert("Billing System Offline: Please configure Paystack Public Key in Environment Variables.");
    return;
  }

  const handler = PaystackPop.setup({
    key: ENV.PAYSTACK_PUBLIC_KEY,
    email: email,
    amount: amount * 100, // Paystack uses Kobo
    currency: "NGN",
    ref: `AP-${tier.toUpperCase()}-${Date.now()}`,
    metadata: {
      custom_fields: [
        {
          display_name: "Requested Protocol",
          variable_name: "requested_tier",
          value: tier
        }
      ]
    },
    callback: function(response: any) {
      // Robust reference extraction from Paystack payload
      const ref = response.reference || response.trxref || response.ref;
      console.log(`Payment authorized. Local Ref: ${ref}`);
      
      if (ref) {
        onSuccess(ref);
      } else {
        console.error("Critical: Paystack returned success but no reference was found.", response);
        alert("Payment was successful but the system could not identify the transaction reference. Please contact support.");
      }
    },
    onClose: function() {
      console.log("Payment window closed by user.");
      onCancel();
    }
  });

  handler.openIframe();
};

/**
 * Verifies transaction via secure Edge Function.
 * Standardized to POST with JSON body for maximum stability.
 */
export const verifyTransaction = async (reference: string): Promise<{ status: string }> => {
  if (!supabase) throw new Error("Cloud link unavailable");
  if (!reference) throw new Error("Reference verification requires a valid token.");
  
  // Defensive: Ensure we aren't passing an object
  const cleanReference = typeof reference === 'string' ? reference : (reference as any).reference;
  
  console.log(`Syncing with Cloud: Verifying [${cleanReference}]...`);

  // INVOKE: We send ONLY in the body now to avoid URL length or encoding issues
  // The first argument is JUST the function name.
  const { data, error } = await supabase.functions.invoke(`verify-payment`, {
    method: 'POST',
    body: JSON.stringify({ reference: cleanReference })
  });

  if (error) {
    console.error("Cloud Handshake Error:", error);
    throw error;
  }
  return data;
};
