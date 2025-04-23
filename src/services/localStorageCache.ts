// src/services/localStorageCache.ts
// A simplified document cache that uses browser localStorage for persistence

import { DocumentMetadata, DocumentContent, DocumentAnalysis } from './documentCache';

// Local storage keys
const METADATA_KEY = 'docCache_metadata';
const CONTENT_KEY = 'docCache_content';

export class LocalStorageCacheService {
  private metadataMap: Map<string, DocumentMetadata>;
  private contentMap: Map<string, DocumentContent>;
  
  constructor() {
    this.metadataMap = new Map();
    this.contentMap = new Map();
    this.loadFromStorage();
  }
  
  // Load data from localStorage
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return; // Skip on server-side
    
    try {
      // Load metadata
      const metadataStr = localStorage.getItem(METADATA_KEY);
      if (metadataStr) {
        const metadataArray = JSON.parse(metadataStr) as DocumentMetadata[];
        metadataArray.forEach(item => {
          this.metadataMap.set(item.id, item);
        });
      }
      
      // Load content
      const contentStr = localStorage.getItem(CONTENT_KEY);
      if (contentStr) {
        const contentArray = JSON.parse(contentStr) as DocumentContent[];
        contentArray.forEach(item => {
          this.contentMap.set(item.id, item);
        });
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }
  
  // Save data to localStorage
  private saveToStorage(): void {
    if (typeof window === 'undefined') return; // Skip on server-side
    
    try {
      // Save metadata
      const metadataArray = Array.from(this.metadataMap.values());
      localStorage.setItem(METADATA_KEY, JSON.stringify(metadataArray));
      
      // Save content (be careful with large content)
      const contentArray = Array.from(this.contentMap.values());
      localStorage.setItem(CONTENT_KEY, JSON.stringify(contentArray));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
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
      const id = `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Create metadata
      const metadata: DocumentMetadata = {
        id,
        filename,
        uploadDate: new Date().toISOString(),
        fileType,
        wordCount,
        tokenCount
      };
      
      // Create content object
      const contentObj: DocumentContent = {
        id,
        content,
        summary
      };
      
      // Store in maps
      this.metadataMap.set(id, metadata);
      this.contentMap.set(id, contentObj);
      
      // Save to localStorage
      this.saveToStorage();
      
      return metadata;
    } catch (error) {
      console.error('Error in storeDocument:', error);
      return null;
    }
  }
  
  // Get all documents
  async getAllDocuments(): Promise<DocumentMetadata[]> {
    try {
      // Convert map to array and sort by date (newest first)
      return Array.from(this.metadataMap.values())
        .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    } catch (error) {
      console.error('Error in getAllDocuments:', error);
      return [];
    }
  }
  
  // Get a single document
  async getDocument(id: string): Promise<DocumentAnalysis | null> {
    try {
      const metadata = this.metadataMap.get(id);
      const content = this.contentMap.get(id);
      
      if (!metadata || !content) {
        return null;
      }
      
      return {
        metadata,
        content
      };
    } catch (error) {
      console.error('Error in getDocument:', error);
      return null;
    }
  }
  
  // Delete a document
  async deleteDocument(id: string): Promise<boolean> {
    try {
      const metadataDeleted = this.metadataMap.delete(id);
      const contentDeleted = this.contentMap.delete(id);
      
      if (metadataDeleted || contentDeleted) {
        this.saveToStorage();
      }
      
      return metadataDeleted && contentDeleted;
    } catch (error) {
      console.error('Error in deleteDocument:', error);
      return false;
    }
  }
  
  // Search for documents
  async searchDocuments(query: string): Promise<DocumentMetadata[]> {
    try {
      const queryLower = query.toLowerCase();
      
      // Find documents that match the query in content or filename
      const matchingIds = new Set<string>();
      
      // Check content
      this.contentMap.forEach((content, id) => {
        if (content.content.toLowerCase().includes(queryLower)) {
          matchingIds.add(id);
        }
      });
      
      // Check filenames
      this.metadataMap.forEach((metadata, id) => {
        if (metadata.filename.toLowerCase().includes(queryLower)) {
          matchingIds.add(id);
        }
      });
      
      // Get metadata for matching documents
      const results: DocumentMetadata[] = [];
      matchingIds.forEach(id => {
        const metadata = this.metadataMap.get(id);
        if (metadata) {
          results.push(metadata);
        }
      });
      
      return results.sort((a, b) => 
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
      );
    } catch (error) {
      console.error('Error in searchDocuments:', error);
      return [];
    }
  }
}

// Export instance for use throughout the application
const localStorageCacheService = new LocalStorageCacheService();
export default localStorageCacheService;