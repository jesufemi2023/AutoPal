
import { ENV } from '../services/envService.ts';
import { supabase } from '../auth/supabaseClient.ts';

declare const PaystackPop: any;

interface PaymentOptions {
  userId: string;
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
  const { userId, email, amount, tier, onSuccess, onCancel } = options;
  
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
      user_id: userId,
      requested_tier: tier,
      custom_fields: [
        {
          display_name: "Requested Protocol",
          variable_name: "requested_tier",
          value: tier
        },
        {
          display_name: "Pilot ID",
          variable_name: "user_id",
          value: userId
        }
      ]
    },
    callback: function(response: any) {
      const ref = response.reference || response.trxref || (response.data && response.data.reference);
      console.log(`Payment authorized. Local Ref: ${ref}`);
      
      if (ref) {
        onSuccess(ref);
      } else {
        console.error("Critical: Paystack returned success but no reference was found.", response);
      }
    },
    onClose: function() {
      onCancel();
    }
  });

  handler.openIframe();
};

/**
 * Verifies transaction via secure Edge Function.
 */
export const verifyTransaction = async (reference: any): Promise<{ status: string }> => {
  if (!supabase) throw new Error("Cloud link unavailable");
  
  let cleanReference = "";
  if (typeof reference === 'string') {
    cleanReference = reference;
  } else if (reference.reference) {
    cleanReference = reference.reference;
  } else if (reference.data && reference.data.reference) {
    cleanReference = reference.data.reference;
  }

  const { data, error } = await supabase.functions.invoke(`verify-payment`, {
    method: 'POST',
    body: { reference: cleanReference }
  });

  if (error) throw error;
  return data;
};
