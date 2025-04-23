import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;
    
    if (!text) {
      return NextResponse.json(
        { message: 'Text is required' },
        { status: 400 }
      );
    }
    
    // Generate embedding for the text
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small", // Or text-embedding-ada-002 for older models
      input: text,
      encoding_format: "float"
    });
    
    if (!response.data || response.data.length === 0) {
      return NextResponse.json(
        { message: 'Failed to generate embedding' },
        { status: 500 }
      );
    }
    
    // Return the embedding
    return NextResponse.json({
      embedding: response.data[0].embedding
    });
  } catch (error) {
    console.error('Error generating embedding:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}