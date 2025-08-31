import { useState, useEffect } from "react";
import { ArrowLeft, BookOpen, Search, User, Key, Settings, Zap, HelpCircle, Shield, Monitor, Globe, Smartphone, Chrome, FileText, Copy, ChevronDown, ChevronRight, Star, Clock, Code } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ThemeToggle from "@/components/theme-toggle";
import SettingsDropdown from "@/components/settings-dropdown";
import { useAuth } from "@/context/AuthContext";

export default function Documentation() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("getting-started");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "getting-started": true,
    "user-guide": false,
    "faq": false,
    "tutorials": false,
    "technical": false
  });
  const { user, loading } = useAuth();

  const handleBackToHome = () => {
    setLocation("/app");
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
                  <BookOpen className="text-white text-sm" />
                </div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">PromptCraft Documentation</h1>
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
        <div className="flex gap-8">
          {/* Sidebar Navigation - Desktop */}
          <div className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Navigation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Table of Contents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant={activeSection === "getting-started" ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => scrollToSection("getting-started")}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Getting Started
                  </Button>
                  <Button
                    variant={activeSection === "user-guide" ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => scrollToSection("user-guide")}
                  >
                    <User className="h-4 w-4 mr-2" />
                    User Guide
                  </Button>
                  <Button
                    variant={activeSection === "faq" ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => scrollToSection("faq")}
                  >
                    <HelpCircle className="h-4 w-4 mr-2" />
                    FAQ
                  </Button>
                  <Button
                    variant={activeSection === "tutorials" ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => scrollToSection("tutorials")}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Tutorials
                  </Button>
                  <Button
                    variant={activeSection === "technical" ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => scrollToSection("technical")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Technical Resources
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Documentation Content */}
          <div className="flex-1 min-w-0">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <BookOpen className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                PromptCraft Documentation
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
                Complete guide to using PromptCraft for transforming natural language into structured, powerful AI prompts optimized for Claude, GPT, Gemini, and other language models.
              </p>
            </div>

            {/* Mobile Search */}
            <div className="lg:hidden mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Getting Started Guide */}
            <section id="getting-started" className="mb-16">
              <div className="flex items-center mb-6">
                <Zap className="h-8 w-8 text-green-600 mr-3" />
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Getting Started Guide</h2>
              </div>
              
              <div className="grid gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      1. Account Setup
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Creating Your Account</h4>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li>• Click "Sign In" button in the top-right corner</li>
                        <li>• Select "Create Account" tab in the modal</li>
                        <li>• Enter your email, username, and secure password</li>
                        <li>• You'll receive a welcome email confirmation</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Demo Mode vs. Authenticated Mode</h4>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li>• <strong>Demo Mode:</strong> Template-based prompt generation without account</li>
                        <li>• <strong>Authenticated Mode:</strong> AI-powered generation, saved prompts, custom templates</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-purple-600" />
                      2. API Key Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Supported AI Providers</h4>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li>• <strong>OpenAI:</strong> GPT-4, GPT-3.5 models</li>
                        <li>• <strong>Anthropic:</strong> Claude 3.5 Sonnet, Claude 3 models</li>
                        <li>• <strong>Google:</strong> Gemini Pro, Gemini models</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Adding API Keys</h4>
                      <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li>1. Click your profile menu → "Settings"</li>
                        <li>2. Go to "API Keys" tab</li>
                        <li>3. Click "Add API Key" for your preferred provider</li>
                        <li>4. Enter your API key (encrypted with AES-256-GCM)</li>
                        <li>5. Click "Save" - the key will be validated automatically</li>
                      </ol>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Security:</strong> All API keys are encrypted before storage and never transmitted in plain text.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-orange-600" />
                      3. First Prompt Generation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Basic Workflow</h4>
                      <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li>1. Enter your task in natural language in the main input box</li>
                        <li>2. (Optional) Select a template from the left sidebar for common tasks</li>
                        <li>3. (Optional) Expand "Advanced Options" to customize generation</li>
                        <li>4. Click "Generate Prompt" to create your structured prompt</li>
                        <li>5. Copy the generated prompt and use it in your AI tool</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Example</h4>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
                        <p className="text-sm font-medium mb-2">Input:</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">"Help me write a professional email to a client about a project delay"</p>
                        <p className="text-sm font-medium mt-3 mb-2">Generated Output:</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Structured prompt with context, constraints, and formatting instructions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* User Guide */}
            <section id="user-guide" className="mb-16">
              <div className="flex items-center mb-6">
                <User className="h-8 w-8 text-blue-600 mr-3" />
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">User Guide</h2>
              </div>

              <div className="space-y-6">
                <Collapsible open={openSections["user-guide"]} onOpenChange={() => toggleSection("user-guide")}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750">
                    <h3 className="text-xl font-semibold">Complete Feature Guide</h3>
                    {openSections["user-guide"] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-6">
                    
                    {/* Templates */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-green-600" />
                          Template System
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Quick Start Templates</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                            Pre-built templates for common tasks located in the left sidebar (desktop) or collapsible section (mobile).
                          </p>
                          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            <li>• Writing & Communication</li>
                            <li>• Code & Development</li>
                            <li>• Analysis & Research</li>
                            <li>• Creative Tasks</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Creating Custom Templates</h4>
                          <ol className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            <li>1. Generate a prompt you want to save as template</li>
                            <li>2. Click "Save as Template" in the output section</li>
                            <li>3. Enter template name and description</li>
                            <li>4. Template appears in your template list</li>
                          </ol>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Managing Templates</h4>
                          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            <li>• <strong>Edit:</strong> Click pencil icon to modify template</li>
                            <li>• <strong>Delete:</strong> Click trash icon to remove template</li>
                            <li>• <strong>Use:</strong> Click template card to auto-populate input</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Prompt Generation */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="h-5 w-5 text-yellow-600" />
                          Prompt Generation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Natural Language Input</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                            Describe your task in plain English. The more specific you are, the better the generated prompt.
                          </p>
                          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                            <p className="text-sm font-medium text-green-800 dark:text-green-200">Good Examples:</p>
                            <ul className="text-sm text-green-700 dark:text-green-300 mt-1">
                              <li>• "Write a technical blog post about React hooks for intermediate developers"</li>
                              <li>• "Analyze customer feedback data and identify top 3 pain points"</li>
                              <li>• "Create a professional project proposal for a mobile app development"</li>
                            </ul>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Advanced Options</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                            Click "Advanced Options" to customize your prompt generation:
                          </p>
                          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            <li>• <strong>Target Model:</strong> Optimize for specific AI model (Claude, GPT, Gemini)</li>
                            <li>• <strong>Complexity Level:</strong> Simple, Intermediate, or Advanced prompts</li>
                            <li>• <strong>Include Examples:</strong> Add sample inputs/outputs to prompt</li>
                            <li>• <strong>XML Format:</strong> Structure prompt with XML tags for better parsing</li>
                            <li>• <strong>Additional Constraints:</strong> Add specific requirements or limitations</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Favorites and Recent */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-pink-600" />
                          Favorites & Recent Prompts
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Favorite Prompts</h4>
                          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            <li>• Click heart icon on any generated prompt to save as favorite</li>
                            <li>• Access favorites in the home page sidebar</li>
                            <li>• View all favorites at <code>/favorites</code></li>
                            <li>• Edit, copy, delete, or unfavorite from any location</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Recent Prompts</h4>
                          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            <li>• Last 6 prompts shown on home page</li>
                            <li>• View all recent prompts at <code>/recent</code></li>
                            <li>• Toggle favorite status directly from recent prompts</li>
                            <li>• Full CRUD operations available</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Account Management */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5 text-gray-600" />
                          Account Management
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Profile Settings</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                            Access via Settings → Profile:
                          </p>
                          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            <li>• View account information (email, username)</li>
                            <li>• Change password with current password verification</li>
                            <li>• Delete account (permanent action with confirmation)</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Password Recovery</h4>
                          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            <li>• Click "Forgot Password?" on login form</li>
                            <li>• Enter email address to receive reset link</li>
                            <li>• Reset links expire after 30 minutes</li>
                            <li>• Rate limited to 3 requests per 15 minutes per IP</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="mb-16">
              <div className="flex items-center mb-6">
                <HelpCircle className="h-8 w-8 text-purple-600 mr-3" />
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Frequently Asked Questions</h2>
              </div>

              <div className="space-y-4">
                {[
                  {
                    question: "Why am I seeing 'Demo Mode' notifications?",
                    answer: "Demo Mode appears when you're either not signed in or don't have API keys configured. In Demo Mode, you get high-quality template-based prompts but miss AI-powered generation and saved prompts. Sign up and add API keys to unlock full features."
                  },
                  {
                    question: "How secure are my API keys?",
                    answer: "API keys are encrypted using AES-256-GCM before database storage and are never transmitted in plain text. They're only decrypted when creating API clients for your requests. We follow enterprise security standards."
                  },
                  {
                    question: "Can I use PromptCraft without API keys?",
                    answer: "Yes! Demo Mode provides template-based prompt generation without API keys. However, you'll miss AI-powered generation, prompt saving, and custom templates. We recommend adding at least one API key for the full experience."
                  },
                  {
                    question: "Which AI models are supported?",
                    answer: "PromptCraft supports OpenAI (GPT-4, GPT-3.5), Anthropic (Claude 3.5 Sonnet, Claude 3), and Google (Gemini Pro). You can optimize prompts for specific models using Advanced Options."
                  },
                  {
                    question: "My prompts aren't generating. What's wrong?",
                    answer: "Common issues: 1) Check if your API keys are valid and have credits, 2) Verify network connection, 3) Try regenerating after a moment, 4) Check if the AI provider is experiencing outages. Contact support if issues persist."
                  },
                  {
                    question: "Can I edit or delete my saved prompts?",
                    answer: "Yes! Both recent and favorite prompts support full CRUD operations. Click the edit (pencil) icon to modify content, or the trash icon to delete. Changes sync across all views."
                  },
                  {
                    question: "How do I create custom templates?",
                    answer: "After generating a prompt you like, look for 'Save as Template' option in the output section. Enter a name and description, and it becomes available in your template list. You can edit or delete custom templates anytime."
                  },
                  {
                    question: "Is there a limit to how many prompts I can save?",
                    answer: "No! You can save unlimited favorite prompts and templates. Recent prompts show the last 20 for performance, but all your data is preserved."
                  }
                ].map((faq, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">{faq.question}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-600 dark:text-slate-400">{faq.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Tutorials Section */}
            <section id="tutorials" className="mb-16">
              <div className="flex items-center mb-6">
                <FileText className="h-8 w-8 text-green-600 mr-3" />
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Tutorials & Examples</h2>
              </div>

              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5 text-blue-600" />
                      Writing Effective Prompts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Best Practices</h4>
                      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <li>• Be specific about your desired outcome</li>
                        <li>• Include context about your audience or use case</li>
                        <li>• Mention any constraints (length, tone, format)</li>
                        <li>• Specify examples if you have a particular style in mind</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Example Transformation</h4>
                      <div className="space-y-3">
                        <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">Vague Input:</p>
                          <p className="text-sm text-red-700 dark:text-red-300">"Help me write something about AI"</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">Specific Input:</p>
                          <p className="text-sm text-green-700 dark:text-green-300">"Write a 500-word blog post explaining how AI language models work, targeted at business executives with no technical background, using simple analogies and real-world examples"</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-600" />
                      Using Templates Effectively
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Template Selection Strategy</h4>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li>• <strong>Writing & Communication:</strong> Emails, reports, documentation</li>
                        <li>• <strong>Code & Development:</strong> Code review, debugging, architecture planning</li>
                        <li>• <strong>Analysis & Research:</strong> Data analysis, competitive research, summarization</li>
                        <li>• <strong>Creative Tasks:</strong> Content creation, brainstorming, storytelling</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Customizing Templates</h4>
                      <ol className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <li>1. Select a template that's close to your needs</li>
                        <li>2. Modify the auto-filled input to match your specific case</li>
                        <li>3. Use Advanced Options to fine-tune the output</li>
                        <li>4. Save successful modifications as new custom templates</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-gray-600" />
                      Multi-Model Optimization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Choosing the Right Model</h4>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li>• <strong>Claude (Anthropic):</strong> Excellent for long-form content, analysis, and nuanced responses</li>
                        <li>• <strong>GPT (OpenAI):</strong> Great for creative tasks, code generation, and general assistance</li>
                        <li>• <strong>Gemini (Google):</strong> Strong for research, data analysis, and factual content</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Advanced Options Usage</h4>
                      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <li>• Select "Target Model" to optimize prompt structure</li>
                        <li>• Increase "Complexity Level" for sophisticated tasks</li>
                        <li>• Enable "Include Examples" for tasks requiring specific formats</li>
                        <li>• Use "XML Format" for structured, parseable outputs</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Technical Resources */}
            <section id="technical" className="mb-16">
              <div className="flex items-center mb-6">
                <Settings className="h-8 w-8 text-gray-600 mr-3" />
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Technical Resources</h2>
              </div>

              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="h-5 w-5 text-blue-600" />
                      System Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Minimum Requirements</h4>
                      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <li>• Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)</li>
                        <li>• JavaScript enabled</li>
                        <li>• Internet connection for AI API calls</li>
                        <li>• Minimum 1GB RAM available to browser</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Recommended Setup</h4>
                      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <li>• Latest version of Chrome, Firefox, or Safari</li>
                        <li>• Desktop or laptop for optimal sidebar experience</li>
                        <li>• Stable broadband connection (10+ Mbps)</li>
                        <li>• 4GB+ RAM for smooth performance</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-green-600" />
                      Browser Compatibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <Chrome className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="font-medium">Chrome</p>
                        <p className="text-sm text-slate-500">90+</p>
                        <Badge className="mt-1 bg-green-100 text-green-800">Recommended</Badge>
                      </div>
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <Globe className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                        <p className="font-medium">Firefox</p>
                        <p className="text-sm text-slate-500">88+</p>
                        <Badge className="mt-1 bg-green-100 text-green-800">Supported</Badge>
                      </div>
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <Globe className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                        <p className="font-medium">Safari</p>
                        <p className="text-sm text-slate-500">14+</p>
                        <Badge className="mt-1 bg-green-100 text-green-800">Supported</Badge>
                      </div>
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <Globe className="h-8 w-8 text-blue-700 mx-auto mb-2" />
                        <p className="font-medium">Edge</p>
                        <p className="text-sm text-slate-500">90+</p>
                        <Badge className="mt-1 bg-green-100 text-green-800">Supported</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-purple-600" />
                      API Integration Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">API Key Requirements</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className="font-medium">OpenAI</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Format: sk-... (starts with 'sk-')</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Get at: platform.openai.com/api-keys</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className="font-medium">Anthropic</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Format: sk-ant-... (starts with 'sk-ant-')</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Get at: console.anthropic.com</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className="font-medium">Google Gemini</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Format: AIza... (starts with 'AIza')</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Get at: aistudio.google.com/app/apikey</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Rate Limits & Usage</h4>
                      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <li>• Rate limits depend on your API provider plan</li>
                        <li>• PromptCraft adds minimal processing overhead</li>
                        <li>• Failed requests automatically retry once</li>
                        <li>• Monitor usage in your provider's dashboard</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-red-600" />
                      Security & Privacy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Data Protection</h4>
                      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <li>• API keys encrypted with AES-256-GCM</li>
                        <li>• Session-based authentication with secure HTTP-only cookies</li>
                        <li>• User data completely isolated between accounts</li>
                        <li>• No API keys stored in browser localStorage or sessionStorage</li>
                        <li>• All data transmission over HTTPS</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Privacy Policy</h4>
                      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <li>• We don't read or store your prompt content beyond what's necessary</li>
                        <li>• API calls go directly to your chosen provider</li>
                        <li>• Account data limited to email, username, and encrypted API keys</li>
                        <li>• Optional email notifications for account security</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Security Features</h4>
                      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <li>• Rate limiting on password reset attempts</li>
                        <li>• Comprehensive input sanitization</li>
                        <li>• Regular security audits and monitoring</li>
                        <li>• Automated cleanup of expired tokens</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-pink-600" />
                      Mobile & Responsive Design
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Mobile Experience</h4>
                      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <li>• Fully responsive design works on all screen sizes</li>
                        <li>• Desktop: Sidebar navigation with templates</li>
                        <li>• Mobile/Tablet: Collapsible template dropdown</li>
                        <li>• Touch-optimized interface for mobile devices</li>
                        <li>• Templates auto-collapse after selection on mobile</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Performance Optimization</h4>
                      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <li>• Efficient React Query caching for API responses</li>
                        <li>• Lazy loading for non-critical components</li>
                        <li>• Optimized bundle size with code splitting</li>
                        <li>• Fast client-side routing with Wouter</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Quick Access Card */}
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="text-center">
                  <HelpCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Still Need Help?
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 mb-4">
                    Contact our support team for personalized assistance with any questions or issues.
                  </p>
                  <div className="flex justify-center">
                    <Button 
                      onClick={() => setLocation("/app/support")}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Contact Support
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}