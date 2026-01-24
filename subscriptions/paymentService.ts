
import { ENV } from '../services/envService.ts';

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
      console.log(`Payment successful. Reference: ${response.reference}`);
      onSuccess(response.reference);
    },
    onClose: function() {
      console.log("Payment window closed by user.");
      onCancel();
    }
  });

  handler.openIframe();
};
