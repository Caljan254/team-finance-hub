import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Calendar, Users, TrendingUp } from 'lucide-react';

interface ContributionRecord {
  id: string;
  member_name: string;
  month: string;
  year: number;
  amount: number;
  status: string;
  paid_date: string | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ContributionRecords() {
  const [records, setRecords] = useState<ContributionRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [loading, setLoading] = useState(true);
  const [allMembers, setAllMembers] = useState<string[]>([]);

  useEffect(() => {
    fetchRecords();
  }, [selectedYear]);

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('contribution_records')
      .select('*')
      .eq('year', parseInt(selectedYear))
      .order('member_name');

    if (data) {
      setRecords(data as ContributionRecord[]);
      const members = [...new Set(data.map(r => r.member_name))].sort();
      setAllMembers(members);
    }
    setLoading(false);
  };

  const getMonthRecords = (month: string) => {
    return records.filter(r => r.month === month);
  };

  const getMemberStatus = (memberName: string, month: string) => {
    return records.find(r => r.member_name === memberName && r.month === month);
  };

  const totalCollected = records.filter(r => r.status === 'paid').reduce((sum, r) => sum + Number(r.amount), 0);
  const totalMembers = allMembers.length;

  const displayMonths = selectedMonth === 'all' ? MONTHS : [selectedMonth];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            Contribution Records
          </h1>
          <p className="text-muted-foreground mt-1">View all member contributions by month and year</p>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Collected ({selectedYear})</p>
                  <p className="text-2xl font-bold">KSh {totalCollected.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                  <p className="text-2xl font-bold">{totalMembers}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Payments</p>
                  <p className="text-2xl font-bold">{records.filter(r => r.status === 'paid').length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
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
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {displayMonths.map(month => {
              const monthRecords = getMonthRecords(month);
              if (monthRecords.length === 0 && selectedMonth === 'all') return null;

              const monthTotal = monthRecords.reduce((sum, r) => sum + Number(r.amount), 0);

              return (
                <Card key={month}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{month} {selectedYear}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {monthRecords.length} paid • KSh {monthTotal.toLocaleString()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {monthRecords.length > 0 ? (
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {monthRecords.map((record, idx) => (
                          <div
                            key={record.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-4 h-4 text-success" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{idx + 1}. {record.member_name}</p>
                              <p className="text-xs text-muted-foreground">KSh {Number(record.amount).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No contributions recorded</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
