import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlayCircle, UserPlus, Key, BookOpen, Zap, Settings, Copy, ArrowRight, Shield, Check } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-4">
            Welcome to PromptSculptor! 🎨
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Section */}
          <div className="text-center space-y-3">
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Transform your natural language into structured, powerful LLM prompts
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Get better AI results with professionally crafted prompts optimized for Claude, GPT, and Gemini
            </p>
          </div>

          {/* How It Works */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-blue-600" />
              How It Works
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h4 className="font-medium mb-1">Describe Your Task</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Write what you want in plain English
                </p>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <h4 className="font-medium mb-1">AI Processing</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Our AI structures your request
                </p>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <h4 className="font-medium mb-1">Perfect Prompt</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Get an optimized, ready-to-use prompt
                </p>
              </div>
            </div>
          </div>

          {/* Getting Started */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              Getting Started
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Try It Now</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Enter your task in the "Natural Language Input" box and click "Generate Prompt"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Use Templates</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Browse the Quick Start Templates in the left sidebar for common tasks
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Copy className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Copy & Use</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Copy your generated prompt and paste it into Claude, ChatGPT, or any AI tool
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Account & API Keys */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              Unlock Full Features
            </h3>
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <UserPlus className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">Create a Free Account</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Save your prompts, create custom templates, and access your prompt history
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Key className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">Add Your API Keys</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Connect your OpenAI, Anthropic, or Google API keys for AI-powered prompt generation
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Features Overview */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              Features
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                <h4 className="font-medium mb-1">Advanced Options</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Customize target model, complexity level, examples, and more
                </p>
              </div>
              <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                <h4 className="font-medium mb-1">Custom Templates</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Save your own templates for frequently used prompt patterns
                </p>
              </div>
              <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                <h4 className="font-medium mb-1">Recent Prompts</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Access your previously generated prompts anytime
                </p>
              </div>
              <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                <h4 className="font-medium mb-1">Multi-Model Support</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Optimized for Claude, GPT, Gemini, and other AI models
                </p>
              </div>
            </div>
          </div>

          {/* Security Features */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              Security Features
            </h3>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">API keys encrypted with AES-256-GCM</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">Session-based authentication</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">Secure HTTP-only cookies</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">User data isolation</p>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-lg font-medium mb-3">Ready to get started?</p>
            <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 px-6">
              Let's Create Amazing Prompts!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};