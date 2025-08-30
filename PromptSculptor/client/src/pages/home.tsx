import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle, Settings, User, LogIn, AlertCircle, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import InputSection from "@/components/input-section";
import OutputSection from "@/components/output-section";
import RecentPrompts from "@/components/recent-prompts";
import ThemeToggle from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth";
import { HelpModal } from "@/components/help-modal";
import { useAuth } from "@/context/AuthContext";
import SettingsDropdown from "@/components/settings-dropdown";
import EditTemplateDialog from "@/components/edit-template-dialog";
import DeleteTemplateDialog from "@/components/delete-template-dialog";
import TemplateDropdown from "@/components/template-dropdown";
import { getTemplates } from "@/lib/api";
import type { Template } from "../../../shared/schema";

export default function Home() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalDefaultView, setAuthModalDefaultView] = useState<'login' | 'signup'>('login');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);

  const { user, loading, apiKeys } = useAuth();

  // Close auth modal when user successfully logs in
  useEffect(() => {
    if (user && showAuthModal) {
      setShowAuthModal(false);
    }
  }, [user, showAuthModal]);

  // Listen for custom events from demo mode indicators
  useEffect(() => {
    const handleOpenAuthModal = () => {
      setAuthModalDefaultView('signup');
      setShowAuthModal(true);
    };

    const handleOpenApiKeySettings = () => {
      // Dispatch event to settings dropdown to open API key management
      const settingsEvent = new CustomEvent('openSettings', { detail: { tab: 'apiKeys' } });
      window.dispatchEvent(settingsEvent);
    };

    window.addEventListener('openAuthModal', handleOpenAuthModal);
    window.addEventListener('openApiKeySettings', handleOpenApiKeySettings);

    return () => {
      window.removeEventListener('openAuthModal', handleOpenAuthModal);
      window.removeEventListener('openApiKeySettings', handleOpenApiKeySettings);
    };
  }, []);

  const { data: templates = [], isLoading: templatesLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates", user?.id || 'anonymous'], // Include auth state in query key
    queryFn: () => getTemplates(),
    staleTime: 0, // Always consider data stale for user-sensitive data
    gcTime: 0, // Don't keep data in cache after component unmounts
  });

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
  };

  const handlePromptGenerated = (result: any) => {
    setGeneratedResult(result);
    setIsGenerating(false);
  };

  const handleTemplateEdit = (template: Template) => {
    setEditingTemplate(template);
  };

  const handleTemplateDelete = (template: Template) => {
    setDeletingTemplate(template);
  };

  // Demo Mode Indicator Component
  const DemoModeIndicator = () => {
    // Show demo mode indicator if:
    // 1. User is not signed in, OR
    // 2. User is signed in but has no API keys
    const shouldShowDemo = 
      !user || 
      (user && apiKeys.length === 0);

    if (!shouldShowDemo) {
      return null;
    }

    // Use conditional messaging based on user state
    let demoMessage: string;
    let buttonText: string;

    if (!user) {
      // Not signed in
      demoMessage = "This is a demo prompt. Sign up to create and save your prompts and unlock AI-powered generation!";
      buttonText = "Create Free Account";
    } else {
      // Signed in but no API keys
      demoMessage = "You're using template-based demo mode. Add your API keys to unlock AI-powered generation with your preferred models.";
      buttonText = "Add API Keys";
    }

    return (
      <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-orange-700 border-orange-300">
              Demo Mode
            </Badge>
          </div>
          <p className="text-sm text-orange-700 dark:text-orange-400">
            {demoMessage}
          </p>
          <div className="pt-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="text-orange-700 border-orange-300 hover:bg-orange-100 dark:text-orange-300 dark:border-orange-700 dark:hover:bg-orange-950/40 whitespace-normal text-left h-auto min-h-[36px] flex-shrink-0 max-w-full"
              onClick={() => {
                if (!user) {
                  // Dispatch event to open signup/signin modal for unauthenticated users
                  const event = new CustomEvent('openAuthModal');
                  window.dispatchEvent(event);
                } else {
                  // Dispatch event to open API key settings modal for authenticated users
                  const event = new CustomEvent('openApiKeySettings');
                  window.dispatchEvent(event);
                }
              }}
            >
              <Key className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="break-words">{buttonText}</span>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-inter text-slate-800 dark:text-slate-200 min-h-screen transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <i className="fas fa-magic text-white text-sm"></i>
                </div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">PromptCraft</h1>
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                Transform natural language to structured LLM prompts
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="default" 
                onClick={() => setShowHelpModal(true)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-4 py-2"
              >
                <HelpCircle className="h-5 w-5 mr-2" />
                Start Here
              </Button>
              
              {/* Authentication UI */}
              {loading ? (
                <div className="w-20 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              ) : user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">
                    {user.email}
                  </span>
                  <SettingsDropdown />
                </div>
              ) : (
                <Button 
                  onClick={() => setShowAuthModal(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              )}
              
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar - Templates */}
          <div className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
              <TemplateDropdown
                templates={templates}
                selectedTemplate={selectedTemplate}
                onSelect={handleTemplateSelect}
                onEdit={handleTemplateEdit}
                onDelete={handleTemplateDelete}
                isLoading={templatesLoading}
              />
              {/* Demo Mode Indicator */}
              <DemoModeIndicator />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Mobile Template Dropdown - Only visible on mobile/tablet */}
            <div className="lg:hidden mb-8 space-y-4">
              <TemplateDropdown
                templates={templates}
                selectedTemplate={selectedTemplate}
                onSelect={handleTemplateSelect}
                onEdit={handleTemplateEdit}
                onDelete={handleTemplateDelete}
                isLoading={templatesLoading}
              />
              {/* Demo Mode Indicator */}
              <DemoModeIndicator />
            </div>

            {/* Main Interface */}
            <div className="space-y-8 mb-8">
              <InputSection
                selectedTemplate={selectedTemplate}
                onPromptGenerated={handlePromptGenerated}
                isGenerating={isGenerating}
                setIsGenerating={setIsGenerating}
              />
              <OutputSection
                generatedResult={generatedResult}
                isGenerating={isGenerating}
              />
            </div>

            {/* Recent Prompts - Only show for authenticated users */}
            {user && <RecentPrompts />}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-500">© 2024 PromptCraft. All rights reserved.</span>
            </div>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Documentation</a>
              <a href="#" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">API</a>
              <a href="#" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Support</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Help Modal */}
      <HelpModal 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)}
      />

      {/* Authentication Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        defaultView={authModalDefaultView}
      />

      {/* Template Management Dialogs */}
      <EditTemplateDialog
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        template={editingTemplate}
      />
      <DeleteTemplateDialog
        open={!!deletingTemplate}
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
        template={deletingTemplate}
      />
    </div>
  );
}
