// components/InsightsView.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, ArrowRight } from 'lucide-react';
import { SearchInsights, ThemeStyles } from '@/types';

interface InsightsViewProps {
    searchInsights: SearchInsights | null;
    onFollowupQuestionClicked?: (question: string) => void;
    themeStyles: ThemeStyles;
}

const InsightsView: React.FC<InsightsViewProps> = ({
    searchInsights,
    onFollowupQuestionClicked,
    themeStyles
}) => {
    // Tab animation
    const tabAnimation = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    if (!searchInsights) return null;

    return (
        <motion.div
            key="insights-tab"
            variants={tabAnimation}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="py-4"
        >
            <div className="p-4 rounded-lg border border-green-300 bg-green-50/10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium flex items-center text-green-500">
                        <BarChart size={18} className="mr-2" />
                        Search Insights
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Key Terms */}
                    {searchInsights?.keyTerms?.length > 0 && (
                        <InsightCard title="Key Terms">
                            <div className="flex flex-wrap gap-2">
                                {searchInsights.keyTerms.map((term, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-600"
                                    >
                                        {term}
                                    </span>
                                ))}
                            </div>
                        </InsightCard>
                    )}

                    {/* Query Analysis */}
                    {searchInsights?.queryAnalysis && (
                        <InsightCard title="Query Analysis">
                            <div className="space-y-2 text-sm">
                                {Object.entries(searchInsights.queryAnalysis).map(([key, value], i) => (
                                    <div key={i} className="grid grid-cols-3 gap-2 items-start">
                                        <div className="font-medium col-span-1 text-green-700">{key}</div>
                                        <div className="col-span-2 break-words font-mono text-gray-800">
                                            {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </InsightCard>
                    )}

                    {/* Suggested Queries */}
                    {searchInsights?.suggestedQueries?.length > 0 && (
                        <InsightCard title="Suggested Follow-Up Questions">
                            <div className="space-y-1">
                                {searchInsights.suggestedQueries.map((query, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onFollowupQuestionClicked?.(query)}
                                        className="flex items-center text-sm p-1.5 rounded w-full text-left hover:bg-green-100 text-green-900"
                                    >
                                        <ArrowRight size={14} className="mr-2 flex-shrink-0 text-green-500" />
                                        <span>{query}</span>
                                    </button>
                                ))}
                            </div>
                        </InsightCard>
                    )}

                    {/* Source Relevance */}
                    {searchInsights?.sourceRelevance?.length > 0 && (
                        <InsightCard title="Top Source Relevance">
                            <div className="space-y-3 text-sm max-h-40 overflow-y-auto pr-1">
                                {searchInsights.sourceRelevance.map((source, i) => {
                                    const score = source.score / 10; // Adjust score scale
                                    const displayScore = Math.min(score * 100, 100).toFixed(0);

                                    return (
                                        <div
                                            key={i}
                                            className="flex flex-col bg-green-50 p-2 rounded shadow-sm"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="truncate font-semibold text-green-700">{i + 1}. {source.fileName}</div>
                                                <div className="text-xs text-gray-500">{displayScore}%</div>
                                            </div>
                                            <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-2 bg-green-500 rounded-full transition-all duration-300"
                                                    style={{ width: `${displayScore}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </InsightCard>
                    )}
                </div>

                {/* Execution Details */}
                {searchInsights?.executionDetails && (
                    <InsightCard title="Execution Details">
                        <details className="text-xs">
                            <summary className="cursor-pointer text-green-600">Show/Hide Details</summary>
                            <pre className="whitespace-pre-wrap mt-2 bg-green-100 p-2 rounded">
                                {JSON.stringify(searchInsights.executionDetails, null, 2)}
                            </pre>
                        </details>
                    </InsightCard>
                )}
            </div>
        </motion.div>
    );
};

// Helper component for insight cards
const InsightCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="p-3 rounded-md border border-green-300 bg-white shadow-sm">
        <h4 className="text-sm font-semibold mb-2 text-green-600">{title}</h4>
        {children}
    </div>
);

export default InsightsView;