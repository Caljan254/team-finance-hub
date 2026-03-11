import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  Phone,
  Mail,
  Calendar,
  Users,
  Grid,
  List,
  CheckCircle,
  Download,
  Share,
} from 'lucide-react';
import { toast } from 'sonner';

interface Member {
  id: string;
  full_name: string;
  email?: string;
  phone?: string | null;
  profile_image?: string | null;
  join_date?: string;
  source: 'profile' | 'contribution';
}

export default function Members() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAllMembers();
    }
  }, [user]);

  const fetchAllMembers = async () => {
    setLoadingMembers(true);
    try {
      // Fetch from member_directory (profiles)
      const { data: profiles } = await supabase
        .from('member_directory' as any)
        .select('*')
        .order('full_name') as { data: any[] | null; error: any };

      // Fetch unique member names from contribution_records
      const { data: contribRecords } = await supabase
        .from('contribution_records')
        .select('member_name')
        .order('member_name');

      const profileMembers: Member[] = (profiles || []).map((p: any) => ({
        id: p.id || p.user_id || p.full_name,
        full_name: p.full_name || '',
        email: p.email || '',
        phone: p.phone || null,
        profile_image: p.profile_image || null,
        join_date: p.join_date || '',
        source: 'profile' as const,
      }));

      // Get unique names from contribution records not already in profiles
      const profileNames = new Set(profileMembers.map(m => m.full_name.toLowerCase()));
      const contribNames = [...new Set((contribRecords || []).map(r => r.member_name))];
      
      const contribOnlyMembers: Member[] = contribNames
        .filter(name => !profileNames.has(name.toLowerCase()))
        .map(name => ({
          id: `contrib-${name}`,
          full_name: name,
          source: 'contribution' as const,
        }));

      setMembers([...profileMembers, ...contribOnlyMembers]);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return imagePath;
    if (!imagePath.includes('/')) return `/uploads/${imagePath}`;
    return imagePath;
  };

  const exportMembersToCSV = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Join Date'],
      ...members.map(member => [
        member.full_name,
        member.email || '',
        member.phone || '',
        member.join_date ? new Date(member.join_date).toLocaleDateString() : '',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Members exported to CSV');
  };

  const generateSignupLink = () => {
    const signupUrl = `${window.location.origin}/auth?action=signup`;
    navigator.clipboard.writeText(signupUrl)
      .then(() => toast.success('Signup link copied to clipboard!'))
      .catch(() => toast.info(`Signup link: ${signupUrl}`));
  };

  const filteredMembers = members.filter(member =>
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (member.phone && member.phone.includes(searchTerm))
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading || loadingMembers) {
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                Members Directory
              </h1>
              <p className="text-muted-foreground mt-1">
                {members.length} active members
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportMembersToCSV} variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button onClick={generateSignupLink} variant="outline" size="sm" className="gap-2">
                <Share className="w-4 h-4" />
                Get Signup Link
              </Button>
            </div>
          </div>
        </div>

        {members.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('grid')}>
                <Grid className="w-4 h-4" />
              </Button>
              <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('list')}>
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {filteredMembers.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMembers.map((member) => {
                const imageUrl = getImageUrl(member.profile_image);
                return (
                  <Card key={member.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="relative w-24 h-24 mx-auto mb-4">
                          <Avatar className="w-full h-full border-2 border-primary/20">
                            <AvatarImage src={imageUrl || undefined} alt={member.full_name} className="object-cover" />
                            <AvatarFallback className="text-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <h3 className="font-semibold text-lg text-foreground mb-1">
                          {member.full_name}
                        </h3>
                        <div className="mt-2 mb-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3 text-sm">
                        {member.email && (
                          <div className="flex items-center gap-2 text-muted-foreground p-2 bg-muted/50 rounded">
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </div>
                        )}
                        {member.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground p-2 bg-muted/50 rounded">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                        {member.join_date && (
                          <div className="flex items-center gap-2 text-muted-foreground p-2 bg-muted/50 rounded">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span>Joined {new Date(member.join_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMembers.map((member) => {
                const imageUrl = getImageUrl(member.profile_image);
                return (
                  <Card key={member.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 border border-primary/20">
                          <AvatarImage src={imageUrl || undefined} alt={member.full_name} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">{member.full_name}</h3>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              <CheckCircle className="w-3 h-3" />
                              Active
                            </span>
                          </div>
                          {member.email && (
                            <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
                              <Mail className="w-3 h-3" />
                              {member.email}
                            </p>
                          )}
                        </div>
                        <div className="hidden lg:flex items-center gap-6 text-sm text-muted-foreground">
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {member.phone}
                            </span>
                          )}
                          {member.join_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(member.join_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : members.length > 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Members Found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria</p>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
