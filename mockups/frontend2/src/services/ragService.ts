import { OLLAMA_CONFIG } from "../config/ollama";

// API base URL - this should point to your quill server
const API_BASE_URL = "http://localhost:3000/api";

export interface Message {
  type: "user" | "bot" | "system";
  content: string;
}

export interface Document {
  id: number;
  name: string;
  type: string;
}

export interface FormFieldValue {
  id: string;
  label: string;
  value: string;
}

class RAGService {
  private conversationHistory: Message[] = [];
  private documents: Document[] = [];
  private formFieldValues: FormFieldValue[] = [];

  constructor() {
    this.loadDocuments();
    this.loadFormFieldValues();
  }

  setWelcomeMessage(welcomeMessage: string) {
    // Only set welcome message if conversation history is empty
    if (this.conversationHistory.length === 0) {
      this.conversationHistory.push({
        type: "bot",
        content: welcomeMessage,
      });
    }
  }

  private async loadDocuments() {
    try {
      const response = await fetch(`${API_BASE_URL}/documents`);
      if (response.ok) {
        const data = await response.json();
        this.documents = data;
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  }

  private async loadFormFieldValues() {
    try {
      const formData = new FormData();
      formData.append("mode", "get-form-values");
      const response = await this.callApi("rag", "POST", formData);
      // Only update if we got valid form values back
      if (response.formValues && Array.isArray(response.formValues)) {
        this.formFieldValues = response.formValues;
      } else {
        this.formFieldValues = [];
      }
    } catch (error) {
      // If there's an error (like no form values), just initialize with empty array
      console.log("No form values found, initializing with empty array");
      this.formFieldValues = [];
    }
  }

  private async callApi(endpoint: string, method: string, formData: FormData) {
    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "API call failed");
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in ${endpoint} API call:`, error);
      throw error;
    }
  }

  async processDocument(file: File): Promise<{ message: string, extracted_info: object}> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", "ingest");

    const response = await this.callApi("rag", "POST", formData);

    // Add document to local list
    this.documents.push({
      id: Date.now(),
      name: file.name,
      type: this.determineDocumentType(file.name),
    });

    return { message: response.message, extracted_info: response.extracted_info};
  }

  async processNewFormTemplate(file: File): Promise<{ message: string, extracted_info: object}> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', 'ingest-form-template')

    const response = await this.callApi('rag', 'POST', formData);
    
    // Add document to local list
    this.documents.push({
      id: Date.now(),
      name: file.name,
      type: this.determineDocumentType(file.name)
    });

    return { message: response.message, extracted_info: response.extracted_info};
  }

  private determineDocumentType(fileName: string): string {
    const lowercaseName = fileName.toLowerCase();
    if (lowercaseName.includes("w2") || lowercaseName.includes("tax")) {
      return "Tax Document";
    } else if (lowercaseName.includes("lease")) {
      return "Housing";
    } else if (lowercaseName.includes("medical")) {
      return "Healthcare";
    }
    return "Other";
  }

  async generateResponse(
    message: string,
    options: {
      documents: Document[];
      chatHistory: Message[];
      language?: string;
    }
  ): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("mode", "query");
      formData.append("message", message);
      formData.append("documentName", options.documents[0]?.name || "");
      formData.append("chatHistory", JSON.stringify(options.chatHistory));
      if (options.language) {
        formData.append("language", options.language);
      }

      const response = await this.callApi("rag", "POST", formData);
      return response.content;
    } catch (error) {
      console.error("Error generating response:", error);
      throw error;
    }
  }

  async processUserMessage(
    message: string,
    formFields?: FormFieldValue[],
    language?: string
  ): Promise<string> {
    try {
      // First, check if this is a question about form fields
      const formFieldQuestion = this.isFormFieldQuestion(message);
      let additionalFieldContext = "";
      if (formFieldQuestion) {
        additionalFieldContext = this.getFormFieldContext(formFieldQuestion);
      }

      // If this.documents is not empty, this.loadDocuments() will be called
      if (this.documents.length === 0) {
        await this.loadDocuments();
      }

      // Otherwise, process as a regular message
      const formData = new FormData();
      formData.append("mode", "query");
      formData.append("message", message);
      // formData.append('documentName', this.documents[0]?.name || '');
      formData.append("chatHistory", JSON.stringify(this.conversationHistory));
      if (additionalFieldContext) {
        formData.append("additionalFieldContext", additionalFieldContext);
      }

      // Add form fields and values if provided
      if (formFields) {
        // Make a copy of the form fields and set all '' values to 'MISSING'
        const updatedFormFields = formFields.map((field) => ({
          ...field,
          value: field.value || "MISSING",
        }));

        formData.append("formFields", JSON.stringify(updatedFormFields));
      }

      // Add language parameter if provided
      if (language) {
        formData.append("language", language);
      }

      const response = await this.callApi("rag", "POST", formData);

      // Extract the content from the response
      const responseContent =
        typeof response === "string" ? response : response.content;

      // Update conversation history
      this.conversationHistory.push(
        { type: "user", content: message },
        { type: "bot", content: responseContent }
      );

      return responseContent;
    } catch (error) {
      console.error("Error processing message:", error);
      throw error;
    }
  }

  private isFormFieldQuestion(
    message: string
  ): { fieldId: string; question: string } | null {
    const lowerMessage = message.toLowerCase();

    // Check for questions about specific fields
    for (const field of this.formFieldValues) {
      const fieldName = field.label.toLowerCase();
      if (
        lowerMessage.includes(fieldName) ||
        lowerMessage.includes(field.id.toLowerCase())
      ) {
        return {
          fieldId: field.id,
          question: message,
        };
      }
    }

    return null;
  }

  // TODO: Implement later and allow for multiple fields that are referenced, providing context for each one.
  private getFormFieldContext(fieldQuestion: {
    fieldId: string;
    question: string;
  }): string {
    //     const field = this.formFieldValues.find(f => f.id === fieldQuestion.fieldId);
    //     if (!field) return "I'm not sure which field you're asking about. Could you please specify?";

    //     const fieldInfo = this.getFieldInformation(field);
    //     return `I'd be happy to explain the "${field.label}" field to you. ${fieldInfo.explanation}

    // ${fieldInfo.documentSuggestions}

    // ${fieldInfo.additionalInfo}`;
    const additionalContext = "";
    return additionalContext;
  }

  private getFieldInformation(field: FormFieldValue): {
    explanation: string;
    documentSuggestions: string;
    additionalInfo: string;
  } {
    // Common medical form field explanations
    const fieldExplanations: Record<
      string,
      {
        explanation: string;
        documents: string[];
        additionalInfo: string;
      }
    > = {
      fullName: {
        explanation:
          "This field is for your complete legal name as it appears on your government-issued ID.",
        documents: [
          "Driver's license",
          "State ID",
          "Passport",
          "Birth certificate",
        ],
        additionalInfo:
          "Please make sure to include your full name, including any middle names or suffixes.",
      },
      dateOfBirth: {
        explanation:
          "This field requires your complete date of birth in MM/DD/YYYY format.",
        documents: [
          "Driver's license",
          "State ID",
          "Passport",
          "Birth certificate",
        ],
        additionalInfo:
          "This information helps us verify your identity and ensure proper medical care.",
      },
      insuranceProvider: {
        explanation:
          "This field is for the name of your health insurance company.",
        documents: ["Insurance card", "Insurance policy documents"],
        additionalInfo:
          "If you have multiple insurance plans, please provide your primary insurance information.",
      },
      insurancePolicyNumber: {
        explanation:
          "This is your unique insurance policy or member ID number.",
        documents: ["Insurance card"],
        additionalInfo:
          'You can find this number on your insurance card, usually labeled as "Policy Number" or "Member ID".',
      },
      medicalConditions: {
        explanation:
          "This field is for any current medical conditions or diagnoses you have.",
        documents: [
          "Previous medical records",
          "Doctor's notes",
          "Hospital discharge papers",
        ],
        additionalInfo:
          "Please include any conditions that are currently being treated or monitored.",
      },
      allergies: {
        explanation:
          "This field is for any allergies you have, including medications, foods, or environmental allergies.",
        documents: ["Previous medical records", "Allergy test results"],
        additionalInfo:
          "Please include both the allergen and your reaction to it.",
      },
      medications: {
        explanation:
          "This field is for any medications you are currently taking.",
        documents: [
          "Prescription bottles",
          "Pharmacy records",
          "Medication list from your doctor",
        ],
        additionalInfo:
          "Please include the medication name, dosage, and how often you take it.",
      },
    };

    const defaultResponse = {
      explanation: "This field is required for your medical records.",
      documents: ["Any relevant medical documents", "Identification documents"],
      additionalInfo:
        "If you're unsure about what information to provide, please let me know and I'll help you figure it out.",
    };

    const fieldInfo = fieldExplanations[field.id] || defaultResponse;

    return {
      explanation: fieldInfo.explanation,
      documentSuggestions: `You can find this information in your ${fieldInfo.documents.join(
        ", "
      )}.`,
      additionalInfo: fieldInfo.additionalInfo,
    };
  }

  async fillFormFields(file: File): Promise<{ filledFormPath: string }> {
    const formData = new FormData();
    formData.append("mode", "blank");
    formData.append("file", file);

    const response = await this.callApi("rag", "POST", formData);
    return { filledFormPath: response.filledFormPath };
  }

  async updateFormFieldValues(values: FormFieldValue[]): Promise<void> {
    try {
      const formData = new FormData();
      formData.append("mode", "update-form-values");
      formData.append("values", JSON.stringify(values));

      // if there are no values, just return
      if (values.length === 0) {
        return;
      }

      await this.callApi("rag", "POST", formData);
      this.formFieldValues = values;
    } catch (error) {
      console.error("Error updating form field values:", error);
      throw error;
    }
  }

  getFormFieldValues(): FormFieldValue[] {
    return this.formFieldValues;
  }

  getDocuments(): Document[] {
    return this.documents;
  }

  addDocument(document: Document) {
    this.documents.push(document);
  }
}

export const ragService = new RAGService();
