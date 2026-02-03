import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Target, 
  Eye, 
  Heart, 
  Users, 
  Shield, 
  TrendingUp,
  Handshake,
  Lightbulb
} from 'lucide-react';

const values = [
  {
    icon: Heart,
    title: 'Unity',
    description: 'We stand together as one family, supporting each other through thick and thin.',
  },
  {
    icon: Shield,
    title: 'Integrity',
    description: 'We uphold the highest standards of honesty and transparency in all our dealings.',
  },
  {
    icon: Handshake,
    title: 'Trust',
    description: 'We build lasting relationships based on mutual trust and respect.',
  },
  {
    icon: Lightbulb,
    title: 'Innovation',
    description: 'We embrace new ideas and approaches to grow our collective wealth.',
  },
];

const milestones = [
  { year: '2025', event: 'THE TEAM was founded with 12 founding members' },
  { year: '2025', event: 'First successful monthly contribution cycle completed' },
  { year: '2025', event: 'Constitution ratified and governance structure established' },
  { year: '2026', event: 'Loan facility launched for members' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="hero-gradient pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white/90 mb-6">
              <Users className="w-4 h-4" />
              About Us
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Diverse but United
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              THE TEAM is a financial collective founded on the principles of mutual support, 
              collective savings, and community development. We believe that together, 
              we can achieve more than we ever could alone.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 border-l-4 border-l-primary">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">Our Mission</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    To empower our members through collective savings, providing a platform 
                    for financial growth, mutual support, and investment opportunities that 
                    benefit all participants equally.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-l-4 border-l-accent">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Eye className="w-7 h-7 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">Our Vision</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    To be the leading community-based financial collective that transforms 
                    lives through disciplined savings, strategic investments, and unwavering 
                    commitment to member welfare.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Core Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do as a collective
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">How THE TEAM Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A simple, transparent, and effective approach to collective savings
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-primary-foreground">
                  1
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Join & Contribute</h3>
                <p className="text-muted-foreground">
                  Become a member and contribute KSh 600 monthly by the 10th of each month via M-Pesa.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-primary-foreground">
                  2
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Pool & Grow</h3>
                <p className="text-muted-foreground">
                  Contributions are pooled together, creating a substantial fund for investments and emergency support.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-primary-foreground">
                  3
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Benefit Together</h3>
                <p className="text-muted-foreground">
                  Access loans, emergency funds, and share in investment returns as the collective grows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Journey</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Key milestones in THE TEAM's growth
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-primary/20" />
              
              {milestones.map((milestone, index) => (
                <div key={index} className="relative pl-20 pb-8 last:pb-0">
                  <div className="absolute left-4 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </div>
                  <Card className="p-4">
                    <p className="text-sm text-primary font-semibold">{milestone.year}</p>
                    <p className="text-foreground">{milestone.event}</p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            <div>
              <p className="text-4xl md:text-5xl font-bold text-white">12+</p>
              <p className="text-white/70 mt-1">Active Members</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-white">KSh 86K+</p>
              <p className="text-white/70 mt-1">Total Contributions</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-white">12</p>
              <p className="text-white/70 mt-1">Months Active</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-white">100%</p>
              <p className="text-white/70 mt-1">Transparency</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
