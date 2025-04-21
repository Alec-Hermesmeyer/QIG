import { Info } from "lucide-react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

// Define interface for settings state
export interface SettingsState {
  promptTemplate: string;
  temperature: number;
  seed: string | null;
  minSearchScore: number;
  minRerankerScore: number;
  includeCategory: string;
  excludeCategory: string | null;
  useSemanticRanker: boolean;
  useSemanticCaptions: boolean;
  streamResponse: boolean;
  suggestFollowUp: boolean;
  retrievalMode: string;
  contractAnalysis: boolean;
}

// Define props for the settings sidebar component
interface SettingsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSettings?: Partial<SettingsState>;
  onSettingsChange?: (settings: Partial<SettingsState>) => void;
}

export function SettingsSidebar({ 
  open, 
  onOpenChange, 
  initialSettings = {}, 
  onSettingsChange
}: SettingsSidebarProps) {
  // Default settings
  const defaultSettings: SettingsState = {
    promptTemplate: '',
    temperature: 0.3,
    seed: null,
    minSearchScore: 0,
    minRerankerScore: 0,
    includeCategory: 'all',
    excludeCategory: null,
    useSemanticRanker: true,
    useSemanticCaptions: false,
    streamResponse: true,
    suggestFollowUp: false,
    retrievalMode: 'hybrid',
    contractAnalysis: true
  };

  // Initialize settings with defaults and any provided initial settings
  const [settings, setSettings] = useState<SettingsState>({
    ...defaultSettings,
    ...initialSettings
  });

  // Update settings when initialSettings prop changes
  useEffect(() => {
    if (initialSettings && Object.keys(initialSettings).length > 0) {
      setSettings(prev => ({
        ...prev,
        ...initialSettings
      }));
    }
  }, [initialSettings]);

  // Handler for input changes
  const handleInputChange = (field: keyof SettingsState, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Apply settings and close sidebar
  const handleApplySettings = () => {
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
    onOpenChange(false);
  };

  // Reset to initial settings
  const handleCancel = () => {
    setSettings({
      ...defaultSettings,
      ...initialSettings
    });
    onOpenChange(false);
  };

  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Configure Contract Analysis Settings</SheetTitle>
          </SheetHeader>
          <div className="space-y-6">
            {/* Prompt Template - Most important for your needs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="prompt" className="text-sm font-medium">
                  Override prompt template
                </label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Custom prompt template for the AI</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea 
                id="prompt" 
                className="min-h-[100px]" 
                value={settings.promptTemplate || ''}
                onChange={(e) => handleInputChange('promptTemplate', e.target.value)}
                placeholder="You are an AI assistant that helps users analyze construction contracts. When analyzing a contract, focus on the financial provisions, risk allocation, and key compliance requirements."
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="temperature" className="text-sm font-medium">
                  Temperature
                </label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Controls randomness in the output (lower = more deterministic)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-4">
                <Slider 
                  id="temperature" 
                  min={0} 
                  max={1} 
                  step={0.1} 
                  value={[settings.temperature]} 
                  className="flex-1"
                  onValueChange={(value) => handleInputChange('temperature', value[0])}
                />
                <Input 
                  type="number" 
                  className="w-20" 
                  value={settings.temperature} 
                  onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value) || 0)}
                  min={0}
                  max={1}
                  step={0.1}
                />
              </div>
            </div>

            {/* Seed */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="seed" className="text-sm font-medium">
                  Seed
                </label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Random seed for reproducible outputs (optional)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input 
                id="seed" 
                type="text" 
                value={settings.seed || ''}
                onChange={(e) => handleInputChange('seed', e.target.value || null)}
                placeholder="Leave blank for random results"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button variant="outline" className="w-1/2" onClick={handleCancel}>
                Cancel
              </Button>
              <Button className="w-1/2" onClick={handleApplySettings}>
                Apply Settings
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}