import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Download, 
  Printer,
  BookOpen,
  Scale,
  Users,
  Wallet,
  Calendar,
  AlertTriangle,
  FileText,
  Shield,
  Briefcase,
  Gavel
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const constitutionSections = [
  {
    id: 'motto',
    title: 'Motto',
    icon: Shield,
    content: `<p class="text-lg font-semibold italic">"Diverse but United"</p>`,
  },
  {
    id: 'objectives',
    title: 'Objectives',
    icon: BookOpen,
    content: `
      <ul>
        <li>Fight poverty by initiating Income Generating Activities (I.G.As)</li>
        <li>Solicit funds from government and NGOs</li>
        <li>Create job opportunities through the I.G.As</li>
        <li>Source funds and knowledge to establish and expand both individual and association enterprises</li>
      </ul>
    `,
  },
  {
    id: 'membership',
    title: 'Membership',
    icon: Users,
    content: `
      <h4>Registration</h4>
      <p>New members shall register at a fee of <strong>KSh 200</strong>.</p>
      
      <h4>Ceasing to be a Member</h4>
      <p>Any member shall cease being a member of this group through:</p>
      <ul>
        <li>Death</li>
        <li>Expulsion</li>
        <li>Resignation</li>
      </ul>
    `,
  },
  {
    id: 'election',
    title: 'Election',
    icon: Gavel,
    content: `
      <ul>
        <li>Election of officials shall be done after one year</li>
        <li>Elected officials shall serve for one year</li>
        <li>Offices falling vacant before the end of the tenure shall be filled through a by-election</li>
      </ul>
    `,
  },
  {
    id: 'executive',
    title: 'The Executive & Duties',
    icon: Briefcase,
    content: `
      <h4>The Executive</h4>
      <p>The executive is comprised of:</p>
      <ul>
        <li>Chairperson</li>
        <li>Vice Chairperson</li>
        <li>Treasurer</li>
        <li>Secretary</li>
        <li>Vice Secretary</li>
        <li>Organizing Secretary</li>
      </ul>

      <h4>Chairperson</h4>
      <ul>
        <li>Chair all group meetings</li>
        <li>Be the spokesperson of the group</li>
        <li>Be a signatory to the group's bank account</li>
        <li>Enforce group policies and objectives</li>
        <li>Authorize expenditure of group resources</li>
      </ul>

      <h4>Secretary</h4>
      <ul>
        <li>Write and minute all group proceedings</li>
        <li>Handle group correspondence</li>
        <li>May be a signatory to the group's bank account (optional)</li>
      </ul>

      <h4>Treasurer</h4>
      <ul>
        <li>Manage all group money and resources</li>
        <li>Keep financial records</li>
        <li>Present financial reports</li>
        <li>Be a signatory to the group's bank account</li>
      </ul>

      <h4>Vice Secretary</h4>
      <ul>
        <li>Assume the secretary's role in their absence (except bank signatory duties)</li>
      </ul>

      <h4>Organizing Secretary</h4>
      <ul>
        <li>Arrange all meetings in liaison with the chairperson</li>
        <li>Ensure all group sections run smoothly</li>
        <li>Disseminate information to members on time</li>
        <li>Serve as the master of ceremony in group functions</li>
        <li>Organize venues and seating for meetings</li>
        <li>Maintain order during meetings, including managing disorderly members</li>
      </ul>
    `,
  },
  {
    id: 'discipline',
    title: 'Discipline',
    icon: Scale,
    content: `
      <ul>
        <li>Punctuality</li>
        <li>Availability</li>
        <li>Sobriety</li>
      </ul>
    `,
  },
  {
    id: 'meetings',
    title: 'Meetings',
    icon: Calendar,
    content: `
      <ul>
        <li>Group meetings will be held on the <strong>11th of every month</strong></li>
        <li>Failure to attend a scheduled meeting without valid reason will attract a fine of <strong>KSh 50</strong>, which will be deducted from the member's shares. If this continues, further fines will accumulate daily.</li>
      </ul>
    `,
  },
  {
    id: 'money',
    title: 'Money and Resources',
    icon: Wallet,
    content: `
      <p>The group shall generate income through:</p>
      <ul>
        <li>KSh 200 registration fee</li>
        <li>KSh 500 monthly savings</li>
        <li>Grants/Loans from government and NGOs</li>
        <li>Fundraising and donations from well-wishers</li>
        <li>Profit from the group's I.G.As</li>
      </ul>

      <h4>Deadlines</h4>
      <ul>
        <li>The savings deadline is the <strong>10th of every month</strong></li>
        <li>Late submission will attract a penalty of <strong>KSh 10 per day</strong> until paid</li>
      </ul>
    `,
  },
  {
    id: 'refunds',
    title: 'Refunds',
    icon: FileText,
    content: `
      <p>Refunds shall be processed as follows:</p>
      <ul>
        <li>In case of death, the immediate family or next of kin will receive <strong>100%</strong> of the member's savings</li>
        <li>In case of expulsion or resignation, the member will be refunded <strong>70%</strong> of their savings</li>
        <li>Registration fee is <strong>non-refundable</strong></li>
        <li>On <strong>December 2030</strong>, members shall be allowed to withdraw fully from the group and shall receive 100% of their contributions, less transaction costs, along with their share of profit earned by that time</li>
        <li>Thereafter, withdrawal from the group shall be allowed only after every <strong>10 years</strong></li>
        <li>Any withdrawal before the 10-year period will attract the 70% refund rule as stated above</li>
      </ul>
    `,
  },
  {
    id: 'records',
    title: 'Books of Record and Reports',
    icon: FileText,
    content: `
      <p>The group will maintain a register, minutes book, and other records as needed. All records shall be accessible to members upon reasonable notice. An annual report will be prepared and presented at the AGM held in December each year.</p>
    `,
  },
  {
    id: 'loans',
    title: 'Loan Payment Policy',
    icon: Wallet,
    content: `
      <ul>
        <li>If your loan deadline falls on the 25th or later, it will be extended to the 8th of the following month</li>
        <li>Loan duration is <strong>3 months</strong>; failure to repay within 3 months attracts additional interest based on the total loan + first 3 months interest</li>
        <li>This interest must be paid within <strong>14 days</strong>; failure to pay the interest within that time will result in expulsion and 70% refund of contribution</li>
      </ul>

      <h4>Sharing of Loan Interest</h4>
      <ul>
        <li>Members will receive <strong>70%</strong> of interest paid on their own loans</li>
        <li>The remaining <strong>30%</strong> will be shared equally among all members</li>
      </ul>
    `,
  },
  {
    id: 'penalties',
    title: 'Penalties',
    icon: AlertTriangle,
    content: `
      <ul>
        <li>Late payment penalty: <strong>KSh 10 per day</strong> after the 10th of each month</li>
        <li>Meeting absence fine: <strong>KSh 50</strong> per missed meeting without valid reason</li>
        <li>Continued absence attracts daily accumulating fines</li>
      </ul>
    `,
  },
];

export default function Constitution() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const filteredSections = constitutionSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="hero-gradient pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white/90 mb-6">
              <Scale className="w-4 h-4" />
              Official Document
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Constitution</h1>
            <p className="text-lg text-white/80">The governing document of THE TEAM: Diverse but United</p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row gap-4 mb-8 max-w-4xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search constitution..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader className="text-center border-b">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Scale className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">THE TEAM: Diverse but United</CardTitle>
              <p className="text-muted-foreground">Constitution and Bylaws • Effective January 2025</p>
            </CardHeader>
            <CardContent className="p-0">
              <Accordion 
                type="multiple" 
                value={expandedSections}
                onValueChange={setExpandedSections}
                className="divide-y"
              >
                {filteredSections.map((section) => (
                  <AccordionItem key={section.id} value={section.id} className="border-0">
                    <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <section.icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-semibold text-left">{section.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div 
                        className="prose prose-sm max-w-none text-muted-foreground
                          prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                          prose-ul:list-disc prose-ul:pl-6 prose-li:my-1
                          prose-strong:text-foreground"
                        dangerouslySetInnerHTML={{ __html: section.content }}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {filteredSections.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No sections found</p>
              <p className="text-sm">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
