import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { forgotPassword } from '@/lib/api';
import { forgotPasswordSchema, type ForgotPasswordRequest } from '@shared/schema';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';

interface ForgotPasswordFormProps {
  onBackToLogin?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordRequest) => {
    setIsLoading(true);

    try {
      await forgotPassword(data.email);
      setIsSuccess(true);
      toast({
        title: "Reset Email Sent",
        description: "If an account with that email exists, we've sent password reset instructions.",
      });
    } catch (err) {
      // Always show the same message for security (no user enumeration)
      setIsSuccess(true);
      toast({
        title: "Reset Email Sent",
        description: "If an account with that email exists, we've sent password reset instructions.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      setLocation('/app');
    }
  };

  if (isSuccess) {
    const email = getValues('email');
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            We've sent password reset instructions to {email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              If you don't see the email in your inbox, check your spam folder. 
              The reset link will expire in 30 minutes for security.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleBackToLogin}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              Didn't receive an email? Check that you entered the correct email address.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Reset Your Password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you instructions to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Reset Link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              className="p-0"
              onClick={handleBackToLogin}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};