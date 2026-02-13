import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Mail, Lock, User, Loader2, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AuthView = 'signin' | 'signup' | 'forgot' | 'forgot-sent';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'signin';
  const [activeTab, setActiveTab] = useState<AuthView>(mode === 'signup' ? 'signup' : 'signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        });
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      signInSchema.parse({ email: signInEmail, password: signInPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }
    
    setLoading(true);
    const { error } = await signIn(signInEmail, signInPassword);
    setLoading(false);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(error.message);
      }
    } else {
      // Check user role and redirect accordingly
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (userRole?.role === 'admin') {
          console.log('👑 Admin user logged in!');
          toast({ title: 'Welcome back, Admin!', description: 'Redirecting to admin dashboard.' });
          navigate('/admin');
        } else {
          console.log('👤 Member user logged in!');
          toast({ title: 'Welcome back!', description: 'You have successfully signed in.' });
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      signUpSchema.parse({
        fullName: signUpName,
        email: signUpEmail,
        password: signUpPassword,
        confirmPassword: signUpConfirmPassword,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }
    
    setLoading(true);
    const { error } = await signUp(signUpEmail, signUpPassword, signUpName);
    setLoading(false);
    
    if (error) {
      if (error.message.includes('already registered')) {
        setError('This email is already registered. Please sign in instead.');
      } else {
        setError(error.message);
      }
    } else {
      toast({ title: 'Account created!', description: 'You can now sign in.' });
      navigate('/dashboard');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!forgotEmail || !z.string().email().safeParse(forgotEmail).success) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth?mode=signin`,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setActiveTab('forgot-sent');
    }
  };

  const renderForm = () => {
    if (activeTab === 'forgot') {
      return (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-sm text-muted-foreground">Enter your email and we'll send you a link to reset your password.</p>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="forgot-email" type="email" placeholder="you@example.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="pl-10" required />
            </div>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : 'Send Reset Link'}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setActiveTab('signin')}>
            Back to Sign In
          </Button>
        </form>
      );
    }

    if (activeTab === 'forgot-sent') {
      return (
        <div className="text-center py-6 space-y-4">
          <CheckCircle className="w-16 h-16 mx-auto text-success" />
          <div>
            <p className="font-semibold text-lg">Check your email</p>
            <p className="text-sm text-muted-foreground">We've sent a password reset link to <strong>{forgotEmail}</strong></p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setActiveTab('signin')}>
            Back to Sign In
          </Button>
        </div>
      );
    }

    return (
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as AuthView); setError(''); }}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <TabsContent value="signin">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="signin-email" type="email" placeholder="you@example.com" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="signin-password" type="password" placeholder="••••••••" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : 'Sign In'}
            </Button>
            <button type="button" className="w-full text-sm text-primary hover:underline" onClick={() => { setActiveTab('forgot'); setError(''); }}>
              Forgot your password?
            </button>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="signup-name" type="text" placeholder="John Doe" value={signUpName} onChange={(e) => setSignUpName(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="signup-email" type="email" placeholder="you@example.com" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="signup-password" type="password" placeholder="••••••••" value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-confirm">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="signup-confirm" type="password" placeholder="••••••••" value={signUpConfirmPassword} onChange={(e) => setSignUpConfirmPassword(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</> : 'Create Account'}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-full bg-primary mx-auto flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">THE TEAM</CardTitle>
            <CardDescription>Diverse but United</CardDescription>
          </CardHeader>
          <CardContent>
            {renderForm()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
