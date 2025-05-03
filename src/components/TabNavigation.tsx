// components/TabNavigation.tsx
import React from 'react';
import {
    Lightbulb,
    Database,
    BarChart,
    LineChart,
    Code
} from 'lucide-react';
import { ThemeStyles } from '../types';

interface TabNavigationProps {
    activeTab: string;
    setActiveTab: (tab: 'answer' | 'raw' | 'thought-process' | 'sources' | 'insights' | 'analytics') => void;
    hasThoughts: boolean;
    hasRagResults: boolean;
    hasSearchInsights: boolean;
    enableAdvancedFeatures: boolean;
    themeStyles: ThemeStyles;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
    activeTab,
    setActiveTab,
    hasThoughts,
    hasRagResults,
    hasSearchInsights,
    enableAdvancedFeatures,
    themeStyles
}) => {
    return (
        <div className="mb-4 border-b" style={{ borderColor: themeStyles.borderColor }}>
            <div className="flex space-x-2 overflow-x-auto scrollbar-thin">
                <button 
                    className={`px-3 py-2 text-sm font-medium ${
                        activeTab === 'answer' 
                            ? 'border-b-2' 
                            : 'hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab('answer')}
                    style={{ 
                        color: activeTab === 'answer' ? themeStyles.primaryColor : themeStyles.textColor,
                        borderColor: activeTab === 'answer' ? themeStyles.primaryColor : 'transparent'
                    }}
                >
                    Answer
                </button>
                
                {hasThoughts && (
                    <button 
                        className={`px-3 py-2 text-sm font-medium flex items-center ${
                            activeTab === 'thought-process' 
                                ? 'border-b-2' 
                                : 'hover:border-gray-300'
                        }`}
                        onClick={() => setActiveTab('thought-process')}
                        style={{ 
                            color: activeTab === 'thought-process' ? '#F59E0B' : themeStyles.textColor,
                            borderColor: activeTab === 'thought-process' ? '#F59E0B' : 'transparent'
                        }}
                    >
                        <Lightbulb size={14} className="mr-1" />
                        Thought Process
                    </button>
                )}
                
                {hasRagResults && (
                    <button 
                        className={`px-3 py-2 text-sm font-medium flex items-center ${
                            activeTab === 'sources' 
                                ? 'border-b-2' 
                                : 'hover:border-gray-300'
                        }`}
                        onClick={() => setActiveTab('sources')}
                        style={{ 
                            color: activeTab === 'sources' ? themeStyles.secondaryColor : themeStyles.textColor,
                            borderColor: activeTab === 'sources' ? themeStyles.secondaryColor : 'transparent'
                        }}
                    >
                        <Database size={14} className="mr-1" />
                        Sources
                    </button>
                )}
                
                {hasSearchInsights && (
                    <button 
                        className={`px-3 py-2 text-sm font-medium flex items-center ${
                            activeTab === 'insights' 
                                ? 'border-b-2' 
                                : 'hover:border-gray-300'
                        }`}
                        onClick={() => setActiveTab('insights')}
                        style={{ 
                            color: activeTab === 'insights' ? '#10B981' : themeStyles.textColor,
                            borderColor: activeTab === 'insights' ? '#10B981' : 'transparent'
                        }}
                    >
                        <BarChart size={14} className="mr-1" />
                        Insights
                    </button>
                )}
                
                {enableAdvancedFeatures && (
                    <button 
                        className={`px-3 py-2 text-sm font-medium flex items-center ${
                            activeTab === 'analytics' 
                                ? 'border-b-2' 
                                : 'hover:border-gray-300'
                        }`}
                        onClick={() => setActiveTab('analytics')}
                        style={{ 
                            color: activeTab === 'analytics' ? '#3B82F6' : themeStyles.textColor,
                            borderColor: activeTab === 'analytics' ? '#3B82F6' : 'transparent'
                        }}
                    >
                        <LineChart size={14} className="mr-1" />
                        Analytics
                    </button>
                )}
                
                <button 
                    className={`px-3 py-2 text-sm font-medium flex items-center ${
                        activeTab === 'raw' 
                            ? 'border-b-2' 
                            : 'hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab('raw')}
                    style={{ 
                        color: activeTab === 'raw' ? themeStyles.textColor : `${themeStyles.textColor}80`,
                        borderColor: activeTab === 'raw' ? themeStyles.textColor : 'transparent'
                    }}
                >
                    <Code size={14} className="mr-1" />
                    Raw Response
                </button>
            </div>
        </div>
    );
};

export default TabNavigation;