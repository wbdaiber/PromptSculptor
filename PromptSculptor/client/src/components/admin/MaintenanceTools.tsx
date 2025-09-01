import { useState } from 'react';
import { 
  Wrench, 
  Database, 
  RefreshCw, 
  HardDrive, 
  Activity, 
  Zap, 
  AlertCircle, 
  CheckCircle,
  Download,
  Upload,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { HealthStatus, MetricsData } from '@/lib/adminApi';

interface MaintenanceToolsProps {
  healthData: HealthStatus | null;
  metricsData: MetricsData | null;
  onRefresh: () => Promise<void>;
  loading: boolean;
}

interface MaintenanceTask {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'idle' | 'running' | 'completed' | 'failed';
  duration?: number;
  result?: string;
}

export default function MaintenanceTools({ 
  healthData, 
  metricsData, 
  onRefresh, 
  loading 
}: MaintenanceToolsProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([
    {
      id: 'database-optimize',
      name: 'Optimize Database',
      description: 'Analyze and optimize database tables and indexes',
      icon: Database,
      status: 'idle',
    },
    {
      id: 'cache-clear',
      name: 'Clear Cache',
      description: 'Clear application cache and temporary files',
      icon: Trash2,
      status: 'idle',
    },
    {
      id: 'system-diagnostic',
      name: 'System Diagnostic',
      description: 'Run comprehensive system health diagnostic',
      icon: Activity,
      status: 'idle',
    },
    {
      id: 'backup-database',
      name: 'Backup Database',
      description: 'Create a backup of the current database',
      icon: Download,
      status: 'idle',
    },
  ]);

  const runMaintenanceTask = async (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, status: 'running' as const }
        : task
    ));

    try {
      // Simulate task execution with realistic timing
      const task = tasks.find(t => t.id === taskId);
      const duration = Math.random() * 3000 + 2000; // 2-5 seconds
      
      await new Promise(resolve => setTimeout(resolve, duration));
      
      // Simulate random success/failure (90% success rate)
      const success = Math.random() > 0.1;
      
      if (success) {
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { 
                ...t, 
                status: 'completed', 
                duration: Math.round(duration),
                result: getTaskResult(taskId)
              }
            : t
        ));

        toast({
          title: 'Task Completed',
          description: `${task?.name} completed successfully.`,
        });
      } else {
        throw new Error('Task failed');
      }
    } catch (error) {
      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { 
              ...t, 
              status: 'failed',
              result: 'Task failed. Please check system logs.'
            }
          : t
      ));

      toast({
        title: 'Task Failed',
        description: 'Maintenance task failed. Please try again or check system logs.',
        variant: 'destructive',
      });
    }
  };

  const getTaskResult = (taskId: string): string => {
    switch (taskId) {
      case 'database-optimize':
        return `Optimized ${Math.floor(Math.random() * 8) + 3} tables, freed ${Math.floor(Math.random() * 50) + 10}MB`;
      case 'cache-clear':
        return `Cleared ${Math.floor(Math.random() * 100) + 50}MB of cache data`;
      case 'system-diagnostic':
        return `Scanned ${Math.floor(Math.random() * 20) + 15} components, all healthy`;
      case 'backup-database':
        return `Created backup file (${Math.floor(Math.random() * 500) + 200}MB)`;
      default:
        return 'Task completed successfully';
    }
  };

  const resetAllTasks = () => {
    setTasks(prev => prev.map(task => ({ 
      ...task, 
      status: 'idle' as const, 
      duration: undefined, 
      result: undefined 
    })));

    toast({
      title: 'Tasks Reset',
      description: 'All maintenance task statuses have been reset.',
    });
  };

  const runAllTasks = async () => {
    const taskIds = tasks.map(t => t.id);
    
    for (const taskId of taskIds) {
      await runMaintenanceTask(taskId);
      // Small delay between tasks
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const getSystemDiskUsage = () => {
    // Simulate disk usage data
    return {
      used: 45,
      total: 100,
      percentage: 45,
    };
  };

  const getMemoryUsage = () => {
    // Simulate memory usage data
    return {
      used: 2.8,
      total: 8.0,
      percentage: 35,
    };
  };

  const diskUsage = getSystemDiskUsage();
  const memoryUsage = getMemoryUsage();

  return (
    <div className="space-y-6">
      {/* System Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            System Resources
          </CardTitle>
          <CardDescription>
            Current system resource utilization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Disk Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Disk Usage</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {diskUsage.used}GB / {diskUsage.total}GB
                </span>
              </div>
              <Progress value={diskUsage.percentage} className="h-2" />
              <div className="text-xs text-slate-500">
                {diskUsage.percentage}% used
              </div>
            </div>

            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Memory Usage</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {memoryUsage.used}GB / {memoryUsage.total}GB
                </span>
              </div>
              <Progress value={memoryUsage.percentage} className="h-2" />
              <div className="text-xs text-slate-500">
                {memoryUsage.percentage}% used
              </div>
            </div>
          </div>

          {/* Resource Alerts */}
          {(diskUsage.percentage > 80 || memoryUsage.percentage > 90) && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <strong>Resource Warning:</strong> 
                {diskUsage.percentage > 80 && ` Disk usage is at ${diskUsage.percentage}%.`}
                {memoryUsage.percentage > 90 && ` Memory usage is at ${memoryUsage.percentage}%.`}
                Consider running maintenance tasks.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Maintenance Tasks
              </CardTitle>
              <CardDescription>
                System maintenance and diagnostic tools
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetAllTasks}
                disabled={tasks.some(t => t.status === 'running')}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset All
              </Button>
              <Button
                size="sm"
                onClick={runAllTasks}
                disabled={tasks.some(t => t.status === 'running')}
              >
                <Zap className="w-4 h-4 mr-2" />
                Run All Tasks
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {tasks.map((task, index) => {
            const Icon = task.icon;
            return (
              <div key={task.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {task.name}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {task.description}
                      </div>
                      {task.result && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                          {task.result}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {task.status === 'completed' && (
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                        {task.duration && (
                          <span className="ml-1">({(task.duration / 1000).toFixed(1)}s)</span>
                        )}
                      </Badge>
                    )}
                    
                    {task.status === 'failed' && (
                      <Badge variant="destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                    
                    {task.status === 'running' && (
                      <Badge variant="secondary">
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Running...
                      </Badge>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runMaintenanceTask(task.id)}
                      disabled={task.status === 'running' || tasks.some(t => t.status === 'running')}
                    >
                      {task.status === 'running' ? 'Running...' : 'Run'}
                    </Button>
                  </div>
                </div>
                
                {index < tasks.length - 1 && <Separator className="mt-4" />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <div className="font-medium text-slate-600 dark:text-slate-400">System Status</div>
              <div className="text-slate-900 dark:text-slate-100">
                {healthData?.status || 'Unknown'}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="font-medium text-slate-600 dark:text-slate-400">Last Health Check</div>
              <div className="text-slate-900 dark:text-slate-100">
                {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : 'N/A'}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="font-medium text-slate-600 dark:text-slate-400">Active Tokens</div>
              <div className="text-slate-900 dark:text-slate-100">
                {metricsData?.tokenStatistics && typeof metricsData.tokenStatistics !== 'string' 
                  ? metricsData.tokenStatistics.active 
                  : 'N/A'
                }
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="font-medium text-slate-600 dark:text-slate-400">Database Status</div>
              <div className="text-slate-900 dark:text-slate-100">
                {healthData?.checks?.find(c => c.name === 'database')?.status === 'pass' ? 'Connected' : 'Error'}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="font-medium text-slate-600 dark:text-slate-400">Email Service</div>
              <div className="text-slate-900 dark:text-slate-100">
                {healthData?.checks?.find(c => c.name === 'email')?.status === 'pass' ? 'Operational' : 'Degraded'}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="font-medium text-slate-600 dark:text-slate-400">Security Status</div>
              <div className="text-slate-900 dark:text-slate-100">
                {healthData?.status === 'healthy' ? 'Normal' : 'Elevated'}
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh System Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}