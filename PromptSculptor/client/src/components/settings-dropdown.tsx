import { Settings, User, Key, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { UserProfile, ApiKeyManager } from "./settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SettingsDropdown() {
  const { logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);

  // Listen for custom event to open API key settings
  useEffect(() => {
    const handleOpenApiKeySettings = () => {
      setShowApiKeys(true);
    };

    window.addEventListener('openApiKeySettings', handleOpenApiKeySettings);
    return () => {
      window.removeEventListener('openApiKeySettings', handleOpenApiKeySettings);
    };
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            data-testid="button-settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowProfile(true)} 
            className="cursor-pointer"
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowApiKeys(true)} 
            className="cursor-pointer"
          >
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={logout} 
            className="cursor-pointer text-red-600 dark:text-red-400"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Modal */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Profile Settings</DialogTitle>
          </DialogHeader>
          <UserProfile />
        </DialogContent>
      </Dialog>

      {/* API Keys Modal */}
      <Dialog open={showApiKeys} onOpenChange={setShowApiKeys}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>API Key Management</DialogTitle>
          </DialogHeader>
          <ApiKeyManager />
        </DialogContent>
      </Dialog>
    </>
  );
}