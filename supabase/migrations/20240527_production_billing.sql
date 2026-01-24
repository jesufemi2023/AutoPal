
-- 1. SECURE PAYMENTS TABLE RE-HARDENING
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own history
DROP POLICY IF EXISTS "Users view own payments" ON payments;
CREATE POLICY "Users view own payments" ON payments 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

-- Allow users to insert their initial PENDING record
DROP POLICY IF EXISTS "Users insert own pending payments" ON payments;
CREATE POLICY "Users insert own pending payments" ON payments 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- CRITICAL: Allow users to UPDATE their own records if they are PENDING.
-- This prevents "403 Forbidden" errors during frontend upserts if a record exists.
DROP POLICY IF EXISTS "Users update own pending payments" ON payments;
CREATE POLICY "Users update own pending payments" ON payments
FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

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

  -- BLOCK: Any attempt to change Tier or Role from the Browser Client
  IF (OLD.tier IS DISTINCT FROM NEW.tier OR OLD.role IS DISTINCT FROM NEW.role) THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Manual Tier Manipulation Blocked.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. REALTIME RE-ENABLEMENT
-- Ensure the Users table is in the realtime publication
-- Note: Supabase might require quotes if mixed case
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'Users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "Users";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payments;
  END IF;
END $$;
