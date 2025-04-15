import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json(
      { error: 'Bad Request', details: 'Filename is required' },
      { status: 400 }
    );
  }

  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/content/${encodeURIComponent(filename)}`;

  try {
    const backendResponse = await fetch(backendUrl);

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: 'Backend Error', details: `Status ${backendResponse.status}: ${backendResponse.statusText}` },
        { status: backendResponse.status }
      );
    }

    const contentType = backendResponse.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = backendResponse.headers.get('content-disposition');

    const arrayBuffer = await backendResponse.arrayBuffer();
    const response = new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ...(contentDisposition ? { 'Content-Disposition': contentDisposition } : {}),
      },
    });

    return response;
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy Error', details: error.message },
      { status: 500 }
    );
  }
}
