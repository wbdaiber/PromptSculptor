import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { UserGrowthData } from '@/lib/adminApi';

interface UserGrowthChartProps {
  data: UserGrowthData | undefined;
  isLoading: boolean;
  period: '7d' | '30d' | '90d';
}

export default function UserGrowthChart({ data, isLoading, period }: UserGrowthChartProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600 dark:text-slate-400" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">Loading growth data...</span>
      </div>
    );
  }

  if (!data || !data.signups.length) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-slate-500 dark:text-slate-400 mb-2">No growth data available</div>
          <div className="text-sm text-slate-400 dark:text-slate-500">
            Check back once users start signing up
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTooltipDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate trend from the data
  const totalSignups = data.signups.reduce((sum, day) => sum + day.count, 0);
  const midpoint = Math.floor(data.signups.length / 2);
  const firstHalf = data.signups.slice(0, midpoint).reduce((sum, day) => sum + day.count, 0);
  const secondHalf = data.signups.slice(midpoint).reduce((sum, day) => sum + day.count, 0);
  
  let trendDirection: 'up' | 'down' | 'flat' = 'flat';
  if (secondHalf > firstHalf * 1.1) trendDirection = 'up';
  else if (secondHalf < firstHalf * 0.9) trendDirection = 'down';

  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-slate-600" />;
    }
  };

  const getTrendColor = () => {
    switch (trendDirection) {
      case 'up': return 'text-green-600 dark:text-green-400';
      case 'down': return 'text-red-600 dark:text-red-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {formatTooltipDate(label)}
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            <span className="font-medium">{payload[0].value}</span> new user{payload[0].value !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Chart Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {data.growthRate >= 0 ? '+' : ''}{data.growthRate}% vs previous period
            </span>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {totalSignups} total signups in {period}
          </div>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {data.totalUsers.toLocaleString()} total users
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data.signups}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              className="text-slate-600 dark:text-slate-400"
              fontSize={12}
            />
            <YAxis 
              className="text-slate-600 dark:text-slate-400"
              fontSize={12}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorGradient)"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend/Help */}
      <div className="flex items-center justify-center space-x-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-600 rounded-full opacity-70" />
          <span>Daily signups</span>
        </div>
        <span>•</span>
        <span>Hover over points for details</span>
      </div>
    </div>
  );
}