import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Key,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { useToast } from '@/hooks/use-toast';

export const UserProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleChangePasswordSuccess = () => {
    toast({
      title: "Success",
      description: "Password changed successfully!",
    });
  };

  const handleDeleteAccountSuccess = () => {
    toast({
      title: "Success",
      description: "Account deleted successfully",
    });
  };

  const getUserInitials = (email: string): string => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getPasswordDisplay = (): string => {
    return showPassword ? 'Last changed: Recently' : '••••••••';
  };

  return (
    <>
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
                Profile Information
              </CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Account Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">ACCOUNT DETAILS</h3>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Email Address</span>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Username</span>
              <span className="text-sm font-medium">{user.username}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Password</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {getPasswordDisplay()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="h-8 w-8 p-0"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChangePasswordDialog(true)}
                  className="h-8"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Change
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">ACCOUNT ACTIONS</h3>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start">
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

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteAccountDialog(true)}
                className="justify-start"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        isOpen={showChangePasswordDialog}
        onClose={() => setShowChangePasswordDialog(false)}
        onSuccess={handleChangePasswordSuccess}
      />

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        isOpen={showDeleteAccountDialog}
        onClose={() => setShowDeleteAccountDialog(false)}
        onSuccess={handleDeleteAccountSuccess}
        userEmail={user.email}
      />
    </>
  );
};