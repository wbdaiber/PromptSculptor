import { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AdvancedAnalyticsData, DateRange } from '@/pages/admin/DatabaseAnalytics';

interface InteractiveChartsProps {
  data: AdvancedAnalyticsData | null;
  loading: boolean;
  dateRange: DateRange;
}

const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
];

export default function InteractiveCharts({ data, loading, dateRange }: InteractiveChartsProps) {
  const [selectedChart, setSelectedChart] = useState<'growth' | 'engagement' | 'templates' | 'api-keys'>('growth');

  if (loading || !data) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const calculateTrend = (data: Array<{ count: number }>) => {
    if (data.length < 2) return { trend: 'stable', change: 0 };
    
    const recent = data.slice(-3).reduce((sum, item) => sum + item.count, 0) / 3;
    const previous = data.slice(-6, -3).reduce((sum, item) => sum + item.count, 0) / 3;
    
    const change = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
    
    return {
      trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      change: Math.abs(change),
    };
  };

  return (
    <div className="space-y-6">
      {/* Chart Selection */}
      <Tabs value={selectedChart} onValueChange={(value) => setSelectedChart(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="growth">User Growth</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>

        {/* User Growth Chart */}
        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    User Growth Trends
                  </CardTitle>
                  <CardDescription>
                    Daily user signups over the selected period
                  </CardDescription>
                </div>
                <Badge variant={data.userGrowth.growthRate > 0 ? 'default' : 'secondary'}>
                  {data.userGrowth.growthRate > 0 ? '+' : ''}{data.userGrowth.growthRate.toFixed(1)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.userGrowth.signups}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => formatDate(value as string)}
                    formatter={(value, name) => [value, 'Signups']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Chart */}
        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                User Engagement Over Time
              </CardTitle>
              <CardDescription>
                Active users and new user acquisition trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.customMetrics.userEngagementTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => formatDate(value as string)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="activeUsers" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Active Users"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newUsers" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="New Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Prompts per Day */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Prompt Generation</CardTitle>
              <CardDescription>
                Number of prompts generated each day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.customMetrics.promptsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => formatDate(value as string)}
                    formatter={(value, name) => [value, 'Prompts']}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#F59E0B" 
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Template Usage Chart */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Template Usage Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of template types usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.customMetrics.templateUsage}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      nameKey="template"
                      label={({ template, percentage }) => `${template} ${percentage}%`}
                    >
                      {data.customMetrics.templateUsage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Template Popularity</CardTitle>
                <CardDescription>
                  Most used template types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.customMetrics.templateUsage} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="template" type="category" width={80} />
                    <Tooltip formatter={(value, name) => [value, 'Usage Count']} />
                    <Bar 
                      dataKey="count" 
                      fill="#8B5CF6"
                      radius={[0, 2, 2, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API Keys Chart */}
        <TabsContent value="api-keys" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* API Service Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>API Service Adoption</CardTitle>
                <CardDescription>
                  Distribution of API keys by service
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.customMetrics.apiKeyAdoption}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="users"
                      nameKey="service"
                      label={({ service, percentage }) => `${service} ${percentage}%`}
                    >
                      {data.customMetrics.apiKeyAdoption.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, 'Users']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* API Adoption Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>API Key Metrics</CardTitle>
                <CardDescription>
                  Adoption rates and user distribution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.customMetrics.apiKeyAdoption.map((service, index) => (
                  <div key={service.service} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index] }}
                      />
                      <span className="text-sm font-medium">{service.service}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{service.users} users</div>
                      <div className="text-xs text-slate-500">{service.percentage}%</div>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Total API Keys:</span>
                    <span className="font-bold">{data.userEngagement.apiKeysConfigured}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Adoption Rate:</span>
                    <span className="font-bold">
                      {Math.round((data.userEngagement.apiKeysConfigured / data.userEngagement.totalUsers) * 100)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}