import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sasToken = process.env.NEXT_PUBLIC_AZURE_SAS_TOKEN;
    const containerName = process.env.NEXT_PUBLIC_AZURE_BLOB_CONTAINER_NAME || 'content';
    const storageAccountUrl = "https://stdka66scue7f4y.blob.core.windows.net";
    
    // Files to exclude from the listing
    const excludedFiles = [
      '537167_Contract - 31895 Part 1.pdf',
      '537167_Contract - 31895 Part 2.pdf',
      '537167_Contract - 31895 Part 3.pdf',
      '537167_Contract - 31895 Part 4.pdf',
      '537167_Contract - 31895 Part 5.pdf',
      '537167_Contract - 31895 Part 6.pdf',
      'A102_2017.pdf',
      'A201_2017.pdf',
      'Combined Agreement and GCs.pdf',
      'Construction-Contract-for-Major-Works.pdf',
      'DBIA 520-Preliminary-Agreement-between-Owner-and-Design-Builder.docx',
      'DBIA 535-General-Conditions-of-Contracts-2022.docx',
      'DFW DB Agreement 9500761_-_CTA_Expansion_Term 121621 JV EXEC Part 1.pdf',
      'DFW DB Agreement 9500761_-_CTA_Expansion_Term 121621 JV EXEC Part 2.pdf',
      'DFW DB Agreement 9500761_-_CTA_Expansion_Term 121621 JV EXEC Part 3.pdf',
      'DFW DB Agreement 9500761_-_CTA_Expansion_Term 121621 JV EXEC Part 4.pdf',
      'DFW DB Agreement 9500761_-_CTA_Expansion_Term 121621 JV EXEC Part 5.pdf',
      'LAX MATOC Austin_DBV_Contract Part 1.pdf',
      'LAX MATOC Austin_DBV_Contract Part 2.1.pdf',
      'LAX MATOC Austin_DBV_Contract Part 2.2.pdf',
      'LAX MATOC Austin_DBV_Contract Part 2.3.pdf',
      'LAX MATOC Austin_DBV_Contract Part 2.4.pdf',
      'LAX MATOC Austin_DBV_Contract Part 2.5.pdf',
      'LAX MATOC Austin_DBV_Contract Part 2.pdf',
      'LAX MATOC Austin_DBV_Contract Part 4.pdf',
      'LAX MATOC Austin_DBV_Contract Part 5.pdf',
      'MLIT_AGJV_Fully_Executed_Contract_9181d03c.txt',
      'Sample Work Order and Addendum - MLIT Project.pdf'
    ];

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
        'x-ms-version': '2021-12-02',
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
    const allFileNames = matches.map(match => match[1]);
    
    // Filter out the excluded files
    const filteredFiles = allFileNames.filter(file => !excludedFiles.includes(file));
    
    return NextResponse.json(filteredFiles);
  } catch (error) {
    console.error('Error listing blob files:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}