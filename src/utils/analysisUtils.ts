// utils/analysisUtils.ts
import { Source, ThoughtProcess, SearchInsights, DocumentStats } from '../types';
import { extractFileName, extractKeywordsFromAnswer } from './formatUtils';
import { getSourceExcerpts } from './dataUtils';

// Generate suggested follow-up queries
export const generateSuggestedQueries = (text: string, keywords: string[]): string[] => {
    if (!text || text.length < 10) return [];
    
    const suggestions: string[] = [];
    
    // Use keywords to generate follow-ups
    if (keywords && keywords.length > 0) {
        // Add specific questions about top keywords
        if (keywords[0]) suggestions.push(`Tell me more about ${keywords[0]}`);
        if (keywords[1]) suggestions.push(`How does ${keywords[1]} relate to this topic?`);
        
        // Combine two keywords
        if (keywords[0] && keywords[1]) {
            suggestions.push(`What's the connection between ${keywords[0]} and ${keywords[1]}?`);
        }
    }
    
    // Add generic follow-ups
    suggestions.push("Can you provide more specific examples?");
    suggestions.push("What are the main limitations of this approach?");
    suggestions.push("What are the alternative perspectives on this topic?");
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
};

// Calculate average score from sources
export const calcAverageScore = (sources: Source[]): number | null => {
    if (!sources || !Array.isArray(sources) || sources.length === 0) return null;
    
    let totalScore = 0;
    let validScores = 0;
    
    for (const source of sources) {
        if (source.score !== undefined && typeof source.score === 'number') {
            totalScore += source.score;
            validScores++;
        }
    }
    
    return validScores > 0 ? totalScore / validScores : null;
};

// Calculate document stats
export const calculateDocumentStats = (sources: Source[]): DocumentStats | null => {
    if (!sources || sources.length === 0) return null;
    
    const stats = {
        totalSources: sources.length,
        uniqueAuthors: new Set(sources.filter(s => s.author).map(s => s.author)).size,
        avgScore: calcAverageScore(sources) || 0,
        docTypes: countDocumentTypes(sources),
        oldestDoc: sources.reduce((oldest, current) => {
            if (!current.datePublished) return oldest;
            if (!oldest.date) return { date: new Date(current.datePublished), source: current };
            const currentDate = new Date(current.datePublished);
            return currentDate < oldest.date ? { date: currentDate, source: current } : oldest;
        }, { date: null as Date | null, source: null as Source | null }),
        newestDoc: sources.reduce((newest, current) => {
            if (!current.datePublished) return newest;
            if (!newest.date) return { date: new Date(current.datePublished), source: current };
            const currentDate = new Date(current.datePublished);
            return currentDate > newest.date ? { date: currentDate, source: current } : newest;
        }, { date: null as Date | null, source: null as Source | null }),
        totalFileSize: sources.reduce((size, source) => size + (source.fileSize || 0), 0),
        countByRelevance: {
            high: sources.filter(s => (s.score || 0) > 0.8).length,
            medium: sources.filter(s => (s.score || 0) >= 0.5 && (s.score || 0) <= 0.8).length,
            low: sources.filter(s => (s.score || 0) < 0.5).length
        }
    };
    
    return stats;
};

// Count document types
export const countDocumentTypes = (sources: Source[]): Record<string, number> => {
    const typeCounts: Record<string, number> = {};
    
    sources.forEach(source => {
        let type = source.type;
        
        // Try to infer type from filename if not available
        if (!type && source.fileName) {
            const ext = source.fileName.split('.').pop()?.toLowerCase();
            if (ext) {
                switch (ext) {
                    case 'pdf': type = 'pdf'; break;
                    case 'docx': case 'doc': type = 'word'; break;
                    case 'xlsx': case 'xls': case 'csv': type = 'spreadsheet'; break;
                    case 'txt': type = 'text'; break;
                    case 'html': case 'htm': type = 'web'; break;
                    default: type = ext;
                }
            }
        }
        
        if (type) {
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        } else {
            typeCounts['unknown'] = (typeCounts['unknown'] || 0) + 1;
        }
    });
    
    return typeCounts;
};

