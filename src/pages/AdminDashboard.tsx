import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, Users, Bell, CreditCard, CheckCircle, XCircle, Plus, 
  Loader2, UserCheck, UserX, Send, AlertTriangle, Trash2, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { calculateOutstanding } from '@/lib/penalty-utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean | null;
  join_date: string | null;
}

interface ContributionRecord {
  id: string;
  member_name: string;
  month: string;
  year: number;
  amount: number;
  status: string;
}

interface MemberFinancialSummary {
  memberName: string;
  totalPaid: number;
  totalOwed: number;
  totalPenalties: number;
  paidMonths: number;
  unpaidMonths: number;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payments');

  // Payment state
  const [records, setRecords] = useState<ContributionRecord[]>([]);
  const [allMembers, setAllMembers] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('en-US', { month: 'long' }));
  const [newMemberName, setNewMemberName] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  // Members state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [deletingMember, setDeletingMember] = useState<string | null>(null);

  // Notifications state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('general');
  const [sendingNotif, setSendingNotif] = useState(false);

  // Member financial overview
  const [memberSummaries, setMemberSummaries] = useState<MemberFinancialSummary[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) checkAdmin();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'payments') fetchPaymentData();
      if (activeTab === 'members') fetchProfiles();
      if (activeTab === 'overview') fetchMemberOverview();
    }
  }, [isAdmin, activeTab, selectedYear, selectedMonth]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    setIsAdmin(!!data);
    setLoading(false);
  };

  // --- PAYMENTS ---
  const fetchPaymentData = async () => {
    const { data: allRecs } = await supabase
      .from('contribution_records')
      .select('member_name')
      .order('member_name');
    
    if (allRecs) {
      const members = [...new Set(allRecs.map(r => r.member_name))].sort();
      setAllMembers(members);
    }

    const { data } = await supabase
      .from('contribution_records')
      .select('*')
      .eq('year', parseInt(selectedYear))
      .eq('month', selectedMonth);

    setRecords((data || []) as ContributionRecord[]);
  };

  const toggleMemberPayment = async (memberName: string) => {
    if (!user) return;
    setSaving(memberName);
    const existing = records.find(r => r.member_name === memberName);

    if (existing) {
      await supabase.from('contribution_records').delete().eq('id', existing.id);
      toast.success(`Removed ${memberName}'s payment for ${selectedMonth}`);
    } else {
      const { error } = await supabase.from('contribution_records').insert({
        member_name: memberName,
        month: selectedMonth,
        year: parseInt(selectedYear),
        amount: 600,
        status: 'paid',
        paid_date: new Date().toISOString(),
        marked_by: user.id,
      });
      if (error) { console.error('Save error:', error); toast.error('Failed to save payment record'); }
      else toast.success(`Marked ${memberName} as paid for ${selectedMonth}`);
    }

    setSaving(null);
    fetchPaymentData();
  };

  const addNewMember = async () => {
    if (!newMemberName.trim()) return;
    const name = newMemberName.trim();
    if (allMembers.includes(name)) {
      toast.error('Member already exists');
      return;
    }

    await supabase.from('contribution_records').insert({
      member_name: name,
      month: selectedMonth,
      year: parseInt(selectedYear),
      amount: 600,
      status: 'paid',
      paid_date: new Date().toISOString(),
      marked_by: user?.id,
    });

    setNewMemberName('');
    toast.success(`Added ${name}`);
    fetchPaymentData();
  };

  // --- MEMBERS ---
  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    if (data) setProfiles(data as Profile[]);
    setLoadingProfiles(false);
  };

  const toggleMemberStatus = async (profile: Profile) => {
    const newStatus = !profile.is_active;
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', profile.id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`${profile.full_name} is now ${newStatus ? 'Active' : 'Inactive'}`);
      fetchProfiles();
    }
  };

  const deleteMember = async (profile: Profile) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete ${profile.full_name}? This will remove their profile, roles, payments, and all associated data. This action cannot be undone!`)) {
      return;
    }
    setDeletingMember(profile.id);
    
    // Delete related data first
    await supabase.from('notifications').delete().eq('user_id', profile.user_id);
    await supabase.from('payments').delete().eq('user_id', profile.user_id);
    await supabase.from('penalties').delete().eq('user_id', profile.user_id);
    await supabase.from('user_roles').delete().eq('user_id', profile.user_id);
    
    // Delete contribution records by name
    await supabase.from('contribution_records').delete().eq('member_name', profile.full_name);
    
    // Delete profile
    const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
    
    if (error) {
      toast.error('Failed to delete member: ' + error.message);
    } else {
      toast.success(`${profile.full_name} has been permanently deleted`);
      fetchProfiles();
    }
    setDeletingMember(null);
  };

  // --- MEMBER FINANCIAL OVERVIEW ---
  const fetchMemberOverview = async () => {
    setLoadingSummaries(true);
    
    // Get all contribution records
    const { data: allRecs } = await supabase
      .from('contribution_records')
      .select('*')
      .order('member_name');
    
    if (allRecs) {
      const memberNames = [...new Set(allRecs.map(r => r.member_name))].sort();
      
      const summaries: MemberFinancialSummary[] = memberNames.map(name => {
        const memberRecs = allRecs.filter(r => r.member_name === name);
        const paidRecs = memberRecs.filter(r => r.status === 'paid');
        const totalPaid = paidRecs.reduce((sum, r) => sum + Number(r.amount), 0);
        
        // Calculate outstanding using penalty-utils
        const breakdown = calculateOutstanding(
          paidRecs.map(r => ({ month: r.month, year: r.year, status: r.status }))
        );
        
        return {
          memberName: name,
          totalPaid,
          totalOwed: breakdown.grandTotal,
          totalPenalties: breakdown.totalPenalties,
          paidMonths: paidRecs.length,
          unpaidMonths: breakdown.unpaidMonths.length,
        };
      });
      
      setMemberSummaries(summaries);
    }
    setLoadingSummaries(false);
  };

  // --- NOTIFICATIONS ---
  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.error('Please fill in title and message');
      return;
    }
    setSendingNotif(true);

    try {
      // Call edge function to send notifications + emails
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: notifTitle.trim(),
            message: notifMessage.trim(),
            type: notifType,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success(`Notification sent to ${result.emails?.length || 0} members!`);
        setNotifTitle('');
        setNotifMessage('');
        setNotifType('general');
      } else {
        toast.error('Failed to send: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      // Fallback: just save to DB
      await supabase.from('notifications').insert({
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: notifType,
        user_id: null,
      });
      toast.success('Notification saved (email delivery pending)');
      setNotifTitle('');
      setNotifMessage('');
      setNotifType('general');
    }
    setSendingNotif(false);
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
  const unpaidMembers = allMembers.filter(m => !paidMembers.includes(m));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Manage payments, members, and notifications</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="payments" className="gap-2"><CreditCard className="w-4 h-4" />Payments</TabsTrigger>
            <TabsTrigger value="overview" className="gap-2"><Eye className="w-4 h-4" />Overview</TabsTrigger>
            <TabsTrigger value="members" className="gap-2"><Users className="w-4 h-4" />Members</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2"><Bell className="w-4 h-4" />Notifications</TabsTrigger>
            <TabsTrigger value="penalties" className="gap-2"><AlertTriangle className="w-4 h-4" />Penalties</TabsTrigger>
          </TabsList>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments">
            <div className="flex flex-wrap gap-4 mb-6">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold text-green-600">{paidMembers.length} / {allMembers.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Unpaid</p>
                  <p className="text-2xl font-bold text-red-600">{unpaidMembers.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Collected</p>
                  <p className="text-2xl font-bold">KSh {(paidMembers.length * 600).toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

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
                      <div key={name} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isPaid ? 'bg-green-50 border-green-200' : 'bg-muted/50 border-transparent'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                          <span className="font-medium">{name}</span>
                        </div>
                        <Button variant={isPaid ? 'default' : 'outline'} size="sm" onClick={() => toggleMemberPayment(name)} disabled={isSaving} className={isPaid ? 'bg-green-600 hover:bg-green-700' : ''}>
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isPaid ? <><CheckCircle className="w-4 h-4 mr-1" />Paid</> : <><XCircle className="w-4 h-4 mr-1" />Unpaid</>}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-6 pt-4 border-t">
                  <Input placeholder="Add new member name..." value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNewMember()} />
                  <Button onClick={addNewMember} disabled={!newMemberName.trim()}><Plus className="w-4 h-4 mr-1" />Add</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MEMBER FINANCIAL OVERVIEW TAB */}
          <TabsContent value="overview">
            {loadingSummaries ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Members</p>
                      <p className="text-2xl font-bold">{memberSummaries.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Collected</p>
                      <p className="text-2xl font-bold text-green-600">
                        KSh {memberSummaries.reduce((s, m) => s + m.totalPaid, 0).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Outstanding</p>
                      <p className="text-2xl font-bold text-red-600">
                        KSh {memberSummaries.reduce((s, m) => s + m.totalOwed, 0).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Member Financial Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium">#</th>
                            <th className="text-left p-3 font-medium">Member</th>
                            <th className="text-right p-3 font-medium">Paid Months</th>
                            <th className="text-right p-3 font-medium">Total Paid</th>
                            <th className="text-right p-3 font-medium">Unpaid Months</th>
                            <th className="text-right p-3 font-medium">Penalties</th>
                            <th className="text-right p-3 font-medium">Total Owed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {memberSummaries.map((member, idx) => (
                            <tr key={member.memberName} className="border-b hover:bg-muted/50">
                              <td className="p-3 text-muted-foreground">{idx + 1}</td>
                              <td className="p-3 font-medium">{member.memberName}</td>
                              <td className="p-3 text-right text-green-600">{member.paidMonths}</td>
                              <td className="p-3 text-right text-green-600">KSh {member.totalPaid.toLocaleString()}</td>
                              <td className="p-3 text-right text-red-600">{member.unpaidMonths}</td>
                              <td className="p-3 text-right text-orange-600">KSh {member.totalPenalties.toLocaleString()}</td>
                              <td className="p-3 text-right font-semibold">
                                <span className={member.totalOwed > 0 ? 'text-red-600' : 'text-green-600'}>
                                  KSh {member.totalOwed.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* MEMBERS TAB */}
          <TabsContent value="members">
            {loadingProfiles ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Members</p>
                      <p className="text-2xl font-bold">{profiles.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Active</p>
                      <p className="text-2xl font-bold text-green-600">{profiles.filter(p => p.is_active).length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Inactive</p>
                      <p className="text-2xl font-bold text-red-600">{profiles.filter(p => !p.is_active).length}</p>
                    </CardContent>
                  </Card>
                </div>

                {profiles.map((profile) => (
                  <Card key={profile.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <h3 className="font-semibold">{profile.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{profile.email}</p>
                          {profile.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            Joined: {profile.join_date ? new Date(profile.join_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${profile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {profile.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                            {profile.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => toggleMemberStatus(profile)}>
                            {profile.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => deleteMember(profile)}
                            disabled={deletingMember === profile.id}
                          >
                            {deletingMember === profile.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <><Trash2 className="w-4 h-4 mr-1" />Delete</>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* NOTIFICATIONS TAB */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Send Notification to All Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Notifications will be saved in-app. Members will see them when they log in.
                </p>
                <div>
                  <label className="text-sm font-medium mb-1 block">Type</label>
                  <Select value={notifType} onValueChange={setNotifType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                      <SelectItem value="meeting">Meeting Notice</SelectItem>
                      <SelectItem value="penalty">Penalty Notice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <Input placeholder="Notification title..." value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Message</label>
                  <Textarea placeholder="Write your message here..." rows={4} value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} />
                </div>
                <Button onClick={sendNotification} disabled={sendingNotif || !notifTitle.trim() || !notifMessage.trim()} className="w-full sm:w-auto">
                  {sendingNotif ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send to All Members</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PENALTIES TAB */}
          <TabsContent value="penalties">
            <PenaltiesTab selectedMonth={selectedMonth} selectedYear={selectedYear} allMembers={allMembers} paidMembers={paidMembers} />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

// Penalties sub-component
function PenaltiesTab({ selectedMonth, selectedYear, allMembers, paidMembers }: { selectedMonth: string; selectedYear: string; allMembers: string[]; paidMembers: string[] }) {
  const today = new Date();
  const currentDay = today.getDate();
  const isOverDeadline = currentDay > 10;
  const daysLate = isOverDeadline ? currentDay - 10 : 0;
  const penaltyPerDay = 10;

  const unpaidMembers = allMembers.filter(m => !paidMembers.includes(m));
  const currentMonth = today.toLocaleString('en-US', { month: 'long' });
  const currentYear = today.getFullYear().toString();
  const isCurrentPeriod = selectedMonth === currentMonth && selectedYear === currentYear;

  return (
    <div>
      {isCurrentPeriod && isOverDeadline && unpaidMembers.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Penalty Alert - {daysLate} days past deadline</h3>
          </div>
          <p className="text-sm text-red-700">
            {unpaidMembers.length} member(s) have not paid. Penalty: KSh {penaltyPerDay}/day = KSh {daysLate * penaltyPerDay} accumulated per member.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Unpaid Members - {selectedMonth} {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {unpaidMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>All members have paid for this month!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {unpaidMembers.map((name, idx) => (
                <div key={name} className="flex items-center justify-between p-3 rounded-lg border bg-red-50 border-red-100">
                  <div>
                    <span className="text-sm text-muted-foreground mr-2">{idx + 1}.</span>
                    <span className="font-medium">{name}</span>
                  </div>
                  {isCurrentPeriod && isOverDeadline && (
                    <span className="text-sm font-medium text-red-600">
                      Penalty: KSh {(daysLate * penaltyPerDay).toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
