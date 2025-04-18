'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Panel,
  PanelType,
  Stack,
  Text,
  PrimaryButton,
  DefaultButton,
  ProgressIndicator,
  MessageBar,
  MessageBarType,
  Pivot,
  PivotItem,
  TextField,
  Dropdown,
  IDropdownOption,
  Toggle,
  Spinner,
  SpinnerSize,
  IconButton,
  TooltipHost,
  Dialog,
  DialogType,
  DialogFooter,
  IIconProps,
  DetailsList,
  DetailsListLayoutMode,
  SelectionMode,
  IColumn,
  Label,
  Modal,
  mergeStyleSets,
  FontWeights,
  getTheme,
} from '@fluentui/react';
import mammoth from 'mammoth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ContractTextPreview } from './ContractTextPreview';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import {
  CancelIcon,
  ClearIcon,
  SettingsIcon,
  DownloadIcon,
  CopyIcon,
  InfoIcon,
  WarningIcon,
  RefreshIcon,
  TableIcon
} from '@fluentui/react-icons-mdl2';
import { Prompt } from '@/lib/prompt';
// Import the DataDrivenAnalysisButtons component from the second file
import { DataDrivenAnalysisButtons, analysisTypeConfig } from './DataDrivenAnalysisButtons';

// Initialize the default icon set
initializeIcons();

// Removed registerIconAliases as it is not exported from @fluentui/react/lib/Icons
// Icons
const downloadIcon: IIconProps = { iconName: 'Download' };
const copyIcon: IIconProps = { iconName: 'Copy' };
const settingsIcon: IIconProps = { iconName: 'Settings' };
const infoIcon: IIconProps = { iconName: 'Info' };
const warningIcon: IIconProps = { iconName: 'Warning' };
const refreshIcon: IIconProps = { iconName: 'Refresh' };
const tableViewIcon: IIconProps = { iconName: 'Table' };
const cardViewIcon: IIconProps = { iconName: 'ViewList' };

// Types
interface Props {
  isOpen: boolean;
  onDismiss: () => void;
  onAnalysisComplete?: (
    analysisText: string,
    risks: Risk[],
    mitigationPoints: string[],
    contractText: string
  ) => void;
}

interface AnalysisSettings {
  model: string;
  temperature: number;
  chunkSize: number;
}

interface Risk {
  category: string;
  score: string;
  text: string;
  reason: string;
  location: string;
}

type ViewMode = 'card' | 'table' | 'markdown';

type FileProcessingError = {
  message: string;
  details?: string;
};

