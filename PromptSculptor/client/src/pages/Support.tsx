import { ArrowLeft, HelpCircle, Mail, MessageSquare, Bug, Lightbulb, Shield, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/theme-toggle";
import SettingsDropdown from "@/components/settings-dropdown";
import { useAuth } from "@/context/AuthContext";

export default function Support() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();

  const handleBackToHome = () => {
    setLocation("/app");
  };

  const supportSections = [
    {
      icon: HelpCircle,
      title: "Getting Started",
      description: "Quick setup guide and basic usage",
      items: [
        "Creating your account and signing in",
        "Adding API keys for AI generation", 
        "Using templates and demo mode",
        "Basic prompt generation workflow"
      ]
    },
    {
      icon: Bug,
      title: "Common Issues",
      description: "Troubleshooting frequently encountered problems",
      items: [
        "Authentication and login problems",
        "API key configuration and validation",
        "Template loading and generation failures",
        "Browser compatibility and performance"
      ]
    },
    {
      icon: MessageSquare,
      title: "Feature Support",
      description: "Using PromptCraft's advanced features",
      items: [
        "Template creation and management",
        "Recent and favorite prompts",
        "API integration (OpenAI, Anthropic, Gemini)",
        "Advanced options and XML generation"
      ]
    },
    {
      icon: Shield,
      title: "Technical Support", 
      description: "System requirements and technical guidance",
      items: [
        "Browser requirements and compatibility",
        "API connectivity and network issues",
        "Data security and privacy information",
        "Account management and recovery"
      ]
    }
  ];

  const contactOptions = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email",
      contact: "support@promptcraft.ai",
      responseTime: "24-48 hours"
    },
    {
      icon: Bug,
      title: "Bug Reports",
      description: "Report issues and bugs",
      contact: "Include browser, device, and steps to reproduce",
      responseTime: "Priority handling"
    },
    {
      icon: Lightbulb,
      title: "Feature Requests",
      description: "Suggest new features",
      contact: "Detailed use case and expected behavior",
      responseTime: "Reviewed weekly"
    },
    {
      icon: Shield,
      title: "Security Issues",
      description: "Report security concerns",
      contact: "security@promptcraft.ai",
      responseTime: "Immediate"
    }
  ];

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 font-inter text-slate-800 dark:text-slate-200 min-h-screen transition-colors duration-200">
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-inter text-slate-800 dark:text-slate-200 min-h-screen transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={handleBackToHome}
                className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Home
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <i className="fas fa-magic text-white text-sm"></i>
                </div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">PromptCraft</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">
                    {user.email}
                  </span>
                  <SettingsDropdown />
                </div>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <HelpCircle className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            PromptCraft Support
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Get help with our AI-powered prompt transformation tool. Find answers, troubleshoot issues, and contact our support team.
          </p>
        </div>

        {/* Quick Help Alert */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-3">
            <HelpCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Need Quick Help?
              </h3>
              <p className="text-blue-700 dark:text-blue-300 mb-3">
                For immediate assistance with getting started, click the <strong>"Start Here"</strong> button in the top navigation for interactive help and onboarding guidance.
              </p>
              <Button 
                onClick={handleBackToHome}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Go to Start Here Guide
              </Button>
            </div>
          </div>
        </div>

        {/* Support Sections */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {supportSections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <Card key={index} className="h-full">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <IconComponent className="h-6 w-6 text-blue-600" />
                    <CardTitle className="text-slate-900 dark:text-slate-100">
                      {section.title}
                    </CardTitle>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {section.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Contact Information */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 text-center">
            Contact Support
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactOptions.map((option, index) => {
              const IconComponent = option.icon;
              return (
                <Card key={index} className="text-center">
                  <CardContent className="pt-6">
                    <IconComponent className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      {option.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {option.description}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">
                      {option.contact}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {option.responseTime}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Emergency Support */}
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
          <div className="text-center">
            <Shield className="h-8 w-8 text-orange-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
              Emergency Support
            </h3>
            <p className="text-orange-700 dark:text-orange-300 mb-4">
              For critical issues affecting your workflow, service outages, data loss, or security concerns, contact us immediately.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-300">
                Service Outages: support@promptcraft.ai
              </Badge>
              <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-300">
                Security Issues: security@promptcraft.ai
              </Badge>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}