import { useState, useEffect } from "react"
import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PromptLibrary, CustomPrompt } from "@/components/PromptLibrary"

// Define developer settings interface
interface DeveloperSettings {
  apiEndpoint: string;
  modelVersion: string;
  temperature: number;
  debugMode: boolean;
  maxTokens: number;
  overridePrompt: string;
  useContractAnalysisPrompts: boolean;
  selectedContractPrompt: string;
  promptFormat: "text" | "json";
}

interface SettingsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings?: DeveloperSettings;
  onSettingsChange?: (settings: DeveloperSettings) => void;
}

// Predefined prompts for contract analysis
const CONTRACT_ANALYSIS_PROMPTS = {
  "main_clause_extraction": `You are an expert contract analyzer specializing in construction agreements. Your task is to extract every clause from the contract and create a structured table. Analyze the complete contract, breaking it down into individual clauses, regardless of how the contract is organized.

Extract all clauses from this construction contract and organize them into a structured table with the following columns:

1. Clause_ID (format: CL-[section number]-[sequential number])
2. Section_Number (the hierarchical section number as appears in contract, e.g., '3.2.1')
3. Section_Title (the heading or title of the section)
4. Clause_Text (the complete text of the clause)
5. Clause_Type (categorize: Payment, Schedule, Termination, Liability, Design, Force Majeure, etc.)
6. Is_Standard (Yes/No - determine if this appears to be standard/boilerplate language)
7. Has_Variables (Yes/No - indicates if the clause contains project-specific variables)
8. Variables_List (list any project-specific elements like amounts, dates, names)`,

  "clause_relationship_extraction": `You are an expert legal analyst specializing in contract structure and relationships. Your task is to identify relationships between clauses in this construction contract. Look for references, dependencies, modifications, exceptions, and hierarchical relationships.

Using the previously extracted clauses, identify all relationships between clauses in this contract. Create a structured table with the following columns:

1. Relationship_ID (format: REL-[sequential number])
2. Source_Clause_ID (the clause that references or relates to another)
3. Target_Clause_ID (the clause being referenced or related to)
4. Relationship_Type (choose one: References, Modifies, Exceptions, Depends_On, Parent_Of, Contradicts)
5. Relationship_Text (exact text that establishes the relationship)
6. Notes (any additional observations)`,

  "metadata_extraction": `You are an expert in construction contract analysis. Your task is to extract key metadata about this contract and create a structured record.

Extract the following metadata from this construction contract and organize it into a structured table:

1. Contract_ID (generate a unique ID)
2. Contract_Title (full title of the agreement)
3. Contract_Date (effective or execution date)
4. Contract_Type (e.g., Fixed Price, Cost-Plus, Design-Build, etc.)
5. Owner_Name (client/owner entity)
6. Contractor_Name (primary contractor)
7. Project_Name (name of the construction project)
8. Project_Location (site address or description)
9. Contract_Value (total contract amount)
10. Contract_Duration (time period or days for completion)
11. Payment_Terms (brief summary of payment structure)
12. Governing_Law (jurisdiction)
13. Dispute_Resolution (method specified)
14. Special_Provisions (list any unusual or special provisions)`,

  "risk_assessment": `You are an expert construction contract risk analyst. Your task is to identify and assess risks in this contract from the contractor's perspective.

Analyze this construction contract and create a comprehensive risk assessment table with the following columns:

1. Risk_ID (format: RISK-[sequential number])
2. Related_Clause_ID (the clause ID that contains this risk)
3. Risk_Category (e.g., Payment, Schedule, Liability, Design, Force Majeure)
4. Risk_Description (detailed description of the risk)
5. Risk_Severity (Critical, High, Medium, Low)
6. Risk_Probability (High, Medium, Low)
7. Potential_Impact (financial, schedule, or other impacts)
8. Risk_Owner (which party bears this risk)
9. Mitigation_Strategy (suggested approach to mitigate)

Identify risks in areas including but not limited to: payment terms, schedule requirements, liquidated damages, indemnification, warranties, design responsibility, force majeure, and termination provisions.`,

  "financial_terms_extraction": `You are an expert in construction contract financial analysis. Your task is to extract all payment and financial terms from this contract.

Extract all payment and financial terms from this construction contract and organize them into a structured table:

1. Financial_Item_ID (format: FIN-[sequential number])
2. Related_Clause_ID (the clause ID that contains this financial item)
3. Item_Type (Contract Sum, Unit Price, Allowance, Retainage, Change Order, Fee, etc.)
4. Item_Description (description of the financial term)
5. Amount (dollar value if specified)
6. Percentage (if specified as a percentage)
7. Payment_Timing (when payment is due)
8. Prerequisites (conditions that must be met before payment)
9. Retainage (any withholding percentage)
10. Special_Conditions (any special conditions related to this financial item)`
};

