import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useParams } from 'wouter';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { resetPassword } from '@/lib/api';
import { Loader2, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';

// Client-side schema that includes password confirmation
const clientResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ClientResetPasswordData = z.infer<typeof clientResetPasswordSchema>;

interface ResetPasswordFormProps {
  token?: string;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ token: propToken }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [location, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();

  // Get token from props, path params, or query params (fallback support)
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const token = propToken || params.token || urlParams.get('token') || '';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ClientResetPasswordData>({
    resolver: zodResolver(clientResetPasswordSchema),
    defaultValues: {
      token,
    },
  });

  const password = watch('newPassword');

  // Update token field if it changes
  useEffect(() => {
    if (token) {
      // Token is already set in defaultValues
    }
  }, [token]);

  const onSubmit = async (data: ClientResetPasswordData) => {
    setIsLoading(true);

    try {
      // Only send token and newPassword to the API (not confirmPassword)
      await resetPassword(data.token, data.newPassword);
      setIsSuccess(true);
      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. You can now log in with your new password.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password reset failed. The link may be expired or invalid.';
      toast({
        title: "Reset Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setLocation('/app');
  };

  // Check if token is provided
  if (!token) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Invalid Reset Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or incomplete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              The password reset link you clicked is invalid or incomplete. 
              Please request a new password reset link.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button className="w-full" onClick={handleBackToLogin}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle>Password Reset Complete</CardTitle>
          <CardDescription>
            Your password has been successfully updated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              You can now log in to your account using your new password.
            </AlertDescription>
          </Alert>
          
          <div className="mt-4">
            <Button className="w-full" onClick={handleBackToLogin}>
              Continue to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Hidden token field */}
          <input type="hidden" {...register('token')} value={token} />

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your new password"
                {...register('newPassword')}
                className={errors.newPassword ? 'border-red-500 pr-10' : 'pr-10'}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-red-500">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                {...register('confirmPassword')}
                className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Password strength indicator */}
          {password && (
            <div className="text-sm text-muted-foreground">
              <div className="space-y-1">
                <div className={`flex items-center ${password.length >= 8 ? 'text-green-600' : 'text-slate-400'}`}>
                  <div className={`mr-2 h-2 w-2 rounded-full ${password.length >= 8 ? 'bg-green-600' : 'bg-slate-300'}`} />
                  At least 8 characters
                </div>
                <div className={`flex items-center ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
                  <div className={`mr-2 h-2 w-2 rounded-full ${/[A-Z]/.test(password) ? 'bg-green-600' : 'bg-slate-300'}`} />
                  One uppercase letter
                </div>
                <div className={`flex items-center ${/[a-z]/.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
                  <div className={`mr-2 h-2 w-2 rounded-full ${/[a-z]/.test(password) ? 'bg-green-600' : 'bg-slate-300'}`} />
                  One lowercase letter
                </div>
                <div className={`flex items-center ${/\d/.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
                  <div className={`mr-2 h-2 w-2 rounded-full ${/\d/.test(password) ? 'bg-green-600' : 'bg-slate-300'}`} />
                  One number
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
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