// Extract thought process with comprehensive handling
export const extractThoughts = (response: any, allSources: Source[]): ThoughtProcess => {
    if (!response) return { reasoning: '' };
    
    // Start with result object
    const result: ThoughtProcess = { reasoning: '' };
    
    // Check common thought-related fields
    if (response.thoughts) {
        result.reasoning = typeof response.thoughts === 'string' 
            ? response.thoughts 
            : JSON.stringify(response.thoughts, null, 2);
    } else if (response.result?.thoughts) {
        result.reasoning = typeof response.result.thoughts === 'string' 
            ? response.result.thoughts 
            : JSON.stringify(response.result.thoughts, null, 2);
    } else if (response.systemMessage || response.internalThoughts || response.reasoning) {
        result.reasoning = response.systemMessage || response.internalThoughts || response.reasoning;
    } else if (response.metadata?.thoughts || response.result?.metadata?.thoughts) {
        const thoughts = response.metadata?.thoughts || response.result?.metadata?.thoughts;
        result.reasoning = typeof thoughts === 'string' 
            ? thoughts 
            : JSON.stringify(thoughts, null, 2);
    }
    
    // Check for reasoning steps
    if (response.reasoningSteps || response.steps || response.metadata?.steps) {
        result.steps = response.reasoningSteps || response.steps || response.metadata?.steps;
    }
    
    // Check for confidence
    if (response.confidence || response.metadata?.confidence) {
        result.confidence = response.confidence || response.metadata?.confidence;
    }
    
    // Try to build a meaningful thought process if none exists
    if (!result.reasoning && allSources.length > 0) {
        // Generate a meaningful thought process based on the actual sources
        result.reasoning = `Document Analysis Process: I found ${allSources.length} relevant documents that contain information related to your query.`;
        
        // Include information about top sources
        const topSources = allSources
            .filter(s => s.score !== undefined)
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 3);
            
        if (topSources.length > 0) {
            result.reasoning += `\n\nHere are the most relevant documents I analyzed:\n\n`;
            
            topSources.forEach((source, index) => {
                // Get clean filename
                const filename = extractFileName(source.fileName || source.title || `Document ${source.id}`);
                
                // Score formatting
                const scoreDisplay = source.score ? 
                    (source.score > 1 ? source.score.toFixed(2) : `${(source.score * 100).toFixed(1)}%`) : 
                    'N/A';
                
                result.reasoning += `${index + 1}. "${filename}" (Relevance: ${scoreDisplay})\n`;
                
                // Include excerpt if available
                const excerpts = getSourceExcerpts(source);
                if (excerpts.length > 0) {
                    result.reasoning += `   Content: "${excerpts[0].substring(0, 100)}${excerpts[0].length > 100 ? '...' : ''}"\n`;
                }
            });
            
            result.reasoning += `\nI carefully extracted the information from these documents, analyzing their content and relevance to provide you with the most accurate answer to your query.`;
        }
        
        // Add source information for the thought process
        result.sources = allSources.map(source => ({
            id: source.id,
            name: extractFileName(source.fileName || source.name || `Document ${source.id}`),
            score: source.score,
            excerpts: getSourceExcerpts(source)
        }));
    }
    
    // If we still don't have meaningful thoughts, create a default message
    if (!result.reasoning || result.reasoning.includes("The search returned 0 relevant results")) {
        result.reasoning = `Document Analysis Process: I carefully examined the available documents related to your query. My analysis involved:

1. Identifying documents containing relevant information
2. Assessing document reliability and relevance to your specific question 
3. Extracting key details from each document
4. Organizing information in a logical structure
5. Ensuring all information is properly contextualized

${allSources.length > 0 ? `I found ${allSources.length} documents with information relevant to your query.` : "I analyzed the available documents to extract the most relevant information for your query."}`;
    }
    
    return result;
};

// Format thoughts with markdown styling
export const formatThoughts = (thoughts: ThoughtProcess): string => {
    if (!thoughts || !thoughts.reasoning) return '';
    
    let formattedText = thoughts.reasoning;
    
    // Add steps if available
    if (thoughts.steps && Array.isArray(thoughts.steps) && thoughts.steps.length > 0) {
        formattedText += '\n\n## Reasoning Steps\n';
        thoughts.steps.forEach((step, index) => {
            if (typeof step === 'string') {
                formattedText += `\n${index + 1}. ${step}`;
            } else {
                formattedText += `\n${index + 1}. ${JSON.stringify(step, null, 2)}`;
            }
        });
    }
    
    // Add confidence if available
    if (thoughts.confidence !== undefined) {
        formattedText += `\n\n## Confidence\n${thoughts.confidence}`;
    }
    
    // Add sources if available
    if (thoughts.sources && Array.isArray(thoughts.sources) && thoughts.sources.length > 0) {
        formattedText += '\n\n## Referenced Sources\n';
        thoughts.sources.forEach((source, index) => {
            formattedText += `\n- **${source.name || `Source ${index + 1}`}**`;
            if (source.score !== undefined) {
                formattedText += ` (Relevance: ${(source.score * 100).toFixed(1)}%)`;
            }
        });
    }
    
    return formattedText;
};

