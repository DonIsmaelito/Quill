import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const USER_INFO_PATH = path.join(process.cwd(), '..', '..', 'uploads', 'user_info.json');

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
    const fileContent = await fs.readFile(USER_INFO_PATH, 'utf-8');
    
    // Parse the JSON content
    const userInfo = JSON.parse(fileContent);
    
    // Return the data with CORS headers
    return addCorsHeaders(NextResponse.json({ info: userInfo }));
  } catch (error: unknown) {
    console.error('Error reading user_info.json:', error);
    return addCorsHeaders(NextResponse.json(
      { error: 'Failed to read user info' },
      { status: 500 }
    ));
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const info = formData.get('info') as string;

    if (!info) {
      return addCorsHeaders(NextResponse.json({ error: 'No user info provided' }, { status: 400 }));
    }

    const userInfo = JSON.parse(info);
    await fs.writeFile(USER_INFO_PATH, JSON.stringify(userInfo, null, 2));

    return addCorsHeaders(NextResponse.json({ 
      message: 'User info updated successfully',
      info: userInfo
    }));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating user info:', errorMessage);
    return addCorsHeaders(NextResponse.json({ 
      error: 'Failed to update user info',
      details: errorMessage 
    }, { status: 500 }));
  }
}