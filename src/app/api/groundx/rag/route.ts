// app/api/groundx/rag/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GroundXClient } from "groundx";
import OpenAI from "openai";
import { 
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionAssistantMessageParam
} from "openai/resources/chat/completions";

/**
 * Enhanced interface definitions to match GroundX API types
 */
interface DocumentPage {
  pageNumber: number;
  imageUrl: string;
}

interface DocumentMetadata {
  [key: string]: any;
}

interface DocumentDetail {
  document?: {
    pages?: DocumentPage[];
    metadata?: DocumentMetadata;
    title?: string;
    fileName?: string;
    content?: string; // Added field for document content
  };
}

interface SearchResultItem {
  documentId?: string;
  fileName?: string;
  score?: number;
  text?: string;
  metadata?: {
    page?: string;
    section?: string;
    [key: string]: any;
  };
  highlight?: {  // New field for highlighted matches
    text?: string[];
  };
}

interface EnhancedSource {
  id?: string;
  fileName?: string;
  score?: number;
  text: string;
  pageImages: string[];
  metadata: Record<string, any>;
  narrative: string[];
  keyPhrases?: string[];
  viewUrl?: string;
  downloadUrl?: string;
  extractedSections?: string[];
  fullExcerpt?: string;
  highlights?: string[]; // New field for search highlights
  documentContext?: string; // New field for surrounding context
  relevanceScore?: number; // New field for calculated relevance
}

interface DocumentExcerpt {
  id: string;
  fileName: string;
  excerpts: string[];
  narrative: string[];
  metadata?: Record<string, any>;
  highlights?: string[]; // New field for highlighted content
  pageNumber?: number;   // New field for page number
  contextBeforeAfter?: { // New field for context before/after
    before: string;
    after: string;
  };
}

interface Citation {
  documentId: string;
  fileName: string;
  pageNumber?: number;
  text: string;
  relevance: number;
}

interface RagResponse {
  success: boolean;
  timestamp?: string;
  query?: string;
  response: string;
  searchResults: {
    count: number;
    sources: Array<{
      id?: string;
      fileName?: string;
      score?: number;
    }>;
  };
  thoughts?: string[] | null;
  supportingContent: {
    text: string[];
  };
  enhancedResults: {
    totalResults: number;
    sources: EnhancedSource[];
  };
  documentExcerpts?: DocumentExcerpt[];
  modelUsed?: string;
  citations?: Citation[]; // New field for citation data
  executionTime?: {       // New field for performance metrics
    totalMs: number;
    searchMs: number;
    llmMs: number;
  };
  error?: string;
  errorDetails?: {
    name: string;
    stack?: string;
  };
}

// Initialize clients with error handling
let groundxClient: GroundXClient;
let openai: OpenAI;

try {
  groundxClient = new GroundXClient({
    apiKey: process.env.GROUNDX_API_KEY || '',
  });

  openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY || '',
  });
} catch (error) {
  console.error('Error initializing API clients:', error);
}

/**
 * Advanced key phrase extraction with NLP-inspired techniques
 * Uses frequency analysis, position importance, and keyword matching
 */
