import { NextRequest, NextResponse } from 'next/server';
import documentCacheService from '@/services/documentCache';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import PDFParser from 'pdf2json';
import * as mammoth from 'mammoth';

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

function detectContentType(content: string): { isBinary: boolean; fileType: string | null } {
  if (content.startsWith('PK') || content.includes('[Content_Types]') || content.includes('word/document.xml')) {
    return { isBinary: true, fileType: 'docx' };
  }
  if (content.startsWith('%PDF') || content.includes('%PDF-')) {
    return { isBinary: true, fileType: 'pdf' };
  }
  return { isBinary: false, fileType: null };
}

// ✅ Correct handler signature
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ message: 'Document ID is required' }, { status: 400 });
    }

    const document = await documentCacheService.getDocument(id);
    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    let content = '';

    if (document.metadata.chunked) {
      const fullContent = await documentCacheService.getFullDocumentContent(id);
      content = fullContent || document.content.content;
    } else {
      content = document.content.content;
    }

    const { isBinary, fileType } = detectContentType(content);

    if (isBinary) {
      try {
        let extractedText = '';
        const buffer = Buffer.from(content, 'binary');

        if (fileType === 'pdf') {
          const tempFilePath = await createTempFile(buffer, '.pdf');
          try {
            extractedText = await readPDFWithStream(tempFilePath);
          } finally {
            try {
              await fs.unlink(tempFilePath);
            } catch (err) {
              console.error('Error removing temp PDF file:', err);
            }
          }
        } else if (fileType === 'docx') {
          try {
            const result = await mammoth.extractRawText({ buffer });
            extractedText = result.value;
          } catch (err) {
            console.error('Error extracting text from DOCX:', err);
            extractedText = "Failed to extract text from this document format.";
          }
        }

        content = extractedText || "This document appears to be in a binary format that couldn't be parsed properly.";
      } catch (error) {
        console.error('Error processing binary content:', error);
        content = "Error: Could not process this document format.";
      }
    }

    return NextResponse.json({
      content,
      isChunked: document.metadata.chunked || false,
      totalChunks: document.metadata.totalChunks || 0,
      isBinary,
      fileType
    });
  } catch (error) {
    console.error('Error fetching document content:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
