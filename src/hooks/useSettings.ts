import { useState, useEffect } from "react";

// Define the settings state interface
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

// Storage key for persisting settings
const SETTINGS_STORAGE_KEY = 'contract-analysis-settings';

export function useSettings() {
  // Try to load settings from localStorage
  const loadSavedSettings = (): Partial<SettingsState> => {
    if (typeof window === 'undefined') return {};
    
    try {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return savedSettings ? JSON.parse(savedSettings) : {};
    } catch (e) {
      console.error('Failed to load settings from localStorage:', e);
      return {};
    }
  };

  // Initialize settings state
  const [settings, setSettings] = useState<SettingsState>(() => ({
    ...defaultSettings,
    ...loadSavedSettings()
  }));

  // UI state for the settings sidebar
  const [showSettings, setShowSettings] = useState(false);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings]);

  // Function to update settings
  const updateSettings = (newSettings: Partial<SettingsState>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  // Create a request payload with the current settings
  const createRequestPayload = (messages: any[]) => {
    return {
      messages,
      temperature: settings.temperature,
      seed: settings.seed,
      stream: settings.streamResponse,
      suggestFollowUpQuestions: settings.suggestFollowUp,
      ...(settings.promptTemplate && { promptTemplate: settings.promptTemplate }),
      searchConfig: {
        minSearchScore: settings.minSearchScore,
        minRerankerScore: settings.minRerankerScore,
        includeCategory: settings.includeCategory,
        excludeCategory: settings.excludeCategory,
        useSemanticRanker: settings.useSemanticRanker,
        useSemanticCaptions: settings.useSemanticCaptions,
        retrievalMode: settings.retrievalMode
      },
      contractAnalysis: settings.contractAnalysis
    };
  };

  return {
    settings,
    updateSettings,
    showSettings,
    setShowSettings,
    createRequestPayload
  };
}