
-- SECTION 1: INFRASTRUCTURE & EXTENSIONS
-- Ensure UUID generation is available (Crucial for preventing silent API hangs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BILLING LEDGER: Record every provisioning transaction
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users view own payments'
  ) THEN
    CREATE POLICY "Users view own payments" ON payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- SECTION 2: THE RE-ENGINEERED GOVERNOR
-- Updated for 0/2/4 Intelligence limits
CREATE OR REPLACE FUNCTION fn_auto_pal_governor()
RETURNS TRIGGER AS $$
DECLARE
  u_tier TEXT;
  u_expiry TIMESTAMPTZ;
  curr_count INTEGER;
  max_limit INTEGER;
  record_exists BOOLEAN;
BEGIN
  -- Identify the pilot's tier and status from the case-sensitive "Users" table
  SELECT tier, license_expires_at INTO u_tier, u_expiry FROM public."Users" WHERE id = auth.uid();
  
  -- 1. Hard Expiration Check: Prevent all additions if license is expired
  IF u_expiry IS NOT NULL AND u_expiry < now() THEN
    RAISE EXCEPTION 'LICENSE_EXPIRED: Your environment is locked. Please renew or upgrade to continue.';
  END IF;

  -- 2. Logic for VEHICLES
  IF TG_TABLE_NAME = 'vehicles' AND TG_OP = 'INSERT' THEN
    SELECT EXISTS(SELECT 1 FROM vehicles WHERE id = NEW.id) INTO record_exists;
    IF NOT record_exists THEN
      SELECT count(*) INTO curr_count FROM vehicles WHERE owner_id = auth.uid() AND status = 'active';
      max_limit := CASE WHEN u_tier = 'premium' THEN 10 WHEN u_tier = 'standard' THEN 3 ELSE 1 END;
      IF curr_count >= max_limit THEN 
        RAISE EXCEPTION 'QUOTA_EXHAUSTED: Vehicles (Current Tier Limit: %)', max_limit; 
      END IF;
    END IF;
  
  -- 3. Logic for FUEL LOGS
  ELSIF TG_TABLE_NAME = 'fuel_logs' AND TG_OP = 'INSERT' THEN
    SELECT EXISTS(SELECT 1 FROM fuel_logs WHERE id = NEW.id) INTO record_exists;
    IF NOT record_exists THEN
      SELECT count(*) INTO curr_count FROM fuel_logs 
      WHERE vehicle_id = NEW.vehicle_id AND captured_at >= now() - interval '30 days';
      max_limit := CASE WHEN u_tier = 'premium' THEN 999 WHEN u_tier = 'standard' THEN 7 ELSE 2 END;
      IF curr_count >= max_limit THEN RAISE EXCEPTION 'QUOTA_EXHAUSTED: Monthly Fuel Logs'; END IF;
    END IF;

  -- 4. Logic for SERVICE LOGS
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

  -- 5. Logic for EPHEMERAL USAGE (Neural Link and AI Mechanic)
  -- UPDATED LIMITS: PREMIUM=4, STANDARD=2, FREE=0
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

-- 6. RE-ATTACH TRIGGERS (Ensure Clean State)
DROP TRIGGER IF EXISTS tr_gov_vehicles ON vehicles;
DROP TRIGGER IF EXISTS tr_gov_fuel ON fuel_logs;
DROP TRIGGER IF EXISTS tr_gov_service ON service_logs;
DROP TRIGGER IF EXISTS tr_gov_usage ON usage_logs;

CREATE TRIGGER tr_gov_vehicles BEFORE INSERT ON vehicles FOR EACH ROW EXECUTE FUNCTION fn_auto_pal_governor();
CREATE TRIGGER tr_gov_fuel BEFORE INSERT ON fuel_logs FOR EACH ROW EXECUTE FUNCTION fn_auto_pal_governor();
CREATE TRIGGER tr_gov_service BEFORE INSERT ON service_logs FOR EACH ROW EXECUTE FUNCTION fn_auto_pal_governor();
CREATE TRIGGER tr_gov_usage BEFORE INSERT ON usage_logs FOR EACH ROW EXECUTE FUNCTION fn_auto_pal_governor();
