// src/types/index.ts

/**
 * Risk analysis result for a contract clause
 */
export interface Risk {
    category: string;
    score: string;
    text: string;
    reason: string;
    location: string;
  }
  
  /**
   * Configuration for the analysis process
   */
  export interface AnalysisSettings {
    model: string;
    temperature: number;
    chunkSize: number;
  }
  
  /**
   * Error type for file processing errors
   */
  export interface FileProcessingError {
    message: string;
    details?: string;
  }
  
  /**
   * View mode for displaying analysis results
   */
  export type ViewMode = 'card' | 'table' | 'markdown';
  
  /**
   * Redline changes identified in a document comparison
   */
  export interface RedlineChanges {
    added: string[];
    removed: string[];
    modified: string[];
  }
  
  /**
   * Analysis type configuration structure
   */
  export interface AnalysisTypeConfig {
    [key: string]: {
      name: string;
      description: string;
      icon?: string;
      prompt?: string;
    };
  }
  
  /**
   * Contract type option for dropdown
   */
  export interface ContractTypeOption {
    key: string;
    text: string;
  }
  
  /**
   * Model option for dropdown
   */
  export interface ModelOption {
    key: string;
    text: string;
    description?: string;
  }
  
  /**
   * Props for the ContractAnalyzerPanel component
   */
  export interface ContractAnalyzerProps {
    isOpen: boolean;
    onDismiss: () => void;
    onAnalysisComplete?: (
      analysisText: string,
      risks: Risk[],
      mitigationPoints: string[],
      contractText: string
    ) => void;
  }
  
  /**
   * Props for the AnalysisResults component
   */
  export interface AnalysisResultsProps {
    analysis: string;
    parsedRisks: Risk[];
    mitigationPoints: string[];
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    selectedAnalysisType: string;
    analysisTypeConfig: AnalysisTypeConfig;
    handleCopyToClipboard: () => Promise<void>;
    handleExportMarkdown: () => void;
    copySuccess: boolean;
    isExporting: boolean;
    highlightInDocument: (risk: Risk, index: number) => void;
    generateFixSuggestion: (risk: Risk) => Promise<void>;
    analysisContainerRef: React.RefObject<HTMLDivElement>;
    resetAnalysis: () => void;
  }
  
  /**
   * Props for the AnalysisSettings component
   */
  export interface AnalysisSettingsProps {
    isOpen: boolean;
    onDismiss: () => void;
    settings: AnalysisSettings;
    updateSettings: (settings: Partial<AnalysisSettings>) => void;
    modelOptions: ModelOption[];
    contractType: string;
    setContractType: (type: string) => void;
    contractTypeOptions: ContractTypeOption[];
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
  }
  
  /**
   * Props for the FixSuggestionModal component
   */
  export interface FixSuggestionModalProps {
    isOpen: boolean;
    onDismiss: () => void;
    selectedRisk: Risk | null;
    suggestedFix: string;
    isGeneratingFix: boolean;
  }
  
  /**
   * Props for the RedlineModal component
   */
  export interface RedlineModalProps {
    isOpen: boolean;
    onDismiss: () => void;
    redlineText: string;
    showRedlines: boolean;
    setShowRedlines: (show: boolean) => void;
    redlineChanges: RedlineChanges;
  }
  
  /**
   * Props for the ConfirmationDialog component
   */
  export interface ConfirmationDialogProps {
    isOpen: boolean;
    onDismiss: () => void;
    title: string;
    subText: string;
    onConfirm: () => void;
    confirmButtonText: string;
    confirmButtonStyle?: 'primary' | 'danger' | 'normal';
    cancelButtonText?: string;
  }
  
  /**
   * Props for the UploadZone component
   */
  export interface UploadZoneProps {
    isDragging: boolean;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    onClick: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }
  
  /**
   * Props for the ProgressWithDetails component
   */
  export interface ProgressWithDetailsProps {
    progress: number;
    currentChunk: number;
    totalChunks: number;
    label?: string;
  }
  
  /**
   * Props for the RiskCard component
   */
  export interface RiskCardProps {
    risk: Risk;
    index: number;
    highlightInDocument: (risk: Risk, index: number) => void;
    generateFixSuggestion: (risk: Risk) => Promise<void>;
  }