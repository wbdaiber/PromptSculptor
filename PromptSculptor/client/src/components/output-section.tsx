import { useState } from "react";
import { Copy, Download, RotateCcw, Edit, Check, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface OutputSectionProps {
  generatedResult: any;
  isGenerating: boolean;
}

export default function OutputSection({ generatedResult, isGenerating }: OutputSectionProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'markdown'>('preview');
  const { toast } = useToast();

  const handleCopyToClipboard = async () => {
    if (!generatedResult?.generatedPrompt) return;
    
    try {
      await navigator.clipboard.writeText(generatedResult.generatedPrompt);
      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard successfully.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!generatedResult?.generatedPrompt) return;
    
    const blob = new Blob([generatedResult.generatedPrompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedResult.title || 'prompt'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Prompt downloaded as markdown file.",
    });
  };

  const getQualityIndicators = () => {
    if (!generatedResult) return [];
    
    const indicators = [
      { label: "Clear role definition", status: "success" },
      { label: "Structured sections", status: "success" },
      { label: "XML tags for Claude", status: "success" },
    ];
    
    if (generatedResult.qualityScore < 85) {
      indicators.push({ label: "Could include more examples", status: "warning" });
    }
    
    return indicators;
  };

  if (isGenerating) {
    return (
      <div className="space-y-6">
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Generated Prompt</h3>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Generating...</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-1">Structured markdown prompt optimized for LLMs</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!generatedResult) {
    return (
      <div className="space-y-6">
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Generated Prompt</h3>
            <p className="text-sm text-slate-500 mt-1">Your structured prompt will appear here</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Edit className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500">Enter your instructions and click "Generate Prompt" to get started</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Generated Prompt</h3>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Generated</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleCopyToClipboard}
                className="text-slate-500 hover:text-slate-700"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleDownload}
                className="text-slate-500 hover:text-slate-700"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-1">Structured markdown prompt optimized for LLMs</p>
        </CardHeader>
        <CardContent className="p-6">
          {/* Preview Toggle */}
          <div className="flex items-center space-x-4 mb-4">
            <button 
              className={`text-sm font-medium pb-1 ${
                viewMode === 'preview' 
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              onClick={() => setViewMode('preview')}
            >
              Preview
            </button>
            <button 
              className={`text-sm font-medium pb-1 ${
                viewMode === 'markdown' 
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              onClick={() => setViewMode('markdown')}
            >
              Markdown
            </button>
          </div>

          {/* Generated Content */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-600 max-h-96 overflow-y-auto">
            {viewMode === 'preview' ? (
              <div className="prose prose-sm max-w-none 
                prose-headings:text-slate-900 dark:prose-headings:text-slate-100
                prose-p:text-slate-700 dark:prose-p:text-slate-300
                prose-strong:text-slate-900 dark:prose-strong:text-slate-100
                prose-code:text-blue-600 dark:prose-code:text-blue-400
                prose-code:bg-slate-100 dark:prose-code:bg-slate-700
                prose-pre:bg-slate-100 dark:prose-pre:bg-slate-700
                prose-pre:text-slate-800 dark:prose-pre:text-slate-200
                prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-400
                prose-blockquote:border-slate-300 dark:prose-blockquote:border-slate-600
                prose-li:text-slate-700 dark:prose-li:text-slate-300">
                <ReactMarkdown>
                  {generatedResult.generatedPrompt}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="font-mono text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {generatedResult.generatedPrompt}
              </pre>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-slate-500 hover:text-slate-700"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Regenerate
              </Button>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline">Save as Template</Button>
              <Button 
                onClick={handleCopyToClipboard}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Prompt
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats and Tips */}
      <Card>
        <CardHeader className="border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Prompt Quality</h3>
          <p className="text-sm text-slate-500 mt-1">Analysis of the generated prompt structure</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {generatedResult.wordCount || 0}
              </div>
              <div className="text-sm text-slate-500">Words</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {generatedResult.qualityScore || 0}
              </div>
              <div className="text-sm text-slate-500">Quality Score</div>
            </div>
          </div>
          
          <div className="space-y-3">
            {getQualityIndicators().map((indicator, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  indicator.status === 'success' ? 'bg-emerald-500' : 'bg-amber-400'
                }`}></div>
                <span className="text-sm text-slate-700">{indicator.label}</span>
                {indicator.status === 'success' ? (
                  <Check className="h-3 w-3 text-emerald-500 ml-auto" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-amber-500 ml-auto" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
