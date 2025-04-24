/**
 * Document-JSON Converter Utility
 * 
 * This utility provides functions to convert between document formats and JSON formats,
 * making it easier to work with both storage systems.
 */

import { DocumentMetadata, DocumentContent, DocumentAnalysis, JsonDocumentMetadata } from '@/services/documentCache';
import documentCacheService from '@/services/documentCache';

/**
 * Convert a JSON document metadata to a document metadata format
 * @param jsonMetadata The JSON document metadata
 * @returns Document metadata in standard format
 */
export function convertJsonToDocumentMetadata(jsonMetadata: JsonDocumentMetadata): DocumentMetadata | null {
  try {
    // Check if the JSON document is actually a document
    if (jsonMetadata.sourceType !== 'document') {
      console.warn('JSON document is not a document type:', jsonMetadata.sourceType);
      return null;
    }
    
    return {
      id: jsonMetadata.id,
      filename: jsonMetadata.sourceName,
      uploadDate: jsonMetadata.createdAt,
      fileType: jsonMetadata.tags?.find(tag => tag !== 'document') || 'unknown',
      wordCount: 0, // Not available in JSON metadata
      tokenCount: 0, // Not available in JSON metadata
      chunked: false,
      hasEmbeddings: false,
      hasExtractedText: false
    };
  } catch (error) {
    console.error('Error converting JSON to document metadata:', error);
    return null;
  }
}

/**
 * Convert document metadata to JSON document metadata format
 * @param documentMetadata The document metadata
 * @param tags Optional tags to include
 * @returns JSON document metadata
 */
export function convertDocumentToJsonMetadata(
  documentMetadata: DocumentMetadata, 
  tags?: string[]
): JsonDocumentMetadata {
  return {
    id: `json_${documentMetadata.id}`,
    sourceName: documentMetadata.filename,
    sourceType: 'document',
    createdAt: documentMetadata.uploadDate,
    updatedAt: new Date().toISOString(),
    schemaVersion: '1.0',
    size: 0, // Will be updated when storing
    hasNestedStructures: true,
    topLevelKeys: ['document'],
    tags: tags || ['document', documentMetadata.fileType]
  };
}

/**
 * Convert a document analysis to a JSON structure for storage
 * @param document The document analysis to convert
 * @returns A JSON-friendly representation of the document
 */
export function documentToJson(document: DocumentAnalysis): any {
  return {
    document: {
      metadata: {
        id: document.metadata.id,
        filename: document.metadata.filename,
        uploadDate: document.metadata.uploadDate,
        fileType: document.metadata.fileType,
        wordCount: document.metadata.wordCount,
        tokenCount: document.metadata.tokenCount,
        chunked: document.metadata.chunked,
        totalChunks: document.metadata.totalChunks,
        hasEmbeddings: document.metadata.hasEmbeddings,
        hasExtractedText: document.metadata.hasExtractedText
      },
      content: {
        summary: document.content.summary,
        // Store content preview to keep size reasonable
        contentPreview: document.content.content.substring(0, 1000) + 
          (document.content.content.length > 1000 ? '...' : ''),
        hasExtractedText: !!document.content.extractedText,
        extractedTextPreview: document.content.extractedText ? 
          document.content.extractedText.substring(0, 1000) + 
          (document.content.extractedText.length > 1000 ? '...' : '') : null
      },
      chunks: document.chunks ? {
        count: document.chunks.length,
        hasEmbeddings: document.chunks.some(chunk => !!chunk.embedding),
        // Add preview of first chunk
        firstChunkPreview: document.chunks.length > 0 ? 
          document.chunks[0].content.substring(0, 100) + '...' : null
      } : null
    }
  };
}

/**
 * Extract document metadata from JSON document content
 * @param jsonContent The JSON document content
 * @returns Document metadata extracted from JSON content, or null if invalid format
 */
export function extractDocumentMetadataFromJson(jsonContent: any): DocumentMetadata | null {
  try {
    if (!jsonContent.document || !jsonContent.document.metadata) {
      return null;
    }
    
    const metadata = jsonContent.document.metadata;
    
    return {
      id: metadata.id,
      filename: metadata.filename,
      uploadDate: metadata.uploadDate,
      fileType: metadata.fileType,
      wordCount: metadata.wordCount,
      tokenCount: metadata.tokenCount,
      chunked: metadata.chunked || false,
      totalChunks: metadata.totalChunks || 0,
      hasEmbeddings: metadata.hasEmbeddings || false,
      hasExtractedText: metadata.hasExtractedText || false
    };
  } catch (error) {
    console.error('Error extracting document metadata from JSON:', error);
    return null;
  }
}

