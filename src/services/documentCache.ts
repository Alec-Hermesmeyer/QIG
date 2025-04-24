// src/services/documentCache.ts with embeddings support, extracted text handling, and JSON storage

import { createClient } from '@supabase/supabase-js';
import { detectContentType, extractTextFromBinaryContent } from '@/utils/documentUtils';

// Define document types
export interface DocumentMetadata {
  id: string;
  filename: string;
  uploadDate: string;
  fileType: string;
  wordCount: number;
  tokenCount: number;
  chunked?: boolean;
  totalChunks?: number;
  hasEmbeddings?: boolean;
  hasExtractedText?: boolean; // New field for tracking extracted text
}

export interface DocumentContent {
  id: string;
  content: string;
  summary: string;
  extractedText?: string; // New field for storing extracted text from binary files
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkNumber: number;
  content: string;
  embedding?: number[];
}

export interface EmbeddedChunk {
  text: string;
  embedding: number[];
}

export interface DocumentAnalysis {
  metadata: DocumentMetadata;
  content: DocumentContent;
  chunks?: DocumentChunk[];
}

// JSON storage interfaces
export interface JsonDocumentMetadata {
  id: string;
  sourceName: string;
  sourceType: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: string;
  size: number;
  hasNestedStructures: boolean;
  topLevelKeys: string[];
  tags?: string[];
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to sanitize text for PostgreSQL storage
function sanitizeTextForStorage(text: string): string {
  if (!text) return '';
  
  // Replace null characters
  let sanitized = text.replace(/\u0000/g, '');
  
  // Replace other problematic characters
  sanitized = sanitized.replace(/\\u[\dA-F]{4}/gi, match => {
    try {
      // Try to convert Unicode escape sequences
      return JSON.parse(`"${match}"`);
    } catch (e) {
      // If conversion fails, replace with empty string
      return '';
    }
  });
  
  // Remove any other control characters (except tabs and newlines)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
}

/**
 * JsonStorageService for agnostic storage of any JSON data
 */
export class JsonStorageService {
  private initialized: boolean = false;
  
  /**
   * Initialize the service and create necessary tables
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    try {
      // Check if tables exist
      const { error: metadataError } = await supabase
        .from('json_documents_metadata')
        .select('id')
        .limit(1);
        
      const { error: contentError } = await supabase
        .from('json_documents_content')
        .select('id')
        .limit(1);
      
      // If tables don't exist, create them
      if (metadataError || contentError) {
        await this.createTables();
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing JsonStorageService:', error);
      return false;
    }
  }
  
  /**
   * Create the necessary tables for JSON document storage
   */
  private async createTables(): Promise<boolean> {
    try {
      // Create metadata table
      const createMetadataTableSQL = `
        CREATE TABLE IF NOT EXISTS public.json_documents_metadata (
          id TEXT PRIMARY KEY,
          source_name TEXT NOT NULL,
          source_type TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          schema_version TEXT,
          size INTEGER NOT NULL,
          has_nested_structures BOOLEAN DEFAULT FALSE,
          top_level_keys JSONB,
          tags JSONB
        );
        
        ALTER TABLE public.json_documents_metadata DISABLE ROW LEVEL SECURITY;
      `;
      
      // Create content table
      const createContentTableSQL = `
        CREATE TABLE IF NOT EXISTS public.json_documents_content (
          id TEXT PRIMARY KEY REFERENCES public.json_documents_metadata(id) ON DELETE CASCADE,
          content JSONB NOT NULL,
          flattened_content JSONB,
          indexed_text_content TEXT
        );
        
        ALTER TABLE public.json_documents_content DISABLE ROW LEVEL SECURITY;
      `;
      
      // Create text search index
      const createIndexSQL = `
        CREATE INDEX IF NOT EXISTS idx_json_documents_content_text_search 
        ON public.json_documents_content 
        USING gin(to_tsvector('english', indexed_text_content));
      `;
      
      // Execute SQL
      try {
        await supabase.rpc('run_sql', { sql: createMetadataTableSQL });
        await supabase.rpc('run_sql', { sql: createContentTableSQL });
        await supabase.rpc('run_sql', { sql: createIndexSQL });
        return true;
      } catch (error) {
        console.error('Error creating tables with RPC:', error);
        return false;
      }
    } catch (error) {
      console.error('Error creating tables:', error);
      return false;
    }
  }
  
  /**
   * Store a JSON document with its original structure preserved
   * @param sourceName Name/identifier of the JSON source
   * @param sourceType Type of the source (e.g., 'api_response', 'file', 'user_input')
   * @param jsonData The JSON data to store
   * @param tags Optional tags for categorization
   * @returns The metadata of the stored document or null if storage failed
   */
  async storeJsonData(
    sourceName: string,
    sourceType: string,
    jsonData: any,
    tags?: string[]
  ): Promise<JsonDocumentMetadata | null> {
    // Try to initialize if not already done
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        console.error('Cannot store JSON: service not initialized');
        return null;
      }
    }
    
