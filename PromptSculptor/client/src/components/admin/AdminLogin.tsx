import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Shield, Loader2, ArrowLeft, AlertTriangle, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdminAuth } from '@/context/AdminAuthContext';
import ThemeToggle from '@/components/theme-toggle';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, admin, loading, checkAuthStatus } = useAdminAuth();

  // Check for OAuth error in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthError = urlParams.get('error');
    
    if (oauthError === 'oauth_failed') {
      setError('Google OAuth authentication failed. Please try again or contact your administrator.');
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (admin && admin.authenticated) {
      setLocation('/app/admin');
    }
  }, [admin, setLocation]);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setError(null);
    login(); // This will redirect to Google OAuth
  };

  const goBack = () => {
    setLocation('/app');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-red-600" />
          <span className="text-slate-600 dark:text-slate-400">Checking authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to App
          </Button>
          <ThemeToggle />
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Admin Access
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Sign in with your Google account to access the admin dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Display */}
            {error && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-200 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Security Notice */}
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                Admin access provides full system monitoring capabilities. 
                Only authorized Google accounts can access this dashboard.
              </AlertDescription>
            </Alert>

            {/* Google Login Button */}
            <Button
              onClick={handleGoogleLogin}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Sign in with Google
                </>
              )}
            </Button>

            {/* Help Text */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Only authorized Google accounts can access the admin dashboard.
                <br />
                Contact your system administrator if you need access.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          PromptSculptor Admin Dashboard
        </div>
      </div>
    </div>
  );
}