import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
  User, 
  LogOut, 
  Shield, 
  Key, 
  Calendar,
  CheckCircle
} from 'lucide-react';

export const UserProfile: React.FC = () => {
  const { user, logout, apiKeys } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getUserInitials = (email: string): string => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getAccountAge = (): string => {
    // Since we don't have user creation date, we'll show a placeholder
    // In a real app, this would use user.createdAt
    return 'Member since signup';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-lg font-medium">
              {getUserInitials(user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Account Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Key className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{apiKeys.length}</div>
            <div className="text-sm text-muted-foreground">API Keys</div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Shield className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">AES-256</div>
            <div className="text-sm text-muted-foreground">Encryption</div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Calendar className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <div className="text-sm font-medium">Active</div>
            <div className="text-sm text-muted-foreground">{getAccountAge()}</div>
          </div>
        </div>

        <Separator />

        {/* Account Details */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">ACCOUNT DETAILS</h3>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Email Address</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Account ID</span>
            <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {user.id.slice(0, 8)}...{user.id.slice(-8)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Data Encryption</span>
            <Badge variant="secondary" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              End-to-end
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Security Features */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">SECURITY FEATURES</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>API keys encrypted with AES-256-GCM</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Session-based authentication</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Secure HTTP-only cookies</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>User data isolation</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Account Actions */}
        <div className="flex justify-between items-center pt-2">
          <div>
            <h3 className="text-sm font-medium">Account Actions</h3>
            <p className="text-xs text-muted-foreground">
              Manage your account settings and session
            </p>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign Out</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to sign out? You'll need to sign in again to access your prompts and API keys.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};