import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { Upload, Send, Loader2 } from 'lucide-react';
import { ragService } from '../services/ragService';
import { toast } from 'sonner';

// Not exactly the same as in Index.tsx
interface FormField {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  value?: string;
}

interface AssistantPanelProps {
  onFileUpload: (files: File[]) => void;
  formFields: FormField[];
  formTitle: string;
  formValues: Record<string, any>;
  onFieldsMentioned?: (fieldIds: string[]) => void;
  onFieldsUpdated?: (updates: { id: string; value: string }[]) => void;
}

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
}

export function AssistantPanel({ 
  onFileUpload, 
  formFields, 
  formTitle, 
  formValues, 
  onFieldsMentioned,
  onFieldsUpdated 
}: AssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Create a ref to track form values for stable comparisons
  const formValuesRef = useRef<Record<string, any>>({});
  
  // Keep ref in sync with props
  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  useEffect(() => {
    const welcomeMessage = generateWelcomeMessage(formTitle, formFields);
    setMessages([{
      id: '1',
      content: welcomeMessage,
      type: 'assistant',
      timestamp: new Date()
    }]);
    // Set the welcome message in the ragService
    ragService.setWelcomeMessage(welcomeMessage);
  }, [formTitle, formFields]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateWelcomeMessage = (title: string, fields: FormField[]): string => {
    const suggestions = generateDocumentSuggestions(fields);
    return `Welcome! I'm here to help you fill out the ${title}. ${suggestions}`;
  };

  /* TODO: Let LLM figure out what documents are needed based on the form fields */
  const generateDocumentSuggestions = (fields: FormField[]): string => {
    const suggestions = [];
    
    if (fields.some(f => f.id === 'fullName' || f.id === 'dateOfBirth' || f.id === 'sex')) {
      suggestions.push('driver\'s license or state ID');
    }
    
    if (fields.some(f => f.id === 'insuranceProvider' || f.id === 'insurancePolicyNumber')) {
      suggestions.push('insurance card');
    }
    
    if (fields.some(f => f.id === 'medicalConditions' || f.id === 'allergies' || f.id === 'medications')) {
      suggestions.push('medical records or medication list');
    }
    
    if (suggestions.length === 0) {
      return 'You can upload any relevant documents to help fill out this form.';
    }
    
    return `To help fill out this form, you can upload your ${suggestions.join(', ')}.`;
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    try {
      // Add user message to UI
      const userMessage: Message = {
        id: Date.now().toString(),
        content: message,
        type: 'user',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsProcessing(true);

      // Get current form field values using the ref for stability
      const currentFormFields = formFields.map(field => ({
        id: field.id,
        label: field.label,
        value: formValuesRef.current[field.id] || ''
      }));

      // Process message with form fields
      const response = await ragService.processUserMessage(message, currentFormFields);
      // const response = "I'd be happy to help with that! Based on the patient information, I see that your billing address is listed as 4630 Hillsbury Road. Would you like me to fill in your address with this information? Here's an update: {'field_updates': [{'id': 'address', 'value': '4630 Hillsbury Road'}]} Is there anything else I can help you with?"
      
      console.log('Assistant response:', response);

      // Extract field updates from the response
      const fieldUpdatesMatch = response.match(/\{['"]field_updates['"]:\s*\[.*?\]\}/);
      let updatedFields: { id: string; value: string }[] = [];
      let displayResponse = response;

      if (fieldUpdatesMatch) {
        try {
          const fieldUpdatesString = fieldUpdatesMatch[0].replace(/'/g, '"');
          const updatesObj = JSON.parse(fieldUpdatesString);
          updatedFields = updatesObj.field_updates || [];
          console.log('Field updates:', updatedFields);
          // Remove the field updates from the response
          displayResponse = response.replace(fieldUpdatesMatch[0], '').trim();
          console.log('Display response after removing fields:', displayResponse);
        } catch (error) {
          console.error('Error parsing field updates:', error);
        }
      }

      // Add a message about updated fields if any were updated
      if (updatedFields.length > 0) {
        const fieldLabels = updatedFields.map(update => 
          formFields.find(f => f.id === update.id)?.label || update.id
        );
        displayResponse += `\n\nI've updated the following fields: ${fieldLabels.join(', ')}.`;
        console.log('New display response:', displayResponse);
      }

      // Extract mentioned fields from the response
      const mentionedFields = formFields
        .filter(field => displayResponse.toLowerCase().includes(field.label.toLowerCase()))
        .map(field => field.id);
      
      // Notify parent component about mentioned fields
      onFieldsMentioned?.(mentionedFields);

      // Add assistant response to UI
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: displayResponse,
        type: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update form fields if any were changed
      if (updatedFields.length > 0) {
        // Filter out non-changes first to avoid unnecessary updates
        const actualUpdates = updatedFields.filter(update => {
          const field = formFields.find(f => f.id.toLowerCase() === update.id.toLowerCase());
          // Only include if field exists and value is different from current
          return field && formValuesRef.current[field.id] !== update.value;
        });
        
        if (actualUpdates.length > 0) {
          console.log('Actual field updates:', actualUpdates);
          
          // Convert to the format expected by parent component
          const fieldUpdates = actualUpdates.map(update => ({
            id: update.id,
            value: update.value
          }));
          
          // Notify parent about changes
          onFieldsUpdated?.(fieldUpdates);
        } else {
          console.log('No actual field updates found (values already match)');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message to UI
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        type: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await ragService.processDocument(file);
      }

      // Now that the user_data.json has been updated in the backend with the new file information,
      // let's send a message on the user's behalf to fill in any fields it can in the form.
      // Do not display this message in the UI, do not add it to the message array, and keep any text
      // that's currently in the input box so that the user can continue typing and send another message.

      // ~~~~
      // Get current form field values using the ref for stability
      const currentFormFields = formFields.map(field => ({
        id: field.id,
        label: field.label,
        value: formValuesRef.current[field.id] || ''
      }));

      // Process message with form fields
      const message = 'I\'ve uploaded a new document that has updated the information in your system under PATIENT INFORMATION. Try to fill out any additional fields in the form that you can that dont have a value yet (whose values in the CURRENT MEDICAL FORM FIELDS AND VALUES is MISSING). DO NOT confirm fields that are already filled out, and DO NOT ask about other fields whose data is not available in PATIENT INFORMATION. Simply give the new fields that can be filled out along with their values in the requested format.';
      const response = await ragService.processUserMessage(message, currentFormFields);
      // const response = "I'd be happy to help with that! Based on the patient information, I see that your billing address is listed as 4630 Hillsbury Road. Would you like me to fill in your address with this information? Here's an update: {'field_updates': [{'id': 'address', 'value': '4630 Hillsbury Road'}]} Is there anything else I can help you with?"
      
      console.log('Assistant response:', response);

      // Extract field updates from the response
      const fieldUpdatesMatch = response.match(/\{['"]field_updates['"]:\s*\[.*?\]\}/);
      let updatedFields: { id: string; value: string }[] = [];
      let displayResponse = response;

      if (fieldUpdatesMatch) {
        try {
          const fieldUpdatesString = fieldUpdatesMatch[0].replace(/'/g, '"');
          const updatesObj = JSON.parse(fieldUpdatesString);
          updatedFields = updatesObj.field_updates || [];
          console.log('Field updates:', updatedFields);
          // Remove the field updates from the response
          displayResponse = response.replace(fieldUpdatesMatch[0], '').trim();
          console.log('Display response after removing fields:', displayResponse);
        } catch (error) {
          console.error('Error parsing field updates:', error);
        }
      }

      // Add a message about updated fields if any were updated
      if (updatedFields.length > 0) {
        const fieldLabels = updatedFields.map(update => 
          formFields.find(f => f.id === update.id)?.label || update.id
        );
        displayResponse += `\n\nI've updated the following fields: ${fieldLabels.join(', ')}.`;
        console.log('New display response:', displayResponse);
      }

      // Extract mentioned fields from the response
      const mentionedFields = formFields
        .filter(field => displayResponse.toLowerCase().includes(field.label.toLowerCase()))
        .map(field => field.id);
      
      // Notify parent component about mentioned fields
      onFieldsMentioned?.(mentionedFields);

      // Add assistant response to UI
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: displayResponse,
        type: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update form fields if any were changed
      if (updatedFields.length > 0) {
        // Filter out non-changes first to avoid unnecessary updates
        const actualUpdates = updatedFields.filter(update => {
          const field = formFields.find(f => f.id.toLowerCase() === update.id.toLowerCase());
          // Only include if field exists and value is different from current
          return field && formValuesRef.current[field.id] !== update.value;
        });
        
        if (actualUpdates.length > 0) {
          console.log('Actual field updates:', actualUpdates);
          
          // Convert to the format expected by parent component
          const fieldUpdates = actualUpdates.map(update => ({
            id: update.id,
            value: update.value
          }));
          
          // Notify parent about changes
          onFieldsUpdated?.(fieldUpdates);
        } else {
          console.log('No actual field updates found (values already match)');
        }
      }
      // ~~~~

      // const filledFields = await ragService.fillFormFields(formFields);
      onFileUpload(Array.from(files));
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error('Failed to process files. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Assistant</h2>
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-4">
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={handleFileUpload}
            accept=".pdf,.jpg,.jpeg,.png"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(input)}
            disabled={isProcessing}
          />
          <Button
            size="icon"
            onClick={() => handleSendMessage(input)}
            disabled={isProcessing || !input.trim()}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}