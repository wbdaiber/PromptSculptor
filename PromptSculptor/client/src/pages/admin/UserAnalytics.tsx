import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  TrendingUp, 
  Activity, 
  Heart,
  MessageSquare,
  Key,
  Clock,
  Calendar,
  RefreshCw,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { 
  getUserGrowthData, 
  getUserEngagementMetrics, 
  getUserRetentionStats,
  getUserActivityData,
  type UserGrowthData,
  type UserEngagementData,
  type UserRetentionData,
  type UserActivityData
} from '@/lib/adminApi';
import AdminLayout from '@/components/admin/AdminLayout';
import UserGrowthChart from '@/components/admin/UserGrowthChart';
import UserStatisticsTable from '@/components/admin/UserStatisticsTable';

export default function UserAnalytics() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  // User growth query
  const {
    data: growthData,
    isLoading: growthLoading,
    error: growthError,
    refetch: refetchGrowth
  } = useQuery<UserGrowthData>({
    queryKey: ['admin', 'user-growth', selectedPeriod],
    queryFn: () => getUserGrowthData(selectedPeriod),
    enabled: !!admin,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // User engagement query
  const {
    data: engagementData,
    isLoading: engagementLoading,
    error: engagementError,
    refetch: refetchEngagement
  } = useQuery<UserEngagementData>({
    queryKey: ['admin', 'user-engagement'],
    queryFn: () => getUserEngagementMetrics(),
    enabled: !!admin,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // User retention query
  const {
    data: retentionData,
    isLoading: retentionLoading,
    error: retentionError,
    refetch: refetchRetention
  } = useQuery<UserRetentionData>({
    queryKey: ['admin', 'user-retention'],
    queryFn: () => getUserRetentionStats(),
    enabled: !!admin,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // User activity query
  const {
    data: activityData,
    isLoading: activityLoading,
    error: activityError,
    refetch: refetchActivity
  } = useQuery<UserActivityData>({
    queryKey: ['admin', 'user-activity'],
    queryFn: () => getUserActivityData(),
    enabled: !!admin,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const handleRefreshAll = async () => {
    try {
      await Promise.all([
        refetchGrowth(),
        refetchEngagement(),
        refetchRetention(),
        refetchActivity()
      ]);
      toast({
        title: 'Data Refreshed',
        description: 'All user analytics data has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh analytics data.',
        variant: 'destructive',
      });
    }
  };

  const isLoading = growthLoading || engagementLoading || retentionLoading || activityLoading;
  const hasError = growthError || engagementError || retentionError || activityError;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTemplateTypeIcon = (type: string) => {
    switch (type) {
      case 'analysis':
        return <BarChart3 className="w-4 h-4" />;
      case 'writing':
        return <MessageSquare className="w-4 h-4" />;
      case 'coding':
        return <Activity className="w-4 h-4" />;
      default:
        return <PieChart className="w-4 h-4" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              User Analytics
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Comprehensive user growth, engagement, and retention metrics
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select value={selectedPeriod} onValueChange={(value: '7d' | '30d' | '90d') => setSelectedPeriod(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
                <SelectItem value="90d">90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleRefreshAll} size="sm" variant="outline" disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {hasError && (
          <Alert variant="destructive">
            <Activity className="w-4 h-4" />
            <AlertDescription>
              Failed to load some analytics data. Please try refreshing.
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Total Users</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {engagementData ? formatNumber(engagementData.totalUsers) : '—'}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Active accounts
                </div>
                {growthData && (
                  <div className={`text-xs ${growthData.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {growthData.growthRate >= 0 ? '+' : ''}{growthData.growthRate}% vs prev period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center space-x-2">
                <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Active Users</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {engagementData ? formatNumber(engagementData.activeUsers) : '—'}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Last 30 days
                </div>
                {engagementData && engagementData.totalUsers > 0 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {Math.round((engagementData.activeUsers / engagementData.totalUsers) * 100)}% of total users
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prompts Generated */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Prompts Generated</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {engagementData ? formatNumber(engagementData.promptsGenerated) : '—'}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Total prompts
                </div>
                {engagementData && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    ~{engagementData.averagePromptsPerUser} per user avg
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* API Keys Configured */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center space-x-2">
                <Key className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span>API Adoption</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {engagementData ? formatNumber(engagementData.apiKeysConfigured) : '—'}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Users with API keys
                </div>
                {engagementData && engagementData.totalUsers > 0 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {Math.round((engagementData.apiKeysConfigured / engagementData.totalUsers) * 100)}% adoption rate
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span>User Growth Trend</span>
            </CardTitle>
            <CardDescription>
              Daily user signups over the selected time period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserGrowthChart 
              data={growthData} 
              isLoading={growthLoading} 
              period={selectedPeriod}
            />
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Retention Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <span>User Retention</span>
              </CardTitle>
              <CardDescription>
                User retention and churn analysis (30 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {retentionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-600 dark:text-slate-400" />
                </div>
              ) : retentionData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {formatNumber(retentionData.newUsers)}
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        New Users
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {formatNumber(retentionData.returningUsers)}
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        Returning Users
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {retentionData.retentionRate}%
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Retention Rate
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {retentionData.churnRate}%
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Churn Rate
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                  No retention data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <span>Popular Templates</span>
              </CardTitle>
              <CardDescription>
                Most frequently used prompt template types
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-600 dark:text-slate-400" />
                </div>
              ) : activityData && activityData.topTemplateTypes.length > 0 ? (
                <div className="space-y-3">
                  {activityData.topTemplateTypes.slice(0, 5).map((template, index) => (
                    <div key={template.templateType} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2">
                          {getTemplateTypeIcon(template.templateType)}
                          <span className="font-medium capitalize text-slate-900 dark:text-slate-100">
                            {template.templateType}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {formatNumber(template.count)}
                        </Badge>
                        <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${Math.max(10, (template.count / activityData.topTemplateTypes[0].count) * 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                  No template usage data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Statistics Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Latest user signups and prompt generation activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserStatisticsTable 
              activityData={activityData}
              isLoading={activityLoading}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}