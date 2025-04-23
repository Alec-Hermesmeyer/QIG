// src/services/unifiedDocumentCache.ts
// A unified document cache that tries Supabase first and falls back to localStorage

import supabaseDocumentCache, { 
    DocumentMetadata, 
    DocumentContent,
    DocumentAnalysis,
    DocumentCacheService
  } from './documentCache';
  import localStorageCacheService from './localStorageCache';
  
  export type { DocumentMetadata, DocumentContent, DocumentAnalysis };
  
  class UnifiedDocumentCacheService {
    private supabaseCache: DocumentCacheService;
    private localCache: typeof localStorageCacheService;
    private useSupabase: boolean = true;
    
    constructor() {
      this.supabaseCache = supabaseDocumentCache;
      this.localCache = localStorageCacheService;
      
      // Check if Supabase is available
      this.checkSupabaseAvailability();
    }
    
    // Check if Supabase is available
    private async checkSupabaseAvailability(): Promise<void> {
      try {
        const initialized = await this.supabaseCache.initialize();
        this.useSupabase = initialized;
        
        console.log(`Using ${this.useSupabase ? 'Supabase' : 'localStorage'} for document cache`);
      } catch (error) {
        console.error('Error checking Supabase availability:', error);
        this.useSupabase = false;
      }
    }
    
    // Store a document
    async storeDocument(
      filename: string, 
      fileType: string, 
      content: string, 
      summary: string, 
      wordCount: number, 
      tokenCount: number
    ): Promise<DocumentMetadata | null> {
      try {
        if (this.useSupabase) {
          const result = await this.supabaseCache.storeDocument(
            filename, fileType, content, summary, wordCount, tokenCount
          );
          
          if (result) return result;
          
          // If Supabase fails, fall back to localStorage
          console.warn('Supabase document storage failed, falling back to localStorage');
          this.useSupabase = false;
        }
        
        return this.localCache.storeDocument(
          filename, fileType, content, summary, wordCount, tokenCount
        );
      } catch (error) {
        console.error('Error in unified storeDocument:', error);
        
        // Try localStorage as last resort
        this.useSupabase = false;
        return this.localCache.storeDocument(
          filename, fileType, content, summary, wordCount, tokenCount
        );
      }
    }
    
    // Get all documents
    async getAllDocuments(): Promise<DocumentMetadata[]> {
      try {
        if (this.useSupabase) {
          const documents = await this.supabaseCache.getAllDocuments();
          
          // If empty or error, try localStorage
          if (documents.length === 0) {
            const localDocuments = await this.localCache.getAllDocuments();
            if (localDocuments.length > 0) {
              return localDocuments;
            }
          }
          
          return documents;
        }
        
        return this.localCache.getAllDocuments();
      } catch (error) {
        console.error('Error in unified getAllDocuments:', error);
        return this.localCache.getAllDocuments();
      }
    }
    
    // Get a single document
    async getDocument(id: string): Promise<DocumentAnalysis | null> {
      try {
        if (this.useSupabase) {
          const document = await this.supabaseCache.getDocument(id);
          
          if (document) return document;
          
          // If not found in Supabase, try localStorage
          return this.localCache.getDocument(id);
        }
        
        return this.localCache.getDocument(id);
      } catch (error) {
        console.error('Error in unified getDocument:', error);
        return this.localCache.getDocument(id);
      }
    }
    
    // Delete a document
    async deleteDocument(id: string): Promise<boolean> {
      try {
        let supabaseSuccess = false;
        
        // Try to delete from both storages if possible
        if (this.useSupabase) {
          supabaseSuccess = await this.supabaseCache.deleteDocument(id);
        }
        
        const localSuccess = await this.localCache.deleteDocument(id);
        
        // Return true if either deletion succeeded
        return supabaseSuccess || localSuccess;
      } catch (error) {
        console.error('Error in unified deleteDocument:', error);
        return this.localCache.deleteDocument(id);
      }
    }
    
    // Search for documents
    async searchDocuments(query: string): Promise<DocumentMetadata[]> {
      try {
        if (this.useSupabase) {
          const documents = await this.supabaseCache.searchDocuments(query);
          
          // If empty or error, try localStorage
          if (documents.length === 0) {
            return this.localCache.searchDocuments(query);
          }
          
          return documents;
        }
        
        return this.localCache.searchDocuments(query);
      } catch (error) {
        console.error('Error in unified searchDocuments:', error);
        return this.localCache.searchDocuments(query);
      }
    }
  }
  
  // Export instance for use throughout the application
  const unifiedDocumentCache = new UnifiedDocumentCacheService();
  export default unifiedDocumentCache;