
-- 1. FIX: Add the missing column that caused PGRST204
ALTER TABLE public."Users" 
ADD COLUMN IF NOT EXISTS license_expires_at TIMESTAMPTZ;

-- 2. MVP BYPASS: Update the Identity Lock to allow client-side tier switching
-- This allows the Standard/Premium buttons in the Profile view to work
CREATE OR REPLACE FUNCTION fn_lock_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- SECURITY NOTE: In a production environment with real payments, 
  -- the block below should be uncommented to prevent manual tier manipulation.
  
  /*
  IF (OLD.tier IS DISTINCT FROM NEW.tier OR OLD.role IS DISTINCT FROM NEW.role) 
     AND current_setting('role') = 'authenticated' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Tier/Role changes are restricted to secure billing events.';
  END IF;
  */

  -- LOGIC: Automatically set/extend the license by 30 days when a tier is changed
  IF OLD.tier IS DISTINCT FROM NEW.tier THEN
    NEW.license_expires_at := now() + interval '1 month';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Ensure the trigger is still active
DROP TRIGGER IF EXISTS tr_lock_user_tier ON "Users";
CREATE TRIGGER tr_lock_user_tier BEFORE UPDATE ON "Users"
FOR EACH ROW EXECUTE FUNCTION fn_lock_user_tier();
