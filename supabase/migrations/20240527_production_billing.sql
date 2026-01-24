
-- 1. SECURE PAYMENTS TABLE
-- Ensure users can only read their own payments and insert PENDING ones.
-- Browser-side UPDATES are strictly forbidden by omission of policy.
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert pending payments" ON payments;
CREATE POLICY "Users can insert pending payments" ON payments 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Users can view own payment history" ON payments;
CREATE POLICY "Users can view own payment history" ON payments 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

-- 2. THE PRODUCTION TIER LOCK
-- Re-enabling the block for 'authenticated' users. 
-- Tier changes ONLY allowed if performed by 'service_role' (Edge Function).
CREATE OR REPLACE FUNCTION public.fn_lock_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- ALLOW: If current_user is 'postgres' (Internal) or session is 'service_role'
  IF current_user = 'postgres' OR current_setting('role') = 'service_role' THEN
    -- Automatically extend license on upgrade
    IF OLD.tier IS DISTINCT FROM NEW.tier THEN
      NEW.license_expires_at := now() + interval '1 month';
    END IF;
    RETURN NEW;
  END IF;

  -- BLOCK: Any attempt to change Tier or Role from the Browser
  IF (OLD.tier IS DISTINCT FROM NEW.tier OR OLD.role IS DISTINCT FROM NEW.role) THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Manual Tier Manipulation Blocked.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. REALTIME ENABLEMENT
-- Enable the Users table for Realtime broadcasting so the UI wakes up on payment.
ALTER PUBLICATION supabase_realtime ADD TABLE "Users";
