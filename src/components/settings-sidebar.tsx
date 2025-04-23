// Enhanced SettingsSidebar Component with RAG/CAG Toggle
import { Info, Database, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Enhanced interface for settings state with Mode support
export interface SettingsState {
  // Common settings
  assistanceMode: 'RAG' | 'CAG';
  promptTemplate: string;
  temperature: number;
  seed: string;
  streamResponse: boolean;
  
  // RAG-specific settings
  minSearchScore: number;
  minRerankerScore: number;
  includeCategory: string;
  excludeCategory: string | null;
  useSemanticRanker: boolean;
  useSemanticCaptions: boolean;
  suggestFollowUp: boolean;
  retrievalMode: string;
  
  // CAG-specific settings
  model: string;
  maxTokens: number;
  showAnalyticsDashboard: boolean;
  enableDocumentHistory: boolean;
  saveAnalyzedDocuments: boolean;
  useCachedResponses: boolean;
}

// Define interface for chat configuration with mode support
export interface ChatConfig {
  mode: 'RAG' | 'CAG';
  promptTemplate?: string;
  temperature: number;
  seed?: string;
  streamResponse: boolean;
  suggestFollowUp: boolean;
  model?: string;  // For CAG mode
  maxTokens?: number; // For CAG mode
  searchConfig?: {  // For RAG mode
    minSearchScore: number;
    minRerankerScore: number;
    includeCategory: string;
    excludeCategory: string | null;
    useSemanticRanker: boolean;
    useSemanticCaptions: boolean;
    retrievalMode: string;
  };
}

// Model options for CAG
const modelOptions = [
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'gpt-4.1', label: 'GPT-4.1 Standard' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
];

// Settings Sidebar Component props
interface SettingsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSettings?: Partial<SettingsState>;
  onSettingsChange?: (settings: Partial<SettingsState>) => void;
}

// Animation variants
const slideUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
};