function extractKeyPhrases(text: string, maxPhrases: number = 5): string[] {
  if (!text || typeof text !== 'string') return [];
  
  // Look for phrases that appear to be headings
  const headings = text.match(/(?:^|\n)([A-Z][A-Za-z\s]{3,}:)/g) || [];
  
  // Important business keywords (customize for your domain)
  const domainKeywords = [
    'important', 'key', 'significant', 'critical', 'essential', 'primary',
    'result', 'conclusion', 'finding', 'recommendation', 'analysis',
    'requirement', 'specification', 'compliance', 'regulation',
    'austin', 'industries', 'construction', 'safety', 'project', 'management'
  ];
  
  // Find sentences with keywords - more sophisticated pattern matching
  const keywordRegexes = domainKeywords.map(keyword => 
    new RegExp(`[^.!?]*(?:\\b${keyword}\\b)[^.!?]*[.!?]`, 'gi')
  );
  
  const sentencesWithKeywords = keywordRegexes.flatMap(regex => 
    (text.match(regex) || []).map(s => s.trim())
  );
  
  // Find sentences at the beginning and end of paragraphs (often important)
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  const importantPositions = paragraphs.flatMap(p => {
    const sentences = p.split(/(?<=[.!?])\s+/).filter(Boolean);
    // Return first and last sentence if paragraph has multiple sentences
    if (sentences.length > 2) {
      return [sentences[0], sentences[sentences.length - 1]];
    }
    return sentences;
  });
  
  // Combine all potential key phrases and remove duplicates
  const allPhrases = [...new Set([...headings, ...sentencesWithKeywords, ...importantPositions])];
  
  // Score phrases by length, keyword presence, and capitalization
  const scoredPhrases = allPhrases.map(phrase => {
    // Base score - prefer medium length phrases (not too short, not too long)
    let score = Math.min(100, phrase.length) / 20;
    
    // Bonus for keyword presence
    domainKeywords.forEach(keyword => {
      if (phrase.toLowerCase().includes(keyword.toLowerCase())) {
        score += 0.5;
      }
    });
    
    // Bonus for capitalized words (often important)
    const capitalizedWords = (phrase.match(/\b[A-Z][a-z]+/g) || []).length;
    score += capitalizedWords * 0.3;
    
    return { phrase, score };
  });
  
  // Sort by score and take top N
  return scoredPhrases
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPhrases)
    .map(item => item.phrase.trim())
    .filter(phrase => phrase.length > 10 && phrase.length < 200); // Reasonable length
}

/**
 * Enhanced text section extraction with intelligent splitting
 * Uses semantic boundaries and structure awareness
 */
