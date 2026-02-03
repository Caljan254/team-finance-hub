import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Smartphone, Loader2 } from 'lucide-react';

interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  month: string;
  onSuccess: (transactionId: string) => void;
}

type PaymentStep = 'details' | 'pin' | 'processing' | 'success';

export function MpesaPaymentModal({ isOpen, onClose, amount, month, onSuccess }: MpesaPaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>('details');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const handleConfirmDetails = () => {
    if (phoneNumber.length >= 10) {
      setStep('pin');
    }
  };

  const handleSubmitPin = () => {
    if (pin === '1234') {
      setStep('processing');
      
      // Simulate payment processing
      setTimeout(() => {
        const txId = `MPE${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        setTransactionId(txId);
        setStep('success');
      }, 2000);
    }
  };

  const handleComplete = () => {
    onSuccess(transactionId);
    // Reset state
    setStep('details');
    setPhoneNumber('');
    setPin('');
    setTransactionId('');
    onClose();
  };

  const handleClose = () => {
    setStep('details');
    setPhoneNumber('');
    setPin('');
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
                Enter the phone number registered with M-Pesa
              </p>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleConfirmDetails}
              disabled={phoneNumber.length < 10}
            >
              Continue to Payment
            </Button>
          </div>
        )}

        {step === 'pin' && (
          <div className="space-y-6 py-4">
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center">
              <Smartphone className="w-12 h-12 mx-auto text-success mb-2" />
              <p className="text-sm text-muted-foreground">
                An M-Pesa prompt has been sent to
              </p>
              <p className="font-semibold">{phoneNumber}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">Enter M-Pesa PIN (Demo: 1234)</Label>
              <Input
                id="pin"
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={4}
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-muted-foreground text-center">
                For demo purposes, use PIN: 1234
              </p>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              variant="success"
              onClick={handleSubmitPin}
              disabled={pin.length < 4}
            >
              Confirm Payment
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
            <div>
              <p className="font-semibold">Processing Payment...</p>
              <p className="text-sm text-muted-foreground">Please wait while we confirm your payment</p>
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
                <span className="text-muted-foreground">Transaction ID</span>
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
      </DialogContent>
    </Dialog>
  );
}
