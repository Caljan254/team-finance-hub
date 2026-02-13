
-- Fix 1: Restrict profiles to owner/admin for full data, create public view for directory
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- Owner and admin see full profile
CREATE POLICY "Users can view own or admin all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Create a limited view for member directory (name + image only)
CREATE OR REPLACE VIEW public.member_directory
WITH (security_invoker = on) AS
SELECT id, user_id, full_name, profile_image, join_date, is_active
FROM public.profiles
WHERE is_active = true;
