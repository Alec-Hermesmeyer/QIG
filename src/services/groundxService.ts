// Ground-X service that routes all calls through our Express backend
import { 
  getGroundXBuckets, 
  queryGroundXRag, 
  searchGroundXDocuments, 
  getDocumentXray, 
  getDocumentInfo 
} from './backendApi';
import { BucketInfo } from '@/types/groundx';

export interface GroundXSearchResult {
  id: string;
  fileName: string;
  text: string;
  score: number;
  metadata?: Record<string, any>;
  highlights?: string[];
}

export interface GroundXRagResponse {
  success: boolean;
  response: string;
  searchResults: {
    count: number;
    sources: GroundXSearchResult[];
  };
  thoughts?: string;
  executionTime?: {
    totalMs: number;
    searchMs: number;
    llmMs: number;
  };
}

export class GroundXService {
  
  /**
   * Get all available buckets (with organization filtering)
   */
  async getBuckets(): Promise<BucketInfo[]> {
    try {
      const response = await getGroundXBuckets();
      if (response.success && response.buckets) {
        return response.buckets.map((bucket: any) => ({
          id: Number(bucket.id),
          name: bucket.name,
          documentCount: bucket.documentCount || 0
        }));
      }
      throw new Error(response.error || 'Failed to load buckets');
    } catch (error) {
      console.error('Error loading Ground-X buckets:', error);
      throw error;
    }
  }

  /**
   * Perform RAG query (search + AI generation)
   */
  async query(query: string, bucketId: string, options?: {
    limit?: number;
    includeThoughts?: boolean;
  }): Promise<GroundXRagResponse> {
    try {
      const response = await queryGroundXRag(
        query, 
        bucketId, 
        options?.limit || 10
      );
      
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'RAG query failed');
    } catch (error) {
      console.error('Error with Ground-X RAG query:', error);
      throw error;
    }
  }

  /**
   * Search documents without AI generation
   */
  async search(query: string, bucketId: string, limit: number = 10): Promise<GroundXSearchResult[]> {
    try {
      const response = await searchGroundXDocuments(query, bucketId, limit);
      
      if (response.success && response.results) {
        return response.results;
      }
      throw new Error(response.error || 'Search failed');
    } catch (error) {
      console.error('Error searching Ground-X documents:', error);
      throw error;
    }
  }

  /**
   * Get document X-ray analysis
   */
  async getDocumentXray(documentId: string): Promise<any> {
    try {
      const response = await getDocumentXray(documentId);
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to get X-ray data');
    } catch (error) {
      console.error('Error getting document X-ray:', error);
      throw error;
    }
  }

  /**
   * Get document information
   */
  async getDocumentInfo(documentId: string): Promise<any> {
    try {
      const response = await getDocumentInfo(documentId);
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to get document info');
    } catch (error) {
      console.error('Error getting document info:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const groundxService = new GroundXService();

// Export convenience functions
export const {
  getBuckets,
  query: queryGroundX,
  search: searchGroundX,
  getDocumentXray: getGroundXDocumentXray,
  getDocumentInfo: getGroundXDocumentInfo
} = groundxService; 