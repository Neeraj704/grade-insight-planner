import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import SemesterInput from "@/pages/SemesterInput";
import Admin from "@/pages/Admin";
import Profile from "@/pages/Profile";
import Predictions from "@/pages/Predictions";
import Semesters from "@/pages/Semesters";
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
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <Layout title="Dashboard">
                <Dashboard />
              </Layout>
            } />
            <Route path="/semesters" element={
              <Layout title="All Semesters">
                <Semesters />
              </Layout>
            } />
            <Route path="/semesters/:id" element={
              <Layout title="Semester Details">
                <SemesterInput />
              </Layout>
            } />
            <Route path="/predictions" element={
              <Layout title="What-If Predictions">
                <Predictions />
              </Layout>
            } />
            <Route path="/profile" element={
              <Layout title="Profile Settings">
                <Profile />
              </Layout>
            } />
            <Route path="/admin" element={
              <Layout title="Admin Panel">
                <Admin />
              </Layout>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
