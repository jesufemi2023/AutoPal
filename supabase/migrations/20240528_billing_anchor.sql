-- 1. SCHEMA UPGRADE: Add the cycle anchor to Users
ALTER TABLE public."Users" 
ADD COLUMN IF NOT EXISTS last_billing_reset_at TIMESTAMPTZ DEFAULT now();

-- 2. THE TIER LOCK & RESET ENGINE
-- Updates the anchor timestamp whenever a billing event or tier change occurs.
CREATE OR REPLACE FUNCTION public.fn_lock_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- ALLOW: If current_user is 'postgres' (Internal) or session is 'service_role' (Payment Verification)
  IF current_user = 'postgres' OR current_setting('role') = 'service_role' THEN
    -- Automatically set expiry and RESET usage anchor on tier change or renewal
    IF OLD.tier IS DISTINCT FROM NEW.tier OR OLD.license_expires_at IS DISTINCT FROM NEW.license_expires_at THEN
      NEW.license_expires_at := now() + interval '1 month';
      NEW.last_billing_reset_at := now(); -- THE ANCHOR RESET
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

-- 3. THE GOVERNOR (Cycle-Aware Edition)
-- Modified to count usage relative to last_billing_reset_at.
CREATE OR REPLACE FUNCTION fn_auto_pal_governor()
RETURNS TRIGGER AS $$
DECLARE
  u_tier TEXT;
  u_expiry TIMESTAMPTZ;
  u_reset_anchor TIMESTAMPTZ;
  curr_count INTEGER;
  max_limit INTEGER;
  record_exists BOOLEAN;
BEGIN
  -- Identify the pilot's tier, status, and usage cycle start point
  SELECT tier, license_expires_at, last_billing_reset_at 
  INTO u_tier, u_expiry, u_reset_anchor 
  FROM "Users" WHERE id = auth.uid();
  
  -- Hard Expiration Check
  IF u_expiry IS NOT NULL AND u_expiry < now() THEN
    RAISE EXCEPTION 'LICENSE_EXPIRED: Your environment is locked. Please renew or upgrade to continue.';
  END IF;

  -- Use creation as anchor if reset anchor is null
  IF u_reset_anchor IS NULL THEN
    u_reset_anchor := now() - interval '30 days';
  END IF;

  -- Logic for VEHICLES (Fleet size check)
  IF TG_TABLE_NAME = 'vehicles' AND TG_OP = 'INSERT' THEN
    SELECT EXISTS(SELECT 1 FROM vehicles WHERE id = NEW.id) INTO record_exists;
    IF NOT record_exists THEN
      SELECT count(*) INTO curr_count FROM vehicles WHERE owner_id = auth.uid() AND status = 'active';
      max_limit := CASE WHEN u_tier = 'premium' THEN 10 WHEN u_tier = 'standard' THEN 3 ELSE 1 END;
      IF curr_count >= max_limit THEN 
        RAISE EXCEPTION 'QUOTA_EXHAUSTED: Vehicles (Current Tier Limit: %)', max_limit; 
      END IF;
    END IF;
  
  -- Logic for FUEL LOGS (Cycle-based)
  ELSIF TG_TABLE_NAME = 'fuel_logs' AND TG_OP = 'INSERT' THEN
    SELECT EXISTS(SELECT 1 FROM fuel_logs WHERE id = NEW.id) INTO record_exists;
    IF NOT record_exists THEN
      -- Count logs created SINCE the last billing event
      SELECT count(*) INTO curr_count FROM fuel_logs 
      WHERE vehicle_id = NEW.vehicle_id AND captured_at >= u_reset_anchor;
      
      max_limit := CASE WHEN u_tier = 'premium' THEN 999 WHEN u_tier = 'standard' THEN 7 ELSE 2 END;
      IF curr_count >= max_limit THEN RAISE EXCEPTION 'QUOTA_EXHAUSTED: Monthly Fuel Logs'; END IF;
    END IF;

  -- Logic for SERVICE LOGS (Cycle-based)
  ELSIF TG_TABLE_NAME = 'service_logs' AND TG_OP = 'INSERT' THEN
    SELECT EXISTS(SELECT 1 FROM service_logs WHERE id = NEW.id) INTO record_exists;
    IF NOT record_exists THEN
      -- Count logs created SINCE the last billing event
      SELECT count(*) INTO curr_count FROM service_logs 
      WHERE vehicle_id = NEW.vehicle_id AND created_at >= u_reset_anchor;
      
      max_limit := CASE WHEN u_tier = 'premium' THEN 999 WHEN u_tier = 'standard' THEN 8 ELSE 4 END;
      IF curr_count >= max_limit THEN 
        RAISE EXCEPTION 'QUOTA_EXHAUSTED: Service Log Capacity (Limit reached for current cycle)'; 
      END IF;
    END IF;

  -- Logic for EPHEMERAL USAGE (AI Mechanic and AI Scans - Cycle-based)
  ELSIF TG_TABLE_NAME = 'usage_logs' AND TG_OP = 'INSERT' THEN
    -- Count logs created SINCE the last billing event
    SELECT count(*) INTO curr_count FROM usage_logs 
    WHERE user_id = auth.uid() AND feature_key = NEW.feature_key AND created_at >= u_reset_anchor;
    
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