// API functions for Vercel Blob storage
async function savePromptToStorage(prompt: CustomPrompt) {
  try {
    const response = await fetch('/api/prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prompt),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save prompt');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving prompt:', error);
    throw error;
  }
}

async function deletePromptFromStorage(promptId: string) {
  try {
    const response = await fetch(`/api/prompts/${promptId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete prompt');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting prompt:', error);
    throw error;
  }
}

async function loadPromptsFromStorage() {
  try {
    const response = await fetch('/api/prompts');
    
    if (!response.ok) {
      throw new Error('Failed to load prompts');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error loading prompts:', error);
    throw error;
  }
}

export function SettingsSidebar({ 
  open, 
  onOpenChange, 
  settings = {
    apiEndpoint: "https://api.openai.com/v1/chat/completions",
    modelVersion: "gpt-4",
    temperature: 0.7,
    debugMode: false,
    maxTokens: 2048,
    overridePrompt: "",
    useContractAnalysisPrompts: false,
    selectedContractPrompt: "main_clause_extraction",
    promptFormat: "text"
  },
  onSettingsChange
}: SettingsSidebarProps) {

  // Local state for form inputs
  const [localSettings, setLocalSettings] = useState<DeveloperSettings>(settings);
  // State for user prompts
  const [userPrompts, setUserPrompts] = useState<CustomPrompt[]>([]);
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Update local state when props change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Load prompts from storage when the component mounts
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        setIsLoading(true);
        const data = await loadPromptsFromStorage();
        if (data && data.prompts) {
          setUserPrompts(data.prompts);
        }
      } catch (error) {
        console.error('Failed to load prompts:', error);
        // Handle error - possibly set a default empty array
        setUserPrompts([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchPrompts();
    }
  }, [open]);

  // Handle form changes
  const handleFormChange = (field: keyof DeveloperSettings, value: any) => {
    const updatedSettings = { ...localSettings, [field]: value };
    setLocalSettings(updatedSettings);
  };

  // Handle temperature slider/input change
  const handleTemperatureChange = (value: number[]) => {
    handleFormChange('temperature', value[0]);
  };

  // Handle prompt selection from library
  const handlePromptSelect = (prompt: CustomPrompt) => {
    handleFormChange('overridePrompt', prompt.content);
    handleFormChange('promptFormat', prompt.format);
    // Disable contract analysis prompts when using a custom prompt
    handleFormChange('useContractAnalysisPrompts', false);
  };

  // Handle saving a prompt to the library
  const handleSavePrompt = async (prompt: CustomPrompt) => {
    try {
      setIsLoading(true);
      await savePromptToStorage(prompt);
      
      // Update local state
      setUserPrompts(prev => {
        const exists = prev.find(p => p.id === prompt.id);
        if (exists) {
          return prev.map(p => p.id === prompt.id ? prompt : p);
        } else {
          return [...prev, prompt];
        }
      });
    } catch (error) {
      console.error('Failed to save prompt:', error);
      // Handle error - possibly show a notification
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting a prompt from the library
  const handleDeletePrompt = async (promptId: string) => {
    try {
      setIsLoading(true);
      await deletePromptFromStorage(promptId);
      
      // Update local state
      setUserPrompts(prev => prev.filter(p => p.id !== promptId));
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      // Handle error - possibly show a notification
    } finally {
      setIsLoading(false);
    }
  };

  // Save current prompt to library
  const saveCurrentPromptToLibrary = () => {
    // Generate a prompt object from current settings
    const now = new Date().toISOString();
    const newPrompt: CustomPrompt = {
      id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: "Custom Prompt", // Default name, user can edit later
      description: "Created from settings", // Default description
      content: localSettings.overridePrompt,
      format: localSettings.promptFormat,
      createdAt: now,
      updatedAt: now
    };
    
    // Open prompt library tab and add this prompt
    handleSavePrompt(newPrompt);
  };

  // Handle importing prompts
  const handleImportPrompts = () => {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.onchange = async (e) => {
      if (!e.target) return;
      
      const target = e.target as HTMLInputElement;
      if (!target.files || target.files.length === 0) return;
      
      const file = target.files[0];
      
      try {
        const content = await file.text();
        const imported = JSON.parse(content);
        
        // Validate imported data
        if (Array.isArray(imported)) {
          // Import multiple prompts
          const promises = imported.map(prompt => savePromptToStorage(prompt));
          await Promise.all(promises);
          
          // Reload prompts
          const data = await loadPromptsFromStorage();
          if (data && data.prompts) {
            setUserPrompts(data.prompts);
          }
        } else if (typeof imported === 'object' && imported !== null) {
          // Import single prompt
          await savePromptToStorage(imported);
          
          // Reload prompts
          const data = await loadPromptsFromStorage();
          if (data && data.prompts) {
            setUserPrompts(data.prompts);
          }
        } else {
          throw new Error('Invalid import format');
        }
      } catch (error) {
        console.error('Failed to import prompts:', error);
        // Handle error - show notification
      }
    };
    
    // Trigger file selection
    fileInput.click();
  };

  // Handle exporting prompts
  const handleExportPrompt = (promptId: string) => {
    const prompt = userPrompts.find(p => p.id === promptId);
    if (!prompt) return;
    
    // Convert prompt to JSON string
    const promptJson = JSON.stringify(prompt, null, 2);
    
    // Create a download link
    const blob = new Blob([promptJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prompt.name.replace(/\s+/g, '_')}.json`;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle contract prompt selection
  const handleContractPromptChange = (promptKey: string) => {
    handleFormChange('selectedContractPrompt', promptKey);
    handleFormChange('overridePrompt', CONTRACT_ANALYSIS_PROMPTS[promptKey as keyof typeof CONTRACT_ANALYSIS_PROMPTS]);
  };

  // Handle save
  const handleSave = () => {
    if (onSettingsChange) {
      onSettingsChange(localSettings);
    }
    onOpenChange(false);
  };

  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[800px] overflow-y-auto settings-sidebar">
          <SheetHeader className="mb-6">
            <SheetTitle>Developer Settings</SheetTitle>
          </SheetHeader>
          <div className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="general" className="text-foreground">General Settings</TabsTrigger>
                <TabsTrigger value="prompts" className="text-foreground">Prompt Settings</TabsTrigger>
                <TabsTrigger value="library" className="text-foreground">Prompt Library</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4 py-4">
                {/* API Endpoint */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="apiEndpoint" className="text-sm font-medium text-foreground">
                      API Endpoint
                    </label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The API endpoint to use for chat completions</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input 
                    id="apiEndpoint" 
                    value={localSettings.apiEndpoint}
                    onChange={(e) => handleFormChange('apiEndpoint', e.target.value)}
                    className="text-foreground bg-background"
                  />
                </div>

                {/* Model Version */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="modelVersion" className="text-sm font-medium text-foreground">
                      Model Version
                    </label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The model version to use</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="high-contrast-select">
                    <Select 
                      value={localSettings.modelVersion}
                      onValueChange={(value) => handleFormChange('modelVersion', value)}
                    >
                      <SelectTrigger className="text-foreground bg-background">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        <SelectItem value="gpt-3.5-turbo" className="text-popover-foreground">GPT 3.5 Turbo</SelectItem>
                        <SelectItem value="gpt-4" className="text-popover-foreground">GPT 4</SelectItem>
                        <SelectItem value="gpt-4-turbo" className="text-popover-foreground">GPT 4 Turbo</SelectItem>
                        <SelectItem value="claude-3-opus" className="text-popover-foreground">Claude 3 Opus</SelectItem>
                        <SelectItem value="claude-3-sonnet" className="text-popover-foreground">Claude 3 Sonnet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="temperature" className="text-sm font-medium text-foreground">
                      Temperature
                    </label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Controls randomness in the output (0-2)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex gap-4">
                    <Slider 
                      id="temperature" 
                      min={0} 
                      max={2} 
                      step={0.1} 
                      value={[localSettings.temperature]} 
                      onValueChange={handleTemperatureChange}
                      className="flex-1" 
                    />
                    <Input 
                      type="number" 
                      className="w-20 text-foreground bg-background" 
                      value={localSettings.temperature}
                      onChange={(e) => handleFormChange('temperature', parseFloat(e.target.value))}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                  </div>
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="maxTokens" className="text-sm font-medium text-foreground">
                      Max Tokens
                    </label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Maximum number of tokens to generate</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input 
                    id="maxTokens" 
                    type="number" 
                    value={localSettings.maxTokens}
                    onChange={(e) => handleFormChange('maxTokens', parseInt(e.target.value))}
                    min={1}
                    step={1}
                    className="text-foreground bg-background"
                  />
                </div>

                {/* Debug Mode */}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="debugMode" 
                    checked={localSettings.debugMode}
                    onCheckedChange={(checked) => handleFormChange('debugMode', checked === true)}
                  />
                  <label
                    htmlFor="debugMode"
                    className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Enable Debug Mode
                  </label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Show additional debugging information in the console</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TabsContent>
              
              <TabsContent value="prompts" className="space-y-4 py-4">
                {/* Contract Analysis Prompts Toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="useContractAnalysisPrompts" 
                    checked={localSettings.useContractAnalysisPrompts}
                    onCheckedChange={(checked) => handleFormChange('useContractAnalysisPrompts', checked === true)}
                  />
                  <label
                    htmlFor="useContractAnalysisPrompts"
                    className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Use Contract Analysis Prompts
                  </label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Enable predefined contract analysis prompts</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                {/* Contract Analysis Prompt Selection */}
                {localSettings.useContractAnalysisPrompts && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Contract Analysis Prompt</label>
                    <div className="high-contrast-select">
                      <Select 
                        value={localSettings.selectedContractPrompt}
                        onValueChange={handleContractPromptChange}
                      >
                        <SelectTrigger className="text-foreground bg-background">
                          <SelectValue placeholder="Select prompt type" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover text-popover-foreground">
                          <SelectItem value="main_clause_extraction" className="text-popover-foreground">Main Clause Extraction</SelectItem>
                          <SelectItem value="clause_relationship_extraction" className="text-popover-foreground">Clause Relationship Extraction</SelectItem>
                          <SelectItem value="metadata_extraction" className="text-popover-foreground">Contract Metadata Extraction</SelectItem>
                          <SelectItem value="risk_assessment" className="text-popover-foreground">Risk Assessment</SelectItem>
                          <SelectItem value="financial_terms_extraction" className="text-popover-foreground">Financial Terms Extraction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Prompt Format */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Prompt Format</label>
                  <div className="high-contrast-select">
                    <Select 
                      value={localSettings.promptFormat}
                      onValueChange={(value: "text" | "json") => handleFormChange('promptFormat', value)}
                    >
                      <SelectTrigger className="text-foreground bg-background">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        <SelectItem value="text" className="text-popover-foreground">Text</SelectItem>
                        <SelectItem value="json" className="text-popover-foreground">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Override Prompt Template */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="overridePrompt" className="text-sm font-medium text-foreground">
                      Override Prompt Template
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
                    id="overridePrompt" 
                    className="min-h-[200px] font-mono text-sm text-foreground bg-background" 
                    value={localSettings.overridePrompt}
                    onChange={(e) => handleFormChange('overridePrompt', e.target.value)}
                    placeholder="Enter your custom prompt template here"
                  />
                </div>

                {/* Save to Library Button */}
                <div className="flex justify-end">
                  <Button onClick={saveCurrentPromptToLibrary}>
                    Save Prompt to Library
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="library" className="py-4">
                <PromptLibrary
                  prompts={userPrompts}
                  onSelect={handlePromptSelect}
                  onDelete={handleDeletePrompt}
                  onSave={handleSavePrompt}
                  onImport={handleImportPrompts}
                  onExport={handleExportPrompt}
                />
              </TabsContent>
            </Tabs>

            {/* Buttons */}
            <div className="flex justify-between gap-4">
              <Button variant="outline" className="w-1/2" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="default" className="w-1/2" onClick={handleSave}>
                Save Settings
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}