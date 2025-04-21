// lib/blobService.ts

// Define our blob storage service
export class BlobStorageService {
    /**
     * List all files from our local API proxy
     * @returns Promise<string[]> - List of filenames
     */
    async listFiles(): Promise<string[]> {
      try {
        const response = await fetch('/api/list-files', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
  
        if (!response.ok) {
          throw new Error(`Failed to list files. Status: ${response.status}`);
        }
  
        return await response.json();
      } catch (error) {
        console.error('Error listing files:', error);
        throw error;
      }
    }
  
    /**
     * Get the content of a file through our local API proxy
     * @param fileName - Name of the file to retrieve
     * @returns Promise<string> - File content
     */
    async getFileContent(fileName: string): Promise<string> {
      try {
        const response = await fetch(`/api/proxy-content?filename=${encodeURIComponent(fileName)}`, {
          method: 'GET',
        });
  
        if (!response.ok) {
          throw new Error(`Failed to get file content. Status: ${response.status}`);
        }
  
        return await response.text();
      } catch (error) {
        console.error('Error getting file content:', error);
        throw error;
      }
    }
  
    /**
     * Get the URL for a file
     * @param fileName - Name of the file
     * @returns string - URL to access the file
     */
    getFileUrl(fileName: string): string {
      return `/api/proxy-content?filename=${encodeURIComponent(fileName)}`;
    }
  }
  
  // Export a singleton instance
  export const blobService = new BlobStorageService();
  
  export default blobService;