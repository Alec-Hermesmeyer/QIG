import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Pencil, Trash2, Save, Download, Upload } from "lucide-react";

// Custom prompt interface
export interface CustomPrompt {
  id: string;          // Unique identifier
  name: string;        // User-friendly name
  description: string; // Brief description
  content: string;     // The actual prompt content
  format: "text" | "json"; // Format of the prompt
  createdAt: string;   // Timestamp
  updatedAt: string;   // Timestamp for last update
}

interface PromptLibraryProps {
  prompts: CustomPrompt[];
  onSelect: (prompt: CustomPrompt) => void;
  onDelete: (promptId: string) => void;
  onSave: (prompt: CustomPrompt) => void;
  onImport?: () => void;
  onExport?: (promptId: string) => void;
}

export function PromptLibrary({
  prompts,
  onSelect,
  onDelete,
  onSave,
  onImport,
  onExport
}: PromptLibraryProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Partial<CustomPrompt>>({
    name: "",
    description: "",
    content: "",
    format: "text"
  });

  // Helper to generate a unique ID
  const generateId = () => {
    return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Initialize new prompt
  const initNewPrompt = () => {
    setEditingPrompt({
      name: "",
      description: "",
      content: "",
      format: "text"
    });
    setIsCreating(true);
  };

  // Start editing existing prompt
  const startEditingPrompt = (prompt: CustomPrompt) => {
    setEditingPrompt(prompt);
    setSelectedPromptId(prompt.id);
    setIsEditing(true);
  };

  // Save current prompt (new or edited)
  const savePrompt = () => {
    if (!editingPrompt.name || !editingPrompt.content) {
      // TODO: Show validation error
      return;
    }

    const now = new Date().toISOString();
    
    if (isCreating) {
      // Create new prompt
      const newPrompt: CustomPrompt = {
        id: generateId(),
        name: editingPrompt.name || "",
        description: editingPrompt.description || "",
        content: editingPrompt.content || "",
        format: editingPrompt.format as "text" | "json" || "text",
        createdAt: now,
        updatedAt: now
      };
      
      onSave(newPrompt);
      setIsCreating(false);
    } else if (isEditing && editingPrompt.id) {
      // Update existing prompt
      const updatedPrompt: CustomPrompt = {
        ...editingPrompt as CustomPrompt,
        updatedAt: now
      };
      
      onSave(updatedPrompt);
      setIsEditing(false);
    }
    
    // Reset editing state
    setEditingPrompt({
      name: "",
      description: "",
      content: "",
      format: "text"
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsCreating(false);
    setIsEditing(false);
    setEditingPrompt({
      name: "",
      description: "",
      content: "",
      format: "text"
    });
  };

  // Handle prompt selection
  const handleSelectPrompt = (prompt: CustomPrompt) => {
    setSelectedPromptId(prompt.id);
    onSelect(prompt);
  };

  // Handle form field changes
  const handleInputChange = (field: keyof CustomPrompt, value: string) => {
    setEditingPrompt(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const selectedPrompt = prompts.find(p => p.id === selectedPromptId);

  return (
    <div className="grid grid-cols-12 gap-4 h-full">
      {/* Prompt List (Left Side) */}
      <div className="col-span-4 border rounded-md overflow-hidden">
        <div className="p-4 border-b bg-muted/50">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Your Prompts</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={initNewPrompt}
              className="h-8 w-8 p-0"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="sr-only">Add new prompt</span>
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {prompts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No prompts saved yet. Create one to get started.
            </div>
          ) : (
            <div className="p-0">
              {prompts.map((prompt) => (
                <div 
                  key={prompt.id}
                  className={`p-3 border-b cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors ${selectedPromptId === prompt.id ? 'bg-accent text-accent-foreground' : ''}`}
                  onClick={() => handleSelectPrompt(prompt)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-medium truncate">{prompt.name}</h4>
                      <p className="text-xs text-muted-foreground truncate mt-1">{prompt.description || 'No description'}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingPrompt(prompt);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(prompt.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                      {prompt.format === 'json' ? 'JSON' : 'Text'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Updated {new Date(prompt.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Import/Export Actions */}
        <div className="p-3 border-t bg-muted/30 flex justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={onImport}
          >
            <Upload className="h-3 w-3 mr-1" />
            Import
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => selectedPromptId && onExport && onExport(selectedPromptId)}
            disabled={!selectedPromptId || !onExport}
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Prompt Details/Editor (Right Side) */}
      <div className="col-span-8 border rounded-md overflow-hidden">
        {isCreating || isEditing ? (
          /* Prompt Editor */
          <div className="p-4 h-full flex flex-col">
            <h3 className="text-sm font-medium mb-4">
              {isCreating ? 'Create New Prompt' : 'Edit Prompt'}
            </h3>
            
            <div className="space-y-4 flex-1">
              <div>
                <Label htmlFor="prompt-name">Name</Label>
                <Input 
                  id="prompt-name"
                  value={editingPrompt.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter a name for this prompt"
                />
              </div>
              
              <div>
                <Label htmlFor="prompt-description">Description (optional)</Label>
                <Input 
                  id="prompt-description"
                  value={editingPrompt.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of this prompt's purpose"
                />
              </div>
              
              <div>
                <Label htmlFor="prompt-format">Format</Label>
                <Select 
                  value={editingPrompt.format || 'text'} 
                  onValueChange={(value) => handleInputChange('format', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label htmlFor="prompt-content">Prompt Content</Label>
                <Textarea 
                  id="prompt-content"
                  value={editingPrompt.content || ''}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="Enter your prompt here..."
                  className="min-h-[200px] font-mono text-sm flex-1"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={cancelEditing}>
                Cancel
              </Button>
              <Button onClick={savePrompt}>
                <Save className="h-4 w-4 mr-2" />
                Save Prompt
              </Button>
            </div>
          </div>
        ) : selectedPrompt ? (
          /* Prompt Viewer */
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{selectedPrompt.name}</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => startEditingPrompt(selectedPrompt)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedPrompt.description || 'No description provided'}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                  {selectedPrompt.format === 'json' ? 'JSON' : 'Text'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Created: {new Date(selectedPrompt.createdAt).toLocaleDateString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  Updated: {new Date(selectedPrompt.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <pre className="text-sm font-mono whitespace-pre-wrap bg-muted/50 p-4 rounded-md">
                {selectedPrompt.content}
              </pre>
            </ScrollArea>
            
            <div className="p-4 border-t">
              <Button 
                className="w-full"
                onClick={() => onSelect(selectedPrompt)}
              >
                Use This Prompt
              </Button>
            </div>
          </div>
        ) : (
          /* No prompt selected */
          <div className="flex items-center justify-center h-full text-center p-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Select or Create a Prompt</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Choose a prompt from the library or create a new one to get started.
              </p>
              <Button onClick={initNewPrompt}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create New Prompt
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}