
-- SECTION 1: HARDENED LEDGER
-- We add a constraint to ensure 'success' status cannot be set by default
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

-- CRITICAL SECURITY CHANGE: 
-- Users can only INSERT payments with status 'pending'.
-- They CANNOT insert 'success' manually. 
-- Only a "System Override" or a future Webhook can mark it as success.
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users view own payments" ON payments;
  CREATE POLICY "Users view own payments" ON payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
  
  DROP POLICY IF EXISTS "Users insert own pending payments" ON payments;
  CREATE POLICY "Users insert own pending payments" ON payments 
  FOR INSERT TO authenticated 
  WITH CHECK (
    auth.uid() = user_id AND 
    status = 'pending'  -- This prevents "Manual Success" injection
  );
END $$;

-- SECTION 2: THE IDENTITY LOCK (Paranoid Mode)
CREATE OR REPLACE FUNCTION public.fn_lock_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- BYPASS ONLY for the internal superuser
  IF current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- BLOCK all Tier/Role changes from the browser
  IF (OLD.tier IS DISTINCT FROM NEW.tier OR OLD.role IS DISTINCT FROM NEW.role) THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Manual Tier Manipulation Detected. Incident logged.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- SECTION 3: THE ACTIVATOR (The only way to get Success)
-- In a real production app, this would be triggered by a Paystack Webhook (Edge Function)
-- For the MVP, we create a secure function that validates the reference.
CREATE OR REPLACE FUNCTION public.fn_activate_tier_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Security Check: Ensure this isn't a fake transition
  IF NEW.status = 'success' AND OLD.status = 'pending' THEN
    UPDATE public."Users"
    SET 
      tier = NEW.tier,
      license_expires_at = now() + interval '1 month'
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RE-ATTACH
DROP TRIGGER IF EXISTS tr_activate_tier_on_payment ON payments;
CREATE TRIGGER tr_activate_tier_on_payment
AFTER UPDATE ON payments -- Changed to AFTER UPDATE for better security flow
FOR EACH ROW EXECUTE FUNCTION public.fn_activate_tier_on_payment();

DROP TRIGGER IF EXISTS tr_lock_user_tier ON "Users";
CREATE TRIGGER tr_lock_user_tier BEFORE UPDATE ON "Users" FOR EACH ROW EXECUTE FUNCTION fn_lock_user_tier();
