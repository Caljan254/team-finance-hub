-- ============================================
-- CLEANUP (Run this first if you need to reset)
-- ============================================
-- Note: Uncomment only if you want to reset everything
/*
DROP TABLE IF EXISTS 
  public.meeting_attendance,
  public.meetings,
  public.notifications,
  public.penalties,
  public.payments,
  public.user_roles,
  public.profiles,
  public.audit_log CASCADE;

DROP VIEW IF EXISTS public.member_statistics;
DROP FUNCTION IF EXISTS 
  public.add_demo_members(),
  public.function_exists(text),
  public.get_user_profile(),
  public.handle_new_user(),
  public.has_role(uuid, app_role),
  public.is_admin(),
  public.log_profile_changes(),
  public.check_payment_due_date(),
  public.update_updated_at_column() CASCADE;

DROP TYPE IF EXISTS public.app_role CASCADE;
*/

-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'member');
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'overdue');
CREATE TYPE public.meeting_status AS ENUM ('upcoming', 'completed', 'cancelled', 'postponed');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'excused', 'late');
CREATE TYPE public.notification_type AS ENUM ('payment_reminder', 'penalty', 'meeting', 'general', 'welcome', 'profile_update', 'system');

-- ============================================
-- MAIN TABLES
-- ============================================

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  profile_image TEXT,
  is_active BOOLEAN DEFAULT true,
  join_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  membership_number TEXT GENERATED ALWAYS AS (
    'MEM' || LPAD(EXTRACT(YEAR FROM join_date)::TEXT, 4, '0') || 
    LPAD(ROW_NUMBER() OVER (ORDER BY join_date)::TEXT, 4, '0')
  ) STORED,
  address TEXT,
  occupation TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Add constraints for data validation
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^\+?[0-9\s\-\(\)]{7,15}$'),
  CONSTRAINT valid_emergency_phone CHECK (
    emergency_contact_phone IS NULL OR 
    emergency_contact_phone ~ '^\+?[0-9\s\-\(\)]{7,15}$'
  )
);

-- Create user_roles table for RBAC
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE (user_id, role)
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 600.00,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  paid_date TIMESTAMP WITH TIME ZONE,
  status payment_status NOT NULL DEFAULT 'pending',
  penalty_amount DECIMAL(10,2) DEFAULT 0.00,
  penalty_days INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 600.00,
  payment_method TEXT DEFAULT 'M-Pesa',
  transaction_id TEXT,
  receipt_number TEXT,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Unique constraint to prevent duplicate payments for same month/year
  UNIQUE (user_id, month, year),
  
  -- Check constraints
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT positive_total CHECK (total_amount > 0),
  CONSTRAINT valid_year CHECK (year >= 2023 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
  CONSTRAINT valid_month CHECK (
    month IN ('January', 'February', 'March', 'April', 'May', 'June', 
              'July', 'August', 'September', 'October', 'November', 'December')
  )
);

-- Create penalties table
CREATE TABLE public.penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  daily_penalty DECIMAL(10,2) DEFAULT 10.00,
  days_overdue INTEGER DEFAULT 0,
  total_penalty DECIMAL(10,2) DEFAULT 0.00,
  paid BOOLEAN DEFAULT false,
  paid_date TIMESTAMP WITH TIME ZONE,
  waived BOOLEAN DEFAULT false,
  waived_by UUID REFERENCES auth.users(id),
  waived_at TIMESTAMP WITH TIME ZONE,
  waiver_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE (user_id, month, year)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_important BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  action_url TEXT,
  action_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Add index for performance
  CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  venue TEXT NOT NULL,
  agenda TEXT[] DEFAULT '{}',
  minutes TEXT,
  status meeting_status DEFAULT 'upcoming',
  organizer_id UUID REFERENCES auth.users(id),
  max_attendees INTEGER,
  attendees JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT valid_time CHECK (end_time IS NULL OR end_time > start_time),
  CONSTRAINT valid_date CHECK (date >= CURRENT_DATE - INTERVAL '1 year')
);

-- Create meeting_attendance table
CREATE TABLE public.meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'absent',
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  excused_reason TEXT,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE (meeting_id, user_id),
  CONSTRAINT valid_checkout CHECK (check_out_time IS NULL OR check_out_time > check_in_time)
);

-- Create audit_log table for tracking important changes
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create contributions table (for special funds, donations, etc.)
CREATE TABLE public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('donation', 'special_fund', 'event_fee', 'other')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  contribution_date DATE DEFAULT CURRENT_DATE,
  receipt_number TEXT,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT positive_contribution CHECK (amount > 0)
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  announcement_type TEXT NOT NULL CHECK (announcement_type IN ('general', 'urgent', 'meeting', 'payment', 'event')),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  published_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_join_date ON public.profiles(join_date);

-- User roles indexes
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_roles_user_role ON public.user_roles(user_id, role);

