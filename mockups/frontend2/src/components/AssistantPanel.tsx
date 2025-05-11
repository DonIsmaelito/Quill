import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { Upload, Send, Loader2 } from 'lucide-react';
import { ragService } from '../services/ragService';
import { toast } from 'sonner';

interface FormField {
  id: string;
  label: string;
  type: string;
  required?: boolean;
}

interface AssistantPanelProps {
  onFileUpload: (files: File[]) => void;
  formFields: FormField[];
  formTitle: string;
  formValues: Record<string, any>;
  onFieldsMentioned?: (fieldIds: string[]) => void;
}

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
}

export function AssistantPanel({ onFileUpload, formFields, formTitle, formValues, onFieldsMentioned }: AssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcomeMessage = generateWelcomeMessage(formTitle, formFields);
    setMessages([{
      id: '1',
      content: welcomeMessage,
      type: 'assistant',
      timestamp: new Date()
    }]);
  }, [formTitle, formFields]);

  useEffect(() => {
    const formFieldValues = Object.entries(formValues).map(([id, value]) => ({
      id,
      label: formFields.find(field => field.id === id)?.label || id,
      value
    }));
    ragService.updateFormFieldValues(formFieldValues);
  }, [formValues, formFields]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateWelcomeMessage = (title: string, fields: FormField[]): string => {
    const suggestions = generateDocumentSuggestions(fields);
    return `Welcome! I'm here to help you fill out the ${title}. ${suggestions}`;
  };

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

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      const response = await ragService.processUserMessage(input);
      
      // Extract mentioned fields from the response
      const mentionedFields = formFields
        .filter(field => response.toLowerCase().includes(field.label.toLowerCase()))
        .map(field => field.id);
      
      console.log('Mentioned fields:', mentionedFields);
      
      // Notify parent component about mentioned fields
      onFieldsMentioned?.(mentionedFields);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        type: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      toast.error('Failed to process message. Please try again.');
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

      const filledFields = await ragService.fillFormFields(formFields);
      onFileUpload(Array.from(files));

      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: 'I\'ve processed your documents and extracted the relevant information. The form has been updated with the information I found.',
        type: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
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
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isProcessing}
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
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