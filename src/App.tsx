import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Payments from "./pages/Payments";
import About from "./pages/About";
import Constitution from "./pages/Constitution";
import Contact from "./pages/Contact";
import Notifications from "./pages/Notifications";
import ContributionRecords from "./pages/ContributionRecords";
import AdminPayments from "./pages/AdminPayments";
import AdminDashboard from "./pages/AdminDashboard";
import Loans from "./pages/Loans";
import Leadership from "./pages/Leadership";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/about" element={<About />} />
            <Route path="/constitution" element={<Constitution />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/records" element={<ContributionRecords />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/leadership" element={<Leadership />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