/**
 * Create a document content preview from JSON content
 * @param jsonContent The JSON document content
 * @returns Document content preview extracted from JSON content, or null if invalid format
 */
export function createDocumentContentFromJson(jsonContent: any): DocumentContent | null {
  try {
    if (!jsonContent.document || !jsonContent.document.content) {
      return null;
    }
    
    const content = jsonContent.document.content;
    
    return {
      id: jsonContent.document.metadata.id,
      content: content.contentPreview || '[Content preview not available]',
      summary: content.summary || '',
      extractedText: content.extractedTextPreview || null
    };
  } catch (error) {
    console.error('Error creating document content from JSON:', error);
    return null;
  }
}

/**
 * Get full document content from original storage based on JSON content
 * @param jsonContent The JSON document content
 * @returns Promise resolving to the full document analysis or null if not found
 */
export async function getFullDocumentFromJsonContent(jsonContent: any): Promise<DocumentAnalysis | null> {
  try {
    if (!jsonContent.document || !jsonContent.document.metadata || !jsonContent.document.metadata.id) {
      return null;
    }
    
    const documentId = jsonContent.document.metadata.id;
    
    // Get the full document from the document cache
    return await documentCacheService.getDocument(documentId);
  } catch (error) {
    console.error('Error getting full document from JSON content:', error);
    return null;
  }
}

/**
 * Store a document in both document storage and JSON storage
 * @param filename Filename of the document
 * @param fileType Type of the file (e.g., 'pdf', 'txt')
 * @param content Document content
 * @param summary Document summary
 * @param wordCount Word count
 * @param tokenCount Token count
 * @param tags Optional tags for JSON storage
 * @returns Promise resolving to the document metadata or null if storage failed
 */
export async function storeDocumentWithJsonBackup(
  filename: string,
  fileType: string,
  content: string,
  summary: string,
  wordCount: number,
  tokenCount: number,
  tags?: string[]
): Promise<DocumentMetadata | null> {
  try {
    // First store in the document cache
    const metadata = await documentCacheService.storeDocument(
      filename,
      fileType,
      content,
      summary,
      wordCount,
      tokenCount
    );
    
    if (!metadata) {
      console.error('Failed to store document in document cache');
      return null;
    }
    
    // Create a document analysis object
    const documentAnalysis: DocumentAnalysis = {
      metadata,
      content: {
        id: metadata.id,
        content,
        summary
      }
    };
    
    // Store in JSON storage as backup
    try {
      await documentCacheService.storeDocumentAsJson(
        documentAnalysis,
        tags || ['document', fileType]
      );
    } catch (jsonError) {
      console.warn('Error storing document JSON backup:', jsonError);
      // Continue anyway as this is just a backup
    }
    
    return metadata;
  } catch (error) {
    console.error('Error in storeDocumentWithJsonBackup:', error);
    return null;
  }
}

/**
 * Search for documents in both storage systems and return combined results
 * @param query Search query
 * @param useVectorSearch Whether to use vector search (if available)
 * @returns Promise resolving to combined search results
 */
export async function searchAllDocuments(
  query: string,
  useVectorSearch: boolean = false
): Promise<{
  documents: DocumentMetadata[],
  jsonDocuments: { metadata: JsonDocumentMetadata, content: any }[]
}> {
  try {
    // Search in document storage
    const documents = await documentCacheService.searchDocuments(query, useVectorSearch);
    
    // Search in JSON storage
    const jsonResults = await documentCacheService.jsonStorageService.searchJsonDocuments(query);
    
    // Filter out JSON documents that represent regular documents (to avoid duplication)
    const filteredJsonResults = jsonResults.filter(result => {
      // Skip if it's a document type and the ID exists in documents list
      if (result.metadata.sourceType === 'document' && 
          result.relevantContent.document && 
          result.relevantContent.document.metadata) {
        const docId = result.relevantContent.document.metadata.id;
        return !documents.some(doc => doc.id === docId);
      }
      return true;
    });
    
    // Convert JSON results to a more usable format
    const jsonDocuments = await Promise.all(
      filteredJsonResults.map(async result => {
        return {
          metadata: result.metadata,
          content: result.relevantContent
        };
      })
    );
    
    return {
      documents,
      jsonDocuments
    };
  } catch (error) {
    console.error('Error in searchAllDocuments:', error);
    return { documents: [], jsonDocuments: [] };
  }
}

export default {
  convertJsonToDocumentMetadata,
  convertDocumentToJsonMetadata,
  documentToJson,
  extractDocumentMetadataFromJson,
  createDocumentContentFromJson,
  getFullDocumentFromJsonContent,
  storeDocumentWithJsonBackup,
  searchAllDocuments
};