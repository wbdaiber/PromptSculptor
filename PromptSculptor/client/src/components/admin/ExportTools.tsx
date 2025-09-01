import { useState } from 'react';
import { Download, FileText, Database, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import type { AdvancedAnalyticsData } from '@/pages/admin/DatabaseAnalytics';

interface ExportToolsProps {
  data: AdvancedAnalyticsData | null;
  onExport: (format: 'csv' | 'json') => void;
  disabled?: boolean;
}

export default function ExportTools({ data, onExport, disabled }: ExportToolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'json' | null>(null);
  const { toast } = useToast();

  const handleExport = async (format: 'csv' | 'json') => {
    if (!data) return;
    
    setExportingFormat(format);
    setIsOpen(false);
    
    try {
      const exportData = prepareExportData(data);
      
      if (format === 'csv') {
        await downloadCSV(exportData);
      } else {
        await downloadJSON(exportData);
      }
      
      toast({
        title: `${format.toUpperCase()} Export Complete`,
        description: `Analytics data has been exported successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export analytics data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExportingFormat(null);
    }
    
    onExport(format);
  };

  const prepareExportData = (data: AdvancedAnalyticsData) => {
    return {
      exportDate: new Date().toISOString(),
      summary: {
        totalUsers: data.userEngagement.totalUsers,
        activeUsers: data.userEngagement.activeUsers,
        promptsGenerated: data.userEngagement.promptsGenerated,
        apiKeysConfigured: data.userEngagement.apiKeysConfigured,
        retentionRate: data.userRetention.retentionRate,
        growthRate: data.userGrowth.growthRate,
      },
      userGrowth: data.userGrowth.signups,
      templateUsage: data.customMetrics.templateUsage,
      apiKeyAdoption: data.customMetrics.apiKeyAdoption,
      promptsPerDay: data.customMetrics.promptsPerDay,
      engagementTrends: data.customMetrics.userEngagementTrends,
      recentActivity: {
        recentSignups: data.userActivity.recentSignups,
        recentPrompts: data.userActivity.recentPrompts,
        topTemplateTypes: data.userActivity.topTemplateTypes,
      },
    };
  };

  const downloadCSV = async (data: any) => {
    // Create CSV content for different data sets
    const csvSections = [];
    
    // Summary section
    csvSections.push('SUMMARY');
    csvSections.push('Metric,Value');
    csvSections.push(`Total Users,${data.summary.totalUsers}`);
    csvSections.push(`Active Users,${data.summary.activeUsers}`);
    csvSections.push(`Prompts Generated,${data.summary.promptsGenerated}`);
    csvSections.push(`API Keys Configured,${data.summary.apiKeysConfigured}`);
    csvSections.push(`Retention Rate,${data.summary.retentionRate}%`);
    csvSections.push(`Growth Rate,${data.summary.growthRate}%`);
    csvSections.push('');
    
    // User Growth section
    csvSections.push('USER GROWTH');
    csvSections.push('Date,Signups');
    data.userGrowth.forEach((item: any) => {
      csvSections.push(`${item.date},${item.count}`);
    });
    csvSections.push('');
    
    // Template Usage section
    csvSections.push('TEMPLATE USAGE');
    csvSections.push('Template,Count,Percentage');
    data.templateUsage.forEach((item: any) => {
      csvSections.push(`${item.template},${item.count},${item.percentage}%`);
    });
    csvSections.push('');
    
    // API Key Adoption section
    csvSections.push('API KEY ADOPTION');
    csvSections.push('Service,Users,Percentage');
    data.apiKeyAdoption.forEach((item: any) => {
      csvSections.push(`${item.service},${item.users},${item.percentage}%`);
    });
    
    const csvContent = csvSections.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `promptsculptor-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadJSON = async (data: any) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `promptsculptor-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getDataSize = () => {
    if (!data) return 'No data';
    
    const totalRecords = 
      (data.userGrowth.signups?.length || 0) +
      (data.customMetrics.templateUsage?.length || 0) +
      (data.customMetrics.promptsPerDay?.length || 0) +
      (data.userActivity.recentSignups?.length || 0) +
      (data.userActivity.recentPrompts?.length || 0);
    
    return `${totalRecords} records`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !!exportingFormat}
        >
          {exportingFormat ? (
            <>
              <Database className="w-4 h-4 mr-2 animate-pulse" />
              Exporting {exportingFormat.toUpperCase()}...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-slate-100">
              Export Analytics Data
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Download your analytics data in different formats
            </p>
          </div>
          
          {/* Data Preview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Data Size:</span>
              <Badge variant="secondary">{getDataSize()}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-600 dark:text-slate-400">Export Date:</span>
              <span className="font-mono text-xs">
                {new Date().toISOString().split('T')[0]}
              </span>
            </div>
          </div>
          
          {/* Export Options */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleExport('csv')}
              disabled={disabled}
            >
              <FileText className="w-4 h-4 mr-3" />
              <div className="text-left">
                <div className="font-medium">CSV Format</div>
                <div className="text-xs text-slate-500">
                  Spreadsheet compatible, structured data
                </div>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleExport('json')}
              disabled={disabled}
            >
              <Database className="w-4 h-4 mr-3" />
              <div className="text-left">
                <div className="font-medium">JSON Format</div>
                <div className="text-xs text-slate-500">
                  Complete data structure, API compatible
                </div>
              </div>
            </Button>
          </div>
          
          {/* Export Features */}
          <div className="space-y-2 pt-2 border-t">
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Included in Export:
            </div>
            <div className="space-y-1">
              {[
                'User growth and signup trends',
                'Template usage statistics',
                'API key adoption rates',
                'Daily activity metrics',
                'Engagement analytics',
                'Recent user activity'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-xs text-slate-500 text-center">
            Exports include data from your selected date range
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}