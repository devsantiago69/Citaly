import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import MainLayout from "@/components/MainLayout";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import CategoryManagement from "@/components/CategoryManagement";
import SpecialtiesPage from "@/pages/SpecialtiesPage";
import ServiceManagement from "@/components/ServiceManagement";
import AppointmentCalendar from "@/components/AppointmentCalendar";
import AppointmentList from "@/components/AppointmentList";
import UserManagement from "@/components/UserManagement";
import StaffManagement from "@/components/StaffManagement";
import ReportsPanel from "@/components/ReportsPanel";
import CompanyInfo from "@/components/CompanyInfo";
import AdminProfile from "@/components/AdminProfile";
import AdminManagement from "@/components/AdminManagement";
import BillingPanel from "@/components/BillingPanel";
import SettingsPanel from "@/components/SettingsPanel";
import ReminderManagement from "@/components/ReminderManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Index />} />
                <Route path="calendar" element={<AppointmentCalendar />} />
                <Route path="appointments" element={<AppointmentList />} />                <Route path="services" element={<ServiceManagement />} />
                <Route path="categories" element={<CategoryManagement />} />
                <Route path="specialties" element={<SpecialtiesPage />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="staff" element={<StaffManagement />} />
                <Route path="reports" element={<ReportsPanel />} />
                <Route path="company" element={<CompanyInfo />} />
                <Route path="profile" element={<AdminProfile />} />                <Route path="admin" element={<AdminManagement />} />
                <Route path="billing" element={<BillingPanel />} />
                <Route path="settings" element={<SettingsPanel />} />
                <Route path="reminders" element={<ReminderManagement />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