-- Payments indexes
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_month_year ON public.payments(month, year);
CREATE INDEX idx_payments_paid_date ON public.payments(paid_date);
CREATE INDEX idx_payments_user_month_year ON public.payments(user_id, month, year);

-- Penalties indexes
CREATE INDEX idx_penalties_user_id ON public.penalties(user_id);
CREATE INDEX idx_penalties_paid ON public.penalties(paid);
CREATE INDEX idx_penalties_month_year ON public.penalties(month, year);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read);

-- Meetings indexes
CREATE INDEX idx_meetings_date ON public.meetings(date);
CREATE INDEX idx_meetings_status ON public.meetings(status);
CREATE INDEX idx_meetings_organizer ON public.meetings(organizer_id);

-- Meeting attendance indexes
CREATE INDEX idx_attendance_meeting_id ON public.meeting_attendance(meeting_id);
CREATE INDEX idx_attendance_user_id ON public.meeting_attendance(user_id);
CREATE INDEX idx_attendance_status ON public.meeting_attendance(status);

-- Audit log indexes
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);
CREATE INDEX idx_audit_log_table ON public.audit_log(table_name);

-- Contributions indexes
CREATE INDEX idx_contributions_user_id ON public.contributions(user_id);
CREATE INDEX idx_contributions_date ON public.contributions(contribution_date);

-- Announcements indexes
CREATE INDEX idx_announcements_published ON public.announcements(is_published);
CREATE INDEX idx_announcements_expires ON public.announcements(expires_at);
CREATE INDEX idx_announcements_type ON public.announcements(announcement_type);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
$$;

-- Function to check if user is member
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.has_role(auth.uid(), 'member'::app_role)
$$;

-- Function to get current user's profile
CREATE OR REPLACE FUNCTION public.get_user_profile()
RETURNS SETOF profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.profiles
  WHERE user_id = auth.uid()
$$;

-- Function to get user's roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(role app_role, assigned_at TIMESTAMPTZ, expires_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.role, ur.assigned_at, ur.expires_at
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
$$;

-- Function to add member (admin only)
CREATE OR REPLACE FUNCTION public.add_member(
  _full_name TEXT,
  _email TEXT,
  _phone TEXT DEFAULT NULL,
  _profile_image TEXT DEFAULT '/uploads/default-profile.jpg',
  _address TEXT DEFAULT NULL,
  _occupation TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  -- Check if current user is admin
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT false, 'Only admins can add new members', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(email) = LOWER(_email)) THEN
    RETURN QUERY SELECT false, 'Email already exists', NULL::UUID;
    RETURN;
  END IF;
  
  -- Generate a UUID for the user (this will be linked to an auth user later)
  _user_id := gen_random_uuid();
  
  -- Insert into profiles using admin privileges
  INSERT INTO public.profiles (
    user_id,
    full_name,
    email,
    phone,
    profile_image,
    address,
    occupation,
    is_active,
    join_date
  ) VALUES (
    _user_id,
    _full_name,
    LOWER(_email),
    _phone,
    _profile_image,
    _address,
    _occupation,
    true,
    now()
  );
  
  -- Assign member role
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (
    _user_id,
    'member',
    auth.uid()
  );
  
  -- Create welcome notification
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    metadata,
    is_important
  ) VALUES (
    _user_id,
    'welcome',
    'Welcome to THE TEAM! 🎉',
    'Welcome to our community! Your account has been created by an admin. Please check your email for setup instructions.',
    jsonb_build_object('added_by_admin', true),
    true
  );
  
  -- Log the action
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    record_id,
    new_data
  ) VALUES (
    auth.uid(),
    'CREATE_MEMBER',
    'profiles',
    _user_id,
    jsonb_build_object(
      'full_name', _full_name,
      'email', _email,
      'added_by', auth.uid()
    )
  );
  
  RETURN QUERY SELECT true, 'Member added successfully', _user_id;
END;
$$;

-- Function to make user admin
CREATE OR REPLACE FUNCTION public.make_user_admin(_email TEXT)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_user_id UUID;
  _profile_exists BOOLEAN;
BEGIN
  -- Check if current user is admin
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT false, 'Only admins can assign admin role', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if profile exists
  SELECT user_id, true INTO _target_user_id, _profile_exists
  FROM public.profiles 
  WHERE LOWER(email) = LOWER(_email);
  
  IF NOT _profile_exists THEN
    RETURN QUERY SELECT false, 'User profile not found', NULL::UUID;
    RETURN;
  END IF;
  
  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (
    _target_user_id,
    'admin',
    auth.uid()
  )
  ON CONFLICT (user_id, role) DO UPDATE SET 
    role = 'admin',
    updated_at = now();
  
  -- Create notification for the new admin
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    metadata,
    is_important
  ) VALUES (
    _target_user_id,
    'system',
    '🎖️ You are now an Administrator',
    'You have been granted administrator privileges. You can now manage members, payments, and system settings.',
    jsonb_build_object('action', 'admin_promotion'),
    true
  );
  
  -- Log the action
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    record_id,
    new_data
  ) VALUES (
    auth.uid(),
    'ASSIGN_ADMIN_ROLE',
    'user_roles',
    _target_user_id,
    jsonb_build_object(
      'target_email', _email,
      'assigned_by', auth.uid(),
      'assigned_at', now()
    )
  );
  
  RETURN QUERY SELECT true, 'User promoted to administrator successfully', _target_user_id;
