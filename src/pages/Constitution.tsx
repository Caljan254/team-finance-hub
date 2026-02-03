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
  FileText
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const constitutionSections = [
  {
    id: 'article-1',
    title: 'Article 1: Name and Purpose',
    icon: BookOpen,
    content: `
      <h4>1.1 Name</h4>
      <p>The organization shall be known as "THE TEAM: Diverse but United" (hereinafter referred to as "THE TEAM" or "the Group").</p>
      
      <h4>1.2 Purpose</h4>
      <p>THE TEAM is established as a financial collective with the following objectives:</p>
      <ul>
        <li>To promote a culture of savings among members</li>
        <li>To provide financial support to members through loans and emergency funds</li>
        <li>To invest collectively in ventures that benefit all members</li>
        <li>To foster unity and mutual support among members</li>
      </ul>
    `,
  },
  {
    id: 'article-2',
    title: 'Article 2: Membership',
    icon: Users,
    content: `
      <h4>2.1 Eligibility</h4>
      <p>Membership is open to any individual who:</p>
      <ul>
        <li>Is at least 18 years of age</li>
        <li>Agrees to abide by this constitution</li>
        <li>Is willing and able to make regular monthly contributions</li>
        <li>Is recommended by at least one existing member</li>
      </ul>
      
      <h4>2.2 Rights of Members</h4>
      <p>All members shall have the right to:</p>
      <ul>
        <li>Attend and vote at all general meetings</li>
        <li>Access loans and emergency funds as per the guidelines</li>
        <li>Receive regular financial reports and updates</li>
        <li>Participate in investment decisions</li>
      </ul>
      
      <h4>2.3 Obligations of Members</h4>
      <p>All members are required to:</p>
      <ul>
        <li>Pay monthly contributions on time</li>
        <li>Attend meetings regularly</li>
        <li>Repay any loans as per the agreed schedule</li>
        <li>Maintain the confidentiality of group matters</li>
      </ul>
    `,
  },
  {
    id: 'article-3',
    title: 'Article 3: Contributions',
    icon: Wallet,
    content: `
      <h4>3.1 Monthly Contributions</h4>
      <p>Each member shall contribute <strong>KSh 600</strong> per month.</p>
      
      <h4>3.2 Payment Deadline</h4>
      <p>All contributions must be paid by the <strong>10th day</strong> of each month.</p>
      
      <h4>3.3 Payment Method</h4>
      <p>Contributions shall be made via M-Pesa to the designated group account.</p>
      
      <h4>3.4 Record Keeping</h4>
      <p>The Treasurer shall maintain accurate records of all contributions and provide monthly statements to all members.</p>
    `,
  },
  {
    id: 'article-4',
    title: 'Article 4: Penalties',
    icon: AlertTriangle,
    content: `
      <h4>4.1 Late Payment Penalty</h4>
      <p>Members who fail to pay their contributions by the deadline shall be charged a penalty of <strong>KSh 10 per day</strong> until payment is made.</p>
      
      <h4>4.2 Penalty Calculation</h4>
      <p>Penalties shall be calculated automatically from the 11th day of the month until the full contribution is received.</p>
      
      <h4>4.3 Penalty Collection</h4>
      <p>Penalties shall be collected together with the contribution and shall form part of the group's funds.</p>
      
      <h4>4.4 Exemptions</h4>
      <p>The Executive Committee may, at its discretion, waive penalties in cases of genuine hardship, provided the member notifies the group before the deadline.</p>
    `,
  },
  {
    id: 'article-5',
    title: 'Article 5: Meetings',
    icon: Calendar,
    content: `
      <h4>5.1 Regular Meetings</h4>
      <p>The Group shall hold regular meetings at least once per month.</p>
      
      <h4>5.2 Annual General Meeting</h4>
      <p>An Annual General Meeting (AGM) shall be held once a year to:</p>
      <ul>
        <li>Review the group's financial performance</li>
        <li>Elect new officials</li>
        <li>Plan for the coming year</li>
        <li>Amend the constitution if necessary</li>
      </ul>
      
      <h4>5.3 Quorum</h4>
      <p>A quorum of two-thirds of all members must be present for any meeting to proceed.</p>
      
      <h4>5.4 Decision Making</h4>
      <p>Decisions shall be made by simple majority vote, except for constitutional amendments which require a two-thirds majority.</p>
    `,
  },
  {
    id: 'article-6',
    title: 'Article 6: Governance',
    icon: Scale,
    content: `
      <h4>6.1 Executive Committee</h4>
      <p>The Group shall be governed by an Executive Committee consisting of:</p>
      <ul>
        <li><strong>Chairperson</strong> - Presides over meetings and represents the group</li>
        <li><strong>Vice Chairperson</strong> - Assists the Chair and acts in their absence</li>
        <li><strong>Secretary</strong> - Keeps minutes and maintains correspondence</li>
        <li><strong>Treasurer</strong> - Manages all financial matters</li>
        <li><strong>Organizing Secretary</strong> - Coordinates group activities and events</li>
      </ul>
      
      <h4>6.2 Term of Office</h4>
      <p>Officials shall serve for a term of one year and may be re-elected.</p>
      
      <h4>6.3 Removal from Office</h4>
      <p>An official may be removed by a two-thirds majority vote at a special meeting called for that purpose.</p>
    `,
  },
  {
    id: 'article-7',
    title: 'Article 7: Loans and Welfare',
    icon: Wallet,
    content: `
      <h4>7.1 Loan Eligibility</h4>
      <p>Members may apply for loans after completing at least three months of consistent contributions.</p>
      
      <h4>7.2 Loan Limits</h4>
      <p>Members may borrow up to three times their total contributions.</p>
      
      <h4>7.3 Interest Rate</h4>
      <p>Loans shall attract an interest rate of 10% per annum, calculated on a reducing balance.</p>
      
      <h4>7.4 Repayment Period</h4>
      <p>All loans must be repaid within 12 months.</p>
      
      <h4>7.5 Welfare Fund</h4>
      <p>10% of monthly collections shall be set aside for emergency welfare support to members.</p>
    `,
  },
  {
    id: 'article-8',
    title: 'Article 8: Amendments',
    icon: FileText,
    content: `
      <h4>8.1 Amendment Process</h4>
      <p>This constitution may be amended only at an Annual General Meeting or a Special General Meeting called for that purpose.</p>
      
      <h4>8.2 Voting Requirement</h4>
      <p>Any amendment requires approval by at least two-thirds of all members present and voting.</p>
      
      <h4>8.3 Notice</h4>
      <p>Members must be given at least 14 days' notice of any proposed amendments.</p>
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
      
      {/* Hero Section */}
      <section className="hero-gradient pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white/90 mb-6">
              <Scale className="w-4 h-4" />
              Official Document
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Constitution
            </h1>
            <p className="text-lg text-white/80">
              The governing document of THE TEAM: Diverse but United
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        {/* Search and Actions */}
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

        {/* Constitution Content */}
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader className="text-center border-b">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Scale className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                THE TEAM: Diverse but United
              </CardTitle>
              <p className="text-muted-foreground">
                Constitution and Bylaws • Effective January 2025
              </p>
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
