import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Favorites from "@/pages/favorites";
import Recent from "@/pages/recent";
import Support from "@/pages/Support";
import Documentation from "@/pages/Documentation";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserAnalytics from "@/pages/admin/UserAnalytics";
import SecurityMonitoring from "@/pages/admin/SecurityMonitoring";
import DatabaseAnalytics from "@/pages/admin/DatabaseAnalytics";
import SystemSettings from "@/pages/admin/SystemSettings";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";

function Router() {
  return (
    <Switch>
      {/* Main App Routes */}
      <Route path="/app" component={Home} />
      <Route path="/app/favorites" component={Favorites} />
      <Route path="/app/recent" component={Recent} />
      <Route path="/app/support" component={Support} />
      <Route path="/app/documentation" component={Documentation} />
      <Route path="/app/forgot-password" component={ForgotPassword} />
      <Route path="/app/reset-password/:token" component={ResetPassword} />
      <Route path="/app/reset-password" component={ResetPassword} />
      
      {/* Admin Routes */}
      <Route path="/app/admin/login" component={AdminLogin} />
      <Route path="/app/admin" component={() => (
        <AdminProtectedRoute>
          <AdminDashboard />
        </AdminProtectedRoute>
      )} />
      <Route path="/app/admin/users" component={() => (
        <AdminProtectedRoute>
          <UserAnalytics />
        </AdminProtectedRoute>
      )} />
      <Route path="/app/admin/security" component={() => (
        <AdminProtectedRoute>
          <SecurityMonitoring />
        </AdminProtectedRoute>
      )} />
      <Route path="/app/admin/analytics" component={() => (
        <AdminProtectedRoute>
          <DatabaseAnalytics />
        </AdminProtectedRoute>
      )} />
      <Route path="/app/admin/settings" component={() => (
        <AdminProtectedRoute>
          <SystemSettings />
        </AdminProtectedRoute>
      )} />
      
      {/* Legacy Routes (backward compatibility) */}
      <Route path="/favorites" component={Favorites} />
      <Route path="/recent" component={Recent} />
      <Route path="/support" component={Support} />
      <Route path="/documentation" component={Documentation} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
