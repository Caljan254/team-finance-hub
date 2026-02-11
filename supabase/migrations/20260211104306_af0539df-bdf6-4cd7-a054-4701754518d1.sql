
-- Create contribution_records table for historical and admin-managed records
CREATE TABLE public.contribution_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 600,
  status TEXT NOT NULL DEFAULT 'paid',
  paid_date TIMESTAMP WITH TIME ZONE,
  marked_by UUID REFERENCES auth.users(id),
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(member_name, month, year)
);

ALTER TABLE public.contribution_records ENABLE ROW LEVEL SECURITY;

-- Everyone can view contribution records
CREATE POLICY "Anyone can view contribution records"
ON public.contribution_records
FOR SELECT
USING (true);

-- Admins can manage all records
CREATE POLICY "Admins can manage contribution records"
ON public.contribution_records
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert their own records (for M-Pesa auto-updates)
CREATE POLICY "Users can insert own contribution records"
ON public.contribution_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_contribution_records_updated_at
BEFORE UPDATE ON public.contribution_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
