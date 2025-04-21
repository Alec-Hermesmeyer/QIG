"use client";

import React, { useEffect, useState } from 'react';
import {
  Panel,
  PanelType,
  Stack,
  Text,
  DefaultButton,
  Spinner,
  MessageBar,
  MessageBarType,
  DetailsList,
  IColumn,
  SelectionMode,
  ProgressIndicator,
  SearchBox,
  IconButton,
  Modal,
  IIconProps,
  Pivot,
  PivotItem,
  TextField,
  PrimaryButton
} from '@fluentui/react';
import { Prompt } from '@/lib/prompt';
import { getCitationFilePath } from '@/lib/api'; // Assuming you have this util

// Icon definitions
const viewIcon: IIconProps = { iconName: 'View' };
const analyzeIcon: IIconProps = { iconName: 'Insights' };
const refreshIcon: IIconProps = { iconName: 'Refresh' };
const addIcon: IIconProps = { iconName: 'Add' };
const searchIcon: IIconProps = { iconName: 'Search' };

interface FileCabinetPanelProps {
  isOpen: boolean;
  onDismiss: () => void;
  onRunAnalysis: (fileName: string, analysisResult: any, citationUrl: string) => void;
}

export const FileCabinetPanel: React.FC<FileCabinetPanelProps> = ({ isOpen, onDismiss, onRunAnalysis }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [analyzingFile, setAnalyzingFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingMessage, setLoadingMessage] = useState<string>("Fetching files...");
  const [searchText, setSearchText] = useState<string>("");
  const [sortAscending, setSortAscending] = useState<boolean>(true);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [currentStrategy, setCurrentStrategy] = useState<string>("auto");
  const [analysisProgress, setAnalysisProgress] = useState<string>(""); // For streaming display
  const [verificationMode, setVerificationMode] = useState<boolean>(false); // Toggle for verification mode
  
  // Document viewer state
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState<boolean>(false);
  const [iframeError, setIframeError] = useState<boolean>(false);

  // File discovery strategies
  const FILE_DISCOVERY_STRATEGIES = [
    {
      id: "recent",
      name: "Recent Files",
      prompt: `List the most recent document files available in the system. Return ONLY a JSON array of filenames that are known with 100% certainty to exist in the system wrapped in triple backticks, like:
      \`\`\`json
      ["file1.pdf", "file2.docx", "file3.txt"]
      \`\`\`
      Include ALL available files - make sure to include at least 15-20 files if available.`
    },
    {
      id: "extensions",
      name: "By Extension",
      prompt: `List ALL document files in the system with the following extensions: .pdf, .docx, .doc, .txt, .rtf, .csv, .xlsx, .xls, .pptx, .ppt
      Return ONLY a JSON array of filenames that are known with 100% certainty to exist in the system wrapped in triple backticks, like:
      \`\`\`json
      ["file1.pdf", "file2.docx", "file3.txt"]
      \`\`\`
      It's important to be thorough and include ALL files with these extensions.`
    },
    {
      id: "contracts",
      name: "Contracts",
      prompt: `List all available contract documents in the system. These may have names containing words like "agreement", "contract", "terms", "NDA", "SLA", "SOW", etc.
      Return ONLY a JSON array of filenames that are known with 100% certainty to exist in the system wrapped in triple backticks, like:
      \`\`\`json
      ["contract_abc.pdf", "service_agreement.docx", "nda_2023.pdf"]
      \`\`\`
      Include ALL available contract files.`
    },
    {
      id: "all",
      name: "All Documents",
      prompt: `List ALL documents that are available in the system, regardless of type, age, or category.
      Return ONLY a JSON array of filenames that are known with 100% certainty to exist in the system wrapped in triple backticks, like:
      \`\`\`json
      ["file1.pdf", "contract.docx", "data.csv", "presentation.pptx", "notes.txt"]
      \`\`\`
      This is very important: include EVERY document file you can access. The goal is to create a complete inventory of ALL available files.`
    },
    {
      id: "folders",
      name: "By Folder",
      prompt: `List all document files organized by their folders or categories in the system. If you know files are in specific folders, please list all files in each folder.
      Return ONLY a JSON array of filenames that are known with 100% certainty to exist in the system wrapped in triple backticks, like:
      \`\`\`json
      ["folder1/file1.pdf", "folder2/file2.docx", "contracts/nda.pdf"]
      \`\`\`
      If files are not in folders, list all individual files. Include ALL available files.`
    },
    {
      id: "mentioned",
      name: "Mentioned Files",
      prompt: `List all document files that have been mentioned or referenced in previous conversations or analyses.
      Return ONLY a JSON array of filenames that are known with 100% certainty to exist in the system wrapped in triple backticks, like:
      \`\`\`json
      ["previously_analyzed.pdf", "mentioned_contract.docx", "reference_doc.txt"]
      \`\`\`
      These would be files that you have previously seen, analyzed, or that users have asked about.`
    },
    {
      id: "date-range",
      name: "By Date Range",
      prompt: `List document files organized by date ranges (e.g., last 30 days, last 6 months, older than 1 year).
      Return ONLY a JSON array of filenames that are known with 100% certainty to exist in the system wrapped in triple backticks, like:
      \`\`\`json
      ["recent_report_2025.pdf", "contract_2024.docx", "legacy_doc_2023.txt"]
      \`\`\`
      Include ALL available files across different time periods.`
    },
    {
      id: "file-size",
      name: "By File Size",
      prompt: `List document files from largest to smallest or by size categories.
      Return ONLY a JSON array of filenames that are known with 100% certainty to exist in the system wrapped in triple backticks, like:
      \`\`\`json
      ["large_document.pdf", "medium_report.docx", "small_note.txt"]
      \`\`\`
      Include ALL available files across different size categories.`
    },
    {
      id: "specific-keywords",
      name: "By Keywords",
      prompt: `List all document files that contain any of these keywords in their filename: contract, agreement, legal, finance, report, analysis, data, project, proposal, plan, strategy, budget, forecast, review, audit, compliance, policy, procedure, manual, guide, specification, requirement, design, technical, research, summary, statement, letter, memo, presentation, documentation.
      Return ONLY a JSON array of filenames that are known with 100% certainty to exist in the system wrapped in triple backticks, like:
      \`\`\`json
      ["financial_report.pdf", "project_plan.docx", "compliance_policy.txt"]
      \`\`\`
      Include ALL files that match any of these keywords.`
    }
  ];

  // Enhanced strategies for deep discovery
  const ENHANCED_DISCOVERY_STRATEGIES = [
    {
      name: "Comprehensive Listing",
      prompt: `I need a COMPLETE list of ALL document files available in the system. 
      Return ONLY a JSON array of existing filenames that are known with 100% certainty to exist in the system wrapped in triple backticks, like:
      \`\`\`json
      ["file1.pdf", "file2.docx", "file3.txt"]
      \`\`\`
      Include ALL real files that definitely exist in the system.`
    },
    {
      name: "Direct Path Listing",
      prompt: `List all files in these common document paths:
      - /documents/
      - /contracts/
      - /agreements/
      - /files/
      - /uploads/
      - /shared/
      Return ONLY a JSON array of filenames that are known with 100% certainty to exist in the system wrapped in triple backticks. Include only files that definitely exist.`
    },
    {
      name: "All Extensions",
      prompt: `List all document files with these extensions: pdf, docx, doc, txt, rtf, csv, xlsx, xls, pptx, ppt, odt, ods, odp, htm, html, md, json, xml.
      Return ONLY a JSON array of filenames that are known with 100% certainty to exist in the system wrapped in triple backticks.
      Only include real, existing files.`
    },
    {
      name: "Search By Prefix",
      prompt: `List all document files that start with these letters: A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z.
      Return ONLY a JSON array of filenames that are known with 100% certainty to exist in the system wrapped in triple backticks.
      Only include files that you can verify exist.`
    }
  ];

  // Apply filters and sorting to files
  useEffect(() => {
    let result = [...files];
    
    // Apply search filter
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(file => 
        file.toLowerCase().includes(lowerSearch)
      );
    }
    
    // Apply sorting
    result = result.sort((a, b) => {
      return sortAscending 
        ? a.localeCompare(b) 
        : b.localeCompare(a);
    });
    
    setFilteredFiles(result);
  }, [files, searchText, sortAscending]);

  // Fetch files when panel opens
  useEffect(() => {
    if (isOpen) fetchFiles();
  }, [isOpen]);

  // Get the document URL for a file
  const getDocumentUrl = (fileName: string) => {
    return getCitationFilePath(fileName);
  };

  // Handle view document click
  const handleViewDocument = (fileName: string) => {
    setViewingFile(fileName);
    setIframeLoading(true);
    setIframeError(false);
    setIsViewerOpen(true);
  };

  // Handle iframe load success
  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  // Handle iframe load error
  const handleIframeError = () => {
    setIframeLoading(false);
    setIframeError(true);
  };

  // Close document viewer
  const closeViewer = () => {
    setIsViewerOpen(false);
    setViewingFile(null);
  };

  // Reset error state
  const clearError = () => {
    setError(null);
  };

  // Extract files from a response with improved parsing
  const extractFilesFromResponse = (text: string): string[] => {
    const allFiles = new Set<string>();
    
    // Try to find and parse JSON array from triple backticks
    const jsonMatches = text.match(/```json\s*(\[[\s\S]*?\])\s*```/g) || [];
    for (const match of jsonMatches) {
      const jsonContent = match.match(/```json\s*(\[[\s\S]*?\])\s*```/);
      if (jsonContent && jsonContent[1]) {
        try {
          const parsed = JSON.parse(jsonContent[1]);
          if (Array.isArray(parsed)) {
            parsed.filter(item => typeof item === 'string').forEach(file => allFiles.add(file));
          }
        } catch (e) {
          console.warn("Error parsing JSON from response:", e);
        }
      }
    }
    
    // If we found JSON arrays, use those (more reliable)
    if (allFiles.size > 0) {
      return Array.from(allFiles);
    }
    
    // No JSON arrays found, try more aggressive extraction techniques
    
    // Try to match just a regular JSON array without the backticks
    try {
      const maybeJson = text.match(/\[[\s\S]*?\]/);
      if (maybeJson) {
        const parsed = JSON.parse(maybeJson[0]);
        if (Array.isArray(parsed)) {
          parsed.filter(item => typeof item === 'string').forEach(file => allFiles.add(file));
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    // Fallback: use regex to find filenames with extensions
    const fileMatches: string[] = [];
    
    // Common document extensions
    const extensions = ['pdf', 'docx', 'doc', 'txt', 'rtf', 'csv', 'xlsx', 'xls', 'pptx', 'ppt'];
    const extensionPattern = extensions.join('|');
    
    // Match filenames with extensions in quotes
    const quotedRegex = new RegExp(`["']([^"']+\\.(${extensionPattern}))["']`, 'gi');
    let match;
    while ((match = quotedRegex.exec(text)) !== null) {
      allFiles.add(match[1]);
    }
    
    // Match filenames with extensions not in quotes (more risky)
    const unquotedRegex = new RegExp(`\\b([\\w-]+\\.(${extensionPattern}))\\b`, 'gi');
    while ((match = unquotedRegex.exec(text)) !== null) {
      allFiles.add(match[1]);
    }
    
    return Array.from(allFiles);
  };

  // Verify the existence of files
  const verifyFiles = async (filesToVerify: string[]): Promise<string[]> => {
    if (filesToVerify.length === 0) return [];
    
    try {
      setLoadingMessage("Verifying file existence...");
      
      const fileListString = filesToVerify.join(", ");
      const verificationPrompt = `I have a list of files that may exist in the system: ${fileListString}
      
      For each file, please check if it ACTUALLY exists and is accessible.
      Return ONLY a JSON array containing the files that are known with 100% certainty to exist in the system, wrapped in triple backticks:
      \`\`\`json
      ["existing_file1.pdf", "existing_file2.docx"]
      \`\`\`
      Be extremely careful to only include files that truly exist. If a file doesn't exist or you're unsure, don't include it.`;
      
      const res = await fetch("/api/chat-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: verificationPrompt,
            },
          ],
        }),
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error(`Verification request failed with status: ${res.status}`);
      }

      // Process the streaming response
      const streamReader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let result = "";

      if (streamReader) {
        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      // Clean and parse the response
      const responseText = result.split(/\n/).map(line => {
        try {
          const parsed = JSON.parse(line);
          return parsed.content || "";
        } catch {
          return line;
        }
      }).join("");
      
      // Extract verified files using our improved extraction
      return extractFilesFromResponse(responseText);
    } catch (error) {
      console.error("Error verifying files:", error);
      return []; // Return empty array on error
    }
  };

  // Try a strategy to discover files using streaming API
  const tryDiscoveryStrategy = async (strategy: { name: string, prompt: string }): Promise<string[]> => {
    try {
      setLoadingMessage(`Trying ${strategy.name} strategy...`);
      
      const res = await fetch("/api/chat-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: strategy.prompt,
            },
          ],
        }),
        credentials: "include" // Include cookies for auth
      });

      if (!res.ok) {
        throw new Error(`Request failed with status: ${res.status}`);
      }

      if (!res.body) {
        throw new Error('No response body available');
      }

      // Process the streaming response
      const streamReader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullResponse = "";
      let foundFiles: string[] = [];

      // Track if we've found JSON already
      let foundJsonArray = false;

      while (true) {
        const { done, value } = await streamReader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        
        // Check for JSON array in accumulated response
        if (!foundJsonArray) {
          // Try to extract from full response so far
          const jsonMatch = fullResponse.match(/```json\s*(\[[\s\S]*?\])\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            try {
              const parsed = JSON.parse(jsonMatch[1]);
              if (Array.isArray(parsed)) {
                foundFiles = parsed.filter(item => typeof item === 'string');
                foundJsonArray = true;
                
                // Update UI with files found so far
                setLoadingMessage(`${strategy.name}: Found ${foundFiles.length} files so far...`);
              }
            } catch (e) {
              // Incomplete JSON or parsing error, continue streaming
            }
          }
        }
      }

      // If we didn't find a JSON array during streaming, try to extract from complete response
      if (!foundJsonArray) {
        foundFiles = extractFilesFromResponse(fullResponse);
      }
      
      return foundFiles;
    } catch (error) {
      console.error(`Error in ${strategy.name} strategy:`, error);
      return [];
    }
  };

  // Run a specific strategy
  const runSpecificStrategy = async (strategyId: string) => {
    clearError();
    setLoading(true);
    setLoadingProgress(0.1);
    
    try {
      // Find the strategy by ID
      const strategy = FILE_DISCOVERY_STRATEGIES.find(s => s.id === strategyId);
      
      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }
      
      setLoadingMessage(`Running ${strategy.name} strategy...`);
      
      // Run the strategy
      const strategyFiles = await tryDiscoveryStrategy(strategy);
      
      // If verification mode is on, verify the files
      const filesToAdd = verificationMode 
        ? await verifyFiles(strategyFiles)
        : strategyFiles;
      
      if (filesToAdd.length > 0) {
        // Create a set from existing and new files
        const allFilesSet = new Set([...files, ...filesToAdd]);
        const newFilesAdded = allFilesSet.size - files.length;
        
        // Update files
        setFiles(Array.from(allFilesSet));
        
        // Update message
        setLoadingMessage(`${strategy.name}: Found ${filesToAdd.length} ${verificationMode ? 'verified' : ''} files (${newFilesAdded} new, ${allFilesSet.size} total)`);
      } else {
        setLoadingMessage(`${strategy.name}: No new files found`);
      }
      
      setLoadingProgress(1);
    } catch (err: any) {
      console.error("Strategy execution failed:", err);
      setError(err.message || "Strategy execution failed");
    } finally {
      setLoading(false);
    }
  };

  // Run a custom prompt
  const runCustomPrompt = async () => {
    if (!customPrompt.trim()) {
      setError("Please enter a custom prompt");
      return;
    }
    
    clearError();
    setLoading(true);
    setLoadingProgress(0.1);
    
    try {
      setLoadingMessage("Running custom prompt...");
      
      // Create a strategy from the custom prompt
      const customStrategy = {
        name: "Custom Prompt",
        prompt: customPrompt
      };
      
      // Run the strategy
      const customFiles = await tryDiscoveryStrategy(customStrategy);
      
      // If verification mode is on, verify the files
      const filesToAdd = verificationMode 
        ? await verifyFiles(customFiles)
        : customFiles;
      
      if (filesToAdd.length > 0) {
        // Create a set from existing and new files
        const allFilesSet = new Set([...files, ...filesToAdd]);
        const newFilesAdded = allFilesSet.size - files.length;
        
        // Update files
        setFiles(Array.from(allFilesSet));
        
        // Update message
        setLoadingMessage(`Custom prompt: Found ${filesToAdd.length} ${verificationMode ? 'verified' : ''} files (${newFilesAdded} new, ${allFilesSet.size} total)`);
      } else {
        setLoadingMessage("Custom prompt: No new files found");
      }
      
      setLoadingProgress(1);
    } catch (err: any) {
      console.error("Custom prompt execution failed:", err);
      setError(err.message || "Custom prompt execution failed");
    } finally {
      setLoading(false);
    }
  };

  // Deep search for files with enhanced strategies
  const runDeepSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      setLoadingMessage("Starting deep file discovery...");
      
      let allFiles = new Set<string>(files);
      let candidateFiles = new Set<string>();
      const allStrategies = [...FILE_DISCOVERY_STRATEGIES, ...ENHANCED_DISCOVERY_STRATEGIES];
      let totalStrategies = allStrategies.length;
      
      // Try each discovery strategy
      for (let i = 0; i < allStrategies.length; i++) {
        const strategy = allStrategies[i];
        
        // Update progress
        setLoadingProgress((i / totalStrategies) * 0.8);
        
        // Try this strategy
        const strategyFiles = await tryDiscoveryStrategy(strategy);
        
        if (strategyFiles.length > 0) {
          // Add candidate files
          const initialCount = candidateFiles.size;
          strategyFiles.forEach(file => candidateFiles.add(file));
          const newCount = candidateFiles.size;
          
          // Update message
          setLoadingMessage(`${strategy.name}: Found ${strategyFiles.length} candidate files (${newCount - initialCount} new, ${newCount} total)`);
          
          // Pause briefly between strategies
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      setLoadingProgress(0.85);
      setLoadingMessage(`Found ${candidateFiles.size} candidate files. Verifying...`);
      
      // Verify all candidate files if verification mode is on
      let verifiedFiles: string[] = [];
      if (verificationMode) {
        verifiedFiles = await verifyFiles(Array.from(candidateFiles));
        setLoadingMessage(`Verified ${verifiedFiles.length} of ${candidateFiles.size} candidate files.`);
      } else {
        verifiedFiles = Array.from(candidateFiles);
      }
      
      // Add all verified/candidate files to our set
      verifiedFiles.forEach(file => allFiles.add(file));
      
      // Update the files state
      setFiles(Array.from(allFiles));
      
      // Complete the progress bar
      setLoadingProgress(1);
      setLoadingMessage(`Complete! Found ${allFiles.size} ${verificationMode ? 'verified' : ''} files total.`);
      
    } catch (err: any) {
      console.error("Deep search failed:", err);
      setError(err.message || "Deep search failed");
    } finally {
      setLoading(false);
    }
  };

  // Try to fetch files using different strategies
  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      setLoadingMessage("Starting file discovery...");
      
      // Only clear files if this is not an additional strategy
      if (currentStrategy === "auto") {
        setFiles([]);
      }

      let allFiles = new Set<string>(files);
      let totalStrategies = FILE_DISCOVERY_STRATEGIES.length;
      let strategiesToRun = FILE_DISCOVERY_STRATEGIES;
      
      // If a specific strategy is selected, only run that one
      if (currentStrategy !== "auto" && currentStrategy !== "custom") {
        const selectedStrategy = FILE_DISCOVERY_STRATEGIES.find(s => s.id === currentStrategy);
        if (selectedStrategy) {
          strategiesToRun = [selectedStrategy];
          totalStrategies = 1;
        }
      }
      
      // Try each discovery strategy
      for (let i = 0; i < strategiesToRun.length; i++) {
        const strategy = strategiesToRun[i];
        
        // Update progress
        setLoadingProgress((i / totalStrategies) * 0.9); // Save the last 10% for final processing
        
        // Try this strategy
        const strategyFiles = await tryDiscoveryStrategy(strategy);
        
        // If verification mode is on, verify the files
        const filesToAdd = verificationMode 
          ? await verifyFiles(strategyFiles)
          : strategyFiles;
        
        if (filesToAdd.length > 0) {
          // Add new files to our set
          const initialCount = allFiles.size;
          filesToAdd.forEach(file => allFiles.add(file));
          const newCount = allFiles.size;
          
          // Update the current files list
          setFiles(Array.from(allFiles));
          
          // Update message
          setLoadingMessage(`${strategy.name}: Found ${filesToAdd.length} ${verificationMode ? 'verified' : ''} files (${newCount - initialCount} new, ${newCount} total)`);
          
          // Pause briefly between strategies
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Final step: try one more targeted search if we didn't find enough files and we're in auto mode
      if (allFiles.size < 20 && currentStrategy === "auto") {
        setLoadingMessage("Performing final search for additional files...");
        
        // Create a prompt that specifically asks for files we haven't seen yet
        const knownFiles = Array.from(allFiles).join(", ");
        const finalPrompt = `I already know about these files: ${knownFiles}
        
        Please list ALL OTHER document files available in the system that aren't in this list.
        Return ONLY a JSON array of additional filenames wrapped in triple backticks, like:
        \`\`\`json
        ["other_file1.pdf", "other_file2.docx"]
        \`\`\`
        If there are no additional files, return an empty array.`;
        
        const finalFiles = await tryDiscoveryStrategy({
          name: "Additional Files",
          prompt: finalPrompt
        });
        
        // If verification mode is on, verify the files
        const filesToAdd = verificationMode 
          ? await verifyFiles(finalFiles)
          : finalFiles;
        
        if (filesToAdd.length > 0) {
          // Add new files to our set
          const initialCount = allFiles.size;
          filesToAdd.forEach(file => allFiles.add(file));
          const newCount = allFiles.size;
          
          // Update the current files list
          setFiles(Array.from(allFiles));
          
          // Update message
          setLoadingMessage(`Found ${filesToAdd.length} additional ${verificationMode ? 'verified' : ''} files (${newCount - initialCount} new, ${newCount} total)`);
        }
      }
      
      // Complete the progress bar
      setLoadingProgress(1);
      setLoadingMessage(`Complete! Found ${allFiles.size} ${verificationMode ? 'verified' : ''} files total.`);
      
    } catch (err: any) {
      console.error("Failed to fetch files:", err);
      setError(err.message || "Failed to fetch files");
    } finally {
      setLoading(false);
    }
  };

  // Process a streaming chunk to filter out internal context data
  const processStreamChunk = (text: string): string => {
    // Skip lines with internal context data
    if (text.includes('<document') || 
        text.includes('</document') || 
        text.includes('<source>') || 
        text.includes('</source>') || 
        text.includes('<document_content>') || 
        text.includes('</document_content>') ||
        text.includes('sources:') ||
        text.includes('Sources:') ||
        text.includes('search query') ||
        text.includes('context') || 
        text.includes('thoughts') || 
        text.includes('data_points') || 
        text.includes('automated_reminder') ||
        text.includes('search_reminders') ||
        text.includes('userStyle')) {
      return '';
    }
    
    try {
      // Try to parse as JSON
      const data = JSON.parse(text);
      
      // If it has delta content, return that
      if (data.delta && data.delta.content) {
        return data.delta.content;
      }
      
      // Skip role establishment message
      if (data.delta && data.delta.role === 'assistant' && !data.delta.content) {
        return '';
      }
      
      // Skip any context data
      if (data.context || data.thoughts || data.search_results) {
        return '';
      }
      
      // Return content property if available
      if (data.content && typeof data.content === 'string') {
        return data.content;
      }
      
      return '';
    } catch (e) {
      // If it's not valid JSON but looks like a delta content match
      const deltaMatch = text.match(/"delta":\s*{\s*"content":\s*"([^"]*)"/);
      if (deltaMatch && deltaMatch[1]) {
        return deltaMatch[1];
      }
      
      // Check for content property
      const contentMatch = text.match(/"content":\s*"([^"]*)"/);
      if (contentMatch && contentMatch[1]) {
        return contentMatch[1];
      }
    }
    
    // If we can't parse it but it looks like plain text (not metadata), return it
    if (!text.includes('{') && !text.includes('}') && 
        !text.includes('<') && !text.includes('>')) {
      return text;
    }
    
    return '';
  };

  // Process a streaming response using the updated handler
  const processStreamResponse = async (reader: ReadableStreamDefaultReader<Uint8Array>, 
                                       updateCallback: (content: string) => void): Promise<string> => {
    const decoder = new TextDecoder();
    let fullContent = '';
    let receivedFirstContentChunk = false;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const processedContent = processStreamChunk(line);
          
          if (processedContent) {
            receivedFirstContentChunk = true;
            fullContent += processedContent;
            updateCallback(fullContent);
          }
        }
      }
    } catch (error) {
      console.error('Error processing stream:', error);
      throw error;
    }
    
    // Final cleanup of any remaining tags
    fullContent = fullContent.replace(/<\/?document.*?>/g, '')
                            .replace(/<\/?source>/g, '')
                            .replace(/<\/?document_content>/g, '')
                            .replace(/<userStyle>.*?<\/userStyle>/g, '')
                            .replace(/<automated_reminder_from_anthropic>.*?<\/automated_reminder_from_anthropic>/g, '')
                            .replace(/<search_reminders>.*?<\/search_reminders>/g, '');
    
    return fullContent;
  };

  // Run analysis on a document using the chat-stream API
  const handleRunAnalysis = async (fileName: string) => {
    try {
      setAnalyzingFile(fileName);
      setAnalysisProgress(""); // Clear previous progress
      
      // Fetch the document content using your proxy endpoint
      const contentRes = await fetch(`/api/proxy-content?filename=${encodeURIComponent(fileName)}`);
      
      if (!contentRes.ok) {
        throw new Error(`Failed to retrieve document content: ${contentRes.status}`);
      }
      
      const documentContent = await contentRes.text();
      
      // Use your chat-stream API for streaming responses
      const analysisRes = await fetch("/api/chat-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `${Prompt}\n\nAnalyze the following contract text from "${fileName}":\n\n${documentContent}`,
            },
          ],
        }),
      });
      
      if (!analysisRes.ok) {
        throw new Error(`API error: ${analysisRes.status}`);
      }
      
      if (!analysisRes.body) {
        throw new Error('No response body available');
      }
      
      // Process the streaming response
      const streamReader = analysisRes.body.getReader();
      
      // Use the streamed content processor
      const analysisContent = await processStreamResponse(
        streamReader,
        (progressContent) => {
          // Update UI with streamed content
          setAnalysisProgress(progressContent);
        }
      );
      
      // Get the citation URL
      const citationUrl = getCitationFilePath(fileName);
      
      // Call the parent component's callback with the final analysis
      onRunAnalysis(fileName, analysisContent, citationUrl);
      
    } catch (err: any) {
      console.error("Error running analysis:", err);
      setError(`Error analyzing ${fileName}: ${err.message}`);
    } finally {
      setAnalyzingFile(null);
      setAnalysisProgress(""); // Clear progress display
    }
  };

  // Toggle sort order
  const toggleSort = () => {
    setSortAscending(!sortAscending);
  };

  const columns: IColumn[] = [
    {
      key: 'filename',
      name: 'File Name',
      fieldName: 'name',
      minWidth: 200,
      isResizable: true,
      isSorted: true,
      isSortedDescending: !sortAscending,
      onColumnClick: toggleSort,
    },
    {
      key: 'actions',
      name: 'Actions',
      minWidth: 200,
      onRender: (item: { name: string }) => (
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <DefaultButton
            text="View"
            iconProps={viewIcon}
            onClick={() => handleViewDocument(item.name)}
            styles={{ root: { minWidth: 80 } }}
          />
          <DefaultButton
            text={analyzingFile === item.name ? "Analyzing..." : "Analyze"}
            iconProps={analyzeIcon}
            onClick={() => handleRunAnalysis(item.name)}
            disabled={analyzingFile !== null}
            styles={{ root: { minWidth: 90 } }}
          />
        </Stack>
      ),
    },
  ];

  const fileItems = filteredFiles.map((f) => ({ name: f }));

  // Handle strategy selection
  const handleStrategyChange = (item?: PivotItem) => {
    if (item) {
      setCurrentStrategy(item.props.itemKey || "auto");
    }
  };

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      type={PanelType.large}
      headerText="Contract File Cabinet"
      closeButtonAriaLabel="Close"
    >
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { height: '100%' } }}>
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
          <Text variant="large">{files.length > 0 ? `${files.length} files found` : "File Cabinet"}</Text>
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <DefaultButton 
              text="Deep Search"
              iconProps={searchIcon}
              onClick={runDeepSearch}
              disabled={loading}
            />
            <DefaultButton 
              text="Refresh All"
              iconProps={refreshIcon}
              onClick={() => {
                setCurrentStrategy("auto");
                fetchFiles();
              }}
              disabled={loading}
            />
          </Stack>
        </Stack>
        
        {/* Discovery options */}
        <Stack tokens={{ childrenGap: 8 }}>
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Text variant="mediumPlus">Discovery Methods</Text>
            <DefaultButton
              text={verificationMode ? "Verification: On" : "Verification: Off"}
              onClick={() => setVerificationMode(!verificationMode)}
              disabled={loading}
              styles={{ 
                root: { 
                  backgroundColor: verificationMode ? '#e6f7ff' : undefined,
                  borderColor: verificationMode ? '#1890ff' : undefined,
                }
              }}
            />
          </Stack>
          <Pivot 
            selectedKey={currentStrategy}
            onLinkClick={handleStrategyChange}
            styles={{ root: { marginBottom: 12 } }}
          >
            <PivotItem headerText="Auto" itemKey="auto" />
            {FILE_DISCOVERY_STRATEGIES.map(strategy => (
              <PivotItem 
                key={strategy.id} 
                headerText={strategy.name} 
                itemKey={strategy.id} 
              />
            ))}
            <PivotItem headerText="Custom" itemKey="custom" />
          </Pivot>

          {currentStrategy === "custom" && (
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="end">
              <TextField
                label="Custom Discovery Prompt"
                multiline
                rows={3}
                value={customPrompt}
                onChange={(_, newValue) => setCustomPrompt(newValue || "")}
                placeholder="Enter a custom prompt to discover files..."
                styles={{ root: { width: '100%' } }}
              />
              <PrimaryButton
                text="Execute"
                iconProps={addIcon}
                onClick={runCustomPrompt}
                disabled={loading || !customPrompt.trim()}
              />
            </Stack>
          )}

          {currentStrategy !== "auto" && currentStrategy !== "custom" && (
            <PrimaryButton
              text={`Run ${FILE_DISCOVERY_STRATEGIES.find(s => s.id === currentStrategy)?.name || ''} Strategy`}
              iconProps={refreshIcon}
              onClick={() => runSpecificStrategy(currentStrategy)}
              disabled={loading}
              styles={{ root: { marginBottom: 12 } }}
            />
          )}
        </Stack>
        
        {/* Search box */}
        <SearchBox 
          placeholder="Search files..." 
          onChange={(_, newValue) => setSearchText(newValue || "")}
          disabled={loading || files.length === 0}
        />
        
        {/* Loading indicator - shows even when files are visible */}
        {loading && (
          <ProgressIndicator 
            label={loadingMessage}
            description={`${files.length} files found so far`}
            percentComplete={loadingProgress} 
          />
        )}
        
        {analyzingFile && (
          <Stack>
            <Spinner label={`Analyzing ${analyzingFile}...`} />
            {analysisProgress && (
              <div style={{ 
                maxHeight: '200px', 
                overflow: 'auto', 
                padding: '8px', 
                marginTop: '8px',
                background: '#f9f9f9',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                fontSize: '13px',
                lineHeight: '18px'
              }}>
                <p style={{ margin: 0, fontStyle: 'italic', color: '#666' }}>Analysis in progress:</p>
                <div>{analysisProgress}</div>
              </div>
            )}
          </Stack>
        )}
        
        {error && (
          <MessageBar
            messageBarType={MessageBarType.error}
            isMultiline={true}
            onDismiss={clearError}
          >
            {error}
          </MessageBar>
        )}
        
        {/* Always show file list, even during loading */}
        <Stack.Item grow style={{ overflow: 'auto' }}>
          <DetailsList
            items={fileItems}
            columns={columns}
            selectionMode={SelectionMode.none}
            isHeaderVisible={true}
            onRenderRow={(props, defaultRender) => {
              if (!props) {
                return (
                  <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { padding: 20 } }}>
                    <Text>{loading ? "Searching for files..." : "No files found"}</Text>
                  </Stack>
                );
              }
              return defaultRender ? defaultRender(props) : null;
            }}
          />
        </Stack.Item>
        
        {/* Show filtered results count if searching */}
        {searchText && files.length > 0 && (
          <Text>
            Showing {filteredFiles.length} of {files.length} files
          </Text>
        )}
      </Stack>

      {/* Document Viewer Modal */}
      <Modal
        isOpen={isViewerOpen && !!viewingFile}
        onDismiss={closeViewer}
        isBlocking={false}
        styles={{
          main: { 
            width: '95%',
            height: '95%',
            maxWidth: '1600px',
            maxHeight: '95vh',
            padding: 0,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          },
          scrollableContent: {
            height: '100%',
            padding: 0
          }
        }}
      >
        <Stack styles={{ root: { height: '100%' } }}>
          {/* Modal header */}
          <Stack 
            horizontal 
            horizontalAlign="space-between" 
            verticalAlign="center"
            styles={{ 
              root: { 
                padding: '8px 16px',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                minHeight: '44px',
                height: '44px'
              } 
            }}
          >
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
              {viewingFile}
            </Text>
            <DefaultButton 
              onClick={closeViewer}
              styles={{ root: { minWidth: '60px', height: '32px' } }}
            >
              Close
            </DefaultButton>
          </Stack>
          
          {/* Modal content */}
          <Stack.Item grow styles={{ root: { position: 'relative', height: 'calc(100% - 44px)' } }}>
            {/* Loading spinner */}
            {iframeLoading && (
              <Stack 
                horizontalAlign="center" 
                verticalAlign="center"
                styles={{
                  root: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    zIndex: 10
                  }
                }}
              >
                <Spinner label="Loading document..." />
              </Stack>
            )}
            
            {/* Error message */}
            {iframeError && (
              <Stack
                horizontalAlign="center"
                verticalAlign="center"
                styles={{
                  root: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#f9fafb',
                    padding: 20
                  }
                }}
              >
                <MessageBar
                  messageBarType={MessageBarType.error}
                  isMultiline={true}
                >
                  <Text>Failed to load document. The file may not be available or you may not have permission to view it.</Text>
                </MessageBar>
              </Stack>
            )}
            
            {/* Document iframe */}
            <div style={{ height: '100%', width: '100%' }}>
              {viewingFile && (
                <iframe
                  src={getDocumentUrl(viewingFile)}
                  width="100%"
                  height="100%"
                  style={{ 
                    border: 'none', 
                    display: 'block',
                    backgroundColor: '#f9fafb'
                  }}
                  title="Document Viewer"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              )}
            </div>
          </Stack.Item>
        </Stack>
      </Modal>
    </Panel>
  );
};