END;
$$;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Profiles policies
-- Remove existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.profiles;
  DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
  DROP POLICY IF EXISTS "Enable delete for admins only" ON public.profiles;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create new profiles policies
-- 1. All authenticated users can view active profiles
CREATE POLICY "view_active_profiles" ON public.profiles
  FOR SELECT TO authenticated 
  USING (is_active = true OR auth.uid() = user_id OR public.is_admin());

-- 2. Users can update their own profile
CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Admins can update any profile
CREATE POLICY "admin_update_profiles" ON public.profiles
  FOR UPDATE TO authenticated 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Users can insert their own profile (for signup)
CREATE POLICY "insert_own_profile" ON public.profiles
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- 5. Admins can insert profiles for others
CREATE POLICY "admin_insert_profiles" ON public.profiles
  FOR INSERT TO authenticated 
  WITH CHECK (public.is_admin());

-- 6. Only admins can delete profiles
CREATE POLICY "admin_delete_profiles" ON public.profiles
  FOR DELETE TO authenticated 
  USING (public.is_admin());

-- User roles policies
CREATE POLICY "Enable read access for all authenticated users" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable all access for admins only" ON public.user_roles
  FOR ALL TO authenticated 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Payments policies
CREATE POLICY "Users can view own payments and admins can view all" ON public.payments
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert own payments and admins can insert any" ON public.payments
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update own payments and admins can update any" ON public.payments
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can delete payments" ON public.payments
  FOR DELETE TO authenticated 
  USING (public.is_admin());

-- Penalties policies
CREATE POLICY "Users can view own penalties and admins can view all" ON public.penalties
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can manage all penalties" ON public.penalties
  FOR ALL TO authenticated 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Notifications policies
CREATE POLICY "Users can view own notifications and general notifications" ON public.notifications
  FOR SELECT TO authenticated 
  USING (
    user_id = auth.uid() OR 
    user_id IS NULL OR 
    public.is_admin()
  );

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can manage all notifications" ON public.notifications
  FOR INSERT TO authenticated 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete notifications" ON public.notifications
  FOR DELETE TO authenticated 
  USING (public.is_admin());

-- Meetings policies
CREATE POLICY "All members can view meetings" ON public.meetings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage meetings" ON public.meetings
  FOR ALL TO authenticated 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Meeting attendance policies
CREATE POLICY "Users can view attendance for meetings they are part of" ON public.meeting_attendance
  FOR SELECT TO authenticated 
  USING (
    user_id = auth.uid() OR 
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id 
      AND m.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own attendance status" ON public.meeting_attendance
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can manage all attendance" ON public.meeting_attendance
  FOR INSERT TO authenticated 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete attendance records" ON public.meeting_attendance
  FOR DELETE TO authenticated 
  USING (public.is_admin());

-- Audit log policies (only admins can view audit logs)
CREATE POLICY "Only admins can view audit logs" ON public.audit_log
  FOR SELECT TO authenticated 
  USING (public.is_admin());

CREATE POLICY "Only system functions can insert audit logs" ON public.audit_log
  FOR INSERT TO authenticated 
  WITH CHECK (true); -- This should be called by triggers/functions only

-- Contributions policies
CREATE POLICY "Users can view own contributions and admins can view all" ON public.contributions
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can manage all contributions" ON public.contributions
  FOR ALL TO authenticated 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Announcements policies
CREATE POLICY "All members can view published announcements" ON public.announcements
  FOR SELECT TO authenticated 
  USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins can manage all announcements" ON public.announcements
  FOR ALL TO authenticated 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================
-- TRIGGER FUNCTIONS
-- ============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_full_name TEXT;
  user_email TEXT;
BEGIN
  -- Extract full name from metadata or email
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    INITCAP(SPLIT_PART(NEW.email, '@', 1))
  );
  
  user_email := LOWER(NEW.email);
  
  -- Check if profile already exists (in case of social signups)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = user_email) THEN
    -- Insert profile
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (NEW.id, user_full_name, user_email);
    
    -- Assign member role
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (NEW.id, 'member', NEW.id);
  ELSE
    -- Update existing profile with auth user_id
    UPDATE public.profiles 
    SET user_id = NEW.id
    WHERE email = user_email;
    
    -- Assign member role if not exists
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (NEW.id, 'member', NEW.id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Create welcome notification
  INSERT INTO public.notifications (user_id, type, title, message, is_important)
  VALUES (
    NEW.id,
    'welcome',
    'Welcome to THE TEAM! 🎉',
    'Welcome to our community! We''re excited to have you on board. Please complete your profile and review the membership guidelines.',
    true
  );
  
  -- Log the user creation
  INSERT INTO public.audit_log (user_id, action, table_name, record_id, new_data)
  VALUES (
    NEW.id,
    'CREATE',
    'profiles',
    NEW.id,
    jsonb_build_object(
      'email', user_email,
      'full_name', user_full_name,
      'created_by', 'system'
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log changes to tables
CREATE OR REPLACE FUNCTION public.log_table_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, new_data)
    VALUES (
      COALESCE(auth.uid(), (NEW.user_id::UUID)),
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW) - 'created_at' - 'updated_at'
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      COALESCE(auth.uid(), (NEW.user_id::UUID)),
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD) - 'created_at' - 'updated_at',
      to_jsonb(NEW) - 'created_at' - 'updated_at'
    );
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data)
    VALUES (
      COALESCE(auth.uid(), (OLD.user_id::UUID)),
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD) - 'created_at' - 'updated_at'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically add penalty when payment is overdue
CREATE OR REPLACE FUNCTION public.check_payment_due_date()
RETURNS TRIGGER AS $$
DECLARE
  days_late INTEGER;
  penalty_amount DECIMAL(10,2);
  current_due_day INTEGER := 10; -- Payment due on 10th of each month
