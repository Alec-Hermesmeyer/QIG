// src/services/documentCache.ts with embeddings support

import { createClient } from '@supabase/supabase-js';

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
}

export interface DocumentContent {
  id: string;
  content: string;
  summary: string;
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

export class DocumentCacheService {
  private initialized: boolean = false;
  private chunksTableExists: boolean = false;
  private embeddingsEnabled: boolean = false;
  
  // Initialize the service and create tables if needed
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    try {
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
          summary: sanitizedSummary
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
      return {
        id,
        filename,
        uploadDate: new Date().toISOString(),
        fileType,
        wordCount,
        tokenCount,
        chunked: useChunks,
        totalChunks: embeddedChunks.length,
        hasEmbeddings: embeddedChunks.length > 0 && embeddedChunks[0].embedding.length > 0
      };
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
      
      // Add has_embeddings field if it's supported
      if (this.embeddingsEnabled) {
        metadataToInsert.has_embeddings = false;
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
      
      // Store document content
      const { error: contentError } = await supabase
        .from('document_content')
        .insert({
          id,
          content: contentToStore,
          summary: sanitizedSummary
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
      
      // Format and return metadata
      return {
        id,
        filename,
        uploadDate: new Date().toISOString(),
        fileType,
        wordCount,
        tokenCount,
        chunked,
        hasEmbeddings: false
      };
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
        content: item.content
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
        .select('chunked, total_chunks')
        .eq('id', documentId)
        .single();
        
      if (metadataError) {
        console.error('Error fetching document metadata:', metadataError);
        return null;
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
        hasEmbeddings: doc.has_embeddings || false
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
          hasEmbeddings: metadataData.has_embeddings || false
        },
        content: {
          id: contentData.id,
          content: contentData.content,
          summary: contentData.summary
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
        // Get document IDs that match the query in content
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
        hasEmbeddings: doc.has_embeddings || false
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