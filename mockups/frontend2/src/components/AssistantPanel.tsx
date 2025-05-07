import React, { useState, useRef, useEffect } from 'react';
import AssistantAvatar from './AssistantAvatar';
import AssistantMessage from './AssistantMessage';
import ChatInput from './ChatInput';
import FileUploadTray from './FileUploadTray';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  success: boolean;
}

interface AssistantPanelProps {
  onFileUpload: (files: UploadedFile[]) => void;
}

const AssistantPanel: React.FC<AssistantPanelProps> = ({ onFileUpload }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "If you upload a picture of your driver's license, I can automatically fill in the Patient Name, Date of Birth, and Sex fields. Please attach a photo below.",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Simulate assistant response
    setTimeout(() => {
      const responseMessage: Message = {
        id: `msg-${Date.now()}-response`,
        text: "I'll help you with that. To better assist you, please upload any supporting documents like your ID or insurance card.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, responseMessage]);
    }, 1000);
  };

  // We're keeping this function as it might be used by FileUploadTray or other components
  const handleAttach = () => {
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      (fileInput as HTMLInputElement).click();
    }
  };

  const handleFilesUploaded = (files: UploadedFile[]) => {
    onFileUpload(files);
    
    // If files were uploaded, simulate an assistant response
    if (files.length > 0) {
      const latestFile = files[files.length - 1];
      
      setTimeout(() => {
        const responseMessage: Message = {
          id: `msg-${Date.now()}-file`,
          text: `Thanks for uploading ${latestFile.name}. I've extracted the information and filled in the relevant fields in your form.`,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, responseMessage]);
      }, 1500);
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="assistant-panel flex flex-col h-full">
      <div className="p-4 border-b">
        <AssistantAvatar />
      </div>
      
      <div className="flex-grow overflow-y-auto p-4">
        {messages.map(message => (
          <AssistantMessage 
            key={message.id} 
            isUser={message.isUser} 
            timestamp={message.timestamp}
          >
            {message.text}
          </AssistantMessage>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t">
        <div className="p-2">
          <FileUploadTray onFilesUploaded={handleFilesUploaded} />
        </div>
        <ChatInput 
          onSendMessage={handleSendMessage} 
          onAttach={handleAttach} 
        />
      </div>
    </div>
  );
};

export default AssistantPanel;