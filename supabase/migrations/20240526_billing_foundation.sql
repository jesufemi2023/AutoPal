
-- SECTION 1: INFRASTRUCTURE & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BILLING LEDGER
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users view own payments') THEN
    CREATE POLICY "Users view own payments" ON payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users insert own payments') THEN
    CREATE POLICY "Users insert own payments" ON payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2. THE IDENTITY LOCK (Updated with Bypass Logic)
CREATE OR REPLACE FUNCTION fn_lock_user_tier()
RETURNS TRIGGER AS $$
DECLARE
  is_provisioning TEXT;
BEGIN
  -- Check if our internal billing trigger has set the 'bypass' flag
  is_provisioning := current_setting('app.provisioning_active', true);

  -- BLOCK if: Tier changed AND Role is authenticated AND NOT in provisioning mode
  IF (OLD.tier IS DISTINCT FROM NEW.tier OR OLD.role IS DISTINCT FROM NEW.role) 
     AND current_setting('role', true) = 'authenticated' 
     AND (is_provisioning IS NULL OR is_provisioning != 'true') THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Tier/Role changes are restricted to secure billing events.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. THE GOLDEN THREAD (Updated to toggle the bypass flag)
CREATE OR REPLACE FUNCTION public.fn_activate_tier_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' THEN
    -- OPEN THE TUNNEL: Set the provisioning flag for this transaction
    PERFORM set_config('app.provisioning_active', 'true', true);

    UPDATE public."Users"
    SET 
      tier = NEW.tier,
      license_expires_at = now() + interval '1 month'
    WHERE id = NEW.user_id;

    -- CLOSE THE TUNNEL: Reset the flag
    PERFORM set_config('app.provisioning_active', 'false', true);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RE-ATTACH ALL TRIGGERS
DROP TRIGGER IF EXISTS tr_activate_tier_on_payment ON payments;
CREATE TRIGGER tr_activate_tier_on_payment
AFTER INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION public.fn_activate_tier_on_payment();

DROP TRIGGER IF EXISTS tr_lock_user_tier ON "Users";
CREATE TRIGGER tr_lock_user_tier BEFORE UPDATE ON "Users" FOR EACH ROW EXECUTE FUNCTION fn_lock_user_tier();

-- 5. THE GOVERNOR (Quota Enforcement)
CREATE OR REPLACE FUNCTION fn_auto_pal_governor()
RETURNS TRIGGER AS $$
DECLARE
  u_tier TEXT;
  u_expiry TIMESTAMPTZ;
  curr_count INTEGER;
  max_limit INTEGER;
BEGIN
  SELECT tier, license_expires_at INTO u_tier, u_expiry FROM public."Users" WHERE id = auth.uid();
  
  IF u_expiry IS NOT NULL AND u_expiry < now() THEN
    RAISE EXCEPTION 'LICENSE_EXPIRED: Your environment is locked. Please renew or upgrade to continue.';
  END IF;

  IF TG_TABLE_NAME = 'vehicles' AND TG_OP = 'INSERT' THEN
    SELECT count(*) INTO curr_count FROM vehicles WHERE owner_id = auth.uid() AND status = 'active';
    max_limit := CASE WHEN u_tier = 'premium' THEN 10 WHEN u_tier = 'standard' THEN 3 ELSE 1 END;
    IF curr_count >= max_limit THEN RAISE EXCEPTION 'QUOTA_EXHAUSTED: Vehicles'; END IF;
  
  ELSIF TG_TABLE_NAME = 'fuel_logs' AND TG_OP = 'INSERT' THEN
    SELECT count(*) INTO curr_count FROM fuel_logs 
    WHERE vehicle_id = NEW.vehicle_id AND captured_at >= now() - interval '30 days';
    max_limit := CASE WHEN u_tier = 'premium' THEN 999 WHEN u_tier = 'standard' THEN 7 ELSE 2 END;
    IF curr_count >= max_limit THEN RAISE EXCEPTION 'QUOTA_EXHAUSTED: Monthly Fuel Logs'; END IF;

  ELSIF TG_TABLE_NAME = 'usage_logs' AND TG_OP = 'INSERT' THEN
    SELECT count(*) INTO curr_count FROM usage_logs 
    WHERE user_id = auth.uid() AND feature_key = NEW.feature_key AND created_at >= now() - interval '30 days';
    
    max_limit := CASE 
      WHEN NEW.feature_key = 'ai_mechanic_monthly' THEN CASE WHEN u_tier = 'premium' THEN 4 WHEN u_tier = 'standard' THEN 2 ELSE 0 END
      WHEN NEW.feature_key = 'ai_scan_monthly' THEN CASE WHEN u_tier = 'premium' THEN 4 WHEN u_tier = 'standard' THEN 2 ELSE 0 END
      ELSE 999
    END;
    
    IF curr_count >= max_limit THEN RAISE EXCEPTION 'QUOTA_EXHAUSTED: %', NEW.feature_key; END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_gov_vehicles ON vehicles;
DROP TRIGGER IF EXISTS tr_gov_fuel ON fuel_logs;
DROP TRIGGER IF EXISTS tr_gov_usage ON usage_logs;

CREATE TRIGGER tr_gov_vehicles BEFORE INSERT ON vehicles FOR EACH ROW EXECUTE FUNCTION fn_auto_pal_governor();
CREATE TRIGGER tr_gov_fuel BEFORE INSERT ON fuel_logs FOR EACH ROW EXECUTE FUNCTION fn_auto_pal_governor();
CREATE TRIGGER tr_gov_usage BEFORE INSERT ON usage_logs FOR EACH ROW EXECUTE FUNCTION fn_auto_pal_governor();
