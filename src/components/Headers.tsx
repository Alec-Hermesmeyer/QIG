// components/Header.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardCopy,
    ClipboardCheck,
    Lightbulb,
    ClipboardList,
    Bug,
    ChevronDown,
    ChevronUp,
    Share2,
    RefreshCw
} from 'lucide-react';
import { ThemeStyles } from '../types';

interface HeaderProps {
    answer: any;
    index: number;
    themeStyles: ThemeStyles;
    metadata: Record<string, any>;
    isCopied: boolean;
    debugMode: boolean;
    expanded: boolean;
    hasThoughts: boolean;
    hasRagResults: boolean;
    setDebugMode: (value: boolean) => void;
    setExpanded: (value: boolean) => void;
    handleClipboardIconClick: () => void;
    onThoughtProcessClicked: () => void;
    onSupportingContentClicked: () => void;
    onRefreshClicked?: () => void;
    enableAdvancedFeatures?: boolean;
    handleExport: (format: 'json' | 'csv' | 'pdf' | 'md') => void;
}

const Header: React.FC<HeaderProps> = ({
    answer,
    index,
    themeStyles,
    metadata,
    isCopied,
    debugMode,
    expanded,
    hasThoughts,
    hasRagResults,
    setDebugMode,
    setExpanded,
    handleClipboardIconClick,
    onThoughtProcessClicked,
    onSupportingContentClicked,
    onRefreshClicked,
    enableAdvancedFeatures = false,
    handleExport
}) => {
    const buttonVariants = {
        initial: { scale: 1 },
        hover: { scale: 1.1 },
        tap: { scale: 0.95 }
    };

    return (
        <div className="flex justify-between items-center mb-3">
            <motion.div 
                className="text-2xl flex items-center"
                initial={{ rotate: -5 }}
                animate={{ rotate: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                style={{ color: themeStyles.primaryColor }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mr-2">
                    <path
                        d="M8.40706 4.92939L8.5 4H9.5L9.59294 4.92939C9.82973 7.29734 11.7027 9.17027 14.0706 9.40706L15 9.5V10.5L14.0706 10.5929C11.7027 10.8297 9.82973 12.7027 9.59294 15.0706L9.5 16H8.5L8.40706 15.0706C8.17027 12.7027 6.29734 10.8297 3.92939 10.5929L3 10.5V9.5L3.92939 9.40706C6.29734 9.17027 8.17027 7.29734 8.40706 4.92939Z"
                        fill="currentColor"
                    />
                </svg>
                <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center"
                    style={{ 
                        backgroundColor: `${themeStyles.primaryColor}20`, 
                        color: themeStyles.primaryColor 
                    }}
                >
                </motion.span>
                {metadata?.version && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="ml-2 text-xs opacity-70"
                    >
                        {metadata.version}
                    </motion.span>
                )}
            </motion.div>
            
            <div className="flex items-center gap-2">
                {/* Export button - displayed if advanced features enabled */}
                {enableAdvancedFeatures && (
                    <ExportButton
                        index={index}
                        handleExport={handleExport}
                        buttonVariants={buttonVariants}
                        themeStyles={themeStyles}
                    />
                )}
                
                {/* Refresh button */}
                {onRefreshClicked && (
                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        title="Refresh Results" 
                        onClick={onRefreshClicked}
                        className="p-2 rounded-full transition-colors"
                        style={{ 
                            color: themeStyles.primaryColor,
                            hover: { backgroundColor: `${themeStyles.primaryColor}20` }
                        }}
                    >
                        <RefreshCw size={18} />
                    </motion.button>
                )}
                
                {/* Clipboard button */}
                <motion.button
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    title={isCopied ? "Copied!" : "Copy to clipboard"} 
                    onClick={handleClipboardIconClick} 
                    className="p-2 rounded-full transition-colors relative"
                    style={{ 
                        color: themeStyles.primaryColor,
                        hover: { backgroundColor: `${themeStyles.primaryColor}20` }
                    }}
                >
                    <AnimatePresence mode="wait">
                        {isCopied ? (
                            <motion.div
                                key="check"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ClipboardCheck size={18} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="copy"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ClipboardCopy size={18} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* Toast notification */}
                    <AnimatePresence>
                        {isCopied && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-white text-xs py-1 px-2 rounded whitespace-nowrap"
                                style={{ backgroundColor: themeStyles.textColor }}
                            >
                                Copied to clipboard!
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>

                {/* Thought process button */}
                <motion.button
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    title="Show Thought Process" 
                    onClick={onThoughtProcessClicked}
                    className={`p-2 rounded-full transition-colors ${
                        hasThoughts ? '' : 'opacity-50 cursor-not-allowed'
                    }`}
                    style={{ 
                        color: hasThoughts ? '#F59E0B' : themeStyles.textColor,
                        hover: { backgroundColor: hasThoughts ? 'rgba(245, 158, 11, 0.1)' : undefined }
                    }}
                    disabled={!hasThoughts}
                >
                    <Lightbulb size={18} />
                </motion.button>

                {/* Supporting content button */}
                <motion.button
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    title="Show Supporting Content" 
                    onClick={onSupportingContentClicked}
                    className={`p-2 rounded-full transition-colors ${
                        hasRagResults ? '' : 'opacity-50 cursor-not-allowed'
                    }`}
                    style={{ 
                        color: hasRagResults ? themeStyles.secondaryColor : themeStyles.textColor,
                        hover: { backgroundColor: hasRagResults ? `${themeStyles.secondaryColor}20` : undefined }
                    }}
                    disabled={!hasRagResults}
                >
                    <ClipboardList size={18} />
                </motion.button>

                {/* Debug mode button */}
                <motion.button
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    title="Toggle Debug" 
                    onClick={() => setDebugMode(!debugMode)} 
                    className="p-2 rounded-full transition-colors"
                    style={{ 
                        color: debugMode ? '#EF4444' : themeStyles.textColor,
                        hover: { backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                    }}
                >
                    <Bug size={18} />
                </motion.button>

                {/* Expand/collapse button */}
                <motion.button
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => setExpanded(!expanded)}
                    className="p-2 rounded-full transition-colors ml-1"
                    style={{ color: themeStyles.textColor }}
                >
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </motion.button>
            </div>
        </div>
    );
};

interface ExportButtonProps {
    index: number;
    handleExport: (format: 'json' | 'csv' | 'pdf' | 'md') => void;
    buttonVariants: any;
    themeStyles: ThemeStyles;
}

const ExportButton: React.FC<ExportButtonProps> = ({ index, handleExport, buttonVariants, themeStyles }) => {
    return (
        <div className="relative">
            <motion.button
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                title="Export Results" 
                onClick={() => document.getElementById(`export-dropdown-${index}`)?.classList.toggle('hidden')}
                className="p-2 rounded-full transition-colors"
                style={{ 
                    color: themeStyles.primaryColor,
                    hover: { backgroundColor: `${themeStyles.primaryColor}20` }
                }}
            >
                <Share2 size={18} />
            </motion.button>
            <div id={`export-dropdown-${index}`} className="absolute right-0 mt-2 w-48 rounded-md shadow-lg hidden z-10" style={{ backgroundColor: themeStyles.cardBackgroundColor }}>
                <div className="py-1">
                    <button 
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => handleExport('json')}
                    >
                        Export as JSON
                    </button>
                    <button 
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => handleExport('csv')}
                    >
                        Export Sources as CSV
                    </button>
                    <button 
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => handleExport('md')}
                    >
                        Export as Markdown
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Header;