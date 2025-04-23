// src/services/documentCache.ts

import { createClient } from '@supabase/supabase-js';

// Define document types
export interface DocumentMetadata {
  id: string;
  filename: string;
  uploadDate: string;
  fileType: string;
  wordCount: number;
  tokenCount: number;
}

export interface DocumentContent {
  id: string;
  content: string;
  summary: string;
}

export interface DocumentAnalysis {
  metadata: DocumentMetadata;
  content: DocumentContent;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export class DocumentCacheService {
  private initialized: boolean = false;
  
  // Initialize the service and create tables if needed
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    try {
      // Check if tables exist by querying metadata
      const { error: metadataError } = await supabase
        .from('document_metadata')
        .select('id')
        .limit(1);
        
      const { error: contentError } = await supabase
        .from('document_content')
        .select('id')
        .limit(1);
      
      // If tables don't exist, log an error but don't try to create them
      // (table creation should be done via migration scripts)
      if (metadataError || contentError) {
        console.warn('Document cache tables may not be set up properly:', 
          metadataError?.message || contentError?.message);
        
        return false;
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing document cache:', error);
      return false;
    }
  }
  
  // Store a document in the cache
  async storeDocument(
    filename: string, 
    fileType: string, 
    content: string, 
    summary: string, 
    wordCount: number, 
    tokenCount: number
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
      
      // Store document metadata
      const { data: metadataData, error: metadataError } = await supabase
        .from('document_metadata')
        .insert({
          id,
          filename,
          upload_date: new Date().toISOString(),
          file_type: fileType,
          word_count: wordCount,
          token_count: tokenCount
        })
        .select()
        .single();
        
      if (metadataError) {
        console.error('Error storing document metadata:', metadataError);
        return null;
      }
      
      // Store document content
      const { error: contentError } = await supabase
        .from('document_content')
        .insert({
          id,
          content,
          summary
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
        tokenCount
      };
    } catch (error) {
      console.error('Error in storeDocument:', error);
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
        tokenCount: doc.token_count
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
      
      return {
        metadata: {
          id: metadataData.id,
          filename: metadataData.filename,
          uploadDate: metadataData.upload_date,
          fileType: metadataData.file_type,
          wordCount: metadataData.word_count,
          tokenCount: metadataData.token_count
        },
        content: {
          id: contentData.id,
          content: contentData.content,
          summary: contentData.summary
        }
      };
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
      // Delete content first (due to foreign key constraint)
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
  
  // Search for documents by content (simple text search)
  async searchDocuments(query: string): Promise<DocumentMetadata[]> {
    // Try to initialize if not already done
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        console.warn('Cache not initialized, returning empty search results');
        return [];
      }
    }
    
    try {
      // Get document IDs that match the query in content
      const { data: contentMatches, error: contentError } = await supabase
        .from('document_content')
        .select('id')
        .ilike('content', `%${query}%`);
        
      if (contentError) {
        console.error('Error searching document content:', contentError);
        return [];
      }
      
      if (!contentMatches || contentMatches.length === 0) {
        return [];
      }
      
      // Get metadata for matching documents
      const ids = contentMatches.map(match => match.id);
      const { data: metadataData, error: metadataError } = await supabase
        .from('document_metadata')
        .select('*')
        .in('id', ids);
        
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
        tokenCount: doc.token_count
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