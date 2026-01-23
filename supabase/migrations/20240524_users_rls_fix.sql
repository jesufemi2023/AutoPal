
-- 1. Ensure RLS is active
ALTER TABLE public."Users" ENABLE ROW LEVEL SECURITY;

-- 2. Allow users to see their own data (Required for update visibility)
DROP POLICY IF EXISTS "Users can view own profile" ON public."Users";
CREATE POLICY "Users can view own profile" 
ON public."Users" FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- 3. Allow users to update their own profile fields
DROP POLICY IF EXISTS "Users can update own profile" ON public."Users";
CREATE POLICY "Users can update own profile" 
ON public."Users" FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
