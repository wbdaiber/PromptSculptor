import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Edit, Trash2, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import type { Template } from "@shared/schema";

interface TemplateDropdownProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onSelect: (template: Template) => void;
  onEdit?: (template: Template) => void;
  onDelete?: (template: Template) => void;
  isLoading?: boolean;
}

const iconColorMap = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  green: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  orange: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
};

export default function TemplateDropdown({
  templates,
  selectedTemplate,
  onSelect,
  onEdit,
  onDelete,
  isLoading = false,
}: TemplateDropdownProps) {
  // Default to closed on mobile, open on desktop
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  // Auto-open on desktop, stay closed on mobile by default
  useEffect(() => {
    const checkScreenSize = () => {
      setIsOpen(window.innerWidth >= 1024); // lg breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleTemplateSelect = (template: Template) => {
    onSelect(template);
    
    // Auto-collapse on mobile after selection for better UX
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  const handleEdit = (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(template);
    }
  };

  const handleDelete = (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(template);
    }
  };

  return (
    <div className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-slate-200 dark:border-slate-700">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-4 h-auto font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div className="flex flex-col items-start">
                <span>Quick Start Templates</span>
                {selectedTemplate && (
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-1">
                    Selected: {selectedTemplate.name}
                  </span>
                )}
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="px-2 pb-2 space-y-1">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 animate-pulse"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg flex-shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                templates.map((template) => {
                  const iconColorClass = iconColorMap[template.iconColor as keyof typeof iconColorMap] || "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
                  const isSelected = selectedTemplate?.id === template.id;
                  const canEdit = user && template.userId === user.id && !template.isDefault;

                  return (
                    <div
                      key={template.id}
                      className={`group p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                        isSelected 
                          ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <div className={`w-8 h-8 ${iconColorClass} rounded-lg flex items-center justify-center text-sm flex-shrink-0`}>
                            <i className={template.icon}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm leading-tight">
                              {template.name}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 overflow-hidden" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical' as const,
                              lineHeight: '1.3em',
                              maxHeight: '2.6em'
                            }}>
                              {template.description}
                            </p>
                          </div>
                        </div>
                        
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex-shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem 
                                onClick={(e) => handleEdit(e, template)} 
                                className="cursor-pointer text-xs"
                              >
                                <Edit className="h-3 w-3 mr-2" />
                                Edit Template
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => handleDelete(e, template)} 
                                className="cursor-pointer text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete Template
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}