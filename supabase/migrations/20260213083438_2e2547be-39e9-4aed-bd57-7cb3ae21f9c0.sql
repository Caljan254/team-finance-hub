
-- Create loans table per constitution
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  borrower_name text NOT NULL,
  amount numeric NOT NULL,
  interest_rate numeric NOT NULL DEFAULT 10,
  total_interest numeric NOT NULL DEFAULT 0,
  total_repaid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'repaid', 'overdue', 'defaulted')),
  issued_date timestamp with time zone NOT NULL DEFAULT now(),
  due_date timestamp with time zone NOT NULL,
  extended_due_date timestamp with time zone,
  repaid_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all loans" ON public.loans FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own loans" ON public.loans FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Loan repayments table
CREATE TABLE public.loan_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  paid_date timestamp with time zone NOT NULL DEFAULT now(),
  marked_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage repayments" ON public.loan_repayments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own repayments" ON public.loan_repayments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.loans WHERE loans.id = loan_repayments.loan_id AND loans.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger for updated_at on loans
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
