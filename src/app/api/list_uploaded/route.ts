import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sasToken = process.env.NEXT_PUBLIC_AZURE_SAS_TOKEN;
    const containerName = process.env.NEXT_PUBLIC_AZURE_BLOB_CONTAINER_NAME || 'content';
    const storageAccountUrl = "https://stdka66scue7f4y.blob.core.windows.net";
    
    // Define the specific files we want to return
    const specificFiles = [
      'MLIT AGJV Fully Executed Contract.pdf',
      'timeline_analysis_report.pdf',
      'MLIT_Deviation_Report.pdf',
      'contract_gap_analysis_report.pdf',
      'contract_obligation_analysis_report.pdf',
      'construction_financial_report.pdf'
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
    const allFileNames = matches.map(match => match[1]);
    
    // Filter the file list to only include our specific files
    // This ensures we only return files that exist in the container
    const filteredFiles = allFileNames.filter(file => specificFiles.includes(file));
    
    // If no specific files were found, provide feedback
    if (filteredFiles.length === 0) {
      console.warn('None of the specified files were found in the container');
    } else if (filteredFiles.length < specificFiles.length) {
      console.warn(`Only ${filteredFiles.length} of ${specificFiles.length} specified files were found`);
    }
    
    return NextResponse.json(filteredFiles);
  } catch (error) {
    console.error('Error listing blob files:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}