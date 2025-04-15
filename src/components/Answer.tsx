'use client';

import { useState } from "react";
import { Stack, Text } from "@fluentui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import {
    ClipboardCopy,
    Lightbulb,
    ClipboardList,
    Bug,
    FileSearch
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
    onAnalyzeClick?: () => void; // Analysis panel trigger
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
    onAnalyzeClick,
}: Props) {
    const [debugMode, setDebugMode] = useState(false);

    const getContent = () => {
        if (typeof answer === 'string') return answer;
        if (answer?.content) return answer.content;
        if (answer?.answer) return answer.answer;
        return JSON.stringify(answer);
    };

    const content = getContent();

    const extractCitations = () => {
        const citationRegex = /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\]/gi;
        const matches = [...content.matchAll(citationRegex)];
        return matches.map(match => match[1]);
    };

    const citations = extractCitations();

    const extractFollowups = () => {
        return Array.isArray(answer?.context?.followup_questions)
            ? answer.context.followup_questions
            : [];
    };

    const followupQuestions = extractFollowups();

    // Helper function to determine if this answer relates to contract analysis
    const isContractAnalysis = () => {
        if (typeof content === 'string') {
            return content.includes('analyzed the contract') || 
                   content.includes('contract analysis') ||
                   content.includes('contract risk');
        }
        return false;
    };

    // Handle the clipboard icon click - should open supporting content
    const handleClipboardIconClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onSupportingContentClicked();
    };

    return (
        <Stack className={`p-5 bg-gray-50 rounded-lg shadow-md outline-transparent outline-1 ${isSelected ? 'outline outline-1 outline-purple-500' : ''}`} verticalAlign="space-between">
            <Stack.Item>
                <Stack horizontal horizontalAlign="space-between">
                    <div className="text-2xl text-purple-600">
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
                    </div>
                    <div className="flex items-center gap-3">
                        {/* IMPORTANT: This button now explicitly calls onSupportingContentClicked directly */}
                        <button 
                            title="Show Supporting Content" 
                            onClick={handleClipboardIconClick} 
                            className="hover:text-purple-500"
                        >
                            <ClipboardCopy size={20} />
                        </button>

                        {/* Lightbulb button for thought process */}
                        <button 
                            title="Show Thought Process" 
                            onClick={onThoughtProcessClicked} 
                            className="hover:text-purple-500"
                        >
                            <Lightbulb size={20} />
                        </button>

                        {/* ClipboardList also opens supporting content for consistency */}
                        <button 
                            title="Show Supporting Content" 
                            onClick={onSupportingContentClicked} 
                            className="hover:text-purple-500"
                        >
                            <ClipboardList size={20} />
                        </button>

                        <button 
                            title="Toggle Debug" 
                            onClick={() => setDebugMode(!debugMode)} 
                            className="hover:text-purple-500"
                        >
                            <Bug size={20} />
                        </button>
                    </div>
                </Stack>
            </Stack.Item>

            {debugMode && (
                <div className="bg-blue-50 border border-blue-200 p-3 my-2 rounded overflow-auto max-h-60">
                    <Text>Debug Mode: ON</Text>
                    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(answer, null, 2)}</pre>
                </div>
            )}

            <Stack.Item grow>
                <div className="text-base font-normal leading-snug py-4">
                    <div className="prose max-w-none">
                        <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                            {content}
                        </ReactMarkdown>
                    </div>
                    {isStreaming && (
                        <span className="inline-block">
                            <span className="animate-pulse">...</span>
                        </span>
                    )}
                </div>
            </Stack.Item>

            {citations.length > 0 && (
                <Stack.Item>
                    <Stack horizontal wrap tokens={{ childrenGap: 5 }}>
                        <span className="mr-1 font-semibold leading-6">Citations:</span>
                        {citations.map((citation, i) => (
                            <a
                                key={i}
                                className="font-medium leading-6 text-center rounded px-2 bg-blue-100 text-blue-800 no-underline cursor-pointer hover:underline"
                                title={citation}
                                onClick={() => onCitationClicked(citation)}
                            >
                                {`${i + 1}. ${citation}`}
                            </a>
                        ))}
                    </Stack>
                </Stack.Item>
            )}

            {/* Add this explicit button for contract analysis responses */}
            {isContractAnalysis() && (
                <Stack.Item className="mt-4">
                    <button
                        onClick={onSupportingContentClicked}
                        className="w-full py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-md font-medium transition-colors"
                    >
                        View Contract Analysis Results
                    </button>
                </Stack.Item>
            )}

            {showFollowupQuestions && followupQuestions.length > 0 && onFollowupQuestionClicked && (
                <Stack.Item>
                    <Stack horizontal wrap className={`${citations.length > 0 ? "mt-2.5" : ""}`} tokens={{ childrenGap: 6 }}>
                        <span className="mr-1 font-semibold leading-6">Follow-up questions:</span>
                        {followupQuestions.map((question: string, i: number) => (
                            <a
                                key={i}
                                className="font-semibold leading-6 text-center rounded px-2 bg-indigo-50 text-black italic no-underline cursor-pointer"
                                title={question}
                                onClick={() => onFollowupQuestionClicked?.(question)}
                            >
                                {question}
                            </a>
                        ))}
                    </Stack>
                </Stack.Item>
            )}
        </Stack>
    );
}