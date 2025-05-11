import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from '@langchain/core/documents';
import { OLLAMA_CONFIG } from '../config/ollama';

interface FormField {
  id: string;
  label: string;
  type: string;
  required?: boolean;
}

interface FormFieldValue {
  id: string;
  label: string;
  value: any;
}

interface UserInfo {
  [key: string]: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

class RAGService {
  private llm: ChatOllama;
  private embeddings: OllamaEmbeddings;
  private vectorDb: Chroma | null = null;
  private userInfo: UserInfo = {};
  private formFieldValues: FormFieldValue[] = [];
  private conversationHistory: Message[] = [];

  constructor() {
    this.llm = new ChatOllama({
      baseUrl: OLLAMA_CONFIG.baseUrl,
      model: OLLAMA_CONFIG.models.llm,
      temperature: OLLAMA_CONFIG.temperature,
    });
    this.embeddings = new OllamaEmbeddings({
      baseUrl: OLLAMA_CONFIG.baseUrl,
      model: OLLAMA_CONFIG.models.embeddings,
    });
  }

  updateFormFieldValues(values: FormFieldValue[]): void {
    this.formFieldValues = values;
  }

  private async verifyOllamaConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama server returned ${response.status}`);
      }
      const data = await response.json();
      const models = data.models || [];
      const hasModel = models.some((m: any) => m.name === OLLAMA_CONFIG.models.llm);
      if (!hasModel) {
        console.error(`Model ${OLLAMA_CONFIG.models.llm} not found. Available models:`, models.map((m: any) => m.name));
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to connect to Ollama server:', error);
      return false;
    }
  }

  async processDocument(file: File): Promise<void> {
    try {
      if (!await this.verifyOllamaConnection()) {
        throw new Error('Ollama server is not available or model is not found');
      }

      // Convert file to text (simplified for now - would need proper file handling)
      const text = await this.readFileAsText(file);
      
      // Split text into chunks
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: OLLAMA_CONFIG.chunkSize,
        chunkOverlap: OLLAMA_CONFIG.chunkOverlap,
      });
      const chunks = await splitter.createDocuments([text]);

      // Create or update vector store
      if (!this.vectorDb) {
        this.vectorDb = await Chroma.fromDocuments(chunks, this.embeddings, {
          collectionName: 'user_documents',
          url: 'http://localhost:8000'
        });
      } else {
        await this.vectorDb.addDocuments(chunks);
      }

      // Extract information from document
      const extractedInfo = await this.extractInformation(text);
      this.updateUserInfo(extractedInfo);

      // Add document processing to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: 'I\'ve processed your document and extracted the relevant information.',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  async processUserMessage(message: string): Promise<string> {
    try {
      if (!await this.verifyOllamaConnection()) {
        throw new Error('Ollama server is not available or model is not found');
      }

      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      const prompt = this.createPrompt(message);
      const response = await this.llm.invoke(prompt);
      const responseContent = response.content.toString();

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      });

      return responseContent;
    } catch (error) {
      console.error('Error processing message:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to process message: ${error.message}`);
      }
      throw error;
    }
  }

  async fillFormFields(formFields: FormField[]): Promise<Record<string, any>> {
    try {
      if (!await this.verifyOllamaConnection()) {
        throw new Error('Ollama server is not available or model is not found');
      }

      const prompt = this.createFormFillingPrompt(formFields);
      const response = await this.llm.invoke(prompt);
      
      // Parse the response as JSON
      const filledFields = JSON.parse(response.content.toString());
      return filledFields;
    } catch (error) {
      console.error('Error filling form fields:', error);
      throw error;
    }
  }

  private async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  private async extractInformation(text: string): Promise<UserInfo> {
    const prompt = `
      You are an expert at extracting information from documents.
      Extract all relevant personal information from the following text and return it as a JSON object.
      Only include information that is explicitly stated in the text.
      
      Text:
      ${text}
      
      Return a JSON object with the following structure:
      {
        "name": "full name if found",
        "dateOfBirth": "date of birth if found",
        "sex": "sex if found",
        "address": "full address if found",
        "phone": "phone number if found",
        "email": "email if found",
        "insuranceProvider": "insurance provider if found",
        "insuranceNumber": "insurance number if found",
        "medicalConditions": "medical conditions if found",
        "allergies": "allergies if found",
        "medications": "medications if found"
      }
    `;

    const response = await this.llm.invoke(prompt);
    return JSON.parse(response.content.toString());
  }

  private updateUserInfo(newInfo: UserInfo): void {
    this.userInfo = { ...this.userInfo, ...newInfo };
  }

  private createPrompt(message: string): string {
    // Create a user-friendly version of form field values
    const userFriendlyValues = this.formFieldValues.map(field => ({
      field: field.label,
      value: field.value
    }));

    // Format conversation history
    const formattedHistory = this.conversationHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    return `
      You are a helpful medical form assistant. Use the following context to answer the user's question.
      
      Current User Information:
      ${JSON.stringify(this.userInfo, null, 2)}
      
      Current Form Field Values:
      ${JSON.stringify(userFriendlyValues, null, 2)}
      
      Conversation History:
      ${formattedHistory}
      
      User Question: ${message}
      
      Provide a helpful, accurate response based on the available information.
      If you don't have enough information to answer a question, say so and suggest what additional information would be helpful.
      If the user asks about specific form fields, use the current form field values to provide accurate information.
      IMPORTANT: When referring to form fields, always use their labels (e.g., "Full Name", "Date of Birth") and never use their internal IDs.
      For example, say "Your Full Name is John Doe" instead of "Your patientName is John Doe".
    `;
  }

  private createFormFillingPrompt(formFields: FormField[]): string {
    // Create a user-friendly version of form fields
    const userFriendlyFields = formFields.map(field => ({
      field: field.label,
      required: field.required
    }));

    return `
      You are an expert at filling out medical forms. Use the following information to fill out the form fields.
      
      Current User Information:
      ${JSON.stringify(this.userInfo, null, 2)}
      
      Current Form Field Values:
      ${JSON.stringify(this.formFieldValues.map(f => ({ field: f.label, value: f.value })), null, 2)}
      
      Form Fields:
      ${JSON.stringify(userFriendlyFields, null, 2)}
      
      Fill out the form fields with the available information. Return a JSON object where:
      - Keys are the exact field IDs from the form
      - Values are the corresponding information from the user data
      - If information is not available, use an empty string
      - Format dates as YYYY-MM-DD
      - Format phone numbers as (XXX) XXX-XXXX
    `;
  }
}

export const ragService = new RAGService(); 