    try {
      // Create a unique ID
      const id = `json_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Convert to string to calculate size and validate
      const jsonString = JSON.stringify(jsonData);
      let parsedJson;
      
      try {
        // Parse back to ensure it's valid JSON
        parsedJson = JSON.parse(jsonString);
      } catch (e) {
        console.error('Invalid JSON data provided:', e);
        return null;
      }
      
      // Check for nested structures
      const hasNestedStructures = this.checkForNestedStructures(parsedJson);
      
      // Get top-level keys
      const topLevelKeys = Object.keys(parsedJson);
      
      // Create metadata
      const metadata: JsonDocumentMetadata = {
        id,
        sourceName,
        sourceType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: '1.0',
        size: jsonString.length,
        hasNestedStructures,
        topLevelKeys,
        tags
      };
      
      // Store metadata
      const { error: metadataError } = await supabase
        .from('json_documents_metadata')
        .insert({
          id: metadata.id,
          source_name: metadata.sourceName,
          source_type: metadata.sourceType,
          created_at: metadata.createdAt,
          updated_at: metadata.updatedAt,
          schema_version: metadata.schemaVersion,
          size: metadata.size,
          has_nested_structures: metadata.hasNestedStructures,
          top_level_keys: metadata.topLevelKeys,
          tags: metadata.tags
        });
        
      if (metadataError) {
        console.error('Error storing JSON metadata:', metadataError);
        return null;
      }
      
      // Generate indexed text content for searching
      const indexedTextContent = this.generateIndexedText(parsedJson);
      
      // Flatten the JSON structure for easier querying
      const flattenedContent = this.flattenJson(parsedJson);
      
      // Store content
      const { error: contentError } = await supabase
        .from('json_documents_content')
        .insert({
          id: metadata.id,
          content: parsedJson,
          flattened_content: flattenedContent,
          indexed_text_content: indexedTextContent
        });
        
      if (contentError) {
        console.error('Error storing JSON content:', contentError);
        
        // Clean up metadata if content insertion fails
        await supabase
          .from('json_documents_metadata')
          .delete()
          .eq('id', metadata.id);
          
        return null;
      }
      
      return metadata;
    } catch (error) {
      console.error('Error in storeJsonData:', error);
      return null;
    }
  }
  
  /**
   * Check if a JSON object has nested structures
   * @param json The JSON object to check
   * @returns Boolean indicating if nested structures exist
   */
  private checkForNestedStructures(json: any): boolean {
    if (typeof json !== 'object' || json === null) {
      return false;
    }
    
    for (const key in json) {
      const value = json[key];
      if (typeof value === 'object' && value !== null) {
        // Arrays or objects indicate nested structures
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Generate text for full-text search indexing
   * @param json The JSON object to generate text from
   * @returns A string containing all text values from the JSON
   */
  private generateIndexedText(json: any): string {
    let result = '';
    
    const extractText = (obj: any, prefix = ''): void => {
      if (obj === null || obj === undefined) {
        return;
      }
      
      if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
          // For arrays, extract text from each element
          obj.forEach((item, index) => {
            extractText(item, `${prefix}[${index}]`);
          });
        } else {
          // For objects, extract text from each property
          for (const key in obj) {
            extractText(obj[key], prefix ? `${prefix}.${key}` : key);
          }
        }
      } else if (typeof obj === 'string') {
        // For strings, add to the result with the key
        result += `${prefix}: ${obj} `;
      } else {
        // For other types, convert to string
        result += `${prefix}: ${String(obj)} `;
      }
    };
    
    extractText(json);
    return result.trim();
  }
  
  /**
   * Flatten a JSON object for easier querying
   * @param json The JSON object to flatten
   * @returns A flattened representation of the JSON object
   */
  private flattenJson(json: any): any {
    const result: Record<string, any> = {};
    
    const flatten = (obj: any, prefix = ''): void => {
      if (obj === null || obj === undefined) {
        return;
      }
      
      if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
          // If it's an array and not too large, store it directly
          if (obj.length <= 100) {
            result[prefix] = obj;
          }
          
          // Also flatten each array element
          obj.forEach((item, index) => {
            flatten(item, `${prefix}[${index}]`);
          });
        } else {
          // For objects, flatten each property
          for (const key in obj) {
            flatten(obj[key], prefix ? `${prefix}.${key}` : key);
          }
        }
      } else {
        // For primitive values, store directly
        result[prefix] = obj;
      }
    };
    
    flatten(json);
    return result;
  }
  
  /**
   * Get a JSON document by ID
   * @param id The document ID
   * @returns The JSON document content and metadata, or null if not found
   */
  async getJsonDocument(id: string): Promise<{ metadata: JsonDocumentMetadata, content: any } | null> {
    try {
      // Get metadata
      const { data: metadataData, error: metadataError } = await supabase
        .from('json_documents_metadata')
        .select('*')
        .eq('id', id)
        .single();
        
      if (metadataError) {
        console.error('Error fetching JSON metadata:', metadataError);
        return null;
      }
      
      // Get content
      const { data: contentData, error: contentError } = await supabase
        .from('json_documents_content')
        .select('content')
        .eq('id', id)
        .single();
        
      if (contentError) {
        console.error('Error fetching JSON content:', contentError);
        return null;
      }
      
      // Format metadata
      const metadata: JsonDocumentMetadata = {
        id: metadataData.id,
        sourceName: metadataData.source_name,
        sourceType: metadataData.source_type,
        createdAt: metadataData.created_at,
        updatedAt: metadataData.updated_at,
        schemaVersion: metadataData.schema_version,
        size: metadataData.size,
        hasNestedStructures: metadataData.has_nested_structures,
        topLevelKeys: metadataData.top_level_keys,
        tags: metadataData.tags
      };
      
      return {
        metadata,
        content: contentData.content
      };
    } catch (error) {
      console.error('Error in getJsonDocument:', error);
      return null;
    }
  }
  
  /**
   * Search for JSON documents by content
   * @param query The search query
   * @param limit Maximum number of results to return
   * @returns Array of matching documents with metadata
   */
  async searchJsonDocuments(query: string, limit: number = 10): Promise<{ metadata: JsonDocumentMetadata, relevantContent: any }[]> {
    try {
      // Use full-text search on indexed_text_content
      const searchSQL = `
        SELECT jdm.*, jdc.content, ts_rank(to_tsvector('english', jdc.indexed_text_content), plainto_tsquery('english', $1)) as rank
        FROM json_documents_content jdc
        JOIN json_documents_metadata jdm ON jdm.id = jdc.id
        WHERE to_tsvector('english', jdc.indexed_text_content) @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC
        LIMIT $2
      `;
      
      const { data, error } = await supabase.rpc('run_sql', { 
        sql: searchSQL,
        params: [query, limit]
      });
      
      if (error) {
        console.error('Error searching JSON documents:', error);
        return [];
      }
      
      return data.map((row: any) => ({
        metadata: {
          id: row.id,
          sourceName: row.source_name,
          sourceType: row.source_type,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          schemaVersion: row.schema_version,
          size: row.size,
          hasNestedStructures: row.has_nested_structures,
          topLevelKeys: row.top_level_keys,
          tags: row.tags
        },
        relevantContent: this.extractRelevantContent(row.content, query)
      }));
    } catch (error) {
      console.error('Error in searchJsonDocuments:', error);
      return [];
    }
  }
  
  /**
   * Extract relevant parts of the JSON content that match the query
   * @param content The full JSON content
   * @param query The search query
   * @returns A subset of the JSON containing relevant parts
   */
  private extractRelevantContent(content: any, query: string): any {
    const result: Record<string, any> = {};
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    const isRelevant = (value: any): boolean => {
      if (value === null || value === undefined) {
        return false;
      }
      
      if (typeof value === 'string') {
        const valueLower = value.toLowerCase();
        return queryTerms.some(term => valueLower.includes(term));
      }
      
      if (typeof value === 'number' || typeof value === 'boolean') {
        const valueStr = String(value).toLowerCase();
        return queryTerms.some(term => valueStr === term);
      }
      
      return false;
    };
    
    const extractRelevant = (obj: any, path: string[] = []): void => {
      if (obj === null || obj === undefined) {
        return;
      }
      
      if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
          const relevantIndices: number[] = [];
          
          // Find relevant array elements
          obj.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              // For objects, check if any nested properties are relevant
              const nestedPath = [...path, index.toString()];
              extractRelevant(item, nestedPath);
            } else if (isRelevant(item)) {
              relevantIndices.push(index);
            }
          });
          
          // If any relevant indices found, add to result
          if (relevantIndices.length > 0) {
            let currentObj = result;
            
            // Create nested objects along the path
            for (let i = 0; i < path.length - 1; i++) {
              const key = path[i];
              if (!currentObj[key]) {
                currentObj[key] = isNaN(Number(path[i + 1])) ? {} : [];
              }
              currentObj = currentObj[key];
            }
            
            // Set the relevant array elements
            const lastKey = path[path.length - 1];
            currentObj[lastKey] = relevantIndices.map(index => obj[index]);
          }
        } else {
          // For objects, check each property
          for (const key in obj) {
            const value = obj[key];
            const newPath = [...path, key];
            
            if (typeof value === 'object' && value !== null) {
              // Recursively check nested objects
              extractRelevant(value, newPath);
            } else if (isRelevant(value)) {
              // If the value is relevant, add the full path to the result
              let currentObj = result;
              
              // Create nested objects along the path
              for (let i = 0; i < newPath.length - 1; i++) {
                const pathKey = newPath[i];
                if (!currentObj[pathKey]) {
                  currentObj[pathKey] = isNaN(Number(newPath[i + 1])) ? {} : [];
                }
                currentObj = currentObj[pathKey];
              }
              
              // Set the value
              const lastKey = newPath[newPath.length - 1];
              currentObj[lastKey] = value;
            }
          }
        }
      }
    };
    
    extractRelevant(content);
    
    // If no relevant content found, return a summary of the top-level structure
    if (Object.keys(result).length === 0) {
      const summary: Record<string, any> = {};
      
      if (typeof content === 'object' && content !== null) {
        // For objects, include top-level structure
        for (const key in content) {
          const value = content[key];
          
          if (typeof value === 'object' && value !== null) {
            // For nested objects, just show the type and size
            if (Array.isArray(value)) {
              summary[key] = `[Array with ${value.length} elements]`;
            } else {
              summary[key] = `{Object with ${Object.keys(value).length} properties}`;
            }
          } else {
            // For primitives, include the value
            summary[key] = value;
          }
        }
      }
      
      return summary;
    }
    
    return result;
  }
  
  /**
   * Update an existing JSON document
   * @param id The document ID
   * @param jsonData The new JSON data
   * @returns Boolean indicating success
   */
  async updateJsonDocument(id: string, jsonData: any): Promise<boolean> {
    try {
      // Get existing document to verify it exists
      const existingDoc = await this.getJsonDocument(id);
      
      if (!existingDoc) {
        console.error(`Document with ID ${id} not found`);
        return false;
      }
      
      // Convert to string to validate and calculate size
      const jsonString = JSON.stringify(jsonData);
      let parsedJson;
      
      try {
        // Parse back to ensure it's valid JSON
        parsedJson = JSON.parse(jsonString);
      } catch (e) {
        console.error('Invalid JSON data provided:', e);
        return false;
      }
      
      
      // Check for nested structures
      const hasNestedStructures = this.checkForNestedStructures(parsedJson);
      
      // Get top-level keys
      const topLevelKeys = Object.keys(parsedJson);
      
      // Update metadata
      const { error: metadataError } = await supabase
        .from('json_documents_metadata')
        .update({
          updated_at: new Date().toISOString(),
          size: jsonString.length,
          has_nested_structures: hasNestedStructures,
          top_level_keys: topLevelKeys
        })
        .eq('id', id);
        
      if (metadataError) {
        console.error('Error updating JSON metadata:', metadataError);
        return false;
      }
      
      // Generate indexed text content for searching
      const indexedTextContent = this.generateIndexedText(parsedJson);
      
      // Flatten the JSON structure for easier querying
      const flattenedContent = this.flattenJson(parsedJson);
      
      // Update content
      const { error: contentError } = await supabase
        .from('json_documents_content')
        .update({
          content: parsedJson,
          flattened_content: flattenedContent,
          indexed_text_content: indexedTextContent
        })
        .eq('id', id);
        
      if (contentError) {
        console.error('Error updating JSON content:', contentError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateJsonDocument:', error);
      return false;
    }
  }
  
  
  /**
   * Delete a JSON document
   * @param id The document ID
   * @returns Boolean indicating success
   */
  async deleteJsonDocument(id: string): Promise<boolean> {
    try {
      // Delete metadata (content will be deleted due to CASCADE)
      const { error } = await supabase
        .from('json_documents_metadata')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Error deleting JSON document:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteJsonDocument:', error);
      return false;
    }
  }
  
  /**
   * Get all JSON documents (metadata only)
   * @param limit Maximum number of documents to return
   * @param offset Offset for pagination
   * @returns Array of document metadata
   */
  async getAllJsonDocuments(limit: number = 100, offset: number = 0): Promise<JsonDocumentMetadata[]> {
    try {
      const { data, error } = await supabase
        .from('json_documents_metadata')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
        
      if (error) {
        console.error('Error fetching JSON documents:', error);
        return [];
      }
      
      return data.map((doc: any) => ({
        id: doc.id,
        sourceName: doc.source_name,
        sourceType: doc.source_type,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        schemaVersion: doc.schema_version,
        size: doc.size,
        hasNestedStructures: doc.has_nested_structures,
        topLevelKeys: doc.top_level_keys,
        tags: doc.tags
      }));
    } catch (error) {
      console.error('Error in getAllJsonDocuments:', error);
      return [];
    }
  }
  
  /**
   * Query JSON documents by specific path and value
   * @param path The path to query (e.g., 'user.name' or 'items[0].id')
   * @param value The value to match
   * @param limit Maximum number of results to return
   * @returns Array of matching documents with metadata
   */
  async queryJsonByPath(path: string, value: any, limit: number = 10): Promise<{ metadata: JsonDocumentMetadata, content: any }[]> {
    try {
      // Format path for JSONB query
      const formattedPath = path.replace(/\[(\d+)\]/g, '.$1');
      
      // Create SQL query
      const querySQL = `
        SELECT jdm.*, jdc.content
        FROM json_documents_content jdc
        JOIN json_documents_metadata jdm ON jdm.id = jdc.id
        WHERE jdc.flattened_content->>'${formattedPath}' = $1
        LIMIT $2
      `;
      
      const { data, error } = await supabase.rpc('run_sql', { 
        sql: querySQL,
        params: [String(value), limit]
      });
      
      if (error) {
        console.error('Error querying JSON documents by path:', error);
        return [];
      }
      
      return data.map((row: any) => ({
        metadata: {
          id: row.id,
          sourceName: row.source_name,
          sourceType: row.source_type,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          schemaVersion: row.schema_version,
          size: row.size,
          hasNestedStructures: row.has_nested_structures,
          topLevelKeys: row.top_level_keys,
          tags: row.tags
        },
        content: row.content
      }));
    } catch (error) {
      console.error('Error in queryJsonByPath:', error);
      return [];
    }
  }
}

export class DocumentCacheService {
  private initialized: boolean = false;
  private chunksTableExists: boolean = false;
  private embeddingsEnabled: boolean = false;
  private extractedTextEnabled: boolean = false;
  public  jsonStorageService: JsonStorageService;
  
  constructor() {
    this.jsonStorageService = new JsonStorageService();
  }
  getJsonStorageService(): JsonStorageService {
    return this.jsonStorageService;
  }
  
  
  // Initialize the service and create tables if needed
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    try {
      // Also initialize JSON storage service
      await this.jsonStorageService.initialize();
      
      // Check if main tables exist by querying metadata
      const { error: metadataError } = await supabase
        .from('document_metadata')
        .select('id')
        .limit(1);
        
      const { error: contentError } = await supabase
        .from('document_content')
        .select('id')
        .limit(1);
      
      // If main tables don't exist, log an error
      if (metadataError || contentError) {
        console.warn('Document cache tables may not be set up properly:', 
          metadataError?.message || contentError?.message);
        return false;
      }
      
      // Check if chunks table exists
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .select('id')
        .limit(1);
        
      this.chunksTableExists = !chunksError;
      
      // Check if has_embeddings field exists in document_metadata
      try {
        const { error: hasEmbeddingsError } = await supabase.rpc('check_column_exists', {
          table_name: 'document_metadata',
          column_name: 'has_embeddings'
        });
        
        this.embeddingsEnabled = !hasEmbeddingsError;
        
        if (!this.embeddingsEnabled) {
          // Try to add the column
          await this.addEmbeddingsSupport();
        }
      } catch (e) {
        console.warn('Could not check for embeddings column:', e);
        // We'll try to add the column anyway
        await this.addEmbeddingsSupport();
      }

      // Check for extracted text support
      try {
        const { error: hasExtractedTextError } = await supabase.rpc('check_column_exists', {
          table_name: 'document_metadata',
          column_name: 'has_extracted_text'
        });
        
        const { error: extractedTextError } = await supabase.rpc('check_column_exists', {
          table_name: 'document_content',
          column_name: 'extracted_text'
        });
        
        this.extractedTextEnabled = !hasExtractedTextError && !extractedTextError;
        
        if (!this.extractedTextEnabled) {
          // Try to add the columns
          await this.addExtractedTextSupport();
        }
      } catch (e) {
        console.warn('Could not check for extracted text columns:', e);
        // We'll try to add the columns anyway
        await this.addExtractedTextSupport();
      }
      
      // If chunks table doesn't exist, try to create it
      if (!this.chunksTableExists) {
        await this.createChunksTable();
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing document cache:', error);
      return false;
    }
  }
  
  // Add extracted text support to existing tables
  async addExtractedTextSupport(): Promise<boolean> {
    try {
      // Add has_extracted_text column to document_metadata
      const alterMetadataSQL = `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'document_metadata'
            AND column_name = 'has_extracted_text'
          ) THEN
            ALTER TABLE public.document_metadata ADD COLUMN has_extracted_text BOOLEAN DEFAULT FALSE;
          END IF;
        END $$;
      `;
      
      // Add extracted_text column to document_content
      const alterContentSQL = `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'document_content'
            AND column_name = 'extracted_text'
          ) THEN
            ALTER TABLE public.document_content ADD COLUMN extracted_text TEXT;
          END IF;
        END $$;
      `;
      
      try {
        await supabase.rpc('run_sql', { sql: alterMetadataSQL });
        await supabase.rpc('run_sql', { sql: alterContentSQL });
        this.extractedTextEnabled = true;
        console.log('Added extracted text columns to database');
        return true;
      } catch (e) {
        console.warn('Could not add extracted text columns:', e);
        return false;
      }
    } catch (error) {
      console.error('Error adding extracted text support:', error);
      return false;
    }
  }
  
  // Add embeddings support to existing tables
  async addEmbeddingsSupport(): Promise<boolean> {
    try {
      // Create the RPC function to check if columns exist if it doesn't exist yet
      try {
        await supabase.rpc('create_check_column_function');
      } catch (e) {
        console.warn('Could not create check_column_exists function:', e);
      }
      
      // Add has_embeddings column to document_metadata if it doesn't exist
      const alterTableSQL = `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'document_metadata'
            AND column_name = 'has_embeddings'
          ) THEN
            ALTER TABLE public.document_metadata ADD COLUMN has_embeddings BOOLEAN DEFAULT FALSE;
          END IF;
        END $$;
      `;
      
      try {
        await supabase.rpc('run_sql', { sql: alterTableSQL });
      } catch (e) {
        console.warn('Could not add has_embeddings column:', e);
      }
      
      // Check if embedding column exists in document_chunks
      const alterChunksSQL = `
        DO $$ 
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'document_chunks'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'document_chunks'
            AND column_name = 'embedding'
          ) THEN
            ALTER TABLE public.document_chunks ADD COLUMN embedding VECTOR(1536);
          END IF;
        END $$;
      `;
      
      try {
        await supabase.rpc('run_sql', { sql: alterChunksSQL });
      } catch (e) {
        console.warn('Could not add embedding column to document_chunks:', e);
      }
      
      this.embeddingsEnabled = true;
      return true;
    } catch (error) {
      console.error('Error adding embeddings support:', error);
      return false;
    }
  }
  
  // Create chunks table with embeddings support
  async createChunksTable(): Promise<boolean> {
    try {
      // Use Supabase's SQL function to create the table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.document_chunks (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL REFERENCES public.document_metadata(id) ON DELETE CASCADE,
          chunk_number INTEGER NOT NULL,
          content TEXT NOT NULL,
          embedding VECTOR(1536),
          UNIQUE (document_id, chunk_number)
        );
        
        ALTER TABLE public.document_chunks DISABLE ROW LEVEL SECURITY;
        
        -- Add chunked and embeddings flags to metadata if they don't exist
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'document_metadata'
            AND column_name = 'chunked'
          ) THEN
            ALTER TABLE public.document_metadata ADD COLUMN chunked BOOLEAN DEFAULT FALSE;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'document_metadata'
            AND column_name = 'total_chunks'
          ) THEN
            ALTER TABLE public.document_metadata ADD COLUMN total_chunks INTEGER DEFAULT 0;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'document_metadata'
            AND column_name = 'has_embeddings'
          ) THEN
            ALTER TABLE public.document_metadata ADD COLUMN has_embeddings BOOLEAN DEFAULT FALSE;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'document_metadata'
            AND column_name = 'has_extracted_text'
          ) THEN
            ALTER TABLE public.document_metadata ADD COLUMN has_extracted_text BOOLEAN DEFAULT FALSE;
          END IF;
        END $$;
        
        -- Create function to check if columns exist
        CREATE OR REPLACE FUNCTION check_column_exists(table_name TEXT, column_name TEXT)
        RETURNS BOOLEAN AS $$
        DECLARE
          column_exists BOOLEAN;
        BEGIN
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = check_column_exists.table_name
            AND column_name = check_column_exists.column_name
          ) INTO column_exists;
          
          RETURN column_exists;
        END;
        $$ LANGUAGE plpgsql;
        
        -- Create function to create the check function
        CREATE OR REPLACE FUNCTION create_check_column_function()
        RETURNS VOID AS $$
        BEGIN
          -- Create the function if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM pg_proc
            WHERE proname = 'check_column_exists'
          ) THEN
            EXECUTE '
              CREATE OR REPLACE FUNCTION check_column_exists(table_name TEXT, column_name TEXT)
              RETURNS BOOLEAN AS $$
              DECLARE
                column_exists BOOLEAN;
              BEGIN
                SELECT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name = check_column_exists.table_name
                  AND column_name = check_column_exists.column_name
                ) INTO column_exists;
                
                RETURN column_exists;
              END;
              $$ LANGUAGE plpgsql;
            ';
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      // Create SQL function to run the table creation
      try {
        await supabase.rpc('run_sql', { sql: createTableSQL });
      } catch (error) {
        // This might fail if the function doesn't exist
        console.error('Error creating chunks table with RPC:', error);
      }
      
      // Check if table was created
      const { error } = await supabase
        .from('document_chunks')
        .select('id')
        .limit(1);
        
      if (!error) {
        this.chunksTableExists = true;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error creating chunks table:', error);
      return false;
    }
  }
  
  // Prepare content for querying
  async prepareContentForQuery(documentId: string): Promise<string | null> {
    try {
      // Get document content
      const document = await this.getDocument(documentId);
      
      if (!document) return null;
      
      let contentToUse = document.content.content;
      
      // First check if we already have extracted text
      if (document.metadata.hasExtractedText && document.content.extractedText) {
        return document.content.extractedText;
      }
      
      // Check if content is binary
      const { isBinary, fileType } = detectContentType(contentToUse);
      
      // If binary, extract text first
      if (isBinary) {
        console.log(`Document ${documentId} contains binary ${fileType} content, extracting text`);
        const extractedText = await extractTextFromBinaryContent(contentToUse, fileType || '');
        
        // Save the extracted text for future use
        try {
          await this.updateExtractedContent(documentId, extractedText);
        } catch (error) {
          console.error("Error saving extracted text:", error);
        }
        
        return extractedText;
      }
      
      return contentToUse;
    } catch (error) {
      console.error('Error preparing content for query:', error);
      return null;
    }
  }
  
  // Update a document with extracted text from binary files
  async updateExtractedContent(
    id: string,
    extractedText: string
  ): Promise<boolean> {
    // Try to initialize if not already done
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        console.error('Cannot update extracted text: cache not initialized');
        return false;
      }
    }
    
    try {
      // Sanitize the extracted text
      const sanitizedText = sanitizeTextForStorage(extractedText);
      
      // Update content with extracted text
      const { error: contentError } = await supabase
        .from('document_content')
        .update({
          extracted_text: sanitizedText
        })
        .eq('id', id);
        
      if (contentError) {
        console.error('Error updating document extracted text:', contentError);
        return false;
      }
      
      // Update metadata to indicate it has extracted text
      const { error: metadataError } = await supabase
        .from('document_metadata')
        .update({
          has_extracted_text: true
        })
        .eq('id', id);
        
      if (metadataError) {
        console.error('Error updating document extracted text metadata:', metadataError);
        return false;
      }
      
      console.log(`Updated document ${id} with extracted text (${sanitizedText.length} chars)`);
      return true;
    } catch (error) {
      console.error('Error in updateExtractedContent:', error);
      return false;
    }
  }
  
  // Get extracted text content
  async getExtractedText(id: string): Promise<string | null> {
    try {
      // Check if document has extracted text
      const { data: metadataData, error: metadataError } = await supabase
        .from('document_metadata')
        .select('has_extracted_text')
        .eq('id', id)
        .single();
        
      if (metadataError || !metadataData.has_extracted_text) {
        return null;
      }
      
      // Get extracted text
      const { data: contentData, error: contentError } = await supabase
        .from('document_content')
        .select('extracted_text')
        .eq('id', id)
        .single();
        
      if (contentError || !contentData.extracted_text) {
        return null;
      }
      
      return contentData.extracted_text;
    } catch (error) {
      console.error('Error in getExtractedText:', error);
      return null;
    }
  }
  
  /**
   * Store document as JSON in the JSON storage system
   * This provides an alternative storage method using the JSON storage service
   * 
   * @param documentData The document analysis data to store
   * @param tags Optional tags for categorization
   * @returns The ID of the stored JSON document, or null if storage failed
   */
  async storeDocumentAsJson(documentData: DocumentAnalysis, tags?: string[]): Promise<string | null> {
    try {
      // Try to initialize if not already done
      if (!this.initialized) {
        const success = await this.initialize();
        if (!success) {
          console.error('Cannot store document as JSON: cache not initialized');
          return null;
        }
      }
      
      // Create a structured JSON representation
      const jsonData = {
        document: {
          metadata: {
            id: documentData.metadata.id,
            filename: documentData.metadata.filename,
            uploadDate: documentData.metadata.uploadDate,
            fileType: documentData.metadata.fileType,
            wordCount: documentData.metadata.wordCount,
            tokenCount: documentData.metadata.tokenCount,
            chunked: documentData.metadata.chunked || false,
            totalChunks: documentData.metadata.totalChunks || 0,
            hasEmbeddings: documentData.metadata.hasEmbeddings || false,
            hasExtractedText: documentData.metadata.hasExtractedText || false
          },
          content: {
            summary: documentData.content.summary,
            // Store a preview of the content to keep the JSON size reasonable
            contentPreview: documentData.content.content.substring(0, 1000) + 
              (documentData.content.content.length > 1000 ? '...' : ''),
            hasExtractedText: !!documentData.content.extractedText,
            extractedTextPreview: documentData.content.extractedText ? 
              documentData.content.extractedText.substring(0, 1000) + 
              (documentData.content.extractedText.length > 1000 ? '...' : '') : null
          },
          chunks: documentData.chunks ? {
            count: documentData.chunks.length,
            hasEmbeddings: documentData.chunks.some(chunk => !!chunk.embedding),
            // Add preview of first chunk
            firstChunkPreview: documentData.chunks.length > 0 ? 
              documentData.chunks[0].content.substring(0, 100) + '...' : null
          } : null
        }
      };
      
      // Use the JSON storage service to store the document
      const metadata = await this.jsonStorageService.storeJsonData(
        documentData.metadata.filename, 
        'document',
        jsonData,
        tags || ['document', documentData.metadata.fileType]
      );
      
      return metadata?.id || null;
    } catch (error) {
      console.error('Error storing document as JSON:', error);
      return null;
    }
  }
  
  /**
   * Store arbitrary JSON data using the JSON storage service
   * This allows storing any JSON alongside documents in the system
   * 
   * @param sourceName Name to identify the source
   * @param sourceType Type of the source
   * @param jsonData The JSON data to store
   * @param tags Optional tags for categorization
   * @returns The metadata of the stored JSON document or null if storage failed
   */
  async storeArbitraryJson(
    sourceName: string,
    sourceType: string,
    jsonData: any,
    tags?: string[]
  ): Promise<JsonDocumentMetadata | null> {
    // Try to initialize if not already done
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        console.error('Cannot store JSON: cache not initialized');
        return null;
      }
    }
    
    return await this.jsonStorageService.storeJsonData(sourceName, sourceType, jsonData, tags);
  }
  
  /**
   * Get a JSON document from the JSON storage system
   * @param id The JSON document ID
   * @returns The JSON document content and metadata, or null if not found
   */
  async getJsonDocument(id: string): Promise<{ metadata: JsonDocumentMetadata, content: any } | null> {
    return await this.jsonStorageService.getJsonDocument(id);
  }
  
  /**
   * Search for documents in both regular document storage and JSON storage
   * @param query The search query
   * @param useVectorSearch Whether to use vector search for document storage
   * @returns Combined search results from both storage systems
   */
  async searchAllDocuments(query: string, useVectorSearch: boolean = false): Promise<{
    documents: DocumentMetadata[],
    jsonDocuments: { metadata: JsonDocumentMetadata, relevantContent: any }[]
  }> {
    // Try to initialize if not already done
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        console.warn('Cache not initialized, returning empty search results');
        return { documents: [], jsonDocuments: [] };
      }
    }
    
    try {
      // Search in document storage
      const documents = await this.searchDocuments(query, useVectorSearch);
      
      // Search in JSON storage
      const jsonDocuments = await this.jsonStorageService.searchJsonDocuments(query);
      
      return { documents, jsonDocuments };
    } catch (error) {
      console.error('Error searching all documents:', error);
      return { documents: [], jsonDocuments: [] };
    }
  }
  
  // Store a document with embeddings
  async storeDocumentWithEmbeddings(
    filename: string,
    fileType: string,
    content: string,
    summary: string,
    wordCount: number,
    tokenCount: number,
    embeddedChunks: EmbeddedChunk[]
  ): Promise<DocumentMetadata | null> {
    // Try to initialize if not already done
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        console.error('Cannot store document: cache not initialized');
        return null;
      }
    }
    
    try {
      // Create a unique ID
      const id = `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Determine if we need to use chunking
      const useChunks = content.length > 500000 || embeddedChunks.length > 1;
      
      // Sanitize content and summary
      const sanitizedContent = sanitizeTextForStorage(
        useChunks ? content.substring(0, 4000) + '\n\n[Content preview only. Full content available in chunks.]' : content
      );
      const sanitizedSummary = sanitizeTextForStorage(summary);
      
      // Insert metadata with chunked and embeddings flags
      const metadataToInsert = {
        id,
        filename,
        upload_date: new Date().toISOString(),
        file_type: fileType,
        word_count: wordCount,
        token_count: tokenCount,
        chunked: useChunks,
        has_embeddings: embeddedChunks.length > 0 && embeddedChunks[0].embedding.length > 0,
        has_extracted_text: false, // Will be updated later if extracted text is added
        total_chunks: embeddedChunks.length
      };
      
      // Store document metadata
      const { data: metadataData, error: metadataError } = await supabase
        .from('document_metadata')
        .insert(metadataToInsert)
        .select()
        .single();
        
      if (metadataError) {
        console.error('Error storing document metadata:', metadataError);
        return null;
      }
      
      // Store document content (preview)
      const { error: contentError } = await supabase
        .from('document_content')
        .insert({
          id,
          content: sanitizedContent,
          summary: sanitizedSummary,
          extracted_text: null // Will be updated later if needed
        });
        
      if (contentError) {
        console.error('Error storing document content:', contentError);
        
        // Clean up metadata if content insertion fails
        await supabase
          .from('document_metadata')
          .delete()
          .eq('id', id);
          
        return null;
      }
      
      // Store document chunks with embeddings
      if (useChunks && this.chunksTableExists) {
        for (let i = 0; i < embeddedChunks.length; i++) {
          const chunk = embeddedChunks[i];
          const chunkId = `chunk_${id}_${i+1}`;
          
          try {
            const chunkToInsert: any = {
              id: chunkId,
              document_id: id,
              chunk_number: i + 1,
              content: sanitizeTextForStorage(chunk.text)
            };
            
            // Only add embedding if it's available and we have embeddings support
            if (this.embeddingsEnabled && chunk.embedding && chunk.embedding.length > 0) {
              chunkToInsert.embedding = chunk.embedding;
            }
            
            const { error: chunkError } = await supabase
              .from('document_chunks')
              .insert(chunkToInsert);
              
            if (chunkError) {
              console.error(`Error storing chunk ${i+1}:`, chunkError);
            }
          } catch (chunkError) {
            console.error(`Error processing chunk ${i+1}:`, chunkError);
          }
        }
      }
      
      // Format and return metadata
      const metadata = {
        id,
        filename,
        uploadDate: new Date().toISOString(),
        fileType,
        wordCount,
        tokenCount,
        chunked: useChunks,
        totalChunks: embeddedChunks.length,
        hasEmbeddings: embeddedChunks.length > 0 && embeddedChunks[0].embedding.length > 0,
        hasExtractedText: false
      };
      
      // Also store as JSON for additional querying capabilities
      try {
        const documentAnalysis: DocumentAnalysis = {
          metadata,
          content: {
            id,
            content: sanitizedContent,
            summary: sanitizedSummary
          }
        };
        
        await this.storeDocumentAsJson(documentAnalysis);
      } catch (jsonError) {
        console.warn('Error storing document as JSON:', jsonError);
        // Continue anyway as this is just a supplementary storage
      }
      
      return metadata;
    } catch (error) {
      console.error('Error in storeDocumentWithEmbeddings:', error);
      return null;
    }
  }
  
  // Regular storeDocument method (kept for backward compatibility)
  async storeDocument(
    filename: string, 
    fileType: string, 
    content: string, 
    summary: string, 
    wordCount: number, 
    tokenCount: number,
    chunked: boolean = false
  ): Promise<DocumentMetadata | null> {
    // Try to initialize if not already done
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        console.error('Cannot store document: cache not initialized');
        return null;
      }
    }
    
    try {
      // Create a unique ID
      const id = `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Sanitize content and summary
      const sanitizedContent = sanitizeTextForStorage(content);
      const sanitizedSummary = sanitizeTextForStorage(summary);

      // Insert with chunked flag if applicable
      const metadataToInsert: any = {
        id,
        filename,
        upload_date: new Date().toISOString(),
        file_type: fileType,
        word_count: wordCount,
        token_count: tokenCount,
        chunked: chunked
      };
      
      // Add additional fields if supported
      if (this.embeddingsEnabled) {
        metadataToInsert.has_embeddings = false;
      }

      if (this.extractedTextEnabled) {
        metadataToInsert.has_extracted_text = false;
      }
      
      // Store document metadata
      const { data: metadataData, error: metadataError } = await supabase
        .from('document_metadata')
        .insert(metadataToInsert)
        .select()
        .single();
        
      if (metadataError) {
        console.error('Error storing document metadata:', metadataError);
        return null;
      }
      
      // Make sure content isn't too long for a single insert
      // (this should be handled by the chunking logic in the API route)
      const MAX_SAFE_LENGTH = 500000;
      let contentToStore = sanitizedContent;
      
      if (sanitizedContent.length > MAX_SAFE_LENGTH && !chunked) {
        console.warn(`Content too large (${sanitizedContent.length} chars) and not using chunks, truncating`);
        contentToStore = sanitizedContent.substring(0, MAX_SAFE_LENGTH) + 
          '\n\n[Content truncated due to size limitations]';
      }
      
      // Create content insert object
      const contentToInsert: any = {
        id,
        content: contentToStore,
        summary: sanitizedSummary
      };

      // Add extracted_text field if supported
      if (this.extractedTextEnabled) {
        contentToInsert.extracted_text = null;
      }
      
      // Store document content
      const { error: contentError } = await supabase
        .from('document_content')
        .insert(contentToInsert);
        
      if (contentError) {
        console.error('Error storing document content:', contentError);
        
        // Clean up metadata if content insertion fails
        await supabase
          .from('document_metadata')
          .delete()
          .eq('id', id);
          
        return null;
      }
      
      // Format and return metadata
      const metadata = {
        id,
        filename,
        uploadDate: new Date().toISOString(),
        fileType,
        wordCount,
        tokenCount,
        chunked,
        hasEmbeddings: false,
        hasExtractedText: false
      };
      
      // Also store as JSON for additional querying capabilities
      try {
        const documentAnalysis: DocumentAnalysis = {
          metadata,
          content: {
            id,
            content: contentToStore,
            summary: sanitizedSummary
          }
        };
        
        await this.storeDocumentAsJson(documentAnalysis);
      } catch (jsonError) {
        console.warn('Error storing document as JSON:', jsonError);
        // Continue anyway as this is just a supplementary storage
      }
      
      return metadata;
    } catch (error) {
      console.error('Error in storeDocument:', error);
      return null;
    }
  }
  
  // Store a chunk of document content
  async storeDocumentChunk(
    documentId: string,
    chunkNumber: number,
    content: string,
    embedding?: number[]
  ): Promise<boolean> {
    if (!this.chunksTableExists) {
      await this.createChunksTable();
    }
    
    try {
      // Sanitize chunk content
      const sanitizedContent = sanitizeTextForStorage(content);
      
      // Generate a unique chunk ID
      const chunkId = `chunk_${documentId}_${chunkNumber}`;
      
      // Create insert object
      const insertData: any = {
        id: chunkId,
        document_id: documentId,
        chunk_number: chunkNumber,
        content: sanitizedContent
      };
      
      // Add embedding if provided and supported
      if (embedding && embedding.length > 0 && this.embeddingsEnabled) {
        insertData.embedding = embedding;
        
        // Update document metadata to indicate it has embeddings
        await supabase
          .from('document_metadata')
          .update({ has_embeddings: true })
          .eq('id', documentId);
      }
      
      // Store the chunk
      const { error } = await supabase
        .from('document_chunks')
        .insert(insertData);
        
      if (error) {
        console.error(`Error storing chunk ${chunkNumber} for document ${documentId}:`, error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error in storeDocumentChunk:`, error);
      return false;
    }
  }
  
  // Update document metadata with chunk info
  async updateDocumentChunkInfo(documentId: string, totalChunks: number, hasEmbeddings: boolean = false): Promise<boolean> {
    try {
      const updateData: any = { 
        chunked: true,
        total_chunks: totalChunks
      };
      
      // Add has_embeddings if it's supported
      if (this.embeddingsEnabled) {
        updateData.has_embeddings = hasEmbeddings;
      }
      
      const { error } = await supabase
        .from('document_metadata')
        .update(updateData)
        .eq('id', documentId);
        
      if (error) {
        console.error('Error updating document chunk info:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateDocumentChunkInfo:', error);
      return false;
    }
  }
  
  // Get all document chunks (with embeddings if available)
  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    if (!this.chunksTableExists) {
      return [];
    }
    
    try {
      // Check if document has embeddings
      const { data: metadataData, error: metadataError } = await supabase
        .from('document_metadata')
        .select('has_embeddings')
        .eq('id', documentId)
        .single();
        
      // If metadata check fails, just try to get chunks without embeddings
      const hasEmbeddings = !metadataError && metadataData?.has_embeddings;
      
      // Select appropriate columns based on embedding availability
      const columns = hasEmbeddings && this.embeddingsEnabled 
        ? '*' 
        : 'id, document_id, chunk_number, content';
      
      const { data, error } = await supabase
        .from('document_chunks')
        .select(columns)
        .eq('document_id', documentId)
        .order('chunk_number', { ascending: true });
        
      if (error) {
        console.error('Error fetching document chunks:', error);
        return [];
      }
      
      return data.map(chunk => ({
        id: (chunk as unknown as DocumentChunk).id,
        documentId: 'document_id' in chunk ? (chunk as any).document_id : '',
        chunkNumber: (chunk as unknown as DocumentChunk).chunkNumber,
        content: (chunk as unknown as DocumentChunk).content,
        embedding: 'embedding' in chunk ? (chunk as any).embedding : undefined
      }));
    } catch (error) {
      console.error('Error in getDocumentChunks:', error);
      return [];
    }
  }
  
  // Find similar chunks using embeddings
  async findSimilarChunks(queryEmbedding: number[], documentId?: string, limit: number = 5): Promise<{chunk: DocumentChunk, similarity: number}[]> {
    if (!this.chunksTableExists || !this.embeddingsEnabled) {
      return [];
    }
    
    try {
      // Create the SQL query for similarity search
      let query = supabase.rpc('match_document_chunks', { 
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: limit
      });
      
      // If documentId is provided, filter by document
      if (documentId) {
        query = query.eq('document_id', documentId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error finding similar chunks:', error);
        return [];
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Map the results to our expected format
    return data.map((item: { id: string; document_id: string; chunk_number: number; content: string; similarity: number }) => ({
      chunk: {
        id: item.id,
        documentId: item.document_id,
        chunkNumber: item.chunk_number,
        content: item.content,
        embedding: undefined // Omit embedding in results to reduce payload size
      },
      similarity: item.similarity
    }));
    } catch (error) {
      console.error('Error in findSimilarChunks:', error);
      return [];
    }
  }
  
  // Get the full document content by combining chunks
  async getFullDocumentContent(documentId: string): Promise<string | null> {
    try {
      // Get document metadata to check if it's chunked
      const { data: metadataData, error: metadataError } = await supabase
        .from('document_metadata')
        .select('chunked, total_chunks, has_extracted_text, file_type')
        .eq('id', documentId)
        .single();
        
      if (metadataError) {
        console.error('Error fetching document metadata:', metadataError);
        return null;
      }
      
      // Check for extracted text first for binary files
      if (metadataData.has_extracted_text && 
          (metadataData.file_type === 'pdf' || metadataData.file_type === 'docx' || metadataData.file_type === 'doc')) {
        console.log(`Document ${documentId} has extracted text, retrieving that`);
        const extractedText = await this.getExtractedText(documentId);
        if (extractedText) {
          return extractedText;
        }
        // If no extracted text, fall back to normal content retrieval
      }
      
      // If document is not chunked, get content normally
      if (!metadataData.chunked) {
        const { data: contentData, error: contentError } = await supabase
          .from('document_content')
          .select('content')
          .eq('id', documentId)
          .single();
          
        if (contentError) {
          console.error('Error fetching document content:', contentError);
          return null;
        }
        
        return contentData.content;
      }
      
      // Document is chunked, retrieve and combine chunks
      const chunks = await this.getDocumentChunks(documentId);
      
      if (chunks.length === 0) {
        console.error('No chunks found for document:', documentId);
        return null;
      }
      
      // Sort chunks by number and combine content
      const sortedChunks = chunks.sort((a, b) => a.chunkNumber - b.chunkNumber);
      const combinedContent = sortedChunks.map(chunk => chunk.content).join('');
      
      return combinedContent;
    } catch (error) {
      console.error('Error in getFullDocumentContent:', error);
      return null;
    }
  }
  
  // Get all documents (metadata only)
  async getAllDocuments(): Promise<DocumentMetadata[]> {
    // Try to initialize if not already done
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        console.warn('Cache not initialized, returning empty document list');
        return [];
      }
    }
    
    try {
      const { data, error } = await supabase
        .from('document_metadata')
        .select('*')
        .order('upload_date', { ascending: false });
        
      if (error) {
        console.error('Error fetching documents:', error);
        return [];
      }
      
      return data.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        uploadDate: doc.upload_date,
        fileType: doc.file_type,
        wordCount: doc.word_count,
        tokenCount: doc.token_count,
        chunked: doc.chunked || false,
        totalChunks: doc.total_chunks || 0,
        hasEmbeddings: doc.has_embeddings || false,
        hasExtractedText: doc.has_extracted_text || false
      }));
    } catch (error) {
      console.error('Error in getAllDocuments:', error);
      return [];
    }
  }
  
  // Get a single document with full content
  async getDocument(id: string): Promise<DocumentAnalysis | null> {
    // Try to initialize if not already done
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        console.warn('Cache not initialized, cannot get document');
        return null;
      }
    }
    
    try {
      // Get metadata
      const { data: metadataData, error: metadataError } = await supabase
        .from('document_metadata')
        .select('*')
        .eq('id', id)
        .single();
        
      if (metadataError) {
        console.error('Error fetching document metadata:', metadataError);
        return null;
      }
      
      // Get content
      const { data: contentData, error: contentError } = await supabase
        .from('document_content')
        .select('*')
        .eq('id', id)
        .single();
        
      if (contentError) {
        console.error('Error fetching document content:', contentError);
        return null;
      }
      
      // Create document analysis
      const analysis: DocumentAnalysis = {
        metadata: {
          id: metadataData.id,
          filename: metadataData.filename,
          uploadDate: metadataData.upload_date,
          fileType: metadataData.file_type,
          wordCount: metadataData.word_count,
          tokenCount: metadataData.token_count,
          chunked: metadataData.chunked || false,
          totalChunks: metadataData.total_chunks || 0,
          hasEmbeddings: metadataData.has_embeddings || false,
          hasExtractedText: metadataData.has_extracted_text || false
        },
        content: {
          id: contentData.id,
          content: contentData.content,
          summary: contentData.summary,
          extractedText: contentData.extracted_text
        }
      };
      
      // If document is chunked, get chunks as well
      if (metadataData.chunked) {
        analysis.chunks = await this.getDocumentChunks(id);
      }
      
      return analysis;
    } catch (error) {
      console.error('Error in getDocument:', error);
      return null;
    }
  }
  
  // Delete a document
  async deleteDocument(id: string): Promise<boolean> {
    // Try to initialize if not already done
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        console.warn('Cache not initialized, cannot delete document');
        return false;
      }
    }
    
    try {
      // Check if document exists in JSON storage and delete if found
      try {
        // First search for documents by ID in the flattened content
        const jsonDocs = await this.jsonStorageService.queryJsonByPath('document.metadata.id', id);
        
        if (jsonDocs.length > 0) {
          // Delete the JSON version
          for (const doc of jsonDocs) {
            await this.jsonStorageService.deleteJsonDocument(doc.metadata.id);
          }
        }
      } catch (jsonError) {
        console.warn('Error checking/deleting document in JSON storage:', jsonError);
        // Continue with deletion regardless
      }
      
      // Delete chunks if they exist
      if (this.chunksTableExists) {
        try {
          await supabase
            .from('document_chunks')
            .delete()
            .eq('document_id', id);
        } catch (error) {
          console.warn('Error deleting document chunks:', error);
          // Continue with deletion regardless
        }
      }
      
      // Delete content
      const { error: contentError } = await supabase
        .from('document_content')
        .delete()
        .eq('id', id);
        
      if (contentError) {
        console.error('Error deleting document content:', contentError);
        return false;
      }
      
      // Delete metadata
      const { error: metadataError } = await supabase
        .from('document_metadata')
        .delete()
        .eq('id', id);
        
      if (metadataError) {
        console.error('Error deleting document metadata:', metadataError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteDocument:', error);
      return false;
    }
  }
  
  // Search for documents by content (now with vector search support)
  async searchDocuments(query: string, useVectorSearch: boolean = false): Promise<DocumentMetadata[]> {
    // Try to initialize if not already done
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        console.warn('Cache not initialized, returning empty search results');
        return [];
      }
    }
    
    try {
      // Sanitize the query
      const sanitizedQuery = sanitizeTextForStorage(query);
      
      let matchingDocIds = new Set<string>();
      
      // First, try vector search if requested and available
      if (useVectorSearch && this.embeddingsEnabled) {
        try {
          // Generate embedding for the query
          const embeddingResponse = await fetch('/api/generate-embedding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: sanitizedQuery }),
          });
          
          if (embeddingResponse.ok) {
            const { embedding } = await embeddingResponse.json();
            
            if (embedding && embedding.length > 0) {
              // Search for similar chunks
              const similarChunks = await this.findSimilarChunks(embedding);
              
              // Add matching document IDs
              similarChunks.forEach(result => {
                matchingDocIds.add(result.chunk.documentId);
              });
            }
          }
        } catch (error) {
          console.error('Error performing vector search:', error);
          // Continue with regular search as fallback
        }
      }
      
      // If vector search didn't yield results or wasn't used, do regular search
      if (matchingDocIds.size === 0) {
        // First check for documents with extracted text
        if (this.extractedTextEnabled) {
          const { data: extractedTextMatches, error: extractedTextError } = await supabase
            .from('document_content')
            .select('id')
            .not('extracted_text', 'is', null)
            .ilike('extracted_text', `%${sanitizedQuery}%`);
            
          if (!extractedTextError && extractedTextMatches) {
            extractedTextMatches.forEach(match => matchingDocIds.add(match.id));
          }
        }
        
        // Next, get document IDs that match the query in regular content
        const { data: contentMatches, error: contentError } = await supabase
          .from('document_content')
          .select('id')
          .ilike('content', `%${sanitizedQuery}%`);
          
        if (contentError) {
          console.error('Error searching document content:', contentError);
        } else if (contentMatches) {
          contentMatches.forEach(match => matchingDocIds.add(match.id));
        }
        
        // Also search in chunks if they exist
        if (this.chunksTableExists) {
          try {
            const { data: chunkMatches, error: chunkError } = await supabase
              .from('document_chunks')
              .select('document_id')
              .ilike('content', `%${sanitizedQuery}%`);
              
            if (!chunkError && chunkMatches) {
              chunkMatches.forEach(match => matchingDocIds.add(match.document_id));
            }
          } catch (error) {
            console.warn('Error searching document chunks:', error);
          }
        }
      }
      
      if (matchingDocIds.size === 0) {
        return [];
      }
      
      // Get metadata for matching documents
      const { data: metadataData, error: metadataError } = await supabase
        .from('document_metadata')
        .select('*')
        .in('id', Array.from(matchingDocIds));
        
      if (metadataError) {
        console.error('Error fetching document metadata:', metadataError);
        return [];
      }
      
      return metadataData.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        uploadDate: doc.upload_date,
        fileType: doc.file_type,
        wordCount: doc.word_count,
        tokenCount: doc.token_count,
        chunked: doc.chunked || false,
        totalChunks: doc.total_chunks || 0,
        hasEmbeddings: doc.has_embeddings || false,
        hasExtractedText: doc.has_extracted_text || false
      }));
    } catch (error) {
      console.error('Error in searchDocuments:', error);
      return [];
    }
  }
}

// Export instance for use throughout the application
const documentCacheService = new DocumentCacheService();

// Initialize on load
documentCacheService.initialize().then(success => {
  if (success) {
    console.log('Document cache service initialized successfully');
  } else {
    console.warn('Document cache service initialization failed');
  }
});

export default documentCacheService;