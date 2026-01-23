
-- 1. INFRASTRUCTURE: Track ephemeral usage (AI Scans, etc)
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL, -- e.g. 'ai_mechanic_monthly', 'ai_scan_monthly'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation
DROP POLICY IF EXISTS "Users view own usage" ON usage_logs;
CREATE POLICY "Users view own usage" ON usage_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own usage" ON usage_logs;
CREATE POLICY "Users insert own usage" ON usage_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 2. IDENTITY LOCK: Prevent users from self-upgrading their tier via Client API
CREATE OR REPLACE FUNCTION fn_lock_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- If the request is from an 'authenticated' user (Client API), block tier/role changes
  IF (OLD.tier IS DISTINCT FROM NEW.tier OR OLD.role IS DISTINCT FROM NEW.role) 
     AND current_setting('role') = 'authenticated' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Tier/Role changes are restricted to secure billing events.';
  END IF;

  -- Set/Extend Expiry on tier activation
  IF OLD.tier IS DISTINCT FROM NEW.tier THEN
    NEW.license_expires_at := now() + interval '1 month';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_lock_user_tier ON "Users";
CREATE TRIGGER tr_lock_user_tier BEFORE UPDATE ON "Users"
FOR EACH ROW EXECUTE FUNCTION fn_lock_user_tier();

-- 3. THE GOVERNOR: Central Quota Enforcement Logic
CREATE OR REPLACE FUNCTION fn_auto_pal_governor()
RETURNS TRIGGER AS $$
DECLARE
  u_tier TEXT;
  u_expiry TIMESTAMPTZ;
  curr_count INTEGER;
  max_limit INTEGER;
  record_exists BOOLEAN;
BEGIN
  -- Identify the pilot's tier and status
  SELECT tier, license_expires_at INTO u_tier, u_expiry FROM "Users" WHERE id = auth.uid();
  
  -- Hard Expiration Check: Prevent all additions if license is expired
  IF u_expiry IS NOT NULL AND u_expiry < now() THEN
    RAISE EXCEPTION 'LICENSE_EXPIRED: Your environment is locked. Please renew or upgrade to continue.';
  END IF;

  -- Logic for VEHICLES
  IF TG_TABLE_NAME = 'vehicles' AND TG_OP = 'INSERT' THEN
    SELECT EXISTS(SELECT 1 FROM vehicles WHERE id = NEW.id) INTO record_exists;
    IF NOT record_exists THEN
      SELECT count(*) INTO curr_count FROM vehicles WHERE owner_id = auth.uid() AND status = 'active';
      max_limit := CASE WHEN u_tier = 'premium' THEN 10 WHEN u_tier = 'standard' THEN 3 ELSE 1 END;
      IF curr_count >= max_limit THEN 
        RAISE EXCEPTION 'QUOTA_EXHAUSTED: Vehicles (Current Tier Limit: %)', max_limit; 
      END IF;
    END IF;
  
  -- Logic for FUEL LOGS
  ELSIF TG_TABLE_NAME = 'fuel_logs' AND TG_OP = 'INSERT' THEN
    SELECT EXISTS(SELECT 1 FROM fuel_logs WHERE id = NEW.id) INTO record_exists;
    IF NOT record_exists THEN
      SELECT count(*) INTO curr_count FROM fuel_logs 
      WHERE vehicle_id = NEW.vehicle_id AND captured_at >= now() - interval '30 days';
      max_limit := CASE WHEN u_tier = 'premium' THEN 999 WHEN u_tier = 'standard' THEN 7 ELSE 2 END;
      IF curr_count >= max_limit THEN RAISE EXCEPTION 'QUOTA_EXHAUSTED: Monthly Fuel Logs'; END IF;
    END IF;

  -- Logic for SERVICE LOGS
  ELSIF TG_TABLE_NAME = 'service_logs' AND TG_OP = 'INSERT' THEN
    SELECT EXISTS(SELECT 1 FROM service_logs WHERE id = NEW.id) INTO record_exists;
    IF NOT record_exists THEN
      SELECT count(*) INTO curr_count FROM service_logs 
      WHERE vehicle_id = NEW.vehicle_id;
      max_limit := CASE WHEN u_tier = 'premium' THEN 999 WHEN u_tier = 'standard' THEN 8 ELSE 4 END;
      IF curr_count >= max_limit THEN 
        RAISE EXCEPTION 'QUOTA_EXHAUSTED: Service Log Capacity (Total Limit: % reached)', max_limit; 
      END IF;
    END IF;

  -- Logic for EPHEMERAL USAGE (Neural Link and AI Mechanic)
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

-- 4. APPLY THE GOVERNOR
DROP TRIGGER IF EXISTS tr_gov_vehicles ON vehicles;
DROP TRIGGER IF EXISTS tr_gov_fuel ON fuel_logs;
DROP TRIGGER IF EXISTS tr_gov_service ON service_logs;
DROP TRIGGER IF EXISTS tr_gov_usage ON usage_logs;

CREATE TRIGGER tr_gov_vehicles BEFORE INSERT ON vehicles FOR EACH ROW EXECUTE FUNCTION fn_auto_pal_governor();
CREATE TRIGGER tr_gov_fuel BEFORE INSERT ON fuel_logs FOR EACH ROW EXECUTE FUNCTION fn_auto_pal_governor();
CREATE TRIGGER tr_gov_service BEFORE INSERT ON service_logs FOR EACH ROW EXECUTE FUNCTION fn_auto_pal_governor();
CREATE TRIGGER tr_gov_usage BEFORE INSERT ON usage_logs FOR EACH ROW EXECUTE FUNCTION fn_auto_pal_governor();
