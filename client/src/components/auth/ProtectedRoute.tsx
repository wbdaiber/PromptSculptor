import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthModal } from './AuthModal';
import { UserCheck, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Authentication Required</CardTitle>
                <CardDescription>
                  Sign in to access your personal prompts, templates, and API key management.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => setShowAuthModal(true)}
                    className="w-full"
                  >
                    Sign In
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowAuthModal(true)}
                    className="w-full"
                  >
                    Sign Up
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <UserCheck className="w-4 h-4" />
                    <span>Secure authentication with encrypted API key storage</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultView="login"
        />
      </>
    );
  }

  return <>{children}</>;
};