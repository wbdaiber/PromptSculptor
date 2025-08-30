import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userEmail?: string;
}

export const DeleteAccountDialog: React.FC<DeleteAccountDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userEmail
}) => {
  const { deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password is provided
    if (!password.trim()) {
      setError('Please enter your password to confirm account deletion');
      return;
    }

    // Validate confirmation checkbox
    if (!confirmationChecked) {
      setError('Please confirm that you understand your data will be permanently deleted');
      return;
    }

    setIsSubmitting(true);

    try {
      await deleteAccount(password);
      
      // Reset form
      setPassword('');
      setConfirmationChecked(false);
      setError('');
      
      // Close dialog
      onClose();
      
      // Call success callback if provided (for toast notification)
      onSuccess?.();
    } catch (err: any) {
      console.error('Account deletion error:', err);
      setError(err.message || 'Failed to delete account. Please check your password and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setPassword('');
      setConfirmationChecked(false);
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your account and remove all of your data from our servers.
          </DialogDescription>
        </DialogHeader>
        
        {/* Warning Alert */}
        <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-medium">What will be deleted:</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              <li>Your account and profile information</li>
              <li>All your saved prompts and favorites</li>
              <li>Your custom templates</li>
              <li>Your API keys (encrypted data)</li>
              <li>All other associated data</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Account Email Display */}
          {userEmail && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Account to be deleted:</Label>
              <div className="p-2 bg-muted rounded border text-sm font-mono">
                {userEmail}
              </div>
            </div>
          )}
          
          {/* Password Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="delete-password">
              Enter your password to confirm
            </Label>
            <div className="relative">
              <Input
                id="delete-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                disabled={isSubmitting}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="delete-confirmation"
              checked={confirmationChecked}
              onCheckedChange={(checked) => setConfirmationChecked(checked as boolean)}
              disabled={isSubmitting}
            />
            <div className="grid gap-1.5 leading-none">
              <Label 
                htmlFor="delete-confirmation"
                className="text-sm font-normal cursor-pointer"
              >
                I understand that deleting my account is permanent and cannot be undone. 
                All my data will be permanently removed.
              </Label>
            </div>
          </div>
        </form>
        
        <DialogFooter className="gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !confirmationChecked || !password.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              'Deleting Account...'
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};