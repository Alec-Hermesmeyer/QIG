import React from "react";
import { 
  ClipboardCopy, ClipboardCheck, Lightbulb, ChevronDown, ChevronUp,
  Database, ImageIcon
} from "lucide-react";

interface AnswerHeaderProps {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCopied: boolean;
  hasThoughts: boolean;
  hasSources: boolean;
  hasXray: boolean;
  hasImages: boolean;
  handleCopyToClipboard: () => void;
  onThoughtProcessClicked: () => void;
  onSupportingContentClicked: () => void;
  onRefreshClicked?: () => void;
  themeStyles: any;
}

const AnswerHeader: React.FC<AnswerHeaderProps> = ({
  expanded,
  setExpanded,
  activeTab,
  setActiveTab,
  isCopied,
  hasThoughts,
  hasSources,
  hasXray,
  hasImages,
  handleCopyToClipboard,
  onThoughtProcessClicked,
  onSupportingContentClicked,
  onRefreshClicked,
  themeStyles
}) => {
  return (
    <div className="p-4 flex justify-between items-center border-b" style={{ borderColor: themeStyles.borderColor }}>
      <div className="flex items-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mr-2">
          <path
            d="M8.4 4.9L8.5 4H9.5L9.6 4.9C9.8 7.3 11.7 9.2 14.1 9.4L15 9.5V10.5L14.1 10.6C11.7 10.8 9.8 12.7 9.6 15.1L9.5 16H8.5L8.4 15.1C8.2 12.7 6.3 10.8 3.9 10.6L3 10.5V9.5L3.9 9.4C6.3 9.2 8.2 7.3 8.4 4.9Z"
            fill="currentColor"
          />
        </svg>
      </div>
      
      <div className="flex items-center space-x-1">
        {onRefreshClicked && (
          <button
            onClick={onRefreshClicked}
            className="p-2 rounded-full transition-colors hover:bg-indigo-50"
            title="Refresh Response"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 22v-6h6"></path>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
          </button>
        )}
        
        <button
          onClick={handleCopyToClipboard}
          className="p-2 rounded-full transition-colors hover:bg-indigo-50 relative"
          title={isCopied ? "Copied!" : "Copy to clipboard"}
        >
          {isCopied ? <ClipboardCheck size={18} /> : <ClipboardCopy size={18} />}
        </button>
        
        <button
          onClick={() => {
            setActiveTab('thought-process');
            onThoughtProcessClicked();
          }}
          className={`p-2 rounded-full transition-colors ${hasThoughts ? 'hover:bg-amber-50 text-amber-500' : 'opacity-50 cursor-not-allowed'}`}
          title="Show Thought Process"
          disabled={!hasThoughts}
        >
          <Lightbulb size={18} />
        </button>
        
        <button
          onClick={() => {
            setActiveTab('sources');
            onSupportingContentClicked();
          }}
          className={`p-2 rounded-full transition-colors ${hasSources ? 'hover:bg-purple-50 text-purple-500' : 'opacity-50 cursor-not-allowed'}`}
          title="Show Sources"
          disabled={!hasSources}
        >
          <Database size={18} />
        </button>
        
        {hasXray && (
          <button
            onClick={() => setActiveTab('xray')}
            className="p-2 rounded-full transition-colors hover:bg-blue-50 text-blue-500"
            title="X-Ray Document Analysis"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              <path d="M12 12 6 6"/>
              <path d="M12 6v6"/>
              <path d="M21 9V3h-6"/>
            </svg>
          </button>
        )}
        
        {hasImages && (
          <button
            onClick={() => setActiveTab('images')}
            className="p-2 rounded-full transition-colors hover:bg-pink-50 text-pink-500"
            title="Document Images"
          >
            <ImageIcon size={18} />
          </button>
        )}
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-full transition-colors hover:bg-gray-100"
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>
    </div>
  );
};

export default AnswerHeader;