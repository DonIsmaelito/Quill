import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const FORM_VALUES_PATH = path.join(process.cwd(), '..', '..', 'uploads', 'form_values.json');

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

export async function GET() {
  try {
    // Read the file
    const fileContent = await fs.readFile(FORM_VALUES_PATH, 'utf-8');
    
    // Parse the JSON content
    const formValues = JSON.parse(fileContent);
    
    // Return the data with CORS headers
    return addCorsHeaders(NextResponse.json({ values: formValues }));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error reading form values:', errorMessage);
    return addCorsHeaders(NextResponse.json(
      { error: 'Failed to read form values', details: errorMessage },
      { status: 500 }
    ));
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const values = formData.get('values') as string;

    if (!values) {
      return addCorsHeaders(NextResponse.json({ error: 'No form values provided' }, { status: 400 }));
    }

    const formValues = JSON.parse(values);
    await fs.writeFile(FORM_VALUES_PATH, JSON.stringify(formValues, null, 2));

    return addCorsHeaders(NextResponse.json({ 
      message: 'Form values updated successfully',
      values: formValues
    }));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating form values:', errorMessage);
    return addCorsHeaders(NextResponse.json({ 
      error: 'Failed to update form values',
      details: errorMessage 
    }, { status: 500 }));
  }
} 