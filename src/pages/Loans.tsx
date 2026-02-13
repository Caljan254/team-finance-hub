import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Wallet, Clock, CheckCircle, AlertTriangle, Plus, Loader2, 
  Shield, ArrowRight, Info
} from 'lucide-react';
import { toast } from 'sonner';

interface Loan {
  id: string;
  user_id: string;
  borrower_name: string;
  amount: number;
  interest_rate: number;
  total_interest: number;
  total_repaid: number;
  status: string;
  issued_date: string;
  due_date: string;
  extended_due_date: string | null;
  repaid_date: string | null;
}

export default function Loans() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  // New loan form
  const [showForm, setShowForm] = useState(false);
  const [borrowerName, setBorrowerName] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('10');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkAdmin();
      fetchLoans();
    }
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    setIsAdmin(!!data);
  };

  const fetchLoans = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('loans')
      .select('*')
      .order('issued_date', { ascending: false });
    if (data) setLoans(data as Loan[]);
    setLoading(false);
  };

  const createLoan = async () => {
    if (!borrowerName.trim() || !loanAmount) return;
    setSaving(true);

    const amount = parseFloat(loanAmount);
    const rate = parseFloat(interestRate);
    const issuedDate = new Date();
    
    // Due date is 3 months from now
    const dueDate = new Date(issuedDate);
    dueDate.setMonth(dueDate.getMonth() + 3);

    // If due date falls on 25th or later, extend to 8th of next month
    let extendedDueDate = null;
    if (dueDate.getDate() >= 25) {
      const extended = new Date(dueDate);
      extended.setMonth(extended.getMonth() + 1);
      extended.setDate(8);
      extendedDueDate = extended.toISOString();
    }

    const totalInterest = (amount * rate / 100) * 3; // 3 months interest

    const { error } = await supabase.from('loans').insert({
      user_id: user!.id,
      borrower_name: borrowerName.trim(),
      amount,
      interest_rate: rate,
      total_interest: totalInterest,
      due_date: dueDate.toISOString(),
      extended_due_date: extendedDueDate,
      status: 'active',
    });

    if (error) toast.error('Failed to create loan: ' + error.message);
    else {
      toast.success('Loan created successfully');
      setBorrowerName('');
      setLoanAmount('');
      setShowForm(false);
      fetchLoans();
    }
    setSaving(false);
  };

  const markAsRepaid = async (loan: Loan) => {
    const { error } = await supabase
      .from('loans')
      .update({ status: 'repaid', repaid_date: new Date().toISOString(), total_repaid: loan.amount + loan.total_interest })
      .eq('id', loan.id);

    if (error) toast.error('Failed to update');
    else {
      toast.success('Loan marked as repaid');
      fetchLoans();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'repaid':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" />Repaid</span>;
      case 'overdue':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3" />Overdue</span>;
      case 'defaulted':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Defaulted</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="w-3 h-3" />Active</span>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  const activeLoans = loans.filter(l => l.status === 'active');
  const repaidLoans = loans.filter(l => l.status === 'repaid');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Wallet className="w-8 h-8 text-primary" />
              Loan Management
            </h1>
            <p className="text-muted-foreground mt-1">Track and manage group loans per the constitution</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Issue Loan
            </Button>
          )}
        </div>

        {/* Loan Policy Card */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm space-y-1">
                <p><strong>Loan Duration:</strong> 3 months repayment period</p>
                <p><strong>Deadline Extension:</strong> If due date falls on 25th or later, extended to 8th of next month</p>
                <p><strong>Late Payment:</strong> Failure to repay within 3 months attracts additional interest; must be paid within 14 days or face expulsion (70% refund)</p>
                <p><strong>Interest Sharing:</strong> 70% returned to borrower, 30% shared equally among all members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Loan Form */}
        {showForm && isAdmin && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Issue New Loan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Borrower Name</label>
                  <Input placeholder="Member name" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Amount (KSh)</label>
                  <Input type="number" placeholder="Amount" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Interest Rate (%)</label>
                  <Input type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
                </div>
              </div>
              <Button onClick={createLoan} disabled={saving || !borrowerName.trim() || !loanAmount}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Loan
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Active Loans</p>
              <p className="text-2xl font-bold text-blue-600">{activeLoans.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Lent Out</p>
              <p className="text-2xl font-bold">KSh {activeLoans.reduce((s, l) => s + Number(l.amount), 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Repaid Loans</p>
              <p className="text-2xl font-bold text-green-600">{repaidLoans.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Loans List */}
        <Card>
          <CardHeader>
            <CardTitle>All Loans</CardTitle>
          </CardHeader>
          <CardContent>
            {loans.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No loans issued yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {loans.map((loan) => (
                  <div key={loan.id} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{loan.borrower_name}</h3>
                      {getStatusBadge(loan.status)}
                    </div>
                    <div className="grid sm:grid-cols-4 gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="text-foreground font-medium">KSh {Number(loan.amount).toLocaleString()}</span>
                        <p>Principal</p>
                      </div>
                      <div>
                        <span className="text-foreground font-medium">KSh {Number(loan.total_interest).toLocaleString()}</span>
                        <p>Interest ({loan.interest_rate}%)</p>
                      </div>
                      <div>
                        <span className="text-foreground font-medium">{new Date(loan.issued_date).toLocaleDateString()}</span>
                        <p>Issued</p>
                      </div>
                      <div>
                        <span className="text-foreground font-medium">{new Date(loan.extended_due_date || loan.due_date).toLocaleDateString()}</span>
                        <p>Due Date</p>
                      </div>
                    </div>
                    {isAdmin && loan.status === 'active' && (
                      <div className="mt-3 pt-3 border-t">
                        <Button size="sm" variant="outline" onClick={() => markAsRepaid(loan)}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark as Repaid
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
