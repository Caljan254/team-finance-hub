import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CountdownTimer } from '@/components/CountdownTimer';
import { MpesaPaymentModal } from '@/components/MpesaPaymentModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateOutstanding, type PaymentBreakdown } from '@/lib/penalty-utils';
import { 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  ArrowUpRight,
  Wallet,
  Receipt
} from 'lucide-react';

interface PaymentSummary {
  totalPaid: number;
  totalPenalties: number;
  currentMonthStatus: 'paid' | 'pending' | 'overdue';
  recentPayments: Array<{
    id: string;
    month: string;
    year: number;
    amount: number;
    status: string;
    paid_date: string | null;
  }>;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({
    totalPaid: 0,
    totalPenalties: 0,
    currentMonthStatus: 'pending',
    recentPayments: [],
  });
  const [breakdown, setBreakdown] = useState<PaymentBreakdown>({
    unpaidMonths: [],
    totalContribution: 0,
    totalPenalties: 0,
    grandTotal: 0,
  });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPaymentData();
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();
    if (data) setProfile(data);
  };

  const fetchPaymentData = async () => {
    if (!user) return;

    // Fetch payments
    const { data: allPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    // Get profile name
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const memberName = profileData?.full_name || '';

    // Fetch contribution records for this member
    const { data: contributionRecords } = await supabase
      .from('contribution_records')
      .select('*')
      .eq('member_name', memberName)
      .eq('status', 'paid')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    // Fetch paid penalties for this user
    const { data: paidPenalties } = await supabase
      .from('penalties')
      .select('month, year')
      .eq('user_id', user.id)
      .eq('paid', true);

    const payments = allPayments || [];
    const records = contributionRecords || [];

    // Build paid months from both sources
    const paidFromPayments = payments
      .filter(p => p.status === 'paid')
      .map(p => ({ month: p.month, year: p.year, status: p.status }));
    
    const paidSet = new Set(paidFromPayments.map(p => `${p.month}-${p.year}`));
    const allPaidMonths = [...paidFromPayments];
    for (const r of records) {
      const key = `${r.month}-${r.year}`;
      if (!paidSet.has(key)) {
        allPaidMonths.push({ month: r.month, year: r.year, status: 'paid' });
        paidSet.add(key);
      }
    }

    // Total contributed = count of paid months * 500
    const totalPaid = allPaidMonths.length * 500;
    
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
    const currentYear = new Date().getFullYear();
    const currentMonthPaid = allPaidMonths.some(p => p.month === currentMonth && p.year === currentYear);
    
    // Calculate outstanding with paid penalties
    const paidPenaltyMonths = (paidPenalties || []).map(p => ({ month: p.month, year: p.year }));
    const outstanding = calculateOutstanding(allPaidMonths, paidPenaltyMonths);
    setBreakdown(outstanding);

    // Build recent payments from contribution records
    const recentFromRecords = records
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        month: r.month,
        year: r.year,
        amount: Number(r.amount),
        status: r.status,
        paid_date: r.paid_date,
      }));

    const recentPayments = recentFromRecords.length > 0 
      ? recentFromRecords 
      : payments.slice(0, 5).map(p => ({
          id: p.id,
          month: p.month,
          year: p.year,
          amount: Number(p.amount),
          status: p.status,
          paid_date: p.paid_date,
        }));
    
    setPaymentSummary({
      totalPaid,
      totalPenalties: outstanding.totalPenalties,
      currentMonthStatus: currentMonthPaid ? 'paid' : 'pending',
      recentPayments,
    });
  };

  const handlePaymentSuccess = async (_transactionId: string) => {
    fetchPaymentData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium status-paid border">
            <CheckCircle className="w-3 h-3" />
            Paid
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium status-overdue border">
            <AlertTriangle className="w-3 h-3" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium status-pending border">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Member'}!
          </h1>
          <p className="text-muted-foreground">Here's your financial overview</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Contributed</p>
                      <p className="text-2xl font-bold text-foreground">
                        KSh {paymentSummary.totalPaid.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Penalties</p>
                      <p className="text-2xl font-bold text-foreground">
                        KSh {paymentSummary.totalPenalties.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-warning" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">This Month</p>
                      <div className="mt-1">
                        {getStatusBadge(paymentSummary.currentMonthStatus)}
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <div className={`p-6 text-primary-foreground ${breakdown.grandTotal > 0 ? 'bg-gradient-to-r from-destructive/90 to-destructive/70' : 'bg-gradient-to-r from-primary to-accent'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {breakdown.grandTotal > 0 ? 'Outstanding Balance' : 'All Caught Up!'}
                    </h3>
                    <p className="text-primary-foreground/80">
                      {breakdown.unpaidMonths.length > 0 
                        ? `${breakdown.unpaidMonths.length} unpaid month${breakdown.unpaidMonths.length > 1 ? 's' : ''}`
                        : 'No pending payments'
                      }
                    </p>
                  </div>
                  <CreditCard className="w-12 h-12 opacity-50" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">KSh {breakdown.grandTotal.toLocaleString()}</p>
                    {breakdown.totalPenalties > 0 && (
                      <p className="text-sm text-primary-foreground/80">
                        Includes KSh {breakdown.totalPenalties.toLocaleString()} in penalties
                      </p>
                    )}
                  </div>
                  {breakdown.grandTotal > 0 && (
                    <Button 
                      variant="secondary" 
                      size="lg"
                      onClick={() => setIsPaymentModalOpen(true)}
                    >
                      Pay Now
                      <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Recent Payments
                </CardTitle>
                <CardDescription>Your payment history</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentSummary.recentPayments.length > 0 ? (
                  <div className="space-y-3">
                    {paymentSummary.recentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{payment.month} {payment.year}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.paid_date 
                              ? new Date(payment.paid_date).toLocaleDateString()
                              : 'Not paid yet'
                            }
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">KSh {Number(payment.amount).toLocaleString()}</p>
                          {getStatusBadge(payment.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No payments yet</p>
                    <p className="text-sm">Make your first contribution to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <CountdownTimer />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly Amount</span>
                  <span className="font-medium">KSh 500</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deadline</span>
                  <span className="font-medium">10th of next month</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Late Penalty</span>
                  <span className="font-medium text-destructive">KSh 10/day</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="font-medium">M-Pesa</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground">Stay on Track!</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pay before the 10th of next month to avoid daily penalties. Every contribution counts towards our collective goal.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />

      <MpesaPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        amount={breakdown.grandTotal}
        month={breakdown.unpaidMonths.map(u => u.month).join(', ')}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
