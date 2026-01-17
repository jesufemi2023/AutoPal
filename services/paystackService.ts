import { supabase } from '../auth/supabaseClient.ts';
import { Tier } from '../shared/types.ts';

const PAYSTACK_PUBLIC_KEY = 'pk_test_placeholder'; // Replace with env key

export const PLANS = {
  standard: {
    amount: 70000 * 100, // 70k in kobo
    label: 'Enthusiast License'
  },
  premium: {
    amount: 40000 * 100, // 40k in kobo
    label: 'Fleet Pro License'
  }
};

export const initializePayment = (email: string, tier: Tier, onSuccess: () => void) => {
  const plan = PLANS[tier as keyof typeof PLANS];
  if (!plan) return;

  // @ts-ignore
  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: email,
    amount: plan.amount,
    currency: 'NGN',
    ref: `APNG-${tier.toUpperCase()}-${Date.now()}`,
    callback: async (response: any) => {
      // Trigger Verification Sequence
      const isVerified = await verifyPaymentOnServer(response.reference, tier);
      if (isVerified) {
        onSuccess();
      } else {
        alert("Payment Verification Failed. Please contact support.");
      }
    },
    onClose: () => {
      console.log('Window closed.');
    }
  });
  handler.openIframe();
};

const verifyPaymentOnServer = async (reference: string, tier: Tier): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: { reference, tier }
    });

    if (error) throw error;
    return data.success;
  } catch (err) {
    console.error("Verification Error", err);
    return false;
  }
};