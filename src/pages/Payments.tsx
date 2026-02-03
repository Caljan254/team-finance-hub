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
  const [currentMonthPaid, setCurrentMonthPaid] = useState(false);

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

    if (data) {
      setPayments(data as Payment[]);
      
      // Check if current month is paid
      const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
      const currentYear = new Date().getFullYear();
      const currentPayment = data.find(p => p.month === currentMonth && p.year === currentYear);
      setCurrentMonthPaid(currentPayment?.status === 'paid');
    }
    
    setLoadingPayments(false);
  };

  const getCurrentMonth = () => {
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const handlePaymentSuccess = async (transactionId: string) => {
    if (!user) return;

    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
    const currentYear = new Date().getFullYear();

    await supabase.from('payments').insert({
      user_id: user.id,
      amount: 600,
      month: currentMonth,
      year: currentYear,
      status: 'paid',
      paid_date: new Date().toISOString(),
      transaction_id: transactionId,
      total_amount: 600,
    });

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

  // Generate months for the year
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();

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
            {/* Quick Pay Card */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-accent p-6 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Make Payment</h3>
                    <p className="text-primary-foreground/80">
                      {getCurrentMonth()} Contribution
                    </p>
                  </div>
                  <CreditCard className="w-12 h-12 opacity-50" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">KSh 600</p>
                    <p className="text-sm text-primary-foreground/80">Monthly contribution</p>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="lg"
                    onClick={() => setIsPaymentModalOpen(true)}
                    disabled={currentMonthPaid}
                  >
                    {currentMonthPaid ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Paid
                      </>
                    ) : (
                      <>
                        Pay Now
                        <ArrowUpRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

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
                    const payment = payments.find(p => p.month === month && p.year === currentYear);
                    const isPast = index < currentMonthIndex;
                    const isCurrent = index === currentMonthIndex;
                    
                    return (
                      <div
                        key={month}
                        className={`p-3 rounded-xl text-center transition-all ${
                          payment?.status === 'paid'
                            ? 'bg-success/10 border-2 border-success/30'
                            : isCurrent
                            ? 'bg-primary/10 border-2 border-primary/30'
                            : isPast
                            ? 'bg-destructive/10 border-2 border-destructive/30'
                            : 'bg-muted border-2 border-transparent'
                        }`}
                      >
                        <p className="text-xs font-medium text-muted-foreground">
                          {month.slice(0, 3)}
                        </p>
                        <div className="mt-1">
                          {payment?.status === 'paid' ? (
                            <CheckCircle className="w-5 h-5 mx-auto text-success" />
                          ) : isCurrent ? (
                            <Clock className="w-5 h-5 mx-auto text-primary" />
                          ) : isPast ? (
                            <AlertTriangle className="w-5 h-5 mx-auto text-destructive" />
                          ) : (
                            <div className="w-5 h-5 mx-auto rounded-full border-2 border-muted-foreground/30" />
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
                    <p className="text-muted-foreground">KSh 600 due every month</p>
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
        amount={600}
        month={getCurrentMonth()}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
