import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sasToken = process.env.NEXT_PUBLIC_AZURE_SAS_TOKEN;
    const containerName = process.env.NEXT_PUBLIC_AZURE_BLOB_CONTAINER_NAME || 'content';
    const storageAccountUrl = "https://stdka66scue7f4y.blob.core.windows.net";

    if (!sasToken) {
      return NextResponse.json(
        { error: 'Missing Azure SAS token' },
        { status: 500 }
      );
    }

    const listUrl = `${storageAccountUrl}/${containerName}?restype=container&comp=list&${sasToken}`;

    const response = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'x-ms-version': '2021-12-02', // Optional, but may help for compatibility
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Azure error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Azure error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const xmlText = await response.text();
    const matches = [...xmlText.matchAll(/<Name>(.*?)<\/Name>/g)];
    const fileNames = matches.map(match => match[1]);

    return NextResponse.json(fileNames);
  } catch (error) {
    console.error('Error listing blob files:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
