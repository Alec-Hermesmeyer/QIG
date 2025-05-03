// app/api/groundx/buckets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GroundXClient } from "groundx";

// Initialize client
const groundxClient = new GroundXClient({
  apiKey: process.env.GROUNDX_API_KEY!,
});

// Define a proper interface for the bucket data we need
interface ProcessedBucket {
  id: number | string;
  name: string;
  documentCount: number;
}

export async function GET() {
  try {
    // Using list method as in your example
    const response = await groundxClient.buckets.list();
    console.log('Raw GroundX response:', JSON.stringify(response));

    // Check if response has buckets and it's an array
    if (!response || !response.buckets || !Array.isArray(response.buckets)) {
      console.error('Invalid response structure from GroundX:', response);
      return NextResponse.json(
        { success: false, error: 'Invalid response structure from GroundX API' },
        { status: 500 }
      );
    }

    // Find only the Austin Industries bucket
    const austinBucket = response.buckets.find(bucket => {
      const bucketAny = bucket as any;
      const name = bucketAny.name || bucketAny.title || bucketAny.bucketName || '';
      return name.includes('Austin Industries');
    });

    if (!austinBucket) {
      return NextResponse.json({
        success: true,
        buckets: [],
        message: 'Austin Industries bucket not found'
      });
    }

    // Process the Austin Industries bucket
    const bucketAny = austinBucket as any;
    const processedBucket: ProcessedBucket = {
      id: bucketAny.bucket_id || bucketAny.bucketId || bucketAny.id ||
          bucketAny.bId || `unknown-${Math.random().toString(36).substr(2, 9)}`,
      name: bucketAny.name || bucketAny.title || bucketAny.bucketName ||
          `Bucket ${bucketAny.bucket_id || bucketAny.id || 'Unknown'}`,
      documentCount: typeof bucketAny.documentCount === 'number' ? bucketAny.documentCount :
          typeof bucketAny.count === 'number' ? bucketAny.count :
          typeof bucketAny.documents === 'number' ? bucketAny.documents : 0
    };

    return NextResponse.json({
      success: true,
      buckets: [processedBucket],
      rawBucket: austinBucket // Include raw data for debugging
    });
  } catch (error: any) {
    console.error('Error listing buckets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}