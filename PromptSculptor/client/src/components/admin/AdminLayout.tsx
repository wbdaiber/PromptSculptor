import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Shield,
  Home,
  Users,
  AlertTriangle,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Clock,
  Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/context/AdminAuthContext';
import ThemeToggle from '@/components/theme-toggle';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/app/admin',
  },
  {
    id: 'users',
    label: 'User Analytics',
    icon: Users,
    path: '/app/admin/users',
    badge: 'New',
    disabled: false,
  },
  {
    id: 'security',
    label: 'Security',
    icon: AlertTriangle,
    path: '/app/admin/security',
    badge: 'New',
    disabled: false,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    path: '/app/admin/analytics',
    badge: 'New',
    disabled: false,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/app/admin/settings',
    badge: 'New',
    disabled: false,
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin, logout, isSessionValid } = useAdminAuth();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged Out',
      description: 'You have been logged out of the admin dashboard.',
    });
    setLocation('/app/admin/login');
  };

  const handleNavClick = (path: string, disabled?: boolean) => {
    if (disabled) {
      toast({
        title: 'Feature Not Available',
        description: 'This feature will be available in a future phase.',
        variant: 'default',
      });
      return;
    }
    
    setLocation(path);
    setSidebarOpen(false); // Close mobile sidebar
  };

  const getTimeRemaining = () => {
    if (!admin) return '';
    
    const sessionTimeout = 2 * 60 * 60 * 1000; // 2 hours
    const elapsed = Date.now() - admin.loginTime;
    const remaining = sessionTimeout - elapsed;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Admin Dashboard
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              PromptSculptor
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path, item.disabled)}
              disabled={item.disabled}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                  : item.disabled
                  ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <Badge 
                  variant="secondary" 
                  className="ml-auto text-xs bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                >
                  {item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      <Separator />

      {/* Admin Info & Logout */}
      <div className="p-4 space-y-4">
        {/* Session Info */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <Key className="w-3 h-3" />
            <span>API Key Active</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3 h-3" />
            <span>Session: {getTimeRemaining()}</span>
            {!isSessionValid() && (
              <Badge variant="destructive" className="text-xs">
                Expired
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Theme</span>
            <ThemeToggle />
          </div>
        </div>

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-slate-700 hover:bg-red-50 hover:text-red-700 dark:text-slate-300 dark:hover:bg-red-900/20 dark:hover:text-red-300"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 dark:bg-black/40" 
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="relative w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Admin
              </span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-700 hover:text-red-700 dark:text-slate-300 dark:hover:text-red-300"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}