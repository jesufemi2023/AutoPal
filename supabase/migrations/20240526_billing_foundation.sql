
-- 1. SECURE PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('standard', 'premium')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reference TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users view own payments" ON payments;
  CREATE POLICY "Users view own payments" ON payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
  
  DROP POLICY IF EXISTS "Users insert own pending payments" ON payments;
  CREATE POLICY "Users insert own pending payments" ON payments 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
END $$;

-- 2. THE ACTIVATOR (Handles Provisioning)
CREATE OR REPLACE FUNCTION public.fn_activate_tier_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Logic: If status becomes success, update the User Tier.
  -- This works for both direct INSERT (webhook arrives first) or UPDATE (frontend arrives first).
  IF NEW.status = 'success' AND (TG_OP = 'INSERT' OR OLD.status = 'pending') THEN
    UPDATE public."Users"
    SET 
      tier = NEW.tier,
      license_expires_at = now() + interval '1 month'
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RE-ATTACH (Supports both operations)
DROP TRIGGER IF EXISTS tr_activate_tier_on_payment ON payments;
CREATE TRIGGER tr_activate_tier_on_payment
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION public.fn_activate_tier_on_payment();

-- 3. THE IDENTITY LOCK
CREATE OR REPLACE FUNCTION public.fn_lock_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user = 'postgres' OR current_setting('role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF (OLD.tier IS DISTINCT FROM NEW.tier OR OLD.role IS DISTINCT FROM NEW.role) THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Manual Tier Manipulation Blocked.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_lock_user_tier ON "Users";
CREATE TRIGGER tr_lock_user_tier BEFORE UPDATE ON "Users" FOR EACH ROW EXECUTE FUNCTION fn_lock_user_tier();