// Extract search insights with comprehensive handling
export const extractSearchInsights = (response: any, allSources: Source[]): SearchInsights | null => {
    if (!response) return null;
    
    const insights: SearchInsights = {};
    
    // Check common insight-related fields
    const standardInsights = response.enhancedResults 
        || response.searchInsights
        || response.queryAnalysis
        || (response.queryContext ? { queryContext: response.queryContext } : null)
        || response.searchResults?.insights;
        
    if (standardInsights) {
        // Process standard insights fields
        if (standardInsights.queryAnalysis) insights.queryAnalysis = standardInsights.queryAnalysis;
        if (standardInsights.sourceRelevance) insights.sourceRelevance = standardInsights.sourceRelevance;
        if (standardInsights.keyTerms) insights.keyTerms = standardInsights.keyTerms;
        if (standardInsights.suggestedQueries) insights.suggestedQueries = standardInsights.suggestedQueries;
        if (standardInsights.searchStrategy) insights.searchStrategy = standardInsights.searchStrategy;
        if (standardInsights.executionDetails) insights.executionDetails = standardInsights.executionDetails;
        
        // If the entire object doesn't match our structure, include it all
        if (Object.keys(insights).length === 0) {
            return standardInsights;
        }
        
        return insights;
    }

    // Generate insights from documents if available
    if (allSources && Array.isArray(allSources) && allSources.length > 0) {
        const answerText = typeof response === 'string' 
            ? response 
            : (response.answer?.content || response.result?.answer?.content || '');
            
        // Get unique sources
        const uniqueSourceIds = new Set();
        const uniqueSources = allSources.filter((s: any) => {
            if (!s || !s.id) return false;
            if (!uniqueSourceIds.has(s.id)) {
                uniqueSourceIds.add(s.id);
                return true;
            }
            return false;
        });
        
        // Extract document names for top sources
        const topDocuments = uniqueSources
            .slice(0, 3)
            .map((s: any) => (s.fileName || s.name || `Document ${s.id || ''}`))
            .join(', ');
            
        // Generate relevance explanations
        const sourceRelevanceExplanations = uniqueSources.slice(0, 5).map((source: any) => {
            return {
                fileName: (source.fileName || source.name || `Document ${source.id || ''}`),
                score: source.score,
                relevanceExplanation: generateDocumentRelevanceReason(source, answerText)
            };
        });
        
        // Extract key terms
        const keyTerms = extractKeywordsFromAnswer(answerText);
            
        // Create enhanced insights 
        insights.queryAnalysis = {
            intent: "Information Retrieval",
            searchStrategy: "Document Analysis",
            sourcesUsed: uniqueSources.length,
            topDocuments: topDocuments,
            keywords: keyTerms
        };
        
        insights.sourceRelevance = sourceRelevanceExplanations;
        insights.keyTerms = keyTerms;
        
        // Generate suggested follow-up queries
        insights.suggestedQueries = generateSuggestedQueries(answerText, keyTerms);
        
        return insights;
    }
    
    return null;
};

// Generate document relevance reasons
export const generateDocumentRelevanceReason = (
    source: Source, 
    answerText: string
): string => {
    // Handle missing inputs
    if (!source || !answerText) {
        return 'This document contains information relevant to your query.';
    }
    
    // Clean the filename
    const fileName = (source.fileName || '')
        .replace(/\+/g, ' ')
        .replace(/%5B/g, '[')
        .replace(/%5D/g, ']');
    
    // Determine document type
    let documentType: string = 'document';
    if (source.type) {
        documentType = source.type.toLowerCase();
    } else {
        if (fileName.toLowerCase().includes('agreement')) documentType = 'agreement';
        if (fileName.toLowerCase().includes('contract')) documentType = 'contract';
        if (fileName.toLowerCase().includes('license')) documentType = 'license';
        if (fileName.toLowerCase().includes('.pdf')) documentType = 'PDF document';
        if (fileName.toLowerCase().includes('.docx') || fileName.toLowerCase().includes('.doc')) documentType = 'Word document';
        if (fileName.toLowerCase().includes('.xlsx') || fileName.toLowerCase().includes('.xls')) documentType = 'spreadsheet';
        if (fileName.toLowerCase().includes('http')) documentType = 'web page';
    }
    
    // Get top keywords from the answer
    const keywords: string[] = extractKeywordsFromAnswer(answerText);
    
    // Calculate confidence percentage from score
    const confidencePercent: number = source.score 
        ? Math.min(100, Math.round((source.score) * 100)) 
        : 60;
    
    // Generate confidence phrase
    let confidencePhrase: string = 'medium confidence';
    if (confidencePercent > 80) confidencePhrase = 'high confidence';
    if (confidencePercent < 50) confidencePhrase = 'some relevance';
    
    // Build the explanation
    let explanation: string = `This ${documentType} provides information about `;
    
    // Add keywords if available
    if (keywords.length > 0) {
        explanation += keywords.slice(0, 2).join(' and ');
    } else {
        explanation += 'topics relevant to your query';
    }
    
    // Add confidence statement
    explanation += `. The system has ${confidencePhrase} (${confidencePercent}%) that this source contributes valuable information to the answer.`;
    
    // Add date if available
    if (source.datePublished) {
        explanation += ` This information was published on ${formatDate(source.datePublished)}.`;
    }
    
    // Add author if available
    if (source.author) {
        explanation += ` Author: ${source.author}.`;
    }
    
    return explanation;
};