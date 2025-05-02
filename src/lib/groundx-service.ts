// Import the GroundXClient and specifically the Document type to get DocumentType
import { GroundXClient } from "groundx";
// Get the Document interface from the groundx module to access its type definitions
import { Document, DocumentType } from "groundx/api/types/Document";
import OpenAI from "openai";

// Initialize clients
let groundxClient: GroundXClient;
let openai: OpenAI;

// Initialize clients only on the server side
if (typeof window === 'undefined') {
  groundxClient = new GroundXClient({
    apiKey: process.env.GROUNDX_API_KEY!,
  });

  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });
}

export class GroundXRag {
  private bucketId: number | null = null;
  
  // Create a new bucket
  async createBucket(name: string): Promise<number> {
    try {
      const response = await groundxClient.buckets.create({
        name: name
      });
      
      this.bucketId = response.bucket.bucketId;
      return this.bucketId;
    } catch (error) {
      console.error("Error creating bucket:", error);
      throw error;
    }
  }
  
  // List all buckets
  async listBuckets() {
    try {
      const buckets = await groundxClient.buckets.list();
      return buckets.buckets;
    } catch (error) {
      console.error("Error listing buckets:", error);
      throw error;
    }
  }
  
  // Use an existing bucket
  setBucketId(id: number) {
    this.bucketId = id;
  }
  
  
  // Upload remote files to the bucket
  async uploadRemoteFiles(fileUrls: {url: string, name: string, type: string}[]): Promise<string> {
    if (!this.bucketId) {
      throw new Error("Bucket ID not set. Create or select a bucket first.");
    }
    
    try {
      const uploadRequests: Document[] = fileUrls.map(file => {
        // Convert string file type to DocumentType enum
        const fileTypeEnum = mapStringToDocumentType(file.type);
        
        return {
          bucketId: this.bucketId!,
          fileName: file.name,
          filePath: file.url,
          fileType: fileTypeEnum,
          searchData: {
            source: "remote",
            uploadDate: new Date().toISOString()
          }
        };
      });
      
      const ingest = await groundxClient.ingest(uploadRequests);
      return ingest.ingest.processId;
    } catch (error) {
      console.error("Error uploading remote files:", error);
      throw error;
    }
  }
  
  // Add this method to the GroundXRag class
async uploadLocalFile(file: File, fileName: string): Promise<string> {
  if (!this.bucketId) {
    throw new Error("Bucket ID not set. Create or select a bucket first.");
  }
  
  try {
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Get file extension
    const fileExt = fileName.split('.').pop() || 'pdf';
    const fileTypeEnum = mapStringToDocumentType(fileExt);
    
    // Use the ingestFromBuffer method if available, or fall back to base64 encoding
    const base64Buffer = buffer.toString('base64');
    const ingest = await groundxClient.ingest(
      [{
        bucketId: this.bucketId,
        fileName: fileName,
        filePath: `data:application/octet-stream;base64,${base64Buffer}`,
        fileType: fileTypeEnum,
        searchData: {
          source: "local-upload",
          uploadDate: new Date().toISOString()
        }
      }]
    );
    
    return ingest.ingest.processId;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}
  
  
  // Check upload status
  async checkUploadStatus(processId: string) {
    try {
      const status = await groundxClient.documents.getProcessingStatusById(processId);
      return status;
    } catch (error) {
      console.error("Error checking upload status:", error);
      throw error;
    }
  }
  
  // Wait for upload to complete
  async waitForUploadCompletion(processId: string, checkIntervalMs = 5000, maxWaitTimeMs = 300000) {
    const startTime = Date.now();
    let status;
    
    do {
      status = await this.checkUploadStatus(processId);
      
      if (status.ingest.status === "complete") {
        return status;
      }
      
      if (status.ingest.status === "error") {
        throw new Error("Upload failed with error");
      }
      
      // Check if we've exceeded the maximum wait time
      if (Date.now() - startTime > maxWaitTimeMs) {
        throw new Error(`Upload did not complete within the maximum wait time of ${maxWaitTimeMs / 1000} seconds`);
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
      
    } while (status.ingest.status === "queued" || status.ingest.status === "processing");
    
    return status;
  }
  
  // Search for content
  async searchContent(query: string) {
    if (!this.bucketId) {
      throw new Error("Bucket ID not set. Create or select a bucket first.");
    }
    
    try {
      const searchResponse = await groundxClient.search.content(
        this.bucketId,
        {
          query: query,
        }
      );
      
      return searchResponse;
    } catch (error) {
      console.error("Error searching content:", error);
      throw error;
    }
  }
  
  // Get LLM response using RAG
  async generateRagResponse(query: string, systemPrompt?: string) {
    // Default system prompt if none provided
    const defaultSystemPrompt = `You are a helpful assistant that provides accurate information based on the context provided. 
Respond to the user's question using only the information in the context. 
If the context doesn't contain relevant information, say that you don't have enough information to answer.`;
    
    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;
    
    try {
      // 1. Search for relevant content
      const searchResponse = await this.searchContent(query);
      
      // 2. Use the search results to augment the LLM
      if (searchResponse.search.count === 0) {
        return "No relevant information found in the documents to answer your query.";
      }
      
      // 3. Use the search.text for LLM context as recommended by GroundX
      const llmText = searchResponse.search.text;
      
      // 4. Call OpenAI with the augmented prompt
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview", // or your preferred model
        messages: [
          {
            role: 'system',
            content: `${finalSystemPrompt}
===
${llmText}
===`,
          },
          { role: 'user', content: query },
        ],
      });
      
      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Error generating RAG response:", error);
      throw error;
    }
  }
}

function mapStringToDocumentType(fileType: string): DocumentType {
  fileType = fileType.toLowerCase();
  
  // Map common extensions to DocumentType values
  switch (fileType) {
    case 'pdf':
      return DocumentType.PDF;
    case 'txt':
      return DocumentType.TXT;
    case 'doc':
    case 'docx':
      return DocumentType.DOCX;
    case 'ppt':
    case 'pptx':
      return DocumentType.PPTX;
    case 'xls':
    case 'xlsx':
      return DocumentType.XLSX;
    case 'csv':
      return DocumentType.CSV;
    case 'jpg':
    case 'jpeg':
      return DocumentType.JPEG;
    case 'png':
      return DocumentType.PNG;
    case 'html':
      return DocumentType.HTML;
    // Add more mappings as needed
    default:
      // You might want to handle unknown types differently
      console.warn(`Unknown file type: ${fileType}, defaulting to TXT`);
      return DocumentType.TXT;
  }
}

// Export a singleton instance for use throughout the app
export const groundXService = new GroundXRag();