import { NextRequest, NextResponse } from 'next/server';
import * as mammoth from 'mammoth';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import PDFParser from 'pdf2json';
import documentCacheService from '@/services/documentCache';
import { OpenAI } from 'openai';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

async function createTempFile(buffer: Buffer, extension: string): Promise<string> {
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `temp-${Date.now()}${extension}`);
  await fs.writeFile(tempFilePath, buffer);
  return tempFilePath;
}

async function readPDFWithStream(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1 as any);
    pdfParser.on("pdfParser_dataError", (errData: Record<"parserError", Error>) => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", () => {
      try {
        resolve(pdfParser.getRawTextContent());
      } catch (error) {
        reject(error);
      }
    });
    pdfParser.loadPDF(filePath);
  });
}

async function readDocx(fileBuffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  return result.value;
}

function chunkTextForEmbeddings(text: string, maxChunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let chunkEnd = Math.min(i + maxChunkSize, text.length);
    if (chunkEnd < text.length) {
      const nextBreak = text.substring(i, chunkEnd + 100).search(/[.!?]\s/);
      if (nextBreak !== -1 && nextBreak < maxChunkSize + 100) {
        chunkEnd = i + nextBreak + 2;
      }
    }
    chunks.push(text.substring(i, chunkEnd));
    i = chunkEnd - overlap;
  }
  return chunks;
}

async function generateChunkEmbeddings(chunks: string[]): Promise<{ text: string; embedding: number[] }[]> {
  try {
    const batchSize = 20;
    const embeddingResults: { text: string; embedding: number[] }[] = [];
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);
      try {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: batchChunks,
          encoding_format: "float"
        });
        for (let j = 0; j < batchChunks.length; j++) {
          embeddingResults.push({
            text: batchChunks[j],
            embedding: response.data[j].embedding
          });
        }
      } catch (error) {
        console.error(`Embedding error in batch ${i}-${i + batchSize}:`, error);
        batchChunks.forEach(chunk => {
          embeddingResults.push({ text: chunk, embedding: [] });
        });
      }
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    return embeddingResults;
  } catch (error) {
    console.error('Embedding generation error:', error);
    return chunks.map(chunk => ({ text: chunk, embedding: [] }));
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      let text = '';
      const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' :
                       file.name.toLowerCase().endsWith('.docx') ? 'docx' :
                       file.name.toLowerCase().endsWith('.doc') ? 'doc' : 'unknown';

      if (fileType === 'pdf') {
        const tempFilePath = await createTempFile(buffer, '.pdf');
        try {
          text = await readPDFWithStream(tempFilePath);
        } finally {
          try { await fs.unlink(tempFilePath); } catch (cleanupError) {
            console.error('Error removing temp file:', cleanupError);
          }
        }
      } else if (fileType === 'docx' || fileType === 'doc') {
        text = await readDocx(buffer);
      } else {
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
      }

      const analysisResult = await analyzeText(text);

      if (analysisResult.success && analysisResult.analysis) {
        const { analysis } = analysisResult;
        const chunks = chunkTextForEmbeddings(text);
        const embeddedChunks = await generateChunkEmbeddings(chunks);
        const metadata = await documentCacheService.storeDocumentWithEmbeddings(
          file.name,
          fileType,
          text,
          analysis.summary,
          analysis.wordCount,
          analysis.tokenCount,
          embeddedChunks
        );
        if (metadata) analysis.documentId = metadata.id;
      }

      return NextResponse.json(analysisResult);
    } else {
      const body = await req.json();
      const input = body.input as string;
      const analysisResult = await analyzeText(input);

      if (analysisResult.success && analysisResult.analysis) {
        const { analysis } = analysisResult;
        const chunks = chunkTextForEmbeddings(input);
        const embeddedChunks = await generateChunkEmbeddings(chunks);
        const metadata = await documentCacheService.storeDocumentWithEmbeddings(
          'text-input.txt',
          'txt',
          input,
          analysis.summary,
          analysis.wordCount,
          analysis.tokenCount,
          embeddedChunks
        );
        if (metadata) analysis.documentId = metadata.id;
      }

      return NextResponse.json(analysisResult);
    }
  } catch (error) {
    console.error('POST handler error:', error);
    return NextResponse.json({
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function analyzeText(input: string) {
  try {
    if (!input || typeof input !== 'string') {
      throw new Error('Input must be a valid string.');
    }

    const tokenCount = estimateTokenCount(input);
    const wordCount = input.split(/\s+/).filter(Boolean).length;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional document analyzer. Analyze the document provided and create a comprehensive summary with the following guidelines:

1. Use markdown formatting to structure your response
2. Include headings (## and ###) to organize information
3. Use bullet points or numbered lists where appropriate
4. Bold (**text**) important terms, names, and key figures
5. Structure your analysis with the following sections:
   - Executive Summary
   - Key Parties and Entities
   - Main Components
   - Critical Points
   - Implications

Ensure your summary is clear and structured.`
          },
          {
            role: 'user',
            content: input.length > 25000 ? input.slice(0, 25000) + '...(document truncated for length)' : input
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || 'No summary returned.';
    const inputTokensUsed = data.usage?.prompt_tokens || tokenCount;
    const outputTokensUsed = data.usage?.completion_tokens || estimateTokenCount(output);
    const totalTokensUsed = data.usage?.total_tokens || (inputTokensUsed + outputTokensUsed);

    return {
      success: true,
      analysis: {
        wordCount,
        tokenCount,
        summary: output.trim(),
        usage: {
          inputTokens: inputTokensUsed,
          outputTokens: outputTokensUsed,
          totalTokens: totalTokensUsed
        },
        documentId: undefined as string | undefined,
      },
    };
  } catch (err: unknown) {
    console.error('AnalyzeText Error:', err);
    return {
      success: false,
      error: 'Failed to analyze text.',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
