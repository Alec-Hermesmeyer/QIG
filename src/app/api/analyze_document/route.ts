// File: app/api/analyze_document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient } from '@azure/storage-blob';

// Get environment variables
const connectionString = process.env.NEXT_PUBLIC_AZURE_STORAGE_CONNECTION_STRING || '';
const containerName = process.env.NEXT_PUBLIC_AZURE_BLOB_CONTAINER_NAME || '';

// Initialize Azure Blob Storage client
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

export async function POST(request: NextRequest) {
  console.log("Analyze document request received");
  
  try {
    // Parse request
    const { fileName, analysisType = 'basic' } = await request.json();
    console.log(`Analyzing file name: ${fileName}, type: ${analysisType}`);
    
    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }
    
    // Get blob client for the specified file
    const blobClient = containerClient.getBlobClient(fileName);
    
    // Check if blob exists
    const exists = await blobClient.exists();
    if (!exists) {
      return NextResponse.json(
        { error: `File '${fileName}' not found` },
        { status: 404 }
      );
    }
    
    // Get file properties
    const properties = await blobClient.getProperties();
    const metadata = {
      fileSize: properties.contentLength || 0,
      fileType: properties.contentType || 'Unknown',
      lastModified: properties.lastModified || new Date()
    };
    
    // Perform direct analysis based on filename
    const analysis = analyzeFileName(fileName, analysisType, metadata);
    
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Document analysis error:", error);
    return NextResponse.json(
      { 
        error: "Failed to analyze document",
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}

// Analyze a document based on its filename
function analyzeFileName(
  fileName: string, 
  analysisType: string,
  metadata: Record<string, any>
): Record<string, any> {
  // Extract components from the filename
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
  const nameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
  
  // Extract reference/ID numbers
  const referenceIds = extractReferenceIds(fileName);
  
  // Extract document type information
  const documentInfo = identifyDocumentType(fileName);
  
  // Extract potential dates
  const dates = extractDates(nameWithoutExtension);
  
  // Extract keywords
  const keywords = extractKeywordsFromFileName(fileName);
  
  // Extract parties if available
  const parties = extractPotentialParties(nameWithoutExtension);
  
  // Generate summary based on extracted information
  let summary = '';
  if (documentInfo.type === 'contract') {
    summary = `This appears to be a ${documentInfo.subtype || ''} contract`.trim();
    if (parties.length > 0) {
      summary += parties.length === 1 
        ? ` involving ${parties[0]}.` 
        : ` between ${parties.join(' and ')}.`;
    } else {
      summary += '.';
    }
    
    if (referenceIds.length > 0) {
      summary += ` Contract reference: ${referenceIds.join(', ')}.`;
    }
    
    if (dates.length > 0) {
      summary += ` Associated date: ${dates[0]}.`;
    }
  } else {
    summary = `This appears to be a ${documentInfo.subtype || documentInfo.type || 'document'}`;
    if (parties.length > 0) {
      summary += ` related to ${parties.join(' and ')}`;
    }
    summary += '.';
    
    if (referenceIds.length > 0) {
      summary += ` Reference ID: ${referenceIds.join(', ')}.`;
    }
    
    if (dates.length > 0) {
      summary += ` Associated date: ${dates[0]}.`;
    }
  }
  
  // Base result that gets returned for all analysis types
  const result: Record<string, any> = {
    summary,
    keywords,
    metadata,
    entities: {
      parties: parties,
      references: referenceIds,
      dates: dates
    },
    documentType: documentInfo.type,
    fileInfo: {
      extension: fileExtension,
      size: formatFileSize(metadata.fileSize),
      lastModified: metadata.lastModified
    }
  };
  
  // Add additional information for detailed analysis
  if (analysisType === 'detailed' || analysisType === 'contract') {
    result.sentiment = { score: 0.5, label: 'Neutral' };
    result.languages = detectPossibleLanguages(fileName);
  }
  
  // Add contract-specific information for contract analysis
  if (analysisType === 'contract' && documentInfo.type === 'contract') {
    result.contractAnalysis = {
      parties: parties,
      effectiveDate: dates.length > 0 ? dates[0] : null,
      expirationDate: dates.length > 1 ? dates[1] : null,
      contractType: documentInfo.subtype || 'General',
      contractNumber: referenceIds.length > 0 ? referenceIds[0] : null,
      obligations: generateGenericObligations(documentInfo.subtype || 'General'),
      rights: generateGenericRights(documentInfo.subtype || 'General')
    };
  }
  
  return result;
}

// Extract reference IDs and numbers from a filename
function extractReferenceIds(fileName: string): string[] {
  const referenceIds: string[] = [];
  
  // Extract numeric sequences that might be IDs
  const numericMatches = fileName.match(/\d{4,}/g) || [];
  referenceIds.push(...numericMatches);
  
  // Extract alphanumeric IDs with common patterns
  const alphanumericMatches = fileName.match(/[A-Z]+\d+|\d+[A-Z]+/g) || [];
  referenceIds.push(...alphanumericMatches);
  
  // Extract common reference formats
  const refMatches = fileName.match(/(?:ref|id|no)[.\-_ :]+([A-Z0-9\-]+)/gi);
  if (refMatches) {
    for (const match of refMatches) {
      const parts = match.split(/[.\-_ :]+/);
      if (parts.length > 1) {
        referenceIds.push(parts[1]);
      }
    }
  }
  
  // Remove duplicates and return
  return Array.from(new Set(referenceIds));
}

// Extract potential dates from a filename
function extractDates(fileName: string): string[] {
  const dates: string[] = [];
  
  // Look for common date formats (MM-DD-YYYY, YYYY-MM-DD, etc.)
  const dateRegexes = [
    /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g, // MM/DD/YYYY
    /\b(19|20)\d{2}[\/\-](0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])\b/g, // YYYY/MM/DD
    /\b(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](19|20)\d{2}\b/g, // DD/MM/YYYY
    /\b(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/g // YYYYMMDD
  ];
  
  for (const regex of dateRegexes) {
    const matches = fileName.match(regex) || [];
    dates.push(...matches);
  }
  
  // Look for just years
  const yearMatches = fileName.match(/\b(19|20)\d{2}\b/g) || [];
  for (const year of yearMatches) {
    if (!dates.some(date => date.includes(year))) {
      dates.push(year);
    }
  }
  
  // Remove duplicates and return
  return Array.from(new Set(dates));
}

// Extract keywords from a filename
function extractKeywordsFromFileName(fileName: string): string[] {
  // Remove file extension
  const nameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
  
  // Replace separators with spaces
  const cleaned = nameWithoutExtension.replace(/[_\-\.]/g, ' ');
  
  // Split into words, convert to lowercase, and filter out short words and numbers
  const words = cleaned
    .split(/\s+/)
    .map(word => word.toLowerCase())
    .filter(word => {
      // Keep words longer than 2 chars that aren't just numbers
      return word.length > 2 && !/^\d+$/.test(word);
    });
  
  // Remove common stopwords
  const stopwords = ['the', 'and', 'for', 'with', 'from', 'this', 'that', 'will', 'have'];
  const filteredWords = words.filter(word => !stopwords.includes(word));
  
  // Remove duplicates and return
  return Array.from(new Set(filteredWords));
}

// Identify document type from filename
function identifyDocumentType(fileName: string): { type: string; subtype: string | null } {
  const lowerFileName = fileName.toLowerCase();
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Check for contract types
  if (lowerFileName.includes('contract') || lowerFileName.includes('agreement')) {
    // Identify contract subtypes
    if (lowerFileName.includes('service')) return { type: 'contract', subtype: 'service' };
    if (lowerFileName.includes('employ')) return { type: 'contract', subtype: 'employment' };
    if (lowerFileName.includes('nda') || lowerFileName.includes('non disclosure')) 
      return { type: 'contract', subtype: 'non-disclosure' };
    if (lowerFileName.includes('license')) return { type: 'contract', subtype: 'license' };
    if (lowerFileName.includes('lease')) return { type: 'contract', subtype: 'lease' };
    if (lowerFileName.includes('subscription')) return { type: 'contract', subtype: 'subscription' };
    if (lowerFileName.includes('purchase')) return { type: 'contract', subtype: 'purchase' };
    if (lowerFileName.includes('sale')) return { type: 'contract', subtype: 'sale' };
    
    return { type: 'contract', subtype: null };
  }
  
  // Check for other common document types
  if (lowerFileName.includes('invoice')) return { type: 'invoice', subtype: null };
  if (lowerFileName.includes('report')) return { type: 'report', subtype: null };
  if (lowerFileName.includes('proposal')) return { type: 'proposal', subtype: null };
  if (lowerFileName.includes('letter')) return { type: 'letter', subtype: null };
  if (lowerFileName.includes('memo')) return { type: 'memo', subtype: null };
  if (lowerFileName.includes('minutes')) return { type: 'minutes', subtype: null };
  if (lowerFileName.includes('policy')) return { type: 'policy', subtype: null };
  if (lowerFileName.includes('manual')) return { type: 'manual', subtype: null };
  if (lowerFileName.includes('guide')) return { type: 'guide', subtype: null };
  if (lowerFileName.includes('form')) return { type: 'form', subtype: null };
  
  // Check based on extension
  if (extension === 'pdf') return { type: 'document', subtype: 'PDF' };
  if (extension === 'docx' || extension === 'doc') return { type: 'document', subtype: 'Word' };
  if (extension === 'xlsx' || extension === 'xls') return { type: 'spreadsheet', subtype: 'Excel' };
  if (extension === 'pptx' || extension === 'ppt') return { type: 'presentation', subtype: 'PowerPoint' };
  if (extension === 'txt') return { type: 'text', subtype: null };
  
  // Default if no specific type is identified
  return { type: 'document', subtype: null };
}

// Extract potential party names from a filename
function extractPotentialParties(fileName: string): string[] {
  const parties: string[] = [];
  
  // Look for company names with common suffixes
  const companySuffixes = ['Inc', 'LLC', 'Ltd', 'Corp', 'Corporation', 'Co', 'Company', 'GmbH', 'AG'];
  
  for (const suffix of companySuffixes) {
    const regex = new RegExp(`\\b([A-Z][A-Za-z0-9]*(?:[\\s&-][A-Z][A-Za-z0-9]*)*)[\\s,.-]*${suffix}\\b`, 'g');
    const matches = fileName.match(regex) || [];
    parties.push(...matches);
  }
  
  // If no companies found, look for capitalized multi-word names
  if (parties.length === 0) {
    const namePattern = /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b/g;
    const matches = fileName.match(namePattern) || [];
    parties.push(...matches);
  }
  
  // Remove duplicates and return
  return Array.from(new Set(parties));
}

// Format file size in a human-readable format
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Detect possible languages based on filename
function detectPossibleLanguages(fileName: string): string[] {
  const lowerFileName = fileName.toLowerCase();
  const languages: string[] = [];
  
  // Check for common language markers
  if (lowerFileName.includes('_en') || lowerFileName.includes('-en') || 
      lowerFileName.includes('english') || lowerFileName.includes(' en ')) {
    languages.push('English');
  }
  if (lowerFileName.includes('_es') || lowerFileName.includes('-es') || 
      lowerFileName.includes('spanish') || lowerFileName.includes('español') || 
      lowerFileName.includes(' es ')) {
    languages.push('Spanish');
  }
  if (lowerFileName.includes('_fr') || lowerFileName.includes('-fr') || 
      lowerFileName.includes('french') || lowerFileName.includes('français') || 
      lowerFileName.includes(' fr ')) {
    languages.push('French');
  }
  if (lowerFileName.includes('_de') || lowerFileName.includes('-de') || 
      lowerFileName.includes('german') || lowerFileName.includes('deutsch') || 
      lowerFileName.includes(' de ')) {
    languages.push('German');
  }
  if (lowerFileName.includes('_it') || lowerFileName.includes('-it') || 
      lowerFileName.includes('italian') || lowerFileName.includes('italiano') || 
      lowerFileName.includes(' it ')) {
    languages.push('Italian');
  }
  
  // Default to English if no language markers found
  if (languages.length === 0) {
    languages.push('English');
  }
  
  return languages;
}

// Generate generic obligations based on contract type
function generateGenericObligations(contractType: string): string[] {
  const commonObligations = [
    'Parties must fulfill their obligations in good faith',
    'Maintain confidentiality of sensitive information',
    'Provide notices in writing as specified in the contract'
  ];
  
  const typeSpecificObligations: Record<string, string[]> = {
    'service': [
      'Provider must deliver services as specified',
      'Services must meet quality standards',
      'Client must provide necessary access and resources'
    ],
    'employment': [
      'Employee must perform duties as assigned',
      'Employer must pay compensation as agreed',
      'Employee must adhere to company policies'
    ],
    'non-disclosure': [
      'Recipient must protect confidential information',
      'Recipient must limit disclosure to authorized personnel',
      'Information must be returned upon request'
    ],
    'license': [
      'Licensee must use the property only as permitted',
      'Licensee must pay royalties as agreed',
      'Licensor must defend intellectual property rights'
    ],
    'lease': [
      'Tenant must pay rent by specified date',
      'Landlord must maintain the property',
      'Tenant must use property for intended purpose'
    ],
    'purchase': [
      'Seller must deliver goods as specified',
      'Buyer must pay the agreed price',
      'Goods must meet quality standards'
    ],
    'sale': [
      'Seller must transfer title to the buyer',
      'Buyer must complete payment',
      'Seller must disclose material defects'
    ],
    'subscription': [
      'Provider must maintain service availability',
      'Subscriber must pay recurring fees',
      'Provider must protect subscriber data'
    ]
  };
  
  return [
    ...(typeSpecificObligations[contractType] || []),
    ...commonObligations
  ].slice(0, 5);
}

// Generate generic rights based on contract type
function generateGenericRights(contractType: string): string[] {
  const commonRights = [
    'Right to terminate upon material breach',
    'Right to seek remedies for breach of contract',
    'Right to assign with consent of other party'
  ];
  
  const typeSpecificRights: Record<string, string[]> = {
    'service': [
      'Client right to reject unsatisfactory services',
      'Provider right to receive payment for completed services',
      'Right to modify service scope with mutual agreement'
    ],
    'employment': [
      'Employee right to receive agreed compensation',
      'Employer right to direct work activities',
      'Employee right to benefits as specified'
    ],
    'non-disclosure': [
      'Disclosing party right to injunctive relief',
      'Right to exclude publicly available information',
      'Right to disclose as required by law'
    ],
    'license': [
      'Licensor right to audit compliance',
      'Licensee right to use property as specified',
      'Right to renew under specified conditions'
    ],
    'lease': [
      'Landlord right to inspect the property',
      'Tenant right to quiet enjoyment',
      'Right to sublet with permission'
    ],
    'purchase': [
      'Buyer right to inspect goods before acceptance',
      'Seller right to receive full payment',
      'Right to renegotiate for changed conditions'
    ],
    'sale': [
      'Buyer right to receive goods as specified',
      'Seller right to receive payment',
      'Right to warranties as specified'
    ],
    'subscription': [
      'Subscriber right to access services',
      'Provider right to modify services with notice',
      'Right to cancel under specified conditions'
    ]
  };
  
  return [
    ...(typeSpecificRights[contractType] || []),
    ...commonRights
  ].slice(0, 5);
}