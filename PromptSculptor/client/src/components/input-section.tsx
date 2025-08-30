import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, ArrowRight, BookmarkPlus, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { generatePrompt } from "@/lib/api";
import CreateTemplateDialog from "@/components/create-template-dialog";
import type { Template, GeneratePromptRequest } from "@shared/schema";

interface GeneratedPromptResult {
  generatedPrompt: string;
  wordCount: number;
  title: string;
  promptId?: string | null;
  isDemoMode?: boolean;
  demoMessage?: string;
  callToAction?: string;
  demoInfo?: {
    isDemoMode: boolean;
    message: string;
    callToAction: string;
  };
}

interface InputSectionProps {
  selectedTemplate: Template | null;
  onPromptGenerated: (result: GeneratedPromptResult) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
}

export default function InputSection({ 
  selectedTemplate, 
  onPromptGenerated, 
  isGenerating, 
  setIsGenerating 
}: InputSectionProps) {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [targetModel, setTargetModel] = useState<string>("claude");
  const [complexityLevel, setComplexityLevel] = useState<string>("detailed");
  const [includeExamples, setIncludeExamples] = useState(true);
  const [useXMLTags, setUseXMLTags] = useState(true);
  const [includeConstraints, setIncludeConstraints] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [lastGeneratedResult, setLastGeneratedResult] = useState<GeneratedPromptResult | null>(null);
  const [showCreateTemplateDialog, setShowCreateTemplateDialog] = useState(false);
  const [inputSource, setInputSource] = useState<'user' | 'template'>('user'); // Track input source
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [wasUnauthenticated, setWasUnauthenticated] = useState(!user); // Track previous auth state

  // Enhanced cleanup effect for authentication transitions
  useEffect(() => {
    if (user && wasUnauthenticated) {
      // User just authenticated - clear all demo mode content
      setNaturalLanguageInput("");
      setLastGeneratedResult(null);
      setInputSource('user');
      setWasUnauthenticated(false);
    } else if (!user && !wasUnauthenticated) {
      // User just logged out - clear everything and mark as unauthenticated
      setNaturalLanguageInput("");
      setLastGeneratedResult(null);
      setInputSource('user');
      setWasUnauthenticated(true);
    }
  }, [user, wasUnauthenticated]);

  // Load template sample input when template is selected
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.sampleInput) {
      setNaturalLanguageInput(selectedTemplate.sampleInput);
      setInputSource('template'); // Mark as template-loaded input
    }
  }, [selectedTemplate]);

  const generateMutation = useMutation({
    mutationFn: generatePrompt,
    onSuccess: (result: GeneratedPromptResult) => {
      setLastGeneratedResult(result);
      onPromptGenerated(result);
      
      // Show different toast messages based on demo mode vs regular mode
      if (result.isDemoMode || result.demoInfo?.isDemoMode) {
        toast({
          title: "Demo Prompt Generated",
          description: "This is a demo prompt. Add your API keys for AI-powered generation.",
        });
      } else {
        toast({
          title: "Prompt Generated",
          description: "Your AI-powered structured prompt has been generated successfully.",
        });
        // Only invalidate recent prompts for non-demo results (saved prompts)
        queryClient.invalidateQueries({ queryKey: ["/api/prompts/recent"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate prompt. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  const handleGenerate = () => {
    if (!naturalLanguageInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter your natural language instructions.",
        variant: "destructive",
      });
      return;
    }

    if (naturalLanguageInput.length < 10) {
      toast({
        title: "Input Too Short",
        description: "Please provide more detailed instructions (at least 10 characters).",
        variant: "destructive",
      });
      return;
    }

    if (naturalLanguageInput.length > 5000) {
      toast({
        title: "Input Too Long",
        description: "Please keep your input under 5000 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    const request: GeneratePromptRequest = {
      naturalLanguageInput,
      templateType: (selectedTemplate?.type || 'custom') as any,
      targetModel: targetModel as any,
      complexityLevel: complexityLevel as any,
      includeExamples,
      useXMLTags,
      includeConstraints,
    };

    generateMutation.mutate(request);
  };

  const handleClear = () => {
    setNaturalLanguageInput("");
    setInputSource('user');
  };

  const handleSaveAsTemplate = () => {
    if (!naturalLanguageInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter your natural language instructions before saving as template.",
        variant: "destructive",
      });
      return;
    }

    if (naturalLanguageInput.length < 10) {
      toast({
        title: "Input Too Short",
        description: "Please provide more detailed instructions (at least 10 characters) to save as template.",
        variant: "destructive",
      });
      return;
    }

    // Check if user is authenticated
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save templates.",
        variant: "destructive",
      });
      return;
    }

    setShowCreateTemplateDialog(true);
  };

  const characterCount = naturalLanguageInput.length;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Natural Language Input</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-500">{characterCount}</span>
              <span className="text-sm text-slate-400">/</span>
              <span className="text-sm text-slate-400">5000</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Describe your task or requirements in plain language</p>
        </CardHeader>
        <CardContent className="p-6">
          <Textarea
            value={naturalLanguageInput}
            onChange={(e) => {
              setNaturalLanguageInput(e.target.value);
              setInputSource('user'); // Mark as user-modified input
            }}
            placeholder="I need to analyze customer feedback data to identify key themes and sentiment patterns. The analysis should include specific examples and actionable recommendations for improving our product..."
            className="w-full h-64 resize-none"
            maxLength={5000}
          />

          {/* Advanced Options */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <Collapsible open={showAdvancedOptions} onOpenChange={setShowAdvancedOptions}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex items-center justify-between w-full p-0 h-auto text-left">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Advanced Options
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showAdvancedOptions ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Target Model</Label>
                    <Select value={targetModel} onValueChange={setTargetModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                        <SelectItem value="gpt">GPT (OpenAI)</SelectItem>
                        <SelectItem value="gemini">Gemini (Google)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Complexity Level</Label>
                    <Select value={complexityLevel} onValueChange={setComplexityLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                        <SelectItem value="comprehensive">Comprehensive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="includeExamples" 
                      checked={includeExamples}
                      onCheckedChange={(checked) => setIncludeExamples(checked === true)}
                    />
                    <Label htmlFor="includeExamples" className="text-sm text-slate-700 dark:text-slate-300">
                      Include examples in prompt
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="useXMLTags" 
                      checked={useXMLTags}
                      onCheckedChange={(checked) => setUseXMLTags(checked === true)}
                    />
                    <Label htmlFor="useXMLTags" className="text-sm text-slate-700 dark:text-slate-300">
                      Use XML-style tags (Claude optimized)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="includeConstraints" 
                      checked={includeConstraints}
                      onCheckedChange={(checked) => setIncludeConstraints(checked === true)}
                    />
                    <Label htmlFor="includeConstraints" className="text-sm text-slate-700 dark:text-slate-300">
                      Add constraint sections
                    </Label>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          
          {/* Input Tools */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClear}
                className="text-slate-500 hover:text-slate-700"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSaveAsTemplate}
                className="text-slate-500 hover:text-slate-700"
                disabled={!naturalLanguageInput.trim()}
              >
                <BookmarkPlus className="h-3 w-3 mr-1" />
                Save as Template
              </Button>
            </div>
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !naturalLanguageInput.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? "Generating..." : "Generate Prompt"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Template Creation Dialog */}
      <CreateTemplateDialog
        open={showCreateTemplateDialog}
        onOpenChange={setShowCreateTemplateDialog}
        initialSampleInput={naturalLanguageInput}
      />
    </div>
  );
}