BEGIN
  -- Only check when status changes to overdue
  IF NEW.status = 'overdue'::payment_status AND OLD.status != 'overdue'::payment_status THEN
    -- Calculate days late (assuming payment was due on 10th of each month)
    days_late := GREATEST(0, EXTRACT(DAY FROM CURRENT_DATE) - current_due_day);
    
    IF days_late > 0 THEN
      penalty_amount := days_late * 10.00; -- 10 per day penalty
      
      -- Insert or update penalty record
      INSERT INTO public.penalties (
        user_id,
        payment_id,
        month,
        year,
        daily_penalty,
        days_overdue,
        total_penalty
      )
      VALUES (
        NEW.user_id,
        NEW.id,
        NEW.month,
        NEW.year,
        10.00,
        days_late,
        penalty_amount
      )
      ON CONFLICT (user_id, month, year) 
      DO UPDATE SET
        days_overdue = EXCLUDED.days_overdue,
        total_penalty = EXCLUDED.total_penalty,
        updated_at = now();
      
      -- Create penalty notification
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        metadata,
        is_important
      )
      VALUES (
        NEW.user_id,
        'penalty',
        '⚠️ Payment Penalty Applied',
        'A penalty of KSh ' || penalty_amount || ' has been applied for late payment (' || days_late || ' days overdue).',
        jsonb_build_object(
          'penalty_amount', penalty_amount,
          'days_overdue', days_late,
          'payment_id', NEW.id,
          'payment_month', NEW.month,
          'payment_year', NEW.year
        ),
        true
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to send payment reminders
CREATE OR REPLACE FUNCTION public.send_payment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month TEXT;
  current_year INTEGER;
  reminder_date DATE := CURRENT_DATE;
  due_day INTEGER := 5; -- Remind 5 days before due date (10th)
BEGIN
  -- Get current month and year
  current_month := TO_CHAR(CURRENT_DATE, 'Month');
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Check if today is the reminder date (5th of the month)
  IF EXTRACT(DAY FROM CURRENT_DATE) = due_day THEN
    -- Find members who haven't paid for current month
    INSERT INTO public.notifications (user_id, type, title, message, is_important)
    SELECT 
      p.user_id,
      'payment_reminder',
      '⏰ Payment Reminder',
      'Friendly reminder: Your payment for ' || current_month || ' ' || current_year || ' is due on the 10th.',
      true
    FROM public.profiles p
    WHERE p.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.payments pay
        WHERE pay.user_id = p.user_id
          AND pay.month = current_month
          AND pay.year = current_year
          AND pay.status = 'paid'
      );
    
    RAISE NOTICE 'Payment reminders sent for % %', current_month, current_year;
  END IF;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_penalties_updated_at
  BEFORE UPDATE ON public.penalties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_attendance_updated_at
  BEFORE UPDATE ON public.meeting_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contributions_updated_at
  BEFORE UPDATE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit triggers for important tables
CREATE TRIGGER audit_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER audit_payments_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

-- Payment overdue trigger
CREATE TRIGGER check_payment_overdue
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.check_payment_due_date();

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VIEWS
-- ============================================

