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
  Clock,
  AlertTriangle,
  Image as ImageIcon,
  Plus,
  Download,
  Upload,
  Shield,
  Share,
  Crown,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  profile_image: string | null;
  join_date: string;
  is_active: boolean;
  payment_status?: 'paid' | 'pending' | 'overdue';
  is_admin?: boolean;
}

export default function Members() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [addingMembers, setAddingMembers] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [adminCount, setAdminCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMembers();
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    setCheckingAdmin(true);
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (!error && data !== null) {
        setIsAdmin(data);
      } else {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  const fetchMembers = async () => {
    setLoadingMembers(true);

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;

      if (profiles) {
        // Get current month payment status for each member
        const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
        const currentYear = new Date().getFullYear();

        // Check admin status for each member
        const membersWithStatus = await Promise.all(
          profiles.map(async (profile) => {
            const { data: payment } = await supabase
              .from('payments')
              .select('status')
              .eq('user_id', profile.user_id)
              .eq('month', currentMonth)
              .eq('year', currentYear)
              .single();

            // Check if user is admin
            const { data: isUserAdmin } = await supabase.rpc('has_role', {
              _user_id: profile.user_id,
              _role: 'admin'
            });

            return {
              ...profile,
              payment_status: (payment?.status as 'paid' | 'pending' | 'overdue') || 'pending',
              is_admin: isUserAdmin || false,
            };
          })
        );

        setMembers(membersWithStatus);

        // Count admins
        const admins = membersWithStatus.filter(m => m.is_admin);
        setAdminCount(admins.length);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  // Function to get full image URL
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;

    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // If it starts with /uploads/, it's relative to the public folder
    if (imagePath.startsWith('/uploads/')) {
      return imagePath;
    }

    // If it's just a filename, prepend /uploads/
    if (!imagePath.includes('/')) {
      return `/uploads/${imagePath}`;
    }

    return imagePath;
  };

  // Function to add demo members using a stored procedure
  const addDemoMembers = async () => {
    if (!isAdmin) {
      toast.error('Only administrators can add demo members');
      return;
    }

    setAddingMembers(true);

    try {
      // Call the demo members function
      const { data, error } = await supabase.rpc('add_demo_members');

      if (error) {
        console.error('Error calling add_demo_members:', error);

        // Provide detailed instructions for admin
        const sqlInstructions = `
          -- Run this SQL in Supabase SQL Editor to create demo members with admins:
          
          1. First, run the add_demo_members function:
          SELECT add_demo_members();
          
          2. This will create 7 demo members, with 4 as admins:
             • Mark Masila (Admin) - masilakisangau@gmail.com
             • Michael Kamote (Admin) - michaelkamote2019@gmail.com
             • Mutemwa Willy (Admin) - mutemwawillie@gmail.com
             • Caleb Mumo (Admin) - mumokisangau91@gmail.com
             • Lydia Katungi (Member) - lydiakatungi2001@gmail.com
             • Joel Mwetu (Member) - joedan926@gmail.com
             • Munyoki Mutua (Member) - munyokimutua513@gmail.com
          
          3. Make sure profile images are in public/uploads/ folder
        `;

        alert(`ADMIN ACTION REQUIRED:\n\n${sqlInstructions}`);
        return;
      }

      if (data && data[0]?.success) {
        const message = data[0]?.message || 'Demo members added successfully!';
        toast.success(message);

        // Show success details
        alert(`
          ✅ Demo Members Added Successfully!
          
          Created 7 demo members with:
          • 4 Administrators
          • 3 Regular Members
          • Sample payments
          • Demo meeting
          • Announcements
          
          Admin Users:
          1. Mark Masila (masilakisangau@gmail.com)
          2. Michael Kamote (michaelkamote2019@gmail.com)
          3. Mutemwa Willy (mutemwawillie@gmail.com)
          4. Caleb Mumo (mumokisangau91@gmail.com)
          
          These users can now:
          • Add new members
          • Manage payments
          • Create meetings
          • Send announcements
        `);
      } else {
        toast.success('Demo members added successfully!');
      }

      // Refresh the members list
      await fetchMembers();

    } catch (error: any) {
      console.error('Error adding demo members:', error);
      toast.error(`Failed to add demo members: ${error.message}`);
    } finally {
      setAddingMembers(false);
    }
  };

  // Function to export members to CSV
  const exportMembersToCSV = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Join Date', 'Status', 'Role'],
      ...members.map(member => [
        member.full_name,
        member.email,
        member.phone || '',
        new Date(member.join_date).toLocaleDateString(),
        member.payment_status || 'pending',
        member.is_admin ? 'Admin' : 'Member'
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

  // Function to manually insert a single member (Admin only)
  const addManualMember = async () => {
    if (!isAdmin) {
      toast.error('Only administrators can add new members');
      alert(`
        ADMIN PRIVILEGES REQUIRED:
        
        Only users with administrator role can add new members.
        
        If you need to invite someone to join:
        1. Ask them to sign up through the registration page
        2. Contact an existing administrator
        3. Or use the demo members feature if you're testing
      `);
      return;
    }

    const full_name = prompt('Enter full name:');
    if (!full_name) {
      toast.error('Name is required');
      return;
    }

    const email = prompt('Enter email:');
    if (!email) {
      toast.error('Email is required');
      return;
    }

    const phone = prompt('Enter phone number (optional):');
    const address = prompt('Enter address (optional):');
    const occupation = prompt('Enter occupation (optional):');
    const makeAdmin = confirm('Make this user an administrator?');

    try {
      // Use the database function to add member (admin only)
      const { data, error } = await supabase.rpc('add_member', {
        _full_name: full_name,
        _email: email,
        _phone: phone || null,
        _profile_image: '/uploads/default-profile.jpg',
        _address: address || null,
        _occupation: occupation || null
      });

      if (error) {
        console.error('Error adding member:', error);

        if (error.message.includes('Only admins can add new members')) {
          toast.error('Permission denied. Only administrators can add members.');
        } else if (error.message.includes('Email already exists')) {
          toast.error('A member with this email already exists.');
        } else {
          toast.error(`Failed to add member: ${error.message}`);
        }
        return;
      }

      if (data && data[0]?.success) {
        const userId = data[0]?.user_id;

        // If we should make this user an admin
        if (makeAdmin && userId) {
          try {
            const { error: adminError } = await supabase.rpc('make_user_admin', {
              _email: email
            });

            if (adminError) {
              console.error('Error making user admin:', adminError);
              toast.warning('Member added but failed to make admin');
            } else {
              toast.success('Member added and promoted to administrator');
            }
          } catch (adminErr) {
            console.error('Error in admin promotion:', adminErr);
            toast.success('Member added successfully');
          }
        } else {
          toast.success('Member added successfully');
        }

        // Show instructions for the next steps
        alert(`
          ✅ ${makeAdmin ? 'Administrator' : 'Member'} added successfully!
          
          Details:
          • Name: ${full_name}
          • Email: ${email}
          • Role: ${makeAdmin ? 'Administrator' : 'Member'}
          
          Next steps:
          1. The ${makeAdmin ? 'administrator' : 'member'} has been added to the system
          2. They need to create an auth account with the same email
          3. Share this signup link with them: ${window.location.origin}/auth
          4. Their profile will be automatically linked when they sign up
        `);

        fetchMembers();
      } else {
        toast.error(data?.[0]?.message || 'Failed to add member');
      }
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error(`Failed to add member: ${error.message}`);
    }
  };

  // Function to generate signup link for non-admins
  const generateSignupLink = () => {
    const baseUrl = window.location.origin;
    const signupUrl = `${baseUrl}/auth?action=signup`;

    // Copy to clipboard
    navigator.clipboard.writeText(signupUrl)
      .then(() => {
        toast.success('Signup link copied to clipboard!');
        alert(`
          Share this link with new members to sign up:
          
          ${signupUrl}
          
          The link has been copied to your clipboard.
          
          Instructions for new members:
          1. Click the link to go to registration page
          2. Create an account with their email
          3. Their profile will be automatically created
          4. They can then log in and access the system
        `);
      })
      .catch(() => {
        alert(`
          Share this link with new members to sign up:
          
          ${signupUrl}
          
          Copy this link and share it with new members.
          
          Instructions for new members:
          1. Click the link to go to registration page
          2. Create an account with their email
          3. Their profile will be automatically created
          4. They can then log in and access the system
        `);
      });
  };

  // Function to promote a member to admin
  const promoteToAdmin = async (memberEmail: string, memberName: string) => {
    if (!isAdmin) {
      toast.error('Only administrators can promote users to admin');
      return;
    }

    const confirmPromotion = confirm(`Are you sure you want to make ${memberName} an administrator?\n\nThey will gain full access to manage the system.`);

    if (!confirmPromotion) return;

    try {
      const { data, error } = await supabase.rpc('make_user_admin', {
        _email: memberEmail
      });

      if (error) {
        console.error('Error promoting to admin:', error);
        toast.error(`Failed to promote user: ${error.message}`);
        return;
      }

      if (data && data[0]?.success) {
        toast.success(`${memberName} is now an administrator`);
        fetchMembers();
      } else {
        toast.error(data?.[0]?.message || 'Failed to promote user');
      }
    } catch (error: any) {
      console.error('Error promoting to admin:', error);
      toast.error(`Failed to promote user: ${error.message}`);
    }
  };

  const filteredMembers = members.filter(member =>
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.phone && member.phone.includes(searchTerm))
  );

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            <CheckCircle className="w-3 h-3" />
            Paid
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <AlertTriangle className="w-3 h-3" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading || loadingMembers || checkingAdmin) {
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                Members Directory
              </h1>
              <p className="text-muted-foreground mt-1">
                {members.length} active members ({adminCount} administrators)
                {isAdmin && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <Shield className="w-3 h-3" />
                    Admin
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={exportMembersToCSV}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>

              <Button
                onClick={generateSignupLink}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Share className="w-4 h-4" />
                Get Signup Link
              </Button>

              {isAdmin && (
                <>
                  <Button
                    onClick={addManualMember}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </Button>

                  <Button
                    onClick={addDemoMembers}
                    disabled={addingMembers}
                    variant="default"
                    size="sm"
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {addingMembers ? 'Adding...' : 'Add Demo Data'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Admin Info Panel */}
        {isAdmin && (
          <div className="mb-6 p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-foreground">Administrator Panel</h3>
                  <p className="text-sm text-muted-foreground">
                    You have full access to manage members, payments, and system settings
                  </p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {adminCount} of {members.length} members are administrators
              </div>
            </div>
          </div>
        )}

        {/* Demo Members Section (Admin only) */}
        {members.length === 0 && isAdmin && (
          <div className="mb-6 p-6 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  No Members Found
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add demo members to get started. This will create 7 sample members with 4 pre-set as administrators.
                </p>
              </div>

              <Button
                onClick={addDemoMembers}
                disabled={addingMembers}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {addingMembers ? 'Adding Demo Data...' : 'Add Demo Members'}
              </Button>
            </div>

            <div className="mt-4 p-4 bg-white rounded border">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                Demo Members Include (4 Admins + 3 Members):
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h5 className="text-xs font-semibold text-purple-600 mb-1">Administrators:</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <Crown className="w-3 h-3 text-amber-500" />
                      Mark Masila (masilakisangau@gmail.com)
                    </li>
                    <li className="flex items-center gap-2">
                      <Crown className="w-3 h-3 text-amber-500" />
                      Michael Kamote (michaelkamote2019@gmail.com)
                    </li>
                    <li className="flex items-center gap-2">
                      <Crown className="w-3 h-3 text-amber-500" />
                      Mutemwa Willy (mutemwawillie@gmail.com)
                    </li>
                    <li className="flex items-center gap-2">
                      <Crown className="w-3 h-3 text-amber-500" />
                      Caleb Mumo (mumokisangau91@gmail.com)
                    </li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-blue-600 mb-1">Members:</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Lydia Katungi (lydiakatungi2001@gmail.com)</li>
                    <li>• Joel Mwetu (joedan926@gmail.com)</li>
                    <li>• Munyoki Mutua (munyokimutua513@gmail.com)</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Note: Make sure profile images are placed in <code>public/uploads/</code> folder
              </p>
            </div>
          </div>
        )}

        {/* Instructions for non-admins when no members */}
        {members.length === 0 && !isAdmin && (
          <div className="mb-6 p-6 border rounded-lg bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  No Members Yet
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  There are no members in the system yet. Ask an administrator to add members or use the signup link to invite people.
                </p>
              </div>

              <Button
                onClick={generateSignupLink}
                className="gap-2"
              >
                <Share className="w-4 h-4" />
                Get Signup Link
              </Button>
            </div>
          </div>
        )}

        {/* Search and View Toggle */}
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
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Members Grid/List */}
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
                            <AvatarImage
                              src={imageUrl || undefined}
                              alt={member.full_name}
                              className="object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                            <AvatarFallback className={`text-xl ${member.is_admin ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-primary to-primary/80'} text-primary-foreground`}>
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          {member.is_admin && (
                            <div className="absolute -top-1 -right-1">
                              <Crown className="w-6 h-6 text-amber-500 fill-amber-200" />
                            </div>
                          )}
                          {!imageUrl && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-muted-foreground opacity-30" />
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg text-foreground mb-1">
                          {member.full_name}
                          {member.is_admin && (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <Crown className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                        </h3>
                        <div className="mt-2 mb-3">
                          {getStatusBadge(member.payment_status)}
                        </div>
                      </div>

                      <div className="mt-4 space-y-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground p-2 bg-muted/50 rounded">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                        {member.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground p-2 bg-muted/50 rounded">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground p-2 bg-muted/50 rounded">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>Joined {new Date(member.join_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}</span>
                        </div>
                      </div>

                      {isAdmin && !member.is_admin && (
                        <div className="mt-4 pt-4 border-t">
                          <Button
                            onClick={() => promoteToAdmin(member.email, member.full_name)}
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                          >
                            <Crown className="w-3 h-3" />
                            Make Admin
                          </Button>
                        </div>
                      )}
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
                        <div className="relative">
                          <Avatar className="w-12 h-12 border border-primary/20">
                            <AvatarImage
                              src={imageUrl || undefined}
                              alt={member.full_name}
                              className="object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                            <AvatarFallback className={`${member.is_admin ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-primary to-primary/80'} text-primary-foreground`}>
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          {member.is_admin && (
                            <div className="absolute -top-1 -right-1">
                              <Crown className="w-4 h-4 text-amber-500 fill-amber-200" />
                            </div>
                          )}
                          {!imageUrl && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <ImageIcon className="w-3 h-3 text-muted-foreground opacity-50" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {member.full_name}
                            </h3>
                            {member.is_admin && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                <Crown className="w-3 h-3" />
                                Admin
                              </span>
                            )}
                            {getStatusBadge(member.payment_status)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </p>
                        </div>

                        <div className="hidden lg:flex items-center gap-6 text-sm text-muted-foreground">
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {member.phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(member.join_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        {isAdmin && !member.is_admin && (
                          <Button
                            onClick={() => promoteToAdmin(member.email, member.full_name)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Crown className="w-3 h-3" />
                            Make Admin
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : members.length > 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold">No members found</h3>
              <p className="text-sm">Try adjusting your search terms</p>
            </div>
          </Card>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}