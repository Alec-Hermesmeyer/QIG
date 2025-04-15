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
  
  // Settings
  const [settings, setSettings] = useState<AnalysisSettings>({
    model: 'gpt-4',
    temperature: 0.4,
    chunkSize: 1500,
  });
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisContainerRef = useRef<HTMLDivElement>(null);
  
  // Model options
  const modelOptions: IDropdownOption[] = [
    { key: 'gpt-4', text: 'GPT-4 (Most Accurate)' },
    { key: 'gpt-4-turbo', text: 'GPT-4 Turbo (Faster)' },
    { key: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo (Economical)' },
  ];
  
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

  // Construction contract analysis prompt - preserved from original code
  const getPrompt = () => {
    return Prompt;
  }
  // Parse risks from raw analysis text
  const parseRisksFromAnalysis = (rawAnalysis: string): Risk[] => {
    const risks: Risk[] = [];
    
    // Approach 1: Use alternative to 's' flag with character class instead of dot
    // Replace '.' with '[\\s\\S]' to match any character including newlines
    const riskRegex = /Risk Category: ([\\s\\S]*?) Risk Score: ([\\s\\S]*?) Risky Contract Text: "([\\s\\S]*?)" Why This Is a Risk: ([\\s\\S]*?) Contract Location: ([\\s\\S]*?)(?=\n\nRisk Category:|$|\n\nMitigation Summary:)/g;
    
    let match;
    while ((match = riskRegex.exec(rawAnalysis)) !== null) {
      risks.push({
        category: match[1].trim(),
        score: match[2].trim(),
        text: match[3].trim(),
        reason: match[4].trim(),
        location: match[5].trim(),
      });
    }
    
    // If no risks were found with the main regex, try an alternative approach
    if (risks.length === 0) {
      // Split by risk sections
      const sections = rawAnalysis.split(/\n\n(?=Risk Category)/);
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (!section.toLowerCase().includes('risk category')) continue;
        
        try {
          const categoryMatch = section.match(/Risk Category:?\s*([\s\S]*?)(?=\s*Risk Score:|$)/);
          const scoreMatch = section.match(/Risk Score:?\s*([\s\S]*?)(?=\s*Risky Contract Text:|$)/);
          const textMatch = section.match(/Risky Contract Text:?\s*(?:"([\s\S]*?)"|([^"]+?))(?=\s*Why This Is a Risk:|$)/);
          const reasonMatch = section.match(/Why This Is a Risk:?\s*([\s\S]*?)(?=\s*Contract Location:|$)/);
          const locationMatch = section.match(/Contract Location:?\s*([\s\S]*?)(?=$)/);
          
          if (categoryMatch && scoreMatch) {
            const risk: Risk = {
              category: categoryMatch[1] ? categoryMatch[1].trim() : 'Unknown Category',
              score: scoreMatch[1] ? scoreMatch[1].trim() : 'Unknown Score',
              text: '',
              reason: 'Unknown Reason',
              location: 'Unknown Location',
            };
            
            // Handle text match
            if (textMatch) {
              risk.text = (textMatch[1] || textMatch[2] || '').trim();
            }
            
            // Handle reason match
            if (reasonMatch && reasonMatch[1]) {
              risk.reason = reasonMatch[1].trim();
            }
            
            // Handle location match
            if (locationMatch && locationMatch[1]) {
              risk.location = locationMatch[1].trim();
            }
            
            risks.push(risk);
          }
        } catch (e) {
          console.error('Section parsing error:', e);
        }
      }
    }
    
    return risks;
  };
  
  // Parse mitigation points from raw analysis text
  const parseMitigationFromAnalysis = (rawAnalysis: string): string[] => {
    const mitigationPatterns = [
      /Mitigation Summary:([\s\S]*?)(?=$)/,
      /Mitigation Recommendations:([\s\S]*?)(?=$)/,
      /Recommended Mitigations:([\s\S]*?)(?=$)/,
      /Mitigation Strategies:([\s\S]*?)(?=$)/,
    ];
    
    for (let i = 0; i < mitigationPatterns.length; i++) {
      const mitigationMatch = rawAnalysis.match(mitigationPatterns[i]);
      if (mitigationMatch) {
        return mitigationMatch[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => {
            // Keep lines that start with a bullet point, number, or have substantial content
            return (
              line.startsWith('-') ||
              line.startsWith('•') ||
              /^\d+\./.test(line) ||
              line.length > 15
            );
          });
      }
    }
    
    return [];
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
          
          // Using your original working API call
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: settings.model,
              messages: [{ role: 'user', content: chunkPrompt }],
              temperature: settings.temperature,
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
            setAnalysis(fullAnalysis);
            
            // Parse risks and mitigation points as we go
            const currentRisks = parseRisksFromAnalysis(fullAnalysis);
            const currentMitigation = parseMitigationFromAnalysis(fullAnalysis);
            
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
      
      // Call the onAnalysisComplete callback if provided
      if (onAnalysisComplete) {
        onAnalysisComplete(fullAnalysis, parsedRisks, mitigationPoints, contractText);
      }
      
      if (analysisContainerRef.current) {
        analysisContainerRef.current.scrollTop = 0;
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
            onChange={(_, option) => option && setSettings({...settings, model: option.key as string})}
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
                  onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})}
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
            onChange={(_, value) => value && setSettings({...settings, chunkSize: Math.max(100, Math.min(3000, parseInt(value)))})}
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
            </Pivot>
            
            <div className="mt-4 h-[calc(100vh-180px)] flex flex-col overflow-hidden">
              {activeTab === 'preview' && (
                <div className="h-full flex flex-col">
                  <ContractTextPreview 
                    contractText={contractText} 
                    lineNumbers={true}
                    enableSearch={true}
                    enableWordWrap={true}
                  />
                </div>
              )}
              
              {activeTab === 'analysis' && (
                <>
                  {!analysis && !loading && (
                    <div className="flex flex-col items-center justify-center mt-10 text-center">
                      <PrimaryButton
                        text="Analyze Contract"
                        onClick={handleAnalyze}
                        disabled={!contractText || loading}
                        className="mb-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded disabled:bg-gray-200 disabled:text-gray-400"
                      />
                      
                      <Text className="text-gray-500 max-w-lg">
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
                            Contract Analysis Results
                          </Text>
                          
                          <div className="flex bg-gray-100 p-0.5 rounded border border-gray-300">
                            <TooltipHost content="Card View">
                              <button
                                onClick={() => setViewMode('card')}
                                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                                  viewMode === 'card' 
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
                                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                                  viewMode === 'table' 
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
                                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                                  viewMode === 'markdown' 
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
                              className={`bg-gray-50 border border-gray-300 rounded p-1.5 text-gray-600 hover:bg-gray-100 ${
                                isExporting ? 'opacity-50 cursor-not-allowed' : ''
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
    </Panel>
  );
};