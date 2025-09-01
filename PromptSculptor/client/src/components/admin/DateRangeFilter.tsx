import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/pages/admin/DatabaseAnalytics';

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

interface PresetRange {
  label: string;
  days: number;
  badge?: string;
}

const PRESET_RANGES: PresetRange[] = [
  { label: 'Last 7 days', days: 7, badge: 'Popular' },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30, badge: 'Default' },
  { label: 'Last 60 days', days: 60 },
  { label: 'Last 90 days', days: 90 },
];

export default function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetSelect = (days: number) => {
    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    onDateRangeChange({ from, to });
    setIsOpen(false);
  };

  const handleCustomDateSelect = (selected: any) => {
    if (selected?.from && selected?.to) {
      onDateRangeChange({
        from: selected.from,
        to: selected.to,
      });
    }
  };

  const formatDateRange = () => {
    const now = Date.now();
    const diffTime = now - dateRange.from.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Check if it matches a preset
    const preset = PRESET_RANGES.find(p => p.days === diffDays);
    if (preset) {
      return preset.label;
    }
    
    // Custom range
    const fromStr = dateRange.from.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: dateRange.from.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
    const toStr = dateRange.to.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: dateRange.to.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
    
    return `${fromStr} - ${toStr}`;
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-slate-500" />
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
        Date Range:
      </span>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="justify-between min-w-[200px]"
          >
            <span>{formatDateRange()}</span>
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4 space-y-4">
            {/* Preset Ranges */}
            <div>
              <h4 className="text-sm font-medium mb-2">Quick Select</h4>
              <div className="space-y-1">
                {PRESET_RANGES.map((preset) => (
                  <Button
                    key={preset.days}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => handlePresetSelect(preset.days)}
                  >
                    <span>{preset.label}</span>
                    {preset.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {preset.badge}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Custom Range</h4>
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{
                  from: dateRange.from,
                  to: dateRange.to,
                }}
                onSelect={handleCustomDateSelect}
                numberOfMonths={2}
                disabled={(date) => date > new Date()}
              />
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Currently showing:</span>
                <span className="font-medium">
                  {Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}