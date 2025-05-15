// components/DocumentExcerpt.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { FileText, ExternalLink } from 'lucide-react';
import { DocumentExcerpt as DocExcerpt, ThemeStyles } from '@/types/types';
import { formatFileSize, formatDate } from '@/utils/formatUtils';
import { getSourceExcerpts } from '@/utils/dataUtils';
import { getDocumentIcon } from '@/utils/iconUtils'; // This would be a separate utility file

interface DocumentExcerptProps {
    currentExcerpt: DocExcerpt;
    themeStyles: ThemeStyles;
    onClose: () => void;
    onCitationClicked: (id: string) => void;
}

const DocumentExcerpt: React.FC<DocumentExcerptProps> = ({
    currentExcerpt,
    themeStyles,
    onClose,
    onCitationClicked
}) => {
    const buttonVariants = {
        initial: { scale: 1 },
        hover: { scale: 1.1 },
        tap: { scale: 0.95 }
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border p-4 my-3 rounded-lg"
            style={{ 
                backgroundColor: `${themeStyles.secondaryColor}10`, 
                borderColor: `${themeStyles.secondaryColor}30`
            }}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                    {getDocumentIcon(currentExcerpt.fileName, currentExcerpt.type)}
                    <h3 className="ml-2 font-medium">
                        {currentExcerpt.fileName || `Document ${currentExcerpt.id}`}
                    </h3>
                    
                    {currentExcerpt.score !== undefined && (
                        <span 
                            className="ml-2 px-2 py-0.5 text-xs rounded-full"
                            style={{ 
                                backgroundColor: `${themeStyles.secondaryColor}20`, 
                                color: themeStyles.secondaryColor
                            }}
                        >
                            Score: {(currentExcerpt.score * 100).toFixed(1)}%
                        </span>
                    )}
                </div>
                <motion.button
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={onClose}
                    className="p-1"
                    style={{ color: themeStyles.textColor }}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </motion.button>
            </div>
            
            {/* Document ID */}
            <div className="mb-3 text-xs opacity-70">
                Document ID: {currentExcerpt.id}
            </div>
            
            {/* Document metadata grid */}
            <div className="mb-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {currentExcerpt.type && (
                    <div className="p-2 rounded" style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}>
                        <div className="font-medium opacity-70">Type</div>
                        <div>{currentExcerpt.type}</div>
                    </div>
                )}
                
                {currentExcerpt.author && (
                    <div className="p-2 rounded" style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}>
                        <div className="font-medium opacity-70">Author</div>
                        <div>{currentExcerpt.author}</div>
                    </div>
                )}
                
                {currentExcerpt.datePublished && (
                    <div className="p-2 rounded" style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}>
                        <div className="font-medium opacity-70">Date</div>
                        <div>{formatDate(currentExcerpt.datePublished)}</div>
                    </div>
                )}
                
                {currentExcerpt.fileSize && (
                    <div className="p-2 rounded" style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}>
                        <div className="font-medium opacity-70">Size</div>
                        <div>{formatFileSize(currentExcerpt.fileSize)}</div>
                    </div>
                )}
            </div>
            
            {/* Document narrative if available */}
            {currentExcerpt.narrative && currentExcerpt.narrative.length > 0 && (
                <div className="mb-3">
                    <h4 className="text-sm font-medium mb-1">Document Summary:</h4>
                    <div 
                        className="border rounded p-2 text-sm"
                        style={{ 
                            backgroundColor: `${themeStyles.secondaryColor}05`, 
                            borderColor: `${themeStyles.secondaryColor}30`
                        }}
                    >
                        {currentExcerpt.narrative.map((item, i) => (
                            <p key={i} className="mb-1 last:mb-0">{item}</p>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Document excerpts */}
            {(() => {
                const allExcerpts = getSourceExcerpts(currentExcerpt);
                return allExcerpts.length > 0 ? (
                    <div>
                        <h4 className="text-sm font-medium mb-1">
                            {currentExcerpt.snippets && currentExcerpt.snippets.length > 0 ? 'Document Snippets:' : 'Document Excerpts:'}
                        </h4>
                        <div className="space-y-2">
                            {allExcerpts.map((excerpt, i) => (
                                <div 
                                    key={i} 
                                    className="rounded border p-2 text-sm"
                                    style={{ 
                                        backgroundColor: themeStyles.cardBackgroundColor, 
                                        borderColor: `${themeStyles.secondaryColor}30`
                                    }}
                                >
                                    <div 
                                        className="text-xs mb-1"
                                        style={{ color: themeStyles.secondaryColor }}
                                    >
                                        {currentExcerpt.snippets && currentExcerpt.snippets.length > 0 ? 'Snippet' : 'Excerpt'} {i+1}
                                    </div>
                                    <p>{excerpt}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-sm italic opacity-70">No excerpts available for this document.</div>
                );
            })()}
            
            {/* URL if available */}
            {currentExcerpt.url && (
                <div className="mt-3 mb-2">
                    <h4 className="text-sm font-medium mb-1">Source URL:</h4>
                    <a 
                        href={currentExcerpt.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm break-all flex items-center"
                        style={{ color: themeStyles.primaryColor }}
                    >
                        {currentExcerpt.url}
                        <ExternalLink size={12} className="ml-1 flex-shrink-0" />
                    </a>
                </div>
            )}
            
            <div className="mt-3 flex justify-end">
                <motion.button
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => {
                        onClose();
                        onCitationClicked(currentExcerpt.id.toString());
                    }}
                    className="text-white text-sm px-3 py-1.5 rounded flex items-center"
                    style={{ backgroundColor: themeStyles.secondaryColor }}
                >
                    <ExternalLink size={14} className="mr-1.5" />
                    View Full Document
                </motion.button>
            </div>
        </motion.div>
    );
};

export default DocumentExcerpt;