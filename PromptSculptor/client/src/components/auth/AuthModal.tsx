import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultView?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultView = 'login' 
}) => {
  const [currentView, setCurrentView] = useState<'login' | 'signup'>(defaultView);

  const handleSwitchToSignup = () => setCurrentView('signup');
  const handleSwitchToLogin = () => setCurrentView('login');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 p-0">
        <VisuallyHidden>
          <DialogTitle>
            {currentView === 'login' ? 'Sign In' : 'Create Account'}
          </DialogTitle>
        </VisuallyHidden>
        
        {currentView === 'login' ? (
          <LoginForm onSwitchToSignup={handleSwitchToSignup} />
        ) : (
          <SignupForm onSwitchToLogin={handleSwitchToLogin} />
        )}
      </DialogContent>
    </Dialog>
  );
};