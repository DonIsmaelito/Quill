import { NextResponse } from 'next/server';
import { ragService } from '@/services/ragService';
import type { NextRequest } from 'next/server';

// CORS middleware
export async function middleware(request: NextRequest) {
  // Get the origin from the request headers
  const origin = request.headers.get('origin') || 'http://localhost:5173';

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  return NextResponse.next();
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || 'http://localhost:5173';

  try {
    const formData = await request.formData();
    const mode = formData.get('mode') as string;
    const message = formData.get('message') as string;
    const documentName = formData.get('documentName') as string;
    const chatHistory = formData.get('chatHistory') as string;
    const formFields = formData.get('formFields') as string;

    let response;
    switch (mode) {
      case 'query':
        response = await ragService.processUserMessage(
          message,
          formFields ? JSON.parse(formFields) : undefined
        );
        break;
      // ... rest of the cases ...
    }

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error in RAG API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
} 