function extractTextSections(text: string, maxSections: number = 5): string[] {
  if (!text || typeof text !== 'string' || text.length === 0) return [];
  
  // First try to identify structural elements like headings
  const headingPattern = /(?:^|\n)(#{1,3}\s+.+|\b[A-Z][A-Z\s]{2,}:|\d+\.\s+[A-Z])/g;
  const headingMatches = [...text.matchAll(headingPattern)];
  
  if (headingMatches.length >= 2) {
    // Use headings to split text into logical sections
    const sections = [];
    for (let i = 0; i < headingMatches.length - 1; i++) {
      const start = headingMatches[i].index!;
      const end = headingMatches[i+1].index!;
      sections.push(text.substring(start, end).trim());
    }
    
    // Add the last section
    if (headingMatches.length > 0) {
      const lastStart = headingMatches[headingMatches.length-1].index!;
      sections.push(text.substring(lastStart).trim());
    }
    
    if (sections.length > 0) {
      return sections.slice(0, maxSections);
    }
  }
  
  // Try to split by paragraphs if no headings found
  let sections = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // If we have very few paragraphs, try to split by newlines
  if (sections.length <= 1) {
    sections = text.split(/\n/).filter(p => p.trim().length > 0);
  }
  
  // If we still have minimal sections, split by sentences and group them
  if (sections.length <= 1) {
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    sections = [];
    
    // Group sentences into logical sections with better content awareness
    // Group based on semantic cohesion - sentences that likely belong together
    let currentSection = '';
    let sentenceCount = 0;
    const maxSentencesPerSection = 3;
    
    sentences.forEach(sentence => {
      // Start a new section if this would make it too large
      if (sentenceCount >= maxSentencesPerSection || 
          (currentSection.length > 0 && currentSection.length + sentence.length > 500)) {
        if (currentSection.trim()) {
          sections.push(currentSection.trim());
        }
        currentSection = sentence;
        sentenceCount = 1;
      } else {
        currentSection += ' ' + sentence;
        sentenceCount++;
      }
    });
    
    // Add the last section if not empty
    if (currentSection.trim()) {
      sections.push(currentSection.trim());
    }
  }
  
  // Ensure sections have a reasonable length
  const processedSections = sections
    .filter(section => section.length >= 20) // Minimum meaningful length
    .map(section => section.length > 1000 ? section.substring(0, 1000) + '...' : section);
  
  // Return processed sections, limited to maxSections
  return processedSections.slice(0, maxSections);
}

/**
 * New function to extract context around a matched section
 * Provides better context for search matches
 */
function extractContextAroundMatch(text: string, matchText: string, contextWords: number = 20): { before: string, after: string } {
  if (!text || !matchText || typeof text !== 'string') {
    return { before: '', after: '' };
  }
  
  // Find the match position
  const matchPos = text.indexOf(matchText);
  if (matchPos === -1) {
    return { before: '', after: '' };
  }
  
  // Get text before the match
  const textBefore = text.substring(0, matchPos);
  const wordsBefore = textBefore.split(/\s+/).filter(Boolean);
  const before = wordsBefore.slice(-contextWords).join(' ');
  
  // Get text after the match
  const textAfter = text.substring(matchPos + matchText.length);
  const wordsAfter = textAfter.split(/\s+/).filter(Boolean);
  const after = wordsAfter.slice(0, contextWords).join(' ');
  
  return { before, after };
}

/**
 * Calculate relevance score based on content match and metadata
 * More sophisticated than raw search score
 */
function calculateRelevanceScore(result: SearchResultItem, query: string): number {
  // Start with the base score from search
  let relevanceScore = result.score || 0;
  
  // Boost score if there are highlighted matches
  if (result.highlight?.text && result.highlight.text.length > 0) {
    relevanceScore += 0.2 * result.highlight.text.length;
  }
  
  // Boost score if metadata suggests higher relevance
  if (result.metadata) {
    // Recent documents may be more relevant
    if (result.metadata.date) {
      try {
        const docDate = new Date(result.metadata.date);
        const now = new Date();
        const ageInDays = (now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24);
        // Boost newer documents (within last 30 days)
        if (ageInDays < 30) {
          relevanceScore += 0.3 * (1 - ageInDays/30);
        }
      } catch (e) {
        // Ignore date parsing errors
      }
    }
    
    // Official or final documents may be more relevant
    if (result.metadata.status === 'final' || result.metadata.status === 'official') {
      relevanceScore += 0.2;
    }
    
    // Boost if title contains query terms
    if (result.metadata.title && typeof query === 'string') {
      const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
      const titleMatches = queryTerms.filter(term => 
        result.metadata?.title?.toLowerCase().includes(term)
      ).length;
      
      if (titleMatches > 0) {
        relevanceScore += 0.1 * titleMatches;
      }
    }
  }
  
  return relevanceScore;
}

/**
 * Enhanced POST handler for RAG API
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Performance tracking
  const startTime = Date.now();
  let searchTime = 0;
  let llmTime = 0;
  
  try {
    // Validate API clients
    if (!groundxClient || !openai) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'API clients not properly initialized',
          errorDetails: {
            name: 'InitializationError',
            stack: process.env.NODE_ENV === 'development' ? 'Failed to initialize GroundX or OpenAI client' : undefined
          },
          response: '',
          searchResults: { count: 0, sources: [] },
          supportingContent: { text: [] },
          enhancedResults: { totalResults: 0, sources: [] },
          executionTime: {
            totalMs: Date.now() - startTime,
            searchMs: 0,
            llmMs: 0
          }
        },
        { status: 500 }
      );
    }

    // Parse and validate request body with improved error handling
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'Invalid JSON in request body',
          response: '',
          searchResults: { count: 0, sources: [] },
          supportingContent: { text: [] },
          enhancedResults: { totalResults: 0, sources: [] },
          executionTime: {
            totalMs: Date.now() - startTime,
            searchMs: 0,
            llmMs: 0
          }
        },
        { status: 400 }
      );
    }
    
    const { 
      query, 
      bucketId, 
      messages = [], 
      includeThoughts = false,
      limit = 10,
      maxTokens = 2000,
      temperature = 0.3,
      // New parameters for enhanced functionality
      searchType = 'hybrid',       // Options: 'semantic', 'keyword', 'hybrid'
      includeCitations = true,     // Whether to add citations to the response
      citationFormat = 'inline',   // Options: 'inline', 'footnote', 'endnote'
      responseFormat = 'markdown', // Options: 'markdown', 'html', 'text'
      includeDocumentContext = true, // Whether to fetch additional document context
      model = "gpt-4-0125-preview" // Configurable model
    } = body;
    
    console.log('RAG API request:', { 
      query, 
      bucketId, 
      messageCount: messages?.length, 
      includeThoughts,
      limit,
      maxTokens,
      temperature,
      searchType,
      includeCitations,
      responseFormat,
      model
    });
    
    if (!query) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'Query is required',
          response: '',
          searchResults: { count: 0, sources: [] },
          supportingContent: { text: [] },
          enhancedResults: { totalResults: 0, sources: [] },
          executionTime: {
            totalMs: Date.now() - startTime,
            searchMs: 0,
            llmMs: 0
          }
        },
        { status: 400 }
      );
    }
    
    if (!bucketId) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'BucketId is required',
          response: '',
          searchResults: { count: 0, sources: [] },
          supportingContent: { text: [] },
          enhancedResults: { totalResults: 0, sources: [] },
          executionTime: {
            totalMs: Date.now() - startTime,
            searchMs: 0,
            llmMs: 0
          }
        },
        { status: 400 }
      );
    }

    // 1. Search for content using GroundX with improved search options
    const searchStartTime = Date.now();
    console.log(`Searching bucket ${bucketId} for: "${query}" with type ${searchType}`);
    
    // Prepare search options based on searchType
    const searchOptions: any = {}; // Customize based on GroundX API options
    
    // Add search type configurations
    switch(searchType) {
      case 'semantic':
        searchOptions.type = 'semantic';
        searchOptions.threshold = 0.7; // Minimum semantic similarity
        break;
      case 'keyword':
        searchOptions.type = 'keyword';
        searchOptions.fuzzyMatch = true; // Enable fuzzy matching
        break;
      case 'hybrid':
      default:
        searchOptions.type = 'hybrid';
        searchOptions.semanticWeight = 0.6; // Balance between semantic and keyword
        searchOptions.keywordWeight = 0.4;
        break;
    }
    
    // Attempt search with advanced options, fallback to basic search if needed
    let searchResponse;
    try {
      searchResponse = await groundxClient.search.content(
        Number(bucketId),
        {
          query: query,
          // Advanced options - might need to be adjusted based on actual GroundX API
          // Note: If these options aren't supported, they'll be ignored
          ...searchOptions,
          highlight: true, // Request highlighted matches if supported
        }
      );
    } catch (e) {
      console.warn('Advanced search failed, falling back to basic search:', e);
      searchResponse = await groundxClient.search.content(
        Number(bucketId),
        {
          query: query
        }
      );
    }
    
    // Track search execution time
    searchTime = Date.now() - searchStartTime;
    console.log(`Search completed in ${searchTime}ms`);

    // 2. Check if we found any results
    if (!searchResponse?.search?.results || searchResponse.search.results.length === 0) {
      console.log('No search results found');
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        query: query,
        response: "I couldn't find any relevant information about that in the documents.",
        searchResults: {
          count: 0,
          sources: []
        },
        thoughts: includeThoughts ? ["Searched for information but found no relevant results in the documents."] : null,
        supportingContent: { text: [] },
        enhancedResults: { totalResults: 0, sources: [] },
        executionTime: {
          totalMs: Date.now() - startTime,
          searchMs: searchTime,
          llmMs: 0
        },
        modelUsed: model
      } as RagResponse);
    }

    console.log(`Found ${searchResponse.search.results.length} results`);
    
    // 3. Prepare enhanced results with additional document context and highlights
    const sources: EnhancedSource[] = await Promise.all(
      searchResponse.search.results.map(async (result: SearchResultItem) => {
        // Default values for missing properties
        const documentId = result.documentId || '';
        const fileName = result.fileName || `Document ${documentId}`;
        const score = result.score || 0; 
        const text = result.text || '';
        
        // Calculate enhanced relevance score
        const relevanceScore = calculateRelevanceScore(result, query);
        
        // Initialize empty collections
        let pageImages: string[] = [];
        let metadata: Record<string, any> = {};
        let narrative: string[] = [];
        let keyPhrases: string[] = [];
        let extractedSections: string[] = [];
        let fullExcerpt = text;
        let documentContext = '';
        let highlights: string[] = [];
        
        // Extract highlights from search results if available
        if (result.highlight && result.highlight.text) {
          highlights = result.highlight.text;
        }
        
        // Only attempt to fetch details if we have a document ID
        if (documentId) {
          try {
            // Fetch document details with error handling
            const docDetails = await groundxClient.documents.get(documentId) as DocumentDetail;
            
            // Process page images if available
            if (docDetails?.document?.pages?.length) {
              pageImages = docDetails.document.pages
                .filter((page: DocumentPage) => Boolean(page.imageUrl))
                .map((page: DocumentPage) => page.imageUrl);
            }
            
            // Process metadata if available
            if (docDetails?.document?.metadata) {
              metadata = { ...docDetails.document.metadata };
            }
            
            // Add document title and filename to metadata if available
            if (docDetails?.document?.title) {
              metadata.title = docDetails.document.title;
            }
            
            if (docDetails?.document?.fileName) {
              metadata.originalFileName = docDetails.document.fileName;
            }
            
            // Fetch additional document context if requested and available
            if (includeDocumentContext && docDetails?.document?.content) {
              const fullContent = docDetails.document.content;
              if (text && fullContent.includes(text)) {
                // Extract surrounding context from the full document
                const contextObj = extractContextAroundMatch(fullContent, text, 50);
                documentContext = `${contextObj.before} [MATCH] ${contextObj.after}`;
              } else {
                // If direct match not found, use the beginning of the document
                documentContext = fullContent.substring(0, 1000) + '...';
              }
            }
            
            // Generate a narrative summary if we have text content
            if (text.length > 0) {
              // Enhanced summary extraction with longer context
              const summaryLength = Math.min(500, text.length); 
              const summary = text.substring(0, summaryLength) + (text.length > summaryLength ? '...' : '');
              
              // Extract key phrases from the text with improved relevance
              keyPhrases = extractKeyPhrases(text);
              
              // Extract meaningful sections from the text for better excerpts
              extractedSections = extractTextSections(text, 5);
              
              // Create a narrative with document summary and key points
              narrative = [
                `Document summary: ${summary}`,
              ];
              
              if (keyPhrases.length > 0) {
                narrative.push(`Key points: ${keyPhrases.join('; ')}`);
              }
              
              // Add location context if available
              if (metadata.page) {
                narrative.push(`Page: ${metadata.page}`);
              }
              
              if (metadata.section) {
                narrative.push(`Section: ${metadata.section}`);
              }
              
              // Add highlight information if available
              if (highlights.length > 0) {
                narrative.push(`Matching content: ${highlights[0]}`);
              }
            }
          } catch (err) {
            console.warn(`Error fetching enhanced details for document ${documentId}:`, err);
            // Add error info to narrative for debugging
            narrative = [`Could not load enhanced details for this document. ${err instanceof Error ? err.message : ''}`];
          }
        }
        
        // Add metadata from search result
        if (result.metadata) {
          metadata = {
            ...metadata,
            page: result.metadata.page,
            section: result.metadata.section,
            ...result.metadata
          };
        }
        
        // Create document viewing and download URLs
        let viewUrl;
        let downloadUrl;
        
        if (documentId) {
          // Create URLs for viewing and downloading the document
          // These URL patterns will depend on your frontend routes
          viewUrl = `/api/groundx/documents/view/${documentId}`;
          downloadUrl = `/api/groundx/documents/download/${documentId}`;
        }
        
        // Return complete source object with all enhanced information
        return {
          id: documentId,
          fileName,
          score,
          text,
          pageImages,
          metadata,
          narrative,
          keyPhrases,
          viewUrl,
          downloadUrl,
          extractedSections,
          fullExcerpt,
          highlights,
          documentContext,
          relevanceScore
        };
      })
    );

    // 4. Sort sources by relevance score for better result ordering
    sources.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    
    // 5. Create document excerpts with enhanced context
    const documentExcerpts: DocumentExcerpt[] = sources.map(source => {
      // Determine page number
      const pageNumber = source.metadata?.page 
        ? parseInt(source.metadata.page as string, 10) 
        : undefined;
      
      // Get context before/after for the best match
      let contextBeforeAfter = { before: '', after: '' };
      if (source.highlights && source.highlights.length > 0 && source.text) {
        contextBeforeAfter = extractContextAroundMatch(source.text, source.highlights[0], 20);
      }
      
      return {
        id: source.id || '',
        fileName: source.fileName || 'Unknown document',
        excerpts: source.extractedSections || [],
        narrative: source.narrative || [],
        metadata: source.metadata,
        highlights: source.highlights || [],
        pageNumber,
        contextBeforeAfter
      };
    });
    
    // 6. Prepare enhanced context for LLM from search results
    // Create more structured context with clearer source information
    let enhancedContext = '';
    
    // Generate different context formats based on responseFormat
    if (responseFormat === 'markdown' || responseFormat === 'html') {
      enhancedContext = `# Search Context for Query: "${query}"\n\n`;
      
      sources.forEach((source, index) => {
        enhancedContext += `## Document ${index + 1}: ${source.fileName || source.id || 'Unknown'}\n`;
        
        if (source.metadata?.title) {
          enhancedContext += `**Title:** ${source.metadata.title}\n`;
        }
        
        if (source.metadata?.page) {
          enhancedContext += `**Page:** ${source.metadata.page}\n`;
        }
        
        // Add document ID for citation references
        enhancedContext += `**Document ID:** ${source.id || 'Unknown'}\n\n`;
        
        // Add highlighted matches first if available
        if (source.highlights && source.highlights.length > 0) {
          enhancedContext += `**Highlighted Matches:**\n`;
          source.highlights.slice(0, 3).forEach(highlight => {
            enhancedContext += `> ${highlight}\n`;
          });
          enhancedContext += '\n';
        }
        
        // Add full content
        enhancedContext += `**Content:**\n${source.text}\n\n`;
        
        // Add key phrases if available
        if (source.keyPhrases && source.keyPhrases.length > 0) {
          enhancedContext += `**Key Points:** ${source.keyPhrases.join('; ')}\n\n`;
        }
        
        enhancedContext += '---\n\n';
      });
    } else {
      // Plain text format
      enhancedContext = `Search Context for Query: "${query}"\n\n`;
      
      sources.forEach((source, index) => {
        enhancedContext += `Document ${index + 1}: ${source.fileName || source.id || 'Unknown'}\n`;
        
        if (source.metadata?.title) {
          enhancedContext += `Title: ${source.metadata.title}\n`;
        }
        
        if (source.metadata?.page) {
          enhancedContext += `Page: ${source.metadata.page}\n`;
        }
        
        enhancedContext += `Document ID: ${source.id || 'Unknown'}\n\n`;
        
        // Add highlighted matches
        if (source.highlights && source.highlights.length > 0) {
          enhancedContext += `Highlighted Matches:\n`;
          source.highlights.slice(0, 3).forEach(highlight => {
            enhancedContext += `* ${highlight}\n`;
          });
          enhancedContext += '\n';
        }
        
        // Add content
        enhancedContext += `Content:\n${source.text}\n\n`;
        
        enhancedContext += '----------------\n\n';
      });
    }
    
    // 7. Create system prompt with improved instructions for different response formats
    let systemPrompt = `You are an AI assistant answering questions based on retrieved documents.
Base your answers only on the content provided below and avoid making assumptions.
If the documents don't contain relevant information, acknowledge that you don't have enough information.

${includeCitations ? `Use citations when referencing specific information from the documents.
Citation format: ${citationFormat === 'inline' ? '[Document Name, Page X]' : 
  citationFormat === 'footnote' ? 'with numbered footnotes¹' : 
  'with endnote references (1)'}` : ''}

CONTEXT FROM DOCUMENTS:
${enhancedContext}

When responding:
1. Be concise and focus on information from the documents
2. ${includeCitations ? `Cite your sources using the ${citationFormat} format shown above` : 'Identify which document provides each piece of information'}
3. If multiple documents provide the same information, cite all relevant sources
4. Only discuss information found in the documents
5. Format your response as ${responseFormat === 'markdown' ? 'Markdown' : 
   responseFormat === 'html' ? 'HTML' : 'plain text'} with clear sections${
   responseFormat === 'markdown' ? ', **bold** for emphasis, and `code` for any technical terms' : 
   responseFormat === 'html' ? ', <strong>bold</strong> for emphasis, and <code>code</code> for any technical terms' : 
   ''}
6. Present numerical data in ${responseFormat === 'markdown' ? 'Markdown tables' : 
   responseFormat === 'html' ? 'HTML tables' : 'organized lists'} when appropriate
7. If documents contradict each other, acknowledge the different perspectives

For each citation, include the document name and page number if available.`;

    // Add thought process instructions if requested with improved formatting guidance
    if (includeThoughts) {
      systemPrompt += `\n\nAdditionally, explain your thought process in the following format:
1. First, think about the key aspects of the question
2. Identify the most relevant information from the documents
3. Organize the information to formulate a clear response
4. Provide citations for all facts from the documents
5. Consider alternative interpretations if the documents contain ambiguous information

Format your entire response as a JSON object with two fields:
{
  "answer": "Your complete answer with citations here",
  "thoughts": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
}`;
    }

    // 8. Prepare conversation history for OpenAI with type validation
    const conversationHistory: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt } as ChatCompletionSystemMessageParam
    ];
    
    // Include recent conversation history if provided with validation
    if (Array.isArray(messages) && messages.length > 0) {
      // Include up to 10 recent messages for more context (increased from 8)
      const recentMessages = messages.slice(-10, -1);
      
      // Only keep user, assistant, and system messages to avoid the name/tool_call_id requirements
      const filteredMessages = recentMessages.filter(msg => 
        msg && typeof msg === 'object' && 
        ['user', 'assistant', 'system'].includes(msg.role) &&
        typeof msg.content === 'string'
      );
      
      // Map messages to their appropriate types
      const typedMessages: ChatCompletionMessageParam[] = filteredMessages.map(msg => {
        if (msg.role === 'user') {
          return { role: 'user', content: msg.content } as ChatCompletionUserMessageParam;
        } else if (msg.role === 'assistant') {
          return { role: 'assistant', content: msg.content } as ChatCompletionAssistantMessageParam;
        } else {
          return { role: 'system', content: msg.content } as ChatCompletionSystemMessageParam;
        }
      });
      
      conversationHistory.push(...typedMessages);
    }
    
    // Add current query as user message
    conversationHistory.push({ 
      role: 'user', 
      content: query 
    } as ChatCompletionUserMessageParam);

    console.log('Sending to OpenAI with conversation history length:', conversationHistory.length);
    
    // 9. Generate response using OpenAI with configurable parameters
    const llmStartTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: model, // Use configurable model
      messages: conversationHistory,
      temperature: temperature,
      max_tokens: maxTokens,
      top_p: 0.95,
    }).catch(error => {
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
    llmTime = Date.now() - llmStartTime;
    console.log(`LLM processing completed in ${llmTime}ms`);

    // Validate OpenAI response
    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const response = completion.choices[0].message.content;
    
    // 10. Process the response to extract thoughts and parse citations
    let finalResponse = response;
    let thoughts: string[] | null = null;
    let citations: Citation[] = [];
    
    // Parse the response if it's JSON format with thoughts
    if (includeThoughts && response) {
      try {
        const jsonResponse = JSON.parse(response);
        if (jsonResponse?.answer && Array.isArray(jsonResponse?.thoughts)) {
          finalResponse = jsonResponse.answer;
          thoughts = jsonResponse.thoughts;
        }
      } catch (e) {
        console.warn('Failed to parse JSON response with thoughts', e);
        // Use the original response, and create a more detailed thought process
        thoughts = [
          "Analyzed the search results to find relevant information",
          "Identified key documents based on relevance scores",
          "Extracted important context from " + sources.length + " sources",
          "Recognized key sections and metadata in the documents",
          "Formulated a response based on document content",
          "Added citations to reference the source documents"
        ];
      }
    }
    
    // Extract citations if requested
    if (includeCitations) {
      // For inline citations [Document Name, Page X]
      if (citationFormat === 'inline') {
        const citationRegex = /\[([\w\s\-]+)(?:,\s*(?:Page|page|p\.)\s*(\d+))?\]/g;
        let match;
        while ((match = citationRegex.exec(finalResponse)) !== null) {
          const docName = match[1].trim();
          const pageNum = match[2] ? parseInt(match[2], 10) : undefined;
          
          // Find the source document
          const source = sources.find(s => 
            s.fileName === docName || 
            (s.metadata?.title && s.metadata.title === docName)
          );
          
          if (source) {
            citations.push({
              documentId: source.id || '',
              fileName: source.fileName || docName,
              pageNumber: pageNum,
              text: match[0],
              relevance: source.relevanceScore || 0
            });
          }
        }
      }
      // For footnotes/endnotes with numbers
      else {
        const citationRegex = /(?:(?:\[(\d+)\])|(?:\((\d+)\))|(?:(\d+)(?:¹|²|³|⁴|⁵|⁶|⁷|⁸|⁹|⁰|†)))/g;
        let match;
        while ((match = citationRegex.exec(finalResponse)) !== null) {
          const index = (match[1] || match[2] || match[3]) ? 
            parseInt(match[1] || match[2] || match[3], 10) - 1 : -1;
          
          if (index >= 0 && index < sources.length) {
            const source = sources[index];
            citations.push({
              documentId: source.id || '',
              fileName: source.fileName || `Document ${index + 1}`,
              pageNumber: source.metadata?.page ? parseInt(source.metadata.page as string, 10) : undefined,
              text: match[0],
              relevance: source.relevanceScore || 0
            });
          }
        }
      }
    }
    
    // 11. Format content for the supporting content component with more detail
    const supportingContent = {
      text: sources.map(source => {
        let content = `${source.fileName || source.id || 'Unknown document'}`;
        
        if (source.metadata?.page) {
          content += ` (Page ${source.metadata.page})`;
        }
        
        if (source.metadata?.title) {
          content += `: ${source.metadata.title}`;
        }
        
        // Include highlights if available
        if (source.highlights && source.highlights.length > 0) {
          content += `\nHighlights: ${source.highlights.join(' ... ')}`;
        }
        
        content += `\n${source.text}`;
        
        return content;
      })
    };
    
    // 12. Return comprehensive response with all enhanced data
    const totalTime = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      query: query,
      response: finalResponse,
      searchResults: {
        count: searchResponse.search.results.length,
        sources: sources.map(({ id, fileName, score }) => ({ id, fileName, score }))
      },
      thoughts,
      supportingContent,
      enhancedResults: {
        totalResults: sources.length,
        sources
      },
      documentExcerpts,
      citations: includeCitations ? citations : undefined,
      executionTime: {
        totalMs: totalTime,
        searchMs: searchTime,
        llmMs: llmTime
      },
      modelUsed: model
    } as RagResponse);
    
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error('RAG API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        timestamp: new Date().toISOString(),
        query: error.query || '', 
        error: error.message || 'RAG processing failed',
        errorDetails: error instanceof Error ? {
          name: error.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        } : undefined,
        response: '',
        searchResults: { count: 0, sources: [] },
        supportingContent: { text: [] },
        enhancedResults: { totalResults: 0, sources: [] },
        executionTime: {
          totalMs: totalTime,
          searchMs: 0,
          llmMs: 0
        }
      } as RagResponse,
      { status: 500 }
    );
  }
}