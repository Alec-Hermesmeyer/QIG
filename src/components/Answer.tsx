'use client';

import { useState, useEffect, useRef } from "react";
import { Stack, Text } from "@fluentui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { motion, AnimatePresence } from "framer-motion";
import {
    ClipboardCopy,
    ClipboardCheck,
    Lightbulb,
    ClipboardList,
    Bug,
    ChevronDown,
    ChevronUp
} from "lucide-react";

interface Props {
    answer: any;
    index: number;
    isSelected?: boolean;
    isStreaming: boolean;
    onCitationClicked: (filePath: string) => void;
    onThoughtProcessClicked: () => void;
    onSupportingContentClicked: () => void;
    onFollowupQuestionClicked?: (question: string) => void;
    showFollowupQuestions?: boolean;
}

export default function Answer({
    answer,
    index,
    isSelected,
    isStreaming,
    onCitationClicked,
    onThoughtProcessClicked,
    onSupportingContentClicked,
    onFollowupQuestionClicked,
    showFollowupQuestions,
}: Props) {
    const [debugMode, setDebugMode] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const getContent = () => {
        if (typeof answer === 'string') return answer;
        if (answer?.content) return answer.content;
        if (answer?.answer) return answer.answer;
        return JSON.stringify(answer);
    };

    const content = getContent();

    // Reset copied state after 2 seconds
    useEffect(() => {
        if (isCopied) {
            const timer = setTimeout(() => {
                setIsCopied(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isCopied]);

    // Enhanced citation extraction to handle multiple formats
    const extractCitations = () => {
        // Handle bracketed citations like [filename.pdf]
        const bracketRegex = /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\]/gi;
        const bracketMatches = [...(content.matchAll(bracketRegex) || [])];
        
        // Also check for in-paragraph citations with the format "text" (filename.pdf)
        const parenthesisRegex = /"[^"]+"\s+\(([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\)/gi;
        const parenthesisMatches = [...(content.matchAll(parenthesisRegex) || [])];
        
        // Combine and deduplicate results
        const allMatches = [...bracketMatches, ...parenthesisMatches].map(match => match[1]);
        return [...new Set(allMatches)]; // Remove duplicates
    };

    const citations = extractCitations();

    const extractFollowups = () => {
        return Array.isArray(answer?.context?.followup_questions)
            ? answer.context.followup_questions
            : [];
    };

    const followupQuestions = extractFollowups();

    // Process content to improve citation display
    const processContent = () => {
        let processedContent = content;
        
        // Replace bracketed citation references like [filename.pdf] with numbered citations [1]
        if (citations.length > 0) {
            citations.forEach((citation, index) => {
                const regex = new RegExp(`\\[${citation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
                processedContent = processedContent.replace(regex, `[${index + 1}]`);
            });
            
            // Find and replace all numeric citation references [1], [2], etc. with styled ones
            for (let i = 1; i <= citations.length; i++) {
                const numericRegex = new RegExp(`\\[${i}\\]`, 'g');
                processedContent = processedContent.replace(
                    numericRegex,
                    `<sup class="text-blue-600 font-bold cursor-pointer citation-number" data-citation-index="${i}">[${i}]</sup>`
                );
            }
        }
        
        return processedContent;
    };

    // Setup click handlers for citation numbers
    useEffect(() => {
        const handleContentClick = (e: MouseEvent) => {
            // Find if the clicked element is a citation number
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('citation-number')) {
                // Get the citation index from the data attribute
                const citationIndex = parseInt(target.getAttribute('data-citation-index') || '0', 10);
                
                // Ensure the citation index is valid
                if (citationIndex > 0 && citationIndex <= citations.length) {
                    // Get the corresponding citation filename
                    const citationFile = citations[citationIndex - 1];
                    
                    // Call the citation handler
                    onCitationClicked(citationFile);
                }
            }
        };
        
        // Add the event listener to the content div
        const contentElement = contentRef.current;
        if (contentElement) {
            contentElement.addEventListener('click', handleContentClick);
        }
        
        // Cleanup on unmount
        return () => {
            if (contentElement) {
                contentElement.removeEventListener('click', handleContentClick);
            }
        };
    }, [citations, onCitationClicked]);

    const processedContent = processContent();

    // Handle the clipboard icon click - copy content to clipboard
    const handleClipboardIconClick = () => {
        try {
            const contentToCopy = getContent();
            
            // Modern clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(contentToCopy)
                    .then(() => {
                        setIsCopied(true);
                    })
                    .catch(() => {
                        // Fallback for HTTPS but no clipboard permission
                        fallbackCopyToClipboard(contentToCopy);
                    });
            } else {
                // Fallback for older browsers
                fallbackCopyToClipboard(contentToCopy);
            }
        } catch (err) {
            console.error('Failed to copy content:', err);
        }
    };
    
    // Fallback for copying to clipboard
    const fallbackCopyToClipboard = (text: string) => {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            // Make the textarea out of viewport
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (success) {
                setIsCopied(true);
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
    };

    // Animations
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { 
                duration: 0.4,
                ease: "easeOut"
            }
        },
        selected: {
            scale: 1.005,
            boxShadow: "0 4px 20px rgba(79, 70, 229, 0.15)",
            borderColor: "rgb(147, 51, 234)",
            transition: {
                duration: 0.2,
                ease: "easeInOut"
            }
        }
    };

    const buttonVariants = {
        initial: { scale: 1 },
        hover: { scale: 1.1 },
        tap: { scale: 0.95 }
    };

    const citationButtonVariants = {
        initial: { 
            backgroundColor: "rgb(219, 234, 254)",
            color: "rgb(30, 64, 175)" 
        },
        hover: { 
            backgroundColor: "rgb(191, 219, 254)",
            y: -2,
            transition: {
                duration: 0.2
            }
        },
        tap: { 
            scale: 0.95,
            y: 0
        }
    };

    const contentExpandAnimation = {
        collapsed: { 
            height: 0, 
            opacity: 0,
            transition: {
                height: { duration: 0.3 },
                opacity: { duration: 0.2 }
            }
        },
        expanded: { 
            height: "auto", 
            opacity: 1,
            transition: {
                height: { duration: 0.3 },
                opacity: { duration: 0.3, delay: 0.1 }
            }
        }
    };

    return (
        <motion.div
            initial="hidden"
            animate={isSelected ? "selected" : "visible"}
            variants={containerVariants}
            className={`p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-200 ${
                isSelected ? 'border-purple-500' : 'border-transparent'
            }`}
            layoutId={`answer-${index}`}
        >
            <div className="flex justify-between items-center mb-3">
                <motion.div 
                    className="text-2xl text-purple-600"
                    initial={{ rotate: -5 }}
                    animate={{ rotate: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M2.5 0.5V0H3.5V0.5C3.5 1.60457 4.39543 2.5 5.5 2.5H6V3V3.5H5.5C4.39543 3.5 3.5 4.39543 3.5 5.5V6H3H2.5V5.5C2.5 4.39543 1.60457 3.5 0.5 3.5H0V3V2.5H0.5C1.60457 2.5 2.5 1.60457 2.5 0.5Z"
                            fill="currentColor"
                        />
                        <path
                            d="M14.5 4.5V5H13.5V4.5C13.5 3.94772 13.0523 3.5 12.5 3.5H12V3V2.5H12.5C13.0523 2.5 13.5 2.05228 13.5 1.5V1H14H14.5V1.5C14.5 2.05228 14.9477 2.5 15.5 2.5H16V3V3.5H15.5C14.9477 3.5 14.5 3.94772 14.5 4.5Z"
                            fill="currentColor"
                        />
                        <path
                            d="M8.40706 4.92939L8.5 4H9.5L9.59294 4.92939C9.82973 7.29734 11.7027 9.17027 14.0706 9.40706L15 9.5V10.5L14.0706 10.5929C11.7027 10.8297 9.82973 12.7027 9.59294 15.0706L9.5 16H8.5L8.40706 15.0706C8.17027 12.7027 6.29734 10.8297 3.92939 10.5929L3 10.5V9.5L3.92939 9.40706C6.29734 9.17027 8.17027 7.29734 8.40706 4.92939Z"
                            fill="currentColor"
                        />
                    </svg>
                </motion.div>
                
                <div className="flex items-center gap-2">
                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        title={isCopied ? "Copied!" : "Copy to clipboard"} 
                        onClick={handleClipboardIconClick} 
                        className="p-2 rounded-full hover:bg-blue-100 text-blue-600 transition-colors relative"
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
                                    className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap"
                                >
                                    Copied to clipboard!
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>

                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        title="Show Thought Process" 
                        onClick={onThoughtProcessClicked} 
                        className="p-2 rounded-full hover:bg-yellow-100 text-yellow-600 transition-colors"
                    >
                        <Lightbulb size={18} />
                    </motion.button>

                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        title="Show Supporting Content" 
                        onClick={onSupportingContentClicked} 
                        className="p-2 rounded-full hover:bg-purple-100 text-purple-600 transition-colors"
                    >
                        <ClipboardList size={18} />
                    </motion.button>

                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        title="Toggle Debug" 
                        onClick={() => setDebugMode(!debugMode)} 
                        className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                        <Bug size={18} />
                    </motion.button>

                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => setExpanded(!expanded)}
                        className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors ml-1"
                    >
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </motion.button>
                </div>
            </div>

            <AnimatePresence>
                {debugMode && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-blue-50 border border-blue-200 p-3 my-2 rounded overflow-auto max-h-60"
                    >
                        <Text>Debug Mode: ON</Text>
                        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(answer, null, 2)}</pre>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                variants={contentExpandAnimation}
                initial={expanded ? "expanded" : "collapsed"}
                animate={expanded ? "expanded" : "collapsed"}
                className="overflow-hidden"
            >
                <div ref={contentRef} className="text-base font-normal leading-snug py-4">
                    <div className="prose max-w-none">
                        <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                            {processedContent}
                        </ReactMarkdown>
                    </div>
                    {isStreaming && (
                        <motion.span 
                            className="inline-block"
                            animate={{ 
                                opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <span>...</span>
                        </motion.span>
                    )}
                </div>
            </motion.div>

            {!expanded && (
                <div className="text-center py-2">
                    <motion.button
                        onClick={() => setExpanded(true)}
                        className="text-purple-600 text-sm font-medium"
                        whileHover={{ scale: 1.05 }}
                    >
                        Show content
                    </motion.button>
                </div>
            )}

            <AnimatePresence>
                {citations.length > 0 && expanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4"
                    >
                        <div className="flex items-center mb-2">
                            <span className="font-semibold leading-6 text-gray-700">Citations:</span>
                            <motion.div 
                                className="ml-2 h-[1px] bg-gray-200 flex-grow"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {citations.map((citation, i) => (
                                <motion.button
                                    key={i}
                                    variants={citationButtonVariants}
                                    initial="initial"
                                    whileHover="hover"
                                    whileTap="tap"
                                    className="font-medium text-sm leading-6 text-center rounded px-2 py-1"
                                    title={`View ${citation}`}
                                    onClick={() => onCitationClicked(citation)}
                                >
                                    {`${i + 1}. ${citation}`}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showFollowupQuestions && followupQuestions.length > 0 && onFollowupQuestionClicked && expanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="mt-4"
                    >
                        <div className="flex items-center mb-2">
                            <span className="font-semibold leading-6 text-gray-700">Follow-up questions:</span>
                            <motion.div 
                                className="ml-2 h-[1px] bg-gray-200 flex-grow"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {followupQuestions.map((question: string, i: number) => (
                                <motion.button
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ 
                                        opacity: 1, 
                                        y: 0,
                                        transition: { delay: 0.1 + (i * 0.1) } 
                                    }}
                                    whileHover={{ y: -2, backgroundColor: "rgb(224, 231, 255)" }}
                                    whileTap={{ y: 0 }}
                                    className="font-medium text-sm leading-6 text-center rounded px-2 py-1 bg-indigo-50 text-indigo-800 transition-colors"
                                    title={question}
                                    onClick={() => onFollowupQuestionClicked?.(question)}
                                >
                                    {question}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}