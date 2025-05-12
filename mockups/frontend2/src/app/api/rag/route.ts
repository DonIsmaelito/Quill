import { NextResponse } from 'next/server';
import { ragService } from '@/services/ragService';

export async function POST(request: Request) {
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
        response = await ragService.answerQuery(
          message,
          documentName,
          chatHistory,
          formFields ? JSON.parse(formFields) : undefined
        );
        break;
      // ... rest of the cases ...
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in RAG API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 