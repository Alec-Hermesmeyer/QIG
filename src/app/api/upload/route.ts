// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Get SAS token and storage account info from environment variables
    const sasToken = process.env.NEXT_PUBLIC_AZURE_SAS_TOKEN;
    const containerName = process.env.NEXT_PUBLIC_AZURE_BLOB_CONTAINER_NAME || 'content';
    const storageAccountUrl = "https://stdka66scue7f4y.blob.core.windows.net";

    if (!sasToken) {
      return NextResponse.json(
        { error: 'Missing Azure SAS token' },
        { status: 500 }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get file details
    const fileType = file.type;
    const fileSize = file.size;
    let fileName = file.name;

    // Validate file size (15MB max)
    const maxSize = 15 * 1024 * 1024; // 15MB in bytes
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: 'File too large', details: 'Maximum file size is 15MB' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'text/plain', // txt
      'application/pdf', // pdf
    ];
    
    if (!allowedTypes.includes(fileType) && !fileName.endsWith('.docx') && !fileName.endsWith('.txt') && !fileName.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Unsupported file type', details: 'Only DOCX, TXT, and PDF files are supported' },
        { status: 400 }
      );
    }

    // Sanitize file name
    // - Replace spaces with underscores
    // - Remove special characters
    // - Add a unique identifier to avoid overwrites
    const fileExt = fileName.substring(fileName.lastIndexOf('.'));
    const fileNameBase = fileName.substring(0, fileName.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_{2,}/g, '_');
    const uniqueId = uuidv4().substring(0, 8);
    fileName = `${fileNameBase}_${uniqueId}${fileExt}`;

    // Convert file to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create the URL for uploading
    const blobUrl = `${storageAccountUrl}/${containerName}/${fileName}?${sasToken.replace('?', '')}`;

    // Upload to Azure Blob Storage
    const uploadResponse = await fetch(blobUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': fileType,
        'x-ms-version': '2021-12-02',
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(`Azure upload error: ${uploadResponse.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Azure upload error: ${uploadResponse.status}`, details: errorText },
        { status: uploadResponse.status }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      fileName: fileName,
      originalName: file.name,
      size: fileSize,
      type: fileType,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Configure request size limit
export const config = {
  api: {
    bodyParser: false, // This is handled by formData
    responseLimit: false, // No limit on the response size
  },
};