export const ContractAnalyzerPanel: React.FC<Props> = ({ isOpen, onDismiss, onAnalysisComplete }) => {
  // State
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [contractText, setContractText] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FileProcessingError | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [parsedRisks, setParsedRisks] = useState<Risk[]>([]);
  const [mitigationPoints, setMitigationPoints] = useState<string[]>([]);
  const [selectedRiskForFix, setSelectedRiskForFix] = useState<Risk | null>(null);
  const [suggestedFix, setSuggestedFix] = useState<string>('');
  const [isGeneratingFix, setIsGeneratingFix] = useState(false);
  const [showFixModal, setShowFixModal] = useState(false);

  // Add new state for selected analysis type
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<keyof typeof analysisTypeConfig>('comprehensive');
  const [analysisPrompt, setAnalysisPrompt] = useState<string>('');
  const [contractType, setContractType] = useState('construction');
  const [isRedlineModalOpen, setIsRedlineModalOpen] = useState(false);
  const [redlineText, setRedlineText] = useState<string>('');
  const [showRedlines, setShowRedlines] = useState(true);
  const [redlineChanges, setRedlineChanges] = useState<{
    added: string[];
    removed: string[];
    modified: string[];
  }>({ added: [], removed: [], modified: [] });

  // Settings
  const [settings, setSettings] = useState<AnalysisSettings>({
    model: 'llama3-8b-8192',
    temperature: 0.1,
    chunkSize: 1500,
  });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisContainerRef = useRef<HTMLDivElement>(null);

  // Model options
  const modelOptions: IDropdownOption[] = [
    { key: 'llama3-8b-8192', text: 'Llama 3 8B (Balanced)' },
    { key: 'llama3-70b-8192', text: 'Llama 3 70B (Most Accurate)' },
    { key: 'mixtral-8x7b-32768', text: 'Mixtral 8x7B (Fast)' },
    { key: 'gemma-7b-it', text: 'Gemma 7B (Economical)' },
  ];
  
  // Then update your settings state to use a Groq model as default
  

  // Contract type options
  const contractTypeOptions: IDropdownOption[] = [
    { key: 'construction', text: 'Construction Contract' },
    { key: 'service', text: 'Service Agreement' },
    { key: 'purchase', text: 'Purchase Agreement' },
    { key: 'employment', text: 'Employment Contract' },
    { key: 'lease', text: 'Lease Agreement' },
    { key: 'loan', text: 'Loan Agreement' },
    { key: 'license', text: 'License Agreement' },
    { key: 'consulting', text: 'Consulting Agreement' },
    { key: 'distribution', text: 'Distribution Agreement' },
    { key: 'general', text: 'General Contract' },
  ];

  // Handle analysis type selection
  const handleAnalysisTypeSelect = (analysisType: string, prompt: string) => {
    setSelectedAnalysisType(analysisType as keyof typeof analysisTypeConfig);
    
    // Only store the prompt text if specifically provided by the button
    if (prompt && prompt.length > 0) {
      setAnalysisPrompt(prompt);
    } else {
      // Otherwise clear it to use the prompt from the prompt system
      setAnalysisPrompt('');
    }
  };

  // Table columns for risk table view
  const riskColumns: IColumn[] = [
    {
      key: 'category',
      name: 'Risk Category',
      fieldName: 'category',
      minWidth: 120,
      maxWidth: 180,
      isResizable: true,
    },
    {
      key: 'score',
      name: 'Score',
      fieldName: 'score',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
      onRender: (item: Risk) => (
        <div className={`px-1.5 py-0.5 rounded text-xs font-bold text-white inline-block`} style={{ backgroundColor: getRiskScoreColor(item.score) }}>
          {item.score}
        </div>
      ),
    },
    {
      key: 'location',
      name: 'Location',
      fieldName: 'location',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
    },
    {
      key: 'text',
      name: 'Contract Text',
      fieldName: 'text',
      minWidth: 150,
      isResizable: true,
      onRender: (item: Risk) => (
        <div className="italic">"{item.text}"</div>
      ),
    },
    {
      key: 'reason',
      name: 'Why This Is a Risk',
      fieldName: 'reason',
      minWidth: 200,
      isResizable: true,
    },
  ];

  // Helper function to get color based on risk score
  const getRiskScoreColor = (score: string) => {
    switch (score.toLowerCase()) {
      case 'critical': return '#ef4444'; // Red
      case 'high': return '#f97316';     // Orange
      case 'medium': return '#eab308';   // Yellow
      case 'low': return '#22c55e';      // Green
      default: return '#6b7280';         // Gray
    }
  };

  // Reset state
  const resetState = () => {
    setFileName('');
    setFileSize(null);
    setContractText('');
    setAnalysis('');
    setError(null);
    setProgress(0);
    setTotalChunks(0);
    setCurrentChunk(0);
    setActiveTab('analysis');
    setParsedRisks([]);
    setMitigationPoints([]);
    setSelectedAnalysisType('comprehensive');
    setAnalysisPrompt('');
  };
  interface ContractAnalysisResponse {
    risks: Array<{
      id: number;
      category: string;
      score: string;
      text: string;
      reason: string;
      location: string;
    }>;
    mitigation: string[];
  }

  const extractJSONFromResponse = (text: string): ContractAnalysisResponse | null => {
    try {
      // First try direct parsing in case the entire response is valid JSON
      const directParse = JSON.parse(text);
      if (isValidAnalysisResponse(directParse)) {
        return directParse;
      }
    } catch (e) {
      // Not valid JSON, continue with extraction
    }
  
    // Try to find a JSON block in the text
    try {
      // Look for text that starts with { and ends with }
      const jsonRegex = /\{[\s\S]*\}/;
      const match = text.match(jsonRegex);
      
      if (match) {
        const jsonStr = match[0];
        const parsed = JSON.parse(jsonStr);
        
        if (isValidAnalysisResponse(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to extract JSON from response:', e);
    }
    
    return null;
  };
  const isValidAnalysisResponse = (obj: any): obj is ContractAnalysisResponse => {
    interface RiskItem {
      id: number;
      category: string;
      score: string;
      text: string;
      reason: string;
      location: string;
    }

    interface ContractAnalysisResponse {
      risks: RiskItem[];
      mitigation: string[];
    }

    return (
      typeof obj === 'object' &&
      obj !== null &&
      Array.isArray(obj.risks) &&
      obj.risks.length > 0 &&
      obj.risks.every((risk: RiskItem) => 
        typeof risk.id === 'number' &&
        typeof risk.category === 'string' &&
        typeof risk.score === 'string' &&
        typeof risk.text === 'string' &&
        typeof risk.reason === 'string' &&
        typeof risk.location === 'string'
      ) &&
      Array.isArray(obj.mitigation) &&
      obj.mitigation.every((item: string) => typeof item === 'string')
    );
  };
  // Handle file upload via drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length) {
      await processFile(files[0]);
    }
  };

  // Handle file upload via file input
  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  // Process the uploaded file
  const processFile = async (file: File) => {
    try {
      setError(null);
      setLoading(true);
      setFileName(file.name);
      setFileSize(file.size);

      // Check file size
      const maxSizeInBytes = 15 * 1024 * 1024; // 15MB
      if (file.size > maxSizeInBytes) {
        throw {
          message: 'File too large',
          details: 'The maximum file size is 15MB. Please try a smaller file or split your contract.'
        };
      }

      let text = '';

      // Process based on file type
      if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.docx')
      ) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          text = result.value;

          if (result.messages.length > 0 && result.messages.some(m => m.type === 'warning')) {
            console.warn('Mammoth warnings:', result.messages);
          }
        } catch (docxError) {
          throw {
            message: 'DOCX processing error',
            details: 'Unable to extract text from this Word document. The file might be corrupted or in an unsupported format.'
          };
        }
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        text = await file.text();
      } else {
        throw {
          message: 'Unsupported file type',
          details: 'Please upload a DOCX or TXT file.'
        };
      }

      if (!text.trim()) {
        throw {
          message: 'Empty document',
          details: 'No text could be extracted from this document. It might be empty or in an unsupported format.'
        };
      }

      setContractText(text);
      setShowPreview(true);
      setActiveTab('preview');

    } catch (error: any) {
      console.error('File processing error:', error);
      setError(error.message && typeof error.message === 'string'
        ? error
        : { message: 'Unknown error', details: 'An unknown error occurred while processing the file.' });
    } finally {
      setLoading(false);
    }
  };

  // Improved chunking algorithm that tries to preserve paragraph structure
  const chunkText = (text: string, maxWords = 1500): string[] => {
    // Clean up the text
    const cleanText = text.replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // If text is small enough to fit in one chunk, return it
    if (cleanText.split(/\s+/).length <= maxWords) {
      return [cleanText];
    }

    // Split by paragraphs
    const paragraphs = cleanText.split(/\n{2,}/).filter(p => p.trim().length > 0);

    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentWordCount = 0;

    // Group paragraphs into chunks
    for (const paragraph of paragraphs) {
      const paragraphWordCount = paragraph.split(/\s+/).length;

      // If a single paragraph is larger than maxWords, split it
      if (paragraphWordCount > maxWords) {
        // If we have anything in the current chunk, add it first
        if (currentWordCount > 0) {
          chunks.push(currentChunk.join('\n\n'));
          currentChunk = [];
          currentWordCount = 0;
        }

        // Split large paragraph into sentences
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        let sentenceChunk: string[] = [];
        let sentenceWordCount = 0;

        for (const sentence of sentences) {
          const sentenceWords = sentence.trim().split(/\s+/).length;

          if (sentenceWordCount + sentenceWords <= maxWords) {
            sentenceChunk.push(sentence.trim());
            sentenceWordCount += sentenceWords;
          } else {
            // Add current sentence chunk if not empty
            if (sentenceChunk.length > 0) {
              chunks.push(sentenceChunk.join(' '));
              sentenceChunk = [sentence.trim()];
              sentenceWordCount = sentenceWords;
            } else {
              // If a single sentence is too long, force-split it by words
              const words = sentence.trim().split(/\s+/);
              let wordChunk: string[] = [];

              for (const word of words) {
                if (wordChunk.length < maxWords) {
                  wordChunk.push(word);
                } else {
                  chunks.push(wordChunk.join(' '));
                  wordChunk = [word];
                }
              }

              if (wordChunk.length > 0) {
                chunks.push(wordChunk.join(' '));
              }
            }
          }
        }

        // Add any remaining sentences
        if (sentenceChunk.length > 0) {
          chunks.push(sentenceChunk.join(' '));
        }
      }
      // Normal paragraph handling
      else if (currentWordCount + paragraphWordCount <= maxWords) {
        currentChunk.push(paragraph);
        currentWordCount += paragraphWordCount;
      } else {
        // Current chunk is full, add it to chunks and start a new one
        chunks.push(currentChunk.join('\n\n'));
        currentChunk = [paragraph];
        currentWordCount = paragraphWordCount;
      }
    }

    // Add the last chunk if not empty
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
    }

    return chunks;
  };

  // Construction contract analysis prompt - updated to work with the new prompt system
  const getPrompt = () => {
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
  };
  
  // Function to generate document redlines
  const generateRedlines = (originalText: string, revisedText: string) => {
    // This would normally call a diff algorithm like diff-match-patch or similar
    // For now, we're just using the sample redlines from the button click
    console.log("Would generate redlines between original and revised texts");
    
    // In a real implementation, this would analyze the diff and extract the changes
    // Here we're just using the sample data set when the comparison button is clicked
  };
  
  // Parse risks from raw analysis text
  const parseRisksFromAnalysis = (rawAnalysis: string): Risk[] => {
    // First try to parse as JSON (from new improved prompt)
    
    try {
      // Look for JSON structure in the text
      const jsonData = extractJSONFromResponse(rawAnalysis);
  
      if (jsonData) {
        return jsonData.risks.map(risk => ({
          category: risk.category,
          score: risk.score,
          text: risk.text,
          reason: risk.reason,
          location: risk.location
        }));
      }
    
    } catch (e) {
      console.log('JSON parsing failed, falling back to regex parsing', e);
      // Continue with regex parsing as a fallback
    }
  
    // Fallback to regex parsing for non-JSON formatted responses
    const risks: Risk[] = [];
  
    // Try to find risks with the expected structure
    const riskSections = rawAnalysis.split(/\n\s*(?:Risk \d+:|Risk Category:)/i);
    
    for (let i = 1; i < riskSections.length; i++) { // Start from 1 to skip the intro part
      const section = "Risk Category:" + riskSections[i].trim();
      
      try {
        // Extract category
        const categoryMatch = section.match(/Risk Category:\s*([^$\n]*?)(?=\s*Risk Score:|$)/i);
        const category = categoryMatch ? categoryMatch[1].trim() : 'Unknown Category';
        
        // Extract score
        const scoreMatch = section.match(/Risk Score:\s*([^$\n]*?)(?=\s*Risky Contract Text:|$)/i);
        const score = scoreMatch ? scoreMatch[1].trim() : 'Unknown Score';
        
        // Extract text
        const textMatch = section.match(/(?:Risky Contract Text:|Contract Text:)\s*(?:"([^"]*?)"|([^"$\n]*?)(?=\s*Why This Is a Risk:|$))/i);
        const text = textMatch ? (textMatch[1] || textMatch[2] || '').trim() : 'Unknown Text';
        
        // Extract reason
        const reasonMatch = section.match(/Why This Is a Risk:\s*([^$\n]*?)(?=\s*Contract Location:|$)/i);
        const reason = reasonMatch ? reasonMatch[1].trim() : 'Unknown Reason';
        
        // Extract location
        const locationMatch = section.match(/Contract Location:\s*([^$\n]*?)(?=\s*(?:Risk Category:|Risk \d+:|Mitigation Summary:|$))/i);
        const location = locationMatch ? locationMatch[1].trim() : 'Unknown Location';
        
        // Only add if we have at least category and score
        if (category !== 'Unknown Category' || score !== 'Unknown Score') {
          risks.push({
            category,
            score,
            text,
            reason,
            location
          });
        }
      } catch (e) {
        console.error('Error parsing risk section:', e);
      }
    }
  
    return risks;
  };
 
