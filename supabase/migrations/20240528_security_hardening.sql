
-- 1. HARDEN USAGE LOGS: Prevent users from resetting their own quota
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own usage" ON public.usage_logs;
CREATE POLICY "Users view own usage" ON public.usage_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own usage" ON public.usage_logs;
CREATE POLICY "Users insert own usage" ON public.usage_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Explicitly deny DELETE for authenticated users
DROP POLICY IF EXISTS "Users delete own usage" ON public.usage_logs;
-- Omission of DELETE policy effectively blocks it for RLS-enabled tables

-- 2. HARDEN PAYMENTS: Prevent history manipulation
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert pending payments" ON public.payments;
CREATE POLICY "Users can insert pending payments" ON public.payments 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Users can view own payment history" ON public.payments;
CREATE POLICY "Users can view own payment history" ON public.payments 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

-- 3. PAYMENT VALIDATION ENGINE
-- Ensure tier upgrades match the paid amount to prevent spoofing
CREATE OR REPLACE FUNCTION public.fn_validate_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
  expected_price NUMERIC;
BEGIN
  -- Define price map (Matches frontend)
  expected_price := CASE 
    WHEN NEW.tier = 'standard' THEN 2500 
    WHEN NEW.tier = 'premium' THEN 7500 
    ELSE 999999 -- Fail for unknown tiers
  END;

  IF NEW.status = 'success' AND NEW.amount < expected_price THEN
    RAISE EXCEPTION 'PRICE_MISMATCH: Paid amount % does not meet threshold for % tier.', NEW.amount, NEW.tier;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_validate_payment_amount ON payments;
CREATE TRIGGER tr_validate_payment_amount
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION public.fn_validate_payment_amount();

-- 4. VIN PRIVACY (AUDIT LOGGING)
-- Log when sensitive VIN data is accessed (Optional for Enterprise compliance)
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins only view audit" ON security_audit_logs FOR SELECT TO service_role USING (true);
