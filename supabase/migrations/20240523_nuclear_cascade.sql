
-- 1. Ensure all foreign keys use CASCADE to clean up app data
ALTER TABLE vehicles 
DROP CONSTRAINT IF EXISTS vehicles_owner_id_fkey,
ADD CONSTRAINT vehicles_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE maintenance_tasks 
DROP CONSTRAINT IF EXISTS maintenance_tasks_vehicle_id_fkey,
ADD CONSTRAINT maintenance_tasks_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;

ALTER TABLE service_logs 
DROP CONSTRAINT IF EXISTS service_logs_vehicle_id_fkey,
ADD CONSTRAINT service_logs_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;

ALTER TABLE fuel_logs 
DROP CONSTRAINT IF EXISTS fuel_logs_vehicle_id_fkey,
ADD CONSTRAINT fuel_logs_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;

-- 2. CREATE NUCLEAR PURGE TRIGGER
-- This function runs with 'security definer' to bypass client-side auth restrictions
CREATE OR REPLACE FUNCTION fn_nuclear_account_purge()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the internal auth user. This triggers the ON DELETE CASCADE 
  -- across all tables linked to auth.users.id
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. APPLY TRIGGER TO PUBLIC USERS TABLE
DROP TRIGGER IF EXISTS tr_nuclear_purge ON "Users";
CREATE TRIGGER tr_nuclear_purge
AFTER DELETE ON "Users"
FOR EACH ROW EXECUTE FUNCTION fn_nuclear_account_purge();
