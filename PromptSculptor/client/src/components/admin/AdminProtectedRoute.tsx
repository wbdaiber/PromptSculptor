import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2, Shield } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { admin, loading, isSessionValid } = useAdminAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // If no admin user or session is invalid, redirect to login
    if (!admin || !isSessionValid()) {
      setLocation('/app/admin/login');
      return;
    }
  }, [admin, loading, isSessionValid, setLocation]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-600 dark:text-slate-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Checking admin authentication...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting to login
  if (!admin || !isSessionValid()) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Redirecting to admin login...
          </p>
        </div>
      </div>
    );
  }

  // If authenticated and session is valid, render the protected content
  return <>{children}</>;
}