
-- Fix 1: Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Authenticated users can view profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Fix 2: Restrict contribution_records SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view contribution records" ON contribution_records;
CREATE POLICY "Authenticated users can view contribution records" ON contribution_records
  FOR SELECT TO authenticated
  USING (true);