// Then update the generateFixSuggestion function to use Groq instead of OpenAI:
const generateFixSuggestion = async (risk: Risk) => {
  if (!risk) return;
  
  setIsGeneratingFix(true);
  setSelectedRiskForFix(risk);
  setSuggestedFix(''); // Clear previous suggestion
  setShowFixModal(true); // Make sure the modal is shown right away
  
  try {
    // Prepare the prompt for generating a fix
    const fixPrompt = `
You are an expert contract attorney. Review the following contract clause that has been identified as risky and suggest specific language to fix the issue.

RISK CATEGORY: ${risk.category}
RISK SEVERITY: ${risk.score}
PROBLEMATIC CONTRACT TEXT: "${risk.text}"
ISSUE DESCRIPTION: ${risk.reason}
LOCATION IN CONTRACT: ${risk.location}

Please provide:
1. A specific rewritten version of this clause that would fix the issue
2. A brief explanation of how your rewrite addresses the risk
3. Any additional advice on implementing this change
    `;
    
    // Call the Groq API to generate a fix
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192', // Groq's models like 'llama3-8b-8192' or 'mixtral-8x7b-32768'
        messages: [{ role: 'user', content: fixPrompt }],
        temperature: 0.7, // Slightly higher temperature for more creative solutions
        max_tokens: 2048, // Adjust based on expected response length
      }),
    });
    
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    const fixContent = data.choices?.[0]?.message?.content;
    
    if (fixContent) {
      setSuggestedFix(fixContent);
    } else {
      throw new Error('No content received from API');
    }
  } catch (error) {
    console.error('Error generating fix:', error);
    setSuggestedFix('Failed to generate a fix suggestion. Please try again.');
  } finally {
    setIsGeneratingFix(false);
  }
};
  // Add a function for the highlight in document feature
  const highlightInDocument = (risk: Risk, index: number) => {
    setActiveTab('preview');
    
    // Wait for the tab change to take effect
    setTimeout(() => {
      // Find text occurrences in the document
      const previewContainer = document.querySelector('.contract-text-preview-container');
      if (!previewContainer) return;
      
      // Create a unique ID for this risk in the document
      const riskId = `risk-highlight-${index}`;
      
      // Clean up any previous highlights
      const existingHighlights = previewContainer.querySelectorAll('.risk-highlight');
      existingHighlights.forEach(el => {
        const text = el.textContent;
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(text || ''), el);
        }
      });
      
      // Find and highlight all occurrences of this text
      if (risk.text && risk.text.length > 10) { // Only highlight if text is substantial
        const textNodes = getTextNodes(previewContainer);
        let foundHighlight = false;
        
        textNodes.forEach((node, i) => {
          const nodeText = node.nodeValue || '';
          const riskTextIndex = nodeText.indexOf(risk.text);
          
          if (riskTextIndex !== -1) {
            foundHighlight = true;
            
            // Split the text node and create a highlight span
            const before = nodeText.substring(0, riskTextIndex);
            const after = nodeText.substring(riskTextIndex + risk.text.length);
            
            const span = document.createElement('span');
            span.className = 'risk-highlight highlight-pulse';
            span.id = riskId;
            span.textContent = risk.text;
            span.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            span.style.borderBottom = `2px solid ${getRiskScoreColor(risk.score)}`;
            span.style.padding = '1px 0';
            
            // Add tooltip with risk info
            span.title = `${risk.category} (${risk.score}): ${risk.reason}`;
            
            const fragment = document.createDocumentFragment();
            if (before) fragment.appendChild(document.createTextNode(before));
            fragment.appendChild(span);
            if (after) fragment.appendChild(document.createTextNode(after));
            
            const parent = node.parentNode;
            if (parent) {
              parent.replaceChild(fragment, node);
            }
          }
        });
        
        // Scroll to the highlight if found
        if (foundHighlight) {
          const highlightElement = document.getElementById(riskId);
          if (highlightElement) {
            highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            highlightElement.classList.add('highlight-pulse');
            // Keep the pulse animation for visibility
          }
        } else {
          // If text not found exactly, try finding the closest match
          // This is helpful for long or truncated text
          findClosestTextMatch(previewContainer, risk.text, riskId, risk);
        }
      }
    }, 100);
  };
  
  // Helper function to get all text nodes in a container
  const getTextNodes = (element: Element): Text[] => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          return node.textContent?.trim() 
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }
    
    return textNodes;
  };
  
  // Helper function to find closest text match for hard-to-find text
  const findClosestTextMatch = (container: Element, searchText: string, riskId: string, risk: Risk) => {
    // Try with a substring if the text is long
    if (searchText.length > 40) {
      const shortSearchText = searchText.substring(0, 40);
      const textNodes = getTextNodes(container);
      
      for (const node of textNodes) {
        const nodeText = node.nodeValue || '';
        if (nodeText.includes(shortSearchText)) {
          // Found a partial match
          const span = document.createElement('span');
          span.className = 'risk-highlight highlight-pulse';
          span.id = riskId;
          span.textContent = nodeText;
          span.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          span.style.borderBottom = `2px solid ${getRiskScoreColor(risk.score)}`;
          
          const parent = node.parentNode;
          if (parent) {
            parent.replaceChild(span, node);
            span.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
      }
    }
    
    // If still not found, try using location information
    if (risk.location) {
      const locationPattern = new RegExp(`(Section|Article)\\s+${risk.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      const textNodes = getTextNodes(container);
      
      for (const node of textNodes) {
        const nodeText = node.nodeValue || '';
        if (locationPattern.test(nodeText)) {
          // Found the section heading
          const span = document.createElement('span');
          span.className = 'risk-highlight highlight-pulse';
          span.id = riskId;
          span.textContent = nodeText;
          span.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          span.style.borderBottom = `2px solid ${getRiskScoreColor(risk.score)}`;
          
          const parent = node.parentNode;
          if (parent) {
            parent.replaceChild(span, node);
            span.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
      }
    }
  };
  
  // Add a modal component for displaying the suggested fix
  const renderFixSuggestionModal = () => (
    <Modal
      isOpen={showFixModal}
      onDismiss={() => setShowFixModal(false)}
      isBlocking={false}
      containerClassName={modalStyles.container}
    >
      <div className={modalStyles.header}>
        <span>Suggested Fix for {selectedRiskForFix?.category}</span>
        <IconButton
          iconProps={{ iconName: 'Cancel' }}
          ariaLabel="Close suggestion"
          onClick={() => setShowFixModal(false)}
          styles={{
            root: {
              color: theme.palette.neutralPrimary,
              marginLeft: 'auto',
              marginTop: '4px',
              marginRight: '2px',
            },
            rootHovered: {
              color: theme.palette.neutralDark,
            },
          }}
        />
      </div>
      <div className={modalStyles.body}>
        {isGeneratingFix ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Spinner size={SpinnerSize.large} label="Generating suggestion..." />
            <Text className="mt-4 text-gray-500">
              Using AI to craft an improved contract clause...
            </Text>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="mb-4">
              <Text variant="large" className="font-semibold">
                Original Text:
              </Text>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-2 rounded">
                <Text className="italic">"{selectedRiskForFix?.text}"</Text>
                <Text className="mt-2 text-xs text-gray-500">
                  {selectedRiskForFix?.location}
                </Text>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
              <Text variant="large" className="font-semibold">
                Suggested Improvement:
              </Text>
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mt-2 rounded">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {suggestedFix}
                </ReactMarkdown>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <DefaultButton
                text="Copy Suggestion"
                iconProps={{ iconName: 'Copy' }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(suggestedFix);
                    alert('Suggestion copied to clipboard');
                  } catch (err) {
                    console.error('Failed to copy:', err);
                  }
                }}
                className="bg-gray-50 hover:bg-gray-100 border-gray-300"
              />
              <PrimaryButton
                text="Close"
                onClick={() => setShowFixModal(false)}
                className="bg-indigo-600 hover:bg-indigo-700"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );

  // Parse mitigation points from raw analysis text
  const parseMitigationFromAnalysis = (rawAnalysis: string): string[] => {
    // First try to parse as JSON (from new improved prompt)
    try {
      // Look for JSON structure in the text
      const jsonData = extractJSONFromResponse(rawAnalysis);
  
      if (jsonData) {
        return jsonData.mitigation;
      }
      
    } catch (e) {
      console.log('JSON parsing failed, falling back to regex parsing', e);
      // Continue with regex parsing as a fallback
    }
  
    // Fallback to traditional parsing methods
    const mitigationPatterns = [
      /Mitigation Summary:([\s\S]*?)(?=$)/i,
      /Mitigation Recommendations:([\s\S]*?)(?=$)/i,
      /Recommended Mitigations:([\s\S]*?)(?=$)/i,
      /Mitigation Strategies:([\s\S]*?)(?=$)/i,
    ];
  
    for (let i = 0; i < mitigationPatterns.length; i++) {
      const mitigationMatch = rawAnalysis.match(mitigationPatterns[i]);
      if (mitigationMatch) {
        // Extract bullet points and number lists
        const points = mitigationMatch[1]
          .split(/\n/)
          .map(line => line.trim())
          .filter(line => 
            (line.startsWith('-') || 
             line.startsWith('•') || 
             line.startsWith('*') || 
             /^\d+\./.test(line)) && 
            line.length > 10
          )
          .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, ''));
        
        // Deduplicate and limit to 10 points max
        const uniquePoints = [...new Set(points)].slice(0, 10);
        return uniquePoints;
      }
    }
  
    return [];
  };
  const preprocessAnalysisResponse = (response: string): string => {
    // Remove any system notes or redundant parts
    let cleaned = response
      .replace(/Part \d+ of \d+/g, '')
      .replace(/^(As a|I am a|Acting as a).*?analyst.*?\n/im, '')
      .replace(/\*\*CONSTRUCTION CONTRACT RISK ANALYSIS\*\*/g, '')
      .replace(/\*\*ROLE AND OBJECTIVE\*\*[\s\S]*?\*\*ANALYSIS FRAMEWORK\*\*/g, '')
      .replace(/\*\*ANALYTICAL APPROACH\*\*[\s\S]*?\*\*IMPORTANT NOTES\*\*/g, '')
      .replace(/\*\*OUTPUT FORMAT\*\*[\s\S]*?ensure proper parsing/g, '')
      .replace(/\*\*PRIORITY RISK AREAS\*\*[\s\S]*?\*\*MITIGATION SUMMARY\*\*/g, '');
    
    return cleaned;
  };
  
  
  // Handle the analysis process
  const handleAnalyze = async () => {
  if (!contractText) return;

  try {
    setLoading(true);
    setError(null);
    setAnalysis('');
    setParsedRisks([]);
    setMitigationPoints([]);
    setProgress(0);
    setActiveTab('analysis');
    
    const chunks = chunkText(contractText, settings.chunkSize);
    setTotalChunks(chunks.length);
    
    let fullAnalysis = '';
    
    const promptIntro = getPrompt();
    
    for (let i = 0; i < chunks.length; i++) {
      setCurrentChunk(i + 1);
      
      try {
        const chunkPrompt = `${promptIntro}\n\n--- Contract Excerpt (Part ${i + 1} of ${chunks.length}) ---\n${chunks[i]}`;
        
        // Using Groq API call
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192', // or your preferred Groq model
            messages: [{ role: 'user', content: chunkPrompt }],
            temperature: settings.temperature,
            max_tokens: 4096, // Adjust based on expected response length
          }),
        });
        
        if (!res.ok) {
          let errorMessage = `API error: ${res.status} ${res.statusText}`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.error?.message || errorMessage;
          } catch (e) {
            // If JSON parsing fails, use the status text
          }
          throw new Error(errorMessage);
        }
        
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (content) {
          const partHeader = chunks.length > 1 
            ? `Part ${i + 1} of ${chunks.length}\n`
            : '';
            
          fullAnalysis += (i > 0 ? '\n\n' : '') + partHeader + content;
          
          // Preprocess the response before setting it
          const cleanedAnalysis = preprocessAnalysisResponse(fullAnalysis);
          setAnalysis(cleanedAnalysis);
          
          // Parse risks and mitigation points from cleaned analysis
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
    
    // Analysis is complete - determine if we should show the highlighted view
    const finalRisks = parseRisksFromAnalysis(fullAnalysis);
    const finalMitigation = parseMitigationFromAnalysis(fullAnalysis);
    
    // Set final state
    setParsedRisks(finalRisks);
    setMitigationPoints(finalMitigation);
    
    // Call the onAnalysisComplete callback if provided
    if (onAnalysisComplete) {
      onAnalysisComplete(fullAnalysis, finalRisks, finalMitigation, contractText);
    }
    
    // If we found risks, switch to the highlighted view to show them in context
    if (finalRisks.length > 0) {
      // If using the separate tab approach:
      if (viewMode === 'card' || viewMode === 'table') {
        // Wait a moment to let the UI update with analysis before switching tabs
        setTimeout(() => {
          // Option 1: Switch directly to preview tab with highlights
          setActiveTab('preview');
          
          // Option 2: If you added a dedicated highlights tab
          // setActiveTab('highlighted');
        }, 500);
      }
      
      // Scroll to top of analysis
      if (analysisContainerRef.current) {
        analysisContainerRef.current.scrollTop = 0;
      }
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
};

  // Handle copy to clipboard
  const handleCopyToClipboard = async () => {
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
  };

  // Handle export as markdown
  const handleExportMarkdown = () => {
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
  };

  // Format file size for display
  const formatFileSize = (bytes: number | null): string => {
    if (bytes === null) return '';
    if (bytes === 0) return '0 Bytes';

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Effect to reset error state when file changes
  useEffect(() => {
    if (fileName) {
      setError(null);
    }
  }, [fileName]);

  // Add CSS for redline styles
  useEffect(() => {
    // Add CSS for redline styling and highlight pulse animation
    // These specific styles can't be handled by Tailwind alone
    const style = document.createElement('style');
    style.textContent = `
      .redline-content ins {
        background-color: #ddffdd;
        text-decoration: none;
      }
      .redline-content del {
        background-color: #ffdddd;
        text-decoration: line-through;
      }
      .redline-content {
        font-family: 'Segoe UI', 'San Francisco', sans-serif;
        line-height: 1.6;
        font-size: 14px;
      }
      
      @keyframes highlight-pulse {
        0% { background-color: rgba(249, 250, 251, 0); }
        50% { background-color: rgba(239, 246, 255, 0.6); }
        100% { background-color: rgba(249, 250, 251, 0); }
      }
      
      .highlight-pulse {
        animation: highlight-pulse 2s ease-in-out;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Render error message
  const renderError = () => {
    if (!error) return null;

    return (
      <MessageBar
        messageBarType={MessageBarType.error}
        isMultiline={true}
        dismissButtonAriaLabel="Close"
        onDismiss={() => setError(null)}
      >
        <strong>{error.message}</strong>
        {error.details && <div className="mt-2">{error.details}</div>}
      </MessageBar>
    );
  };

  // Render risk card component
  const RiskCard = ({ risk, index }: { risk: Risk, index: number }) => {
    return (
      <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white shadow-sm"
        style={{ borderLeftWidth: '4px', borderLeftColor: getRiskScoreColor(risk.score) }}>
        <div className="flex justify-between items-center mb-2">
          <Text variant="large" className="font-semibold">
            Risk {index + 1}: {risk.category}
          </Text>
          <div className="px-2 py-1 rounded text-xs font-bold text-white"
            style={{ backgroundColor: getRiskScoreColor(risk.score) }}>
            {risk.score}
          </div>
        </div>
  
        <Text variant="small" className="text-gray-500 mb-2">
          <b>Location:</b> {risk.location}
        </Text>
  
        <div className="bg-gray-50 p-3 rounded mb-2 border-l-2 border-gray-300 italic">
          "{risk.text}"
        </div>
  
        <Text>
          <b>Why This Is a Risk:</b> {risk.reason}
        </Text>
        
        <div className="mt-3 flex gap-2">
          <DefaultButton
            text="Highlight in Document"
            iconProps={{ iconName: 'Search' }}
            onClick={() => highlightInDocument(risk, index)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 text-xs"
          />
          <DefaultButton
            text="Suggest Fix"
            iconProps={{ iconName: 'Edit' }}
            onClick={() => generateFixSuggestion(risk)}
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300 text-xs"
          />
        </div>
      </div>
    );
  };

  // Render analysis content based on view mode
  const renderAnalysisContent = () => {
    if (!analysis || loading) return null;

    switch (viewMode) {
      case 'card':
        return (
          <div>
            <Text variant="xLarge" className="font-semibold mb-4">
              Contract Risk Analysis
            </Text>

            {parsedRisks.map((risk, index) => (
              <RiskCard key={index} risk={risk} index={index} />
            ))}

            {mitigationPoints.length > 0 && (
              <>
                <Text variant="xLarge" className="font-semibold mt-6 mb-4">
                  Mitigation Summary
                </Text>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  {mitigationPoints.map((point, index) => (
                    <div key={index} className={index === mitigationPoints.length - 1 ? '' : 'mb-2'}>
                      • {point}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case 'table':
        return (
          <div>
            <Text variant="xLarge" className="font-semibold mb-4">
              Contract Risk Analysis
            </Text>

            <DetailsList
              items={parsedRisks}
              columns={riskColumns}
              layoutMode={DetailsListLayoutMode.justified}
              selectionMode={SelectionMode.none}
              isHeaderVisible={true}
              styles={{ root: { marginBottom: '24px' } }}
            />

            {mitigationPoints.length > 0 && (
              <>
                <Text variant="xLarge" className="font-semibold mt-6 mb-4">
                  Mitigation Summary
                </Text>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  {mitigationPoints.map((point, index) => (
                    <div key={index} className={index === mitigationPoints.length - 1 ? '' : 'mb-2'}>
                      • {point}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case 'markdown':
        return (
          <div className="prose max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
            >
              {analysis}
            </ReactMarkdown>
          </div>
        );

      default:
        return null;
    }
  };

  // Settings dialog
  const renderSettingsPanel = () => (
    <Dialog
      hidden={!showSettings}
      onDismiss={() => setShowSettings(false)}
      dialogContentProps={{
        type: DialogType.normal,
        title: 'Analysis Settings',
      }}
      modalProps={{
        isBlocking: false,
        styles: { main: { maxWidth: 450 } },
      }}
    >
      <div className="p-4">
        <div className="py-3 border-b border-gray-200 mb-4">
          <Dropdown
            label="AI Model"
            selectedKey={settings.model}
            options={modelOptions}
            onChange={(_, option) => option && setSettings({ ...settings, model: option.key as string })}
            styles={{
              dropdown: {
                border: '1px solid #d1d5db',
                selectors: {
                  ':hover': { borderColor: '#9ca3af' },
                  ':focus': { borderColor: '#4f46e5' },
                }
              },
              title: {
                backgroundColor: '#f9fafb',
                border: '1px solid #d1d5db',
              },
              caretDownWrapper: { color: '#4b5563' },
              label: { fontWeight: 600, color: '#111827' }
            }}
          />

          <Stack tokens={{ childrenGap: 10 }}>
            <Text>Temperature: {settings.temperature.toFixed(1)}</Text>
            <Stack horizontal tokens={{ childrenGap: 8 }}>
              <Text>0.0</Text>
              <Stack.Item grow>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </Stack.Item>
              <Text>1.0</Text>
            </Stack>
            <Text className="text-xs text-gray-500">
              Lower values are more focused, higher values are more creative
            </Text>
          </Stack>
        </div>

        <div className="mb-4">
          <TextField
            label="Chunk Size (words)"
            type="number"
            value={settings.chunkSize.toString()}
            onChange={(_, value) => value && setSettings({ ...settings, chunkSize: Math.max(100, Math.min(3000, parseInt(value))) })}
            min={100}
            max={3000}
            styles={{
              fieldGroup: {
                border: '1px solid #d1d5db',
                selectors: {
                  ':hover': { borderColor: '#9ca3af' },
                  ':focus-within': { borderColor: '#4f46e5' },
                }
              },
              field: { backgroundColor: '#f9fafb' }
            }}
            onRenderLabel={(props) => (
              <span style={{ fontWeight: 600, color: '#111827' }}>
                {props?.label}
              </span>
            )}
          />
          <Text className="text-xs text-gray-500 mt-1">
            Larger chunks provide more context but may be less accurate (100-3000)
          </Text>
        </div>

        <div className="mb-4">
          <Dropdown
            label="Contract Type"
            selectedKey={contractType}
            options={contractTypeOptions}
            onChange={(_, option) => option && setContractType(option.key as string)}
            styles={{
              dropdown: {
                border: '1px solid #d1d5db',
                selectors: {
                  ':hover': { borderColor: '#9ca3af' },
                  ':focus': { borderColor: '#4f46e5' },
                }
              },
              title: {
                backgroundColor: '#f9fafb',
                border: '1px solid #d1d5db',
              },
              caretDownWrapper: { color: '#4b5563' },
              label: { fontWeight: 600, color: '#111827' }
            }}
          />
          <Text className="text-xs text-gray-500 mt-1">
            Selecting the correct contract type improves analysis accuracy
          </Text>
        </div>

        <div className="mb-4">
          <Label className="font-semibold text-gray-900 mb-2">Results View</Label>
          <Stack horizontal tokens={{ childrenGap: 10 }}>
            <DefaultButton
              text="Card View"
              iconProps={cardViewIcon}
              onClick={() => setViewMode('card')}
              checked={viewMode === 'card'}
              className={viewMode === 'card' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-gray-50 border-gray-300 text-gray-600'}
            />
            <DefaultButton
              text="Table View"
              iconProps={tableViewIcon}
              onClick={() => setViewMode('table')}
              checked={viewMode === 'table'}
              className={viewMode === 'table' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-gray-50 border-gray-300 text-gray-600'}
            />
            <DefaultButton
              text="Raw View"
              iconProps={{ iconName: 'Code' }}
              onClick={() => setViewMode('markdown')}
              checked={viewMode === 'markdown'}
              className={viewMode === 'markdown' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-gray-50 border-gray-300 text-gray-600'}
            />
          </Stack>
          <Text className="text-xs text-gray-500 mt-2">
            Choose how to display the analysis results
          </Text>
        </div>
      </div>

      <DialogFooter>
        <DefaultButton
          onClick={() => setSettings({
            model: 'gpt-4',
            temperature: 0.4,
            chunkSize: 1500,
          })}
          text="Reset to Defaults"
          className="bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
        />
        <PrimaryButton
          onClick={() => setShowSettings(false)}
          text="Apply"
          className="bg-indigo-600 hover:bg-indigo-700"
        />
      </DialogFooter>
    </Dialog>
  );

  // Confirmation dialog for reset
  const renderResetConfirmation = () => (
    <Dialog
      hidden={!confirmReset}
      onDismiss={() => setConfirmReset(false)}
      dialogContentProps={{
        type: DialogType.normal,
        title: 'Reset Analysis',
        subText: 'This will clear the current document and analysis. Are you sure you want to continue?',
      }}
      modalProps={{
        isBlocking: true,
        styles: { main: { maxWidth: 450 } },
      }}
    >
      <DialogFooter>
        <DefaultButton
          onClick={() => setConfirmReset(false)}
          text="Cancel"
          className="bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
        />
        <PrimaryButton
          onClick={() => {
            resetState();
            setConfirmReset(false);
          }}
          text="Yes, Reset"
          className="bg-red-500 hover:bg-red-600"
        />
      </DialogFooter>
    </Dialog>
  );

  // Modal styles for redline view
  const theme = getTheme();
  const modalStyles = mergeStyleSets({
    container: {
      display: 'flex',
      flexFlow: 'column nowrap',
      alignItems: 'stretch',
      width: '80vw',
      maxWidth: '80vw',
      height: '80vh',
    },
    header: [
      theme.fonts.xLargePlus,
      {
        flex: '1 1 auto',
        borderTop: `4px solid ${theme.palette.themePrimary}`,
        display: 'flex',
        alignItems: 'center',
        fontWeight: FontWeights.semibold,
        padding: '12px 12px 14px 24px',
      },
    ],
    body: {
      flex: '4 4 auto',
      padding: '0 24px 24px 24px',
      overflowY: 'hidden',
      selectors: {
        p: { margin: '14px 0' },
        'p:first-child': { marginTop: 0 },
        'p:last-child': { marginBottom: 0 },
      },
    },
    redlineContainer: {
      height: 'calc(100% - 20px)',
      overflowY: 'auto',
      border: '1px solid #e5e7eb',
      borderRadius: '4px',
      padding: '16px',
      backgroundColor: '#fff',
    },
  });

  // Render redline modal
  const renderRedlineModal = () => (
    <Modal
      isOpen={isRedlineModalOpen}
      onDismiss={() => setIsRedlineModalOpen(false)}
      isBlocking={false}
      containerClassName={modalStyles.container}
    >
      <div className={modalStyles.header}>
        <span>Contract Redline Comparison</span>
        <IconButton
          iconProps={{ iconName: 'Cancel' }}
          ariaLabel="Close redline view"
          onClick={() => setIsRedlineModalOpen(false)}
          styles={{
            root: {
              color: theme.palette.neutralPrimary,
              marginLeft: 'auto',
              marginTop: '4px',
              marginRight: '2px',
            },
            rootHovered: {
              color: theme.palette.neutralDark,
            },
          }}
        />
      </div>
      <div className={modalStyles.body}>
        <div className="mb-4 flex items-center justify-between">
          <Text variant="large" className="font-semibold">
            Changes Detected
          </Text>
          <Toggle
            label="Show Redlines"
            checked={showRedlines}
            onChange={(_, checked) => setShowRedlines(!!checked)}
            styles={{ root: { margin: 0 } }}
          />
        </div>
        
        <div className="flex mb-4">
          <div className="mr-8">
            <Text className="font-semibold text-green-600">
              {redlineChanges.added.length} Additions
            </Text>
          </div>
          <div className="mr-8">
            <Text className="font-semibold text-red-600">
              {redlineChanges.removed.length} Removals
            </Text>
          </div>
          <div>
            <Text className="font-semibold text-blue-600">
              {redlineChanges.modified.length} Modifications
            </Text>
          </div>
        </div>
        
        <div className={modalStyles.redlineContainer}>
          <div className="redline-content" 
            dangerouslySetInnerHTML={{ 
              __html: showRedlines ? redlineText : redlineText.replace(/<ins[^>]*>|<\/ins>|<del[^>]*>|<\/del>/g, '') 
            }} 
          />
        </div>
      </div>
    </Modal>
  );

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      type={PanelType.large}
      headerText="Contract Risk Analyzer"
      closeButtonAriaLabel="Close"
      isFooterAtBottom={true}
      styles={{
        main: {
          marginTop: 0,
          minHeight: '80vh',
          padding: '10px 16px',
          width: '80%',
        },
        closeButton: {
          color: '#4f46e5',
          backgroundColor: '#f5f3ff',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          width: '32px',
          height: '32px',
          margin: '8px',
          selectors: {
            ':hover': {
              color: '#4338ca',
              backgroundColor: '#ede9fe',
              borderColor: '#c7d2fe',
            }
          },
        },
        content: {
          padding: '16px',
          height: 'calc(100vh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
        footer: {
          padding: '12px 56px',
          borderTop: '1px solid #e5e7eb',
        },
        header: {
          padding: '16px',
        },
        headerText: {
          fontSize: '18px',
          fontWeight: 600,
          color: '#111827',
        },
      }}
      onRenderFooter={() => (
        <div className="flex justify-between items-center w-full max-w-7xl">
          <Text variant="small" className={fileName ? '' : 'invisible'}>
            {fileName && `Analyzing: ${fileName}`}
          </Text>
          <div className="flex gap-2">
            <DefaultButton
              iconProps={{ iconName: 'Clear' }}
              onClick={() => setConfirmReset(true)}
              disabled={loading || !fileName}
              text="Reset"
              className="bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100 disabled:opacity-50"
            />
            <TooltipHost content="Configure analysis settings">
              <DefaultButton
                iconProps={settingsIcon}
                onClick={() => setShowSettings(true)}
                text="Settings"
                ariaLabel="Settings"
                className="bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
              />
            </TooltipHost>
          </div>
        </div>
      )}
    >
      <div className="flex flex-col space-y-4 h-full">
        {renderError()}

        {!fileName ? (
          <div
            className={`rounded border-2 border-dashed border-gray-300 p-6 bg-gray-50 hover:bg-gray-100 transition cursor-pointer text-center my-4 ${isDragging ? 'bg-indigo-50 border-indigo-300' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileUploadClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.txt"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="text-2xl text-gray-500">📄</div>
              <Text className="font-semibold text-gray-800">
                Drag and drop your contract file here
              </Text>
              <Text className="text-gray-500">
                or click to browse (DOCX or TXT)
              </Text>
              <DefaultButton
                text="Select File"
                className="mt-2 bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <Text>{fileName}</Text>
                {fileSize && (
                  <Text variant="small" className="text-gray-500 ml-2">
                    ({formatFileSize(fileSize)})
                  </Text>
                )}
              </div>

              <TooltipHost content="Upload a different file">
                <IconButton
                  iconProps={refreshIcon}
                  onClick={() => setConfirmReset(true)}
                  disabled={loading}
                  ariaLabel="Change file"
                  className="bg-gray-50 border border-gray-300 text-gray-600 p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                />
              </TooltipHost>
            </div>

            <Pivot
              selectedKey={activeTab}
              onLinkClick={(item) => item && setActiveTab(item.props.itemKey || 'analysis')}
              styles={{
                root: { display: fileName ? 'block' : 'none' },
              }}
              className="border-b border-gray-200"
            >
              <PivotItem
                headerText="Analysis"
                itemKey="analysis"
                headerButtonProps={{
                  className: activeTab === 'analysis' ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600' : 'text-gray-600'
                }}
              />
              <PivotItem
                headerText="Text Preview"
                itemKey="preview"
                headerButtonProps={{
                  className: activeTab === 'preview' ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600' : 'text-gray-600'
                }}
              />
              {/* Add this new tab for highlighted view if you want */}
              {parsedRisks.length > 0 && (
                <PivotItem
                  headerText="Highlighted Text"
                  itemKey="highlighted"
                  headerButtonProps={{
                    className: activeTab === 'highlighted' ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600' : 'text-gray-600'
                  }}
                />
              )}
            </Pivot>

            <div className="mt-4 h-[calc(100vh-180px)] flex flex-col overflow-hidden">
              {activeTab === 'preview' && (
                <div className="h-full flex flex-col overflow-hidden">
                  <div className="h-full w-full overflow-auto border border-gray-200 rounded-md bg-white">
                    <ContractTextPreview
                      contractText={contractText}
                      lineNumbers={true}
                      enableSearch={true}
                      enableWordWrap={true}
                      risks={parsedRisks} // Add this line to pass the risks
                    />
                  </div>
                </div>
              )}
              {activeTab === 'highlighted' && (
                <div className="h-full flex flex-col overflow-hidden">
                  <div className="h-full w-full overflow-auto border border-gray-200 rounded-md bg-white">
                    <ContractTextPreview
                      contractText={contractText}
                      lineNumbers={true}
                      enableSearch={true}
                      enableWordWrap={true}
                      risks={parsedRisks}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'analysis' && (
                <>
                  {!analysis && !loading && (
                    <div className="flex flex-col mt-10">
                      {/* Add the contract type selection */}
                      <div className="mb-6 max-w-md mx-auto">
                        <Dropdown
                          label="Contract Type"
                          selectedKey={contractType}
                          options={contractTypeOptions}
                          onChange={(_, option) => option && setContractType(option.key as string)}
                          styles={{
                            dropdown: { borderRadius: '4px' },
                            title: { borderRadius: '4px' },
                            label: { fontWeight: 600, marginBottom: '8px' }
                          }}
                        />
                      </div>
                      
                      {/* Analysis type selection */}
                      <div className="mb-6">
                        <Text className="font-semibold text-lg text-gray-800 mb-3 text-center">
                          Select Analysis Type
                        </Text>
                        {/* Integrate the DataDrivenAnalysisButtons component */}
                        <DataDrivenAnalysisButtons
                          onAnalysisSelect={handleAnalysisTypeSelect}
                          contractType={contractType}
                          layout="grid"
                          showIcons={true}
                        />
                      </div>
                      
                      {/* Contract comparison button */}
                      <div className="mt-4 mb-6 text-center">
                        <Text className="font-semibold text-gray-700 mb-2">
                          Additional Tools
                        </Text>
                        <div className="flex justify-center gap-4">
                          <DefaultButton
                            iconProps={{ iconName: 'Compare' }}
                            text="Compare Documents"
                            onClick={() => {
                              // Generate sample redlines for demonstration
                              const sampleRedlineHtml = `
                                <p>This Agreement is made on <del style="background-color: #ffdddd; text-decoration: line-through;">January 1, 2023</del><ins style="background-color: #ddffdd; text-decoration: none;"> April 15, 2023</ins>, between the following parties:</p>
                                <p><del style="background-color: #ffdddd; text-decoration: line-through;">ABC Construction LLC</del><ins style="background-color: #ddffdd; text-decoration: none;"> XYZ Development Corporation</ins> ("Contractor") and Johnson Properties Inc. ("Owner").</p>
                                <p><ins style="background-color: #ddffdd; text-decoration: none;">WHEREAS, the Owner desires to engage the Contractor for construction services; and</ins></p>
                                <p>WHEREAS, the Contractor is willing to perform such services;</p>
                                <p>The parties agree as follows:</p>
                              `;
                              setRedlineText(sampleRedlineHtml);
                              setRedlineChanges({
                                added: ['April 15, 2023', 'XYZ Development Corporation', 'WHEREAS, the Owner desires to engage the Contractor for construction services; and'],
                                removed: ['January 1, 2023', 'ABC Construction LLC'],
                                modified: ['Party identification paragraph']
                              });
                              setIsRedlineModalOpen(true);
                            }}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300"
                          />
                          <DefaultButton
                            iconProps={{ iconName: 'DocumentSearch' }}
                            text="Extract Key Terms"
                            onClick={() => {
                              // This would be implemented to extract defined terms, etc.
                              alert('This feature would extract key defined terms from the contract.');
                            }}
                            className="bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-300"
                          />
                        </div>
                      </div>
                      
                      {/* Analyze button */}
                      <div className="flex justify-center items-center gap-4 mt-6">
                        <PrimaryButton
                          text={`Analyze Contract (${analysisTypeConfig[selectedAnalysisType]?.name || 'Custom Analysis'})`}
                          onClick={handleAnalyze}
                          disabled={!contractText || loading}
                          className="mb-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded disabled:bg-gray-200 disabled:text-gray-400"
                        />
                        <TooltipHost
                          content="Use GPT-4 to suggest contract improvements"
                          id="contractSuggestionsTooltip"
                        >
                          <DefaultButton
                            text="Generate Suggestions"
                            iconProps={{ iconName: 'Edit' }}
                            onClick={() => {
                              // This would trigger a different analysis focused on improvements
                              setSelectedAnalysisType('risk');
                              setAnalysisPrompt(
                                `You are an expert contract editor. Review the following contract text and suggest specific improvements to strengthen the client's position, close loopholes, and clarify ambiguous language. Format your response with clear section references and explanations of why each change would be beneficial.`
                              );
                              handleAnalyze();
                            }}
                            disabled={!contractText || loading}
                            className="mb-4 bg-green-50 hover:bg-green-100 text-green-700 border-green-300 px-4 py-2 rounded disabled:opacity-50"
                          />
                        </TooltipHost>
                      </div>

                      <Text className="text-gray-500 max-w-lg text-center mx-auto">
                        Click to analyze your contract for legal risks, obligations, and key terms. Analysis will be performed in {chunkText(contractText, settings.chunkSize).length} parts.
                      </Text>
                    </div>
                  )}

                  {loading && (
                    <div className="my-4">
                      <div className="mb-3">
                        <Text className="font-medium text-gray-800">
                          Analyzing contract...
                        </Text>
                        <ProgressIndicator
                          percentComplete={progress / 100}
                          description={`Processing part ${currentChunk} of ${totalChunks}`}
                          styles={{
                            progressBar: {
                              backgroundColor: '#4f46e5',
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {analysis && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 mb-3">
                        <div className="flex items-center gap-3">
                          <Text className="font-semibold text-lg text-gray-800">
                            {selectedAnalysisType ? analysisTypeConfig[selectedAnalysisType]?.name || 'Analysis Results' : 'Contract Analysis Results'}
                          </Text>

                          <div className="flex bg-gray-100 p-0.5 rounded border border-gray-300">
                            <TooltipHost content="Card View">
                              <button
                                onClick={() => setViewMode('card')}
                                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${viewMode === 'card'
                                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                  : 'text-gray-600 hover:bg-gray-200'
                                  }`}
                              >
                                <span className="text-sm">Card</span>
                              </button>
                            </TooltipHost>

                            <TooltipHost content="Table View">
                              <button
                                onClick={() => setViewMode('table')}
                                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${viewMode === 'table'
                                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                  : 'text-gray-600 hover:bg-gray-200'
                                  }`}
                              >
                                <span className="text-sm">Table</span>
                              </button>
                            </TooltipHost>

                            <TooltipHost content="Raw View">
                              <button
                                onClick={() => setViewMode('markdown')}
                                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${viewMode === 'markdown'
                                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                  : 'text-gray-600 hover:bg-gray-200'
                                  }`}
                              >
                                <span className="text-sm">Raw</span>
                              </button>
                            </TooltipHost>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {/* Add a run another analysis button */}
                          <DefaultButton
                            iconProps={{ iconName: 'Refresh' }}
                            text="New Analysis"
                            onClick={() => {
                              // Reset analysis but keep the contract text
                              setAnalysis('');
                              setParsedRisks([]);
                              setMitigationPoints([]);
                              setSelectedAnalysisType('comprehensive');
                              setAnalysisPrompt('');
                            }}
                            className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 mr-2"
                          />
                        
                          <TooltipHost content={copySuccess ? "Copied!" : "Copy to clipboard"}>
                            <button
                              onClick={handleCopyToClipboard}
                              aria-label="Copy to clipboard"
                              className="bg-gray-50 border border-gray-300 rounded p-1.5 text-gray-600 hover:bg-gray-100"
                            >
                              {copySuccess ? "Copied!" : "Copy"}
                            </button>
                          </TooltipHost>
                          <TooltipHost content="Export as Markdown">
                            <button
                              onClick={handleExportMarkdown}
                              aria-label="Export as Markdown"
                              disabled={isExporting}
                              className={`bg-gray-50 border border-gray-300 rounded p-1.5 text-gray-600 hover:bg-gray-100 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                              {isExporting ? "Exporting..." : "Export"}
                            </button>
                          </TooltipHost>
                        </div>
                      </div>

                      <div ref={analysisContainerRef} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm overflow-auto flex-1">
                        {renderAnalysisContent()}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {renderSettingsPanel()}
      {renderResetConfirmation()}
      {renderRedlineModal()}
      {renderFixSuggestionModal()}
    </Panel>
  );
};