-- View to get member statistics
CREATE OR REPLACE VIEW public.member_statistics AS
SELECT 
  p.id,
  p.user_id,
  p.full_name,
  p.email,
  p.phone,
  p.profile_image,
  p.is_active,
  p.join_date,
  p.membership_number,
  ur.role,
  -- Payment statistics
  COUNT(DISTINCT pay.id) FILTER (WHERE pay.status = 'paid') as total_payments_paid,
  COUNT(DISTINCT pay.id) FILTER (WHERE pay.status = 'pending') as total_payments_pending,
  COUNT(DISTINCT pay.id) FILTER (WHERE pay.status = 'overdue') as total_payments_overdue,
  COALESCE(SUM(pay.total_amount) FILTER (WHERE pay.status = 'paid'), 0) as total_amount_paid,
  -- Penalty statistics
  COUNT(DISTINCT pen.id) FILTER (WHERE pen.paid = false AND pen.waived = false) as active_penalties,
  COALESCE(SUM(pen.total_penalty) FILTER (WHERE pen.paid = false AND pen.waived = false), 0) as total_pending_penalty,
  -- Meeting attendance statistics
  COUNT(DISTINCT ma.id) FILTER (WHERE ma.status = 'present') as meetings_attended,
  COUNT(DISTINCT ma.id) FILTER (WHERE ma.status = 'absent') as meetings_absent,
  -- Contribution statistics
  COUNT(DISTINCT c.id) as total_contributions,
  COALESCE(SUM(c.amount), 0) as total_contributed_amount,
  -- Last payment date
  MAX(pay.paid_date) as last_payment_date
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id AND (ur.expires_at IS NULL OR ur.expires_at > now())
LEFT JOIN public.payments pay ON p.user_id = pay.user_id
LEFT JOIN public.penalties pen ON p.user_id = pen.user_id AND pen.paid = false
LEFT JOIN public.meeting_attendance ma ON p.user_id = ma.user_id
LEFT JOIN public.contributions c ON p.user_id = c.user_id
GROUP BY p.id, p.user_id, p.full_name, p.email, p.phone, p.profile_image, p.is_active, p.join_date, p.membership_number, ur.role;

-- View for overdue payments
CREATE OR REPLACE VIEW public.overdue_payments_view AS
SELECT 
  p.full_name,
  p.email,
  p.phone,
  pay.month,
  pay.year,
  pay.total_amount,
  pay.status,
  pen.days_overdue,
  pen.total_penalty,
  (pay.total_amount + COALESCE(pen.total_penalty, 0)) as total_due
FROM public.payments pay
JOIN public.profiles p ON pay.user_id = p.user_id
LEFT JOIN public.penalties pen ON pay.user_id = pen.user_id 
  AND pay.month = pen.month 
  AND pay.year = pen.year
  AND pen.paid = false
WHERE pay.status = 'overdue'
  AND p.is_active = true;

-- View for upcoming meetings
CREATE OR REPLACE VIEW public.upcoming_meetings_view AS
SELECT 
  m.id,
  m.title,
  m.date,
  m.start_time,
  m.end_time,
  m.venue,
  m.status,
  p.full_name as organizer_name,
  COUNT(DISTINCT ma.user_id) FILTER (WHERE ma.status = 'present') as confirmed_attendees,
  m.max_attendees
FROM public.meetings m
LEFT JOIN public.profiles p ON m.organizer_id = p.user_id
LEFT JOIN public.meeting_attendance ma ON m.id = ma.meeting_id
WHERE m.status = 'upcoming'
  AND m.date >= CURRENT_DATE
GROUP BY m.id, m.title, m.date, m.start_time, m.end_time, m.venue, m.status, p.full_name, m.max_attendees;

-- View for admin users
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
  p.full_name,
  p.email,
  p.phone,
  p.profile_image,
  p.join_date,
  ur.assigned_at as admin_since,
  u.email as auth_email
FROM public.profiles p
JOIN public.user_roles ur ON p.user_id = ur.user_id
JOIN auth.users u ON p.user_id = u.id
WHERE ur.role = 'admin'
  AND (ur.expires_at IS NULL OR ur.expires_at > now())
  AND p.is_active = true
ORDER BY ur.assigned_at;

-- ============================================
-- DEMO DATA FUNCTIONS
-- ============================================

