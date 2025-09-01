import { useState } from 'react';
import { Settings, Globe, Shield, Database, AlertTriangle, Save, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface SystemStatus {
  database: 'connected' | 'disconnected' | 'error';
  email: 'operational' | 'degraded' | 'down';
  security: 'normal' | 'elevated' | 'critical';
  tokens: 'healthy' | 'cleanup_needed' | 'critical';
}

interface ConfigurationPanelProps {
  systemStatus: SystemStatus;
  maintenanceMode: boolean;
  onMaintenanceModeChange: (enabled: boolean) => void;
}

interface SystemConfig {
  security: {
    rateLimitEnabled: boolean;
    maxLoginAttempts: number;
    sessionTimeout: number;
    tokenExpiry: number;
  };
  email: {
    welcomeEmailsEnabled: boolean;
    passwordResetEnabled: boolean;
    emailTemplate: 'default' | 'minimal' | 'branded';
    retryAttempts: number;
  };
  database: {
    autoBackupEnabled: boolean;
    backupFrequency: 'daily' | 'weekly';
    cleanupSchedule: 'hourly' | 'daily';
    queryTimeout: number;
  };
  system: {
    debugMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    analyticsEnabled: boolean;
    compressionEnabled: boolean;
  };
}

export default function ConfigurationPanel({
  systemStatus,
  maintenanceMode,
  onMaintenanceModeChange,
}: ConfigurationPanelProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SystemConfig>({
    security: {
      rateLimitEnabled: true,
      maxLoginAttempts: 5,
      sessionTimeout: 120, // minutes
      tokenExpiry: 30, // minutes
    },
    email: {
      welcomeEmailsEnabled: true,
      passwordResetEnabled: true,
      emailTemplate: 'branded',
      retryAttempts: 3,
    },
    database: {
      autoBackupEnabled: false,
      backupFrequency: 'daily',
      cleanupSchedule: 'daily',
      queryTimeout: 30, // seconds
    },
    system: {
      debugMode: false,
      logLevel: 'info',
      analyticsEnabled: true,
      compressionEnabled: true,
    },
  });

  const handleConfigChange = (section: keyof SystemConfig, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    
    try {
      // Simulate saving configuration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: 'Configuration Saved',
        description: 'System configuration has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save configuration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetConfig = () => {
    setConfig({
      security: {
        rateLimitEnabled: true,
        maxLoginAttempts: 5,
        sessionTimeout: 120,
        tokenExpiry: 30,
      },
      email: {
        welcomeEmailsEnabled: true,
        passwordResetEnabled: true,
        emailTemplate: 'branded',
        retryAttempts: 3,
      },
      database: {
        autoBackupEnabled: false,
        backupFrequency: 'daily',
        cleanupSchedule: 'daily',
        queryTimeout: 30,
      },
      system: {
        debugMode: false,
        logLevel: 'info',
        analyticsEnabled: true,
        compressionEnabled: true,
      },
    });
    
    toast({
      title: 'Configuration Reset',
      description: 'Configuration has been reset to default values.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          System Configuration
        </CardTitle>
        <CardDescription>
          Configure system settings and operational parameters
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="security" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* Security Configuration */}
          <TabsContent value="security" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Rate Limiting</Label>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Enable rate limiting for API endpoints
                  </div>
                </div>
                <Switch
                  checked={config.security.rateLimitEnabled}
                  onCheckedChange={(checked) => handleConfigChange('security', 'rateLimitEnabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-login-attempts">Maximum Login Attempts</Label>
                <Input
                  id="max-login-attempts"
                  type="number"
                  value={config.security.maxLoginAttempts}
                  onChange={(e) => handleConfigChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                  min="1"
                  max="10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  value={config.security.sessionTimeout}
                  onChange={(e) => handleConfigChange('security', 'sessionTimeout', parseInt(e.target.value))}
                  min="5"
                  max="480"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token-expiry">Token Expiry (minutes)</Label>
                <Input
                  id="token-expiry"
                  type="number"
                  value={config.security.tokenExpiry}
                  onChange={(e) => handleConfigChange('security', 'tokenExpiry', parseInt(e.target.value))}
                  min="5"
                  max="120"
                />
              </div>
            </div>
          </TabsContent>

          {/* Email Configuration */}
          <TabsContent value="email" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Welcome Emails</Label>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Send welcome emails to new users
                  </div>
                </div>
                <Switch
                  checked={config.email.welcomeEmailsEnabled}
                  onCheckedChange={(checked) => handleConfigChange('email', 'welcomeEmailsEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Password Reset Emails</Label>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Enable password reset email functionality
                  </div>
                </div>
                <Switch
                  checked={config.email.passwordResetEnabled}
                  onCheckedChange={(checked) => handleConfigChange('email', 'passwordResetEnabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-template">Email Template Style</Label>
                <select
                  id="email-template"
                  value={config.email.emailTemplate}
                  onChange={(e) => handleConfigChange('email', 'emailTemplate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"
                >
                  <option value="default">Default</option>
                  <option value="minimal">Minimal</option>
                  <option value="branded">Branded</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retry-attempts">Email Retry Attempts</Label>
                <Input
                  id="retry-attempts"
                  type="number"
                  value={config.email.retryAttempts}
                  onChange={(e) => handleConfigChange('email', 'retryAttempts', parseInt(e.target.value))}
                  min="1"
                  max="5"
                />
              </div>
            </div>
          </TabsContent>

          {/* Database Configuration */}
          <TabsContent value="database" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto Backup</Label>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Automatically backup database
                  </div>
                </div>
                <Switch
                  checked={config.database.autoBackupEnabled}
                  onCheckedChange={(checked) => handleConfigChange('database', 'autoBackupEnabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backup-frequency">Backup Frequency</Label>
                <select
                  id="backup-frequency"
                  value={config.database.backupFrequency}
                  onChange={(e) => handleConfigChange('database', 'backupFrequency', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"
                  disabled={!config.database.autoBackupEnabled}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cleanup-schedule">Cleanup Schedule</Label>
                <select
                  id="cleanup-schedule"
                  value={config.database.cleanupSchedule}
                  onChange={(e) => handleConfigChange('database', 'cleanupSchedule', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="query-timeout">Query Timeout (seconds)</Label>
                <Input
                  id="query-timeout"
                  type="number"
                  value={config.database.queryTimeout}
                  onChange={(e) => handleConfigChange('database', 'queryTimeout', parseInt(e.target.value))}
                  min="5"
                  max="300"
                />
              </div>
            </div>
          </TabsContent>

          {/* System Configuration */}
          <TabsContent value="system" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Debug Mode</Label>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Enable detailed debugging information
                  </div>
                </div>
                <Switch
                  checked={config.system.debugMode}
                  onCheckedChange={(checked) => handleConfigChange('system', 'debugMode', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="log-level">Log Level</Label>
                <select
                  id="log-level"
                  value={config.system.logLevel}
                  onChange={(e) => handleConfigChange('system', 'logLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"
                >
                  <option value="error">Error</option>
                  <option value="warn">Warning</option>
                  <option value="info">Info</option>
                  <option value="debug">Debug</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Analytics</Label>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Enable system analytics collection
                  </div>
                </div>
                <Switch
                  checked={config.system.analyticsEnabled}
                  onCheckedChange={(checked) => handleConfigChange('system', 'analyticsEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Response Compression</Label>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Enable gzip compression for responses
                  </div>
                </div>
                <Switch
                  checked={config.system.compressionEnabled}
                  onCheckedChange={(checked) => handleConfigChange('system', 'compressionEnabled', checked)}
                />
              </div>

              {/* Maintenance Mode */}
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    Maintenance Mode
                    <Badge variant={maintenanceMode ? "destructive" : "outline"}>
                      {maintenanceMode ? "Active" : "Inactive"}
                    </Badge>
                  </Label>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Restrict system access for maintenance
                  </div>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={onMaintenanceModeChange}
                />
              </div>

              {maintenanceMode && (
                <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    Maintenance mode is active. Regular users have limited access to the system.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleResetConfig}
            disabled={saving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          
          <Button
            onClick={handleSaveConfig}
            disabled={saving}
          >
            {saving ? (
              <>
                <Database className="w-4 h-4 mr-2 animate-pulse" />
                Saving Configuration...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}