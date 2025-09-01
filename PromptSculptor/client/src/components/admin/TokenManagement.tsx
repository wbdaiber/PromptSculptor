import { useState } from 'react';
import { Key, Trash2, RefreshCw, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { MetricsData } from '@/lib/adminApi';

interface TokenManagementProps {
  metricsData: MetricsData | null;
  onTokenCleanup: () => Promise<void>;
  loading: boolean;
}

export default function TokenManagement({ metricsData, onTokenCleanup, loading }: TokenManagementProps) {
  const [cleaning, setCleaning] = useState(false);
  const { toast } = useToast();

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      await onTokenCleanup();
    } catch (error) {
      toast({
        title: 'Cleanup Failed',
        description: 'An error occurred during token cleanup.',
        variant: 'destructive',
      });
    } finally {
      setCleaning(false);
    }
  };

  const getTokenHealthStatus = () => {
    if (!metricsData?.tokenStatistics || typeof metricsData.tokenStatistics === 'string') {
      return { status: 'unknown', color: 'slate' };
    }

    const stats = metricsData.tokenStatistics;
    const cleanupNeeded = stats.cleanupRequired || 0;
    
    if (cleanupNeeded > 20) {
      return { status: 'critical', color: 'red' };
    } else if (cleanupNeeded > 10) {
      return { status: 'warning', color: 'yellow' };
    } else {
      return { status: 'healthy', color: 'green' };
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  };

  const tokenHealth = getTokenHealthStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Token Management
        </CardTitle>
        <CardDescription>
          Password reset token statistics and cleanup tools
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading && !metricsData ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        ) : (
          <>
            {/* Token Statistics */}
            {metricsData?.tokenStatistics && typeof metricsData.tokenStatistics !== 'string' ? (
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {tokenHealth.status === 'healthy' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {tokenHealth.status === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                  {tokenHealth.status === 'critical' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  
                  <Badge 
                    variant={tokenHealth.color === 'green' ? 'default' : 'destructive'}
                    className={
                      tokenHealth.color === 'yellow' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                        : ''
                    }
                  >
                    {tokenHealth.status === 'healthy' && 'System Healthy'}
                    {tokenHealth.status === 'warning' && 'Cleanup Recommended'}
                    {tokenHealth.status === 'critical' && 'Cleanup Required'}
                  </Badge>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {metricsData.tokenStatistics.total}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Total Tokens
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {metricsData.tokenStatistics.active}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Active Tokens
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                      {metricsData.tokenStatistics.expired}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Expired Tokens
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {metricsData.tokenStatistics.used}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Used Tokens
                    </div>
                  </div>
                </div>

                {/* Cleanup Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cleanup Required</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {metricsData.tokenStatistics.cleanupRequired} tokens
                    </span>
                  </div>
                  
                  <Progress 
                    value={(metricsData.tokenStatistics.cleanupRequired / Math.max(metricsData.tokenStatistics.total, 1)) * 100}
                    className="h-2"
                  />
                </div>

                {/* Cleanup Alert */}
                {metricsData.tokenStatistics.cleanupRequired > 0 && (
                  <Alert className={
                    metricsData.tokenStatistics.cleanupRequired > 10 
                      ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
                      : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                  }>
                    <Clock className="w-4 h-4" />
                    <AlertDescription>
                      {metricsData.tokenStatistics.cleanupRequired > 10 ? (
                        <>
                          <strong>Cleanup Recommended:</strong> {metricsData.tokenStatistics.cleanupRequired} expired tokens 
                          should be cleaned up to optimize database performance.
                        </>
                      ) : (
                        <>
                          <strong>Minor Cleanup:</strong> {metricsData.tokenStatistics.cleanupRequired} expired tokens 
                          can be cleaned up.
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Cleanup Action */}
                <Button
                  variant="outline"
                  onClick={handleCleanup}
                  disabled={cleaning || metricsData.tokenStatistics.cleanupRequired === 0}
                  className="w-full"
                >
                  {cleaning ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Cleaning Up Tokens...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clean Up Expired Tokens
                      {metricsData.tokenStatistics.cleanupRequired > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {metricsData.tokenStatistics.cleanupRequired}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Token statistics unavailable</p>
                <p className="text-sm">
                  {typeof metricsData?.tokenStatistics === 'string' 
                    ? metricsData.tokenStatistics
                    : 'Unable to load token data'
                  }
                </p>
              </div>
            )}
          </>
        )}

        {/* Token Lifecycle Info */}
        <div className="pt-4 border-t space-y-2">
          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Token Lifecycle
          </h4>
          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <div>• Tokens expire after 30 minutes</div>
            <div>• Used tokens are marked and become inactive</div>
            <div>• Expired tokens are cleaned up automatically</div>
            <div>• Manual cleanup optimizes database performance</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}