-- Function to add demo members
CREATE OR REPLACE FUNCTION public.add_demo_members()
RETURNS TABLE(message TEXT, success BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  demo_members_count INTEGER;
BEGIN
  -- Check if demo members already exist
  SELECT COUNT(*) INTO demo_members_count
  FROM public.profiles
  WHERE email IN (
    'masilakisangau@gmail.com',
    'michaelkamote2019@gmail.com',
    'lydiakatungi2001@gmail.com',
    'joedan926@gmail.com',
    'munyokimutua513@gmail.com',
    'mutemwawillie@gmail.com',
    'mumokisangau91@gmail.com'
  );
  
  IF demo_members_count > 0 THEN
    RETURN QUERY SELECT 'Demo members already exist. Updating existing records...' as message, false as success;
    
    -- Update existing demo members
    UPDATE public.profiles 
    SET 
      phone = CASE email
        WHEN 'masilakisangau@gmail.com' THEN '0790723609'
        WHEN 'michaelkamote2019@gmail.com' THEN '0794366274'
        WHEN 'lydiakatungi2001@gmail.com' THEN '0746792834'
        WHEN 'joedan926@gmail.com' THEN '0796473760'
        WHEN 'munyokimutua513@gmail.com' THEN '0769083128'
        WHEN 'mutemwawillie@gmail.com' THEN '0718510747'
        WHEN 'mumokisangau91@gmail.com' THEN '0112199055'
      END,
      profile_image = CASE email
        WHEN 'masilakisangau@gmail.com' THEN '/uploads/mark-masila.jpg'
        WHEN 'michaelkamote2019@gmail.com' THEN '/uploads/michael-kamote.jpg'
        WHEN 'lydiakatungi2001@gmail.com' THEN '/uploads/lydia-katungi.jpg'
        WHEN 'joedan926@gmail.com' THEN '/uploads/joel-mwetu.jpg'
        WHEN 'munyokimutua513@gmail.com' THEN '/uploads/munyoki-mutua.jpg'
        WHEN 'mutemwawillie@gmail.com' THEN '/uploads/mutemwa-willy.jpg'
        WHEN 'mumokisangau91@gmail.com' THEN '/uploads/caleb-mumo.jpg'
      END,
      full_name = CASE email
        WHEN 'masilakisangau@gmail.com' THEN 'Mark Masila'
        WHEN 'michaelkamote2019@gmail.com' THEN 'Michael Kamote'
        WHEN 'lydiakatungi2001@gmail.com' THEN 'Lydia Katungi'
        WHEN 'joedan926@gmail.com' THEN 'Joel Mwetu'
        WHEN 'munyokimutua513@gmail.com' THEN 'Munyoki Mutua'
        WHEN 'mutemwawillie@gmail.com' THEN 'Mutemwa Willy'
        WHEN 'mumokisangau91@gmail.com' THEN 'Caleb Mumo'
      END,
      is_active = true,
      updated_at = now()
    WHERE email IN (
      'masilakisangau@gmail.com',
      'michaelkamote2019@gmail.com',
      'lydiakatungi2001@gmail.com',
      'joedan926@gmail.com',
      'munyokimutua513@gmail.com',
      'mutemwawillie@gmail.com',
      'mumokisangau91@gmail.com'
    );
    
  ELSE
    -- Insert new demo members with valid UUIDs
    INSERT INTO public.profiles (user_id, full_name, email, phone, profile_image, is_active, join_date)
    VALUES
      (gen_random_uuid(), 'Mark Masila', 'masilakisangau@gmail.com', '0790723609', '/uploads/mark-masila.jpg', true, now() - INTERVAL '6 months'),
      (gen_random_uuid(), 'Michael Kamote', 'michaelkamote2019@gmail.com', '0794366274', '/uploads/michael-kamote.jpg', true, now() - INTERVAL '5 months'),
      (gen_random_uuid(), 'Lydia Katungi', 'lydiakatungi2001@gmail.com', '0746792834', '/uploads/lydia-katungi.jpg', true, now() - INTERVAL '4 months'),
      (gen_random_uuid(), 'Joel Mwetu', 'joedan926@gmail.com', '0796473760', '/uploads/joel-mwetu.jpg', true, now() - INTERVAL '3 months'),
      (gen_random_uuid(), 'Munyoki Mutua', 'munyokimutua513@gmail.com', '0769083128', '/uploads/munyoki-mutua.jpg', true, now() - INTERVAL '2 months'),
      (gen_random_uuid(), 'Mutemwa Willy', 'mutemwawillie@gmail.com', '0718510747', '/uploads/mutemwa-willy.jpg', true, now() - INTERVAL '1 month'),
      (gen_random_uuid(), 'Caleb Mumo', 'mumokisangau91@gmail.com', '0112199055', '/uploads/caleb-mumo.jpg', true, now())
    ON CONFLICT (email) DO NOTHING;
  END IF;
  
  -- Ensure member roles exist for demo members
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  SELECT p.user_id, 'member'::app_role, p.user_id
  FROM public.profiles p
  WHERE p.email IN (
    'masilakisangau@gmail.com',
    'michaelkamote2019@gmail.com',
    'lydiakatungi2001@gmail.com',
    'joedan926@gmail.com',
    'munyokimutua513@gmail.com',
    'mutemwawillie@gmail.com',
    'mumokisangau91@gmail.com'
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Make specific users admins (Mark Masila, Michael Kamote, Mutemwa Willy, Caleb Mumo)
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  SELECT 
    p.user_id,
    'admin'::app_role,
    p.user_id
  FROM public.profiles p
  WHERE p.email IN (
    'masilakisangau@gmail.com',
    'michaelkamote2019@gmail.com',
    'mutemwawillie@gmail.com',
    'mumokisangau91@gmail.com'
  )
  ON CONFLICT (user_id, role) DO UPDATE SET 
    role = 'admin',
    updated_at = now();
  
  -- Create sample payments for current and previous months
  WITH months AS (
    SELECT 
      TO_CHAR(generate_series(
        now() - INTERVAL '3 months',
        now(),
        '1 month'
      ), 'Month') as month,
      EXTRACT(YEAR FROM generate_series(
        now() - INTERVAL '3 months',
        now(),
        '1 month'
      )) as year
  )
  INSERT INTO public.payments (user_id, amount, month, year, status, payment_method, total_amount, paid_date)
  SELECT 
    p.user_id,
    600.00,
    m.month,
    m.year,
    CASE 
      WHEN random() < 0.7 THEN 'paid'::payment_status
      WHEN random() < 0.9 THEN 'pending'::payment_status
      ELSE 'overdue'::payment_status
    END,
    'M-Pesa',
    600.00,
    CASE 
      WHEN random() < 0.7 THEN now() - (random() * INTERVAL '30 days')
      ELSE NULL
    END
  FROM public.profiles p
  CROSS JOIN months m
  WHERE p.email IN (
    'masilakisangau@gmail.com',
    'michaelkamote2019@gmail.com',
    'lydiakatungi2001@gmail.com',
    'joedan926@gmail.com',
    'munyokimutua513@gmail.com',
    'mutemwawillie@gmail.com',
    'mumokisangau91@gmail.com'
  )
  ON CONFLICT (user_id, month, year) DO NOTHING;
  
  -- Create demo meeting
  INSERT INTO public.meetings (title, description, date, start_time, end_time, venue, agenda, status, organizer_id, created_by)
  VALUES (
    'Monthly Team Meeting',
    'Regular monthly meeting to discuss team progress and upcoming events',
    CURRENT_DATE + INTERVAL '7 days',
    '10:00:00',
    '12:00:00',
    'Main Conference Room',
    ARRAY['Review of last month''s activities', 'Financial report', 'Upcoming events planning', 'Member feedback'],
    'upcoming',
    (SELECT user_id FROM public.profiles WHERE email = 'masilakisangau@gmail.com' LIMIT 1),
    (SELECT user_id FROM public.profiles WHERE email = 'masilakisangau@gmail.com' LIMIT 1)
  )
  ON CONFLICT DO NOTHING;
  
  -- Create demo announcements
  INSERT INTO public.announcements (title, content, announcement_type, is_published, published_at, published_by, created_by)
  VALUES (
    'Welcome New Members!',
    'We are excited to welcome our new members to THE TEAM. Please make them feel welcome!',
    'general',
    true,
    now(),
    (SELECT user_id FROM public.profiles WHERE email = 'masilakisangau@gmail.com' LIMIT 1),
    (SELECT user_id FROM public.profiles WHERE email = 'masilakisangau@gmail.com' LIMIT 1)
  ),
  (
    'Monthly Payment Reminder',
    'Friendly reminder that monthly payments are due by the 10th of every month.',
    'payment',
    true,
    now(),
    (SELECT user_id FROM public.profiles WHERE email = 'masilakisangau@gmail.com' LIMIT 1),
    (SELECT user_id FROM public.profiles WHERE email = 'masilakisangau@gmail.com' LIMIT 1)
  )
  ON CONFLICT DO NOTHING;
  
  -- Create admin notifications
  INSERT INTO public.notifications (user_id, type, title, message, is_important)
  SELECT 
    p.user_id,
    'system',
    '🎖️ You are now an Administrator',
    'You have been granted administrator privileges. You can now manage members, payments, and system settings.',
    true
  FROM public.profiles p
  WHERE p.email IN (
    'masilakisangau@gmail.com',
    'michaelkamote2019@gmail.com',
    'mutemwawillie@gmail.com',
    'mumokisangau91@gmail.com'
  )
  ON CONFLICT DO NOTHING;
  
  RETURN QUERY SELECT 'Demo data created successfully! 4 users set as admins. ✅' as message, true as success;
END;
$$;

-- Function to clear demo data
CREATE OR REPLACE FUNCTION public.clear_demo_data()
RETURNS TABLE(message TEXT, success BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete demo members payments first (due to foreign key)
  DELETE FROM public.payments 
  WHERE user_id IN (
    SELECT user_id FROM public.profiles 
    WHERE email IN (
      'masilakisangau@gmail.com',
      'michaelkamote2019@gmail.com',
      'lydiakatungi2001@gmail.com',
      'joedan926@gmail.com',
      'munyokimutua513@gmail.com',
      'mutemwawillie@gmail.com',
      'mumokisangau91@gmail.com'
    )
  );
  
  -- Delete demo members
  DELETE FROM public.profiles 
  WHERE email IN (
    'masilakisangau@gmail.com',
    'michaelkamote2019@gmail.com',
    'lydiakatungi2001@gmail.com',
    'joedan926@gmail.com',
    'munyokimutua513@gmail.com',
    'mutemwawillie@gmail.com',
    'mumokisangau91@gmail.com'
  );
  
  -- Delete demo announcements
  DELETE FROM public.announcements 
  WHERE created_by IN (
    SELECT user_id FROM public.profiles 
    WHERE email IN (
      'masilakisangau@gmail.com',
      'michaelkamote2019@gmail.com',
      'lydiakatungi2001@gmail.com',
      'joedan926@gmail.com',
      'munyokimutua513@gmail.com',
      'mutemwawillie@gmail.com',
      'mumokisangau91@gmail.com'
    )
  );
  
  RETURN QUERY SELECT 'Demo data cleared successfully! 🗑️' as message, true as success;
END;
$$;

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to check if function exists
CREATE OR REPLACE FUNCTION public.function_exists(func_name text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = func_name
  );
END;
$$;

-- Function to get system statistics
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS TABLE(
  total_members BIGINT,
  active_members BIGINT,
  total_payments_today DECIMAL(10,2),
  total_payments_month DECIMAL(10,2),
  overdue_payments_count BIGINT,
  upcoming_meetings_count BIGINT,
  unread_notifications_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.profiles WHERE is_active = true)::BIGINT as total_members,
    (SELECT COUNT(*) FROM public.profiles WHERE is_active = true)::BIGINT as active_members,
    COALESCE((
      SELECT SUM(total_amount) 
      FROM public.payments 
      WHERE paid_date::DATE = CURRENT_DATE 
        AND status = 'paid'
    ), 0)::DECIMAL(10,2) as total_payments_today,
    COALESCE((
      SELECT SUM(total_amount) 
      FROM public.payments 
      WHERE paid_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND status = 'paid'
    ), 0)::DECIMAL(10,2) as total_payments_month,
    (SELECT COUNT(*) FROM public.payments WHERE status = 'overdue')::BIGINT as overdue_payments_count,
    (SELECT COUNT(*) FROM public.meetings WHERE status = 'upcoming' AND date >= CURRENT_DATE)::BIGINT as upcoming_meetings_count,
    (SELECT COUNT(*) FROM public.notifications WHERE is_read = false AND (user_id = auth.uid() OR user_id IS NULL))::BIGINT as unread_notifications_count;
END;
$$;

-- ============================================
-- CREATE INITIAL ADMINS (AUTO-RUN)
-- ============================================

-- This function will automatically make the specified users admins when demo data is created
-- No need to manually run anything - it's built into add_demo_members()

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant usage on types
GRANT USAGE ON TYPE public.app_role TO authenticated;
GRANT USAGE ON TYPE public.payment_status TO authenticated;
GRANT USAGE ON TYPE public.meeting_status TO authenticated;
GRANT USAGE ON TYPE public.attendance_status TO authenticated;
GRANT USAGE ON TYPE public.notification_type TO authenticated;

-- ============================================
-- QUICK ADMIN SETUP SCRIPT
-- ============================================

-- If you need to manually make users admins, run this SQL:
/*
-- First, check current admins:
SELECT 
  p.full_name,
  p.email,
  ur.role,
  ur.assigned_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE p.email IN (
  'masilakisangau@gmail.com',
  'michaelkamote2019@gmail.com',
  'mutemwawillie@gmail.com',
  'mumokisangau91@gmail.com'
)
ORDER BY p.full_name;

-- Make them admins:
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT 
  p.user_id,
  'admin'::app_role,
  p.user_id
FROM public.profiles p
WHERE p.email IN (
  'masilakisangau@gmail.com',
  'michaelkamote2019@gmail.com',
  'mutemwawillie@gmail.com',
  'mumokisangau91@gmail.com'
)
ON CONFLICT (user_id, role) DO UPDATE SET 
  role = 'admin',
  updated_at = now();

-- Verify:
SELECT 
  p.full_name,
  p.email,
  ur.role,
  ur.assigned_at
FROM public.profiles p
JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY p.full_name;
*/

-- ============================================
-- SCHEDULED JOBS (via Supabase cron)
-- ============================================
-- Note: These need to be set up in Supabase cron dashboard

/*
-- Example cron SQL:
-- 1. Send payment reminders on 5th of every month
select cron.schedule(
  'send-payment-reminders',
  '0 9 5 * *', -- 9 AM on 5th of every month
  'select send_payment_reminders()'
);

-- 2. Update overdue payments status daily
select cron.schedule(
  'update-overdue-payments',
  '0 0 * * *', -- Midnight daily
  $$
  UPDATE public.payments 
  SET status = 'overdue'
  WHERE status = 'pending'
    AND EXTRACT(DAY FROM CURRENT_DATE) > 10
    AND month = TO_CHAR(CURRENT_DATE, 'Month')
    AND year = EXTRACT(YEAR FROM CURRENT_DATE)
  $$
);

-- 3. Archive old notifications monthly
select cron.schedule(
  'archive-old-notifications',
  '0 2 1 * *', -- 2 AM on 1st of every month
  $$
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '6 months'
    AND is_read = true
  $$
);
*/

RAISE NOTICE 'Database schema created successfully! 🎉';
RAISE NOTICE 'Demo members include 4 admins: Caleb Mumo, Mark Masila, Mutemwa Willy, and Michael Kamote';
RAISE NOTICE 'To create demo data with admins, run: SELECT add_demo_members();';