// lib/blobService.ts

// Load environment variables
const AZURE_BLOB_URL = process.env.NEXT_PUBLIC_AZURE_BLOB_URL || '';
const AZURE_SAS_TOKEN = process.env.NEXT_PUBLIC_AZURE_SAS_TOKEN || '';

// Clean up the blob URL to remove any existing query parameters
const baseUrl = AZURE_BLOB_URL?.split('?')[0] || '';

export class BlobStorageService {
  /**
   * List all files from our local API proxy
   * @returns Promise<string[]> - List of filenames
   */
  async listFiles(): Promise<string[]> {
    try {
      // Use local API proxy to avoid CORS issues
      const response = await fetch('/api/list-files', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Failed to list files. Status: ${response.status}`);
        const errorText = await response.text();
        console.error(`Error details: ${errorText}`);
        throw new Error(`Failed to list files. Status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Get the content of a file directly using the SAS token
   * @param fileName - Name of the file to retrieve
   * @returns Promise<string> - File content
   */
  async getFileContent(fileName: string): Promise<string> {
    try {
      // Try to access directly first
      if (baseUrl && AZURE_SAS_TOKEN) {
        try {
          const directUrl = this.getDirectFileUrl(fileName);
          const directResponse = await fetch(directUrl, {
            method: 'GET',
          });
          
          if (directResponse.ok) {
            return await directResponse.text();
          }
          // If direct access fails, fall back to proxy
          console.log('Direct access failed, falling back to proxy');
        } catch (directError) {
          console.log('Direct access error, falling back to proxy', directError);
        }
      }
      
      // Fall back to using proxy API
      const response = await fetch(`/api/proxy-content?filename=${encodeURIComponent(fileName)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        console.error(`Failed to get file content. Status: ${response.status}`);
        const errorText = await response.text();
        console.error(`Error details: ${errorText}`);
        throw new Error(`Failed to get file content. Status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Error getting file content:', error);
      throw error;
    }
  }

  /**
   * Get the direct URL for a file with SAS token
   * @param fileName - Name of the file
   * @returns string - URL to access the file
   */
  getDirectFileUrl(fileName: string): string {
    // Only use direct URL if we have both base URL and SAS token
    if (baseUrl && AZURE_SAS_TOKEN) {
      // Construct URL with path and SAS token
      const url = new URL(fileName, baseUrl);
      
      // Add SAS token (with or without leading ?)
      const sasToken = AZURE_SAS_TOKEN.startsWith('?') 
        ? AZURE_SAS_TOKEN 
        : `?${AZURE_SAS_TOKEN}`;
      
      return `${url.toString()}${sasToken}`;
    }
    
    // Fall back to proxy URL
    return this.getProxyFileUrl(fileName);
  }
  
  /**
   * Get the proxy URL for a file
   * @param fileName - Name of the file
   * @returns string - URL to access the file via proxy
   */
  getProxyFileUrl(fileName: string): string {
    return `/api/proxy-content?filename=${encodeURIComponent(fileName)}`;
  }
  
  /**
   * Get the URL for a file (automatically chooses direct or proxy)
   * @param fileName - Name of the file
   * @returns string - URL to access the file
   */
  getFileUrl(fileName: string): string {
    // Try direct URL first if possible
    if (baseUrl && AZURE_SAS_TOKEN) {
      return this.getDirectFileUrl(fileName);
    }
    
    // Fall back to proxy
    return this.getProxyFileUrl(fileName);
  }
}

// Export a singleton instance
export const blobService = new BlobStorageService();

export default blobService;