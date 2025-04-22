import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient } from '@azure/storage-blob';

// Get environment variables
const connectionString = process.env.NEXT_PUBLIC_AZURE_STORAGE_CONNECTION_STRING || '';
const containerName = process.env.NEXT_PUBLIC_AZURE_BLOB_CONTAINER_NAME || '';
const flaskApiUrl = process.env.NEXT_PUBLIC_FLASK_API_URL || '';

// Initialize Azure Blob Storage client
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

export async function POST(request: NextRequest) {
  console.log("Compare documents request received");
  
  try {
    // Parse request
    const { files } = await request.json();
    console.log(`Comparing files: ${files.join(', ')}`);
    
    if (!files || !Array.isArray(files) || files.length !== 2) {
      return NextResponse.json(
        { error: 'Exactly two files are required for comparison' }, 
        { status: 400 }
      );
    }
    
    // Check if files exist
    for (const fileName of files) {
      const blobClient = containerClient.getBlobClient(fileName);
      const exists = await blobClient.exists();
      if (!exists) {
        return NextResponse.json(
          { error: `File '${fileName}' not found` },
          { status: 404 }
        );
      }
    }
    
    // Prepare prompt for document comparison
    const prompt = `Compare these two document names and provide:
1. Similarities between what these documents likely contain
2. Key differences you would expect between these documents
3. Whether these documents might be related or versions of each other
4. The probable purpose of each document

Document 1: ${files[0]}
Document 2: ${files[1]}`;
    
    // Call the chat stream API
    try {
      const apiResponse = await fetch(`${flaskApiUrl}/api/chat-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are an expert at document comparison who can compare documents based on their file names." },
            { role: "user", content: prompt }
          ],
          stream: false // We want the complete response, not streaming
        }),
      });
      
      if (!apiResponse.ok) {
        console.error('API response error:', apiResponse.status, apiResponse.statusText);
        return NextResponse.json({ 
          error: `API request failed: ${apiResponse.statusText}`,
          // Basic fallback comparison
          similarityScore: calculateFileNameSimilarity(files[0], files[1]),
          differences: [`Document 1: ${files[0]}`, `Document 2: ${files[1]}`],
          commonElements: []
        });
      }
      
      // Parse API response
      const apiResult = await apiResponse.json();
      
      // Extract the text from the API response
      let comparisonText = '';
      if (apiResult && apiResult.choices && apiResult.choices.length > 0) {
        comparisonText = apiResult.choices[0].message.content;
      } else {
        comparisonText = `Comparison of ${files[0]} and ${files[1]} could not be generated.`;
      }
      
      // Process the AI response into a structured format
      const result = processComparisonResponse(comparisonText, files);
      
      return NextResponse.json(result);
    } catch (apiError) {
      console.error("Error calling Flask API:", apiError);
      
      // Return a basic comparison based just on the filenames
      return NextResponse.json({
        similarityScore: calculateFileNameSimilarity(files[0], files[1]),
        differences: [`Document 1: ${files[0]}`, `Document 2: ${files[1]}`],
        commonElements: [],
        error: "API call failed, providing basic comparison based on filenames only."
      });
    }
  } catch (error) {
    console.error("Document comparison error:", error);
    return NextResponse.json(
      { 
        error: "Failed to compare documents",
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}

// Process the AI comparison response into a structured format
function processComparisonResponse(
  content: string,
  files: string[]
): Record<string, any> {
  // Guess similarity score from content
  let similarityScore = 50; // Default middle value
  
  if (content.toLowerCase().includes('very similar') || 
      content.toLowerCase().includes('highly similar') ||
      content.toLowerCase().includes('almost identical')) {
    similarityScore = 85;
  } else if (content.toLowerCase().includes('similar')) {
    similarityScore = 70;
  } else if (content.toLowerCase().includes('somewhat similar') ||
             content.toLowerCase().includes('partially similar')) {
    similarityScore = 50;
  } else if (content.toLowerCase().includes('different') ||
             content.toLowerCase().includes('distinct')) {
    similarityScore = 30;
  } else if (content.toLowerCase().includes('very different') ||
             content.toLowerCase().includes('completely different') ||
             content.toLowerCase().includes('not related')) {
    similarityScore = 15;
  }
  
  // Extract differences
  const differences: string[] = [];
  const differencesMatch = content.match(/differences|distinct|different[\s\S]*?:([\s\S]*?)(?:\n\n|\n#|\n\d+\.|$)/i);
  if (differencesMatch && differencesMatch[1]) {
    // Get differences as a list
    const diffLines = differencesMatch[1]
      .split('\n')
      .map(line => line.replace(/^[-*•\s]+/, '').trim())
      .filter(diff => diff.length > 0);
    
    if (diffLines.length > 0) {
      differences.push(...diffLines.slice(0, 5));
    }
  }
  
  // If no differences found, create basic ones
  if (differences.length === 0) {
    differences.push(`Document 1: ${files[0]}`);
    differences.push(`Document 2: ${files[1]}`);
  }
  
  // Extract commonalities
  const commonElements: string[] = [];
  const commonMatch = content.match(/similarities|common|shared|both[\s\S]*?:([\s\S]*?)(?:\n\n|\n#|\n\d+\.|$)/i);
  if (commonMatch && commonMatch[1]) {
    // Get commonalities as a list
    const commonLines = commonMatch[1]
      .split('\n')
      .map(line => line.replace(/^[-*•\s]+/, '').trim())
      .filter(common => common.length > 0);
    
    if (commonLines.length > 0) {
      commonElements.push(...commonLines.slice(0, 5));
    }
  }
  
  return {
    similarityScore,
    differences,
    commonElements,
    rawComparison: content
  };
}

// Calculate a basic similarity score between two filenames
function calculateFileNameSimilarity(file1: string, file2: string): number {
  const name1 = file1.split('.').slice(0, -1).join('.').toLowerCase();
  const name2 = file2.split('.').slice(0, -1).join('.').toLowerCase();
  
  // Check if they're identical
  if (name1 === name2) return 100;
  
  // Check if one contains the other
  if (name1.includes(name2) || name2.includes(name1)) return 75;
  
  // Split into words and check for shared words
  const words1 = name1.split(/[\s_\-\.]+/);
  const words2 = name2.split(/[\s_\-\.]+/);
  
  const uniqueWords1 = new Set(words1);
  const uniqueWords2 = new Set(words2);
  
  let sharedCount = 0;
  for (const word of uniqueWords1) {
    if (uniqueWords2.has(word)) sharedCount++;
  }
  
  // Calculate Jaccard similarity
  const unionSize = uniqueWords1.size + uniqueWords2.size - sharedCount;
  return Math.round((sharedCount / unionSize) * 100);
}