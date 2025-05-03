// components/AnswerContent.tsx
import React, { RefObject } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { MessageSquare, Cpu, Settings } from 'lucide-react';
import { ThemeStyles, TokenInfo } from '../types';

interface AnswerContentProps {
    answer: any;
    content: string;
    contentRef: RefObject<HTMLDivElement>;
    isStreaming: boolean;
    isEditMode: boolean;
    editedAnswer: string;
    followupQuestions: string[];
    showFollowupQuestions: boolean;
    tokenInfo: TokenInfo | null;
    themeStyles: ThemeStyles;
    enableEditing: boolean;
    setEditedAnswer: (value: string) => void;
    setIsEditMode: (value: boolean) => void;
    handleFollowupQuestionClick: (question: string) => void;
    setShowFeedbackForm: (value: boolean) => void;
    onFeedbackSubmitted?: (feedback: any) => void;
}

const AnswerContent: React.FC<AnswerContentProps> = ({
    answer,
    content,
    contentRef,
    isStreaming,
    isEditMode,
    editedAnswer,
    followupQuestions,
    showFollowupQuestions,
    tokenInfo,
    themeStyles,
    enableEditing,
    setEditedAnswer,
    setIsEditMode,
    handleFollowupQuestionClick,
    setShowFeedbackForm,
    onFeedbackSubmitted
}) => {
    // Tab animation
    const tabAnimation = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    return (
        <motion.div
            key="answer-tab"
            variants={tabAnimation}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
        >
            {enableEditing && isEditMode ? (
                <div className="mb-4">
                    <textarea
                        value={editedAnswer}
                        onChange={(e) => setEditedAnswer(e.target.value)}
                        rows={10}
                        className="w-full p-3 rounded border"
                        style={{
                            backgroundColor: themeStyles.cardBackgroundColor,
                            borderColor: themeStyles.borderColor,
                            color: themeStyles.textColor
                        }}
                    />
                    <div className="flex justify-end mt-2 space-x-2">
                        <button
                            onClick={() => setIsEditMode(false)}
                            className="px-3 py-1 text-sm rounded border"
                            style={{
                                borderColor: themeStyles.borderColor,
                                color: themeStyles.textColor
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                // Save edited answer logic goes here
                                setIsEditMode(false);
                            }}
                            className="px-3 py-1 text-sm rounded text-white"
                            style={{ backgroundColor: themeStyles.primaryColor }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <div ref={contentRef} className="text-base font-normal leading-snug py-4">
                    {enableEditing && (
                        <div className="flex justify-end mb-2">
                            <button
                                onClick={() => setIsEditMode(true)}
                                className="px-2 py-1 text-xs rounded flex items-center"
                                style={{
                                    backgroundColor: `${themeStyles.primaryColor}10`,
                                    color: themeStyles.primaryColor
                                }}
                            >
                                <Settings size={12} className="mr-1" />
                                Edit Answer
                            </button>
                        </div>
                    )}
                    <div className="prose max-w-none" style={{ color: themeStyles.textColor }}>
                        <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                            {content}
                        </ReactMarkdown>
                    </div>
                    {isStreaming && (
                        <motion.span 
                            className="inline-block"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <span>...</span>
                        </motion.span>
                    )}
                    
                    {/* Follow-up questions */}
                    {showFollowupQuestions && followupQuestions && followupQuestions.length > 0 && (
                        <div className="mt-6">
                            <h4 
                                className="text-sm font-medium mb-2"
                                style={{ color: themeStyles.primaryColor }}
                            >
                                Follow-up Questions:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {followupQuestions.map((question, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleFollowupQuestionClick(question)}
                                        className="px-3 py-1.5 text-sm rounded-full flex items-center"
                                        style={{
                                            backgroundColor: `${themeStyles.primaryColor}10`,
                                            color: themeStyles.primaryColor
                                        }}
                                    >
                                        <MessageSquare size={12} className="mr-1.5" />
                                        {question}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Feedback button */}
                    {onFeedbackSubmitted && (
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowFeedbackForm(true)}
                                className="px-3 py-1.5 text-xs rounded flex items-center"
                                style={{
                                    backgroundColor: `${themeStyles.primaryColor}10`,
                                    color: themeStyles.primaryColor
                                }}
                            >
                                Rate this answer
                            </button>
                        </div>
                    )}
                    
                    {/* Token usage summary */}
                    {tokenInfo && (
                        <div 
                            className="mt-6 text-xs p-2 rounded flex items-center justify-between"
                            style={{
                                backgroundColor: `${themeStyles.primaryColor}05`,
                                color: `${themeStyles.textColor}80`
                            }}
                        >
                            <span className="flex items-center">
                                <Cpu size={12} className="mr-1" />
                                Tokens: {tokenInfo.total || 'N/A'}
                            </span>
                            {tokenInfo.totalCost !== undefined && (
                                <span>
                                    Cost: {tokenInfo.totalCost.toFixed(5)} {tokenInfo.currency}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default AnswerContent;