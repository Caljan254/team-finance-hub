import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle, XCircle, Shield, Users, Plus, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface ContributionRecord {
  id: string;
  member_name: string;
  month: string;
  year: number;
  amount: number;
  status: string;
}

export default function AdminPayments() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ContributionRecord[]>([]);
  const [allMembers, setAllMembers] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toLocaleString('en-US', { month: 'long' })
  );
  const [newMemberName, setNewMemberName] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) checkAdmin();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, selectedYear, selectedMonth]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (data) {
      setIsAdmin(true);
    } else {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Get all unique member names
    const { data: allRecs } = await supabase
      .from('contribution_records')
      .select('member_name')
      .order('member_name');
    
    if (allRecs) {
      const members = [...new Set(allRecs.map(r => r.member_name))].sort();
      setAllMembers(members);
    }

    // Get records for selected month/year
    const { data } = await supabase
      .from('contribution_records')
      .select('*')
      .eq('year', parseInt(selectedYear))
      .eq('month', selectedMonth);

    setRecords((data || []) as ContributionRecord[]);
    setLoading(false);
  };

  const toggleMemberPayment = async (memberName: string) => {
    if (!user) return;
    setSaving(memberName);

    const existing = records.find(r => r.member_name === memberName);

    if (existing) {
      // Remove the record (mark as unpaid)
      await supabase
        .from('contribution_records')
        .delete()
        .eq('id', existing.id);
      toast.success(`Removed ${memberName}'s payment for ${selectedMonth}`);
    } else {
      // Add paid record
      const { error } = await supabase
        .from('contribution_records')
        .insert({
          member_name: memberName,
          month: selectedMonth,
          year: parseInt(selectedYear),
          amount: 500,
          status: 'paid',
          paid_date: new Date().toISOString(),
          marked_by: user.id,
        });
      if (error) {
        toast.error('Failed to save: ' + error.message);
      } else {
        toast.success(`Marked ${memberName} as paid for ${selectedMonth}`);
      }
    }

    setSaving(null);
    fetchData();
  };

  const addNewMember = async () => {
    if (!newMemberName.trim()) return;
    
    const name = newMemberName.trim();
    if (allMembers.includes(name)) {
      toast.error('Member already exists');
      return;
    }

    // Add them as paid for current month
    await supabase.from('contribution_records').insert({
      member_name: name,
      month: selectedMonth,
      year: parseInt(selectedYear),
      amount: 500,
      status: 'paid',
      paid_date: new Date().toISOString(),
      marked_by: user?.id,
    });

    setNewMemberName('');
    toast.success(`Added ${name}`);
    fetchData();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12 text-center">
          <Shield className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const paidMembers = records.map(r => r.member_name);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Admin - Manage Payments
          </h1>
          <p className="text-muted-foreground mt-1">Mark members as paid for each month</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 29 }, (_, i) => 2022 + i).map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Paid this month</p>
              <p className="text-2xl font-bold text-success">{paidMembers.length} / {allMembers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total collected</p>
              <p className="text-2xl font-bold">KSh {(paidMembers.length * 600).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedMonth} {selectedYear} - Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allMembers.map((name, idx) => {
                const isPaid = paidMembers.includes(name);
                const isSaving = saving === name;

                return (
                  <div
                    key={name}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isPaid ? 'bg-success/5 border-success/20' : 'bg-muted/50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                      <span className="font-medium">{name}</span>
                    </div>
                    <Button
                      variant={isPaid ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleMemberPayment(name)}
                      disabled={isSaving}
                      className={isPaid ? 'bg-success hover:bg-success/90' : ''}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isPaid ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Paid
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-1" />
                          Unpaid
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Add new member */}
            <div className="flex gap-2 mt-6 pt-4 border-t">
              <Input
                placeholder="Add new member name..."
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNewMember()}
              />
              <Button onClick={addNewMember} disabled={!newMemberName.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
