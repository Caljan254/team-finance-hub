import { useState, useEffect } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Target is the 10th of current month, or next month if past the 10th
      let targetDate = new Date(currentYear, currentMonth, 10, 23, 59, 59);
      
      if (now > targetDate) {
        // Move to next month's 10th
        targetDate = new Date(currentYear, currentMonth + 1, 10, 23, 59, 59);
      }
      
      const difference = targetDate.getTime() - now.getTime();
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft({ days, hours, minutes, seconds });
        setIsUrgent(days <= 5);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  const getNextDeadlineDate = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let targetDate = new Date(currentYear, currentMonth, 10);
    
    if (now.getDate() > 10) {
      targetDate = new Date(currentYear, currentMonth + 1, 10);
    }
    
    return targetDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={`rounded-2xl p-6 ${isUrgent ? 'bg-destructive/10 border-destructive/20' : 'bg-muted'} border transition-colors`}>
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground">Payment Deadline</p>
        <p className={`text-lg font-semibold ${isUrgent ? 'text-destructive' : 'text-foreground'}`}>
          {getNextDeadlineDate()}
        </p>
      </div>
      
      <div className="flex justify-center gap-3">
        <div className={`countdown-block ${isUrgent ? 'bg-destructive/10' : ''}`}>
          <span className={`countdown-value ${isUrgent ? 'text-destructive' : ''}`}>
            {String(timeLeft.days).padStart(2, '0')}
          </span>
          <span className="countdown-label">Days</span>
        </div>
        <div className={`countdown-block ${isUrgent ? 'bg-destructive/10' : ''}`}>
          <span className={`countdown-value ${isUrgent ? 'text-destructive' : ''}`}>
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="countdown-label">Hours</span>
        </div>
        <div className={`countdown-block ${isUrgent ? 'bg-destructive/10' : ''}`}>
          <span className={`countdown-value ${isUrgent ? 'text-destructive' : ''}`}>
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="countdown-label">Mins</span>
        </div>
        <div className={`countdown-block ${isUrgent ? 'bg-destructive/10' : ''}`}>
          <span className={`countdown-value ${isUrgent ? 'text-destructive' : ''}`}>
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="countdown-label">Secs</span>
        </div>
      </div>
      
      {isUrgent && (
        <p className="text-center text-sm text-destructive mt-4 animate-pulse-soft">
          ⚠️ Payment deadline approaching! Avoid penalties.
        </p>
      )}
    </div>
  );
}
