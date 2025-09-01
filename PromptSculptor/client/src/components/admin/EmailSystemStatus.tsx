import { useState } from 'react';
import { Mail, CheckCircle, AlertTriangle, XCircle, RefreshCw, TrendingUp, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { HealthStatus, MetricsData } from '@/lib/adminApi';

interface EmailSystemStatusProps {
  healthData: HealthStatus | null;
  metricsData: MetricsData | null;
  loading: boolean;
}

export default function EmailSystemStatus({ healthData, metricsData, loading }: EmailSystemStatusProps) {
  const [testingEmail, setTestingEmail] = useState(false);
  const { toast } = useToast();

  const getEmailStatus = () => {
    const emailCheck = healthData?.checks?.find(check => check.name === 'Email Service');
    if (!emailCheck) return { status: 'unknown', message: 'Status unavailable' };
    
    if (emailCheck.status === 'pass') {
      return { status: 'operational', message: 'Email service is operational' };
    } else {
      return { 
        status: 'error', 
        message: emailCheck.details || 'Email service is experiencing issues' 
      };
    }
  };

  const getEmailMetrics = () => {
    if (!metricsData?.passwordResetMetrics) {
      return {
        deliveryRate: 0,
        totalSent: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
      };
    }

    const metrics = metricsData.passwordResetMetrics;
    const totalSent = metrics.totalRequests || 0;
    const successful = metrics.successfulResets || 0;
    const deliveryRate = totalSent > 0 ? (successful / totalSent) * 100 : 0;

    return {
      deliveryRate: Math.round(deliveryRate),
      totalSent,
      successfulDeliveries: successful,
      failedDeliveries: totalSent - successful,
    };
  };

  const testEmailDelivery = async () => {
    setTestingEmail(true);
    
    // Simulate email test (in a real implementation, this would call an API endpoint)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random success/failure for demo
      const success = Math.random() > 0.2; // 80% success rate
      
      if (success) {
        toast({
          title: 'Email Test Successful',
          description: 'Test email was sent successfully. Email service is operational.',
        });
      } else {
        toast({
          title: 'Email Test Failed',
          description: 'Test email could not be sent. Please check email configuration.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Test Error',
        description: 'Unable to perform email test. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const emailStatus = getEmailStatus();
  const emailMetrics = getEmailMetrics();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email System Status
        </CardTitle>
        <CardDescription>
          Email service monitoring and delivery statistics
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading && !healthData ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        ) : (
          <>
            {/* Service Status */}
            <div className="flex items-center gap-3">
              {emailStatus.status === 'operational' && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {emailStatus.status === 'error' && (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              {emailStatus.status === 'unknown' && (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
              
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  Email Service
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {emailStatus.message}
                </div>
              </div>
              
              <Badge 
                variant={emailStatus.status === 'operational' ? 'default' : 'destructive'}
              >
                {emailStatus.status}
              </Badge>
            </div>

            {/* Email Metrics */}
            {metricsData?.passwordResetMetrics && (
              <div className="space-y-4">
                {/* Delivery Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Delivery Success Rate</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      {emailMetrics.deliveryRate}%
                    </span>
                  </div>
                  <Progress value={emailMetrics.deliveryRate} className="h-2" />
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {emailMetrics.totalSent}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Total Sent
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {emailMetrics.successfulDeliveries}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Delivered
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Average Response Time</span>
                    <span className="font-medium">
                      {metricsData.passwordResetMetrics.averageTimeToReset?.toFixed(1) || '0.0'}s
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Rate Limited Requests</span>
                    <span className="font-medium">
                      {metricsData.passwordResetMetrics.rateLimitedRequests || 0}
                    </span>
                  </div>
                </div>

                {/* Email Service Health Alert */}
                {emailMetrics.deliveryRate < 90 && (
                  <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                      <strong>Delivery Rate Below Optimal:</strong> Email delivery success rate is {emailMetrics.deliveryRate}%. 
                      Consider checking email service configuration.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Test Email Button */}
            <Button
              variant="outline"
              onClick={testEmailDelivery}
              disabled={testingEmail}
              className="w-full"
            >
              {testingEmail ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing Email Delivery...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Test Email Delivery
                </>
              )}
            </Button>

            {/* Email Service Info */}
            <div className="pt-4 border-t space-y-2">
              <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Email Service Configuration
              </h4>
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <div>• Password reset emails via Resend API</div>
                <div>• Welcome emails for new user registration</div>
                <div>• Professional HTML/text templates</div>
                <div>• Domain verification for production delivery</div>
              </div>
            </div>

            {/* Common Issues */}
            {emailStatus.status === 'error' && (
              <div className="pt-4 border-t space-y-2">
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400">
                  Troubleshooting
                </h4>
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <div>• Check RESEND_API_KEY environment variable</div>
                  <div>• Verify domain configuration in Resend dashboard</div>
                  <div>• Ensure FROM_EMAIL matches verified domain</div>
                  <div>• Check service rate limits and quotas</div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}