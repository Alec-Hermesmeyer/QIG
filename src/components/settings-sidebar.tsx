// components/settings-sidebar.tsx
"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface SettingsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsSidebar({ open, onOpenChange }: SettingsSidebarProps) {
  const [apiKey, setApiKey] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are an AI assistant that specializes in legal contract analysis."
  );
  const [debugMode, setDebugMode] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  const [model, setModel] = useState("gpt-4");
  const [maxTokens, setMaxTokens] = useState(4000);

  // Save settings
  const handleSave = () => {
    const settings = {
      apiKey,
      temperature,
      systemPrompt,
      debugMode,
      developerMode,
      model,
      maxTokens
    };
    localStorage.setItem("developerSettings", JSON.stringify(settings));
    alert("Settings saved successfully!");
  };

  // Load settings from localStorage when component mounts
  React.useEffect(() => {
    const savedSettings = localStorage.getItem("developerSettings");
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setApiKey(parsedSettings.apiKey || "");
        setTemperature(parsedSettings.temperature || 0.7);
        setSystemPrompt(parsedSettings.systemPrompt || "");
        setDebugMode(parsedSettings.debugMode || false);
        setDeveloperMode(parsedSettings.developerMode || false);
        setModel(parsedSettings.model || "gpt-4");
        setMaxTokens(parsedSettings.maxTokens || 4000);
      } catch (error) {
        console.error("Error parsing saved settings", error);
      }
    }
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30" 
        onClick={() => onOpenChange(false)}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 h-full w-80 md:w-96 bg-white shadow-xl overflow-y-auto p-6 z-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Developer Settings</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="model">Model</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">API Key</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your API key is stored locally and never sent to our servers.
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium">Debug Mode</label>
                <Switch 
                  checked={debugMode}
                  onCheckedChange={setDebugMode}
                />
              </div>
              <p className="text-xs text-gray-500">
                Enable advanced logging and debugging features
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium">Developer Mode</label>
                <Switch 
                  checked={developerMode}
                  onCheckedChange={setDeveloperMode}
                />
              </div>
              <p className="text-xs text-gray-500">
                Enable experimental features and customizations
              </p>
            </div>
          </TabsContent>

          {/* Model Tab */}
          <TabsContent value="model" className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <select
                className="w-full p-2 border rounded-md"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium">Temperature: {temperature.toFixed(1)}</label>
              </div>
              <Slider
                value={[temperature]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={(value) => setTemperature(value[0])}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>More precise</span>
                <span>More creative</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Max Tokens</label>
              <Input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                min={100}
                max={8000}
              />
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">System Prompt</label>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter system prompt"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Customize the instruction provided to the AI model
              </p>
            </div>

            <div className="pt-4">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  if (confirm("Reset all settings to default values?")) {
                    localStorage.removeItem("developerSettings");
                    setApiKey("");
                    setTemperature(0.7);
                    setSystemPrompt("You are an AI assistant that specializes in legal contract analysis.");
                    setDebugMode(false);
                    setDeveloperMode(false);
                    setModel("gpt-4");
                    setMaxTokens(4000);
                  }
                }}
              >
                Reset to Defaults
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-6 border-t">
          <Button 
            className="w-full" 
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}