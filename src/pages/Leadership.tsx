import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Users, Shield, BookOpen, Briefcase } from 'lucide-react';

const leaders = [
  {
    name: 'Caleb Mumo',
    role: 'Chairperson',
    description: 'Chairs all group meetings, spokesperson of the group, enforces group policies and objectives.',
    image: '/uploads/caleb-mumo.jpg',
    icon: Crown,
  },
  {
    name: 'Joel Mwetu',
    role: 'Secretary',
    description: 'Writes and minutes all group proceedings, handles group correspondence.',
    image: '/uploads/joel-mwetu.jpg',
    icon: BookOpen,
  },
  {
    name: 'Mark Masila',
    role: 'Treasurer',
    description: 'Manages all group money and resources, keeps financial records, presents financial reports.',
    image: '/uploads/mark-masila.jpg',
    icon: Shield,
  },
  {
    name: 'Michael Kamote',
    role: 'Vice Chairperson',
    description: 'Assumes the chairperson\'s duties in their absence.',
    image: '/uploads/michael-kamote.jpg',
    icon: Users,
  },
  {
    name: 'Munyoki Mutua',
    role: 'Vice Secretary',
    description: 'Assumes the secretary\'s role in their absence (except bank signatory duties).',
    image: '/uploads/munyoki-mutua.jpg',
    icon: BookOpen,
  },
  {
    name: 'Mutemwa Willy',
    role: 'Organizing Secretary',
    description: 'Arranges all meetings, ensures smooth group operations, disseminates information to members.',
    image: '/uploads/mutemwa-willy.jpg',
    icon: Briefcase,
  },
];

export default function Leadership() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="hero-gradient pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white/90 mb-6">
              <Crown className="w-4 h-4" />
              The Executive
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Our Leadership</h1>
            <p className="text-lg text-white/80">Meet the executive committee leading THE TEAM forward</p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {leaders.map((leader) => (
            <Card key={leader.name} className="overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={leader.image}
                  alt={leader.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <leader.icon className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">{leader.role}</span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{leader.name}</h3>
                <p className="text-sm text-muted-foreground">{leader.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Constitution Reference */}
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6 pb-6">
              <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">As per our Constitution</h3>
              <p className="text-sm text-muted-foreground">
                Election of officials shall be done after one year. Elected officials shall serve for one year. 
                Offices falling vacant before the end of tenure shall be filled through a by-election.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
