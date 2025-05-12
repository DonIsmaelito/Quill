import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), '..', '..', 'uploads');

// Add CORS headers to response
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    const filename = searchParams.get('filename');

    if (mode === 'preview' || mode === 'download') {
      if (!filename) {
        return addCorsHeaders(NextResponse.json({ error: 'No filename provided' }, { status: 400 }));
      }

      const filePath = path.join(UPLOADS_DIR, filename);
      try {
        await fs.access(filePath);
      } catch {
        return addCorsHeaders(NextResponse.json({ error: 'File not found' }, { status: 404 }));
      }

      const fileBuffer = await fs.readFile(filePath);
      const headers = new Headers();
      
      if (mode === 'preview') {
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', 'inline');
      } else {
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      }

      // Add CORS headers
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');

      return new NextResponse(fileBuffer, { headers });
    }

    // List documents
    try {
      await fs.access(UPLOADS_DIR);
    } catch {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
    }

    const files = await fs.readdir(UPLOADS_DIR);
    
    // Filter out temporary files and hidden files
    const documents = files
      .filter(file => 
        !file.startsWith('temp_') && 
        !file.startsWith('.') &&
        file.toLowerCase().endsWith('.pdf')
      )
      .map((name, index) => ({
        id: Date.now() + index,
        name,
        type: 'Document'
      }));

    return addCorsHeaders(NextResponse.json(documents));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error handling document request:', errorMessage);
    return addCorsHeaders(NextResponse.json(
      { error: 'Failed to process document request', details: errorMessage },
      { status: 500 }
    ));
  }
}