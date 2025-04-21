// src/hooks/useContractAnalysis.ts

import { useState, useEffect, useCallback } from 'react';
import { parseRisksFromAnalysis, parseMitigationFromAnalysis, preprocessAnalysisResponse } from '@/service/riskAnalyzer';
import { chunkText } from '@/utils/chunkText';
import { apiClient } from '@/service/apiClient';
import { Risk, AnalysisSettings, FileProcessingError } from '@/types';

// Import the Prompt function from the prompt lib
import { Prompt } from '@/lib/prompt';

export function useContractAnalysis(onAnalysisComplete?: (
  analysisText: string,
  risks: Risk[],
  mitigationPoints: string[],
  contractText: string
) => void) {
  // State for contract data
  const [contractText, setContractText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number | null>(null);
  
  // State for analysis
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FileProcessingError | null>(null);
  const [progress, setProgress] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  
  // State for results
  const [parsedRisks, setParsedRisks] = useState<Risk[]>([]);
  const [mitigationPoints, setMitigationPoints] = useState<string[]>([]);
  
  // State for analysis configuration
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>('comprehensive');
  const [analysisPrompt, setAnalysisPrompt] = useState<string>('');
  const [contractType, setContractType] = useState('construction');
  
  // State for UI feedback
  const [copySuccess, setCopySuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState<AnalysisSettings>({
    model: 'llama3-8b-8192',
    temperature: 0.1,
    chunkSize: 1500,
  });
  
  // Update settings
  const updateSettings = useCallback((newSettings: Partial<AnalysisSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);
  
  // Reset all state
  const resetState = useCallback(() => {
    setFileName('');
    setFileSize(null);
    setContractText('');
    setAnalysis('');
    setError(null);
    setProgress(0);
    setTotalChunks(0);
    setCurrentChunk(0);
    setParsedRisks([]);
    setMitigationPoints([]);
    setSelectedAnalysisType('comprehensive');
    setAnalysisPrompt('');
  }, []);
  
  // Handle analysis type selection
  const handleAnalysisTypeSelect = useCallback((analysisType: string, prompt: string) => {
    setSelectedAnalysisType(analysisType);
    
    // Only store the prompt text if specifically provided by the button
    if (prompt && prompt.length > 0) {
      setAnalysisPrompt(prompt);
    } else {
      // Otherwise clear it to use the prompt from the prompt system
      setAnalysisPrompt('');
    }
  }, []);
  
  // Get the analysis prompt
  const getPrompt = useCallback(() => {
    // If a specific analysis type is selected, use its prompt
    if (analysisPrompt && analysisPrompt.length > 0) {
      return analysisPrompt;
    }
    
    // If using the new prompt system that accepts parameters
    if (typeof Prompt === 'function') {
      // Check if it's the new function that accepts parameters
      if (Prompt.length >= 1) {
        return Prompt(selectedAnalysisType, contractType);
      }
      // Otherwise use the old function
      return Prompt();
    }
    
    // Final fallback if Prompt is not a function
    return Prompt;
  }, [analysisPrompt, selectedAnalysisType, contractType]);
  
  // Main analysis function
  const handleAnalyze = useCallback(async () => {
    if (!contractText) return;
  
    try {
      setLoading(true);
      setError(null);
      setAnalysis('');
      setParsedRisks([]);
      setMitigationPoints([]);
      setProgress(0);
      
      const chunks = chunkText(contractText, settings.chunkSize);
      setTotalChunks(chunks.length);
      
      let fullAnalysis = '';
      
      // Get the base prompt and enhance it
      const basePrompt = getPrompt();
      const promptIntro = buildPromptWithLocationGuidance(basePrompt);
  
      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        setCurrentChunk(i + 1);
        
        try {
          const chunkPrompt = `${promptIntro}\n\n--- Contract Excerpt (Part ${i + 1} of ${chunks.length}) ---\n${chunks[i]}`;
          
          // Call the API
          const content = await apiClient.getContractAnalysis(
            chunkPrompt,
            settings.model,
            settings.temperature
          );
          
          if (content) {
            const partHeader = chunks.length > 1 
              ? `Part ${i + 1} of ${chunks.length}\n`
              : '';
              
            fullAnalysis += (i > 0 ? '\n\n' : '') + partHeader + content;
            
            // Preprocess and parse the response
            const cleanedAnalysis = preprocessAnalysisResponse(fullAnalysis);
            setAnalysis(cleanedAnalysis);
            
            const currentRisks = parseRisksFromAnalysis(cleanedAnalysis);
            const currentMitigation = parseMitigationFromAnalysis(cleanedAnalysis);
            
            setParsedRisks(currentRisks);
            setMitigationPoints(currentMitigation);
          }
          
          // Update progress
          setProgress(((i + 1) / chunks.length) * 100);
          
        } catch (chunkError: any) {
          console.error(`Error processing chunk ${i + 1}:`, chunkError);
          fullAnalysis += `\n\n---\n\n## Error in Part ${i + 1}\n\nAn error occurred while analyzing this section: ${chunkError.message || 'Unknown error'}`;
          setAnalysis(fullAnalysis);
        }
      }
      
      // Analysis is complete - final processing
      const cleanedAnalysis = preprocessAnalysisResponse(fullAnalysis);
      const finalRisks = parseRisksFromAnalysis(cleanedAnalysis);
      const finalMitigation = parseMitigationFromAnalysis(cleanedAnalysis);
      
      // Set final state
      setAnalysis(cleanedAnalysis);
      setParsedRisks(finalRisks);
      setMitigationPoints(finalMitigation);
      
      // Call the onAnalysisComplete callback if provided
      if (onAnalysisComplete) {
        onAnalysisComplete(cleanedAnalysis, finalRisks, finalMitigation, contractText);
      }
      
    } catch (analysisError: any) {
      console.error('Analysis error:', analysisError);
      setError({
        message: 'Analysis failed',
        details: analysisError.message || 'An error occurred during contract analysis. Please try again.'
      });
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, [contractText, settings, getPrompt, onAnalysisComplete]);
  
  // Add location guidance to the prompt
  const buildPromptWithLocationGuidance = (basePrompt: string) => {
    return `${basePrompt}

Your task is to analyze the contract text and identify the key risks.

For each risk, specify:
1. A risk category (Financial, Schedule, Liability, Scope, etc.)
2. A risk score (Critical, High, Medium, Low)
3. The specific contract text that creates the risk (use exact quotes)
4. An explanation of why this creates a risk
5. The precise location in the contract - VERY IMPORTANT!

For the location, be as specific as possible:
- Include article numbers, section numbers, page numbers, or paragraph references
- For example: "Article 5, Section 5.3, Paragraph 2" or "Section 3.2.1"
- If no explicit numbering exists, describe it (e.g., "Payment Terms clause, third paragraph")
- NEVER use "Unknown Location" - provide your best estimate of location based on context

Follow this format strictly:

Risk Category: [Category]
Risk Score: [Score]
Risky Contract Text: "[Exact text]"
Why This Is a Risk: [Explanation]
Contract Location: [Specific section reference]

After listing all risks (identify 5-7 most important risks), provide a "Mitigation Summary:" section with 5-7 bullet points of recommended actions.`;
  };
  
  // Copy analysis to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    try {
      // Format the analysis into a clean markdown document when copying
      let formattedOutput = "# Contract Risk Analysis\n\n";

      // Add the risks
      parsedRisks.forEach((risk, index) => {
        formattedOutput += `## Risk ${index + 1}: ${risk.category} (${risk.score})\n\n`;
        formattedOutput += `**Contract Location:** ${risk.location}\n\n`;
        formattedOutput += `**Problematic Text:**\n> "${risk.text}"\n\n`;
        formattedOutput += `**Risk Assessment:**\n${risk.reason}\n\n`;
        formattedOutput += `---\n\n`;
      });

      // Add mitigation summary
      formattedOutput += "# Mitigation Summary\n\n";
      mitigationPoints.forEach((point) => {
        formattedOutput += `- ${point}\n`;
      });

      await navigator.clipboard.writeText(formattedOutput);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [parsedRisks, mitigationPoints]);
  
  // Export analysis as markdown
  const handleExportMarkdown = useCallback(() => {
    setIsExporting(true);
    try {
      // Format the analysis into a clean markdown document for export
      let formattedOutput = "# Contract Risk Analysis\n\n";

      // Add the risks
      parsedRisks.forEach((risk, index) => {
        formattedOutput += `## Risk ${index + 1}: ${risk.category} (${risk.score})\n\n`;
        formattedOutput += `**Contract Location:** ${risk.location}\n\n`;
        formattedOutput += `**Problematic Text:**\n> "${risk.text}"\n\n`;
        formattedOutput += `**Risk Assessment:**\n${risk.reason}\n\n`;
        formattedOutput += `---\n\n`;
      });

      // Add mitigation summary
      formattedOutput += "# Mitigation Summary\n\n";
      mitigationPoints.forEach((point) => {
        formattedOutput += `- ${point}\n`;
      });

      const blob = new Blob([formattedOutput], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.split('.')[0]}-analysis.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [parsedRisks, mitigationPoints, fileName]);
  
  // Reset error state when file changes
  useEffect(() => {
    if (fileName) {
      setError(null);
    }
  }, [fileName]);
  
  // Public API
  return {
    // State
    contractText,
    setContractText,
    fileName,
    setFileName,
    fileSize,
    setFileSize,
    loading,
    progress,
    error,
    setError,
    analysis,
    setAnalysis,
    parsedRisks,
    setParsedRisks,
    mitigationPoints,
    setMitigationPoints,
    currentChunk,
    totalChunks,
    settings,
    updateSettings,
    contractType,
    setContractType,
    selectedAnalysisType,
    setSelectedAnalysisType,
    analysisPrompt,
    setAnalysisPrompt,
    copySuccess,
    isExporting,
    
    // Functions
    resetState,
    handleAnalyze,
    handleAnalysisTypeSelect,
    handleCopyToClipboard,
    handleExportMarkdown,
    getPrompt
  };
}