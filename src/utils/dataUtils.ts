// utils/dataUtils.ts
import { Source } from '../types';
import { extractParagraphs } from './analysisUtils';

/**
 * Gets all sources from various inputs
 * @param answer Answer object that might contain sources
 * @param searchResults Optional search results that might contain sources
 * @param documentExcerpts Optional document excerpts
 * @param debugMode Whether to include debug information
 * @returns Array of Source objects
 */
export const getAllSources = (
    answer: any,
    searchResults?: any[],
    documentExcerpts?: any[],
    debugMode: boolean = false
): Source[] => {
    const sources: Source[] = [];
    
    // Process sources from the answer object
    if (answer && answer.sources) {
        const answerSources = Array.isArray(answer.sources) 
            ? answer.sources 
            : [answer.sources];
            
        answerSources.forEach((source: any, index: number) => {
            if (source) {
                sources.push({
                    id: source.id || `answer-source-${index}`,
                    fileName: source.fileName || source.name || `Source ${index + 1}`,
                    title: source.title || source.name,
                    author: source.author,
                    datePublished: source.datePublished || source.date,
                    type: source.type || source.documentType || 'document',
                    url: source.url,
                    score: source.score || source.relevanceScore,
                    fileSize: source.fileSize || source.size,
                    content: source.content || source.text,
                    fullText: source.fullText,
                    excerpts: Array.isArray(source.excerpts) ? source.excerpts : undefined
                });
            }
        });
    }
    
    // Process search results as sources
    if (searchResults && Array.isArray(searchResults)) {
        searchResults.forEach((result, index) => {
            if (result) {
                const source: Source = {
                    id: result.id || `search-result-${index}`,
                    fileName: result.title || `Search Result ${index + 1}`,
                    title: result.title,
                    author: result.author || result.source,
                    datePublished: result.date || result.published,
                    type: 'search_result',
                    url: result.url || result.link,
                    score: result.score || 0.7,
                    excerpts: result.snippets || result.excerpts || [result.snippet || result.description].filter(Boolean)
                };
                
                sources.push(source);
            }
        });
    }
    
    // Process document excerpts as sources
    if (documentExcerpts && Array.isArray(documentExcerpts)) {
        documentExcerpts.forEach((doc, index) => {
            if (doc) {
                const source: Source = {
                    id: doc.id || `document-${index}`,
                    fileName: doc.fileName || doc.name || `Document ${index + 1}`,
                    title: doc.title || doc.name,
                    type: doc.type || 'document',
                    score: doc.score || doc.relevance || 0.8,
                    excerpts: Array.isArray(doc.excerpts) ? doc.excerpts : [doc.text || doc.content].filter(Boolean)
                };
                
                sources.push(source);
            }
        });
    }
    
    // Add debug sources if in debug mode
    if (debugMode && sources.length === 0) {
        // Add some sample sources for testing
        for (let i = 0; i < 5; i++) {
            sources.push({
                id: `debug-source-${i}`,
                fileName: `Debug Document ${i + 1}.pdf`,
                title: `Sample Debug Document ${i + 1}`,
                author: 'Debug Author',
                datePublished: new Date().toISOString().split('T')[0],
                type: 'pdf',
                score: 0.7 + (i * 0.05),
                excerpts: [
                    `This is a debug excerpt ${i + 1} for testing the sources view component.`,
                    `Another debug excerpt from document ${i + 1} with additional context.`
                ]
            });
        }
    }
    
    return sources;
};

/**
 * Gets the excerpts from a source document
 * @param source The source document
 * @returns Array of excerpt strings
 */
export const getSourceExcerpts = (source: Source): string[] => {
    if (!source) return [];
    
    // If we have explicit excerpts field, use it
    if (source.excerpts && Array.isArray(source.excerpts)) {
        return source.excerpts;
    }
    
    // If we have a fullText or content field, extract excerpts
    if (source.fullText || source.content) {
        const text = source.fullText || source.content || '';
        // Extract sentences or paragraphs - simple approach for now
        return extractParagraphs(text).slice(0, 3); // Return first 3 paragraphs
    }
    
    return [];
};