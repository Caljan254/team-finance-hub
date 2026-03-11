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
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  Receipt,
  Calendar,
  ArrowUpRight
} from 'lucide-react';

interface Payment {
  id: string;
  month: string;
  year: number;
  amount: number;
  penalty_amount: number;
  total_amount: number;
  status: string;
  paid_date: string | null;
  transaction_id: string | null;
}

export default function Payments() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [breakdown, setBreakdown] = useState<PaymentBreakdown>({
    unpaidMonths: [],
    totalContribution: 0,
    totalPenalties: 0,
    grandTotal: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    if (!user) return;
    setLoadingPayments(true);

    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    // Also fetch contribution records for this user
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const memberName = profileData?.full_name || '';

    const { data: contributionRecords } = await supabase
      .from('contribution_records')
      .select('*')
      .eq('member_name', memberName)
      .eq('status', 'paid')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    const records = contributionRecords || [];

    if (data) {
      setPayments(data as Payment[]);

      // Merge paid months from both sources for penalty calculation
      const paidFromPayments = data
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

      const outstanding = calculateOutstanding(allPaidMonths);
      setBreakdown(outstanding);
    }
    
    setLoadingPayments(false);
  };

  const handlePaymentSuccess = async (_transactionId: string) => {
    // Payment is already saved by MpesaPaymentModal, just refresh
    fetchPayments();
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

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();

  const hasOutstanding = breakdown.grandTotal > 0;

  if (loading || loadingPayments) {
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-primary" />
            Payments
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your contributions and view payment history
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Payment Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Outstanding Balance Card */}
            <Card className="overflow-hidden">
              <div className={`p-6 ${hasOutstanding ? 'bg-gradient-to-r from-destructive/90 to-destructive/70' : 'bg-gradient-to-r from-primary to-accent'} text-primary-foreground`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {hasOutstanding ? 'Outstanding Balance' : 'All Caught Up!'}
                    </h3>
                    <p className="text-primary-foreground/80">
                      {hasOutstanding 
                        ? `${breakdown.unpaidMonths.length} unpaid month${breakdown.unpaidMonths.length > 1 ? 's' : ''}`
                        : 'No pending payments'
                      }
                    </p>
                  </div>
                  <CreditCard className="w-12 h-12 opacity-50" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">
                      KSh {breakdown.grandTotal.toLocaleString()}
                    </p>
                    {breakdown.totalPenalties > 0 && (
                      <p className="text-sm text-primary-foreground/80">
                        Includes KSh {breakdown.totalPenalties.toLocaleString()} in penalties
                      </p>
                    )}
                  </div>
                  {hasOutstanding && (
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

            {/* Unpaid Months Breakdown */}
            {breakdown.unpaidMonths.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Unpaid Penalties Breakdown
                  </CardTitle>
                  <CardDescription>KSh 10/day penalty after the 10th of each month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {breakdown.unpaidMonths.map((item) => (
                      <div
                        key={`${item.month}-${item.year}`}
                        className="flex items-center justify-between p-4 rounded-xl bg-destructive/5 border border-destructive/10"
                      >
                        <div>
                          <p className="font-medium">{item.month} {item.year}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.penaltyDays > 0 
                              ? `${item.penaltyDays} day${item.penaltyDays > 1 ? 's' : ''} overdue`
                              : 'Due by the 10th'
                            }
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">KSh {item.totalDue.toLocaleString()}</p>
                          <div className="text-xs text-muted-foreground">
                            <span>500 contribution</span>
                            {item.penaltyAmount > 0 && (
                              <span className="text-destructive"> + {item.penaltyAmount.toLocaleString()} penalty</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Total row */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/10 border border-destructive/20 font-semibold">
                      <p>Total Due</p>
                      <p className="text-lg">KSh {breakdown.grandTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Calendar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {currentYear} Payment Calendar
                </CardTitle>
                <CardDescription>Track your monthly contributions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {months.map((month, index) => {
                    const payment = payments.find(p => p.month === month && p.year === currentYear && p.status === 'paid');
                    const unpaid = breakdown.unpaidMonths.find(u => u.month === month && u.year === currentYear);
                    const isPast = index < currentMonthIndex;
                    const isCurrent = index === currentMonthIndex;
                    const isFuture = index > currentMonthIndex;
                    
                    return (
                      <div
                        key={month}
                        className={`p-3 rounded-xl text-center transition-all ${
                          payment
                            ? 'bg-success/10 border-2 border-success/30'
                            : unpaid && unpaid.penaltyAmount > 0
                            ? 'bg-destructive/10 border-2 border-destructive/30'
                            : isCurrent
                            ? 'bg-primary/10 border-2 border-primary/30'
                            : isFuture
                            ? 'bg-muted border-2 border-transparent'
                            : 'bg-destructive/10 border-2 border-destructive/30'
                        }`}
                      >
                        <p className="text-xs font-medium text-muted-foreground">
                          {month.slice(0, 3)}
                        </p>
                        <div className="mt-1">
                          {payment ? (
                            <CheckCircle className="w-5 h-5 mx-auto text-success" />
                          ) : unpaid && unpaid.penaltyAmount > 0 ? (
                            <div>
                              <AlertTriangle className="w-5 h-5 mx-auto text-destructive" />
                              <p className="text-[10px] text-destructive font-medium mt-0.5">
                                +{unpaid.penaltyAmount}
                              </p>
                            </div>
                          ) : isCurrent ? (
                            <Clock className="w-5 h-5 mx-auto text-primary" />
                          ) : isFuture ? (
                            <div className="w-5 h-5 mx-auto rounded-full border-2 border-muted-foreground/30" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 mx-auto text-destructive" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Payment History
                  </CardTitle>
                  <CardDescription>All your contribution records</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                {payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{payment.month} {payment.year}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.paid_date 
                              ? `Paid on ${new Date(payment.paid_date).toLocaleDateString()}`
                              : 'Not paid yet'
                            }
                          </p>
                          {payment.transaction_id && (
                            <p className="text-xs text-muted-foreground font-mono mt-1">
                              Ref: {payment.transaction_id}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            KSh {Number(payment.total_amount).toLocaleString()}
                          </p>
                          {Number(payment.penalty_amount) > 0 && (
                            <p className="text-xs text-destructive">
                              +KSh {Number(payment.penalty_amount)} penalty
                            </p>
                          )}
                          <div className="mt-1">
                            {getStatusBadge(payment.status)}
                          </div>
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

          {/* Right Column - Countdown & Info */}
          <div className="space-y-6">
            <CountdownTimer />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Monthly Amount</p>
                    <p className="text-muted-foreground">KSh 500 due every month</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Deadline</p>
                    <p className="text-muted-foreground">Pay by the 10th of each month</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-destructive font-semibold">!</span>
                  </div>
                  <div>
                    <p className="font-medium">Late Penalty</p>
                    <p className="text-muted-foreground">KSh 10 per day after deadline</p>
                  </div>
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
