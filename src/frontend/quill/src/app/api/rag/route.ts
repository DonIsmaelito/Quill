import { exec } from 'child_process';
import { promisify } from 'util';
import { NextResponse } from 'next/server';
import os from 'os';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs/promises';

const execPromise = promisify(exec);

// Add new interfaces
interface FormFieldValue {
  id: string;
  label: string;
  value: any;
}

interface UserInfo {
  [key: string]: any;
}

// Add new file paths
const USER_INFO_PATH = path.join('..', '..', 'uploads', 'user_info.json');
const FORM_VALUES_PATH = path.join('..', '..', 'uploads', 'form_values.json');

// Add helper functions for managing user info and form values
async function loadUserInfo(): Promise<UserInfo> {
  try {
    const data = await fs.readFile(USER_INFO_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error: unknown) {
    console.log('No existing user info found, starting fresh');
    return {};
  }
}

async function saveUserInfo(info: UserInfo): Promise<void> {
  await fs.writeFile(USER_INFO_PATH, JSON.stringify(info, null, 2));
}

async function loadFormValues(): Promise<FormFieldValue[]> {
  try {
    const data = await fs.readFile(FORM_VALUES_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error: unknown) {
    console.log('No existing form values found, starting fresh');
    return [];
  }
}

async function saveFormValues(values: FormFieldValue[]): Promise<void> {
  await fs.writeFile(FORM_VALUES_PATH, JSON.stringify(values, null, 2));
}

async function saveUploadedFile(file: Buffer, fileName: string): Promise<string> {
  try {
    const uploadsDir = path.join('..', '..', 'uploads');
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    await writeFile(filePath, file);
    console.log('File saved successfully at:', filePath);
    return filePath;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
}

async function runPythonScript(scriptPath: string, args: string[]) {
  const isWindows = os.platform() === 'win32';
  const condaEnv = 'quill';

  const quotedArgs = args.map(arg => {
    if (arg.includes(' ') || arg.includes('"') || arg.includes("'") || arg.includes('{')) {
      const escapedArg = arg.replace(/"/g, '\\"');
      return `"${escapedArg}"`;
    }
    return arg;
  }).join(' ');

  let command;
  if (isWindows) {
    command = `python "${scriptPath}" ${quotedArgs}`;
  } else {
    command = `python3 "${scriptPath}" ${quotedArgs}`;
  }
  
  console.log('Executing command:', command);
  
  try {
    const result = await execPromise(command);
    console.log('Python script stdout:', result.stdout);
    if (result.stderr) {
      console.log('Python script stderr:', result.stderr);
    }
    return result;
  } catch (error) {
    console.error('Error running Python script:', error);
    throw error;
  }
}

/**
 * Simple sentiment classifier to detect if a message is requesting an update to user information
 * @param message The user's message
 * @returns Boolean indicating if this is an update request
 */
function isUpdateRequest(message: string): boolean {
  // convert to lowercase for easier matching
  const lowerMessage = message.toLowerCase();

  console.log('Checking if message is an update request:', lowerMessage);
  
  // keywords and phrases that suggest the user wants to update their info
  const updateKeywords = [
    'update', 'change', 'modify', 'correct', 'fix', 'edit',
    'wrong', 'incorrect', 'mistake', 'error', 'not right', 'is not',
    'instead of', 'should be', 'actually', 'instead',
    'my real', 'my actual', 'my correct', 'add', 'remove'
  ];
  
  // information types that might be updated
  const infoTypes = [
    'name', 'address', 'phone', 'email', 'number', 'info', 'information',
    'birth', 'date', 'ssn', 'social', 'id', 'identifier', 'password',
    'contact', 'details', 'data', 'profile', 'record'
  ];
  
  // check for direct update requests
  for (const keyword of updateKeywords) {
    // check for keyword with space on either side
    if (lowerMessage.includes(` ${keyword} `)) {
      console.log('Found update keyword:', keyword);
      for (const infoType of infoTypes) {
        if (lowerMessage.includes(infoType)) {
          return true;
        }
      }
      
      // Even without specific info type, these strongly suggest updates
      if (keyword === 'update' || 
          keyword === 'change' || 
          keyword === 'modify' || 
          keyword === 'fix' || 
          keyword === 'correct') {
        return true;
      }
    }
  }
  
  // Check for correction patterns
  if (lowerMessage.includes('not') && lowerMessage.includes('but')) {
    console.log('Found not/but pattern');
    return true;
  }
  
  if (lowerMessage.includes('it\'s') || lowerMessage.includes('its') || 
      lowerMessage.includes('should be') || lowerMessage.includes('is actually')) {
        console.log('Found it\'s/its pattern');
    return true;
  }
  
  // Default to false - assume query if no update indicators found
  return false;
}

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

export async function POST(request: Request) {
  try {
    console.log('Starting POST request processing');
    const formData = await request.formData();
    const mode = formData.get('mode');
    console.log('Request mode:', mode);

    const ragScriptPath = path.join('..', '..', 'rag_v4', 'quill_rag_v4.py');
    const writePdfScriptPath = path.join('..', '..', 'document_creation', 'write_pdf.py');
    
    try {
      await fs.access(ragScriptPath);
      console.log('RAG script found at:', ragScriptPath);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('RAG script not found:', errorMessage);
      return addCorsHeaders(NextResponse.json(
        { error: 'RAG script not found', details: errorMessage },
        { status: 500 }
      ));
    }

    if (mode === 'ingest') {
      const file = formData.get('file') as File;
      if (!file) {
        return addCorsHeaders(NextResponse.json({ error: 'No file provided' }, { status: 400 }));
      }

      console.log('Processing file:', file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = await saveUploadedFile(buffer, file.name);

      console.log('About to run ingestion script with file:', filePath);

      const { stdout } = await runPythonScript(
        ragScriptPath,
        ['--mode', 'ingest', '--document', filePath]
      );

      console.log('Ingestion script output:', stdout);

      try {
        const result = JSON.parse(stdout);
        return addCorsHeaders(NextResponse.json(result));
      } catch {
        return addCorsHeaders(NextResponse.json({ 
          message: 'Document processed successfully',
          details: stdout 
        }));
      }
    } 
    else if (mode === 'query') {
      const message = formData.get('message') as string;
      const documentName = formData.get('documentName') as string;
      const chatHistory = formData.get('chatHistory') as string;
      const formFields = formData.get('formFields') as string;

      if (!message || !documentName) {
        return addCorsHeaders(NextResponse.json({ 
          error: 'Message and document name are required' 
        }, { status: 400 }));
      }
      
      // Determine if this is an update request or a regular query
      // const isUpdate = isUpdateRequest(message);
      const isUpdate = false; // For now, do not handle update requests, just go straight through query mechanism (for demo, later we want to use full RAG functionality and the whole quill_rag_v4 API).
      const scriptMode = isUpdate ? 'update' : 'query';
      console.log(`Message classified as ${scriptMode} request:`, message);
      
      // Set up the base arguments
      const args = [
        '--mode', scriptMode
      ];
      
      // Both modes need the question/message
      args.push('--question', message);
      
      // Add chat history for context if available
      if (chatHistory) {
        const tempChatHistoryPath = path.join('..', '..', 'uploads', 'temp_chat_history.json');
        await writeFile(tempChatHistoryPath, chatHistory);
        args.push('--chat-history', tempChatHistoryPath);
      }

      if (formFields) {
        args.push('--form-fields', formFields);
      }

      const { stdout } = await runPythonScript(ragScriptPath, args);

      try {
        const result = JSON.parse(stdout);
        if (scriptMode === 'update') {
          return addCorsHeaders(NextResponse.json({
            content: `I've updated your information. ${result.message || ''}`,
            wasUpdate: true,
            ...result
          }));
        } else {
          return addCorsHeaders(NextResponse.json({ content: result.response }));
        }
      } catch {
        if (scriptMode === 'update') {
          return addCorsHeaders(NextResponse.json({ 
            content: 'I\'ve updated your information based on your message.',
            wasUpdate: true,
            details: stdout
          }));
        } else {
          return addCorsHeaders(NextResponse.json({ content: stdout.trim() }));
        }
      }
    } 
    else if (mode === 'blank') {
      const file = formData.get('file') as File;
      // const jsonString = formData.get('jsonString') as string;
    
      console.log('Processing blank form:', file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = await saveUploadedFile(buffer, file.name);
    
      const sample_json = '{ "Employee social security number": "000-11-2222", \
      "Employer identification number": "999-888-777", \
      "Wages, tips, other compensation": "64000" }'
    
      const questionPrompt = `You are a helpful, form-filling assistant. The user will provide you with an image of a blank or partially-filled form. For each field, your task is to generate the answer to the question, 'What is the value of the field?' and add the field label and its answer as a key-value pair to a .JSON file. If the answer to the field is not already in the form, check if you can find the answer in the chat history. Here is an example response: ${sample_json} ONLY RESPOND WITH THE OUTPUT OF A .JSON FILE WITH NO ADDITIONAL TEXT`;
    
      const fields = await runPythonScript(
        ragScriptPath,
        ['--mode', 'query', '--document', filePath, '--question', questionPrompt]);
    
      let jsonString = fields.stdout;
      console.log('Raw JSON string:', jsonString);
      
      // Parse the JSON string if it's in the {"response": "..."} format
      try {
        const parsedOutput = JSON.parse(jsonString);
        if (parsedOutput.response) {
          // Extract the inner JSON string
          jsonString = parsedOutput.response;
          
          // If the inner string is escaped JSON, parse it again to clean it up
          try {
            const innerJson = JSON.parse(jsonString);
            jsonString = JSON.stringify(innerJson);
          } catch (e) {
            // If we can't parse it as JSON, just use it as is
            console.log('Using response string directly');
          }
        }
      } catch (e) {
        console.log('Output is not in {"response": "..."} format, using as is');
      }
      
      console.log('Processed JSON string:', jsonString);
      
      // Create a temporary JSON file for the filled form data
      const jsonFilePath = path.join('..', '..', 'uploads', 'temp_form_data.json');
      await fs.writeFile(jsonFilePath, jsonString);
      
      const { stdout } = await runPythonScript(
        writePdfScriptPath,
        [filePath, jsonFilePath]
      );
    
      // Get the filled PDF path - it should be the same as original but with "_filled.pdf" suffix
      const outputPath = filePath.replace(/\.[^/.]+$/, '') + '_filled.pdf';
      console.log('Filled form saved at:', outputPath);
      
      try {
        const result = JSON.parse(stdout);
        return addCorsHeaders(NextResponse.json({
          message: 'Blank form processed successfully',
          details: stdout,
          filledFormPath: outputPath
        }));
      } catch {
        return addCorsHeaders(NextResponse.json({ 
          message: 'Blank form processed successfully',
          details: stdout,
          filledFormPath: outputPath
        }));
      }
    }
    else if (mode === 'update-form-values') {
      const values = formData.get('values') as string;
      if (!values) {
        return addCorsHeaders(NextResponse.json({ error: 'No form values provided' }, { status: 400 }));
      }

      try {
        const formValues = JSON.parse(values);
        await saveFormValues(formValues);
        return addCorsHeaders(NextResponse.json({ 
          message: 'Form values updated successfully',
          values: formValues
        }));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return addCorsHeaders(NextResponse.json({ 
          error: 'Invalid form values format',
          details: errorMessage 
        }, { status: 400 }));
      }
    }
    else if (mode === 'get-form-values') {
      try {
        const values = await loadFormValues();
        return addCorsHeaders(NextResponse.json({ values }));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return addCorsHeaders(NextResponse.json({ 
          error: 'Failed to load form values',
          details: errorMessage 
        }, { status: 500 }));
      }
    }
    else if (mode === 'update-user-info') {
      const info = formData.get('info') as string;
      if (!info) {
        return addCorsHeaders(NextResponse.json({ error: 'No user info provided' }, { status: 400 }));
      }

      try {
        const userInfo = JSON.parse(info);
        await saveUserInfo(userInfo);
        return addCorsHeaders(NextResponse.json({ 
          message: 'User info updated successfully',
          info: userInfo
        }));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return addCorsHeaders(NextResponse.json({ 
          error: 'Invalid user info format',
          details: errorMessage 
        }, { status: 400 }));
      }
    }
    else if (mode === 'get-user-info') {
      try {
        const info = await loadUserInfo();
        return addCorsHeaders(NextResponse.json({ info }));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return addCorsHeaders(NextResponse.json({ 
          error: 'Failed to load user info',
          details: errorMessage 
        }, { status: 500 }));
      }
    }

    return addCorsHeaders(NextResponse.json({ error: 'Invalid mode' }, { status: 400 }));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Route error:', errorMessage);
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Failed to process request',
        details: errorMessage,
      },
      { status: 500 }
    ));
  }
}