const staggerChildren = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export function SettingsSidebar({
  open,
  onOpenChange,
  initialSettings = {},
  onSettingsChange
}: SettingsSidebarProps) {
  // Default settings
  const defaultSettings: SettingsState = {
    // Common settings
    assistanceMode: 'RAG',
    promptTemplate: '',
    temperature: 0.3,
    seed: '',
    streamResponse: true,
    
    // RAG-specific settings
    minSearchScore: 0,
    minRerankerScore: 0,
    includeCategory: 'all',
    excludeCategory: null,
    useSemanticRanker: true,
    useSemanticCaptions: false,
    suggestFollowUp: false,
    retrievalMode: 'hybrid',
    
    // CAG-specific settings
    model: 'gpt-4.1-mini',
    maxTokens: 1000,
    showAnalyticsDashboard: true,
    enableDocumentHistory: true,
    saveAnalyzedDocuments: true,
    useCachedResponses: true
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
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <SheetHeader className="mb-6">
              <SheetTitle>Configure AI Assistance</SheetTitle>
            </SheetHeader>
            
            {/* Mode Selection Tabs */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium">Assistance Mode</label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p><strong>RAG</strong>: Retrieval-Augmented Generation uses your knowledge base to answer questions.</p>
                    <p className="mt-2"><strong>CAG</strong>: Creation-Augmented Generation analyzes documents and generates insights without requiring a knowledge base.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <Tabs
                defaultValue={settings.assistanceMode}
                onValueChange={(value) => handleInputChange('assistanceMode', value as 'RAG' | 'CAG')}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="RAG" className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5 mr-1" />
                    Knowledge Base
                  </TabsTrigger>
                  <TabsTrigger value="CAG" className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Document Analysis
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="RAG" className="py-4">
                  <div className="bg-muted/50 p-3 rounded-md mb-4">
                    <p className="text-sm text-muted-foreground">
                      RAG uses your knowledge base to find and reference relevant information when answering questions.
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="CAG" className="py-4">
                  <div className="bg-muted/50 p-3 rounded-md mb-4">
                    <p className="text-sm text-muted-foreground">
                      CAG analyzes uploaded documents directly and generates insights without requiring a pre-built knowledge base.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <motion.div 
              className="space-y-6"
              variants={staggerChildren}
              initial="hidden"
              animate="visible"
            >
              {/* Common Settings Section */}
              <motion.div variants={slideUp}>
                <h3 className="text-base font-semibold border-b pb-2 mb-4">Common Settings</h3>
              
                {/* Prompt Template */}
                <motion.div className="space-y-2 mb-4" variants={slideUp}>
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
                    value={settings.promptTemplate}
                    onChange={(e) => handleInputChange('promptTemplate', e.target.value)}
                    placeholder={settings.assistanceMode === 'RAG' 
                      ? "You are an AI assistant that helps users analyze construction contracts. When answering, refer to the knowledge base to provide accurate information."
                      : "You are an AI assistant that analyzes construction contracts. When analyzing a contract, focus on the financial provisions, risk allocation, and key compliance requirements."
                    }
                  />
                </motion.div>

                {/* Temperature */}
                <motion.div className="space-y-2 mb-4" variants={slideUp}>
                  <div className="flex items-center gap-2">
                    <label htmlFor="temperature" className="text-sm font-medium">
                      Temperature
                    </label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Controls randomness in the output</p>
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
                </motion.div>

                {/* Seed */}
                <motion.div className="space-y-2 mb-4" variants={slideUp}>
                  <div className="flex items-center gap-2">
                    <label htmlFor="seed" className="text-sm font-medium">
                      Seed
                    </label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Random seed for reproducibility</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="seed"
                    type="text"
                    value={settings.seed}
                    onChange={(e) => handleInputChange('seed', e.target.value)}
                    placeholder="Leave blank for random results"
                  />
                </motion.div>
                
                {/* Stream Response */}
                <motion.div className="flex items-center justify-between space-y-0 py-2 mb-4" variants={slideUp}>
                  <div className="flex flex-col space-y-1">
                    <Label htmlFor="stream-response" className="text-sm font-medium">
                      Stream chat completion responses
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Receive responses in real-time as they are generated
                    </span>
                  </div>
                  <Switch 
                    id="stream-response" 
                    checked={settings.streamResponse} 
                    onCheckedChange={(checked) => handleInputChange('streamResponse', checked)}
                  />
                </motion.div>
              </motion.div>
              
              {/* Conditional rendering based on mode */}
              {settings.assistanceMode === 'RAG' ? (
                /* RAG-specific settings */
                <motion.div variants={slideUp}>
                  <h3 className="text-base font-semibold border-b pb-2 mb-4">RAG Settings</h3>
                  
                  {/* Search and Reranker Scores */}
                  <motion.div className="grid gap-4 sm:grid-cols-2 mb-4" variants={slideUp}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label htmlFor="search-score" className="text-sm font-medium">
                          Minimum search score
                        </label>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Minimum relevance score for search results</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="search-score"
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={settings.minSearchScore}
                        onChange={(e) => handleInputChange('minSearchScore', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label htmlFor="reranker-score" className="text-sm font-medium">
                          Minimum reranker score
                        </label>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Minimum score for reranking results</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="reranker-score"
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={settings.minRerankerScore}
                        onChange={(e) => handleInputChange('minRerankerScore', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </motion.div>

                  {/* Categories */}
                  <motion.div className="grid gap-4 sm:grid-cols-2 mb-4" variants={slideUp}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Include category</label>
                      <Select
                        value={settings.includeCategory}
                        onValueChange={(value) => handleInputChange('includeCategory', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="policies">Policies</SelectItem>
                          <SelectItem value="coverage">Coverage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Exclude category</label>
                      <Select
                        value={settings.excludeCategory || 'none'}
                        onValueChange={(value) => handleInputChange('excludeCategory', value === 'none' ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="policies">Policies</SelectItem>
                          <SelectItem value="coverage">Coverage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>

                  {/* Checkboxes */}
                  <motion.div className="space-y-4 mb-4" variants={slideUp}>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="semantic-ranker"
                        checked={settings.useSemanticRanker}
                        onCheckedChange={(checked) => handleInputChange('useSemanticRanker', checked === true)}
                      />
                      <label
                        htmlFor="semantic-ranker"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Use semantic ranker for retrieval
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="semantic-captions"
                        checked={settings.useSemanticCaptions}
                        onCheckedChange={(checked) => handleInputChange('useSemanticCaptions', checked === true)}
                      />
                      <label
                        htmlFor="semantic-captions"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Use semantic captions
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="follow-up"
                        checked={settings.suggestFollowUp}
                        onCheckedChange={(checked) => handleInputChange('suggestFollowUp', checked === true)}
                      />
                      <label
                        htmlFor="follow-up"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Suggest follow-up questions
                      </label>
                    </div>
                  </motion.div>

                  {/* Retrieval Mode */}
                  <motion.div className="space-y-2 mb-4" variants={slideUp}>
                    <label className="text-sm font-medium">Retrieval mode</label>
                    <Select
                      value={settings.retrievalMode}
                      onValueChange={(value) => handleInputChange('retrievalMode', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hybrid">Vectors + Text (Hybrid)</SelectItem>
                        <SelectItem value="vectors">Vectors only</SelectItem>
                        <SelectItem value="text">Text only</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>
                </motion.div>
              ) : (
                /* CAG-specific settings */
                <motion.div variants={slideUp}>
                  <h3 className="text-base font-semibold border-b pb-2 mb-4">CAG Settings</h3>
                  
                  {/* AI Model Selection */}
                  <motion.div className="space-y-2 mb-4" variants={slideUp}>
                    <div className="flex items-center gap-2">
                      <label htmlFor="model" className="text-sm font-medium">
                        AI Model
                      </label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Select the AI model to use for document analysis</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select 
                      value={settings.model} 
                      onValueChange={(value) => handleInputChange('model', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI model" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelOptions.map(model => (
                          <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                  
                  {/* Max Tokens */}
                  <motion.div className="space-y-2 mb-4" variants={slideUp}>
                    <div className="flex items-center gap-2">
                      <label htmlFor="max-tokens" className="text-sm font-medium">
                        Max Response Tokens
                      </label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Maximum length of generated responses</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex gap-4">
                      <Slider 
                        id="max-tokens" 
                        min={100} 
                        max={4000} 
                        step={100} 
                        value={[settings.maxTokens]} 
                        className="flex-1"
                        onValueChange={(value) => handleInputChange('maxTokens', value[0])}
                      />
                      <Input 
                        type="number" 
                        className="w-20" 
                        value={settings.maxTokens} 
                        onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value) || 1000)}
                        min={100}
                        max={4000}
                        step={100}
                      />
                    </div>
                  </motion.div>
                  
                  {/* Document Management Options */}
                  <motion.div className="space-y-4 mb-4" variants={slideUp}>
                    {/* Save Documents */}
                    <div className="flex items-center justify-between space-y-0 py-2">
                      <div className="flex flex-col space-y-1">
                        <Label htmlFor="save-docs" className="text-sm font-medium">
                          Save Analyzed Documents
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          Store documents in your library for future reference
                        </span>
                      </div>
                      <Switch 
                        id="save-docs" 
                        checked={settings.saveAnalyzedDocuments} 
                        onCheckedChange={(checked) => handleInputChange('saveAnalyzedDocuments', checked)}
                      />
                    </div>
                    
                    {/* Use Cached Responses */}
                    <div className="flex items-center justify-between space-y-0 py-2">
                      <div className="flex flex-col space-y-1">
                        <Label htmlFor="use-cache" className="text-sm font-medium">
                          Use Cached Responses
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          Reuse previous analyses for faster responses
                        </span>
                      </div>
                      <Switch 
                        id="use-cache" 
                        checked={settings.useCachedResponses} 
                        onCheckedChange={(checked) => handleInputChange('useCachedResponses', checked)}
                      />
                    </div>
                    
                    {/* Show Analytics Dashboard */}
                    <div className="flex items-center justify-between space-y-0 py-2">
                      <div className="flex flex-col space-y-1">
                        <Label htmlFor="show-analytics" className="text-sm font-medium">
                          Show Analytics Dashboard
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          Display usage metrics and document statistics
                        </span>
                      </div>
                      <Switch 
                        id="show-analytics" 
                        checked={settings.showAnalyticsDashboard} 
                        onCheckedChange={(checked) => handleInputChange('showAnalyticsDashboard', checked)}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <motion.div 
                className="flex gap-4"
                variants={slideUp}
                transition={{ delay: 0.2 }}
              >
                <Button variant="outline" className="w-1/2" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button className="w-1/2" onClick={handleApplySettings}>
                  Apply Settings
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}