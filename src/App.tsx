import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ChatPage from "./pages/ChatPage";
import Analytics from "./pages/Analytics";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import Leads from "./pages/Leads";
import Customers from "./pages/Customers";
import Marketing from "./pages/Marketing";
import Vehicles from "./pages/Vehicles";
import Noticeboard from "./pages/Noticeboard";
import SuperAdmin from "./pages/SuperAdmin";
import TestDrives from "./pages/TestDrives";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-32 h-16 relative overflow-hidden animate-pulse">
          <img 
            src="/car-loader.png" 
            alt="Loading..." 
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
            Loading CRM
          </span>
        </div>
      </div>
    </div>
  );
  if (!token) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return null;
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/vehicles" element={<ProtectedRoute><DashboardLayout><Vehicles /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/leads" element={<ProtectedRoute><DashboardLayout><Leads /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/customers" element={<ProtectedRoute><DashboardLayout><Customers /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/marketing" element={<ProtectedRoute><DashboardLayout><Marketing /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/chat" element={<ProtectedRoute><DashboardLayout><ChatPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/attendance" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard/finance" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard/noticeboard" element={<ProtectedRoute><DashboardLayout><Noticeboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/tasks" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard/test-drives" element={<ProtectedRoute><DashboardLayout><TestDrives /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/analytics" element={<ProtectedRoute><DashboardLayout><Analytics /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardLayout><SettingsPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/super-admin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
