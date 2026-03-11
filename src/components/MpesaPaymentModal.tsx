import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Smartphone, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  month: string;
  onSuccess: (transactionId: string) => void;
}

type PaymentStep = 'details' | 'processing' | 'polling' | 'success' | 'error';

export function MpesaPaymentModal({ isOpen, onClose, amount, month, onSuccess }: MpesaPaymentModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<PaymentStep>('details');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [checkoutRequestID, setCheckoutRequestID] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pollCount, setPollCount] = useState(0);

  // Poll for payment status
  useEffect(() => {
    if (step !== 'polling' || !checkoutRequestID) return;

    const interval = setInterval(async () => {
      setPollCount(prev => {
        if (prev >= 30) {
          clearInterval(interval);
          setStep('error');
          setErrorMessage('Payment timed out. Please check your M-Pesa messages and try again.');
          return prev;
        }
        return prev + 1;
      });

      try {
        const { data, error } = await supabase.functions.invoke('mpesa-query', {
          body: { checkoutRequestID },
        });

        if (error) return;

        if (data?.resultCode === '0' || data?.resultCode === 0) {
          clearInterval(interval);
          // Check DB for transaction ID
          const { data: payment } = await supabase
            .from('payments')
            .select('transaction_id')
            .eq('transaction_id', checkoutRequestID)
            .single();

          const txId = payment?.transaction_id || checkoutRequestID;
          setTransactionId(txId);
          setStep('success');
        } else if (data?.resultCode && data.resultCode !== '0') {
          clearInterval(interval);
          setStep('error');
          setErrorMessage(data.resultDesc || 'Payment was cancelled or failed.');
        }
      } catch {
        // Continue polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [step, checkoutRequestID]);

  const handleInitiatePayment = async () => {
    if (phoneNumber.length < 10 || !user) return;
    
    setStep('processing');
    setErrorMessage('');

    try {
      // Create a pending payment record
      const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
      const currentYear = new Date().getFullYear();

      const { data: stkData, error: stkError } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phoneNumber,
          amount,
          accountReference: '0718510747',
          transactionDesc: `${month} Contribution`,
        },
      });

      if (stkError || !stkData?.success) {
        throw new Error(stkData?.error || 'Failed to initiate payment');
      }

      const crid = stkData.checkoutRequestID;
      setCheckoutRequestID(crid);

      // Save pending payment with checkout request ID as temporary transaction_id
      await supabase.from('payments').insert({
        user_id: user.id,
        amount: 500,
        month: currentMonth,
        year: currentYear,
        status: 'pending',
        transaction_id: crid,
        total_amount: amount,
      });

      setStep('polling');
      setPollCount(0);
    } catch (err: any) {
      setStep('error');
      setErrorMessage(err.message || 'Failed to initiate M-Pesa payment');
    }
  };

  const handleComplete = () => {
    onSuccess(transactionId);
    resetState();
    onClose();
  };

  const resetState = () => {
    setStep('details');
    setPhoneNumber('');
    setCheckoutRequestID('');
    setTransactionId('');
    setErrorMessage('');
    setPollCount(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-success-foreground" />
            </div>
            M-Pesa Payment
          </DialogTitle>
        </DialogHeader>

        {step === 'details' && (
          <div className="space-y-6 py-4">
            <div className="bg-muted rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">KSh {amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">For</span>
                <span className="font-medium">{month} Contribution</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paybill</span>
                <span className="font-medium">247247</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account</span>
                <span className="font-medium">0718510747</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">M-Pesa Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">
                An STK push prompt will be sent to this number
              </p>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleInitiatePayment}
              disabled={phoneNumber.length < 10}
            >
              Pay via M-Pesa
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
            <div>
              <p className="font-semibold">Sending STK Push...</p>
              <p className="text-sm text-muted-foreground">Please wait for the M-Pesa prompt on your phone</p>
            </div>
          </div>
        )}

        {step === 'polling' && (
          <div className="py-8 text-center space-y-4">
            <div className="relative">
              <Smartphone className="w-16 h-16 mx-auto text-success animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-lg">Enter your M-Pesa PIN</p>
              <p className="text-muted-foreground">
                Check your phone for the M-Pesa prompt and enter your PIN to complete payment
              </p>
            </div>
            <div className="bg-muted rounded-xl p-4">
              <Loader2 className="w-5 h-5 mx-auto text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">
                Waiting for confirmation... ({pollCount}/30)
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-success" />
            </div>
            <div>
              <p className="text-xl font-bold text-success">Payment Successful!</p>
              <p className="text-muted-foreground">Your contribution has been received</p>
            </div>
            <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono font-medium">{transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">KSh {amount.toLocaleString()}</span>
              </div>
            </div>
            <Button className="w-full" size="lg" onClick={handleComplete}>
              Done
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-bold text-destructive">Payment Failed</p>
              <p className="text-muted-foreground">{errorMessage}</p>
            </div>
            <Button className="w-full" size="lg" variant="outline" onClick={() => setStep('details')}>
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
