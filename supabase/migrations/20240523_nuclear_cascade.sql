
-- 1. ACCESS CONTROL: Allow users to trigger their own deletion
-- Without this, the frontend 'delete' call will fail with a 403 error.
ALTER TABLE public."Users" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete own profile" ON public."Users";
CREATE POLICY "Users can delete own profile" 
ON public."Users" FOR DELETE 
TO authenticated 
USING (auth.uid() = id);

-- 2. CASCADE HARDENING: Link app data to the Auth Identity
-- This ensures vehicles and logs die when the auth.users record is removed.
ALTER TABLE public.vehicles 
DROP CONSTRAINT IF EXISTS vehicles_owner_id_fkey,
ADD CONSTRAINT vehicles_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.maintenance_tasks 
DROP CONSTRAINT IF EXISTS maintenance_tasks_vehicle_id_fkey,
ADD CONSTRAINT maintenance_tasks_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;

ALTER TABLE public.service_logs 
DROP CONSTRAINT IF EXISTS service_logs_vehicle_id_fkey,
ADD CONSTRAINT service_logs_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;

ALTER TABLE public.fuel_logs 
DROP CONSTRAINT IF EXISTS fuel_logs_vehicle_id_fkey,
ADD CONSTRAINT fuel_logs_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;

-- 3. THE NUCLEAR FUNCTION
-- SECURITY DEFINER allows this function to delete from the protected auth schema.
CREATE OR REPLACE FUNCTION public.fn_nuclear_account_purge()
RETURNS TRIGGER AS $$
BEGIN
  -- This is the ignition switch. Removing the auth user triggers the cascades above.
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. THE TRIGGER
-- Attached to the public "Users" table (case sensitive).
DROP TRIGGER IF EXISTS tr_nuclear_purge ON public."Users";
CREATE TRIGGER tr_nuclear_purge
AFTER DELETE ON public."Users"
FOR EACH ROW EXECUTE FUNCTION public.fn_nuclear_account_purge();
