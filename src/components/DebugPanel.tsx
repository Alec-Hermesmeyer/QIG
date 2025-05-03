// components/DebugPanel.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Source, ThemeStyles, ThoughtProcess, TokenInfo } from '@/types';

interface DebugPanelProps {
    answer: any;
    allSources: Source[];
    hasThoughts: boolean;
    hasSearchInsights: boolean;
    tokenInfo: TokenInfo | null;
    metadata: Record<string, any>;
    themeStyles: ThemeStyles;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
    answer,
    allSources,
    hasThoughts,
    hasSearchInsights,
    tokenInfo,
    metadata,
    themeStyles
}) => {
    return (
        <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border p-3 my-2 rounded overflow-auto max-h-[400px]"
            style={{ 
                backgroundColor: `${themeStyles.primaryColor}10`, 
                borderColor: `${themeStyles.primaryColor}30`
            }}
        >
            <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Debug Mode: ON</span>
                <span className="text-sm" style={{ color: themeStyles.primaryColor }}>Format: GroundX</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-3 text-xs p-2 rounded" style={{ backgroundColor: `${themeStyles.primaryColor}20` }}>
                <div>
                    <span className="font-semibold">Sources:</span> {allSources?.length || 0}
                </div>
                <div>
                    <span className="font-semibold">Has Thoughts:</span> {hasThoughts ? 'Yes' : 'No'}
                </div>
                <div>
                    <span className="font-semibold">Has Search Insights:</span> {hasSearchInsights ? 'Yes' : 'No'}
                </div>
                {tokenInfo && (
                    <>
                        <div>
                            <span className="font-semibold">Total Tokens:</span> {tokenInfo.total || 'N/A'}
                        </div>
                        <div>
                            <span className="font-semibold">Input Tokens:</span> {tokenInfo.input || 'N/A'}
                        </div>
                        <div>
                            <span className="font-semibold">Output Tokens:</span> {tokenInfo.output || 'N/A'}
                        </div>
                    </>
                )}
            </div>
            
            <div className="mb-2 font-semibold">Answer Structure:</div>
            <pre className="text-xs whitespace-pre-wrap mb-3 p-2 rounded border max-h-40 overflow-auto"
                style={{ 
                    backgroundColor: themeStyles.cardBackgroundColor, 
                    borderColor: themeStyles.borderColor
                }}
            >
                {JSON.stringify(answer, null, 2)}
            </pre>
            
            {allSources.length > 0 && (
                <>
                    <div className="font-semibold mt-2">Document Sources:</div>
                    <pre className="text-xs whitespace-pre-wrap p-2 rounded border max-h-40 overflow-auto"
                        style={{ 
                            backgroundColor: themeStyles.cardBackgroundColor, 
                            borderColor: themeStyles.borderColor
                        }}
                    >
                        {JSON.stringify(allSources, null, 2)}
                    </pre>
                </>
            )}
            
            {Object.keys(metadata).length > 0 && (
                <>
                    <div className="font-semibold mt-2">Metadata:</div>
                    <pre className="text-xs whitespace-pre-wrap p-2 rounded border max-h-40 overflow-auto"
                        style={{ 
                            backgroundColor: themeStyles.cardBackgroundColor, 
                            borderColor: themeStyles.borderColor
                        }}
                    >
                        {JSON.stringify(metadata, null, 2)}
                    </pre>
                </>
            )}
        </motion.div>
    );
};

export default DebugPanel;